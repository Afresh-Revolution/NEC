"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Check,
  ChevronDown,
  CirclePlay,
  Compass,
  Disc3,
  Mail,
  Mic2,
  Music2,
  Radio,
  Sparkles,
  UsersRound,
  Video,
  Waves,
} from "lucide-react";
import { useState } from "react";
import SiteHeader from "./site-header";
import BrandMark from "./brand-mark";

const pillars = [
  {
    icon: UsersRound,
    no: "01",
    title: "Your people,\nall in one room.",
    text: "A connected community for the artists, crews and culture-makers building the North's creative future.",
    color: "olive",
  },
  {
    icon: AudioLines,
    no: "02",
    title: "A stronger\nway forward.",
    text: "A member-led cooperative built for shared opportunity, transparent participation and collective progress.",
    color: "clay",
  },
  {
    icon: Compass,
    no: "03",
    title: "More room\nto make.",
    text: "Discover collaborators, chapter happenings and practical opportunities to take your work further.",
    color: "blue",
  },
];

const questions = [
  {
    q: "Who can become a member?",
    a: "NEC Naija welcomes creative professionals across Northern Nigeria. The cooperative reviews each membership application before activation.",
  },
  {
    q: "What does membership cost?",
    a: "",
  },
  {
    q: "Are contributions or returns guaranteed?",
    a: "No. The cooperative does not promise investment returns. Contributions, withdrawals and any future financial services will operate only under approved policies and applicable legal requirements.",
  },
  {
    q: "Can I apply from any state?",
    a: "The cooperative is designed to connect entertainers across Northern Nigeria through local chapters. Chapter availability and current membership eligibility will be confirmed as the platform launches.",
  },
];

function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, y: 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.68, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function StageArtwork() {
  return (
    <div className="stage-art" aria-label="Abstract illustration of a performer under the lights">
      <div className="stage-orbit orbit-one" />
      <div className="stage-orbit orbit-two" />
      <div className="stage-sun" />
      <div className="stage-beam beam-left" />
      <div className="stage-beam beam-right" />
      <div className="stage-figure">
        <div className="figure-head" />
        <div className="figure-hair" />
        <div className="figure-body" />
        <div className="figure-arm" />
        <div className="figure-mic" />
      </div>
      <div className="soundwave soundwave-one"><Waves /></div>
      <div className="soundwave soundwave-two"><AudioLines /></div>
      <span className="art-caption caption-one">MADE OF MANY</span>
      <span className="art-caption caption-two">NORTHERN NIGERIA · 2026</span>
      <div className="art-sticker"><Disc3 size={17} /> CREATIVES<br />IN MOTION</div>
    </div>
  );
}

export default function HomePage({ annualMembershipFee }: { annualMembershipFee: string }) {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);
  const reduceMotion = useReducedMotion();

  return (
    <main>
      <div className="announcement">
        <span className="announcement-dot" />
        A new rhythm for the creative community <span className="announcement-divider">/</span> <a href="#about">Get to know us <ArrowUpRight size={12} /></a>
      </div>
      <SiteHeader />

      <section className="hero" id="top">
        <div className="hero-grain" />
        <div className="hero-copy">
          <motion.div
            className="eyebrow hero-eyebrow"
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.6 }}
          >
            <span className="eyebrow-line" /> THE CREATIVE COOPERATIVE
          </motion.div>
          <motion.h1
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            Your craft.<br />
            <em>Your people.</em><br />
            <span>Your next</span> <b>chapter.</b>
          </motion.h1>
          <motion.p
            className="hero-description"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.7, delay: reduceMotion ? 0 : 0.42 }}
          >
            We bring Northern Nigeria&apos;s entertainers together to connect, create and grow — on their own terms.
          </motion.p>
          <motion.div
            className="hero-actions"
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.55 }}
          >
            <Link href="/register" className="button button-gold button-large">
              Find your place <ArrowUpRight size={17} />
            </Link>
            <a className="text-link hero-watch" href="#about"><CirclePlay size={18} /> Discover NEC Naija</a>
          </motion.div>
          <motion.div
            className="hero-footnote"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, delay: reduceMotion ? 0 : 0.85 }}
          >
            <span className="stacked-avatars" aria-hidden="true"><i>N</i><i>+</i><i>✳</i></span>
            <span>One community. <b>Many voices.</b></span>
          </motion.div>
        </div>
        <motion.div
          className="hero-visual"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.94, rotate: 1.5 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: reduceMotion ? 0 : 1, delay: reduceMotion ? 0 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <StageArtwork />
          <div className="visual-note note-top"><span>01</span> SHARED CULTURE</div>
          <div className="visual-note note-bottom"><span>02</span> COLLECTIVE FUTURE</div>
        </motion.div>
        <a className="scroll-cue" href="#about"><ArrowDown size={15} /> SCROLL TO FEEL THE VIBE</a>
        <span className="hero-index">EST. FOR WHAT&apos;S NEXT <span>✳</span></span>
      </section>

      <div className="ticker" aria-label="Stronger together, growing together">
        <div className="ticker-track">
          {Array.from({ length: 4 }, (_, i) => (
            <span key={i}>STRONGER TOGETHER <i>✳</i> GROWING TOGETHER <i>✳</i> BUILT FOR THE CULTURE <i>✳</i> </span>
          ))}
        </div>
      </div>

      <section className="intro section-pad" id="about">
        <Reveal className="intro-kicker"><span className="section-number">01 / THE IDEA</span></Reveal>
        <Reveal className="intro-content" delay={0.06}>
          <h2>Creativity is<br />better <em>together.</em></h2>
          <div className="intro-aside">
            <p className="intro-lead">The best things happen when the right people find each other.</p>
            <p>NEC Naija is a creative cooperative for the entertainers shaping Northern Nigeria. A place to find your people, get involved and build something bigger than any one of us.</p>
            <a className="text-link dark-link" href="#membership">Meet your cooperative <ArrowRight size={16} /></a>
          </div>
        </Reveal>
        <Reveal className="handwritten-note" delay={0.2}>A collective<br />in the making <span>↗</span></Reveal>
      </section>

      <section className="pillars-section section-pad" id="community">
        <Reveal className="section-heading-row">
          <div>
            <span className="section-number">02 / WHAT WE BELIEVE</span>
            <h2>Made for the<br /><em>ones who make.</em></h2>
          </div>
          <p>More than a directory. A community with shared purpose, practical connections and room for every kind of creative.</p>
        </Reveal>
        <div className="pillar-grid">
          {pillars.map(({ icon: Icon, no, title, text, color }, index) => (
            <Reveal key={no} className={`pillar-card ${color}`} delay={index * 0.1}>
              <span className="pillar-no">{no} / 03</span>
              <div className="pillar-icon"><Icon size={22} strokeWidth={1.5} /></div>
              <h3>{title.split("\n").map((line, i) => <span key={i}>{line}<br /></span>)}</h3>
              <p>{text}</p>
              <span className="pillar-arrow"><ArrowUpRight size={18} /></span>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="manifesto">
        <div className="manifesto-decoration">N</div>
        <Reveal className="manifesto-inner">
          <span className="section-number">A NOTE TO THE CULTURE-MAKERS</span>
          <p>“Your talent got you here.<br />Your <em>community</em> can take you further.”</p>
          <span className="manifesto-signoff">— THE NEC NAIJA SPIRIT <span>✳</span></span>
        </Reveal>
      </section>

      <section className="membership section-pad" id="membership">
        <Reveal className="membership-art">
          <div className="membership-art-bg">
            <div className="card-orbit" />
            <div className="member-card-visual">
              <div className="card-top"><BrandMark small /><span>CREATIVE COOPERATIVE</span></div>
              <div className="card-watermark">N</div>
              <div className="card-name">YOUR NAME<br /><span>ARTIST · YOUR CHAPTER</span></div>
              <div className="card-bottom"><span>MEMBER IDENTITY</span><span className="fake-qr" aria-hidden="true"><i /><i /><i /><i /></span></div>
            </div>
            <span className="art-stamp">YOUR<br />PEOPLE<br /><b>✳</b></span>
            <span className="membership-caption">A PLACE TO BELONG. A REASON TO BUILD.</span>
          </div>
        </Reveal>
        <Reveal className="membership-copy" delay={0.12}>
          <span className="section-number">03 / COME AS YOU ARE</span>
          <h2>There&apos;s a seat<br />with <em>your name</em><br />on it.</h2>
          <p>Membership starts with your story. Tell us what you do, where you&apos;re from and what you want to create next.</p>
          <ul className="benefit-list">
            <li><Check size={15} /> Meet creatives across chapters and disciplines</li>
            <li><Check size={15} /> Find events, opportunities and collaborators</li>
            <li><Check size={15} /> Take part in a member-led cooperative</li>
          </ul>
          <div className="landing-plan-grid">
            <article className="landing-plan-card">
                <span>ANNUAL MEMBERSHIP FEE</span>
                <b>{annualMembershipFee}</b>
                <small>Renews annually · non-refundable under the proposed terms</small>
                <Link className="button button-dark" href="/login?next=/dashboard">Subscribe <ArrowUpRight size={15} /></Link>
            </article>
          </div>
          <p className="fine-print">The annual membership fee is separate from ₦10,000 monthly cooperative contributions. Membership requires cooperative review.</p>
        </Reveal>
      </section>

      <section className="creative-section section-pad" id="artists">
        <Reveal className="section-heading-row">
          <div>
            <span className="section-number">04 / YOUR CREATIVE CIRCLE</span>
            <h2>Every sound.<br /><em>Every vision.</em></h2>
          </div>
          <div className="creative-intro">
            <p>From the first note to the final cut, there&apos;s a place for what you do — and who you want to do it with.</p>
            <Link className="text-link dark-link" href="/register">Find your creative circle <ArrowRight size={16} /></Link>
          </div>
        </Reveal>
        <div className="discipline-grid">
          {[
            { icon: Mic2, label: "MUSIC & SOUND", sub: "Artists · Producers · DJs", tone: "discipline-amber" },
            { icon: Video, label: "FILM & SCREEN", sub: "Actors · Directors · Crew", tone: "discipline-blue" },
            { icon: Sparkles, label: "LIVE & PERFORMANCE", sub: "Hosts · Dancers · Theatre", tone: "discipline-lilac" },
            { icon: Music2, label: "CULTURE & CRAFT", sub: "Designers · Creators · More", tone: "discipline-green" },
          ].map(({ icon: Icon, label, sub, tone }, i) => (
            <Reveal key={label} className={`discipline-card ${tone}`} delay={i * 0.06}>
              <div className="discipline-shape"><Icon size={31} strokeWidth={1.25} /></div>
              <span>{label}</span><small>{sub}</small>
              <ArrowUpRight className="discipline-link" size={17} />
            </Reveal>
          ))}
        </div>
        <p className="preview-disclaimer">A community for every discipline. Member profiles and directory listings appear as the cooperative grows.</p>
      </section>

      <section className="events-section section-pad" id="events">
        <div className="events-panel">
          <Reveal className="events-copy">
            <span className="section-number">05 / OUT IN THE WORLD</span>
            <h2>Good things<br />happen <em>in person.</em></h2>
            <p>From chapter meetups to creative showcases, the next connection might be just around the corner.</p>
            <Link className="button button-gold button-large" href="/events">Explore the event space <ArrowUpRight size={16} /></Link>
            <span className="events-note"><CalendarDays size={16} /> Approved public events will be listed here.</span>
          </Reveal>
          <Reveal className="event-art" delay={0.15}>
            <div className="event-ring ring-a" /><div className="event-ring ring-b" />
            <div className="event-sun" />
            <div className="event-spotlight" />
            <div className="event-type">
              <span>THE SCENE IS</span>
              <b>BETTER<br />TOGETHER</b>
              <i>NEC NAIJA · LIVE & LOCAL</i>
            </div>
            <div className="event-floating event-float-one"><Radio size={17} /> COMMUNITY FIRST</div>
            <div className="event-floating event-float-two">MADE TO MEET <span>✳</span></div>
          </Reveal>
        </div>
      </section>

      <section className="opportunities-section section-pad" id="opportunities">
        <Reveal className="opportunities-heading">
          <span className="section-number">06 / WHAT&apos;S NEXT</span>
          <h2>Room for<br /><em>new possibilities.</em></h2>
          <p>Chapter notices, creative opportunities and cooperative announcements will live here when they are ready to share.</p>
          <Link className="text-link dark-link" href="/opportunities">Visit the opportunities board <ArrowRight size={16} /></Link>
        </Reveal>
        <Reveal className="opportunities-empty" delay={0.1}>
          <div className="opportunity-symbol"><Sparkles size={28} strokeWidth={1.2} /></div>
          <span>THE BOARD IS TAKING SHAPE</span>
          <p>No announcements have been published yet. Only verified opportunities and approved notices will appear here.</p>
          <Link href="/opportunities">Explore the board <ArrowUpRight size={15} /></Link>
        </Reveal>
      </section>

      <section className="chapters-section section-pad" id="chapters">
        <Reveal className="chapter-heading">
          <span className="section-number">07 / ROOTED IN YOUR COMMUNITY</span>
          <h2>Local in spirit.<br /><em>Connected by culture.</em></h2>
          <p>Chapters bring the cooperative closer to home, creating space for local voices, local ideas and local momentum.</p>
        </Reveal>
        <Reveal className="chapter-map" delay={0.1}>
          <div className="map-lines" />
          <div className="map-silhouette"><span>NORTHERN<br />NIGERIA</span></div>
          <span className="map-point point-kano"><i />KANO</span>
          <span className="map-point point-kaduna"><i />KADUNA</span>
          <span className="map-point point-jos"><i />JOS</span>
          <span className="map-point point-sokoto"><i />SOKOTO</span>
          <span className="map-point point-yola"><i />YOLA</span>
          <div className="map-callout"><span>OUR COMMUNITY</span><b>North, by nature.</b><small>Chapter information will be shared as local teams come online.</small><Link href="/chapters">Discover chapters <ArrowRight size={14} /></Link></div>
          <span className="map-legend"><i /> CHAPTER NETWORK</span>
        </Reveal>
      </section>

      <section className="faq-section section-pad" id="faq">
        <Reveal className="faq-heading">
          <span className="section-number">08 / GOOD TO KNOW</span>
          <h2>A few things<br /><em>you might wonder.</em></h2>
          <p>Clear answers. No fine-print surprises.</p>
        </Reveal>
        <div className="faq-list">
          {questions.map(({ q, a }, index) => (
            <Reveal key={q} className={`faq-item ${activeFaq === index ? "faq-active" : ""}`} delay={index * 0.04}>
              <button type="button" onClick={() => setActiveFaq(activeFaq === index ? null : index)} aria-expanded={activeFaq === index}>
                <span className="faq-count">0{index + 1}</span><span>{q}</span><ChevronDown size={18} />
              </button>
              <div className="faq-answer"><p>{q === "What does membership cost?"
                ? `The annual membership fee is ${annualMembershipFee}, separate from monthly cooperative contributions. Fees are subject to approved membership terms.`
                : a}</p></div>
            </Reveal>
          ))}
          <Link href="/#faq" className="text-link dark-link faq-more">More about how we work <ArrowRight size={16} /></Link>
        </div>
      </section>

      <section className="final-cta">
        <div className="final-cta-pattern" />
        <Reveal className="final-cta-inner">
          <span className="section-number">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>Come make<br />some <em>noise.</em></h2>
          <p>Bring your talent, your ideas, your whole self. There&apos;s room for you here.</p>
          <Link className="button button-gold button-large" href="/register">Find your place <ArrowUpRight size={16} /></Link>
          <span className="final-spark">✳</span>
        </Reveal>
      </section>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand-col">
            <Link className="brand footer-brand" href="/">
              <BrandMark />
              <span className="brand-name">NEC <i>NAIJA</i></span>
            </Link>
            <p>Stronger together.<br />Growing together.</p>
            <span className="footer-location">A creative cooperative for Northern Nigeria.</span>
          </div>
          <div className="footer-links">
            <div><span className="footer-label">EXPLORE</span><Link href="/about">About NEC</Link><Link href="/membership">Membership</Link><Link href="/artists">Artists</Link><Link href="/events">Events</Link><Link href="/opportunities">Opportunities</Link></div>
            <div><span className="footer-label">COMMUNITY</span><Link href="/chapters">Chapters</Link><Link href="/dashboard">Member portal</Link><Link href="/admin">Administration</Link><a href="/#faq">FAQs</a></div>
            <div><span className="footer-label">GET IN TOUCH</span><a href="mailto:hello@necnaija.com">hello@necnaija.com</a><Link href="/contact">Contact & support</Link><Link href="/policies">Privacy & policies</Link><Link href="/governance">Governance</Link></div>
          </div>
          <div className="footer-social"><a href="mailto:hello@necnaija.com" aria-label="Email NEC Naija"><Mail size={17} /></a></div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 <Link href="/admin" aria-label="NEC administration" style={{ color: "inherit" }}>NEC</Link> NAIJA · MADE WITH THE COMMUNITY</span>
          <span>NO GUARANTEED RETURNS. ALWAYS MEMBER-LED. <b>✳</b></span>
          <a href="#top">BACK TO TOP ↑</a>
        </div>
      </footer>
    </main>
  );
}
