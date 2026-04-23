export function DriverLoginOtpRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-100">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-xl">🚖</div>
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Driver App</h1>
              <p className="text-xs text-slate-500">Đăng nhập dành cho tài xế</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6">
          <label className="text-sm font-medium text-slate-700 mb-2">Số điện thoại</label>

          <div className="flex items-center rounded-xl border px-4 py-3 mb-3">
            <span className="text-slate-400 mr-2 text-sm">+84</span>
            <input type="tel" placeholder="Nhập số điện thoại" className="flex-1 outline-none text-sm" />
          </div>

          <p className="text-xs text-slate-500 mb-6">Mã OTP sẽ được gửi tới số điện thoại của bạn</p>
        </div>

        <div className="px-6 pb-8">
          <button className="w-full rounded-xl bg-slate-900 text-white py-3.5 text-sm font-medium active:scale-[0.98]">
            Gửi mã OTP
          </button>
        </div>

        <div className="h-6" />
      </div>
    </div>
  );
}
