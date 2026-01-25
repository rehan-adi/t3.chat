import { useState } from "react";
import { authApi } from "@/lib/api";
import { useNavigate } from "react-router-dom";

export default function Signin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setError("Please enter your email");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    try {
      await authApi.requestOtp(trimmedEmail);
      sessionStorage.setItem("user_auth_email", trimmedEmail);
      navigate("/verify-otp");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to send OTP");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#231A21]">
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#181316] px-4">
        <div className="mb-3">
          <img
            src="/assets/logo.png"
            alt="T3 Chat Logo"
            width={48}
            height={48}
            className="mx-auto w-11.5 h-11.5"
          />
        </div>

        <h1 className="text-white text-2xl font-semibold mb-6 text-center">
          Sign in to T3 Chat
        </h1>

        <div className="w-full max-w-md sm:max-w-lg md:max-w-md lg:max-w-sm border border-white/10 px-6 py-7 rounded-2xl bg-[#231A21]">
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full px-3 py-2 rounded-md bg-[#21181C] text-white placeholder:text-white outline-none text-md mb-4 border border-white/10"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-[#A2014D] text-[#FBD0E8] text-sm py-2 rounded-md font-medium disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? "Sending OTP" : "Send OTP"}
          </button>

          {error && (
            <p className="mt-3 text-sm text-red-400 text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
