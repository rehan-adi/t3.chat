import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { load } from "@cashfreepayments/cashfree-js";
import { Loader2, CreditCard } from "lucide-react";

export default function Done() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentSessionId = searchParams.get("paymentSessionId");
  const [cashfree, setCashfree] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const initCashfree = async () => {
      try {
        const cf = await load({ mode: "sandbox" });
        setCashfree(cf);
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to load Cashfree:", err);
        setError("Failed to load payment gateway. Please try again.");
        setIsLoading(false);
      }
    };

    initCashfree();
  }, []);

  useEffect(() => {
    if (cashfree && paymentSessionId && !isLoading) {
      // Auto-trigger payment after Cashfree is loaded
      handlePayment();
    }
  }, [cashfree, paymentSessionId, isLoading]);

  const handlePayment = () => {
    if (!cashfree || !paymentSessionId) {
      setError("Payment session not available");
      return;
    }

    try {
      const checkoutOptions = {
        paymentSessionId,
        redirectTarget: "_self" as const,
      };

      cashfree.checkout(checkoutOptions);
    } catch (err) {
      console.error("Payment error:", err);
      setError("Failed to initiate payment. Please try again.");
    }
  };

  if (!paymentSessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181316] px-4">
        <div className="text-center">
          <div className="mb-4 text-red-400">
            <CreditCard className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Payment Session Missing
          </h1>
          <p className="text-white/70 mb-6">
            No payment session found. Please start over.
          </p>
          <button
            onClick={() => navigate("/subscription")}
            className="bg-[#A2014D] text-[#FBD0E8] px-6 py-2 rounded-lg font-medium hover:bg-[#8B0140] transition-colors"
          >
            Go to Subscription
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181316] px-4">
        <div className="bg-[#231A21] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="mb-4 text-red-400">
            <CreditCard className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Error</h1>
          <p className="text-white/70 mb-6">{error}</p>
          <button
            onClick={() => navigate("/subscription")}
            className="bg-[#A2014D] text-[#FBD0E8] px-6 py-2 rounded-lg font-medium hover:bg-[#8B0140] transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181316] px-4">
      <div className="bg-[#231A21] border border-white/10 rounded-2xl p-8 max-w-md w-full text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#A2014D]/20 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-[#A2014D] animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Redirecting to Payment
          </h1>
          <p className="text-white/70">
            Please wait while we redirect you to the secure payment page...
          </p>
        </div>
      </div>
    </div>
  );
}
