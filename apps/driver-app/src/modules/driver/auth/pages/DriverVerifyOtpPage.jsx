export function DriverVerifyOtpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">🚖</div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Xác minh OTP</h1>
              <p className="text-xs text-slate-500">Driver App</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6">
          <p className="text-sm text-slate-600 mb-4">
            Nhập mã OTP đã được gửi đến
            <br />
            <span className="font-medium text-slate-900">0123 456 789</span>
          </p>

          <div className="flex justify-between gap-2 mb-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <input
                key={index}
                className="w-full h-14 rounded-xl border text-center text-xl font-semibold outline-none"
              />
            ))}
          </div>

          <p className="text-xs text-slate-500 text-center">
            Không nhận được mã? <span className="text-slate-900 font-medium">Gửi lại</span>
          </p>
        </div>

        <div className="px-6 pb-8">
          <button className="w-full rounded-xl bg-slate-900 text-white py-3.5 text-sm font-medium active:scale-[0.98]">
            Xác minh
          </button>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
