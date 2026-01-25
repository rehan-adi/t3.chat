import { useEffect, useState } from "react";
import { subscriptionApi } from "@/lib/api";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";

export default function VerifySubscriptionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get("order_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!orderId) {
      setStatus("error");
      setMessage("Order ID missing");
      return;
    }

    verifyPayment(orderId);
  }, [orderId]);

  const verifyPayment = async (orderId: string) => {
    try {
      const response = await subscriptionApi.verifySubscription(orderId);

      if (!response.success) {
        throw new Error(response.message || "Verification failed");
      }

      if (response.status === "SUCCESS") {
        setStatus("success");
        setMessage("Payment verified successfully! 🎉");
      } else if (response.status === "FAILED") {
        setStatus("error");
        setMessage("Payment failed. Please try again.");
      } else {
        // Still pending, check again after a delay
        setTimeout(() => {
          verifyPayment(orderId);
        }, 2000);
      }
    } catch (err: unknown) {
      setStatus("error");
      if (err instanceof Error) {
        setMessage(err.message || "Something went wrong");
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181316] px-4">
      <div className="bg-[#231A21] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
        {status === "loading" && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#A2014D]/20 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#A2014D] animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Verifying Payment
              </h1>
              <p className="text-white/70">
                Please wait while we verify your payment...
              </p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Payment Successful!
              </h1>
              <p className="text-white/70 mb-6">{message}</p>
              <button
                onClick={() => navigate("/")}
                className="bg-[#A2014D] text-[#FBD0E8] px-6 py-2 rounded-lg font-medium hover:bg-[#8B0140] transition-colors flex items-center gap-2 mx-auto"
              >
                <span>Go to Chat</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Payment Failed
              </h1>
              <p className="text-white/70 mb-6">{message}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => navigate("/subscription")}
                  className="bg-[#A2014D] text-[#FBD0E8] px-6 py-2 rounded-lg font-medium hover:bg-[#8B0140] transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="bg-white/10 text-white px-6 py-2 rounded-lg font-medium hover:bg-white/20 transition-colors"
                >
                  Go Home
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
