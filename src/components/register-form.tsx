"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import BrandMark from "./brand-mark";

const disciplines = ["Music & sound", "Film & screen", "Live performance", "Culture & craft", "Other creative"];
const chapters = ["Abuja", "Adamawa", "Bauchi", "Benue", "Borno", "Gombe", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau", "Sokoto", "Taraba", "Yobe", "Zamfara"];

export default function RegisterForm() {
  const [step, setStep] = useState(1);
  const [complete, setComplete] = useState(false);
  const [emailVerificationRequired, setEmailVerificationRequired] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [discipline, setDiscipline] = useState("");
  const [chapter, setChapter] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const reduceMotion = useReducedMotion();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    if (!termsAccepted || !privacyAccepted) {
      setErrorMessage("Please review and accept both the membership terms and privacy notice.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          profession: discipline,
          homeState: chapter,
          termsAccepted: termsAccepted,
          privacyAccepted: privacyAccepted,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Unable to create your account.");
      }
      setEmailVerificationRequired(false);
      setComplete(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="register-page">
      <aside className="register-aside">
        <Link className="brand" href="/"><BrandMark /><span className="brand-name">NEC <i>NAIJA</i></span></Link>
        <span className="section-number">A PLACE TO BELONG</span>
        <h1>It starts<br />with <em>you.</em></h1>
        <p>Share your creative journey, create a secure account and submit a membership application for cooperative review.</p>
        <div className="register-aside-bottom"><span>STRONGER TOGETHER</span><span>✳</span><span>GROWING TOGETHER</span></div>
      </aside>
      <section className="register-main">
        <Link href="/" className="register-back"><ArrowLeft size={14} /> Home</Link>
        <div className="register-card">
          <span className="section-number">MEMBERSHIP APPLICATION</span>
          <div className="progress-label"><span>YOUR CREATIVE INTRODUCTION</span><span>{complete ? "SUBMITTED" : `${step} / 3`}</span></div>
          <div className="progress-track"><span style={{ width: complete ? "100%" : `${(step / 3) * 100}%` }} /></div>
          <AnimatePresence mode="wait">
            {complete ? (
              <motion.div
                key="complete"
                className="register-complete"
                initial={reduceMotion ? false : { opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <span className="complete-icon"><Check size={28} /></span>
                <h2>{emailVerificationRequired ? <>Check your <em>inbox.</em></> : <>Application <em>submitted.</em></>}</h2>
                <p>{emailVerificationRequired
                  ? `We created your sign-in and sent an email confirmation link to ${email}. Confirm your address before signing in to check your application status.`
                  : `Your application is recorded for cooperative review, ${name.split(" ")[0] || "creative"}. Payment does not activate membership; an authorised review is still required.`}</p>
                <Link className="button button-dark button-large" href={emailVerificationRequired ? "/login" : "/dashboard"}>
                  {emailVerificationRequired ? "Go to sign in" : "Continue to member portal"} <ArrowUpRight size={16} />
                </Link>
              </motion.div>
            ) : (
              <motion.form
                key={step}
                onSubmit={handleSubmit}
                initial={reduceMotion ? false : { opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.28 }}
              >
                {step === 1 && <>
                  <h2>Let&apos;s start with<br /><em>your name.</em></h2>
                  <p className="form-intro">Create your secure account. Your password is stored securely and cannot be read in plain text.</p>
                  <label htmlFor="full-name">YOUR NAME</label>
                  <input id="full-name" autoComplete="name" required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Amina Musa" />
                  <label htmlFor="email-address">EMAIL ADDRESS</label>
                  <input id="email-address" autoComplete="email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" />
                  <label htmlFor="account-password">PASSWORD (12 CHARACTERS MINIMUM)</label>
                  <input id="account-password" autoComplete="new-password" type="password" required minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button className="button button-dark button-large form-next" type="submit">Continue <ArrowRight size={16} /></button>
                </>}
                {step === 2 && <>
                  <h2>What&apos;s your<br /><em>creative lane?</em></h2>
                  <p className="form-intro">Choose the discipline that best fits your work and the state chapter closest to you.</p>
                  <label htmlFor="discipline">CREATIVE DISCIPLINE</label>
                  <select id="discipline" required value={discipline} onChange={(event) => setDiscipline(event.target.value)}>
                    <option value="" disabled>Select a discipline</option>
                    {disciplines.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <label htmlFor="chapter">YOUR STATE / CHAPTER</label>
                  <select id="chapter" required value={chapter} onChange={(event) => setChapter(event.target.value)}>
                    <option value="" disabled>Select a state</option>
                    {chapters.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <div className="form-actions">
                    <button className="button button-outline button-large" type="button" onClick={() => setStep(1)}><ArrowLeft size={15} /> Back</button>
                    <button className="button button-dark button-large" type="submit">Review <ArrowRight size={16} /></button>
                  </div>
                </>}
                {step === 3 && <>
                  <h2>Looking good,<br /><em>{name.split(" ")[0]}.</em></h2>
                  <p className="form-intro">Review your information and acknowledge the current membership and privacy documents.</p>
                  <div className="application-summary">
                    <div><span>YOUR NAME</span><b>{name}</b></div>
                    <div><span>EMAIL</span><b>{email}</b></div>
                    <div><span>DISCIPLINE</span><b>{discipline}</b></div>
                    <div><span>CHAPTER</span><b>{chapter}</b></div>
                  </div>
                  <label className="consent-check"><input type="checkbox" required checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /><span>I have read the <Link href="/policies" target="_blank">membership terms</Link> and understand that approval is required.</span></label>
                  <label className="consent-check"><input type="checkbox" required checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} /><span>I have read the <Link href="/policies" target="_blank">privacy notice</Link> and consent to the application data described there.</span></label>
                  <div className="privacy-note"><ShieldCheck size={17} /><span>We record the current policy version and consent time. This application creates no payment and does not activate membership.</span></div>
                  {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
                  <div className="form-actions">
                    <button className="button button-outline button-large" type="button" onClick={() => setStep(2)}><ArrowLeft size={15} /> Back</button>
                    <button className="button button-dark button-large" type="submit" disabled={submitting}>{submitting ? "Creating account…" : "Submit application"} <Check size={16} /></button>
                  </div>
                </>}
              </motion.form>
            )}
          </AnimatePresence>
          <p className="register-footnote">Applications remain pending until verification and cooperative review are complete. No identity documents are collected here.</p>
        </div>
      </section>
    </main>
  );
}
