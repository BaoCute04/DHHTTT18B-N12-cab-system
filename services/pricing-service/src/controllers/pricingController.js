import PricingRule from '../models/PricingRule.js';
import SurgeZone from '../models/SurgeZone.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { getSupplyCount, getDemandCount, recordDemandEvent, getAISurge, saveQuote } from '../utils/redis.js';
import { latLngToZone } from '../utils/geohash.js';

const formatResponse = (message, data, req) => ({
    success: true, message, data,
    meta: {
        requestId: req.headers['x-request-id'] || uuidv4(),
        timestamp: new Date().toISOString()
    }
});

export const getQuote = async (req, res) => {
    const reqId = req.headers['x-request-id'] || uuidv4();
    try {
        // 1. Nhận tọa độ điểm đón + thông tin cuốc xe
        const { pickupLat, pickupLng, pickupAddress, distanceKm, durationMin, vehicleType } = req.body;
        logger.info('Received quote request', { reqId, vehicleType, distanceKm, pickupLat, pickupLng });

        // 2. Lấy giá cơ bản từ DB
        let rule = await PricingRule.findOne({ vehicleType }) || await PricingRule.findOne({ vehicleType: 'standard' });
        if (!rule) throw new Error('Chưa cấu hình giá trong DB');

        const baseAmount = rule.baseFare + (distanceKm * rule.perKm) + (durationMin * rule.perMinute);

        // 3. Đọc Supply trước để kiểm tra trạng thái khả dụng của tài xế
        const supplyCount = await getSupplyCount(pickupLat, pickupLng);

        // ── Business Rule 1: KHÔNG CÓ TÀI XẾ ──────────────────────────────────
        if (supplyCount <= 0) {
            const zone = latLngToZone(pickupLat, pickupLng);
            logger.warn('Khu vực không có tài xế active. Hủy báo giá.', { reqId, zone });
            // Trả về lỗi luôn để Client hiển thị thông báo
            return res.status(503).json({
                success: false,
                message: 'Không có tài xế trong khu vực hoạt động. Vui lòng thử lại sau.'
            });
        }

        // Nếu qua bước trên -> Chắc chắn đang CÓ tài xế (supply > 0)
        await recordDemandEvent(pickupLat, pickupLng, reqId);
        const demandCount = await getDemandCount(pickupLat, pickupLng);

        // 4. Tính Surge — AI XGBoost & Fallback
        let surgeMultiplier = 1.0;
        let surgeSource = 'formula-fallback';

        // ── Business Rule 2: Nhu cầu cực thấp (chỉ 1 mình user báo giá) ───────
        if (demandCount <= 1 && supplyCount > 0) {
            surgeMultiplier = 1.0;
            surgeSource = 'rule-low-demand';
            logger.info('Demand thấp → surge cố định 1.0', { reqId });
        }
        else {
            const aiSurge = await getAISurge(pickupLat, pickupLng);
            if (aiSurge !== null) {
                surgeMultiplier = aiSurge;
                surgeSource = 'ai-xgboost';
                logger.info('Surge từ AI XGBoost', { reqId, surgeMultiplier, demandCount, supplyCount });
            } else {
                surgeMultiplier = Math.max(1.0, demandCount / supplyCount);
                surgeSource = 'formula-fallback';
                logger.info('Surge từ công thức demand/supply (AI chưa sẵn sàng)', { reqId, surgeMultiplier });
            }
        }


        // 5. Tính tiền cuối cùng (làm tròn lên 1,000 VND)
        const finalAmount = Math.round((baseAmount * surgeMultiplier) / 1000) * 1000;

        // 6. [Tiêu chí 5] Sinh quote_id và lưu snapshot giá vào Redis (TTL 180s)
        const quoteId = uuidv4();
        const QUOTE_TTL_SECONDS = 180;
        await saveQuote(quoteId, {
            amount: finalAmount,
            surgeMultiplier,
            surgeSource,
            vehicleType: rule.vehicleType,
            distanceKm,
            durationMin,
            pickupLat,
            pickupLng,
            zone: latLngToZone(pickupLat, pickupLng),
            createdAt: new Date().toISOString(),
        });

        logger.info('Quote generated', { reqId, quoteId, finalAmount, surgeMultiplier, surgeSource, supplyCount, demandCount });

        res.status(200).json(formatResponse("Quote generated successfully", {
            quoteId,
            expiresIn: QUOTE_TTL_SECONDS,   // giây — client dùng để countdown cho user
            priceSnapshot: {
                amount: finalAmount,
                distance: `${distanceKm} km`,
                duration: `${durationMin} mins`,
                surgeMultiplier: surgeMultiplier,
                vehicleType: rule.vehicleType,
                metrics: {
                    supply: supplyCount,
                    demand: demandCount,
                    zone: latLngToZone(pickupLat, pickupLng),
                    surgeSource  // 'ai-xgboost' hoặc 'formula-fallback'
                }
            }
        }, req));
    } catch (error) {
        logger.error('Error generating quote', { reqId, error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getSurge = async (req, res) => {
    // Tạm thời để nguyên hàm này nếu bạn vẫn cần query theo DB cũ, 
    // hoặc có thể xóa đi nếu app không cần API lấy hệ số đơn thuần nữa.
    try {
        const { zoneId } = req.query;
        if (!zoneId) return res.status(400).json({ success: false, message: 'Thiếu zoneId' });

        let surgeMultiplier = 1.0;
        let surge = await SurgeZone.findOne({ zoneId, isActive: true });
        if (surge) surgeMultiplier = surge.multiplier;

        res.status(200).json(formatResponse("Surge retrieved", { zoneId, surgeMultiplier }, req));
    } catch (error) {
        logger.error('Error getting surge', { error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};