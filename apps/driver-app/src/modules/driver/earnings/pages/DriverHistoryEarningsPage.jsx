export function DriverHistoryEarningsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Thu nhập & lịch sử</h1>
          <p className="text-xs text-slate-500 mt-0.5">Driver App</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          <div className="rounded-2xl bg-green-50 p-4">
            <p className="text-xs text-green-700 mb-1">Thu nhập hôm nay</p>
            <p className="text-2xl font-semibold text-green-800">320.000đ</p>

            <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
              <div className="rounded-xl bg-white p-3 text-center">
                <p className="text-slate-500 text-xs mb-1">Số chuyến</p>
                <p className="font-semibold text-slate-900">12</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-center">
                <p className="text-slate-500 text-xs mb-1">Giờ hoạt động</p>
                <p className="font-semibold text-slate-900">6h 30p</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-900">Lịch sử chuyến đi</p>

            {[
              ["📍 Quận 1 → Quận 3", "Hôm nay · 14:35", "+45.000đ"],
              ["📍 Bình Thạnh → Quận 1", "Hôm nay · 13:10", "+38.000đ"],
              ["📍 Gò Vấp → Tân Bình", "Hôm nay · 11:45", "+52.000đ"]
            ].map(([route, time, earning]) => (
              <div key={route} className="rounded-2xl border p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{route}</p>
                    <p className="text-xs text-slate-500 mt-1">{time}</p>
                  </div>
                  <span className="text-sm font-semibold text-green-700">{earning}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
