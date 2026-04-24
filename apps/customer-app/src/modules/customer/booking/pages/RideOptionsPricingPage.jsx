import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@app/BookingProvider.jsx";

// Helper function to calculate distance between two coordinates in km
const calculateDistance = (p1, p2) => {
  if (!p1 || !p2 || p1.lat === undefined || p2.lat === undefined) return 0;
  const R = 6371; 
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

export function RideOptionsPricingPage() {
  const navigate = useNavigate();
  const { pickup, destination, setSelectedRideOption } = useBooking();
  const [options, setOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    // Check pickup and destination directly from context
    if (!pickup || !destination) {
      console.log("Missing pickup or destination, redirecting...");
      navigate("/customer/booking/pickup");
      return;
    }

    const distance = calculateDistance(pickup, destination);
    console.log(`Distance calculated: ${distance} km`);
    
    const mockOptions = [
      { id: "bike", type: "Xe máy", icon: "🏍️", basePrice: 12000, perKm: 4000, time: "2 phút" },
      { id: "car", type: "Ô tô 4 chỗ", icon: "🚗", basePrice: 30000, perKm: 12000, time: "5 phút" },
      { id: "car_plus", type: "Ô tô 7 chỗ", icon: "🚐", basePrice: 45000, perKm: 15000, time: "7 phút" }
    ].map(opt => ({
      ...opt,
      price: Math.round(opt.basePrice + (distance * opt.perKm))
    }));

    setOptions(mockOptions);
    setSelectedOption(mockOptions[0]);
  }, [pickup, destination, navigate]);

  const handleConfirmRide = () => {
    if (!selectedOption) return;
    setSelectedRideOption(selectedOption);
    navigate("/customer/booking/confirmation");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[800px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col border-4 border-slate-900/5">
        <div className="px-6 pt-8 pb-4">
          <button onClick={() => navigate(-1)} className="text-slate-400 mb-4">← Quay lại</button>
          <h1 className="text-2xl font-bold text-slate-900">Chọn loại xe</h1>
          <p className="text-xs text-slate-500 mt-1">Giá đã bao gồm VAT và phí cầu đường</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-3 py-4">
          {options.length > 0 ? options.map((option) => (
            <div
              key={option.id}
              onClick={() => setSelectedOption(option)}
              className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                selectedOption?.id === option.id
                  ? "border-slate-900 bg-slate-50 shadow-md"
                  : "border-slate-100 bg-white"
              }`}
            >
              <div className="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-3xl shadow-inner">
                {option.icon}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{option.type}</p>
                <p className="text-xs text-slate-500">Đến sau {option.time}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  {option.price.toLocaleString()}đ
                </p>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <div className="animate-spin text-4xl mb-4">🌀</div>
               <p>Đang tính toán giá...</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-50 space-y-4">
          <div className="flex justify-between items-center px-2">
             <div className="flex items-center gap-2">
                <span className="text-xl">💳</span>
                <span className="text-sm font-medium">Tiền mặt</span>
             </div>
             <span className="text-sm font-bold text-slate-900">Thay đổi</span>
          </div>

          <button
            className={`w-full rounded-2xl py-4 text-sm font-bold shadow-xl transition-all ${
              selectedOption ? 'bg-slate-900 text-white active:scale-95' : 'bg-slate-100 text-slate-400'
            }`}
            disabled={!selectedOption}
            onClick={handleConfirmRide}
          >
            {selectedOption ? `Đặt ${selectedOption.type}` : 'Vui lòng chọn xe'}
          </button>
        </div>
      </div>
    </div>
  );
}
