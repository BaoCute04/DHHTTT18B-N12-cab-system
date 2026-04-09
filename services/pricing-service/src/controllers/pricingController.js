import PricingRule from '../models/PricingRule.js';
import SurgeZone from '../models/SurgeZone.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

const formatResponse = (message, data, req) => ({
    success: true, message, data,
    meta: {
        requestId: req.headers['x-request-id'] || uuidv4(),
        timestamp: new Date().toISOString()
    }
});

export const getQuote = async (req, res) => {
    const reqId = req.headers['x-request-id'];
    try {
        // 1. Nhận thêm demandIndex và supplyIndex từ request (gán mặc định là 1 nếu bỏ trống)
        const { pickupAddress, distanceKm, durationMin, vehicleType, demandIndex = 1, supplyIndex = 1 } = req.body;
        logger.info('Received quote request', { reqId, vehicleType, distanceKm, demandIndex, supplyIndex });

        // 2. Lấy giá cơ bản từ DB (Phần này giữ nguyên)
        let rule = await PricingRule.findOne({ vehicleType }) || await PricingRule.findOne({ vehicleType: 'standard' });
        if (!rule) throw new Error('Chưa cấu hình giá trong DB');

        const baseAmount = rule.baseFare + (distanceKm * rule.perKm) + (durationMin * rule.perMinute);
        
        // 3. TÍNH TOÁN SURGE THEO CÔNG THỨC (Cầu / Cung)
        let surgeMultiplier = 1.0;

        // Luật số 2: Không bao giờ chia cho 0 (Tránh sập hệ thống)
        if (supplyIndex <= 0) {
            logger.warn('Khu vực không có tài xế (supply = 0). Áp dụng hệ số an toàn 1.0', { reqId });
            surgeMultiplier = 1.0;
        } else {
            // Tính tỷ lệ Cầu / Cung
            const rawSurge = demandIndex / supplyIndex;
            
            // Luật số 1: Giá không bao giờ giảm dưới mức gốc (surge >= 1.0)
            surgeMultiplier = Math.max(1.0, rawSurge);
        }
        
        // 4. Tính ra cục tiền cuối cùng
        const finalAmount = Math.round((baseAmount * surgeMultiplier) / 1000) * 1000;

        logger.info('Quote generated', { reqId, finalAmount });

        res.status(200).json(formatResponse("Quote generated successfully", {
            priceSnapshot: {
                amount: finalAmount,
                distance: `${distanceKm} km`,
                duration: `${durationMin} mins`,
                surgeMultiplier: surgeMultiplier,
                vehicleType: rule.vehicleType,
                // Trả về để bạn dòm trên Postman cho dễ hình dung
                metrics: { 
                    demand: demandIndex, 
                    supply: supplyIndex 
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