import express from 'express';
import Joi from 'joi';
import { getQuote } from '../controllers/pricingController.js';

const router = express.Router();

// Schema kiểm tra dữ liệu đầu vào (Validation)
const quoteSchema = Joi.object({
    pickupAddress: Joi.string().optional(),
    destinationAddress: Joi.string().required(),
    vehicleType: Joi.string().valid('bike', 'standard', 'premium', 'suv').required(),
    distanceKm: Joi.number().positive().required(),
    durationMin: Joi.number().positive().required(),

    // TỌA ĐỘ ĐIỂM ĐÓN — dùng để tự động tính Supply/Demand từ Redis
    pickupLat: Joi.number().min(-90).max(90).required(),
    pickupLng: Joi.number().min(-180).max(180).required()
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

export default router;
