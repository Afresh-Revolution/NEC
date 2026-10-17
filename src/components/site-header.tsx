"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import BrandMark from "./brand-mark";

const links = [
  ["About", "/about"],
  ["Membership", "/membership"],
  ["Artists", "/artists"],
  ["Events", "/events"],
  ["Chapters", "/chapters"],
  ["Reports", "/reports"],
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="NEC Naija home" onClick={() => setOpen(false)}>
        <BrandMark />
        <span className="brand-name">NEC <i>NAIJA</i></span>
      </Link>
      <nav className={`main-nav ${open ? "is-open" : ""}`} aria-label="Main navigation">
        {links.map(([label, href]) => (
          <a key={label} href={href} onClick={() => setOpen(false)}>{label}</a>
        ))}
        <div className="mobile-nav-actions">
          <Link className="nav-login" href="/dashboard">Member portal <ArrowUpRight size={15} /></Link>
          <Link className="button button-gold nav-join" href="/register">Become a member <ArrowUpRight size={15} /></Link>
        </div>
      </nav>
      <div className="header-actions">
        <Link className="nav-login" href="/dashboard">Member portal <ArrowUpRight size={15} /></Link>
        <Link className="button button-gold nav-join" href="/register">Join NEC <ArrowUpRight size={15} /></Link>
      </div>
      <button
        className="menu-toggle"
        type="button"
        aria-label={open ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>
    </header>
  );
}
