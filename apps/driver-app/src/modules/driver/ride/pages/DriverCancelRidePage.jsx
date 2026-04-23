export function DriverCancelRidePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Huỷ chuyến đi</h1>
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
          <div className="rounded-2xl bg-red-50 p-4 mb-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">⚠️</div>
            <p className="text-xs text-red-700">
              Việc huỷ chuyến có thể ảnh hưởng đến điểm đánh giá và quyền nhận cuốc của bạn.
            </p>
          </div>

          <div className="rounded-2xl border p-4 mb-4 space-y-3">
            <p className="text-sm font-medium mb-2">Lý do huỷ chuyến</p>

            <label className="flex items-center gap-3 text-sm">
              <input type="radio" />
              Khách không xuất hiện
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input type="radio" />
              Không liên lạc được với khách
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input type="radio" />
              Sự cố phương tiện
            </label>

            <label className="flex items-center gap-3 text-sm">
              <input type="radio" />
              Lý do khác
            </label>
          </div>

          <div className="flex gap-3 mb-4">
            <button className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 active:scale-[0.98]">
              Giữ chuyến
            </button>
            <button className="flex-1 rounded-xl border border-red-500 py-3 text-sm font-medium text-red-600 active:scale-[0.98]">
              Xác nhận huỷ
            </button>
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
