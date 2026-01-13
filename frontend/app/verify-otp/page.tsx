"use client";

import axios from "axios";
import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function VerifyOTPPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const router = useRouter();
  const [otp, setOtp] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);

  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    if (otp.some((digit) => digit === "")) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/verify-otp`,
        { email, otp: otp.join("") },
        { withCredentials: true }
      );

      if (res.status === 200 || res.status === 201) {
        router.push("/");
      }
    } catch (err) {
      console.error("OTP verification failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#181316] px-4">
      <h1 className="text-white text-2xl font-semibold mb-6 text-center">
        Verify OTP
      </h1>

      <p className="text-white/60 mb-6 text-center">
        Enter the 6-digit code sent to <br />
        <span className="text-[#A2014D]">{email}</span>
      </p>

      <div className="flex justify-center gap-3 mb-6">
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-12 h-12 sm:w-14 sm:h-14 text-center text-[#A2014D] bg-[#21181C] border border-[#312028] rounded-md text-xl focus:outline-none focus:ring-2 focus:ring-[#A2014D] focus:border-[#A2014D]"
          />
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full sm:w-[30%] bg-[#A2014D] text-[#FBD0E8] py-2 rounded font-medium disabled:opacity-70"
      >
        {loading ? "Verifying..." : "Verify OTP"}
      </button>
    </div>
  );
}
