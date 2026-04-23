export function DriverAssignedPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 px-6 pt-6 z-10">
          <h1 className="text-lg font-semibold text-slate-900">Tài xế đã nhận chuyến</h1>
        </div>

        <div className="absolute inset-x-0 top-[70px] bottom-[320px] bg-slate-200 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center mb-3 pointer-events-none">
            <div className="w-6 h-6 bg-slate-900 rounded-full"></div>
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-[12px] border-l-transparent border-r-transparent border-t-slate-900 -mt-1"></div>
          </div>

          <div className="text-xs tracking-wide text-slate-500 select-none">MAP VIEW</div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-[320px] bg-white rounded-t-[28px] px-6 pt-5 pb-10 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
          </div>

          <div className="flex items-center gap-4 mb-5">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-xl">🚗</div>

            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Nguyễn Văn A</p>
              <p className="text-xs text-slate-500 mt-0.5">⭐ 4.8 · 1.240 chuyến</p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-500">Đến sau</p>
              <p className="text-sm font-semibold">5 phút</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Loại xe</span>
              <span>🚗 Car</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Biển số</span>
              <span>59A‑123.45</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Giá chuyến đi</span>
              <span>45.000đ</span>
            </div>
          </div>

          <div className="flex gap-3 mt-2 mb-4">
            <button className="flex-1 rounded-xl border border-slate-300 py-3 text-sm font-medium text-slate-700 active:scale-[0.98]">
              Gọi tài xế
            </button>
            <button className="flex-1 rounded-xl border border-red-300 py-3 text-sm font-medium text-red-600 active:scale-[0.98]">
              Huỷ chuyến
            </button>
          </div>

          <div className="h-4"></div>
        </div>
      </div>
    </div>
  );
}
