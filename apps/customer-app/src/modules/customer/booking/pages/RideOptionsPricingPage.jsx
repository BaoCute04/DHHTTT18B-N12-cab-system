export function RideOptionsPricingPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Chọn loại xe</h1>
          <p className="text-xs text-slate-500 mt-1">Giá đã bao gồm khuyến mãi (nếu có)</p>
        </div>

        <div className="flex-1 px-6 py-4 space-y-3 overflow-y-auto">
          <div className="rounded-2xl border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg">🛵</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Bike</p>
              <p className="text-xs text-slate-500">1 khách · Nhanh chóng, tiết kiệm</p>
            </div>
            <div className="text-sm font-semibold">25.000đ</div>
          </div>

          <div className="rounded-2xl border-2 border-slate-900 p-4 flex items-center gap-4 bg-slate-50">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-lg shadow">🚗</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Car</p>
              <p className="text-xs text-slate-500">4 khách · Thoải mái, điều hòa</p>
            </div>
            <div className="text-sm font-semibold text-slate-900">45.000đ</div>
          </div>

          <div className="rounded-2xl border p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg">🚙</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Car Plus</p>
              <p className="text-xs text-slate-500">6 khách · Rộng rãi hơn</p>
            </div>
            <div className="text-sm font-semibold">65.000đ</div>
          </div>
        </div>

        <div className="px-6 py-4 border-t">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-slate-600">Giá ước tính</p>
            <p className="text-sm font-semibold">45.000đ</p>
          </div>

          <button className="w-full rounded-xl bg-slate-900 text-white py-3.5 text-sm font-medium active:scale-[0.98]">
            Tiếp tục
          </button>
        </div>
      </div>
    </div>
  );
}
