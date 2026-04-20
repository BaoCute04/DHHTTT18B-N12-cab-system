import Booking from '../models/Booking.js';
import messageBroker from '../utils/messageBroker.js';
import { getAndConsumeQuote } from '../utils/redis.js';
import { v4 as uuidv4 } from 'uuid';

const formatResponse = (message, data, req) => ({
    success: true,
    message,
    data,
    meta: {
        requestId: req.headers['x-request-id'] || uuidv4(),
        timestamp: new Date().toISOString()
    }
});

// [TC3, TC6, TC11, TC12, TC14, TC19, TC25] Tạo mới chuyến xe
export const createBooking = async (req, res) => {
    try {
        const idempotencyKey = req.headers['idempotency-key'];

        // [TC19] Kiểm tra header Idempotency
        if (!idempotencyKey) {
            return res.status(400).json({ success: false, message: 'Missing Idempotency-Key header' });
        }

        // [TC19] Xử lý trùng lặp request
        let existingBooking = await Booking.findOne({ idempotencyKey });
        if (existingBooking) {
            return res.status(200).json(formatResponse("Booking already exists", existingBooking, req));
        }

        const { userId, pickup, drop, distanceKm, vehicleType, paymentMethod, quoteId } = req.body;

        // [TC11] Validation: Thiếu trường bắt buộc
        if (!pickup || pickup.lat === undefined || pickup.lng === undefined) {
            return res.status(400).json({ success: false, message: 'pickup is required' });
        }
        if (!drop || drop.lat === undefined || drop.lng === undefined) {
            return res.status(400).json({ success: false, message: 'drop is required' });
        }

        // [TC12] Validation: Sai định dạng tọa độ
        if (typeof pickup.lat !== 'number' || typeof pickup.lng !== 'number' ||
            typeof drop.lat !== 'number' || typeof drop.lng !== 'number') {
            return res.status(422).json({ success: false, message: 'Invalid lat/lng format. Must be numeric.' });
        }

        // [TC14] Validation: Phương thức thanh toán
        const validPaymentMethods = ['CASH', 'CREDIT_CARD', 'E_WALLET'];
        if (paymentMethod && !validPaymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ success: false, message: 'Invalid payment method' });
        }

        // [Tiêu chí 5] Validate quote_id — đảm bảo giá estimate ↔ booking nhất quán
        let lockedPrice = null;
        if (quoteId) {
            const quote = await getAndConsumeQuote(quoteId);
            if (!quote) {
                // Quote không tồn tại hoặc đã hết hạn (TTL = 3 phút)
                return res.status(409).json({
                    success: false,
                    message: 'Giá đã hết hạn hoặc không hợp lệ. Vui lòng lấy giá mới trước khi đặt xe.',
                    code: 'QUOTE_EXPIRED'
                });
            }
            lockedPrice = {
                amount: quote.amount,
                surgeMultiplier: quote.surgeMultiplier,
                surgeSource: quote.surgeSource,
                lockedAt: new Date(),
            };
        }

        const newBooking = new Booking({
            userId: userId || 'USR-TEMP',
            pickup,
            drop,
            distanceKm,
            vehicleType: vehicleType || 'bike',
            paymentMethod: paymentMethod || 'CASH',
            idempotencyKey,
            quoteId: quoteId || null,
            lockedPrice,
            // Nếu có quote → dùng giá lock; nếu không có → amount mặc định = 0 (backward-compatible)
            priceSnapshot: lockedPrice ? {
                amount: lockedPrice.amount,
                currency: 'VND',
                surgeMultiplier: lockedPrice.surgeMultiplier
            } : undefined
        });

        await newBooking.save();

        // [TC25] Publish event lên Kafka topic 'ride_events'
        await messageBroker.publish('ride_events', {
            event_type: 'ride_requested',
            ride_id: newBooking.bookingId,
            user_id: newBooking.userId,
            pickup: newBooking.pickup,
            drop: newBooking.drop,
            payment_method: newBooking.paymentMethod,
            timestamp: newBooking.createdAt
        });

        res.status(201).json(formatResponse("Booking created successfully", newBooking, req));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// [TC4] Lấy danh sách chuyến xe của User
export const getUserBookings = async (req, res) => {
    try {
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Missing user_id parameter' });
        }

        const bookings = await Booking.find({ userId }).sort({ createdAt: -1 });
        res.status(200).json(formatResponse("Retrieved user bookings", bookings, req));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Lấy chi tiết một chuyến xe
export const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findOne({ bookingId });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        res.status(200).json(formatResponse("Booking details retrieved", booking, req));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Hủy chuyến xe
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findOne({ bookingId });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found' });
        }

        if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: `Status is ${booking.status}, cannot cancel.` });
        }

        booking.status = 'CANCELLED';
        await booking.save();

        // Bắn event hủy chuyến
        await messageBroker.publish('ride_events', {
            event_type: 'ride_cancelled',
            ride_id: booking.bookingId,
            user_id: booking.userId,
            timestamp: new Date().toISOString()
        });

        res.status(200).json(formatResponse("Booking cancelled", booking, req));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};