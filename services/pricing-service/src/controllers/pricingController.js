import PricingRule from '../models/PricingRule.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { saveQuote } from '../utils/redis.js';
import { latLngToZone } from '../utils/geohash.js';
import { evaluateSurge } from '../utils/surge-service.js';

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

        const zoneId = latLngToZone(pickupLat, pickupLng);
        const surgeContext = await evaluateSurge({ zoneId, requestId: reqId });
        const supplyCount = surgeContext.supplyCount ?? 0;
        const demandCount = surgeContext.demandCount ?? 0;

        if (!surgeContext.available) {
            logger.warn('Khu vực không có tài xế active. Hủy báo giá.', { reqId, zoneId });
            // Trả về lỗi luôn để Client hiển thị thông báo
            return res.status(503).json({
                success: false,
                message: 'Không có tài xế trong khu vực hoạt động. Vui lòng thử lại sau.'
            });
        }
        const surgeMultiplier = surgeContext.surgeMultiplier;
        const surgeSource = surgeContext.surgeSource;

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
            zone: zoneId,
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
                    zone: zoneId,
                    surgeSource  // 'ai-xgboost' hoặc 'formula-fallback'
                }
            }
        }, req));
    } catch (error) {
        logger.error('Error generating quote', { reqId, error: error.message });
        res.status(500).json({ success: false, message: error.message });
    }
};
