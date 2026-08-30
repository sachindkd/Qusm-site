"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, LogOut, Megaphone, Shield, Users } from "lucide-react";
import { signOut } from "next-auth/react";

type Content = { announcements?: any[]; calendar?: any[]; leadership?: any[]; divisions?: any[]; media?: any[] };
type User = { username: string; avatar?: string | null; nick?: string | null; access?: string; highestRole?: { name: string } | null };

export default function MemberDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [content, setContent] = useState<Content>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [me, data] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()),
          fetch("/api/content", { cache: "no-store" }).then(r => r.ok ? r.json() : {})
        ]);
        if (!cancelled) { setUser(me.authenticated ? me.user : null); setContent(data || {}); }
      } catch { if (!cancelled) setUser(null); }
      finally { if (!cancelled) setLoading(false); }
    };
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);

  const announcements = useMemo(() => (content.announcements || []).filter(x => x.published).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))).slice(0, 5), [content]);
  const events = useMemo(() => (content.calendar || []).filter(x => x.status !== "draft").sort((a, b) => `${a.date || ""}${a.time || ""}`.localeCompare(`${b.date || ""}${b.time || ""}`)).slice(0, 5), [content]);
  const divisions = useMemo(() => (content.divisions || []).filter(x => x.status !== "inactive"), [content]);

  if (loading) return <Shell><div className="min-h-[60vh] flex items-center justify-center"><Loading/></div></Shell>;
  if (!user) return <Shell><div className="min-h-[70vh] flex items-center justify-center px-5"><div className="w-full max-w-lg rounded-3xl border border-border bg-panel p-10 text-center shadow-2xl"><div className="mx-auto h-16 w-16 rounded-2xl border border-border bg-bg flex items-center justify-center text-golddim"><Users size={25}/></div><p className="font-mono text-[9px] tracking-[2px] text-golddim uppercase mt-6">FBMRP MEMBER PORTAL</p><h1 className="font-serif text-4xl font-bold mt-3">Access your dashboard.</h1><p className="text-textdim text-sm mt-3 leading-6">Sign in with Discord to view current announcements, operations and organization information.</p><a className="button button-primary inline-flex mt-7" href="/api/auth/signin/discord">LOGIN WITH DISCORD <ArrowRight size={13}/></a></div></div></Shell>;

  return <Shell>
    <header className="border-b border-border bg-bg/90 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between gap-5"><div className="flex items-center gap-4 min-w-0"><a href="/" className="h-10 w-10 shrink-0 rounded-xl border border-border flex items-center justify-center hover:border-golddim transition"><ArrowLeft size={15}/></a><div className="min-w-0"><div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">FBMRP / MEMBER PORTAL</div><h1 className="font-serif text-xl sm:text-2xl font-bold truncate">Welcome, {user.nick || user.username}</h1></div></div><div className="flex items-center gap-2"><a href="/staff" className="hidden sm:inline-flex button button-ghost !py-2"><Shield size={12}/> STAFF PANEL</a><button onClick={() => signOut({ callbackUrl: "/" })} className="h-9 px-3 rounded-lg border border-border font-mono text-[8px] uppercase flex items-center gap-2"><LogOut size={12}/> SIGN OUT</button></div></div>
    </header>

    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
      <section className="rounded-3xl border border-border bg-panel overflow-hidden relative p-7 sm:p-10 mb-7"><div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gold/10 blur-3xl"/><div className="relative"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border bg-bg px-3 py-1 font-mono text-[8px] uppercase text-golddim">{user.access || "member"}</span><span className="rounded-full border border-border bg-bg px-3 py-1 font-mono text-[8px] uppercase text-textfaint">SYNCED LIVE</span></div><h2 className="font-serif text-4xl sm:text-5xl font-bold mt-5">Your command<br/><span className="text-golddim">dashboard.</span></h2><p className="max-w-2xl text-textdim mt-4 leading-7">Everything published by FBMRP staff is pulled from the live content system. Updates normally appear here within 30 seconds.</p></div></section>

      <section className="grid sm:grid-cols-3 gap-4 mb-8"><Stat icon={<Megaphone size={17}/>} label="Published updates" value={announcements.length}/><Stat icon={<CalendarDays size={17}/>} label="Upcoming operations" value={events.length}/><Stat icon={<Shield size={17}/>} label="Active divisions" value={divisions.length}/></section>

      <section className="grid xl:grid-cols-[1.35fr_.65fr] gap-6 items-start">
        <Panel title="Latest intelligence" eyebrow="01 / ANNOUNCEMENTS" icon={<Megaphone size={16}/>}>{announcements.length ? <div className="grid md:grid-cols-2 gap-4">{announcements.map((a, i) => <article key={a.id} className="rounded-2xl border border-border bg-bg/60 p-5 relative overflow-hidden"><div className="absolute top-0 left-0 w-full h-1 bg-gold/60"/><div className="flex justify-between gap-3 font-mono text-[8px] text-golddim"><span>UPDATE {String(i + 1).padStart(2, "0")}</span><span>PUBLISHED</span></div><h3 className="font-serif text-xl font-bold mt-5">{a.title}</h3><p className="text-textdim text-sm leading-6 mt-3 whitespace-pre-wrap">{a.body}</p></article>)}</div> : <Empty text="No published announcements yet."/>}</Panel>

        <Panel title="Next operations" eyebrow="02 / CALENDAR" icon={<CalendarDays size={16}/>}>
          {events.length ? <div className="space-y-3">{events.map(e => <article key={e.id} className="rounded-xl border border-border bg-bg/60 p-4"><h3 className="font-semibold">{e.title}</h3><div className="mt-3 space-y-2 font-mono text-[8px] uppercase text-textfaint"><div className="flex gap-2"><CalendarDays size={11} className="text-golddim"/>{e.date || "DATE TBA"}</div><div className="flex gap-2"><Clock3 size={11} className="text-golddim"/>{e.time || "TIME TBA"}</div><div className="flex gap-2"><Shield size={11} className="text-golddim"/>{e.location || "LOCATION TBA"}</div></div></article>)}</div> : <Empty text="No upcoming operations."/>}
        </Panel>
      </section>

      <Panel title="Your organization" eyebrow="03 / DIVISIONS" icon={<Users size={16}/>}><div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{divisions.length ? divisions.map(d => <article key={d.id || d.code} className="rounded-2xl border border-border bg-bg/60 p-5"><div className="h-11 w-11 rounded-xl border border-border flex items-center justify-center text-golddim"><Shield size={18}/></div><div className="font-mono text-[8px] text-golddim mt-5">{d.code || "DIVISION"}</div><h3 className="font-serif text-xl font-bold mt-1">{d.name}</h3><p className="text-textdim text-sm leading-6 mt-2">{d.description || "Official FBMRP division."}</p></article>) : <Empty text="No divisions published."/>}</div></Panel>

      <div className="flex flex-wrap justify-center gap-3 pt-3"><a href="/" className="button button-ghost"><ArrowLeft size={12}/> PUBLIC WEBSITE</a><a href="/staff" className="button button-primary"><Shield size={12}/> STAFF PANEL</a></div>
      <p className="text-center text-textfaint font-mono text-[8px] uppercase tracking-wider mt-6">Live synchronization enabled · Staff Management → Database → Member Portal</p>
    </div>
  </Shell>;
}

function Shell({ children }: { children: ReactNode }) { return <main className="min-h-screen bg-bg text-white">{children}</main>; }
function Loading() { return <p className="font-mono text-[9px] uppercase tracking-[2px] text-textfaint">Loading live member data…</p>; }
function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: number }) { return <div className="rounded-2xl border border-border bg-panel p-5"><div className="h-9 w-9 rounded-lg border border-border bg-bg flex items-center justify-center text-golddim">{icon}</div><div className="font-serif text-3xl font-bold mt-5">{value}</div><div className="font-mono text-[8px] uppercase tracking-wider text-textfaint mt-1">{label}</div></div>; }
function Panel({ title, eyebrow, icon, children }: { title: string; eyebrow: string; icon: ReactNode; children: ReactNode }) { return <section className="rounded-2xl border border-border bg-panel p-5 sm:p-6 mb-6"><div className="flex items-center justify-between gap-4 mb-5"><div><div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">{eyebrow}</div><h2 className="font-serif text-2xl font-bold mt-1">{title}</h2></div><div className="h-9 w-9 rounded-lg border border-border flex items-center justify-center text-golddim">{icon}</div></div>{children}</section>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-border bg-bg/40 p-8 text-center text-textfaint text-sm">{text}</div>; }
