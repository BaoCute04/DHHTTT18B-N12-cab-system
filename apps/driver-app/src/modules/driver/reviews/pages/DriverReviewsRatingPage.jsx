export function DriverReviewsRatingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b">
          <h1 className="text-lg font-semibold text-slate-900">Đánh giá & nhận xét</h1>
          <p className="text-xs text-slate-500 mt-0.5">Driver App</p>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="rounded-2xl bg-yellow-50 p-4 flex items-center gap-4">
            <div className="text-center">
              <p className="text-3xl font-semibold text-yellow-700">4.8</p>
              <p className="text-xs text-yellow-600">/ 5.0</p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-1 text-yellow-400">★ ★ ★ ★ ★</div>
              <p className="text-xs text-slate-500">1.245 lượt đánh giá</p>
            </div>
          </div>

          <div className="rounded-2xl border p-4 space-y-2 text-sm">
            {[
              ["5 sao", "980"],
              ["4 sao", "200"],
              ["3 sao", "45"],
              ["2 sao", "15"],
              ["1 sao", "5"]
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <span className="text-slate-500">{value}</span>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-slate-900">Nhận xét gần đây</p>

            {[
              ["★ ★ ★ ★ ★", "Hôm nay", "Tài xế lịch sự, lái xe an toàn và đúng giờ."],
              ["★ ★ ★ ★ ☆", "Hôm qua", "Chuyến đi ổn, xe sạch sẽ."],
              ["★ ★ ★ ★ ★", "2 ngày trước", "Rất hài lòng, sẽ tiếp tục ủng hộ."]
            ].map(([stars, time, content]) => (
              <div key={`${time}-${content}`} className="rounded-2xl border p-4">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-1 text-yellow-400 text-xs">{stars}</div>
                  <span className="text-xs text-slate-400">{time}</span>
                </div>
                <p className="text-sm text-slate-700">{content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
