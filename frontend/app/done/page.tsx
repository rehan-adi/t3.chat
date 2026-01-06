"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
// @ts-ignore
import { load } from "@cashfreepayments/cashfree-js";

export default function Done() {
  const searchParams = useSearchParams();
  const paymentSessionId = searchParams.get("paymentSessionId");

  const [cashfree, setCashfree] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const cf = await load({ mode: "sandbox" });
      setCashfree(cf);
    };
    init();
  }, []);

  const doPayment = () => {
    if (!cashfree || !paymentSessionId) return;

    const checkoutOptions = {
      paymentSessionId,
      redirectTarget: "_self",
    };

    cashfree.checkout(checkoutOptions);
  };

  return (
    <div>
      <p>Click below to open the checkout page</p>
      <button onClick={doPayment}>Pay Now</button>
    </div>
  );
}
