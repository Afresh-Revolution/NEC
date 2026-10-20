import Link from "next/link";
import { ArrowLeft, ArrowUpRight, BadgeCheck, CalendarDays, ChartNoAxesCombined, MapPin, Music2, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import SiteHeader from "./site-header";
import BrandMark from "./brand-mark";
import PublicPortfolioGallery, { type PublicPortfolio } from "./public-portfolio-gallery";

const pageContent = {
  about: {
    label: "THE IDEA",
    title: <>A cooperative<br />built for <em>culture.</em></>,
    intro: "NEC Naija is a proposed creative cooperative for the entertainers shaping Northern Nigeria. A shared home for professional identity, community and practical opportunity.",
    points: [
      ["Member-led by design", "A clear governance structure, accountable chapter teams and member participation at the heart of decisions."],
      ["Creative at its core", "A home for artists, performers, filmmakers, producers, hosts, crews and the people who make culture move."],
      ["Shared financial strength", "Members contribute toward common goals, access project support and participate in transparent cooperative reporting."],
    ],
    icon: ShieldCheck,
    cta: "See how membership works",
    href: "/membership",
  },
  membership: {
    label: "YOUR PLACE IN THE COOPERATIVE",
    title: <>Bring your craft.<br />Find your <em>people.</em></>,
    intro: "Membership connects creative professionals with peers, chapters, events and a member-led cooperative. Complete your profile, pay the annual membership fee and receive an application decision before full membership is activated.",
    points: [
      ["Complete your profile", "Share your professional identity, creative discipline and chapter information."],
      ["Pay the annual membership fee", "The annual fee is ₦50,000, renewable yearly and non-refundable under the proposed terms. It is separate from cooperative contributions."],
      ["Build a contribution record", "Members are expected to contribute ₦10,000 monthly and may add optional contributions. Verified balances inform annual profit sharing."],
      ["Application review", "After verified payment and cooperative review, approved applicants receive full member access."],
    ],
    icon: UsersRound,
    cta: "Start your application",
    href: "/register",
    notice: "Annual membership is ₦50,000. Renew it each year. The proposed fee is non-refundable and distinct from contributions; final terms are subject to cooperative approval.",
  },
  artists: {
    label: "THE CREATIVE CIRCLE",
    title: <>Every voice<br />has its <em>place.</em></>,
    intro: "The member directory is designed to help creatives discover one another by discipline, chapter and specialty. Public profile visibility will always be opt-in.",
    points: [
      ["Music & sound", "Artists, vocalists, instrumentalists, producers, DJs and sound crews."],
      ["Film & performance", "Actors, directors, filmmakers, dancers, theatre makers and presenters."],
      ["Culture & craft", "Designers, photographers, writers, stylists, makers and creative teams."],
    ],
    icon: Music2,
    cta: "Explore membership",
    href: "/register",
    notice: "The public artist directory will appear as verified members opt in. No sample profiles or invented member counts are shown here.",
  },
  events: {
    label: "OUT IN THE WORLD",
    title: <>The next good<br />thing is <em>nearby.</em></>,
    intro: "Find approved chapter happenings, creative showcases and community gatherings. Active members may propose events for state chapter coordination.",
    points: [
      ["Three-month lead time", "Submit shows, concerts, rallies and other event proposals at least three months before the proposed date."],
      ["Chapter coordination", "The relevant state chapter compares dates and audiences, and may coordinate changes to avoid clashes."],
      ["Review target", "The expected review time is 14–20 days. Only approved, public events are published."],
    ],
    icon: CalendarDays,
    cta: "Submit an event proposal",
    href: "/dashboard",
    notice: "No upcoming public events have been published yet. This calendar will show verified listings when chapter teams are active.",
  },
  chapters: {
    label: "ROOTED IN YOUR COMMUNITY",
    title: <>Local in spirit.<br /><em>Connected by culture.</em></>,
    intro: "NEC Naija is designed around national coordination and state chapters, with local communities shaping the opportunities and conversations that matter where they are.",
    points: [
      ["State chapters", "Local coordination keeps community activities connected to the people they serve."],
      ["Member committees", "Chapter events and decisions follow clear review workflows and recorded outcomes."],
      ["Scoped access", "State teams work with authorised chapter information, not private records from other states."],
    ],
    icon: MapPin,
    cta: "View the chapter network",
    href: "/",
    notice: "Chapter contact details will be published after local teams and governance arrangements are confirmed.",
  },
  opportunities: {
    label: "WHAT'S NEXT",
    title: <>Room for<br /><em>new possibilities.</em></>,
    intro: "Find creative opportunities, chapter notices and cooperative announcements as they become available. Published listings will be reviewed and clearly attributed.",
    points: [
      ["Creative opportunities", "Explore future calls, collaborations, commissions and programmes shared with the community."],
      ["Chapter announcements", "Stay in the loop on approved local meetups and cooperative notices."],
      ["Clear and accountable", "Listings will include their source, relevant details and a way to ask questions."],
    ],
    icon: Sparkles,
    cta: "Visit the member portal",
    href: "/dashboard",
    notice: "No opportunities or announcements have been published yet. We will not invent listings, deadlines or endorsements.",
  },
  contact: {
    label: "WE'D LOVE TO HEAR FROM YOU",
    title: <>Start a<br /><em>conversation.</em></>,
    intro: "Have a general question about the cooperative? Send a note to the NEC Naija team.",
    points: [
      ["General enquiries", "Email hello@necnaija.com for general information and partnership enquiries."],
      ["Member support", "When member support opens, verified members will be able to track their requests securely."],
      ["Keep sensitive details private", "Do not email identity documents, passwords, payment details or confidential financial information."],
    ],
    icon: UsersRound,
    cta: "Email the team",
    href: "mailto:hello@necnaija.com",
    notice: "For member account or support requests, contact hello@necnaija.com. Do not email identity documents, passwords, or payment details.",
  },
  policies: {
    label: "CLEAR TERMS. RESPECTFUL DATA.",
    title: <>Trust is part<br />of the <em>design.</em></>,
    intro: "Membership terms, privacy notices, bylaws and financial policies are being prepared for formal review and approval.",
    points: [
      ["Know what you agree to", "The membership application presents the current terms and privacy notices and records the version you accept."],
      ["Personal data with purpose", "Identity and professional information must be access-controlled, retained appropriately and used only for defined needs."],
      ["Honest financial communication", "Contributions, withdrawals, fees and future regulated services require approved terms and clear risk disclosures."],
    ],
    icon: ShieldCheck,
    cta: "Read the governance approach",
    href: "/governance",
    notice: "Membership terms, privacy notices and financial policies are being prepared for formal approval. Seek independent professional advice for legal questions.",
  },
  governance: {
    label: "HOW THE COOPERATIVE IS RUN",
    title: <>A creative home<br />with <em>clear roots.</em></>,
    intro: "The proposed governance model connects national administration, state chapters, committees and members with recorded decisions and defined authority.",
    points: [
      ["Owners’ Membership Board", "The proposed Board has final authority over cooperative decisions. Members may be consulted on ventures and financial decisions; Board approval is final."],
      ["Ownership proposal", "The proposed ownership value is ₦100 million across 100 units of ₦1 million. The founder is assigned 10%; the remaining proposed 90 units are unclaimed. No ownership purchase is being taken through this site."],
      ["Annual management elections", "Management and state chapter committees are proposed to be elected or rotated annually. The Owners’ Membership Board remains unchanged."],
      ["Transparent stewardship", "At least 70% of declared profits is intended for member distribution, with 30% retained as reserves. Final share calculations and eligibility dates require approved rules."],
    ],
    icon: ShieldCheck,
    cta: "Explore the cooperative",
    href: "/about",
    notice: "This is a proposed platform model, not evidence of legal registration, board appointments or regulatory authorisation.",
  },
  reports: {
    label: "COOPERATIVE TRANSPARENCY",
    title: <>The numbers.<br /><em>In the open.</em></>,
    intro: "Quarterly operational updates and annual financial reports belong to every member. Published reports will show performance, profits, losses, reserves and opportunities.",
    points: [
      ["Quarterly updates", "Operational reporting will be published through the cooperative platform."],
      ["Annual accounts", "Annual reports will cover financial performance, declared profits and losses, reserves and opportunities for the year ahead."],
      ["Member requests", "After an annual report is published, eligible members can request allocated profits with or without their contributions."],
    ],
    icon: ChartNoAxesCombined,
    cta: "View published reports",
    href: "/reports",
    notice: "No cooperative reports have been published yet. Financial summaries appear only after authorised publication.",
  },
} as const;

export type InfoPageKey = keyof typeof pageContent;

export default function InfoPage({
  page,
  annualMembershipFee,
  annualMembershipCompareAt,
  portfolios,
  reports,
  publicEvents,
}: {
  page: InfoPageKey;
  annualMembershipFee?: string;
  annualMembershipCompareAt?: string;
  portfolios?: PublicPortfolio[];
  reports?: {
    id: string;
    report_type: string;
    report_year: number;
    report_quarter: number | null;
    title: string;
    summary: string;
    profits_minor: string | null;
    losses_minor: string | null;
    reserve_minor: string | null;
    opportunities: string | null;
    published_at: string;
  }[];
  publicEvents?: {
    id: string;
    title: string;
    category: string;
    description: string;
    starts_at: string;
    venue: string | null;
    state_name: string | null;
  }[];
}) {
  const content = pageContent[page];
  const Icon = content.icon;

  return (
    <main className="inner-page">
      <div className="announcement"><span className="announcement-dot" /> A new rhythm for the creative community <span className="announcement-divider">/</span> <Link href="/">Get to know us <ArrowUpRight size={12} /></Link></div>
      <SiteHeader />
      <section className="inner-hero">
        <div className="inner-hero-main">
          <span className="section-number">{content.label}</span>
          <h1>{content.title}</h1>
          <p>{content.intro}</p>
          <Link className="button button-gold button-large" href={content.href}>{content.cta}<ArrowUpRight size={16} /></Link>
        </div>
        <div className="inner-emblem"><Icon size={59} strokeWidth={1} /><span>NEC<br />NAIJA</span><i>✳</i></div>
        <Link href="/" className="inner-back"><ArrowLeft size={14} /> Back to the homepage</Link>
      </section>
      <section className="inner-points">
        <div className="inner-points-heading">
          <span className="section-number">HOW WE MAKE IT REAL</span>
          <h2>Made to work<br /><em>for the people.</em></h2>
        </div>
        <div className="inner-points-list">
          {content.points.map(([title, text], index) => (
            <article className="inner-point" key={title}>
              <span>0{index + 1}</span>
              <div><h3>{title}</h3><p>{text}</p></div>
              <BadgeCheck size={18} />
            </article>
          ))}
        </div>
      </section>
      {page === "membership" && annualMembershipFee && (
        <section className="inner-membership-plans">
          <span className="section-number">CHOOSE YOUR MEMBERSHIP</span>
          <div className="inner-membership-plan-grid">
            {[{ name: "Annual", price: annualMembershipFee, interval: "renews yearly" }].map((plan) => (
              <article className="landing-plan-card" key={plan.name}>
                <span>{plan.name.toUpperCase()} MEMBERSHIP</span>
                <div className="membership-price">
                  <b>{plan.price}</b>
                  {annualMembershipCompareAt ? (
                    <span className="membership-was">was <s>{annualMembershipCompareAt}</s></span>
                  ) : null}
                </div>
                <small>{plan.interval} · non-refundable under the proposed terms</small>
                <Link className="button button-dark" href="/login?next=/dashboard">Subscribe <ArrowUpRight size={15} /></Link>
              </article>
            ))}
          </div>
          <p>The annual membership fee is separate from monthly contributions. Full membership requires verified payment and cooperative approval.</p>
        </section>
      )}
      {page === "artists" && <PublicPortfolioGallery portfolios={portfolios ?? []} />}
      {page === "events" && (
        <section className="inner-points">
          <div className="inner-points-heading"><span className="section-number">APPROVED CHAPTER EVENTS</span><h2>Meet us<br /><em>out there.</em></h2></div>
          <div className="inner-points-list">
            {(publicEvents ?? []).length === 0
              ? <p className="inner-notice">No public events are currently listed. Approved chapter events will appear here.</p>
              : publicEvents!.map((event) => (
                <article className="inner-point" key={event.id}>
                  <CalendarDays size={22} />
                  <div><h3>{event.title}</h3><p>{event.category} · {event.state_name ?? "Northern Nigeria"} · {event.venue ?? "Venue to be announced"}</p><p>{event.description}</p><small>{new Date(event.starts_at).toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" })}</small></div>
                  <BadgeCheck size={18} />
                </article>
              ))}
          </div>
        </section>
      )}
      {page === "reports" && (
        <section className="inner-points">
          <div className="inner-points-heading"><span className="section-number">PUBLISHED BY NEC NAIJA</span><h2>Reports &amp;<br /><em>updates.</em></h2></div>
          <div className="inner-points-list">
            {(reports ?? []).length === 0 ? <p className="inner-notice">No quarterly or annual reports have been published yet.</p> : reports!.map((report) => (
              <article className="inner-point report-card" key={report.id}>
                <span>{report.report_type === "annual" ? "ANNUAL" : `Q${report.report_quarter}`}</span>
                <div>
                  <h3>{report.title}</h3>
                  <p>{report.summary}</p>
                  <p>{report.profits_minor !== null ? `Profit: ${formatReportAmount(report.profits_minor)} · ` : ""}{report.losses_minor !== null ? `Loss: ${formatReportAmount(report.losses_minor)} · ` : ""}{report.reserve_minor !== null ? `Reserves: ${formatReportAmount(report.reserve_minor)}` : ""}</p>
                  {report.opportunities && <p>Looking ahead: {report.opportunities}</p>}
                  <small>{report.report_year} · Published {new Date(report.published_at).toLocaleDateString()}</small>
                </div>
                <BadgeCheck size={18} />
              </article>
            ))}
          </div>
        </section>
      )}
      {"notice" in content && content.notice && !(page === "events" && publicEvents?.length) && !(page === "reports" && reports?.length)
        ? <p className="inner-notice"><ShieldCheck size={16} />{content.notice}</p>
        : null}
      <section className="inner-bottom-cta">
        <span className="section-number">BUILT FOR THE ARTISTS SHAPING TOMORROW</span>
        <h2>Stronger together.<br /><em>Growing together.</em></h2>
        <Link className="button button-dark button-large" href="/register">Find your place <ArrowUpRight size={16} /></Link>
      </section>
      <footer className="inner-footer">
        <Link className="brand" href="/"><BrandMark /><span className="brand-name">NEC <i>NAIJA</i></span></Link>
        <span>© 2026 <Link href="/admin" className="admin-plain" aria-label="NEC administration">NEC</Link> NAIJA · A CREATIVE COOPERATIVE FOR NORTHERN NIGERIA · <a href="https://william-lac.vercel.app" className="admin-plain" target="_blank" rel="noopener noreferrer" aria-label="William's portfolio">W I L L I A M</a></span>
        <Link href="/about">About NEC Naija</Link>
      </footer>
    </main>
  );
}

function formatReportAmount(amountMinor: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(amountMinor) / 100);
}
