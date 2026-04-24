import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@app/BookingProvider.jsx";

export function HomeMapPickupPage() {
  const navigate = useNavigate();
  const { setPickup, setDestination } = useBooking();
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  
  const [step, setStep] = useState("pickup"); 
  const [coords, setCoords] = useState({ lat: 10.7769, lng: 106.7009 });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const searchTimeout = useRef(null);

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.trim().length < 2) {
      setSearchResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const viewbox = "106.6000,10.8500,106.8000,10.7000"; 
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ", Việt Nam")}&viewbox=${viewbox}&bounded=0&addressdetails=1&limit=8`
        );
        const data = await response.json();
        setSearchResults(data);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300); // Faster debounce: 300ms
  };

  const selectLocation = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    const newCoords = { lat, lng };
    
    setCoords(newCoords);
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);

    if (leafletMap.current) {
      leafletMap.current.flyTo([lat, lng], 17);
    }
  };

  useEffect(() => {
    if (!leafletMap.current && window.L) {
      leafletMap.current = window.L.map(mapRef.current, {
        center: [10.7769, 106.7009],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(leafletMap.current);

      leafletMap.current.on("move", () => {
        const center = leafletMap.current.getCenter();
        setCoords({ lat: center.lat, lng: center.lng });
      });
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, []);

  const handleConfirmLocation = () => {
    if (step === "pickup") {
      setPickup({ address: "Vị trí đã chọn", ...coords });
      setStep("destination");
      setSearchQuery("");
    } else {
      setDestination({ address: "Vị trí đã chọn", ...coords });
      navigate("/customer/booking/ride-options"); // FIXED PATH
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[800px] bg-white rounded-[32px] shadow-2xl overflow-hidden relative border-4 border-slate-900/5">
        
        {/* Search UI */}
        <div className="absolute top-6 inset-x-6 z-[2000] space-y-2">
          <div className={`bg-white rounded-2xl shadow-2xl p-2 border-2 transition-all ${isSearching ? 'border-slate-900' : 'border-white'}`}>
             <div className="flex flex-col">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                   <div className={`w-2 h-2 rounded-full ${step === 'pickup' ? 'bg-slate-900' : 'bg-red-500'}`}></div>
                   <input 
                      className="bg-transparent flex-1 text-sm font-bold outline-none text-slate-800 placeholder:text-slate-400"
                      placeholder={step === 'pickup' ? "Tìm điểm đón..." : "Tìm điểm đến..."}
                      value={searchQuery}
                      onChange={(e) => handleSearch(e.target.value)}
                      onFocus={() => setIsSearching(true)}
                   />
                   {loading && <div className="animate-spin text-slate-400 text-xs">🌀</div>}
                   {searchQuery && !loading && (
                     <button onClick={() => {setSearchQuery(""); setSearchResults([]);}} className="text-slate-300">✕</button>
                   )}
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                    {searchResults.map((result, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors flex gap-3 items-start"
                        onClick={() => selectLocation(result)}
                      >
                        <span className="text-lg">📍</span>
                        <div className="flex-1 overflow-hidden">
                           <p className="text-sm font-bold text-slate-900 truncate">{result.display_name.split(',')[0]}</p>
                           <p className="text-[10px] text-slate-500 truncate">{result.display_name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
        </div>

        {/* Leaflet Map */}
        <div ref={mapRef} className="absolute inset-0 z-0" onClick={() => setIsSearching(false)}></div>
        
        {/* Center Marker Overlay */}
        {!isSearching && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center pb-8 z-[1001]">
             <div className="flex flex-col items-center">
                <div className={`w-10 h-10 ${step === 'pickup' ? 'bg-slate-900' : 'bg-red-600'} rounded-full flex items-center justify-center shadow-2xl border-4 border-white`}>
                   <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <div className="w-4 h-1 bg-black/20 rounded-full blur-[2px] mt-1 scale-x-150"></div>
             </div>
          </div>
        )}

        {/* Bottom Confirm Panel */}
        <div className="absolute bottom-0 inset-x-0 bg-white rounded-t-[32px] px-6 pt-5 pb-8 shadow-[0_-15px_50px_rgba(0,0,0,0.2)] z-[1002]">
          <div className="flex justify-center mb-5">
            <div className="w-12 h-1.5 rounded-full bg-slate-200"></div>
          </div>

          <div className="flex items-center gap-4 mb-6">
             <div className={`w-12 h-12 rounded-2xl ${step === 'pickup' ? 'bg-slate-900' : 'bg-red-600'} flex items-center justify-center shadow-lg text-xl`}>
                {step === 'pickup' ? '🏠' : '🏁'}
             </div>
             <div className="flex-1 overflow-hidden">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                   {step === 'pickup' ? 'Vị trí đón' : 'Vị trí đến'}
                </p>
                <p className="text-sm font-bold text-slate-900 truncate">
                   {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
             </div>
          </div>

          <button
            className={`w-full rounded-2xl ${step === 'pickup' ? 'bg-slate-900' : 'bg-red-600'} text-white py-4 text-sm font-bold shadow-xl active:scale-95 transition-all`}
            onClick={handleConfirmLocation}
          >
            {step === "pickup" ? "Xác nhận điểm đón" : "Xác nhận điểm đến"}
          </button>
        </div>
      </div>
    </div>
  );
}
