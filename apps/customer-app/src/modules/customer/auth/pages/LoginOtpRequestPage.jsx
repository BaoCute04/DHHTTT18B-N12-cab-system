export function LoginOtpRequestPage() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 flex items-center justify-center">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Chào mừng bạn</h1>
          <p className="text-slate-500 text-sm mt-1">Đăng nhập để tiếp tục đặt chuyến đi</p>
        </div>

        <div className="flex-1 px-6 flex flex-col justify-center">
          <label className="text-sm font-medium text-slate-700 mb-2">Số điện thoại</label>

          <div className="flex items-center rounded-xl border px-4 py-3 focus-within:ring-2 focus-within:ring-slate-900">
            <span className="text-slate-400 text-sm mr-2">+84</span>
            <input type="tel" placeholder="Nhập số điện thoại" className="flex-1 outline-none text-sm" />
          </div>

          <p className="text-xs text-slate-500 mt-3">Mã OTP sẽ được gửi qua SMS</p>
        </div>

        <div className="px-6 pb-8">
          <button className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium active:scale-[0.98]">
            Gửi mã OTP
          </button>
        </div>
      </div>
    </div>
  );
}
