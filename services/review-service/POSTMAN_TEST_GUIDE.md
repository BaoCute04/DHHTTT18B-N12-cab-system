# Hướng Dẫn Test Review Service bằng POSTMAN

Tài liệu này cung cấp sẵn các URL và nguyên mẫu dữ liệu dư chuẩn (`JSON body`) để bạn có thể copy/paste ngay vào Postman nhằm kiểm thử độc lập service đánh giá.

⚠️ **Lưu ý quan trọng**: 
Trước khi test, hãy chắc chắn service đang chạy bằng lệnh: `npm run dev:review` (Service sẽ chạy ở cổng `3106`).

---

## 1. POST - Tạo đánh giá mới (Thành công)
**Mục đích:** Gửi một review hoàn chỉnh lên hệ thống.
- **Method:** `POST`
- **URL:** `http://localhost:3106/api/v1/reviews`
- **Body (raw -> JSON):**
```json
{
  "rideId": "550e8400-e29b-41d4-a716-446655440001",
  "userId": "550e8400-e29b-41d4-a716-446655440002",
  "driverId": "550e8400-e29b-41d4-a716-446655440003",
  "rating": 5,
  "comment": "Tài xế rất thân thiện, xe sạch sẽ!"
}
```

---

## 2. POST - Xử lý chống Spam (Idempotency)
**Mục đích:** Test cơ chế tự động chặn 1 khách hàng đánh giá 1 chuyến xe nhiều lần.
- Thực hiện lại chính xác **Request số 1** một lần nữa (Bấm nút Send lần số 2).
- Khác với lần đầu báo `201 Created`, lần 2 này hệ thống tự hiểu và trả về lỗi HTTP Code `409 Conflict`.

---

## 3. POST - Bẫy lỗi đánh giá quá quy định (Validation)
**Mục đích:** Test màng bọc lọc dữ liệu ảo.
- **Method:** `POST`
- **URL:** `http://localhost:3106/api/v1/reviews`
- **Body (raw -> JSON):**
```json
{
  "rideId": "111e8400-e29b-41d4-a716-446655440011",
  "userId": "222e8400-e29b-41d4-a716-446655440022",
  "driverId": "550e8400-e29b-41d4-a716-446655440003",
  "rating": 6, 
  "comment": "Đánh giá quá 5 sao để test bẫy lỗi"
}
```
*(Hệ thống sẽ báo cáo lỗi 400 Bad Request ngay lập tức do số rating vượt quá 5)*

---

## 4. GET - Xem tất cả đánh giá của 1 cuốc xe
**Mục đích:** Khi màn hình app muốn hiển thị thông tin cuốc xe (Bao gồm đánh giá nếu có).
- **Method:** `GET`
- **URL:** `http://localhost:3106/api/v1/reviews/ride/550e8400-e29b-41d4-a716-446655440001`
- **Lưu ý:** Chữ `550e8400...0001` là ID được copy từ dữ kiện số 1.

---

## 5. GET - Lấy toàn bộ đánh giá của 1 Bác Tài
**Mục đích:** Hiển thị trong Profile cá nhân của Bác Tài. API này trả về mọi comment kèm tổng lược tính trung bình sẵn.
- **Method:** `GET`
- **URL:** `http://localhost:3106/api/v1/reviews/driver/550e8400-e29b-41d4-a716-446655440003`

---

## 6. GET - Siêu truy vấn: Hỏi điểm Trung bình (Dành cho AI và Surge Pricing)
**Mục đích:** Trả về con số điểm gọn nhẹ nhất để nạp vào hệ thống máy học (Machine learning Matching + Surge pricing). Tách riêng để tiết kiệm băng thông khi không cần load comment dài.
- **Method:** `GET`
- **URL:** `http://localhost:3106/api/v1/reviews/driver/550e8400-e29b-41d4-a716-446655440003/average`
