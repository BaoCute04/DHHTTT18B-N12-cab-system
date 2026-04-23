export function DriverKycVehicleProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Xác minh KYC</h1>
          <p className="text-xs text-slate-500 mt-0.5">Hoàn tất hồ sơ để nhận chuyến</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="rounded-2xl bg-yellow-50 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">🕒</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Hồ sơ đang được duyệt</p>
              <p className="text-xs text-slate-500 mt-1">
                Vui lòng chờ trong 24-48 giờ để hệ thống xác minh thông tin.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border">
            <div className="px-4 py-3 border-b text-sm font-semibold">Giấy tờ cá nhân</div>

            <div className="px-4 py-3 flex justify-between items-center text-sm">
              <span>CMND / CCCD</span>
              <span className="text-green-600 font-medium">Đã gửi</span>
            </div>

            <div className="px-4 py-3 flex justify-between items-center text-sm">
              <span>Giấy phép lái xe</span>
              <span className="text-green-600 font-medium">Đã gửi</span>
            </div>
          </div>

          <div className="rounded-2xl border">
            <div className="px-4 py-3 border-b text-sm font-semibold">Thông tin xe</div>

            <div className="px-4 py-3 flex justify-between items-center text-sm">
              <span>Loại xe</span>
              <span className="font-medium">🚗 Car</span>
            </div>

            <div className="px-4 py-3 flex justify-between items-center text-sm">
              <span>Biển số</span>
              <span className="font-medium">59A-123.45</span>
            </div>

            <div className="px-4 py-3 flex justify-between items-center text-sm">
              <span>Giấy đăng ký xe</span>
              <span className="text-green-600 font-medium">Đã gửi</span>
            </div>
          </div>

          <div className="rounded-2xl border-dashed border-2 border-slate-300 p-4 text-center">
            <p className="text-sm text-slate-600 mb-2">Cập nhật hoặc bổ sung giấy tờ</p>
            <button className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">
              Tải lên giấy tờ
            </button>
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
