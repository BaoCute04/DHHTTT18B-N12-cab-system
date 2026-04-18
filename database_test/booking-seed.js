// 1. Chuyển sang database của Booking Service
db = db.getSiblingDB('cab_booking_booking');

// 2. Xóa dữ liệu cũ
db.bookings.drop();

// 3. Chèn dữ liệu mẫu chuẩn theo Model mới (snake_case)
db.bookings.insertMany([
  {
    "bookingId": "BK-SEED-001",
    "userId": "USR123",
    "pickup": { "lat": 10.762622, "lng": 106.660172 },
    "drop": { "lat": 10.773335, "lng": 106.700312 },
    "distanceKm": 5.2,                // ✅ Đã đổi từ distanceKm
    "vehicleType": "bike",
    "paymentMethod": "CASH",          // ✅ Thêm mới trường này
    "priceSnapshot": {
      "amount": 35000,
      "currency": "VND",
      "surgeMultiplier": 1.0
    },
    "status": "REQUESTED",             // ✅ Trạng thái mặc định chuẩn TC6
    "idempotencyKey": "idemp-seed-001",
    "createdAt": new Date(),
    "updatedAt": new Date()
  },
  {
    "bookingId": "BK-SEED-002",
    "userId": "USR456",
    "pickup": { "lat": 10.800000, "lng": 106.680000 },
    "drop": { "lat": 10.810000, "lng": 106.690000 },
    "distanceKm": 2.5,
    "vehicleType": "car",
    "paymentmethod": "E_WALLET",      // ✅ Thêm mới
    "priceSnapshot": {
      "amount": 55000,
      "currency": "VND",
      "surgeMultiplier": 1.2
    },
    "status": "REQUESTED",
    "idempotencyKey": "idemp-seed-002",
    "createdAt": new Date(),
    "updatedAt": new Date()
  }
]);

print("✅ [SEEDER] Đã cập nhật dữ liệu mẫu chuẩn snake_case thành công!");