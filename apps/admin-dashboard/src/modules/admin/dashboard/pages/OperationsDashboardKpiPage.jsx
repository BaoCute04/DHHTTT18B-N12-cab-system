export function OperationsDashboardKpiPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Tổng quan vận hành</h1>
          <p className="text-sm text-slate-500 mt-0.5">Operations Dashboard</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-blue-50 p-4">
              <p className="text-xs text-blue-600 mb-1">Tổng Users</p>
              <p className="text-2xl font-semibold text-blue-900">124,532</p>
              <p className="text-xs text-blue-500 mt-1">+1,245 hôm nay</p>
            </div>

            <div className="rounded-2xl bg-green-50 p-4">
              <p className="text-xs text-green-600 mb-1">Tổng Drivers</p>
              <p className="text-2xl font-semibold text-green-900">8,932</p>
              <p className="text-xs text-green-500 mt-1">+86 đang online</p>
            </div>

            <div className="rounded-2xl bg-purple-50 p-4">
              <p className="text-xs text-purple-600 mb-1">Bookings hôm nay</p>
              <p className="text-2xl font-semibold text-purple-900">12,480</p>
              <p className="text-xs text-purple-500 mt-1">+8.3%</p>
            </div>

            <div className="rounded-2xl bg-yellow-50 p-4">
              <p className="text-xs text-yellow-600 mb-1">Doanh thu</p>
              <p className="text-2xl font-semibold text-yellow-900">3.2 tỷ</p>
              <p className="text-xs text-yellow-500 mt-1">VND hôm nay</p>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm font-medium mb-3">Trạng thái hệ thống</p>
            <div className="space-y-2 text-sm">
              {[
                ["Booking Service", "Hoạt động"],
                ["Payment Service", "Hoạt động"],
                ["Realtime Map", "Ổn định"]
              ].map(([label, status]) => (
                <div key={label} className="flex justify-between">
                  <span>{label}</span>
                  <span className="text-green-600 font-medium">{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <p className="text-sm font-medium mb-3">Thao tác nhanh</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {["User Management", "Driver KYC", "Booking Monitor", "System Logs"].map((item) => (
                <button key={item} className="rounded-xl bg-slate-100 py-3">
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
