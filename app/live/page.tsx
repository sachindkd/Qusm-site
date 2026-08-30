"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ChevronDown, Clock3, ExternalLink, LogIn, Megaphone, Play, Shield, Users, Code2 } from "lucide-react";
import { motion } from "framer-motion";

const recruitment = "https://discord.com/channels/1426271681969655913/1532347499212177438";

type AnyRecord = Record<string, any>;
type Content = { divisions?: AnyRecord[]; leadership?: AnyRecord[]; announcements?: AnyRecord[]; calendar?: AnyRecord[]; media?: AnyRecord[] };

const fadeUp = { initial: { opacity: 0, y: 18 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.12 } };

const coc = {
  leadership: ["Owner", "Co-Owner", "Chairman", "Vice Chairman", "CEO", "General Manager", "Department Heads"],
  staff: ["General Manager", "Department Heads / HOCF / HOD / HDO / HAO", "Management", "Administration", "Moderation", "Intern"],
  roleplay: ["President", "Vice President", "Speaker", "President Pro Tempore", "Secretary of Defense", "Secretary of Homeland Security", "Attorney General", "Remaining RP Positions"],
};

export default function LiveHome() {
  const [content, setContent] = useState<Content>({});
  const [openCoc, setOpenCoc] = useState<string | null>("leadership");

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
  const announcements = useMemo(() => (content.announcements || []).filter(x => x.published).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 6), [content]);
  const events = useMemo(() => (content.calendar || []).filter(x => x.status !== "draft").sort((a, b) => `${a.date || ""}${a.time || ""}`.localeCompare(`${b.date || ""}${b.time || ""}`)).slice(0, 6), [content]);
  const media = useMemo(() => (content.media || []).slice(0, 6), [content]);

  return (
    <main className="site-shell bg-bg text-white">
      <nav className="site-nav sticky top-0 z-50 backdrop-blur-xl bg-bg/90 border-b border-border/70 px-5 sm:px-10">
        <a href="#top" className="brand-mark"><span className="brand-dot" /> FBMRP</a>
        <div className="nav-links hidden lg:flex">
          <a href="#announcements">NEWS</a><a href="#command">COMMAND</a><a href="#divisions">DIVISIONS</a><a href="#calendar">OPERATIONS</a><a href="#media">MEDIA</a><a href="#developers">DEVELOPERS</a>
        </div>
        <div className="flex items-center gap-2">
          <a href={recruitment} target="_blank" rel="noreferrer" className="nav-action hidden sm:inline-flex"><ExternalLink size={12} /> RECRUITMENT</a>
          <a href="/staff" className="nav-action"><LogIn size={12} /> STAFF PANEL <ArrowRight size={11} /></a>
        </div>
      </nav>

      <section id="top" className="hero-section relative overflow-hidden">
        <div className="hero-grid" /><div className="hero-glow hero-glow-one" /><div className="hero-glow hero-glow-two" />
        <motion.div className="hero-copy" {...fadeUp} transition={{ duration: .65 }}>
          <div className="eyebrow"><span /> FORT BLISS MILITARY ROLEPLAY <b>LIVE CMS</b></div>
          <h1><span className="hero-line"><span className="hero-word hero-word-1">BUILT</span></span><span className="hero-line"><span className="hero-word hero-word-2 hero-outline">TO SERVE</span></span></h1>
          <div className="hero-meta"><span>STRUCTURE</span><span>DISCIPLINE</span><span>IMMERSION</span><span>COMMUNITY</span></div>
          <p className="hero-description">A structured military roleplay community built around organization, progression, leadership and immersive operations.</p>
          <div className="hero-actions flex flex-wrap gap-3"><a className="button button-primary" href="#announcements">VIEW UPDATES <ArrowRight size={13} /></a><a className="button button-ghost" href="/staff">STAFF PANEL <LogIn size={12} /></a><a className="button button-ghost" href={recruitment} target="_blank" rel="noreferrer">RECRUITMENT <ExternalLink size={12} /></a></div>
        </motion.div>
        <motion.div className="hero-card-wrap" {...fadeUp} transition={{ duration: .75, delay: .1 }}>
          <div className="hero-card-shadow" /><div className="hero-card"><div className="card-topbar"><span><i className="status-dot" /> LIVE SYSTEM</span><span>{String(divisions.length).padStart(2, "0")} DIVISIONS</span></div><div className="card-symbol"><Shield size={28} /></div><div className="card-big-number">01</div><div className="card-caption"><span>FORT BLISS</span><strong>MILITARY ROLEPLAY</strong><span>COMMAND // COMMUNITY // OPERATIONS</span></div></div>
        </motion.div>
      </section>

      <section id="announcements" className="section-pad">
        <motion.div {...fadeUp} className="section-heading-row mb-10"><div><div className="section-label">01 / INTELLIGENCE FEED</div><h2>Official<br/><span>updates.</span></h2><p className="text-textdim max-w-2xl mt-4">Published announcements are presented as individual operational briefings, with clear hierarchy between headline, message and metadata.</p></div><div className="heading-index"><Megaphone className="heading-icon"/> LIVE FEED</div></motion.div>
        {announcements.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{announcements.map((a, i) => <motion.article {...fadeUp} transition={{ duration: .4, delay: i * .035 }} key={a.id} className="group relative overflow-hidden rounded-2xl border border-border bg-panel/90 p-6 min-h-[230px] shadow-2xl shadow-black/10 hover:-translate-y-1 transition-transform"><div className="absolute left-0 top-0 h-1 w-full bg-gold/70"/><div className="flex items-center justify-between gap-3 mb-6"><span className="font-mono text-[9px] tracking-[2px] text-golddim">UPDATE {String(i + 1).padStart(2, "0")}</span><span className="rounded-full border border-border px-2.5 py-1 font-mono text-[8px] text-textfaint">PUBLISHED</span></div><h3 className="font-serif text-2xl font-bold leading-tight">{a.title}</h3><p className="mt-4 text-sm leading-7 text-textdim whitespace-pre-wrap">{a.body}</p><div className="mt-6 pt-4 border-t border-border flex items-center justify-between font-mono text-[8px] uppercase text-textfaint"><span>FBMRP COMMAND</span><span>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "OFFICIAL"}</span></div></motion.article>)}</div> : <EmptyCard icon={<Megaphone size={25}/>} title="No published announcements" text="New staff announcements will appear here automatically."/>}
      </section>

      <section id="command" className="section-pad bg-panel/20">
        <div className="section-label">02 / CHAIN OF COMMAND</div>
        <div className="section-heading-row mb-10"><div><h2>Command<br/><span>structure.</span></h2><p className="text-textdim max-w-2xl mt-4">The FBMRP chain of command is separated into three clear authorities. Select a tier to reveal its hierarchy.</p></div><div className="heading-index"><Shield className="heading-icon"/> COMMAND</div></div>
        <div className="grid lg:grid-cols-[.9fr_1.5fr] gap-6 items-start">
          <div className="rounded-2xl border border-gold/30 bg-gradient-to-br from-gold/10 via-panel to-panel p-6 lg:sticky lg:top-24"><div className="font-mono text-[9px] tracking-[2px] text-golddim">FBMRP / AUTHORITY</div><div className="mt-6 h-16 w-16 rounded-2xl border border-gold/30 bg-bg flex items-center justify-center text-gold"><Shield size={28}/></div><h3 className="font-serif text-3xl font-bold mt-5">Chain of Command</h3><p className="text-textdim text-sm leading-6 mt-3">Official hierarchy and role structure. Staff-controlled leadership data remains synchronized separately through the CMS.</p></div>
          <div className="space-y-3">{(["leadership","staff","roleplay"] as const).map((key, idx) => { const title = key === "leadership" ? "Leadership" : key === "staff" ? "Staff CoC" : "Roleplay CoC"; const list = coc[key]; const open = openCoc === key; return <div key={key} className={`overflow-hidden rounded-2xl border ${open ? "border-gold/50" : "border-border"} bg-panel transition-colors`}><button onClick={() => setOpenCoc(open ? null : key)} className="w-full flex items-center justify-between gap-4 p-5 text-left"><span className="flex items-center gap-4"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold/25 bg-gold/5 font-mono text-[9px] text-golddim">0{idx + 1}</span><span><strong className="block font-serif text-xl">{title}</strong><span className="font-mono text-[8px] uppercase tracking-widest text-textfaint">{list.length} levels</span></span></span><ChevronDown size={18} className={`text-golddim transition-transform ${open ? "rotate-180" : ""}`}/></button>{open && <div className="border-t border-gold/20 px-5 pb-5 pt-3"><div className="relative ml-4 border-l border-gold/25">{list.map((item, i) => <div key={item} className="relative pl-8 py-3"><span className="absolute -left-[5px] top-5 h-2.5 w-2.5 rounded-full border border-gold bg-bg"/><div className="font-mono text-[8px] text-golddim mb-1">LEVEL {String(i + 1).padStart(2, "0")}</div><div className="font-medium text-sm sm:text-base">{item}</div></div>)}</div></div>}</div> })}</div>
        </div>
      </section>

      <section id="divisions" className="section-pad division-section"><div className="section-label">03 / ORGANIZATION</div><div className="division-head mb-10"><div><h2>Active<br/><span>divisions.</span></h2></div><p>Explore the active organizations currently published by Staff Management.</p></div>{divisions.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{divisions.map((d, i) => <article key={d.id || d.code} className="division-card group"><div className="division-top"><span>DIV / {String(i + 1).padStart(2, "0")}</span><span className="text-golddim">{String(d.status || "ACTIVE").toUpperCase()}</span></div><div className="my-7 h-16 w-16 rounded-2xl border border-border bg-bg flex items-center justify-center overflow-hidden">{d.logoUrl ? <img src={d.logoUrl} alt="" className="h-full w-full object-cover"/> : <Shield size={25}/>}</div><h3>{d.name}</h3><p className="min-h-[56px]">{d.description || "Official FBMRP division."}</p><div className="mt-6 pt-4 border-t border-border flex items-center justify-between font-mono text-[9px] text-golddim"><span>{d.code || "DIVISION"}</span><ArrowRight size={13} className="group-hover:translate-x-1 transition-transform"/></div></article>)}</div> : <EmptyCard icon={<Shield size={25}/>} title="No divisions published" text="Active divisions will appear here once published by staff."/>}</section>

      <section id="calendar" className="section-pad bg-panel/20"><div className="section-label">04 / OPERATIONS CALENDAR</div><div className="section-heading-row mb-10"><div><h2>Upcoming<br/><span>operations.</span></h2><p className="text-textdim max-w-2xl mt-4">Training, operations and community events published through the Staff Panel.</p></div><div className="heading-index"><CalendarDays className="heading-icon"/> SCHEDULED</div></div>{events.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{events.map((e, i) => <article key={e.id} className="rounded-2xl border border-border bg-panel p-6 hover:border-gold/30 transition-colors"><div className="flex items-start justify-between gap-4"><div className="h-12 w-12 rounded-xl border border-border bg-bg flex items-center justify-center text-golddim"><CalendarDays size={20}/></div><span className="font-mono text-[9px] text-golddim border border-border rounded-full px-3 py-1">OP {String(i + 1).padStart(2, "0")}</span></div><h3 className="font-serif text-xl font-bold mt-6">{e.title}</h3><div className="mt-4 space-y-2 font-mono text-[9px] uppercase text-textfaint"><div className="flex gap-2"><CalendarDays size={12} className="text-golddim"/>{e.date || "Date TBA"}</div><div className="flex gap-2"><Clock3 size={12} className="text-golddim"/>{e.time || "Time TBA"}</div><div className="flex gap-2"><Shield size={12} className="text-golddim"/>{e.location || "Location TBA"}</div></div><p className="mt-5 text-sm leading-6 text-textdim">{e.description || "Official community operation."}</p></article>)}</div> : <EmptyCard icon={<CalendarDays size={25}/>} title="No upcoming operations" text="Published events will appear here automatically."/>}</section>

      <section id="media" className="section-pad"><div className="section-label">05 / MEDIA ARCHIVE</div><div className="media-intro mb-10"><div><h2>Mission<br/><em>in motion.</em></h2></div><p>Approved images and videos published through the Developer Media area.</p></div>{media.length ? <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{media.map(m => <article key={m.id} className="overflow-hidden rounded-2xl border border-border bg-panel group"><div className="aspect-video bg-bg flex items-center justify-center overflow-hidden">{m.videoUrl ? <video src={m.videoUrl} controls preload="metadata" className="h-full w-full object-cover"/> : m.imageUrl ? <img src={m.imageUrl} alt={m.title || "FBMRP media"} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"/> : <Play size={30}/>}</div><div className="p-5"><div className="font-mono text-[8px] text-golddim uppercase tracking-widest">DEVELOPER MEDIA</div><h3 className="font-serif text-xl font-bold mt-2">{m.title || "Untitled media"}</h3><p className="text-textdim text-sm mt-2">{m.caption || "Official FBMRP media."}</p></div></article>)}</div> : <EmptyCard icon={<Play size={25}/>} title="Media archive is empty" text="Developer uploads approved for publication will appear here."/>}</section>

      <section id="developers" className="section-pad bg-panel/20"><div className="section-label">06 / DEVELOPER STUDIO</div><div className="section-heading-row mb-10"><div><h2>Developer<br/><span>studio.</span></h2><p className="text-textdim max-w-2xl mt-4">A dedicated publishing area for approved developers to submit project screenshots, videos and visual work.</p></div><div className="heading-index"><Code2 className="heading-icon"/> CREATIVE</div></div><div className="rounded-2xl border border-gold/25 bg-gradient-to-r from-gold/10 via-panel to-panel p-6 sm:p-8"><div className="grid lg:grid-cols-[1fr_auto] gap-8 items-center"><div><div className="font-mono text-[9px] tracking-[2px] text-golddim uppercase">DEVELOPER MEDIA PIPELINE</div><h3 className="font-serif text-3xl font-bold mt-3">Publish the work. Keep the site clean.</h3><p className="text-textdim text-sm leading-7 mt-3 max-w-2xl">Developers can submit images and videos through Staff Management. Uploads are limited to <strong className="text-white">8 MB per file</strong>, reviewed through the existing permission system, and displayed in the Media Archive without dumping raw links onto the public page.</p></div><a href="/staff?section=media" className="button button-primary whitespace-nowrap"><Code2 size={14}/> OPEN DEVELOPER MEDIA</a></div></div></section>

      <section id="recruitment" className="cta-section section-pad border-y border-border bg-panel/30"><div className="max-w-4xl mx-auto text-center"><div className="eyebrow justify-center"><span/> 07 / RECRUITMENT</div><h2 className="mt-6">Find your<br/><span>place.</span></h2><p className="max-w-xl mx-auto text-textdim mt-5">Ready to join Fort Bliss Military Roleplay? Start your recruitment process through the official Discord channel.</p><div className="flex flex-wrap justify-center gap-3 mt-8"><a className="button button-primary" href={recruitment} target="_blank" rel="noreferrer">OPEN RECRUITMENT <ExternalLink size={13}/></a></div></div></section>

      <footer className="site-footer border-t border-border"><span>© FBMRP</span><span>FORT BLISS MILITARY ROLEPLAY</span><div className="flex gap-4"><a href="/staff">STAFF PANEL</a><a href={recruitment} target="_blank" rel="noreferrer">RECRUITMENT</a></div></footer>
    </main>
  );
}

function EmptyCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-2xl border border-dashed border-border bg-panel/50 p-10 text-center"><div className="mx-auto h-14 w-14 rounded-2xl border border-border bg-bg flex items-center justify-center text-golddim">{icon}</div><h3 className="font-serif text-2xl font-bold mt-5">{title}</h3><p className="text-textdim text-sm mt-2">{text}</p></div>; }
