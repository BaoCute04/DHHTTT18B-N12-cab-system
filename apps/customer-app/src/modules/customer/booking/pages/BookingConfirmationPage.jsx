import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@app/BookingProvider.jsx";
import { request } from "@/services/httpClient.js";

export function BookingConfirmationPage() {
  const navigate = useNavigate();
  const { pickup, destination, selectedRideOption, setBooking } = useBooking();
  const [loading, setLoading] = useState(false);

  const handleCreateBooking = async () => {
    if (!pickup || !destination || !selectedRideOption) return;

    setLoading(true);
    try {
      const response = await request("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupLocation: {
            address: pickup.address,
            coordinates: { lat: pickup.lat, lng: pickup.lng }
          },
          destinationLocation: {
            address: destination.address,
            coordinates: { lat: destination.lat, lng: destination.lng }
          },
          rideType: selectedRideOption.type,
          estimatedPrice: selectedRideOption.price,
          paymentMethod: "CASH"
        })
      });

      const result = await response.json();
      if (result.success) {
        setBooking(result.data);
        navigate("/customer/booking/searching-driver");
      } else {
        alert(result.message || "Failed to create booking");
      }
    } catch (error) {
      console.error("Booking error:", error);
      alert("Đã có lỗi xảy ra khi đặt xe.");
    } finally {
      setLoading(false);
    }
  };

  if (!pickup || !destination || !selectedRideOption) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Xác nhận chuyến đi</h1>
        </div>

        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="rounded-2xl border p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="text-green-600">●</span>
                <span className="h-6 border-l border-dashed border-slate-300"></span>
                <span className="text-red-500">●</span>
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">Điểm đón</p>
                <p className="text-slate-500 mb-2 truncate">{pickup.address}</p>
                <p className="font-medium">Điểm đến</p>
                <p className="text-slate-500 truncate">{destination.address}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg">
              {selectedRideOption.type === "bike" ? "🛵" : selectedRideOption.type === "car" ? "🚗" : "🚙"}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold capitalize">{selectedRideOption.type}</p>
              <p className="text-xs text-slate-500">Dịch vụ vận chuyển</p>
            </div>
            <div className="text-sm font-semibold">{selectedRideOption.price.toLocaleString()}đ</div>
          </div>

          <div className="rounded-2xl border p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg">💵</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Thanh toán</p>
              <p className="text-xs text-slate-500">Tiền mặt</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Giá chuyến đi</span>
              <span>{selectedRideOption.price.toLocaleString()}đ</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Phí nền tảng</span>
              <span>0đ</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-2 border-t">
              <span>Tổng cộng</span>
              <span>{selectedRideOption.price.toLocaleString()}đ</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            className={`w-full rounded-xl bg-slate-900 text-white py-3.5 text-sm font-medium active:scale-[0.98] flex items-center justify-center gap-2 ${
              loading ? "opacity-70 pointer-events-none" : ""
            }`}
            onClick={handleCreateBooking}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang xử lý...
              </>
            ) : (
              "Đặt xe"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
