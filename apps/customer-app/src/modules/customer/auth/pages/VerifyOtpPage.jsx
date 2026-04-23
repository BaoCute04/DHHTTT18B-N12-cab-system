export function VerifyOtpPage() {
  return (
    <div className="min-h-screen bg-slate-100 px-4 flex items-center justify-center">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden flex flex-col">
        <div className="px-6 pt-8">
          <h1 className="text-2xl font-bold tracking-tight">Xác minh mã OTP</h1>
          <p className="text-slate-500 text-sm mt-1">Nhập mã 6 chữ số đã được gửi đến điện thoại của bạn</p>
        </div>

        <div className="flex-1 px-6 flex flex-col justify-center">
          <div className="flex justify-between gap-3">
            <input className="w-full h-14 rounded-xl border text-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <input className="w-full h-14 rounded-xl border text-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <input className="w-full h-14 rounded-xl border text-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <input className="w-full h-14 rounded-xl border text-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <input className="w-full h-14 rounded-xl border text-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900" />
            <input className="w-full h-14 rounded-xl border text-center text-xl font-semibold focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Không nhận được mã?{" "}
              <span className="font-medium text-slate-900 cursor-pointer">Gửi lại</span>
            </p>
          </div>
        </div>

        <div className="px-6 pb-8">
          <button className="w-full rounded-xl bg-slate-900 text-white py-3 text-sm font-medium active:scale-[0.98]">
            Xác minh
          </button>
        </div>
      </div>
    </div>
  );
}
