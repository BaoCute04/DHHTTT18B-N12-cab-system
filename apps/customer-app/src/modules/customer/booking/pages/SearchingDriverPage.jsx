import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@app/BookingProvider.jsx";
import { RealtimeContext } from "@app/RealtimeProvider.jsx";
import { AuthContext } from "@app/AuthProvider.jsx";

export function SearchingDriverPage() {
  const navigate = useNavigate();
  const { booking, selectedRideOption, setRide } = useBooking();
  const { connect } = useContext(RealtimeContext);
  const { session } = useContext(AuthContext);

  const formattedPrice = Number(
    selectedRideOption?.price || selectedRideOption?.priceSnapshot?.amount || 0
  ).toLocaleString("vi-VN");

  useEffect(() => {
    if (!booking) {
      navigate("/customer/booking/pickup");
      return;
    }

    connect({
      client: "customer",
      token: session?.accessToken,
      onMessage: (data) => {
        try {
          const message = JSON.parse(data);
          if (message.type !== "ride.assigned" && message.type !== "ride.status.changed") {
            return;
          }

          const payload = message.payload || {};
          const rideKey = payload.bookingId || payload.rideId;
          if (rideKey !== booking.bookingId) {
            return;
          }

          setRide(payload);
          navigate("/customer/ride/driver-assigned");
        } catch (error) {
          console.error("WS Message Error:", error);
        }
      },
    });
  }, [booking, connect, navigate, session?.accessToken, setRide]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-slate-200 flex items-center justify-center">
          <div className="text-slate-400 text-sm select-none">MAP VIEW</div>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 bg-slate-900 rounded-full"></div>
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-[12px] border-l-transparent border-r-transparent border-t-slate-900 -mt-1"></div>
            </div>
          </div>
        </div>

        <div className="absolute top-0 inset-x-0 px-6 pt-6 z-10">
          <h1 className="text-lg font-semibold text-slate-900">Dang tim tai xe</h1>
        </div>

        <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[28px] px-6 pt-6 pb-8 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-slate-900 animate-spin"></div>
            <p className="mt-4 text-sm font-semibold">Dang tim tai xe gan ban</p>
            <p className="text-xs text-slate-500 mt-1 text-center">Vui long cho trong giay lat</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 mb-5">
            <div className="flex justify-between text-sm mb-2">
              <span>Loai xe</span>
              <span className="capitalize">{selectedRideOption?.type || "Dang cap nhat"}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Khoang cach</span>
              <span>{selectedRideOption?.distance?.toFixed?.(1) || "..."} km</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Gia du kien</span>
              <span>{formattedPrice}d</span>
            </div>
          </div>

          <button
            className="w-full rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 active:scale-[0.98]"
            onClick={() => navigate("/customer/booking/pickup")}
          >
            Huy chuyen
          </button>
        </div>
      </div>
    </div>
  );
}
