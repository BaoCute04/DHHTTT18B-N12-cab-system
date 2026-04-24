import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBooking } from "@app/BookingProvider.jsx";
import { useAuth } from "@app/AuthProvider.jsx";
import { confirmPayment, createPayment } from "@/api/customerApi.js";

function resolveSessionUserId(session) {
  return (
    session?.user?.subject_id ||
    session?.user?.subjectId ||
    session?.user?.userId ||
    session?.user?.id ||
    session?.subjectId ||
    session?.subject_id ||
    null
  );
}

export function PaymentMethodSelectionPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { ride, quote, payment, setPayment } = useBooking();
  const [loading, setLoading] = useState(false);

  const amount = Number(payment?.amount || ride?.priceSnapshot || quote?.price || quote?.priceSnapshot?.amount || 0);
  const rideId = ride?.rideId;
  const userId = resolveSessionUserId(session);

  const handleConfirmPayment = async () => {
    if (!rideId || !userId || amount <= 0) {
      alert("Khong du thong tin de xu ly thanh toan.");
      return;
    }

    setLoading(true);
    try {
      const created = await createPayment({
        rideId,
        userId,
        amount,
        currency: "VND",
        method: "cash",
        idempotencyKey: `ride-payment-${rideId}`
      });
      const paymentRecord = created.data || created;
      const confirmed = await confirmPayment(paymentRecord.paymentId, "success");
      setPayment(confirmed.data || confirmed);
      navigate("/customer/payment/result");
    } catch (error) {
      console.error("Payment confirm error:", error);
      alert(error.message || "Khong the xu ly thanh toan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-sm h-[760px] bg-white rounded-[28px] shadow-lg overflow-hidden relative">
        <div className="absolute top-0 inset-x-0 h-[220px] bg-slate-200">
          <button className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white shadow flex items-center justify-center text-slate-700" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">MAP VIEW</div>
        </div>

        <div className="absolute bottom-0 inset-x-0 h-[520px] bg-white rounded-t-[28px] px-6 pt-5 pb-14 shadow-[0_-10px_30px_rgba(0,0,0,0.18)]">
          <div className="flex justify-center mb-4">
            <div className="w-10 h-1.5 rounded-full bg-slate-300"></div>
          </div>

          <h1 className="text-lg font-semibold text-slate-900 mb-4">Chon phuong thuc thanh toan</h1>

          <div className="space-y-3 mb-6">
            <div className="rounded-xl border-2 border-slate-900 bg-slate-50 px-4 py-3 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow">💵</div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Tien mat</p>
                <p className="text-xs text-slate-500">Payment-service xu ly theo rideId {rideId || "N/A"}</p>
              </div>
              <span className="font-semibold">✓</span>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Ma thanh toan</span>
              <span>{payment?.paymentId || "Se tao tu payment-service"}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Tong thanh toan</span>
              <span>{amount.toLocaleString("vi-VN")}d</span>
            </div>
          </div>

          <div className="mb-6">
            <button
              className={`w-full rounded-xl bg-slate-900 text-white py-3.5 text-sm font-medium active:scale-[0.98] ${
                loading ? "opacity-70 pointer-events-none" : ""
              }`}
              onClick={handleConfirmPayment}
              disabled={loading}
            >
              {loading ? "Dang xu ly..." : "Xac nhan thanh toan"}
            </button>
          </div>

          <div className="h-6"></div>
        </div>
      </div>
    </div>
  );
}
