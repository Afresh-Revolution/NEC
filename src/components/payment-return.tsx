"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, ShieldCheck } from "lucide-react";
import BrandMark from "./brand-mark";

export default function PaymentReturn({ reference }: { reference: string }) {
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("Checking the verified Paystack transaction with the server.");

  useEffect(() => {
    let active = true;
    async function verify() {
      if (!reference) {
        setStatus("error");
        setMessage("No Paystack reference was provided.");
        return;
      }
      try {
        const response = await fetch("/api/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference }),
        });
        const data = await response.json() as { status?: string; error?: string; message?: string };
        if (!response.ok || data.status !== "succeeded") {
          throw new Error(data.error ?? data.message ?? "Paystack has not confirmed this payment.");
        }
        if (active) {
          setStatus("success");
          setMessage("Paystack confirmed your payment. Membership remains subject to cooperative review.");
        }
      } catch (error) {
        if (active) {
          setStatus("error");
          setMessage(error instanceof Error ? error.message : "Unable to verify this payment.");
        }
      }
    }
    void verify();
    return () => { active = false; };
  }, [reference]);

  return (
    <main className="payment-return-page">
      <Link className="brand" href="/"><BrandMark /><span className="brand-name">NEC <i>NAIJA</i></span></Link>
      <div className="payment-return-card">
        <span className={`payment-return-icon ${status}`}>
          {status === "verifying" ? <LoaderCircle size={23} /> : status === "success" ? <Check size={23} /> : <ShieldCheck size={23} />}
        </span>
        <span className="section-number">{status === "verifying" ? "SECURE PAYMENT CHECK" : status === "success" ? "PAYMENT VERIFIED" : "PAYMENT NOT CONFIRMED"}</span>
        <h1>{status === "verifying" ? "One moment." : status === "success" ? "Thank you." : "Not confirmed yet."}</h1>
        <p>{message}</p>
        {status === "error" && <p className="payment-followup">If funds were deducted, do not pay again. Contact support with your payment reference so the team can reconcile it.</p>}
        <Link className="button button-dark button-large" href="/dashboard"><ArrowLeft size={15} /> Return to your portal</Link>
      </div>
    </main>
  );
}
