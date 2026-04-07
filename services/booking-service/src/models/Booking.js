import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';


// ------------------------------------------------------------------------
// SCHEMA PHỤ: Định nghĩa cấu trúc chuẩn cho Tọa độ & Địa chỉ
// ------------------------------------------------------------------------
const locationSchema = new mongoose.Schema({
  lat: { type: Number, required: true },     // Vĩ độ (Ví dụ: 10.762622)
  lng: { type: Number, required: true },     // Kinh độ (Ví dụ: 106.660172)
  address: { type: String, required: true }  // Địa chỉ dạng text (Ví dụ: "Quận 1, TP.HCM")
}, { _id: false }); // _id: false để MongoDB không tự tạo ID phụ cho object con này


// ------------------------------------------------------------------------
// SCHEMA CHÍNH: Cấu trúc của một Chuyến xe (Booking)
// ------------------------------------------------------------------------
const bookingSchema = new mongoose.Schema({
  
  // 1. Thông tin định danh
  bookingId: { 
    type: String, 
    default: uuidv4, 
    unique: true, 
    index: true 
  }, // Mã ID duy nhất của chuyến đi (Tự động sinh ra dạng UUID)
  
  userId: { 
    type: String, 
    required: true, 
    index: true 
  }, // Mã ID của khách hàng đặt xe (Dùng để query lịch sử chuyến đi của user)

  // 2. Thông tin Lộ trình
  pickup: { 
    type: locationSchema, 
    required: true 
  }, // Điểm đón khách (Sử dụng locationSchema đã định nghĩa ở trên)
  
  destination: { 
    type: locationSchema, 
    required: true 
  }, // Điểm đến/Điểm trả khách

  // 3. Thông tin Loại xe & Giá cước
  vehicleType: { 
    type: String, 
    required: true, 
    enum: ['bike', 'car', 'car_plus'] // Chỉ cho phép các loại xe được định nghĩa sẵn
  }, // Loại phương tiện khách chọn
  
  priceSnapshot: {
    amount: { type: Number, required: true }, // Số tiền cước (Ví dụ: 45000)
    currency: { type: String, default: 'VND' }, // Loại tiền tệ (Mặc định là VNĐ)
    surgeMultiplier: { type: Number, default: 1.0 } // Hệ số nhân giá lúc cao điểm (Mặc định x1.0 là bình thường)
  }, // "Bản chụp" giá tiền tại thời điểm khách bấm đặt xe (để đảm bảo giá không bị đổi giữa chừng)

  // 4. Trạng thái chuyến đi
  status: {
    type: String,
    enum: [
      'CREATED',          // Mới tạo yêu cầu đặt xe
      'SEARCHING_DRIVER', // Hệ thống đang tìm tài xế xung quanh
      'ASSIGNED',         // Đã tìm thấy và gán tài xế thành công
      'CANCELLED',        // Chuyến đi bị hủy (bởi khách hoặc tài xế)
      'EXPIRED',          // Hết thời gian tìm tài xế mà không có ai nhận
      'COMPLETED'         // Chuyến đi đã hoàn thành an toàn
    ],
    default: 'CREATED'    // Mặc định khi vừa lưu vào DB sẽ là CREATED
  },

  // 5. Thông tin liên kết (Sẽ được cập nhật sau khi tìm được tài xế)
  driverId: { 
    type: String, 
    default: null 
  }, // ID của tài xế nhận chuyến (Lúc mới tạo thì chưa có tài xế nên để null)
  
  rideId: { 
    type: String, 
    default: null 
  }, // ID của chuyến đi thực tế bên Ride Service sinh ra (Lúc mới tạo cũng là null)

  // 6. Kỹ thuật chống trùng lặp (Idempotency)
  idempotencyKey: { 
    type: String, 
    required: true, 
    unique: true 
  } // Chuỗi mã duy nhất do App khách hàng gửi lên. 
    // Dùng để chặn lỗi: Khách hàng bấm nút "Đặt xe" 2 lần liên tục do mạng lag, 
    // DB sẽ dựa vào key này để biết là cùng 1 thao tác và không tạo ra 2 cuốc xe.

}, { 
  timestamps: true // Tự động sinh ra 2 trường: createdAt (Thời gian tạo) và updatedAt (Thời gian cập nhật cuối cùng)
});


export default mongoose.model('Booking', bookingSchema);