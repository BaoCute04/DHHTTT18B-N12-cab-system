export function DriverOnlineOfflineDashboardPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Bảng điều khiển</h1>
          <p className="text-xs text-slate-500 mt-0.5">Driver App</p>
        </div>

        <div className="px-6 py-6">
          <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-700">Đang Online</p>
              <p className="text-xs text-green-600">Sẵn sàng nhận chuyến</p>
            </div>

            <div className="w-14 h-8 rounded-full bg-green-600 relative">
              <div className="absolute top-1 right-1 w-6 h-6 bg-white rounded-full" />
            </div>
          </div>
        </div>

        <div className="px-6 grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Thu nhập hôm nay</p>
            <p className="text-lg font-semibold text-slate-900">320.000đ</p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500 mb-1">Số chuyến</p>
            <p className="text-lg font-semibold text-slate-900">12</p>
          </div>
        </div>

        <div className="flex-1 px-6 pb-6">
          <div className="w-full h-full rounded-2xl bg-slate-200 flex items-center justify-center text-slate-400 text-sm">
            MAP VIEW
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
