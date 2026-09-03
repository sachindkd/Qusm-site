"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, FileCheck2, ShieldCheck } from "lucide-react";

type User = { id: string; username: string; nick?: string | null };

export default function QuotaPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { fetch("/api/auth/me", { cache: "no-store" }).then(r => r.json()).then(data => setUser(data.authenticated ? data.user : null)).catch(() => setUser(null)).finally(() => setLoading(false)); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSending(true); setError(""); setDone(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/quota/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quota: form.get("quota"), unit: form.get("unit"), description: form.get("description"), proofUrl: form.get("proofUrl") }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Submission failed.");
      setDone(data.id); event.currentTarget.reset();
    } catch (e) { setError(e instanceof Error ? e.message : "Submission failed."); } finally { setSending(false); }
  }

  if (loading) return <main className="min-h-screen bg-bg text-white flex items-center justify-center"><span className="font-mono text-[9px] uppercase tracking-[2px] text-textfaint">Loading…</span></main>;
  if (!user) return <main className="min-h-screen bg-bg text-white flex items-center justify-center px-5"><div className="max-w-md text-center"><ShieldCheck className="mx-auto text-golddim" size={42}/><h1 className="font-serif text-4xl font-bold mt-5">Quota logging</h1><p className="text-textdim mt-3">Authorize with Discord before submitting staff quota.</p><a href="/authorize?next=/quota" className="button button-primary inline-flex mt-6">AUTHORIZE WITH DISCORD</a></div></main>;

  return <main className="min-h-screen bg-bg text-white px-5 py-8 sm:py-12"><div className="mx-auto max-w-3xl"><a href="/member" className="inline-flex items-center gap-2 font-mono text-[9px] uppercase tracking-[2px] text-textfaint hover:text-white"><ArrowLeft size={13}/> Member Portal</a>
    <header className="mt-8 rounded-3xl border border-border bg-panel p-6 sm:p-9"><p className="font-mono text-[9px] uppercase tracking-[3px] text-golddim">FBMRP / STAFF QUOTA</p><h1 className="font-serif text-4xl sm:text-5xl font-bold mt-2">Log your quota</h1><p className="text-textdim mt-3 max-w-2xl leading-6">Submit the work you completed with proof. Your submission is sent to the dedicated Logistics Discord channel for review. Only an approved submission is added to the external Google quota database.</p><div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-border px-3 py-1 font-mono text-[8px] uppercase text-textfaint">Logged as {user.nick || user.username}</span><span className="rounded-full border border-border px-3 py-1 font-mono text-[8px] uppercase text-textfaint"><Clock3 size={11} className="inline mr-1"/> Discord review</span></div></header>

    <form onSubmit={submit} className="mt-6 rounded-2xl border border-border bg-panel p-6 sm:p-8 space-y-5"><div className="grid sm:grid-cols-2 gap-5"><label className="block"><span className="label">Amount</span><input name="quota" type="number" min="1" max="100000" step="0.01" required className="input mt-2" placeholder="e.g. 10"/></label><label className="block"><span className="label">Unit</span><input name="unit" required maxLength={40} className="input mt-2" placeholder="e.g. sessions, hours, recruits"/></label></div><label className="block"><span className="label">What did you complete?</span><textarea name="description" required maxLength={1000} rows={5} className="input mt-2 resize-y" placeholder="Briefly describe the quota completed…"/></label><label className="block"><span className="label">Proof link</span><div className="relative mt-2"><FileCheck2 size={15} className="absolute left-3 top-3.5 text-textfaint"/><input name="proofUrl" type="url" required className="input !pl-10" placeholder="Discord message/image link or other proof URL"/></div><p className="text-[11px] text-textfaint mt-2">Use a link Logistics can open and verify.</p></label>
      {error && <div className="rounded-xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">{error}</div>}{done && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-200"><CheckCircle2 size={15} className="inline mr-2"/>Submitted as <b>{done}</b>. Logistics will review it in Discord.</div>}
      <button disabled={sending} className="button button-primary w-full justify-center disabled:opacity-50">{sending ? "SENDING TO DISCORD…" : "SUBMIT FOR LOGISTICS REVIEW"} <ExternalLink size={13}/></button>
    </form>
    <p className="text-center font-mono text-[8px] uppercase tracking-[2px] text-textfaint mt-6">No direct database editing · Approval is required before Google sync</p>
  </div></main>;
}
