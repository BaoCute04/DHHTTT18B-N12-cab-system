import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDriverRide } from "@app/DriverRideProvider.jsx";
import { rideApi } from "@/services/rideApi.js";

function getAmount(ride) {
  const raw = ride?.priceSnapshot?.amount ?? ride?.priceSnapshot ?? ride?.estimatedPrice ?? 0;
  return Number(raw) || 0;
}

function getEtaLabel(ride) {
  const eta = Number(ride?.etaMinutes ?? ride?.eta ?? 0);
  return eta > 0 ? `${eta} phut` : "Dang cap nhat";
}

export function DriverIncomingRideRequestPage() {
  const navigate = useNavigate();
  const { currentRide, setCurrentRide } = useDriverRide();
  const [loading, setLoading] = useState(false);

  const amountLabel = useMemo(
    () => getAmount(currentRide).toLocaleString("vi-VN"),
    [currentRide]
  );

  const handleAccept = async () => {
    if (!currentRide) {
      return;
    }

    setLoading(true);
    try {
      const rideId = currentRide.rideId || currentRide.id;
      const result = await rideApi.acceptRide(rideId);
      const nextRide = result.data || result;
      setCurrentRide(nextRide);
      navigate("/driver/ride/navigate-pickup");
    } catch (error) {
      console.error("Accept ride error:", error);
      alert(error.message || "Failed to accept ride.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = () => {
    setCurrentRide(null);
    navigate("/driver/availability/dashboard");
  };

  if (!currentRide) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <p>No incoming ride request.</p>
        <button
          onClick={() => navigate("/driver/availability/dashboard")}
          className="mt-4 text-sm text-slate-400 underline"
        >
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-end p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-900 z-0"></div>

      <div className="w-full max-w-sm bg-white rounded-[32px] p-6 z-10 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-4">
            {currentRide?.vehicleType === "bike" ? "🏍️" : "🚗"}
          </div>
          <h1 className="text-xl font-bold text-slate-900">New ride request</h1>
          <p className="text-sm text-slate-500">
            ETA {getEtaLabel(currentRide)}
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-1">
              <span className="text-green-600">●</span>
              <span className="h-6 border-l border-dashed border-slate-300"></span>
              <span className="text-red-500">●</span>
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium text-slate-900">Pickup</p>
              <p className="text-slate-500 mb-2 truncate">{currentRide.pickup?.address || "Updating..."}</p>
              <p className="font-medium text-slate-900">Destination</p>
              <p className="text-slate-500 truncate">{currentRide.destination?.address || "Updating..."}</p>
            </div>
          </div>

          <div className="flex justify-between items-center py-3 border-t border-b">
            <div>
              <p className="text-xs text-slate-500">Trip fare</p>
              <p className="text-lg font-bold text-slate-900">{amountLabel}d</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Ride ID</p>
              <p className="text-sm font-semibold text-slate-900">{currentRide.rideId || "N/A"}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-900 font-semibold active:scale-95 transition-transform"
            onClick={handleDecline}
          >
            Decline
          </button>
          <button
            className={`flex-[2] py-4 rounded-2xl bg-slate-900 text-white font-semibold shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2 ${
              loading ? "opacity-70 pointer-events-none" : ""
            }`}
            onClick={handleAccept}
            disabled={loading}
          >
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Accept
          </button>
        </div>
      </div>

      <div className="mt-8 text-white/40 text-xs font-medium z-10">Assignment event is coming from realtime</div>
    </div>
  );
}
