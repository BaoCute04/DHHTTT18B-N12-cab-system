import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

const locationSchema = new mongoose.Schema({
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
}, { _id: false });

const bookingSchema = new mongoose.Schema({
    // Định danh
    bookingId: { type: String, default: uuidv4, unique: true, index: true },
    userId: { type: String, required: true, index: true },

    // Lộ trình (Bám sát TC3, TC11)
    pickup: { type: locationSchema, required: true },
    drop: { type: locationSchema, required: true },
    distanceKm: { type: Number, required: true },

    // Thông tin dịch vụ (Bám sát TC14)
    vehicleType: {
        type: String,
        enum: ['bike', 'car', 'car_plus'],
        default: 'bike'
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['CASH', 'CREDIT_CARD', 'E_WALLET'],
        default: 'CASH'
    },

    // Giá cước
    priceSnapshot: {
        amount: { type: Number, default: 0 },
        currency: { type: String, default: 'VND' },
        surgeMultiplier: { type: Number, default: 1.0 }
    },

    // Trạng thái (Mặc định REQUESTED theo TC6)
    status: {
        type: String,
        enum: ['REQUESTED', 'SEARCHING_DRIVER', 'ACCEPTED', 'CANCELLED', 'FAILED', 'COMPLETED'],
        default: 'REQUESTED'
    },

    driverId: { type: String, default: null },
    rideId: { type: String, default: null },

    // Chống trùng lặp (TC19)
    idempotencyKey: { type: String, required: true, unique: true }
}, {
    timestamps: true
});

export default mongoose.model('Booking', bookingSchema);