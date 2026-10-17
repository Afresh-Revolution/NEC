"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import BrandMark from "./brand-mark";

function LoginFields() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const redirectTo = next?.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
    ? next
    : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const verificationError = searchParams.get("error") === "verification"
    ? "Email verification failed or expired. Use a fresh confirmation link or contact support."
    : "";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Sign-in failed.");
      const target = new URL(redirectTo, window.location.origin);
      window.location.assign(target.origin === window.location.origin ? target.toString() : "/dashboard");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Sign-in failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label htmlFor="login-email">EMAIL ADDRESS</label>
      <input id="login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="login-password">PASSWORD</label>
      <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
      {verificationError && <p className="auth-error" role="alert">{verificationError}</p>}
      {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
      <button className="button button-dark button-large login-submit" disabled={submitting} type="submit">
        {submitting ? "Signing in…" : "Sign in"} <ArrowRight size={16} />
      </button>
    </form>
  );
}

export default function LoginForm() {
  return (
    <main className="auth-page">
      <section className="auth-art">
        <Link className="brand" href="/"><BrandMark /><span className="brand-name">NEC <i>NAIJA</i></span></Link>
        <span className="section-number">YOUR CREATIVE COMMUNITY</span>
        <h1>Good to have<br /><em>you back.</em></h1>
        <p>Pick up where your next chapter begins.</p>
        <Link href="/" className="auth-home"><ArrowLeft size={14} /> Back to NEC Naija</Link>
      </section>
      <section className="auth-main">
        <div className="auth-card">
          <span className="auth-icon"><LockKeyhole size={20} /></span>
          <span className="section-number">MEMBER & ADMIN ACCESS</span>
          <h2>Sign in to<br /><em>your space.</em></h2>
          <p className="auth-intro">Members and administrators use their secure NEC Naija account.</p>
          <Suspense fallback={<p className="auth-setup-note">Loading secure sign-in…</p>}>
            <LoginFields />
          </Suspense>
          <p className="auth-footnote">New to NEC Naija? <Link href="/register">Create an account and apply for membership.</Link></p>
          <p className="auth-footnote">Administrator access is granted separately by NEC Naija. Using an administrator email address alone does not grant access.</p>
        </div>
      </section>
    </main>
  );
}
