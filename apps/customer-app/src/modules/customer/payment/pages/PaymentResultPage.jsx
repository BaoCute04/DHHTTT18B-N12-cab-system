import { useNavigate } from "react-router-dom";
import { PaymentStatusBadge } from "@/components/status/PaymentStatusBadge.jsx";
import { PAYMENT_STATUS } from "@/constants/paymentStatus.js";
import { useBooking } from "@app/BookingProvider.jsx";

function mapStatus(status) {
  switch (String(status || "").toUpperCase()) {
    case "COMPLETED":
      return PAYMENT_STATUS.PAID;
    case "FAILED":
      return PAYMENT_STATUS.FAILED;
    case "REFUNDED":
      return PAYMENT_STATUS.REFUNDED;
    default:
      return PAYMENT_STATUS.PENDING;
  }
}

export function PaymentResultPage() {
  const navigate = useNavigate();
  const { payment, ride } = useBooking();
  const paymentStatus = mapStatus(payment?.status);
  const paymentAmount = Number(payment?.amount || ride?.priceSnapshot || 0);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-[220px] bg-slate-200">
          <button
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-slate-700"
            onClick={() => navigate("/customer/history/rides")}
          >
            ×
          </button>

          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">MAP VIEW</div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-[520px] bg-white rounded-t-[28px] px-6 pt-6 pb-14 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
          <div className="flex justify-center mb-5">
            <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
          </div>

          <div className="flex flex-col items-center mb-5">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl ${paymentStatus === PAYMENT_STATUS.PAID ? "bg-green-50" : "bg-red-50"}`}>
              {paymentStatus === PAYMENT_STATUS.PAID ? "✓" : "!"}
            </div>
            <div className="mt-4">
              <PaymentStatusBadge status={paymentStatus} />
            </div>
            <h1 className="text-lg font-semibold mt-3">
              {paymentStatus === PAYMENT_STATUS.PAID ? "Thanh toan thanh cong" : "Thanh toan chua hoan tat"}
            </h1>
            <p className="text-sm text-slate-500 mt-1 text-center">
              {payment?.paymentId ? `Payment ID: ${payment.paymentId}` : "Dang dong bo ket qua thanh toan"}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Phuong thuc</span>
              <span>{payment?.method || "cash"}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span>Ma giao dich</span>
              <span>{payment?.paymentId || "N/A"}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold pt-2 border-t">
              <span>Tong thanh toan</span>
              <span>{paymentAmount.toLocaleString("vi-VN")}d</span>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            <button
              className="w-full rounded-xl bg-slate-900 text-white py-3.5 text-sm font-medium active:scale-[0.98]"
              onClick={() => navigate("/customer/review/rating")}
            >
              Danh gia chuyen di
            </button>
            <button
              className="w-full rounded-xl border border-slate-300 py-3.5 text-sm font-medium text-slate-700 active:scale-[0.98]"
              onClick={() => navigate("/customer/history/rides")}
            >
              Xem lich su chuyen di
            </button>
          </div>

          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
}
