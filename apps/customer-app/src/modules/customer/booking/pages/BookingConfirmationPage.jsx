export function BookingConfirmationPage() {
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Xác nhận chuyến đi</h1>
        </div>

        <div className="flex-1 px-6 py-4 overflow-y-auto">
          <div className="rounded-2xl border p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="text-green-600">●</span>
                <span className="h-6 border-l border-dashed border-slate-300"></span>
                <span className="text-red-500">●</span>
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">Điểm đón</p>
                <p className="text-slate-500 mb-2">Vị trí hiện tại của bạn</p>
                <p className="font-medium">Điểm đến</p>
                <p className="text-slate-500">Vincom Đồng Khởi, Quận 1</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg">🚗</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Car</p>
              <p className="text-xs text-slate-500">4 khách · Thoải mái, điều hòa</p>
            </div>
            <div className="text-sm font-semibold">45.000đ</div>
          </div>

          <div className="rounded-2xl border p-4 mb-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-lg">💵</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Thanh toán</p>
              <p className="text-xs text-slate-500">Tiền mặt</p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Giá chuyến đi</span>
              <span>45.000đ</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Phí nền tảng</span>
              <span>0đ</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-2 border-t">
              <span>Tổng cộng</span>
              <span>45.000đ</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-6">
          <button className="w-full rounded-xl bg-slate-900 text-white py-3.5 text-sm font-medium active:scale-[0.98]">
            Đặt xe
          </button>
        </div>
      </div>
    </div>
  );
}
