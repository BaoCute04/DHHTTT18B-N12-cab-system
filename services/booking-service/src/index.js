import dotenv from "dotenv";
import mongoose from "mongoose";
import { startService } from "../../../platform/node/create-service-app.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import messageBroker from "./utils/messageBroker.js";

dotenv.config();

// 1. Kết nối Database & Broker trước
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/booking_db')
  .then(async () => {
    console.log('✅ [MongoDB] Connected successfully to booking_db');
    await messageBroker.connect();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// 2. Khởi chạy Service VÀ truyền Router vào tham số thứ 2 (chính là configureApp)
startService("booking-service", async (app) => {
  
  // Gắn API của chúng ta vào app của hệ thống
  app.use('/api/v1/bookings', bookingRoutes);
  console.log('🚀 Đã gắn API /api/v1/bookings thành công!');
  
}).catch((error) => {
  console.error(error);
  process.exit(1);
});