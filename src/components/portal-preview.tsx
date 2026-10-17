"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardCheck,
  FileClock,
  FileText,
  HandCoins,
  IdCard,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BrandMark from "./brand-mark";

export type PortalApplication = {
  id: string;
  user_id: string;
  status: string;
  professional_category: string;
  home_state: string;
  submitted_at: string;
  full_name: string;
  email: string;
};

export type PortalMembershipSubscription = {
  plan_code: "monthly" | "yearly";
  amount_minor: string;
  status: string;
  auto_renew: boolean;
  current_period_end: string | null;
  can_manage_renewal: boolean;
};

export type AdminWorkspaceData = {
  permissions: {
    applications: boolean;
    members: boolean;
    payments: boolean;
    contributionsReview: boolean;
    loansReview: boolean;
    publishReports: boolean;
    chaptersManage: boolean;
    campaignsReview: boolean;
    eventsNational: boolean;
    eventsState: boolean;
    reports: boolean;
    roles: boolean;
    settings: boolean;
    support: boolean;
    superAdmin: boolean;
  };
  payments: {
    id: string;
    provider: string;
    provider_reference: string;
    amount_minor: string;
    currency: string;
    status: string;
    is_demo: boolean;
    created_at: string;
    paid_at: string | null;
    user_email: string;
    has_ledger_entry: boolean;
  }[];
  contributions: {
    id: string;
    description: string;
    posted_at: string;
    is_demo: boolean;
    provider: string;
    provider_reference: string;
    amount_minor: string;
    currency: string;
    user_email: string;
    lines: { account: string; side: string; amount_minor: string }[];
  }[];
  pendingContributions: {
    id: string;
    user_email: string;
    contribution_type: string;
    amount_minor: string;
    contribution_year: number;
    contribution_month: number | null;
    payment_reference: string;
    created_at: string;
  }[];
  loanRequests: {
    id: string;
    user_email: string;
    project_name: string;
    amount_minor: string;
    purpose: string;
    requested_repayment_year: number;
    status: string;
    created_at: string;
  }[];
  pendingLoanRepayments: {
    id: string;
    loan_id: string;
    user_email: string;
    amount_minor: string;
    payment_reference: string;
    outstanding_minor: string;
    created_at: string;
  }[];
  annualRequests: {
    id: string;
    user_email: string;
    report_year: number;
    request_type: string;
    contribution_balance_minor: string;
    rollover_bonus_minor: string;
    allocated_profit_minor: string;
    status: string;
    created_at: string;
  }[];
  campaigns: {
    id: string;
    user_email: string;
    position: string;
    chapter_state_code: string | null;
    election_year: number;
    statement: string;
    status: string;
    created_at: string;
  }[];
  events: {
    id: string;
    title: string;
    category: string;
    description: string;
    starts_at: string;
    ends_at: string | null;
    state_code: string | null;
    state_name: string | null;
    venue: string | null;
    status: string;
    is_public: boolean;
    created_at: string;
    review_target_at: string | null;
    creator_email: string;
    last_decision: string | null;
    last_review_reason: string | null;
  }[];
  chapters: {
    id: string;
    state_code: string;
    state_name: string;
    is_active: boolean;
    created_at: string;
    coordinator_count: number;
    member_count: number;
  }[];
  roles: {
    assignment_id: string;
    user_id: string;
    email: string;
    full_name: string;
    role_id: string;
    role_code: string;
    display_name: string;
    chapter_id: string | null;
    state_name: string | null;
  }[];
  roleOptions: { id: string; role_code: string; display_name: string }[];
  accounts: { id: string; email: string; full_name: string }[];
  identityMembers: {
    user_id: string;
    member_number: string;
    status: string;
    activated_at: string;
    user_email: string;
    full_name: string;
  }[];
  supportTickets: {
    id: string;
    subject: string;
    details: string;
    status: string;
    created_at: string;
    user_email: string;
  }[];
  dataRequests: {
    id: string;
    request_type: string;
    status: string;
    details: string;
    created_at: string;
    user_email: string;
  }[];
  auditLogs: {
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: string;
    created_at: string;
    actor_email: string | null;
  }[];
  featureFlags: {
    flag_code: string;
    enabled: boolean;
    updated_at: string;
    updated_by_email: string | null;
  }[];
  summary: {
    active_accounts: number;
    active_memberships: number | null;
    pending_applications: number | null;
    pending_events: number | null;
    open_support_tickets: number | null;
    verified_payments: number | null;
  };
};

const memberNavigation = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Membership identity", icon: IdCard },
  { name: "Contributions", icon: CircleDollarSign },
  { name: "Wallet & statements", icon: Wallet },
  { name: "Loans", icon: HandCoins },
  { name: "Events & community", icon: CalendarDays },
  { name: "Leadership elections", icon: UsersRound },
  { name: "Notifications", icon: Bell },
  { name: "Help & support", icon: MessageSquareText },
  { name: "Account settings", icon: Settings2 },
];

const adminNavigation = [
  { name: "Executive overview", icon: LayoutDashboard },
  { name: "Member applications", icon: UsersRound },
  { name: "Identity verification", icon: BadgeCheck },
  { name: "Payments & ledger", icon: CircleDollarSign },
  { name: "Contribution records", icon: Wallet },
  { name: "Member finance requests", icon: HandCoins },
  { name: "Leadership campaigns", icon: UsersRound },
  { name: "Event review", icon: CalendarDays },
  { name: "Chapters & committees", icon: BriefcaseBusiness },
  { name: "Reports & audit", icon: ChartNoAxesCombined },
  { name: "Roles & permissions", icon: LockKeyhole },
  { name: "Support & privacy", icon: FileText },
  { name: "System settings", icon: Settings2 },
];

function EmptyNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty-notice">
      <span><FileClock size={21} /></span>
      <p>{children}</p>
    </div>
  );
}

function formatRemainingTime(endDate: string, now: number) {
  const remaining = Math.max(0, new Date(endDate).getTime() - now);
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1_000);
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

function formatPortalNaira(amountMinor: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amountMinor) / 100);
}

function SubscriptionCountdown({ endDate }: { endDate: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return <time dateTime={endDate}>{now === null ? "Calculating…" : `${formatRemainingTime(endDate, now)} remaining`}</time>;
}

function MembershipDetailsCard({
  annualMembershipFee,
  subscription,
  canSubscribe,
  checkoutAvailable,
}: {
  annualMembershipFee: string;
  subscription?: PortalMembershipSubscription | null;
  canSubscribe: boolean;
  checkoutAvailable: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function subscribe() {
    setBusy(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/payments/subscription", {
        method: "POST",
      });
      const result = await response.json() as { authorizationUrl?: string; error?: string };
      if (!response.ok || !result.authorizationUrl) {
        throw new Error(result.error ?? "Unable to start your subscription.");
      }
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to start your subscription.");
    } finally {
      setBusy(false);
    }
  }

  const isSubscribed = Boolean(subscription &&
    ["active", "non_renewing"].includes(subscription.status) &&
    subscription.current_period_end &&
    new Date(subscription.current_period_end).getTime() > Date.now());

  return (
    <section className="membership-details-card" aria-labelledby="membership-details-heading">
      <div className="membership-details-heading">
        <span className="portal-eyebrow">ANNUAL MEMBERSHIP</span>
        <h2 id="membership-details-heading">One annual fee. A shared cooperative.</h2>
        <p>The annual membership fee supports cooperative administration. Monthly contributions are recorded separately and are not membership fees.</p>
      </div>
      <div className="membership-details-prices">
        <div className={`membership-plan-option${isSubscribed ? " membership-plan-selected" : ""}`}>
          <span>ANNUAL MEMBERSHIP FEE</span>
          <b>{isSubscribed && subscription ? formatPortalNaira(subscription.amount_minor) : annualMembershipFee}</b>
          <small>Renews yearly · proposed fee is non-refundable</small>
          <button
            className="button button-dark membership-subscribe-button"
            type="button"
            disabled={isSubscribed || !canSubscribe || !checkoutAvailable || busy}
            onClick={() => void subscribe()}
          >
            {isSubscribed ? "Subscribed" : busy ? "Starting…" : "Pay annual fee"} <ArrowUpRight size={15} />
          </button>
          {isSubscribed && subscription?.current_period_end && (
            <div className="membership-expiry">
              <span>Membership expires in</span>
              <SubscriptionCountdown endDate={subscription.current_period_end} />
            </div>
          )}
        </div>
      </div>
      <div className="membership-details-benefits">
        <b>Membership includes</b>
        <ul>
          <li><Check size={16} /> Meet creatives across chapters and disciplines</li>
          <li><Check size={16} /> Find events, opportunities and collaborators</li>
          <li><Check size={16} /> Take part in a member-led cooperative</li>
        </ul>
      </div>
      {errorMessage && <p className="membership-details-error" role="alert">{errorMessage}</p>}
      {!canSubscribe && <p className="membership-details-note">Submit your membership application before paying the annual fee.</p>}
      {canSubscribe && !isSubscribed && !checkoutAvailable && <p className="membership-details-note">Online membership payment is not available right now. Please check back later.</p>}
      <p className="membership-details-note">The annual fee is separate from the expected ₦10,000 monthly contribution and optional additional contributions. Full membership remains subject to cooperative review and approved terms.</p>
    </section>
  );
}

function MemberPanel({
  active,
  userName,
  applicationStatus,
  annualMembershipFee,
  subscription,
  checkoutAvailable,
}: {
  active: string;
  userName?: string;
  applicationStatus?: string | null;
  annualMembershipFee: string;
  subscription?: PortalMembershipSubscription | null;
  checkoutAvailable: boolean;
}) {
  if (active === "Overview") {
    return (
      <>
        <div className="portal-welcome">
          <div><span className="portal-eyebrow">YOUR COOPERATIVE, YOUR SPACE</span><h1>{userName ? <>Welcome, {userName.split(" ")[0]}.<br /><em>Your next chapter.</em></> : <>Welcome to your<br /><em>next chapter.</em></>}</h1><p>Your creative identity and cooperative life, all in one place.</p></div>
          <div className="portal-card-visual"><span>NEC NAIJA · MEMBER IDENTITY</span><b>YOUR<br />CREATIVE<br />IDENTITY</b><i>✳</i><small>ISSUED WHEN MEMBERSHIP IS APPROVED</small></div>
        </div>
        <div className="portal-alert"><ShieldCheck size={17} /><span><b>Your member space:</b> Your membership details and available services are shown here.</span></div>
        <MembershipDetailsCard
          annualMembershipFee={annualMembershipFee}
          subscription={subscription}
          canSubscribe={Boolean(applicationStatus && ["submitted", "approved"].includes(applicationStatus))}
          checkoutAvailable={checkoutAvailable}
        />
        <div className="portal-card-grid">
          <article className="portal-stat"><span>APPLICATION</span><b>{applicationStatus ? applicationStatus.replaceAll("_", " ") : "Not submitted"}</b><small>Membership activates only after verified payment and authorised review.</small><IdCard size={19} /></article>
          <article className="portal-stat"><span>MEMBERSHIP</span><b>{subscription?.status === "active" || subscription?.status === "non_renewing" ? "Subscribed" : "Not subscribed"}</b><small>{subscription?.plan_code === "monthly" ? "Monthly plan" : subscription?.plan_code === "yearly" ? "Annual plan" : "Choose a plan to join."}</small><CircleDollarSign size={19} /></article>
          <article className="portal-stat"><span>UP NEXT</span><b>Your community</b><small>Meet members and discover opportunities.</small><UsersRound size={19} /></article>
        </div>
        <div className="portal-lower-grid">
          <section className="portal-box"><div className="portal-box-heading"><h2>Things to explore</h2><span>YOUR SHORTCUTS</span></div><div className="portal-shortcuts">
            <Link href="/membership"><IdCard size={17} /><span>Membership details</span><ArrowRight size={15} /></Link>
            <Link href="/events"><CalendarDays size={17} /><span>Community events</span><ArrowRight size={15} /></Link>
            <Link href="/artists"><UsersRound size={17} /><span>Creative directory</span><ArrowRight size={15} /></Link>
          </div></section>
          <section className="portal-box"><div className="portal-box-heading"><h2>Recent activity</h2><Activity size={16} /></div><EmptyNotice>Your recent account activity will appear here.</EmptyNotice></section>
        </div>
      </>
    );
  }

  if (active === "Membership identity") {
    const applicationMessages: Record<string, string> = {
      submitted: "Your application has been received and is awaiting review. You do not need to submit another one.",
      needs_information: "Your application needs more information. Please contact NEC Naija for guidance; do not submit a second application.",
      approved: "Your membership application has been approved.",
      rejected: "Your application was not approved. Contact NEC Naija if you need assistance.",
    };
    return (
      <PortalSection title="Your cooperative identity" eyebrow="MEMBERSHIP" description="Your application, membership status and member identity are managed here." icon={<IdCard size={22} />}>
        <MembershipDetailsCard
          annualMembershipFee={annualMembershipFee}
          subscription={subscription}
          canSubscribe={Boolean(applicationStatus && ["submitted", "approved"].includes(applicationStatus))}
          checkoutAvailable={checkoutAvailable}
        />
        {applicationStatus
          ? <EmptyNotice>{applicationMessages[applicationStatus] ?? "Your membership application is on file. Contact NEC Naija for an update."}</EmptyNotice>
          : <><EmptyNotice>You do not have a membership application on file yet.</EmptyNotice><Link className="button button-dark portal-action" href="/register">Complete your application <ArrowUpRight size={15} /></Link></>}
        {applicationStatus === "approved" && subscription && ["active", "non_renewing"].includes(subscription.status)
          ? <MemberMediaManager />
          : <div className="feature-gate"><LockKeyhole size={18} /><span><b>Portfolio uploads unlock with active membership</b><small>Your approved and current membership includes a public creative portfolio.</small></span></div>}
      </PortalSection>
    );
  }
  if (active === "Contributions") {
    return <PortalSection title="Member contributions" eyebrow="COOPERATIVE CONTRIBUTIONS" description="Record your expected monthly contribution or an additional contribution. Entries remain pending until verified by the cooperative." icon={<CircleDollarSign size={22} />}><MemberFinancePanel kind="contributions" /></PortalSection>;
  }
  if (active === "Wallet & statements") {
    return <PortalSection title="Annual requests" eyebrow="PROFIT SHARING & ROLLOVER" description="After an annual report is published, submit a request for your allocated profits only or profits and eligible contributions." icon={<Wallet size={22} />}><MemberFinancePanel kind="annual_request" /></PortalSection>;
  }
  if (active === "Loans") {
    return <PortalSection title="Project finance requests" eyebrow="MEMBER LOANS" description="Submit a request for cooperative review. A request is not a loan offer or approval; credit checks, repayment terms and any guarantor or collateral arrangements require separate agreement." icon={<HandCoins size={22} />}><MemberFinancePanel kind="loan_request" /></PortalSection>;
  }
  if (active === "Events & community") {
    return <PortalSection title="Find your people" eyebrow="EVENTS & COMMUNITY" description="Discover approved chapter events, opportunities and potential collaborators. Submit proposals at least three months ahead to allow state-level coordination." icon={<CalendarDays size={22} />}><div className="portal-actions-row"><Link className="button button-dark portal-action" href="/events">Explore events <ArrowUpRight size={15} /></Link><Link className="button button-outline portal-action" href="/artists">Creative directory <ArrowUpRight size={15} /></Link></div><EventProposalForm /></PortalSection>;
  }
  if (active === "Leadership elections") {
    return <PortalSection title="Stand for cooperative leadership" eyebrow="ANNUAL MANAGEMENT ELECTIONS" description="Management and state chapter committee campaigns are reviewed for the annual election cycle. The Owners’ Membership Board is not part of this election process." icon={<UsersRound size={22} />}><ManagementCampaignForm /></PortalSection>;
  }
  if (active === "Notifications") {
    return <PortalSection title="Stay in the loop" eyebrow="NOTIFICATIONS" description="Payment receipts, application reviews, chapter notices and important service updates will appear here." icon={<Bell size={22} />}><EmptyNotice>You are all caught up. New updates will appear here.</EmptyNotice></PortalSection>;
  }
  if (active === "Help & support") {
    return <PortalSection title="How can we help?" eyebrow="MEMBER SUPPORT" description="Send a message to the NEC Naija team. We will email you to confirm it has been received." icon={<MessageSquareText size={22} />}><MemberSupportForm /></PortalSection>;
  }
  return <PortalSection title="Your account, your controls" eyebrow="ACCOUNT SETTINGS" description="Manage communication preferences, privacy, active sessions and data requests." icon={<Settings2 size={22} />}><div className="privacy-controls"><div><ShieldCheck size={17} /><span><b>Privacy and visibility</b><small>Public artist profiles are opt-in; financial details are never public.</small></span></div><div><LockKeyhole size={17} /><span><b>Security and sessions</b><small>Session history and credential controls require a verified account.</small></span></div><div><FileText size={17} /><span><b>Data requests</b><small>Request access to or correction of your personal information.</small></span></div></div></PortalSection>;
}

function MemberSupportForm() {
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, details }),
      });
      const result = await response.json() as { ticketId?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to send your message.");
      setMessage(`Your request ${result.ticketId} has been sent.`);
      setSubject("");
      setDetails("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to send your message.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="member-support-form" onSubmit={(event) => void submit(event)}>
      <label htmlFor="support-subject">SUBJECT</label>
      <input id="support-subject" required minLength={3} maxLength={120} value={subject} onChange={(event) => setSubject(event.target.value)} />
      <label htmlFor="support-details">HOW CAN WE HELP?</label>
      <textarea id="support-details" required minLength={10} maxLength={3000} rows={6} value={details} onChange={(event) => setDetails(event.target.value)} />
      {error && <p className="membership-details-error" role="alert">{error}</p>}
      {message && <p className="portal-success-message" role="status">{message}</p>}
      <button className="button button-dark portal-action" type="submit" disabled={busy}>{busy ? "Sending…" : "Send to member support"} <ArrowUpRight size={15} /></button>
    </form>
  );
}

type FinanceRecords = {
      contributions: {
        id: string;
        contribution_type: string;
        amount_minor: string;
        contribution_year: number;
        contribution_month: number | null;
        payment_reference: string;
        status: string;
      }[];
      annualRequests: {
        id: string;
        report_year: number;
        request_type: string;
        contribution_balance_minor: string;
        rollover_bonus_minor: string;
        allocated_profit_minor: string;
        status: string;
      }[];
      loanApplications: {
        id: string;
        amount_minor: string;
        project_name: string;
        requested_repayment_year: number;
        status: string;
      }[];
      loans: {
        id: string;
        principal_minor: string;
        outstanding_minor: string;
        repayment_terms: string;
        due_at: string;
        status: string;
      }[];
      repayments: {
        id: string;
        loan_id: string;
        amount_minor: string;
        payment_reference: string;
        status: string;
        created_at: string;
      }[];
      annualReports: { report_year: number }[];
    };

    function MemberFinancePanel({ kind }: { kind: "contributions" | "annual_request" | "loan_request" }) {
      const [records, setRecords] = useState<FinanceRecords | null>(null);
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState("");
      const [error, setError] = useState("");
      const [contributionType, setContributionType] = useState<"monthly" | "additional">("monthly");
      const [month, setMonth] = useState(String(new Date().getMonth() + 1));
      const [year, setYear] = useState(String(new Date().getFullYear()));
      const [amount, setAmount] = useState("");
      const [paymentReference, setPaymentReference] = useState("");
      const [reportYear, setReportYear] = useState("");
      const [requestType, setRequestType] = useState<"profits_only" | "profits_and_contributions">("profits_only");
      const [projectName, setProjectName] = useState("");
      const [purpose, setPurpose] = useState("");
      const [repaymentYear, setRepaymentYear] = useState(String(new Date().getFullYear()));
      const [loanAmount, setLoanAmount] = useState("");

      async function refresh() {
        const response = await fetch("/api/member/finance");
        const result = await response.json() as FinanceRecords & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to load member finance records.");
        setRecords(result);
      }

      useEffect(() => {
        void refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load member finance records."));
      }, []);

      async function submit(event: React.FormEvent<HTMLFormElement>, body: Record<string, unknown>) {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const response = await fetch("/api/member/finance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const result = await response.json() as { error?: string };
          if (!response.ok) throw new Error(result.error ?? "Unable to submit this request.");
          setMessage("Submitted. It will remain pending until the cooperative reviews it.");
          await refresh();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Unable to submit this request.");
        } finally {
          setBusy(false);
        }
      }

      return (
        <div className="member-finance-panel">
          {error && <p className="membership-details-error" role="alert">{error}</p>}
          {message && <p className="portal-success-message" role="status">{message}</p>}
          {kind === "contributions" && (
            <>
              <div className="portal-alert"><ShieldCheck size={17} /><span>Monthly contribution target: <b>₦10,000.</b> Additional contributions are optional. Submit a payment reference for reconciliation; a pending entry is not yet credited to your balance.</span></div>
              <form className="member-support-form member-contribution-form" onSubmit={(event) => void submit(event, {
                type: "contribution",
                contributionType,
                amountMinor: contributionType === "monthly" ? 1_000_000 : Math.round(Number(amount) * 100),
                year,
                month: contributionType === "monthly" ? month : null,
                paymentReference,
              })}>
                <div className="contribution-form-heading">
                  <span className="portal-eyebrow">CONTRIBUTIONS</span>
                  <h2>Record a contribution</h2>
                  <p>Enter the payment details below. Your record will appear in your history after review.</p>
                </div>
                <div className="contribution-form-grid">
                  <div className="contribution-form-field contribution-form-field-wide">
                    <label htmlFor="contribution-type">Contribution type</label>
                    <select id="contribution-type" value={contributionType} onChange={(event) => setContributionType(event.target.value as "monthly" | "additional")}>
                      <option value="monthly">Monthly contribution · ₦10,000</option>
                      <option value="additional">Additional contribution</option>
                    </select>
                  </div>
                  {contributionType === "additional" && (
                    <div className="contribution-form-field contribution-form-field-wide">
                      <label htmlFor="additional-amount">Amount (₦)</label>
                      <input id="additional-amount" type="number" min="1" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />
                    </div>
                  )}
                  <div className="contribution-form-field">
                    <label htmlFor="contribution-year">Year</label>
                    <input id="contribution-year" type="number" min="2020" max={new Date().getFullYear()} required value={year} onChange={(event) => setYear(event.target.value)} />
                  </div>
                  {contributionType === "monthly" && (
                    <div className="contribution-form-field">
                      <label htmlFor="contribution-month">Month</label>
                      <select id="contribution-month" value={month} onChange={(event) => setMonth(event.target.value)}>
                        {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2000, index).toLocaleString("en", { month: "long" })}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="contribution-form-field contribution-form-field-wide">
                    <label htmlFor="contribution-reference">Payment reference</label>
                    <input id="contribution-reference" required minLength={3} maxLength={160} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
                    <small>Use the reference shown on your payment confirmation.</small>
                  </div>
                  <button className="button button-dark portal-action" disabled={busy}>
                    {busy ? "Submitting…" : "Record contribution"} <ArrowUpRight size={15} />
                  </button>
                </div>
              </form>
              <FinanceRecordList title="Your contribution history" empty="No contribution records submitted." records={records?.contributions.map((item) => ({
                id: item.id,
                title: `${item.contribution_type === "monthly" ? "Monthly contribution" : "Additional contribution"} · ${item.contribution_month ? new Date(2000, item.contribution_month - 1).toLocaleString("en", { month: "long" }) + " " : ""}${item.contribution_year}`,
                detail: `${formatPortalNaira(item.amount_minor)} · ${item.payment_reference}`,
                status: item.status,
              })) ?? []} />
            </>
          )}
          {kind === "annual_request" && (
            <>
              <div className="portal-alert"><ShieldCheck size={17} /><span>The proposed allocation is 70% of net annual profit for distribution and 30% for reserves. Estimated member shares use each member&apos;s verified eligible balance divided by total eligible balances for that year, measured at year-end. Choosing profits only records a proposed 10% contribution-balance bonus for the following year. Final policies and Board declarations govern actual payouts.</span></div>
              {records?.annualReports.length ? (
                <form className="member-support-form" onSubmit={(event) => void submit(event, { type: "annual_request", reportYear, requestType })}>
                  <label htmlFor="annual-report-year">PUBLISHED ANNUAL REPORT</label>
                  <select id="annual-report-year" required value={reportYear} onChange={(event) => setReportYear(event.target.value)}>
                    <option value="">Choose a report year</option>
                    {records.annualReports.map((report) => <option key={report.report_year} value={report.report_year}>{report.report_year}</option>)}
                  </select>
                  <label htmlFor="annual-request-type">YOUR REQUEST</label>
                  <select id="annual-request-type" value={requestType} onChange={(event) => setRequestType(event.target.value as "profits_only" | "profits_and_contributions")}>
                    <option value="profits_only">Request allocated profits; roll over contributions and proposed 10% bonus</option>
                    <option value="profits_and_contributions">Request allocated profits and eligible contributions</option>
                  </select>
                  <button className="button button-dark portal-action" disabled={busy || !reportYear}>{busy ? "Submitting…" : "Submit annual request"} <ArrowUpRight size={15} /></button>
                </form>
              ) : <EmptyNotice>Annual requests open after an annual report is published and cooperative results are declared.</EmptyNotice>}
              <FinanceRecordList title="Your annual requests" empty="No annual requests submitted." records={records?.annualRequests.map((item) => ({
                id: item.id,
                title: `${item.report_year} · ${item.request_type === "profits_only" ? "Profits; contributions rolled over" : "Profits and contributions"}`,
                detail: `Contribution balance ${formatPortalNaira(item.contribution_balance_minor)} · estimated 70% distribution ${formatPortalNaira(item.allocated_profit_minor)} · rollover bonus ${formatPortalNaira(item.rollover_bonus_minor)}`,
                status: item.status,
              })) ?? []} />
            </>
          )}
          {kind === "loan_request" && (
            <>
              <div className="portal-alert"><ShieldCheck size={17} /><span>Loan requests are subject to credit assessment and separate approved terms. Repayment must be scheduled before December of the selected year. Do not submit identity documents or sensitive credit data here.</span></div>
              <form className="member-support-form" onSubmit={(event) => void submit(event, {
                type: "loan_request",
                projectName,
                purpose,
                repaymentYear,
                amountMinor: Math.round(Number(loanAmount) * 100),
              })}>
                <label htmlFor="loan-project">PROJECT OR BUSINESS</label>
                <input id="loan-project" required minLength={2} maxLength={160} value={projectName} onChange={(event) => setProjectName(event.target.value)} />
                <label htmlFor="loan-amount">AMOUNT REQUESTED (₦)</label>
                <input id="loan-amount" type="number" min="100" step="0.01" required value={loanAmount} onChange={(event) => setLoanAmount(event.target.value)} />
                <label htmlFor="loan-purpose">HOW WOULD THE LOAN SUPPORT THIS PROJECT?</label>
                <textarea id="loan-purpose" required minLength={20} maxLength={3000} rows={5} value={purpose} onChange={(event) => setPurpose(event.target.value)} />
                <label htmlFor="loan-repayment-year">REQUESTED REPAYMENT YEAR</label>
                <input id="loan-repayment-year" type="number" min={new Date().getFullYear()} max={new Date().getFullYear() + 5} required value={repaymentYear} onChange={(event) => setRepaymentYear(event.target.value)} />
                <button className="button button-dark portal-action" disabled={busy}>{busy ? "Submitting…" : "Submit for review"} <ArrowUpRight size={15} /></button>
              </form>
              <FinanceRecordList title="Your loan requests" empty="No loan requests submitted." records={records?.loanApplications.map((item) => ({
                id: item.id,
                title: `${item.project_name} · repayment requested by ${item.requested_repayment_year}`,
                detail: `Requested amount ${formatPortalNaira(item.amount_minor)}`,
                status: item.status,
              })) ?? []} />
              <section className="finance-record-list">
                <h2>Issued loans and repayments</h2>
                {!records?.loans.length
                  ? <EmptyNotice>No loans have been issued to your account.</EmptyNotice>
                  : records.loans.map((loan) => (
                    <article className="admin-record-card" key={loan.id}>
                      <div>
                        <b>Outstanding: {formatPortalNaira(loan.outstanding_minor)}</b>
                        <span>Original principal {formatPortalNaira(loan.principal_minor)} · due {new Date(`${loan.due_at}T00:00:00`).toLocaleDateString()}</span>
                        <p>{loan.repayment_terms}</p>
                        <span className="admin-status">{loan.status.replaceAll("_", " ")}</span>
                      </div>
                      {Number(loan.outstanding_minor) > 0 && ["active", "defaulted"].includes(loan.status) &&
                        <LoanRepaymentForm loanId={loan.id} outstandingMinor={loan.outstanding_minor} onSubmitted={refresh} />}
                    </article>
                  ))}
              </section>
              <FinanceRecordList title="Repayment references" empty="No repayments submitted." records={records?.repayments.map((item) => ({
                id: item.id,
                title: formatPortalNaira(item.amount_minor),
                detail: `${item.payment_reference} · loan ${item.loan_id}`,
                status: item.status,
              })) ?? []} />
            </>
          )}
        </div>
      );
    }

    function LoanRepaymentForm({ loanId, outstandingMinor, onSubmitted }: {
      loanId: string;
      outstandingMinor: string;
      onSubmitted: () => Promise<void>;
    }) {
      const [amount, setAmount] = useState("");
      const [paymentReference, setPaymentReference] = useState("");
      const [busy, setBusy] = useState(false);
      const [error, setError] = useState("");
      const [message, setMessage] = useState("");

      async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const response = await fetch("/api/member/finance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "loan_repayment",
              loanId,
              amountMinor: Math.round(Number(amount) * 100),
              paymentReference,
            }),
          });
          const result = await response.json() as { error?: string };
          if (!response.ok) throw new Error(result.error ?? "Unable to submit repayment reference.");
          setMessage("Repayment submitted for reconciliation.");
          setAmount("");
          setPaymentReference("");
          await onSubmitted();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Unable to submit repayment reference.");
        } finally {
          setBusy(false);
        }
      }

      return (
        <form className="member-support-form" onSubmit={(event) => void submit(event)}>
          <label htmlFor={`repayment-amount-${loanId}`}>REPAYMENT AMOUNT (₦)</label>
          <input id={`repayment-amount-${loanId}`} type="number" min="1" step="0.01" max={Number(outstandingMinor) / 100} required value={amount} onChange={(event) => setAmount(event.target.value)} />
          <label htmlFor={`repayment-reference-${loanId}`}>PAYMENT REFERENCE</label>
          <input id={`repayment-reference-${loanId}`} required minLength={3} maxLength={160} value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} />
          {error && <p className="membership-details-error" role="alert">{error}</p>}
          {message && <p className="portal-success-message" role="status">{message}</p>}
          <button className="button button-dark portal-action" disabled={busy}>{busy ? "Submitting…" : "Submit repayment reference"} <ArrowUpRight size={15} /></button>
        </form>
      );
    }

    function FinanceRecordList({ title, empty, records }: {
      title: string;
      empty: string;
      records: { id: string; title: string; detail: string; status: string }[];
    }) {
      return (
        <section className="finance-record-list">
          <h2>{title}</h2>
          {records.length === 0 ? <EmptyNotice>{empty}</EmptyNotice> : records.map((record) => (
            <article className="admin-record-card" key={record.id}>
              <div><b>{record.title}</b><span>{record.detail}</span></div>
              <span className="admin-status">{record.status.replaceAll("_", " ")}</span>
            </article>
          ))}
        </section>
      );
    }

    function EventProposalForm() {
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState("");
      const [error, setError] = useState("");

      async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElement = event.currentTarget;
        setBusy(true);
        setError("");
        setMessage("");
        const form = new FormData(event.currentTarget);
        try {
          const response = await fetch("/api/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(form)),
          });
          const result = await response.json() as { error?: string; expectedReviewBy?: string; potentialConflicts?: number };
          if (!response.ok) throw new Error(result.error ?? "Unable to submit your proposal.");
          if (!result.expectedReviewBy) throw new Error("The event was submitted, but its review target could not be confirmed.");
          const clashNote = result.potentialConflicts
            ? ` There are ${result.potentialConflicts} nearby proposal(s) in the chapter calendar for committee review.`
            : "";
          setMessage(`Proposal submitted. The review target is ${new Date(result.expectedReviewBy).toLocaleDateString()}; committees may coordinate any scheduling conflicts.${clashNote}`);
          formElement.reset();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Unable to submit your proposal.");
        } finally {
          setBusy(false);
        }
      }

      const earliest = new Date();
      earliest.setMonth(earliest.getMonth() + 3);
      const minDate = new Date(earliest.getTime() - earliest.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
      return (
        <form className="member-support-form" onSubmit={(event) => void submit(event)}>
          <h2>Propose a chapter event</h2>
          <p>Submit at least three months ahead. Review is targeted within 14 days and may take up to 20 days when coordination is needed.</p>
          <label htmlFor="event-title">EVENT NAME</label><input id="event-title" name="title" required minLength={3} maxLength={160} />
          <label htmlFor="event-category">EVENT TYPE</label><input id="event-category" name="category" required minLength={2} maxLength={80} placeholder="Show, concert, rally, workshop…" />
          <label htmlFor="event-description">PURPOSE AND DETAILS</label><textarea id="event-description" name="description" required minLength={20} maxLength={4000} rows={5} />
          <label htmlFor="event-date">PROPOSED DATE</label><input id="event-date" name="startsAt" type="datetime-local" min={minDate} required />
          <label htmlFor="event-venue">VENUE</label><input id="event-venue" name="venue" required minLength={2} maxLength={240} />
          <label htmlFor="event-state">STATE CHAPTER CODE</label><input id="event-state" name="stateCode" required minLength={2} maxLength={3} pattern="[A-Z]{2,3}" placeholder="e.g. KAD" />
          {error && <p className="membership-details-error" role="alert">{error}</p>}
          {message && <p className="portal-success-message" role="status">{message}</p>}
          <button className="button button-dark portal-action" disabled={busy}>{busy ? "Submitting…" : "Submit event proposal"} <ArrowUpRight size={15} /></button>
        </form>
      );
    }

    function ManagementCampaignForm() {
      const [busy, setBusy] = useState(false);
      const [message, setMessage] = useState("");
      const [error, setError] = useState("");
      const [campaigns, setCampaigns] = useState<{
        id: string;
        position: string;
        chapter_state_code: string | null;
        election_year: number;
        status: string;
        review_note: string | null;
      }[]>([]);

      async function refreshCampaigns() {
        const response = await fetch("/api/member/campaigns");
        const result = await response.json() as {
          campaigns?: typeof campaigns;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error ?? "Unable to load your campaign statements.");
        setCampaigns(result.campaigns ?? []);
      }

      useEffect(() => {
        void refreshCampaigns().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Unable to load your campaign statements."));
      }, []);

      async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formElement = event.currentTarget;
        setBusy(true);
        setError("");
        setMessage("");
        const form = new FormData(event.currentTarget);
        try {
          const response = await fetch("/api/member/campaigns", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(form)),
          });
          const result = await response.json() as { error?: string };
          if (!response.ok) throw new Error(result.error ?? "Unable to submit your campaign.");
          setMessage("Your campaign statement is submitted for eligibility review. Voting and appointment dates will follow approved election rules.");
          formElement.reset();
          await refreshCampaigns();
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Unable to submit your campaign.");
        } finally {
          setBusy(false);
        }
      }

      return (
        <form className="member-support-form" onSubmit={(event) => void submit(event)}>
          <p>Campaigns are recorded for eligibility review. The system does not conduct votes or appoint officers; election dates, eligibility and voting procedures must follow approved rules.</p>
          <label htmlFor="campaign-position">POSITION</label><input id="campaign-position" name="position" required minLength={2} maxLength={120} />
          <label htmlFor="campaign-state">CHAPTER STATE CODE (OPTIONAL)</label><input id="campaign-state" name="chapterStateCode" maxLength={3} pattern="[A-Z]{2,3}" />
          <label htmlFor="campaign-year">ELECTION YEAR</label><input id="campaign-year" name="electionYear" type="number" min={new Date().getFullYear()} max={new Date().getFullYear() + 2} defaultValue={new Date().getFullYear()} required />
          <label htmlFor="campaign-statement">CANDIDATE STATEMENT</label><textarea id="campaign-statement" name="statement" required minLength={20} maxLength={3000} rows={5} />
          {error && <p className="membership-details-error" role="alert">{error}</p>}
          {message && <p className="portal-success-message" role="status">{message}</p>}
          <button className="button button-dark portal-action" disabled={busy}>{busy ? "Submitting…" : "Submit campaign"} <ArrowUpRight size={15} /></button>
          {campaigns.length > 0 && <FinanceRecordList title="Your campaign statements" empty="" records={campaigns.map((campaign) => ({
            id: campaign.id,
            title: `${campaign.position} · ${campaign.chapter_state_code ?? "National"} · ${campaign.election_year}`,
            detail: campaign.review_note ?? "Candidate eligibility review is pending.",
            status: campaign.status,
          }))} />}
        </form>
      );
    }

type MemberMedia = {
  id: string;
  secure_url: string;
  resource_type: "image" | "video";
  format: string;
  bytes: number;
};

function MemberMediaManager() {
  const [media, setMedia] = useState<MemberMedia[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshMedia() {
    const response = await fetch("/api/media");
    const result = await response.json() as { media?: MemberMedia[]; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Unable to load portfolio media.");
    setMedia(result.media ?? []);
  }

  useEffect(() => {
    void refreshMedia().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : "Unable to load portfolio media.");
    });
  }, []);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("Choose a file smaller than 10 MB.");
      const resourceType = file.type.startsWith("video/") ? "video" : "image";
      if (resourceType === "video") {
        const duration = await readVideoDuration(file);
        if (duration > 60) throw new Error("Videos must be 60 seconds or shorter.");
      }
      const signResponse = await fetch("/api/media/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType }),
      });
      const sign = await signResponse.json() as {
        cloudName?: string;
        apiKey?: string;
        folder?: string;
        publicId?: string;
        resourceType?: string;
        timestamp?: number;
        signature?: string;
        error?: string;
      };
      if (!signResponse.ok || !sign.cloudName || !sign.apiKey || !sign.folder || !sign.publicId || !sign.signature || !sign.timestamp) {
        throw new Error(sign.error ?? "Unable to prepare a secure upload.");
      }
      const form = new FormData();
      form.set("file", file);
      form.set("api_key", sign.apiKey);
      form.set("timestamp", String(sign.timestamp));
      form.set("signature", sign.signature);
      form.set("folder", sign.folder);
      form.set("public_id", sign.publicId);
      const cloudResponse = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/${resourceType}/upload`, {
        method: "POST",
        body: form,
      });
      const uploaded = await cloudResponse.json() as {
        public_id?: string;
        version?: number;
        signature?: string;
        secure_url?: string;
        resource_type?: string;
        format?: string;
        bytes?: number;
        duration?: number;
        error?: { message?: string };
      };
      if (
        !cloudResponse.ok ||
        !uploaded.public_id ||
        typeof uploaded.version !== "number" ||
        !uploaded.signature ||
        !uploaded.secure_url ||
        !uploaded.resource_type ||
        !uploaded.format ||
        typeof uploaded.bytes !== "number"
      ) {
        throw new Error(uploaded.error?.message ?? "Media upload failed.");
      }
      const saveResponse = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          publicId: uploaded.public_id,
          version: uploaded.version,
          signature: uploaded.signature,
          secureUrl: uploaded.secure_url,
          resourceType: uploaded.resource_type,
          format: uploaded.format,
          bytes: uploaded.bytes,
          duration: uploaded.duration,
        }),
      });
      const saved = await saveResponse.json() as { error?: string };
      if (!saveResponse.ok) throw new Error(saved.error ?? "Unable to save this portfolio item.");
      await refreshMedia();
      setMessage("Your portfolio media is live.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to upload portfolio media.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to remove this portfolio item.");
      await refreshMedia();
      setMessage("Portfolio item removed.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to remove this portfolio item.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="member-media-manager">
      <div><h2>Your creative portfolio</h2><p>Upload an image or a video up to 60 seconds. Portfolio uploads are publicly visible.</p></div>
      <label className="button button-dark portal-action member-media-upload">
        <Upload size={15} /> {busy ? "Please wait…" : "Add portfolio media"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/webm"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.currentTarget.value = "";
          }}
        />
      </label>
      {error && <p className="membership-details-error" role="alert">{error}</p>}
      {message && <p className="portal-success-message" role="status">{message}</p>}
      {media.length > 0
        ? <div className="member-media-grid">{media.map((item) => (
          <article key={item.id}>
            {item.resource_type === "video"
              ? <video src={item.secure_url} controls preload="metadata" />
              : <Image src={item.secure_url} alt="Member portfolio" width={480} height={320} unoptimized />}
            <button type="button" aria-label="Remove portfolio item" disabled={busy} onClick={() => void remove(item.id)}><Trash2 size={16} /> Remove</button>
          </article>
        ))}</div>
        : <EmptyNotice>Your portfolio is ready for your first image or short video.</EmptyNotice>}
    </section>
  );
}

function readVideoDuration(file: File) {
  return new Promise<number>((resolve, reject) => {
    const source = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      const duration = video.duration;
      URL.revokeObjectURL(source);
      resolve(duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(source);
      reject(new Error("Unable to read this video file."));
    };
    video.src = source;
  });
}

function PortalSection({ title, eyebrow, description, icon, children }: { title: string; eyebrow: string; description: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="portal-section-page">
      <div className="portal-section-icon">{icon}</div><span className="portal-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p>
      <div className="portal-section-content">{children}</div>
    </section>
  );
}

function ApplicationQueue({
  applications,
  onChanged,
}: {
  applications: PortalApplication[];
  onChanged: (applicationId: string) => void;
}) {
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function review(applicationId: string, decision: "approved" | "needs_information" | "rejected") {
    const reason = reasons[applicationId]?.trim() ?? "";
    if (reason.length < 5) {
      setErrorMessage("Enter a decision reason of at least five characters.");
      return;
    }
    setBusyId(applicationId);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const response = await fetch(`/api/admin/applications/${applicationId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Application review failed.");
      setSuccessMessage("Decision saved to the audit trail.");
      onChanged(applicationId);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Application review failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="application-queue">
      {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="portal-success-message" role="status">{successMessage}</p>}
      {applications.length === 0 ? <EmptyNotice>No submitted membership applications are awaiting review.</EmptyNotice> : applications.map((application) => (
        <article className="application-queue-card" key={application.id}>
          <div className="application-queue-heading">
            <span>{application.status.replaceAll("_", " ").toUpperCase()}</span>
            <small>{new Date(application.submitted_at).toLocaleDateString()}</small>
          </div>
          <h3>{application.full_name}</h3>
          <p>{application.email} · {application.professional_category} · {application.home_state}</p>
          <label htmlFor={`review-reason-${application.id}`}>DECISION REASON</label>
          <textarea
            id={`review-reason-${application.id}`}
            minLength={5}
            maxLength={1000}
            required
            value={reasons[application.id] ?? ""}
            onChange={(event) => setReasons({ ...reasons, [application.id]: event.target.value })}
          />
          <div className="application-review-actions">
            <button type="button" onClick={() => void review(application.id, "approved")} disabled={busyId === application.id}>Approve</button>
            <button type="button" onClick={() => void review(application.id, "needs_information")} disabled={busyId === application.id}>Request info</button>
            <button type="button" onClick={() => void review(application.id, "rejected")} disabled={busyId === application.id}>Decline</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function AdminPanel({
  active,
  applications,
  data,
  onChanged,
}: {
  active: string;
  applications: PortalApplication[];
  data: AdminWorkspaceData;
  onChanged: (applicationId: string) => void;
}) {
  if (active === "Executive overview") {
    const stats = [
      ["ACTIVE ACCOUNTS", data.summary.active_accounts],
      ["ACTIVE MEMBERSHIPS", data.summary.active_memberships],
      ["APPLICATIONS TO REVIEW", data.summary.pending_applications],
      ["EVENTS TO REVIEW", data.summary.pending_events],
      ["OPEN SUPPORT REQUESTS", data.summary.open_support_tickets],
      ["VERIFIED PAYMENTS", data.summary.verified_payments],
    ] as const;
    return (
      <>
        <div className="admin-welcome"><span className="portal-eyebrow">NATIONAL ADMINISTRATION · AUTHENTICATED</span><h1>Governance, with<br /><em>clarity.</em></h1><p>Member and operational records for authorised NEC Naija administrators.</p></div>
        <div className="portal-alert"><ShieldCheck size={17} /><span><b>Authorised workspace:</b> Information is available according to your staff access. Financial records are read-only.</span></div>
        <div className="portal-card-grid">
          {stats.map(([label, value]) => (
            <article className="portal-stat" key={label}>
              <span>{label}</span><b>{value === null ? "Restricted" : value.toLocaleString()}</b>
              <small>{value === null ? "Your role does not include access to this information." : "Current total."}</small>
            </article>
          ))}
        </div>
        <div className="admin-governance-note"><LockKeyhole size={18} /><div><b>Authority is scoped, never assumed.</b><p>Member, payment and audit information is limited to authorised staff. Financial records are read-only, and payment availability does not affect access to other services.</p></div></div>
      </>
    );
  }
  const descriptions: Record<string, string> = {
    "Member applications": "Review submitted member applications, request information and record decisions with an audit trail.",
    "Identity verification": "Handle identity checks and protected documents through authorised compliance workflows.",
    "Payments & ledger": "Reconcile verified gateway events with an append-only ledger; never credit from a browser success screen.",
    "Contribution records": "Review schedules, receipts, arrears and adjustments based on durable financial records.",
    "Event review": "Review proposals, capture decisions and check possible conflicts for human review.",
    "Chapters & committees": "Coordinate state-scoped member support, committee assignments and chapter activity.",
    "Reports & audit": "Access authorised reports and immutable evidence with appropriate separation of duties.",
    "Roles & permissions": "Manage staff responsibilities and chapter access.",
    "System settings": "Manage platform configuration through restricted, audited and step-up-verified controls.",
  };
  if (active === "Member applications") {
    return (
      <PortalSection title="Membership applications" eyebrow="APPLICATION REVIEW" description="Review submitted applications, record a reason for every decision and keep membership activation behind verified payment." icon={<ClipboardCheck size={22} />}>
        {data.permissions.applications
          ? <ApplicationQueue applications={applications} onChanged={onChanged} />
          : <EmptyNotice>You are not authorised to review membership applications. Contact your administrator for access.</EmptyNotice>}
      </PortalSection>
    );
  }

  if (active === "Identity verification") {
    return (
      <PortalSection title={active} eyebrow="MEMBERS · VERIFICATION STATUS" description="View active membership records and verification status." icon={<BadgeCheck size={22} />}>
        {!data.permissions.members
          ? <EmptyNotice>You are not authorised to view member verification records. Contact your administrator for access.</EmptyNotice>
          : data.identityMembers.length === 0
            ? <EmptyNotice>There are no active membership records to display.</EmptyNotice>
            : <div className="admin-record-list">{data.identityMembers.map((member) => (
              <article className="admin-record-card" key={member.user_id}>
                <div><b>{member.full_name}</b><span>{member.user_email}</span></div>
                <div><b>{member.member_number}</b><span>{member.status} · activated {new Date(member.activated_at).toLocaleDateString()}</span></div>
                <span className="admin-status">Review unavailable</span>
              </article>
            ))}</div>}
        <div className="admin-security-note"><LockKeyhole size={16} /><span>Identity document review is not currently available. Contact NEC Naija for assistance.</span></div>
      </PortalSection>
    );
  }

  if (active === "Payments & ledger") {
    return (
      <PortalSection title="Payments & ledger" eyebrow="READ-ONLY FINANCIAL RECORDS" description="Payment activity and corresponding financial records. Payments are processed securely through the approved checkout provider." icon={<CircleDollarSign size={22} />}>
        {!data.permissions.payments
          ? <EmptyNotice>You are not authorised to view financial records. Contact your administrator for access.</EmptyNotice>
          : data.payments.length === 0
            ? <EmptyNotice>No payment attempts have been recorded.</EmptyNotice>
            : <div className="admin-record-list">{data.payments.map((payment) => (
              <article className="admin-record-card" key={payment.id}>
                <div><b>{formatNaira(payment.amount_minor, payment.currency)}</b><span>{payment.user_email} · {payment.provider_reference}</span></div>
                <div><b>{payment.provider} · {payment.status}</b><span>{new Date(payment.created_at).toLocaleString()}{payment.paid_at ? ` · paid ${new Date(payment.paid_at).toLocaleString()}` : ""}</span></div>
                <span className={`admin-status${payment.is_demo ? " admin-status-warning" : ""}`}>{payment.is_demo ? "Test transaction" : payment.has_ledger_entry ? "Ledger posted" : "No ledger entry"}</span>
              </article>
            ))}</div>}
      </PortalSection>
    );
  }

  if (active === "Contribution records") {
    return (
      <PortalSection title="Contribution records" eyebrow="POSTED MEMBER PAYMENTS" description="Read-only payment journal entries with their balanced ledger lines. No balances or adjustments are invented." icon={<Wallet size={22} />}>
        {!data.permissions.payments
          ? <EmptyNotice>You are not authorised to view financial records. Contact your administrator for access.</EmptyNotice>
          : data.contributions.length === 0
            ? <EmptyNotice>No contribution journal entries have been posted.</EmptyNotice>
            : <div className="admin-record-list">{data.contributions.map((entry) => (
              <article className="admin-record-card" key={entry.id}>
                <div><b>{formatNaira(entry.amount_minor, entry.currency)}{entry.is_demo ? " · test transaction" : ""}</b><span>{entry.user_email} · {entry.description}</span></div>
                <div><b>{new Date(entry.posted_at).toLocaleString()}</b><span>{entry.provider_reference}</span></div>
                <span>{entry.lines.map((line) => `${line.account}: ${line.side} ${formatNaira(line.amount_minor, entry.currency)}`).join(" · ")}</span>
              </article>
            ))}</div>}
      </PortalSection>
    );
  }

  if (active === "Event review") {
    return (
      <PortalSection title={active} eyebrow="EVENTS · REVIEW QUEUE" description="Review submitted events and see approved listings within your assigned chapter or national scope." icon={<CalendarDays size={22} />}>
        {!data.permissions.eventsNational && !data.permissions.eventsState
          ? <EmptyNotice>You are not authorised to review events. Contact your administrator for access.</EmptyNotice>
          : <EventReviewQueue events={data.events} />}
      </PortalSection>
    );
  }

  if (active === "Chapters & committees") {
    return (
      <PortalSection title={active} eyebrow="CHAPTER DIRECTORY" description="Chapter information with active membership and chapter-role assignment counts." icon={<BriefcaseBusiness size={22} />}>
        {!data.permissions.roles && !data.permissions.reports && !data.permissions.chaptersManage
          ? <EmptyNotice>You are not authorised to view chapter records. Contact your administrator for access.</EmptyNotice>
          : data.chapters.length === 0
            ? <EmptyNotice>No chapter records are configured.</EmptyNotice>
            : <div className="admin-record-list">{data.chapters.map((chapter) => (
              <article className="admin-record-card" key={chapter.state_code}>
                <div><b>{chapter.state_name}</b><span>{chapter.state_code}</span></div>
                <div><b>{chapter.member_count} active members</b><span>{chapter.coordinator_count} chapter role assignments</span></div>
                <span className={`admin-status${chapter.is_active ? "" : " admin-status-muted"}`}>{chapter.is_active ? "Active" : "Inactive"}</span>
                {data.permissions.chaptersManage && <ChapterActivationButton id={chapter.id} isActive={chapter.is_active} />}
              </article>
            ))}</div>}
      </PortalSection>
    );
  }

  if (active === "Reports & audit") {
    return (
      <PortalSection title={active} eyebrow="AUDIT TRAIL · READ ONLY" description="Recent activity records and service totals. The newest 100 audit entries are shown." icon={<ChartNoAxesCombined size={22} />}>
        {!data.permissions.reports
          ? <EmptyNotice>You are not authorised to view national reports. Contact your administrator for access.</EmptyNotice>
          : <><div className="admin-metrics">
            <span>Active accounts <b>{data.summary.active_accounts.toLocaleString()}</b></span>
            <span>Active memberships <b>{data.summary.active_memberships?.toLocaleString() ?? "—"}</b></span>
            <span>Verified payments <b>{data.summary.verified_payments?.toLocaleString() ?? "—"}</b></span>
          </div>
          {data.permissions.publishReports && <ReportPublishingForm />}
          {data.auditLogs.length === 0
            ? <EmptyNotice>No audit activity has been recorded yet.</EmptyNotice>
            : <div className="admin-record-list">{data.auditLogs.map((log) => (
              <article className="admin-record-card" key={log.id}>
                <div><b>{log.action}</b><span>{log.actor_email ?? "System"} · {log.entity_type}{log.entity_id ? ` · ${log.entity_id}` : ""}</span></div>
                <div><b>{new Date(log.created_at).toLocaleString()}</b><span>{log.metadata}</span></div>
              </article>
            ))}</div>}</>}
      </PortalSection>
    );
  }

  if (active === "Member finance requests") {
    return (
      <PortalSection title={active} eyebrow="CONTRIBUTIONS · LOAN & ANNUAL REQUESTS" description="Reconcile contributions and repayments, review loan requests, and record approved loan issuances with agreed terms." icon={<HandCoins size={22} />}>
        <MemberFinanceReviewQueue data={data} />
      </PortalSection>
    );
  }
  if (active === "Leadership campaigns") {
    return (
      <PortalSection title={active} eyebrow="ANNUAL MANAGEMENT ELECTIONS" description="Review management and state committee campaign eligibility. This workspace does not conduct elections or appoint officers." icon={<UsersRound size={22} />}>
        {!data.permissions.campaignsReview
          ? <EmptyNotice>You are not authorised to review election campaigns.</EmptyNotice>
          : data.campaigns.length === 0
            ? <EmptyNotice>No candidate campaign statements are awaiting review.</EmptyNotice>
            : <CampaignReviewQueue campaigns={data.campaigns} />}
      </PortalSection>
    );
  }

  if (active === "Roles & permissions") {
    return (
      <PortalSection title={active} eyebrow="ASSIGNMENTS · ROLE CATALOG" description="Current role assignments. Super-administrator privileges are not assignable from this workspace." icon={<LockKeyhole size={22} />}>
        {!data.permissions.roles
          ? <EmptyNotice>You are not authorised to manage staff roles. Contact your administrator for access.</EmptyNotice>
          : <RoleManagement data={data} />}
      </PortalSection>
    );
  }

  if (active === "Support & privacy") {
    return (
      <PortalSection title={active} eyebrow="SUPPORT QUEUE · PRIVACY REQUESTS" description="Member support tickets and personal-data requests." icon={<FileText size={22} />}>
        {!data.permissions.support
          ? <EmptyNotice>You are not authorised to view support requests. Contact your administrator for access.</EmptyNotice>
          : <><h2 className="admin-subheading">Support tickets</h2>
            {data.supportTickets.length === 0
              ? <EmptyNotice>No support tickets have been submitted.</EmptyNotice>
              : <div className="admin-record-list">{data.supportTickets.map((ticket) => (
                <article className="admin-record-card" key={ticket.id}>
                  <div><b>{ticket.subject}</b><span>{ticket.user_email}</span></div>
                  <div><b>{ticket.status.replaceAll("_", " ")}</b><span>{new Date(ticket.created_at).toLocaleString()}</span></div>
                  <p>{ticket.details}</p>
                  <AdminStatusForm
                    endpoint={`/api/admin/support/${ticket.id}`}
                    initialStatus={ticket.status}
                    options={[
                      { value: "open", label: "Open" },
                      { value: "in_progress", label: "In progress" },
                      { value: "resolved", label: "Resolved" },
                      { value: "closed", label: "Closed" },
                    ]}
                    actionLabel="Save ticket status"
                  />
                </article>
              ))}</div>}
            <h2 className="admin-subheading">Data requests</h2>
            {data.dataRequests.length === 0
              ? <EmptyNotice>No personal-data requests have been submitted.</EmptyNotice>
              : <div className="admin-record-list">{data.dataRequests.map((request) => (
                <article className="admin-record-card" key={request.id}>
                  <div><b>{request.request_type} · {request.status.replaceAll("_", " ")}</b><span>{request.user_email} · {new Date(request.created_at).toLocaleString()}</span></div>
                  <p>{request.details}</p>
                  {request.status !== "declined" && request.status !== "completed" && (
                    <AdminStatusForm
                      endpoint={`/api/admin/data-requests/${request.id}`}
                      initialStatus={request.status === "submitted" ? "in_review" : request.status}
                      options={[
                        { value: "in_review", label: "In review" },
                        { value: "declined", label: "Declined" },
                      ]}
                      actionLabel="Save request status"
                    />
                  )}
                </article>
              ))}</div>}</>}
      </PortalSection>
    );
  }

  if (active === "System settings") {
    return (
      <PortalSection title={active} eyebrow="SERVICE SETTINGS · CURRENT STATUS" description="Current service availability. High-impact settings are displayed read-only here." icon={<Settings2 size={22} />}>
        {!data.permissions.settings
          ? <EmptyNotice>You are not authorised to view service settings. Contact your administrator for access.</EmptyNotice>
          : data.featureFlags.length === 0
            ? <EmptyNotice>No feature flags are configured.</EmptyNotice>
            : <><div className="admin-record-list">{data.featureFlags.map((flag) => (
              <article className="admin-record-card" key={flag.flag_code}>
                <div><b>{flag.flag_code.replaceAll("_", " ")}</b><span>Updated {new Date(flag.updated_at).toLocaleString()}</span></div>
                <span className={`admin-status${flag.enabled ? "" : " admin-status-muted"}`}>{flag.enabled ? "Enabled" : "Disabled"}</span>
              </article>
            ))}</div><div className="admin-security-note"><LockKeyhole size={16} /><span>Enabling payments, lending, investments or distributions requires approved operations and safeguards; these settings are not changed from this panel.</span></div></>}
      </PortalSection>
    );
  }

  return <PortalSection title={active} eyebrow="ADMINISTRATION WORKSPACE" description={descriptions[active]} icon={<ClipboardCheck size={22} />}><EmptyNotice>No records are available for this section.</EmptyNotice></PortalSection>;
}

function formatNaira(amountMinor: string, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(amountMinor) / 100);
}

function requireAdminWorkspace(data?: AdminWorkspaceData): AdminWorkspaceData {
  if (!data) throw new Error("The administration workspace requires service records and access permissions.");
  return data;
}

function AdminStatusForm({
  endpoint,
  initialStatus,
  options,
  actionLabel,
}: {
  endpoint: string;
  initialStatus: string;
  options: { value: string; label: string }[];
  actionLabel: string;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function update(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reason.trim().length < 5) {
      setErrorMessage("Enter a reason of at least five characters.");
      return;
    }
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Status update failed.");
      setMessage("Status updated and recorded in the audit trail.");
      setReason("");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-status-form" onSubmit={(event) => void update(event)}>
      <label htmlFor={`${endpoint}-status`}>STATUS</label>
      <select id={`${endpoint}-status`} value={status} onChange={(event) => setStatus(event.target.value)}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      <label htmlFor={`${endpoint}-reason`}>REASON FOR CHANGE</label>
      <input
        id={`${endpoint}-reason`}
        minLength={5}
        maxLength={1000}
        required
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
      {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
      {message && <p className="portal-success-message" role="status">{message}</p>}
      <button type="submit" className="button button-outline portal-action" disabled={busy}>
        {busy ? "Saving…" : actionLabel}
      </button>
    </form>
  );
}

function EventReviewQueue({ events }: { events: AdminWorkspaceData["events"] }) {
  return events.length === 0
    ? <EmptyNotice>No submitted or approved events are available in your review scope.</EmptyNotice>
    : <div className="admin-record-list">{events.map((event) => <EventReviewCard event={event} key={event.id} />)}</div>;
}

function EventReviewCard({ event }: { event: AdminWorkspaceData["events"][number] }) {
  const [decision, setDecision] = useState<"approved" | "needs_information" | "declined">("approved");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  async function review() {
    if (reason.trim().length < 5) {
      setErrorMessage("Enter a decision reason of at least five characters.");
      return;
    }
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/events/${event.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Event review failed.");
      setMessage("Decision recorded in the audit trail.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Event review failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="admin-record-card admin-event-card">
      <div><b>{event.title}</b><span>{event.category} · {event.state_name ?? "National"} · {event.venue ?? "Venue not supplied"}</span></div>
      <div><b>{event.status.replaceAll("_", " ")}</b><span>{new Date(event.starts_at).toLocaleString()} · submitted by {event.creator_email}{event.review_target_at ? ` · review target ${new Date(event.review_target_at).toLocaleDateString()}` : ""}</span></div>
      <p>{event.description}</p>
      {event.last_decision && <p>Latest decision: {event.last_decision.replaceAll("_", " ")}{event.last_review_reason ? ` · ${event.last_review_reason}` : ""}</p>}
      <span className="admin-status">{event.is_public ? "Public listing" : "Not public"}</span>
      {event.status === "submitted" && (
        <div className="admin-event-review">
          <label htmlFor={`event-decision-${event.id}`}>DECISION</label>
          <select
            id={`event-decision-${event.id}`}
            value={decision}
            onChange={(change) => {
              const value = change.target.value;
              if (value === "approved" || value === "needs_information" || value === "declined") {
                setDecision(value);
              }
            }}
          >
            <option value="approved">Approve and publish</option>
            <option value="needs_information">Request information</option>
            <option value="declined">Decline</option>
          </select>
          <label htmlFor={`event-reason-${event.id}`}>REVIEW REASON</label>
          <textarea
            id={`event-reason-${event.id}`}
            minLength={5}
            maxLength={1000}
            required
            value={reason}
            onChange={(change) => setReason(change.target.value)}
          />
          {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
          {message && <p className="portal-success-message" role="status">{message}</p>}
          <button type="button" className="button button-dark portal-action" disabled={busy} onClick={() => void review()}>
            {busy ? "Saving…" : "Save decision"}
          </button>
        </div>
      )}
    </article>
  );
}

function ReportPublishingForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError("");
    setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to publish this report.");
      setMessage("Report published and recorded in the audit trail.");
      formElement.reset();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to publish this report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="member-support-form report-publishing-form" onSubmit={(event) => void submit(event)}>
      <h2>Publish a cooperative report</h2>
      <label htmlFor="report-type">REPORT TYPE</label>
      <select id="report-type" name="reportType" defaultValue="quarterly">
        <option value="quarterly">Quarterly operational report</option>
        <option value="annual">Annual report</option>
      </select>
      <label htmlFor="report-year">YEAR</label><input id="report-year" name="reportYear" type="number" min="2020" max={new Date().getFullYear()} defaultValue={new Date().getFullYear()} required />
      <label htmlFor="report-quarter">QUARTER (LEAVE EMPTY FOR ANNUAL)</label><select id="report-quarter" name="reportQuarter" defaultValue=""><option value="">Annual</option><option value="1">Q1</option><option value="2">Q2</option><option value="3">Q3</option><option value="4">Q4</option></select>
      <label htmlFor="report-title">TITLE</label><input id="report-title" name="title" required minLength={5} maxLength={180} />
      <label htmlFor="report-summary">SUMMARY</label><textarea id="report-summary" name="summary" required minLength={20} maxLength={10000} rows={5} />
      <label htmlFor="report-profits">DECLARED PROFIT (₦, OPTIONAL)</label><input id="report-profits" name="profits" type="number" min="0" step="0.01" />
      <label htmlFor="report-losses">LOSSES (₦, OPTIONAL)</label><input id="report-losses" name="losses" type="number" min="0" step="0.01" />
      <label htmlFor="report-reserves">RESERVES (₦, OPTIONAL)</label><input id="report-reserves" name="reserves" type="number" min="0" step="0.01" />
      <label htmlFor="report-opportunities">NEXT-YEAR OPPORTUNITIES (OPTIONAL)</label><textarea id="report-opportunities" name="opportunities" maxLength={5000} rows={3} />
      {error && <p className="membership-details-error" role="alert">{error}</p>}
      {message && <p className="portal-success-message" role="status">{message}</p>}
      <p>Published reports are public and cannot be overwritten. Verify financial figures before publication.</p>
      <button className="button button-dark portal-action" disabled={busy}>{busy ? "Publishing…" : "Publish report"} <ArrowUpRight size={15} /></button>
    </form>
  );
}

function MemberFinanceReviewQueue({ data }: { data: AdminWorkspaceData }) {
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function review(endpoint: string, payload: Record<string, string>, key: string) {
    if (reason.trim().length < 5) {
      setError("Enter a review reason of at least five characters.");
      return;
    }
    setBusyId(key);
    setError("");
    setMessage("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, reason }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Review action failed.");
      setMessage("Review action recorded in the audit trail.");
      setReason("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Review action failed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-record-list">
      {error && <p className="membership-details-error" role="alert">{error}</p>}
      {message && <p className="portal-success-message" role="status">{message}</p>}
      {(data.pendingContributions.length > 0 || data.loanRequests.length > 0 || data.pendingLoanRepayments.length > 0 || data.annualRequests.length > 0) && (
        <><label htmlFor="member-finance-review-reason">REVIEW REASON (USED FOR THE ACTION YOU SELECT)</label><textarea id="member-finance-review-reason" minLength={5} maxLength={1000} required value={reason} onChange={(event) => setReason(event.target.value)} /></>
      )}
      <h2 className="admin-subheading">Contribution reconciliation</h2>
      {!data.permissions.contributionsReview
        ? <EmptyNotice>You are not authorised to reconcile member contributions.</EmptyNotice>
        : data.pendingContributions.length === 0
          ? <EmptyNotice>No contribution entries are awaiting reconciliation.</EmptyNotice>
          : data.pendingContributions.map((item) => (
            <article className="admin-record-card" key={item.id}>
              <div><b>{item.user_email} · {item.contribution_type.replaceAll("_", " ")}</b><span>{formatPortalNaira(item.amount_minor)} · {item.contribution_year}{item.contribution_month ? `/${item.contribution_month}` : ""} · ref ${item.payment_reference}</span></div>
              <div className="application-review-actions">
                <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/contributions/${item.id}/review`, { decision: "verified" }, item.id)}>Verify &amp; post</button>
                <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/contributions/${item.id}/review`, { decision: "rejected" }, item.id)}>Reject</button>
              </div>
            </article>
          ))}
      <h2 className="admin-subheading">Loan applications</h2>
      {!data.permissions.loansReview
        ? <EmptyNotice>You are not authorised to review loan applications.</EmptyNotice>
        : data.loanRequests.length === 0
          ? <EmptyNotice>No loan applications are awaiting review.</EmptyNotice>
          : data.loanRequests.map((item) => (
            <article className="admin-record-card" key={item.id}>
              <div><b>{item.project_name} · {item.user_email}</b><span>{formatPortalNaira(item.amount_minor)} · repayment requested by December {item.requested_repayment_year}</span><p>{item.purpose}</p></div>
              {item.status === "approved"
                ? <LoanIssuanceForm
                    applicationId={item.id}
                    requestedAmountMinor={item.amount_minor}
                    repaymentYear={item.requested_repayment_year}
                    onIssued={() => router.refresh()}
                  />
                : <div className="application-review-actions">
                    <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/member-finance/${item.id}/review`, { type: "loan_request", decision: "under_review" }, item.id)}>Begin review</button>
                    <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/member-finance/${item.id}/review`, { type: "loan_request", decision: "needs_information" }, item.id)}>Request information</button>
                    <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/member-finance/${item.id}/review`, { type: "loan_request", decision: "approved" }, item.id)}>Approve request</button>
                    <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/member-finance/${item.id}/review`, { type: "loan_request", decision: "declined" }, item.id)}>Decline</button>
                  </div>}
            </article>
          ))}
      <h2 className="admin-subheading">Loan repayment reconciliation</h2>
      {!data.permissions.loansReview
        ? <EmptyNotice>You are not authorised to reconcile loan repayments.</EmptyNotice>
        : data.pendingLoanRepayments.length === 0
          ? <EmptyNotice>No loan repayment references are awaiting reconciliation.</EmptyNotice>
          : data.pendingLoanRepayments.map((item) => (
            <article className="admin-record-card" key={item.id}>
              <div><b>{item.user_email} · {formatPortalNaira(item.amount_minor)}</b><span>Reference {item.payment_reference} · current outstanding {formatPortalNaira(item.outstanding_minor)}</span></div>
              <div className="application-review-actions">
                <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/loan-repayments/${item.id}/review`, { decision: "verified" }, item.id)}>Verify &amp; post</button>
                <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/loan-repayments/${item.id}/review`, { decision: "rejected" }, item.id)}>Reject</button>
              </div>
            </article>
          ))}
      <h2 className="admin-subheading">Annual member requests</h2>
      {!data.permissions.reports
        ? <EmptyNotice>You are not authorised to review annual member requests.</EmptyNotice>
        : data.annualRequests.length === 0
          ? <EmptyNotice>No annual requests are awaiting review.</EmptyNotice>
          : data.annualRequests.map((item) => (
            <article className="admin-record-card" key={item.id}>
              <div><b>{item.user_email} · {item.report_year}</b><span>{item.request_type.replaceAll("_", " ")} · eligible contribution snapshot {formatPortalNaira(item.contribution_balance_minor)} · proposed rollover bonus {formatPortalNaira(item.rollover_bonus_minor)}</span></div>
              <div className="application-review-actions">
                <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/member-finance/${item.id}/review`, { type: "annual_request", decision: "under_review" }, item.id)}>Begin review</button>
                <button type="button" disabled={busyId === item.id} onClick={() => void review(`/api/admin/member-finance/${item.id}/review`, { type: "annual_request", decision: "declined" }, item.id)}>Decline</button>
              </div>
            </article>
          ))}
      <p className="admin-security-note">Review approval does not authorise loan disbursements or profit payouts. These require separately approved terms and reconciled finance controls.</p>
    </div>
  );
}

function LoanIssuanceForm({ applicationId, requestedAmountMinor, repaymentYear, onIssued }: {
  applicationId: string;
  requestedAmountMinor: string;
  repaymentYear: number;
  onIssued: () => void;
}) {
  const [amount, setAmount] = useState((Number(requestedAmountMinor) / 100).toFixed(2));
  const [repaymentTerms, setRepaymentTerms] = useState("");
  const [disbursementReference, setDisbursementReference] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const minDate = new Date().toISOString().slice(0, 10);
  const lastDueDate = `${repaymentYear}-11-30`;

  async function issue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/loans/${applicationId}/issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor: Math.round(Number(amount) * 100),
          repaymentTerms,
          disbursementReference,
          dueAt,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to record loan issuance.");
      onIssued();
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to record loan issuance.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="member-support-form" onSubmit={(event) => void issue(event)}>
      <h3>Record approved loan issuance</h3>
      <label htmlFor={`issue-amount-${applicationId}`}>ISSUED PRINCIPAL (₦)</label>
      <input id={`issue-amount-${applicationId}`} type="number" min="100" step="0.01" max={Number(requestedAmountMinor) / 100} required value={amount} onChange={(event) => setAmount(event.target.value)} />
      <label htmlFor={`issue-terms-${applicationId}`}>AGREED REPAYMENT TERMS</label>
      <textarea id={`issue-terms-${applicationId}`} required minLength={10} maxLength={2000} rows={3} value={repaymentTerms} onChange={(event) => setRepaymentTerms(event.target.value)} />
      <label htmlFor={`issue-reference-${applicationId}`}>DISBURSEMENT REFERENCE</label>
      <input id={`issue-reference-${applicationId}`} required minLength={3} maxLength={160} value={disbursementReference} onChange={(event) => setDisbursementReference(event.target.value)} />
      <label htmlFor={`issue-due-${applicationId}`}>DUE DATE (BEFORE DECEMBER {repaymentYear})</label>
      <input id={`issue-due-${applicationId}`} type="date" min={minDate} max={lastDueDate} required value={dueAt} onChange={(event) => setDueAt(event.target.value)} />
      {error && <p className="membership-details-error" role="alert">{error}</p>}
      <button className="button button-dark portal-action" disabled={busy}>{busy ? "Recording…" : "Record issuance & ledger entry"} <ArrowUpRight size={15} /></button>
    </form>
  );
}

function ChapterActivationButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/chapters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Unable to update chapter status.");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update chapter status.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="admin-remove-role" disabled={busy} onClick={() => void toggle()}>
        {busy ? "Saving…" : isActive ? "Deactivate chapter" : "Activate chapter"}
      </button>
      {error && <p className="membership-details-error" role="alert">{error}</p>}
    </div>
  );
}

function CampaignReviewQueue({ campaigns }: { campaigns: AdminWorkspaceData["campaigns"] }) {
  const [reason, setReason] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function review(id: string, decision: "under_review" | "eligible" | "ineligible") {
    if (reason.trim().length < 5) {
      setError("Enter a review reason of at least five characters.");
      return;
    }
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/campaigns/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Campaign review failed.");
      setMessage("Campaign eligibility decision recorded in the audit trail.");
      setReason("");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Campaign review failed.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-record-list">
      <label htmlFor="campaign-review-reason">ELIGIBILITY REVIEW REASON</label>
      <textarea id="campaign-review-reason" minLength={5} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
      {error && <p className="membership-details-error" role="alert">{error}</p>}
      {message && <p className="portal-success-message" role="status">{message}</p>}
      {campaigns.map((campaign) => (
        <article className="admin-record-card" key={campaign.id}>
          <div><b>{campaign.position} · {campaign.user_email}</b><span>{campaign.chapter_state_code ?? "National"} · {campaign.election_year}</span><p>{campaign.statement}</p></div>
          <div className="application-review-actions">
            <button type="button" disabled={busyId === campaign.id} onClick={() => void review(campaign.id, "under_review")}>Begin review</button>
            <button type="button" disabled={busyId === campaign.id} onClick={() => void review(campaign.id, "eligible")}>Eligible</button>
            <button type="button" disabled={busyId === campaign.id} onClick={() => void review(campaign.id, "ineligible")}>Ineligible</button>
          </div>
        </article>
      ))}
    </div>
  );
}

function RoleManagement({ data }: { data: AdminWorkspaceData }) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyAssignment, setBusyAssignment] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const selectedRole = data.roleOptions.find((role) => role.id === roleId);
  const needsChapter = selectedRole
    ? ["state_coordinator", "state_committee"].includes(selectedRole.role_code)
    : false;

  async function assignRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setErrorMessage("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/roles/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          roleId,
          chapterId: needsChapter ? chapterId : null,
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Role assignment failed.");
      setMessage("Role assignment saved and added to the audit trail.");
      setUserId("");
      setRoleId("");
      setChapterId("");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Role assignment failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(assignmentId: string) {
    setBusyAssignment(assignmentId);
    setErrorMessage("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/roles/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Role removal failed.");
      setMessage("Role assignment removed and added to the audit trail.");
      router.refresh();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Role removal failed.");
    } finally {
      setBusyAssignment(null);
    }
  }

  return (
    <>
      <form className="admin-action-form" onSubmit={(event) => void assignRole(event)}>
        <label htmlFor="role-account">ACCOUNT</label>
        <select id="role-account" required value={userId} onChange={(event) => setUserId(event.target.value)}>
          <option value="">Choose an active account</option>
          {data.accounts.map((account) => <option value={account.id} key={account.id}>{account.full_name} · {account.email}</option>)}
        </select>
        <label htmlFor="role-selection">ROLE</label>
        <select id="role-selection" required value={roleId} onChange={(event) => { setRoleId(event.target.value); setChapterId(""); }}>
          <option value="">Choose a role</option>
          {data.roleOptions.map((role) => <option value={role.id} key={role.id}>{role.display_name}</option>)}
        </select>
        {needsChapter && (
          <>
            <label htmlFor="role-chapter">CHAPTER</label>
            <select id="role-chapter" required value={chapterId} onChange={(event) => setChapterId(event.target.value)}>
              <option value="">Choose a chapter</option>
              {data.chapters.map((chapter) => <option value={chapter.id} key={chapter.id}>{chapter.state_name}</option>)}
            </select>
          </>
        )}
        <button type="submit" className="button button-dark portal-action" disabled={busy}>
          {busy ? "Saving…" : "Assign role"}
        </button>
      </form>
      {errorMessage && <p className="auth-error" role="alert">{errorMessage}</p>}
      {message && <p className="portal-success-message" role="status">{message}</p>}
      <h2 className="admin-subheading">Current assignments</h2>
      {data.roles.length === 0
        ? <EmptyNotice>No role assignments are recorded.</EmptyNotice>
        : <div className="admin-record-list">{data.roles.map((assignment) => {
          const protectedRole = assignment.role_code === "super_admin" ||
            (assignment.role_code === "national_admin" && !data.permissions.superAdmin);
          return (
            <article className="admin-record-card" key={assignment.assignment_id}>
              <div><b>{assignment.full_name}</b><span>{assignment.email}</span></div>
              <div><b>{assignment.display_name}</b><span>{assignment.state_name ?? "National scope"}</span></div>
              {protectedRole
                ? <span className="admin-status admin-status-muted">Protected assignment</span>
                : <button
                    type="button"
                    className="admin-remove-role"
                    disabled={busyAssignment === assignment.assignment_id}
                    onClick={() => void removeRole(assignment.assignment_id)}
                  >
                    {busyAssignment === assignment.assignment_id ? "Removing…" : "Remove role"}
                  </button>}
            </article>
          );
        })}</div>}
      <div className="admin-security-note"><LockKeyhole size={16} /><span>Super-administrator access cannot be granted or changed here. National administrator assignments are limited to super administrators.</span></div>
    </>
  );
}

export default function PortalPreview({
  mode,
  userName,
  applicationStatus,
  annualMembershipFee,
  subscription,
  checkoutAvailable = false,
  applications: initialApplications = [],
  adminWorkspace,
}: {
  mode: "member" | "admin";
  userName?: string;
  applicationStatus?: string | null;
  annualMembershipFee?: string;
  subscription?: PortalMembershipSubscription | null;
  checkoutAvailable?: boolean;
  applications?: PortalApplication[];
  adminWorkspace?: AdminWorkspaceData;
}) {
  const navigation = mode === "member" ? memberNavigation : adminNavigation;
  const [active, setActive] = useState(navigation[0].name);
  const [applications, setApplications] = useState(initialApplications);
  const router = useRouter();
  const fee = annualMembershipFee ?? "₦50,000";
  const title = mode === "member" ? "MEMBER SPACE" : "NATIONAL ADMIN";

  return (
    <main className={`portal-page ${mode === "admin" ? "portal-admin" : ""}`}>
      <aside className="portal-sidebar">
        <Link className="brand portal-brand" href="/"><BrandMark /><span className="brand-name">NEC <i>NAIJA</i></span></Link>
        <span className="portal-sidebar-label">{title}</span>
        <nav aria-label={mode === "member" ? "Member portal navigation" : "Administration navigation"}>
          {navigation.map(({ name, icon: Icon }) => (
            <button type="button" key={name} className={active === name ? "portal-nav-active" : ""} onClick={() => setActive(name)}>
              <Icon size={16} /><span>{name}</span>{active === name && <i />}
            </button>
          ))}
        </nav>
        <div className="portal-sidebar-bottom">
          <div className="portal-user-stub"><span>{mode === "member" ? "✳" : "N"}</span><div><b>{userName ?? (mode === "member" ? "Guest" : "Administrator")}</b><small>{userName ? "Signed in" : "Sign in to continue"}</small></div></div>
          {userName ? (
            <form action="/auth/signout" method="post" className="portal-signout-form">
              <button type="submit" className="portal-signout-button"><LogOut size={16} /> Sign out</button>
            </form>
          ) : (
            <Link href={mode === "admin" ? "/login?next=/admin" : "/login?next=/dashboard"} className="portal-home-link"><ArrowLeft size={14} /> Sign in</Link>
          )}
          <Link href="/" className="portal-home-link"><ArrowLeft size={14} /> Back to NEC Naija</Link>
        </div>
      </aside>
      <section className="portal-main">
        <header className="portal-topbar">
          <div><span className="portal-mobile-brand">NEC <i>NAIJA</i></span><span>{mode === "member" ? "MEMBER PORTAL" : "ADMINISTRATION"} <i>/</i> {mode === "member" ? "YOUR ACCOUNT" : "WORKSPACE"}</span></div>
          {mode === "member"
            ? <Link href="/" className="portal-top-link"><span className="portal-status-dot" /> NEC Naija <ArrowUpRight size={14} /></Link>
            : <span className="portal-top-link"><span className="portal-status-dot" /> Staff workspace</span>}
        </header>
        <div className="portal-content">
          <motion.div key={active} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            {mode === "member" ? (
              <MemberPanel
                active={active}
                userName={userName}
                applicationStatus={applicationStatus}
                annualMembershipFee={fee}
                subscription={subscription}
                checkoutAvailable={checkoutAvailable}
              />
            ) : (
              <AdminPanel
                active={active}
                applications={applications}
                data={requireAdminWorkspace(adminWorkspace)}
                onChanged={(applicationId) => {
                  setApplications((current) => current.filter((item) => item.id !== applicationId));
                  router.refresh();
                }}
              />
            )}
          </motion.div>
          <footer className="portal-footer"><span>NEC NAIJA · {mode === "member" ? "MEMBER SERVICES" : "GOVERNANCE WORKSPACE"}</span><span>{mode === "member" ? "YOUR INFORMATION IS PRIVATE" : "AUTHORISED STAFF ACCESS"}</span></footer>
        </div>
      </section>
    </main>
  );
}
