import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@app/BookingProvider.jsx";
import { request } from "@/services/httpClient.js";

const VEHICLE_OPTIONS = [
  { id: "bike", type: "Xe may", icon: "🏍️", fallbackEtaLabel: "2 phut" },
  { id: "car", type: "O to 4 cho", icon: "🚗", fallbackEtaLabel: "5 phut" },
  { id: "car_plus", type: "O to 7 cho", icon: "🚐", fallbackEtaLabel: "7 phut" }
];

function formatDuration(durationMin) {
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    return null;
  }

  return `${Math.round(durationMin)} phut`;
}

export function RideOptionsPricingPage() {
  const navigate = useNavigate();
  const { pickup, destination, quote, setQuote, selectedRideOption, setSelectedRideOption } = useBooking();
  const [options, setOptions] = useState([]);
  const [selectedId, setSelectedId] = useState(selectedRideOption?.id || "bike");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!pickup || !destination) {
      navigate("/customer/booking/pickup");
      return;
    }

    let cancelled = false;

    async function loadQuotes() {
      setLoading(true);
      try {
        const quoteResults = await Promise.allSettled(
          VEHICLE_OPTIONS.map(async (vehicle) => {
            const response = await request("/api/v1/pricing/quote", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                pickupAddress: pickup.address || "Vi tri da chon",
                destinationAddress: destination.address || "Diem den",
                pickupLat: pickup.lat,
                pickupLng: pickup.lng,
                dropLat: destination.lat,
                dropLng: destination.lng,
                vehicleType: vehicle.id
              })
            });

            const result = await response.json();
            if (!response.ok || !result?.success) {
              throw new Error(result?.message || `Khong the lay gia cho ${vehicle.type}`);
            }

            const priceSnapshot = result.data?.priceSnapshot || {};
            return {
              ...vehicle,
              quoteId: result.data?.quoteId || null,
              expiresIn: result.data?.expiresIn || null,
              distance: Number(priceSnapshot.distance?.split?.(" ")[0] || 0),
              durationMin: Number(priceSnapshot.duration?.split?.(" ")[0] || 0),
              etaLabel: formatDuration(Number(priceSnapshot.duration?.split?.(" ")[0] || 0)) || vehicle.fallbackEtaLabel,
              price: Number(priceSnapshot.amount || 0),
              surgeMultiplier: Number(priceSnapshot.surgeMultiplier || 1),
              metrics: priceSnapshot.metrics || {},
              priceSnapshot
            };
          })
        );

        if (cancelled) {
          return;
        }

        const successfulOptions = quoteResults
          .filter((item) => item.status === "fulfilled")
          .map((item) => item.value)
          .sort((left, right) => left.price - right.price);

        if (successfulOptions.length === 0) {
          navigate("/customer/booking/network-error", {
            replace: true,
            state: {
              message: "Khong the lay bao gia cho khu vuc nay. Vui long thu lai sau."
            }
          });
          return;
        }

        setOptions(successfulOptions);
        const preferredOption =
          successfulOptions.find((item) => item.id === selectedId) ||
          successfulOptions[0];
        setSelectedId(preferredOption.id);
        setSelectedRideOption(preferredOption);
        setQuote(preferredOption);
      } catch (error) {
        if (!cancelled) {
          navigate("/customer/booking/network-error", {
            replace: true,
            state: {
              message: error.message || "Khong the ket noi den pricing service."
            }
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuotes();

    return () => {
      cancelled = true;
    };
  }, [destination, navigate, pickup, setQuote, setSelectedRideOption]);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedId) || null,
    [options, selectedId]
  );

  const handleConfirmRide = () => {
    if (!selectedOption) {
      return;
    }

    setSelectedRideOption(selectedOption);
    setQuote(selectedOption);
    navigate("/customer/booking/confirmation");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[800px] bg-white rounded-[32px] shadow-2xl overflow-hidden flex flex-col border-4 border-slate-900/5">
        <div className="px-6 pt-8 pb-4">
          <button onClick={() => navigate(-1)} className="text-slate-400 mb-4 flex items-center gap-2 text-sm font-bold">
            <span>←</span> QUAY LAI
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Chon loai xe</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">VND</span>
            <p className="text-xs text-slate-400">
              {quote?.metrics?.zone ? `Zone ${quote.metrics.zone}` : "Bao gia realtime tu pricing-service"}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 space-y-3 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <div className="animate-spin text-4xl mb-4 text-slate-200">🌀</div>
              <p className="text-sm font-bold">Dang lay bao gia realtime...</p>
            </div>
          ) : (
            options.map((option) => (
              <div
                key={option.id}
                onClick={() => {
                  setSelectedId(option.id);
                  setSelectedRideOption(option);
                  setQuote(option);
                }}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                  selectedId === option.id
                    ? "border-slate-900 bg-slate-50 shadow-md scale-[1.02]"
                    : "border-slate-50 bg-white opacity-80"
                }`}
              >
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center text-3xl shadow-inner">
                  {option.icon}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-900">{option.type}</p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {option.etaLabel} • Surge x{option.surgeMultiplier.toFixed(1)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{option.price.toLocaleString("vi-VN")}d</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-white border-t border-slate-50 space-y-4">
          <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">💵</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">Thanh toan</p>
                <p className="text-xs font-bold text-slate-900">Tien mat</p>
              </div>
            </div>
            <button className="text-[10px] font-bold text-blue-600" onClick={() => navigate("/customer/payment/method")}>
              CHI TIET
            </button>
          </div>

          <button
            className={`w-full rounded-2xl py-4 text-sm font-bold shadow-xl transition-all ${
              selectedOption ? "bg-slate-900 text-white active:scale-95 shadow-slate-200" : "bg-slate-100 text-slate-400"
            }`}
            disabled={!selectedOption}
            onClick={handleConfirmRide}
          >
            {selectedOption ? `DAT ${selectedOption.type.toUpperCase()}` : "CHON LOAI XE"}
          </button>
        </div>
      </div>
    </div>
  );
}
