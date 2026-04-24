import { useLocation, useNavigate } from "react-router-dom";
import { useDriverRide } from "@app/DriverRideProvider.jsx";

function getAmount(ride) {
  const raw = ride?.priceSnapshot?.amount ?? ride?.priceSnapshot ?? ride?.estimatedFare ?? 0;
  return Number(raw) || 0;
}

export function CompleteRidePage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { currentRide, setCurrentRide } = useDriverRide();
  const ride = state?.ride || currentRide || {};

  const handleFinish = () => {
    setCurrentRide(null);
    navigate("/driver/availability/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Trip completed</h1>
            <p className="text-xs text-slate-500 mt-0.5">Ride lifecycle finished successfully</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">
            {ride?.status || "COMPLETED"}
          </span>
        </div>

        <div className="flex-1 px-6 py-6">
          <div className="w-full h-full rounded-2xl bg-slate-200 flex flex-col items-center justify-center">
            <div className="flex flex-col items-center mb-3 pointer-events-none">
              <div className="w-6 h-6 bg-blue-600 rounded-full border-4 border-white" />
              <div className="w-0 h-0 border-l-8 border-r-8 border-t-[12px] border-l-transparent border-r-transparent border-t-blue-600 -mt-1" />
            </div>
            <div className="text-xs tracking-wide text-slate-500 select-none">MAP VIEW</div>
          </div>
        </div>

        <div className="px-6 pb-8">
          <div className="rounded-2xl bg-white border shadow-sm p-4 mb-4">
            <p className="text-sm font-medium mb-2">Trip summary</p>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Ride ID</span>
                <span>{ride?.rideId || "N/A"}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment</span>
                <span>{ride?.paymentStatus || "PENDING"}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900">
                <span>Income</span>
                <span>{getAmount(ride).toLocaleString("vi-VN")}d</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-green-50 p-4 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">✓</div>
            <p className="text-xs text-green-700">Ride is completed and payment flow has been triggered.</p>
          </div>

          <div className="mb-4">
            <button
              onClick={handleFinish}
              className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium active:scale-[0.98]"
            >
              Back to dashboard
            </button>
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
