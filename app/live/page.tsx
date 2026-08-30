"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Clock3, ExternalLink, LogIn, Megaphone, Play, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";

const recruitment = "https://discord.com/channels/1426271681969655913/1532347499212177438";

type AnyRecord = Record<string, any>;
type Content = { divisions?: AnyRecord[]; leadership?: AnyRecord[]; announcements?: AnyRecord[]; calendar?: AnyRecord[]; media?: AnyRecord[] };

const fadeUp = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.15 } };

export default function LiveHome() {
  const [content, setContent] = useState<Content>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/content", { cache: "no-store" });
        if (response.ok && !cancelled) setContent(await response.json());
      } catch {}
    };
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const divisions = useMemo(() => (content.divisions || []).filter(x => x.status !== "inactive"), [content]);
  const leaders = useMemo(() => (content.leadership || []).filter(x => x.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0)).slice(0, 8), [content]);
  const announcements = useMemo(() => (content.announcements || []).filter(x => x.published).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 6), [content]);
  const events = useMemo(() => (content.calendar || []).filter(x => x.status !== "draft").sort((a, b) => `${a.date || ""}${a.time || ""}`.localeCompare(`${b.date || ""}${b.time || ""}`)).slice(0, 6), [content]);
  const media = useMemo(() => (content.media || []).slice(0, 6), [content]);

  return (
    <main className="site-shell bg-bg text-white">
      <nav className="site-nav sticky top-0 z-50 backdrop-blur-xl bg-bg/85 border-b border-border/70 px-5 sm:px-10">
        <a href="#top" className="brand-mark"><span className="brand-dot" /> FBMRP</a>
        <div className="nav-links hidden md:flex">
          <a href="#announcements">NEWS</a><a href="#command">COMMAND</a><a href="#divisions">DIVISIONS</a><a href="#calendar">OPERATIONS</a><a href="#media">MEDIA</a>
        </div>
        <div className="flex items-center gap-2">
          <a href="/member" className="nav-action hidden sm:inline-flex"><Users size={12} /> MEMBER DASHBOARD</a>
          <a href="/staff" className="nav-action"><LogIn size={12} /> STAFF PANEL <ArrowRight size={11} /></a>
        </div>
      </nav>

      <section id="top" className="hero-section relative overflow-hidden">
        <div className="hero-grid" /><div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <motion.div className="hero-copy" {...fadeUp} transition={{ duration: .7 }}>
          <div className="eyebrow"><span /> FORT BLISS MILITARY ROLEPLAY <b>LIVE CMS</b></div>
          <h1><span className="hero-line"><span className="hero-word hero-word-1">BUILT</span></span><span className="hero-line"><span className="hero-word hero-word-2 hero-outline">TO SERVE</span></span></h1>
          <div className="hero-meta"><span>STRUCTURE</span><span>DISCIPLINE</span><span>IMMERSION</span><span>COMMUNITY</span></div>
          <p className="hero-description">A structured military roleplay community built around organization, progression, leadership and immersive operations.</p>
          <div className="hero-actions flex flex-wrap gap-3">
            <a className="button button-primary" href="/member">MEMBER DASHBOARD <ArrowRight size={13} /></a>
            <a className="button button-ghost" href="/staff">STAFF PANEL <LogIn size={12} /></a>
            <a className="button button-ghost" href={recruitment} target="_blank" rel="noreferrer">RECRUITMENT <ExternalLink size={12} /></a>
          </div>
        </motion.div>
        <motion.div className="hero-card-wrap" {...fadeUp} transition={{ duration: .8, delay: .15 }}>
          <div className="hero-card-shadow" /><div className="hero-card">
            <div className="card-topbar"><span><i className="status-dot" /> LIVE SYSTEM</span><span>{String(divisions.length).padStart(2, "0")} DIVISIONS</span></div>
            <div className="card-symbol"><Shield size={28} /></div><div className="card-big-number">01</div>
            <div className="card-caption"><span>FORT BLISS</span><strong>MILITARY ROLEPLAY</strong><span>COMMAND // COMMUNITY // OPERATIONS</span></div>
          </div>
        </motion.div>
      </section>

      <section id="announcements" className="section-pad">
        <motion.div {...fadeUp} className="section-heading-row mb-10"><div><div className="section-label">01 / INTELLIGENCE FEED</div><h2>Official<br/><span>updates.</span></h2><p className="text-textdim max-w-2xl mt-4">Announcements published by authorized staff appear here automatically. Each update is presented as a dedicated briefing card rather than raw text.</p></div><div className="heading-index"><Megaphone className="heading-icon"/> LIVE FEED</div></motion.div>
        {announcements.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{announcements.map((a, i) => <motion.article {...fadeUp} transition={{ duration: .45, delay: i * .04 }} key={a.id} className="group relative overflow-hidden rounded-2xl border border-border bg-panel/90 p-6 min-h-[220px] shadow-2xl shadow-black/10"><div className="absolute left-0 top-0 h-1 w-full bg-gold/70"/><div className="flex items-center justify-between gap-3 mb-6"><span className="font-mono text-[9px] tracking-[2px] text-golddim">UPDATE {String(i + 1).padStart(2, "0")}</span><span className="rounded-full border border-border px-2.5 py-1 font-mono text-[8px] text-textfaint">PUBLISHED</span></div><h3 className="font-serif text-2xl font-bold leading-tight">{a.title}</h3><p className="mt-4 text-sm leading-7 text-textdim whitespace-pre-wrap">{a.body}</p><div className="mt-6 pt-4 border-t border-border flex items-center justify-between font-mono text-[8px] uppercase text-textfaint"><span>FBMRP COMMAND</span><span>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "OFFICIAL"}</span></div></motion.article>)}</div> : <EmptyCard icon={<Megaphone size={25}/>} title="No published announcements" text="New staff announcements will appear here automatically."/>}
      </section>

      <section id="command" className="section-pad bg-panel/20">
        <div className="section-label">02 / CHAIN OF COMMAND</div><div className="section-heading-row mb-10"><div><h2>Leadership<br/><span>in command.</span></h2><p className="text-textdim max-w-2xl mt-4">Current leadership is pulled from Staff Management and displayed as structured command profiles.</p></div><div className="heading-index"><Users className="heading-icon"/> AUTHORIZED</div></div>
        {leaders.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">{leaders.map((leader, i) => <article key={leader.id || i} className="rounded-2xl border border-border bg-panel p-5 relative overflow-hidden"><div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-gold/5 blur-2xl"/><div className="font-mono text-[9px] text-golddim">{String(i + 1).padStart(2, "0")} / COMMAND</div><div className="mt-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-bg"><Shield size={20}/></div><h3 className="font-serif text-xl font-bold mt-4">{leader.name || "Unassigned"}</h3><p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-golddim">{leader.rank || leader.title || "Leadership"}</p>{leader.title && leader.rank && <p className="mt-4 text-sm text-textdim">{leader.title}</p>}</article>)}</div> : <EmptyCard icon={<Users size={25}/>} title="Leadership roster unavailable" text="Authorized staff can publish command information from the Staff Panel."/>}
      </section>

      <section id="divisions" className="section-pad division-section">
        <div className="section-label">03 / ORGANIZATION</div><div className="division-head mb-10"><div><h2>Choose your<br/><span>division.</span></h2></div><p>Explore the active organizations currently published by Staff Management.</p></div>
        {divisions.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{divisions.map((d, i) => <article key={d.id || d.code} className="division-card group"><div className="division-top"><span>DIV / {String(i + 1).padStart(2, "0")}</span><span className="text-golddim">{String(d.status || "ACTIVE").toUpperCase()}</span></div><div className="my-7 h-16 w-16 rounded-2xl border border-border bg-bg flex items-center justify-center overflow-hidden">{d.logoUrl ? <img src={d.logoUrl} alt="" className="h-full w-full object-cover"/> : <Shield size={25}/>}</div><h3>{d.name}</h3><p className="min-h-[56px]">{d.description || "Official FBMRP division."}</p><div className="mt-6 pt-4 border-t border-border flex items-center justify-between font-mono text-[9px] text-golddim"><span>{d.code || "DIVISION"}</span><ArrowRight size={13} className="group-hover:translate-x-1 transition-transform"/></div></article>)}</div> : <EmptyCard icon={<Shield size={25}/>} title="No divisions published" text="Active divisions will appear here once published by staff."/>}
      </section>

      <section id="calendar" className="section-pad bg-panel/20">
        <div className="section-label">04 / OPERATIONS CALENDAR</div><div className="section-heading-row mb-10"><div><h2>Upcoming<br/><span>operations.</span></h2><p className="text-textdim max-w-2xl mt-4">Training, operations and community events published through the Staff Panel.</p></div><div className="heading-index"><CalendarDays className="heading-icon"/> SCHEDULED</div></div>
        {events.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{events.map((e, i) => <article key={e.id} className="rounded-2xl border border-border bg-panel p-6"><div className="flex items-start justify-between gap-4"><div className="h-12 w-12 rounded-xl border border-border bg-bg flex items-center justify-center text-golddim"><CalendarDays size={20}/></div><span className="font-mono text-[9px] text-golddim border border-border rounded-full px-3 py-1">OP {String(i + 1).padStart(2, "0")}</span></div><h3 className="font-serif text-xl font-bold mt-6">{e.title}</h3><div className="mt-4 space-y-2 font-mono text-[9px] uppercase text-textfaint"><div className="flex gap-2"><CalendarDays size={12} className="text-golddim"/>{e.date || "Date TBA"}</div><div className="flex gap-2"><Clock3 size={12} className="text-golddim"/>{e.time || "Time TBA"}</div><div className="flex gap-2"><Shield size={12} className="text-golddim"/>{e.location || "Location TBA"}</div></div><p className="mt-5 text-sm leading-6 text-textdim">{e.description || "Official community operation."}</p></article>)}</div> : <EmptyCard icon={<CalendarDays size={25}/>} title="No upcoming operations" text="Published events will appear here automatically."/>}
      </section>

      <section id="media" className="section-pad">
        <div className="section-label">05 / MEDIA ARCHIVE</div><div className="media-intro mb-10"><div><h2>Mission<br/><em>in motion.</em></h2></div><p>Approved images and media published from Staff Management.</p></div>
        {media.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{media.map(m => <article key={m.id} className="overflow-hidden rounded-2xl border border-border bg-panel"><div className="aspect-video bg-bg flex items-center justify-center overflow-hidden">{m.imageUrl ? <img src={m.imageUrl} alt={m.title || "FBMRP media"} className="h-full w-full object-cover"/> : <Play size={30}/>}</div><div className="p-5"><div className="font-mono text-[8px] text-golddim uppercase tracking-widest">MEDIA ARCHIVE</div><h3 className="font-serif text-xl font-bold mt-2">{m.title || "Untitled media"}</h3><p className="text-textdim text-sm mt-2">{m.caption || "Official FBMRP media."}</p></div></article>)}</div> : <EmptyCard icon={<Play size={25}/>} title="Media archive is empty" text="Approved media will be displayed here when published by staff."/>}
      </section>

      <section id="recruitment" className="cta-section section-pad border-y border-border bg-panel/30"><div className="max-w-4xl mx-auto text-center"><div className="eyebrow justify-center"><span/> 06 / RECRUITMENT</div><h2 className="mt-6">Find your<br/><span>place.</span></h2><p className="max-w-xl mx-auto text-textdim mt-5">Ready to join Fort Bliss Military Roleplay? Start your recruitment process through the official Discord channel.</p><div className="flex flex-wrap justify-center gap-3 mt-8"><a className="button button-primary" href={recruitment} target="_blank" rel="noreferrer">OPEN RECRUITMENT <ExternalLink size={13}/></a><a className="button button-ghost" href="/member">MEMBER DASHBOARD <ArrowRight size={13}/></a></div></div></section>

      <footer className="site-footer border-t border-border"><span>© FBMRP</span><span>FORT BLISS MILITARY ROLEPLAY</span><div className="flex gap-4"><a href="/member">MEMBER</a><a href="/staff">STAFF</a></div></footer>
    </main>
  );
}

function EmptyCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="rounded-2xl border border-dashed border-border bg-panel/50 p-10 text-center"><div className="mx-auto h-14 w-14 rounded-2xl border border-border bg-bg flex items-center justify-center text-golddim">{icon}</div><h3 className="font-serif text-2xl font-bold mt-5">{title}</h3><p className="text-textdim text-sm mt-2">{text}</p></div>;
}
