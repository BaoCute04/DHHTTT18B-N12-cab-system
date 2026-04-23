export function DriverIncomingRideRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Cuốc xe mới</h1>
            <p className="text-xs text-slate-500 mt-0.5">Driver App</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700">Online</span>
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
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="text-green-600 text-xs">●</span>
                <span className="h-5 border-l border-dashed border-slate-300" />
                <span className="text-red-500 text-xs">●</span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Điểm đón</p>
                <p className="text-xs text-slate-500 mb-2">123 Lê Lợi, Quận 1</p>
                <p className="text-sm font-medium">Điểm đến</p>
                <p className="text-xs text-slate-500">Vincom Đồng Khởi, Quận 1</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Khoảng cách</span>
              <span>4.5 km</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Thời gian dự kiến</span>
              <span>12 phút</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Thu nhập</span>
              <span>45.000đ</span>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <button className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 active:scale-[0.98]">
              Từ chối
            </button>
            <button className="flex-1 rounded-xl bg-slate-900 text-white py-3 text-sm font-medium active:scale-[0.98]">
              Nhận cuốc
            </button>
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
