import { useState } from "react";
import { subscriptionApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Check, Sparkles, Zap, Shield } from "lucide-react";

export default function Subscription() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await subscriptionApi.initiateSubscription("PREMIUM");

      if (!response.success || !response.data?.payment_session_id) {
        throw new Error(response.message || "Failed to initiate subscription");
      }

      navigate(`/done?paymentSessionId=${response.data.payment_session_id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to initiate subscription. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Unlimited Conversations",
      description: "Chat without limits",
    },
    {
      icon: <Sparkles className="w-5 h-5" />,
      title: "Advanced AI Models",
      description: "Access to premium AI capabilities",
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: "Priority Support",
      description: "Get help when you need it",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#181316] px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#A2014D] to-[#FBD0E8] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Upgrade to Premium
          </h1>
          <p className="text-white/70 text-lg">
            Unlock the full potential of T3 Chat
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-[#231A21] border border-white/10 rounded-2xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="flex items-baseline justify-center gap-2 mb-2">
              <span className="text-5xl font-bold text-white">₹450</span>
              <span className="text-white/60 text-lg">/month</span>
            </div>
            <p className="text-white/70 text-sm">Billed monthly</p>
          </div>

          {/* Features List */}
          <div className="space-y-4 mb-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-[#21181C] border border-white/5"
              >
                <div className="text-[#A2014D] mt-0.5">{feature.icon}</div>
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-white/60 text-sm">{feature.description}</p>
                </div>
                <Check className="w-5 h-5 text-[#A2014D] flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* CTA Button */}
          <button
            onClick={handleSubscribe}
            disabled={isLoading}
            className="w-full bg-[#A2014D] hover:bg-[#8B0140] text-[#FBD0E8] font-semibold py-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-[#FBD0E8] border-t-transparent rounded-full animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Subscribe Now</span>
                <Sparkles className="w-5 h-5" />
              </>
            )}
          </button>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Trust Badge */}
          <div className="mt-6 text-center">
            <p className="text-white/50 text-xs">
              Secure payment powered by Cashfree
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="text-center">
          <p className="text-white/50 text-sm">
            Cancel anytime. No hidden fees.
          </p>
        </div>
      </div>
    </div>
  );
}
