import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDriverRide } from "@app/DriverRideProvider.jsx";
import { rideApi } from "@/services/rideApi.js";

function resolveDriverId(ride) {
  return ride?.driverId || ride?.assignedDriverId || null;
}

export function NavigateToPickupPage() {
  const navigate = useNavigate();
  const { currentRide, setCurrentRide } = useDriverRide();
  const [loading, setLoading] = useState(false);

  const handleArrived = async () => {
    if (!currentRide) {
      return;
    }

    const rideId = currentRide.rideId || currentRide.id;
    const driverId = resolveDriverId(currentRide);
    const pickup = currentRide.pickup;

    if (!rideId || !driverId || pickup?.lat == null || pickup?.lng == null) {
      navigate("/driver/ride/start");
      return;
    }

    setLoading(true);
    try {
      const result = await rideApi.updateLocation(rideId, driverId, pickup.lat, pickup.lng);
      setCurrentRide(result.data || result);
      navigate("/driver/ride/start");
    } catch (error) {
      console.error("Arrival update error:", error);
      alert(error.message || "Failed to update arrival location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Navigate to pickup</h1>
            <p className="text-xs text-slate-500 mt-0.5">Driver is on the way to customer</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">
            {currentRide?.status || "ACCEPTED"}
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
            <p className="text-sm font-medium mb-1">Pickup point</p>
            <p className="text-xs text-slate-500">{currentRide?.pickup?.address || "Updating..."}</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Ride ID</span>
              <span>{currentRide?.rideId || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>ETA</span>
              <span>{Number(currentRide?.etaMinutes || 0) > 0 ? `${currentRide.etaMinutes} phut` : "Updating..."}</span>
            </div>
          </div>

          <div className="mb-4">
            <button
              className={`w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium active:scale-[0.98] ${
                loading ? "opacity-70 pointer-events-none" : ""
              }`}
              onClick={handleArrived}
              disabled={loading}
            >
              {loading ? "Updating..." : "I arrived at pickup"}
            </button>
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
