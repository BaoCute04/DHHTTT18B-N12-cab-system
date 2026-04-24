import { useBooking } from "@app/BookingProvider.jsx";
import { useNavigate } from "react-router-dom";
import { useEffect, useContext, useState } from "react";
import { RealtimeContext } from "@app/RealtimeProvider.jsx";

export function RideTrackingPage() {
  const navigate = useNavigate();
  const { ride, setRide, destination, setPayment } = useBooking();
  const { connection } = useContext(RealtimeContext);
  const [eta, setEta] = useState(Number(ride?.etaMinutes || 10));

  useEffect(() => {
    if (!ride) {
      navigate("/customer/booking/pickup");
      return;
    }

    const socket = connection?.socket;
    if (!socket?.addEventListener) {
      return;
    }

    const handleMessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const payload = message.payload || {};

        if (payload.rideId && payload.rideId !== ride.rideId) {
          return;
        }

        if (message.type === "ride.status.changed" || message.type === "driver.location.updated") {
          setRide((currentRide) => ({ ...(currentRide || {}), ...payload }));
          if (payload.etaMinutes != null) {
            setEta(Number(payload.etaMinutes));
          }
        }

        if (message.type === "payment.completed") {
          setPayment(payload);
          navigate("/customer/payment/result");
        }

        if (message.type === "payment.failed") {
          setPayment(payload);
          navigate("/customer/payment/method");
        }
      } catch (error) {
        console.error("Realtime parse error:", error);
      }
    };

    socket.addEventListener("message", handleMessage);
    return () => {
      socket.removeEventListener?.("message", handleMessage);
    };
  }, [connection?.socket, navigate, ride, setPayment, setRide]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 px-6 pt-6 z-10">
          <h1 className="text-lg font-semibold text-slate-900">Dang di chuyen</h1>
          <p className="text-xs text-slate-500 mt-0.5">Tai xe dang dua ban den diem den</p>
        </div>

        <div className="absolute inset-x-0 top-[80px] bottom-[320px] bg-slate-200 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center mb-3 pointer-events-none">
            <div className="w-6 h-6 bg-slate-900 rounded-full"></div>
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-[12px] border-l-transparent border-r-transparent border-t-slate-900 -mt-1"></div>
          </div>

          <div className="text-xs tracking-wide text-slate-500 select-none">MAP VIEW</div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-[320px] bg-white rounded-t-[28px] px-6 pt-5 pb-10 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">🚗</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Dang tren duong</p>
              <p className="text-xs text-slate-500">Con khoang {eta || 0} phut den diem den</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Trang thai</span>
              <span>{ride?.status || "IN_PROGRESS"}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Thoi gian du kien</span>
              <span>{eta || 0} phut</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Diem den</span>
              <span className="truncate ml-4">{ride?.destination?.address || destination?.address || "Dang cap nhat"}</span>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 active:scale-[0.98]">
              Goi tai xe
            </button>
            <button className="flex-1 rounded-xl border border-red-300 py-3 text-sm font-medium text-red-600 active:scale-[0.98]">
              Tro giup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
