"use client";

import { useEffect, useRef, useState } from "react";
import { Search, UserRound } from "lucide-react";

type Member = { id: string; username: string; globalName?: string | null; avatar?: string | null; nick?: string | null; rank?: string | null };

export default function MemberSearch() {
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const value = query.trim();
    if (!value) { setMembers([]); setOpen(false); setError(""); return; }
    const timer = setTimeout(async () => {
      const current = ++requestId.current;
      setLoading(true); setError("");
      try {
        const r = await fetch(`/api/staff/members?q=${encodeURIComponent(value)}`, { cache: "no-store" });
        const data = await r.json();
        if (current !== requestId.current) return;
        if (!r.ok) throw new Error(data.error || "Member search failed");
        setMembers(Array.isArray(data.members) ? data.members : []);
        setOpen(true);
      } catch (e) {
        if (current !== requestId.current) return;
        setMembers([]); setOpen(true); setError(e instanceof Error ? e.message : "Member search failed");
      } finally { if (current === requestId.current) setLoading(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return <section className="mb-6 border border-border bg-panel/60 p-4 sm:p-5">
    <div className="mb-3">
      <div className="font-mono text-[8px] tracking-[2px] text-golddim uppercase">STAFF TOOLS</div>
      <h2 className="mt-1 font-serif text-xl sm:text-2xl font-bold">Member Search</h2>
      <p className="mt-1 text-sm text-textdim">Search Discord server members by username, ID, rank, or other member details.</p>
    </div>
    <div className="relative">
      <Search size={15} className="absolute left-3 top-3.5 text-textfaint" />
      <input value={query} onChange={e => setQuery(e.target.value)} onFocus={() => query.trim() && setOpen(true)} autoComplete="off" placeholder="Search username, Discord ID, rank…" className="w-full bg-panel2 border border-border focus:border-gold px-10 py-3 text-sm text-white outline-none" aria-label="Search members" />
      {loading && <div className="absolute right-3 top-3 text-[9px] font-mono uppercase text-textfaint">Searching…</div>}
    </div>
    {open && query.trim() && <div className="mt-2 overflow-hidden border border-border bg-panel2">
      {error ? <div className="px-4 py-4 text-sm text-red-300">{error}</div> : members.length === 0 && !loading ? <div className="px-4 py-4 text-sm text-textfaint">No matching server members found.</div> : <div className="max-h-80 overflow-y-auto">
        {members.map(member => <button key={member.id} type="button" onClick={() => { setQuery(member.globalName || member.username); setOpen(false); }} className="flex w-full items-center gap-3 border-b border-border/70 px-4 py-3 text-left last:border-b-0 hover:bg-white/[.03]">
          {member.avatar ? <img src={member.avatar} alt="" className="h-9 w-9 rounded-full object-cover" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-textfaint"><UserRound size={16} /></div>}
          <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold text-white">{member.globalName || member.nick || member.username}</div><div className="truncate text-[11px] text-textdim">@{member.username} · {member.id}</div></div>
          {member.rank && <span className="shrink-0 font-mono text-[8px] uppercase text-golddim">{member.rank}</span>}
        </button>)}
      </div>}
    </div>}
  </section>;
}
