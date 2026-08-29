"use client";

import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowRight, CalendarDays, ChevronDown, Menu, Play, Shield, X, LogIn, Megaphone, Users, Clock, MapPin } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

const RECRUITMENT_CHANNEL = "https://discord.com/channels/1426271681969655913/1532347499212177438";

type Announcement = { id: string; title: string; body: string; published?: boolean; createdAt?: string };
type CalendarItem = { id: string; title: string; date: string; time?: string; location?: string; description?: string; status?: string };
type LeadershipEntry = { id: string; title: string; name: string; division?: string; rank?: string; description?: string; active?: boolean; order?: number };
type DivisionEntry = { id: string; code: string; name: string; description: string; status: "active" | "inactive" | "temporary"; leadership?: string; logoUrl?: string; order?: number };

const fallbackDivisions = [
  ["HLS", "Homeland Security", "Homeland security and protective operations."],
  ["SS", "Secret Service", "Special security and executive protection."],
  ["USMC", "Marine Corps", "United States Marine Corps roleplay division."],
  ["NAVY", "United States Navy", "Temporarily disbanded."],
  ["SOCOM", "Special Operations", "Special Operations Command."],
  ["MED", "Medical", "Medical and emergency services."],
  ["DOJ", "Justice", "Department of Justice."],
  ["MP", "Military Police", "Military Police."],
] as const;

const fallbackCommand = [
  { title: "Senior Leadership", description: "The senior staff leadership structure, beginning with the General Manager and divisional leadership.", items: ["General Manager", "Head of Community Affairs", "Head of Development", "Head of Divisional Operations", "Head of Administrative Operations", "Divisional Heads"] },
  { title: "Staff Leadership", description: "The management chain, beginning with the Head of Management and continuing through staff roles.", items: ["Head of Management", "Management", "Administration", "Moderation", "Intern"] },
  { title: "Roleplay Leadership", description: "The established roleplay chain of command from President through the cabinet and senior roleplay offices.", items: ["President", "Vice President", "Speaker of the House", "President Pro Tempore", "Secretary of Defense", "Secretary of Homeland Security", "Attorney General"] },
];

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <motion.div initial={{ opacity: 0, y: 55 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}>{children}</motion.div>;
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date);
}

export default function HomePage() {
  const [open, setOpen] = useState<number | null>(0);
  const [mobile, setMobile] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [calendar, setCalendar] = useState<CalendarItem[]>([]);
  const [leadership, setLeadership] = useState<LeadershipEntry[]>([]);
  const [divisions, setDivisions] = useState<DivisionEntry[]>([]);
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 70, damping: 22, mass: 0.25 });
  const heroY = useTransform(smooth, [0, 0.32], [0, -95]);
  const heroScale = useTransform(smooth, [0, 0.3], [1.06, 1.18]);
  const heroOpacity = useTransform(smooth, [0, 0.22], [1, 0.35]);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      document.documentElement.style.setProperty("--pointer-x", ((event.clientX / window.innerWidth) - 0.5).toFixed(3));
      document.documentElement.style.setProperty("--pointer-y", ((event.clientY / window.innerHeight) - 0.5).toFixed(3));
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const get = async <T,>(url: string): Promise<T | null> => {
        try { const r = await fetch(url, { cache: "no-store" }); return r.ok ? await r.json() : null; } catch { return null; }
      };
      const [a, c, l, d] = await Promise.all([
        get<Announcement[]>("/api/announcements"),
        get<CalendarItem[]>("/api/calendar"),
        get<LeadershipEntry[]>("/api/leadership"),
        get<DivisionEntry[]>("/api/divisions"),
      ]);
      if (cancelled) return;
      if (a) setAnnouncements(a.filter(x => x.published !== false));
      if (c) setCalendar(c.filter(x => x.status !== "draft").sort((x, y) => `${x.date} ${x.time || ""}`.localeCompare(`${y.date} ${y.time || ""}`)));
      if (l) setLeadership(l.filter(x => x.active !== false).sort((x, y) => (x.order || 0) - (y.order || 0)));
      if (d) setDivisions(d.sort((x, y) => (x.order || 0) - (y.order || 0)));
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const displayedDivisions = divisions.length ? divisions : fallbackDivisions.map(([code, name, description], i) => ({ id: code, code, name, description, status: code === "NAVY" ? "temporary" : "active", order: i } as DivisionEntry));
  const commandGroups = leadership.length ? [{ title: "Current Leadership", description: "Current active leadership published by staff.", items: leadership.map(x => x.rank ? `${x.rank} — ${x.title}: ${x.name}` : `${x.title}: ${x.name}`) }] : fallbackCommand;

  return (
    <main className="site-shell">
      <div className="site-progress" />
      <div className="ambient-lines" aria-hidden="true"><i /><i /><i /><i /></div>
      <nav className="site-nav">
        <a href="#top" className="brand-mark"><span className="brand-dot" /> FBMRP</a>
        <div className={`nav-links ${mobile ? "mobile-open" : ""}`}>
          <a href="#announcements" onClick={() => setMobile(false)}>NEWS</a>
          <a href="#calendar" onClick={() => setMobile(false)}>CALENDAR</a>
          <a href="#command" onClick={() => setMobile(false)}>COMMAND</a>
          <a href="#divisions" onClick={() => setMobile(false)}>DIVISIONS</a>
          <a href="#media" onClick={() => setMobile(false)}>MEDIA</a>
          <a href="#recruitment" onClick={() => setMobile(false)}>RECRUITMENT</a>
        </div>
        <a href="/api/auth/signin/discord" className="nav-action"><LogIn size={13} /> STAFF LOGIN <ArrowRight size={12} /></a>
        <button className="mobile-menu" onClick={() => setMobile(!mobile)} aria-label="Menu">{mobile ? <X /> : <Menu />}</button>
      </nav>

      <section id="top" className="hero-section">
        <motion.div className="hero-grid" style={{ y: heroY, scale: heroScale }} />
        <div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <div className="hero-crosshair"><span /><span /></div><div className="hero-rule hero-rule-a" /><div className="hero-rule hero-rule-b" />
        <motion.div className="hero-copy" style={{ opacity: heroOpacity }}>
          <div className="eyebrow"><span /> FORT BLISS MILITARY ROLEPLAY <b>EST. FBMRP</b></div>
          <h1><span className="hero-line"><span className="hero-word hero-word-1">BUILT</span></span><span className="hero-line"><span className="hero-word hero-word-2 hero-outline">TO SERVE</span></span></h1>
          <div className="hero-meta"><span>STRUCTURE</span><span>DISCIPLINE</span><span>IMMERSION</span><span>COMMUNITY</span></div>
          <p className="hero-description">A structured military roleplay community built around organization, progression, leadership, and immersive operations.</p>
          <div className="hero-actions"><a className="button button-primary" href="#announcements">VIEW UPDATES <ArrowDown size={13} /></a><a className="button button-ghost" href="/api/auth/signin/discord"><LogIn size={12} /> STAFF LOGIN</a></div>
        </motion.div>
        <motion.div className="hero-card-wrap" style={{ opacity: heroOpacity }}><div className="hero-card-shadow" /><div className="hero-card"><div className="card-topbar"><span><i className="status-dot" /> LIVE SYSTEM</span><span>FBMRP / 01</span></div><div className="card-symbol"><Shield size={28} /></div><div className="card-big-number">01</div><div className="card-axis card-axis-x" /><div className="card-axis card-axis-y" /><div className="card-scanline" /><div className="card-corner card-corner-tl" /><div className="card-corner card-corner-br" /><div className="card-caption"><span>FORT BLISS</span><strong>MILITARY ROLEPLAY</strong><span>COMMAND // COMMUNITY // OPERATIONS</span></div></div></motion.div>
        <div className="scroll-cue"><ArrowDown size={13} /> SCROLL TO ENTER</div>
      </section>

      <div className="ticker"><div><span>FORT BLISS MILITARY ROLEPLAY</span><i>LIVE UPDATES</i><span>FBMRP</span><i>CALENDAR</i><span>COMMAND • DIVISIONS • OPERATIONS</span><i>JOIN THE RANKS</i></div></div>

      <section className="section-pad" id="announcements">
        <Reveal><div className="section-label">01 / ANNOUNCEMENTS</div><div className="section-heading-row"><div><h2>What’s<br /><span>happening.</span></h2><p className="text-textdim max-w-2xl mt-4">Official announcements published by staff appear here automatically. Published announcements can also be sent to the configured Discord announcements channel.</p></div><div className="heading-index"><Megaphone className="heading-icon" /> LIVE FEED</div></div></Reveal>
        <div className="command-grid mt-10">{announcements.length ? announcements.map((a, i) => <Reveal key={a.id} delay={i * 0.04}><article className="command-row"><div className="command-button"><div className="command-title"><span>{String(i + 1).padStart(2, "0")}</span><strong>{a.title}</strong></div><span className="text-[9px] font-mono text-textfaint uppercase">{a.createdAt ? formatDate(a.createdAt.slice(0, 10)) : "OFFICIAL"}</span></div><div className="command-body-wrap" style={{ height: "auto", opacity: 1 }}><div className="command-body"><div className="role role-description">{a.body}</div></div></div></article></Reveal>) : <div className="border border-dashed border-border rounded-xl p-12 text-center text-textfaint text-sm">No published announcements yet.</div>}</div>
      </section>

      <section className="section-pad" id="calendar">
        <Reveal><div className="section-label">02 / CALENDAR</div><div className="section-heading-row"><div><h2>Mission<br /><span>schedule.</span></h2><p className="text-textdim max-w-2xl mt-4">Upcoming events, operations, trainings and community activities published through Staff Management.</p></div><div className="heading-index"><CalendarDays className="heading-icon" /> UPCOMING</div></div></Reveal>
        <div className="division-grid mt-10">{calendar.length ? calendar.map((event, i) => <Reveal key={event.id} delay={i * 0.04}><article className="division-card"><div className="division-top"><span>{formatDate(event.date)}</span><span>{event.status === "published" ? "CONFIRMED" : "SCHEDULED"}</span></div><div className="division-logo-placeholder"><CalendarDays size={24} /></div><h3>{event.title}</h3><p>{event.description || "Community event / operation."}</p><div className="division-head"><span className="flex items-center gap-2"><Clock size={12} /> {event.time || "TBA"}</span>{event.location && <span className="flex items-center gap-2"><MapPin size={12} /> {event.location}</span>}</div></article></Reveal>) : <div className="border border-dashed border-border rounded-xl p-12 text-center text-textfaint text-sm md:col-span-2">No upcoming events have been published.</div>}</div>
      </section>

      <section className="statement-section section-pad" id="about"><Reveal><div className="eyebrow"><span /> 03 / THE COMMUNITY</div><div className="statement-grid"><h2>More than a server.<br /><em>A structured world.</em></h2><div className="statement-side"><p>FBMRP brings together military roleplay, leadership, divisions, staff operations, announcements, scheduling, and community progression in one organized experience.</p></div></div><div className="mini-stats"><div><strong>{String(displayedDivisions.length).padStart(2, "0")}</strong><span>Divisions</span></div><div><strong>{String(commandGroups.length).padStart(2, "0")}</strong><span>Command paths</span></div><div><strong>{String(announcements.length).padStart(2, "0")}</strong><span>Live updates</span></div></div></Reveal></section>

      <section className="section-pad" id="command"><Reveal><div className="section-heading-row"><div><div className="section-label">04 / CHAIN OF COMMAND</div><h2>Leadership<br /><span>DROP-DOWN.</span></h2></div><div className="heading-index">FBMRP / COC <ChevronDown className="heading-icon" /></div></div></Reveal><div className="command-feature"><div className="feature-number">COC<br />SYS</div><div className="feature-main"><div className="feature-kicker"><Users size={12} /> ORGANIZED LEADERSHIP</div><h3>Every level has a place.</h3><p>Leadership records published by staff are shown to members automatically.</p></div><div className="feature-side"><span>STRUCTURE</span><strong>{leadership.length ? "LIVE LEADERSHIP" : "DEFAULT STRUCTURE"}</strong><span>STAFF / MANAGEMENT / ROLEPLAY</span></div></div><div className="command-grid">{commandGroups.map((group, index) => <div className="command-row" key={group.title}><button className="command-button" onClick={() => setOpen(open === index ? null : index)} aria-expanded={open === index}><div className="command-title"><span>0{index + 1}</span><strong>{group.title}</strong></div><div className="command-open">{open === index ? "CLOSE" : "OPEN"} <ChevronDown size={15} style={{ transform: open === index ? "rotate(180deg)" : "none" }} /></div></button><motion.div initial={false} animate={{ height: open === index ? "auto" : 0, opacity: open === index ? 1 : 0 }} className="command-body-wrap"><div className="command-body"><div className="role role-description">{group.description}</div>{group.items.map(item => <div className="role" key={item}>{item}</div>)}</div></motion.div></div>)}</div></section>

      <section className="section-pad division-section" id="divisions"><Reveal><div className="section-label">05 / DIVISIONS</div><div className="division-head"><h2>Choose your<br /><span>path.</span></h2><p>Divisional identities, descriptions, logos, status, leadership, and every detail published in Staff Management are displayed here.</p></div></Reveal><div className="division-grid">{displayedDivisions.map((division, i) => <Reveal key={division.id} delay={i * 0.04}><article className="division-card"><div className="division-top"><span>DIV / {String(i + 1).padStart(2, "0")}</span><span>{division.status === "temporary" ? "TEMP" : division.status.toUpperCase()}</span></div><div className="division-logo-placeholder">{division.logoUrl ? <img src={division.logoUrl} alt="" className="w-12 h-12 object-contain" /> : <Shield size={24} />}</div><h3>{division.name}</h3><p>{division.description}</p><div className="division-head"><span>{division.code}</span>{division.leadership && <span>{division.leadership}</span>}</div></article></Reveal>)}</div></section>

      <section className="section-pad media-section" id="media"><Reveal><div className="section-label">06 / MEDIA</div><div className="media-intro"><h2>Put the<br /><em>mission</em> in motion.</h2><p>Homepage video, division media, announcements, calendar content, logos, and visual assets can be replaced from the editable website system.</p></div><div className="media-frame"><div className="media-frame-inner"><Play size={32} /><span>HOMEPAGE VIDEO / ADD YOUR FOOTAGE</span></div></div></Reveal></section>

      <section className="cta-section section-pad" id="recruitment"><Reveal><div className="eyebrow"><span /> 07 / RECRUITMENT</div><h2>Find your<br /><span>place.</span></h2><p>Ready to join Fort Bliss Military Roleplay? Recruitment is handled directly through our Discord recruitment channel.</p><a className="button button-primary" href={RECRUITMENT_CHANNEL} target="_blank" rel="noreferrer">OPEN RECRUITMENT <ArrowRight size={14} /></a></Reveal></section>
      <footer className="site-footer"><span>© FBMRP</span><span>FORT BLISS MILITARY ROLEPLAY</span><span>BUILT FOR IMMERSION</span></footer>
    </main>
  );
}
