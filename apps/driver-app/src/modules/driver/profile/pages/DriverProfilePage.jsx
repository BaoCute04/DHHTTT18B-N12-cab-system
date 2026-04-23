export function DriverProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Hồ sơ tài xế</h1>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="rounded-2xl bg-slate-50 p-4 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-xl">🚖</div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Nguyễn Văn A</p>
              <p className="text-xs text-slate-500">⭐ 4.8 · 1.245 chuyến</p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Đã KYC</span>
          </div>

          <div className="rounded-2xl border divide-y">
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-slate-600">Số điện thoại</span>
              <span className="text-sm font-medium">0123 456 789</span>
            </div>

            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-slate-600">CMND / CCCD</span>
              <span className="text-sm font-medium">********123</span>
            </div>
          </div>

          <div className="rounded-2xl border">
            <div className="px-4 py-3 border-b text-sm font-semibold">Thông tin xe</div>

            <div className="px-4 py-3 flex justify-between text-sm">
              <span>Loại xe</span>
              <span className="font-medium">🚗 Car</span>
            </div>

            <div className="px-4 py-3 flex justify-between text-sm">
              <span>Biển số</span>
              <span className="font-medium">59A-123.45</span>
            </div>
          </div>

          <div className="rounded-2xl border divide-y">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>⚙️</span>
                <span className="text-sm">Cài đặt</span>
              </div>
              <span className="text-slate-400">›</span>
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span>❓</span>
                <span className="text-sm">Hỗ trợ</span>
              </div>
              <span className="text-slate-400">›</span>
            </div>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
