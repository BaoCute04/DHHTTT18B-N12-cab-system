export function DriverNotificationsPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Thông báo</h1>
          <p className="text-xs text-slate-500 mt-0.5">Driver App</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-6">
          <div className="rounded-2xl bg-blue-50 p-4 border border-blue-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">🚕</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Có cuốc xe mới</p>
                <p className="text-xs text-slate-600 mt-1">Một cuốc xe mới đang chờ bạn nhận trong khu vực gần.</p>
                <p className="text-[11px] text-slate-400 mt-2">1 phút trước</p>
              </div>
            </div>
          </div>

          {[
            ["💰", "Thu nhập hôm nay", "Bạn đã hoàn thành 12 chuyến với tổng thu nhập 320.000đ.", "Hôm nay · 18:00", "bg-green-100"],
            ["🛂", "Cập nhật KYC", "Hồ sơ xác minh của bạn đang được xử lý.", "Hôm qua · 10:15", "bg-yellow-100"],
            ["⚙️", "Thông báo hệ thống", "Hệ thống sẽ bảo trì trong khung giờ 02:00 - 03:00.", "3 ngày trước", "bg-slate-100"]
          ].map(([icon, title, content, time, iconBg]) => (
            <div key={title} className="rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>{icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{title}</p>
                  <p className="text-xs text-slate-600 mt-1">{content}</p>
                  <p className="text-[11px] text-slate-400 mt-2">{time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
