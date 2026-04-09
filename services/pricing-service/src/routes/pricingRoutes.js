import express from 'express';
import Joi from 'joi';
import { getQuote, getSurge } from '../controllers/pricingController.js';

const router = express.Router();

// Schema kiểm tra dữ liệu đầu vào (Validation)
const quoteSchema = Joi.object({
    pickupAddress: Joi.string().required(),
    destinationAddress: Joi.string().required(),
    vehicleType: Joi.string().valid('bike', 'standard', 'premium', 'suv').required(),
    distanceKm: Joi.number().positive().required(),
    durationMin: Joi.number().positive().required(),
    
    // THÊM 2 TRƯỜNG NÀY ĐỂ TEST CUNG - CẦU
    demandIndex: Joi.number().min(0).optional(), // Có thể = 0 (Không ai đặt)
    supplyIndex: Joi.number().min(0).optional()  // Có thể = 0 (Không có tài xế)
});

const validateQuote = (req, res, next) => {
    const { error } = quoteSchema.validate(req.body);
    if (error) {
        return res.status(422).json({ 
            success: false, 
            message: "Validation Error: " + error.details[0].message 
        });
    }
    next();
};

router.post('/quote', validateQuote, getQuote);
router.get('/surge', getSurge);

export default router;