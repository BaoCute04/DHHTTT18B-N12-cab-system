export function HomeMapPickupPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 px-6 pt-6 z-10">
          <h1 className="text-lg font-semibold text-slate-900">Chọn điểm đón</h1>
        </div>

        <div className="absolute inset-x-0 top-[70px] bottom-[260px] bg-slate-200 flex flex-col items-center justify-center">
          <div className="flex flex-col items-center mb-3 pointer-events-none">
            <div className="w-6 h-6 bg-slate-900 rounded-full"></div>
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-[12px] border-l-transparent border-r-transparent border-t-slate-900 -mt-1"></div>
          </div>

          <div className="text-xs tracking-wide text-slate-500 select-none">MAP VIEW</div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-[260px] bg-white rounded-t-[28px] px-6 pt-5 pb-6 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow">📍</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Điểm đón</p>
                <p className="text-xs text-slate-500 mt-0.5">Vị trí hiện tại của bạn</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 rounded-xl border px-3 py-2.5 text-xs flex items-center justify-center gap-1">
              🏠 <span>Nhà</span>
            </div>
            <div className="flex-1 rounded-xl border px-3 py-2.5 text-xs flex items-center justify-center gap-1">
              💼 <span>Công ty</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
