"use client";

import axios from "axios";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SigninPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const handleSubmit = async () => {
    if (!email) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/request-otp`,
        { email },
        { withCredentials: true }
      );

      if (res.status === 200 || res.status === 201) {
        router.push(`/verify-otp?email=${email}`);
      }
    } catch (err) {
      console.error("Failed to send OTP", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#181316] px-4">
      <div className="mb-4">
        <Image
          src="/logo.png"
          alt="T3 Chat Logo"
          width={64}
          height={64}
          className="mx-auto w-11.5 h-11.5"
          priority
        />
      </div>

      <h1 className="text-white text-2xl font-semibold mb-6 text-center">
        Sign in to T3 Chat
      </h1>

      <div className="w-full sm:w-[80%] md:w-[60%] lg:w-[30%] border border-white/10 px-6 py-7 rounded-2xl">
        <input
          type="email"
          placeholder="Enter your email"
          className="w-full px-3 py-2 rounded-md bg-[#21181C] text-white placeholder:text-white outline-none text-md mb-6 border border-[#312028]"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-[#A2014D] text-[#FBD0E8] text-md py-2 rounded-md font-medium disabled:opacity-70 curpo"
        >
          {loading ? "Sending OTP" : "Send OTP"}
        </button>
      </div>
    </div>
  );
}
