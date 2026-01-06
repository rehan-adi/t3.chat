"use client";

import axios from "axios";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handleClick = async () => {
    try {
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJlMzVjOTI3LTVlMjAtNDhhMS1iMjBjLWQyZTEyM2M0YjRlYiIsImVtYWlsIjoicmVoYW5hbGlyZTUyQGdtYWlsLmNvbSIsImlhdCI6MTc2NzYyNTUzNSwiZXhwIjoxNzY4MjMwMzM1fQ.M9urQNLJBWuRznYqOYszbj2tOAb-Y8NcGJg_v8nNd3E";

      const response = await axios.post(
        "http://localhost:4000/api/v1/subscription/init-subscription",
        {
          planId: "PREMIUM",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("Backend response:", response.data);

      const paymentSessionId = response.data?.data?.payment_session_id;

      if (!paymentSessionId) {
        alert("Failed to get payment session");
        return;
      }

      router.push(`/done?paymentSessionId=${paymentSessionId}`);
    } catch (error) {
      console.error("Error from backend", error);
    }
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <button
        className="bg-white text-black font-semibold text-sm border px-4 py-2 rounded-xl"
        onClick={handleClick}
      >
        Pay Now
      </button>
    </div>
  );
}
