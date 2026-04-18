import Booking from '../models/Booking.js';
import messageBroker from '../utils/messageBroker.js';
import { v4 as uuidv4 } from 'uuid';

// Hàm Helper để chuẩn hóa dữ liệu đầu ra (chuẩn format tài liệu)
const formatResponse = (message, data, req) => ({
    success: true,
    message,
    data,
    meta: {
        requestId: req.headers['x-request-id'] || uuidv4(),
        correlationId: req.headers['x-correlation-id'] || uuidv4(),
        timestamp: new Date().toISOString()
    }
});

// 1. POST /api/v1/bookings - Tạo chuyến xe
export const createBooking = async (req, res) => {
    try {
        const idempotencyKey = req.headers['idempotency-key'];
        if (!idempotencyKey) {
            return res.status(400).json({ success: false, message: 'Thiếu header Idempotency-Key' });
        }

        // Kiểm tra Idempotency để chống tạo trùng
        let existingBooking = await Booking.findOne({ idempotencyKey });
        if (existingBooking) {
            return res.status(200).json(formatResponse("Booking existing (Idempotency Hit)", existingBooking, req));
        }

        // Bóc tách đúng các trường theo spec
        const { userId, pickup, destination, vehicleType, priceSnapshot } = req.body;

        // Tạo mới
        const newBooking = new Booking({
            userId,
            pickup,
            destination,
            vehicleType,
            priceSnapshot,
            idempotencyKey
        });

        await newBooking.save();

        // Bắn event ra Kafka/RabbitMQ
        await messageBroker.publish('RideCreated', {
            bookingId: newBooking.bookingId,
            status: newBooking.status
        });

        res.status(201).json(formatResponse("Booking created", newBooking, req));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. POST /api/v1/bookings/:bookingId/cancel - Hủy chuyến xe
export const cancelBooking = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findOne({ bookingId });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe này' });
        }

        // Không cho hủy nếu đã hoàn thành hoặc đã hủy rồi
        if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
            return res.status(400).json({ success: false, message: `Không thể hủy chuyến xe đang ở trạng thái ${booking.status}` });
        }

        booking.status = 'CANCELLED';
        await booking.save();

        // Bắn event báo hủy
        await messageBroker.publish('RideCancelled', {
            bookingId: booking.bookingId,
            status: booking.status
        });

        res.status(200).json(formatResponse("Booking cancelled successfully", booking, req));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. GET /api/v1/bookings/:bookingId - Lấy chi tiết 1 chuyến
export const getBookingById = async (req, res) => {
    try {
        const { bookingId } = req.params;
        const booking = await Booking.findOne({ bookingId });

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chuyến xe này' });
        }

        res.status(200).json(formatResponse("Booking retrieved successfully", booking, req));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. GET /api/v1/bookings?userId=... - Lấy danh sách chuyến xe của user
export const getUserBookings = async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Thiếu tham số userId trên URL' });
        }

        // Tìm và sắp xếp mới nhất lên đầu
        const bookings = await Booking.find({ userId }).sort({ createdAt: -1 });

        res.status(200).json(formatResponse("User bookings retrieved successfully", bookings, req));
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};