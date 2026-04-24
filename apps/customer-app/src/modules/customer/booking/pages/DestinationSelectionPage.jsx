import { useNavigate } from "react-router-dom";
import { useBooking } from "@app/BookingProvider.jsx";

export function DestinationSelectionPage() {
  const navigate = useNavigate();
  const { pickup, setDestination } = useBooking();

  const handleSelectDestination = () => {
    // Mocking destination coordinates (Binh Thanh District, HCM)
    setDestination({
      address: "12 Điện Biên Phủ, Bình Thạnh, TP. HCM",
      lat: 10.7997,
      lng: 106.7025
    });
    navigate("/customer/booking/ride-options");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-3">
          <h1 className="text-lg font-semibold text-slate-900">Chọn điểm đến</h1>
        </div>

        <div className="px-6">
          <div className="flex items-center gap-3 rounded-xl bg-slate-100 px-4 py-3">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              placeholder="Bạn muốn đi đâu?"
              className="bg-transparent flex-1 outline-none text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSelectDestination()}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 mt-4">
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-2">Điểm đón đã chọn</p>
            <div className="flex items-center gap-3 rounded-xl border border-slate-900 p-3 bg-slate-50">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">📍</div>
              <div className="flex-1">
                <p className="text-sm font-medium">{pickup?.address || "Chưa chọn điểm đón"}</p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500 mb-2">Địa điểm gần đây</p>

            <div className="space-y-3">
              <div
                className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer active:bg-slate-50"
                onClick={handleSelectDestination}
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">💼</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Công ty</p>
                  <p className="text-xs text-slate-500">12 Điện Biên Phủ, Bình Thạnh</p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border p-3 cursor-pointer active:bg-slate-50" onClick={handleSelectDestination}>
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">📍</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Vincom Đồng Khởi</p>
                  <p className="text-xs text-slate-500">Quận 1, TP.HCM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button
            className="w-full rounded-xl bg-slate-900 text-white py-3.5 text-sm font-medium active:scale-[0.98]"
            onClick={handleSelectDestination}
          >
            Xác nhận điểm đến
          </button>
        </div>
      </div>
    </div>
  );
}
