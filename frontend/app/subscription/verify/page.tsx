"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function VerifySubscriptionPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
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
      const token =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImJlMzVjOTI3LTVlMjAtNDhhMS1iMjBjLWQyZTEyM2M0YjRlYiIsImVtYWlsIjoicmVoYW5hbGlyZTUyQGdtYWlsLmNvbSIsImlhdCI6MTc2NzYyNTUzNSwiZXhwIjoxNzY4MjMwMzM1fQ.M9urQNLJBWuRznYqOYszbj2tOAb-Y8NcGJg_v8nNd3E";

      const res = await fetch(
        `http://localhost:4000/api/v1/subscription/verify/${orderId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Verification failed");
      }

      setStatus("success");
      setMessage("Payment verified successfully 🎉");
    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Something went wrong");
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Verifying Subscription</h1>

      {status === "loading" && <p>Verifying payment...</p>}
      {status === "success" && <p style={{ color: "green" }}>{message}</p>}
      {status === "error" && <p style={{ color: "red" }}>{message}</p>}
    </div>
  );
}
