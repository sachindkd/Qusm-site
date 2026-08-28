"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Users, Shield, ScrollText, LogOut, Plus, Trash2, Landmark, BadgeCheck, Rss, Image as ImageIcon, ClipboardList, Lock, Settings, Save, CalendarDays } from "lucide-react";
import { signOut } from "next-auth/react";

type Field = { key: string; label: string; type?: "text" | "textarea" | "url" | "date" | "select"; options?: string[] };
type Section = { id: string; label: string; icon: any; permission: string; fields?: Field[] };

const SECTIONS: Section[] = [
  { id: "org", label: "Site", icon: Settings, permission: "site:edit", fields: [
    { key: "name", label: "Short name" }, { key: "fullName", label: "Full name" }, { key: "owner", label: "Owner" }, { key: "coOwner", label: "Co-owner" }, { key: "status", label: "Status", type: "select", options: ["active", "maintenance", "closed"] },
  ] },
  { id: "announcements", label: "News", icon: Megaphone, permission: "announcements:manage", fields: [
    { key: "title", label: "Title" }, { key: "body", label: "Announcement", type: "textarea" }, { key: "date", label: "Date", type: "date" }, { key: "status", label: "Status", type: "select", options: ["draft", "published"] },
  ] },
  { id: "calendar", label: "Calendar", icon: CalendarDays, permission: "calendar:manage", fields: [
    { key: "title", label: "Event title" }, { key: "date", label: "Date", type: "date" }, { key: "time", label: "Time" }, { key: "location", label: "Location" }, { key: "description", label: "Description", type: "textarea" }, { key: "status", label: "Status", type: "select", options: ["draft", "published"] },
  ] },
  { id: "leadership", label: "Command", icon: Users, permission: "leadership:edit", fields: [
    { key: "name", label: "Name" }, { key: "rank", label: "Rank" }, { key: "role", label: "Position" }, { key: "division", label: "Division" }, { key: "bio", label: "Biography", type: "textarea" }, { key: "avatarUrl", label: "Photo URL", type: "url" },
  ] },
  { id: "divisions", label: "Divisions", icon: Shield, permission: "divisions:edit", fields: [
    { key: "name", label: "Division name" }, { key: "commander", label: "Commander" }, { key: "description", label: "Description", type: "textarea" }, { key: "imageUrl", label: "Image URL", type: "url" }, { key: "status", label: "Status", type: "select", options: ["active", "inactive"] },
  ] },
  { id: "rules", label: "Rules", icon: ScrollText, permission: "site:edit", fields: [
    { key: "title", label: "Rule title" }, { key: "category", label: "Category" }, { key: "body", label: "Rule", type: "textarea" },
  ] },
  { id: "government", label: "Govt", icon: Landmark, permission: "site:edit", fields: [
    { key: "name", label: "Name" }, { key: "role", label: "Role" }, { key: "department", label: "Department" }, { key: "description", label: "Description", type: "textarea" },
  ] },
  { id: "ranks", label: "Ranks", icon: BadgeCheck, permission: "site:edit", fields: [
    { key: "name", label: "Rank" }, { key: "level", label: "Level" }, { key: "description", label: "Description", type: "textarea" }, { key: "insigniaUrl", label: "Insignia URL", type: "url" },
  ] },
  { id: "news", label: "Bulletin", icon: Rss, permission: "site:edit", fields: [
    { key: "title", label: "Headline" }, { key: "excerpt", label: "Summary", type: "textarea" }, { key: "body", label: "Article", type: "textarea" }, { key: "date", label: "Date", type: "date" }, { key: "imageUrl", label: "Image URL", type: "url" },
  ] },
  { id: "media", label: "Media", icon: ImageIcon, permission: "media:manage", fields: [
    { key: "title", label: "Title" }, { key: "caption", label: "Caption", type: "textarea" }, { key: "imageUrl", label: "Image URL", type: "url" }, { key: "category", label: "Category" },
  ] },
  { id: "applications", label: "Apps", icon: ClipboardList, permission: "applications:manage", fields: [
    { key: "name", label: "Applicant" }, { key: "discordId", label: "Discord ID" }, { key: "email", label: "Email" }, { key: "position", label: "Position" }, { key: "motivation", label: "Motivation", type: "textarea" }, { key: "status", label: "Status", type: "select", options: ["open", "reviewing", "accepted", "rejected"] },
  ] },
];

const uid = () => crypto.randomUUID();
const blank = (fields: Field[]) => fields.reduce((o, f) => ({ ...o, [f.key]: f.type === "select" ? f.options?.[0] || "" : "" }), { id: uid() });

export default function AdminClient({ initialContent, email, access, permissions }: { initialContent: any; email: string; access: string; permissions: string[] }) {
  const [content, setContent] = useState(initialContent);
  const [active, setActive] = useState("announcements");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const requested = new URLSearchParams(window.location.search).get("section"); if (requested && SECTIONS.some(s => s.id === requested)) setActive(requested); }, []);
  const allowed = (p: string) => permissions.includes(p) || permissions.includes("admin:all");
  const section = SECTIONS.find(s => s.id === active)!;
  const save = async () => { setSaving(true); setSaved(false); setError(""); try { const response = await fetch("/api/content", { method: "PUT", headers: { "Content-Type": "application/json", "x-content-section": active }, body: JSON.stringify({ [active]: content[active] }) }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.error || `Save failed (${response.status})`); setSaved(true); window.setTimeout(() => setSaved(false), 2000); } catch (e: any) { setError(e?.message || "Save failed"); } finally { setSaving(false); } };
  return <div className="min-h-screen bg-bg text-white pb-28">
    <header className="border-b border-border px-6 sm:px-16 py-6 flex justify-between items-center"><div><div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase">FBMRP Administration</div><h1 className="font-serif text-xl font-bold">Website Control</h1><div className="font-mono text-[9px] text-textfaint uppercase mt-1">{access} · {permissions.length} permissions</div></div><button onClick={() => signOut({ callbackUrl: "/" })} className="font-mono text-[10px] uppercase border border-border px-3 py-2 flex gap-2 items-center"><LogOut size={12}/> Sign out</button></header>
    <main className="px-6 sm:px-16 py-10 max-w-5xl mx-auto"><div className="mb-8"><span className="font-mono text-[10px] text-textfaint">SIGNED IN · {email}</span><h2 className="font-serif text-4xl font-bold mt-2">Content Command</h2><p className="text-textdim text-sm mt-2">Structured editors with server-side Discord authorization and persistent storage.</p></div>{error && <div className="mb-5 border border-red-500/40 bg-red-500/10 text-red-200 rounded-xl p-3 text-sm">{error}</div>}
      <AnimatePresence mode="wait"><motion.div key={active} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>{section.id === "org" ? <SettingsEditor value={content.org || {}} setValue={v => setContent((c: any) => ({ ...c, org: v }))} fields={section.fields!} /> : <CollectionEditor fields={section.fields!} items={Array.isArray(content[active]) ? content[active] : []} setItems={v => setContent((c: any) => ({ ...c, [active]: v }))} />}</motion.div></AnimatePresence>
    </main>
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-[95vw] overflow-x-auto rounded-2xl border border-border bg-panel/95 backdrop-blur px-2 py-2 flex gap-1">{SECTIONS.filter(s => allowed(s.permission)).map(s => { const I = s.icon; return <button key={s.id} onClick={() => { setActive(s.id); setError(""); setSaved(false); window.history.replaceState(null, "", `/admin?section=${s.id}`); }} className={`px-3 py-2 rounded-xl text-[9px] font-mono uppercase whitespace-nowrap ${active === s.id ? "bg-gold text-black" : "text-textdim"}`}><I size={13} className="mx-auto mb-1"/>{s.label}</button>; })}{SECTIONS.every(s => !allowed(s.permission)) && <span className="px-4 py-2 text-[9px] font-mono text-textfaint flex gap-2"><Lock size={13}/> No CMS permissions</span>}</nav>
    {allowed(section.permission) && <button onClick={save} disabled={saving} className="fixed right-5 bottom-5 bg-gold text-black px-5 py-3 rounded-full font-mono text-[10px] uppercase disabled:opacity-50 flex gap-2 items-center"><Save size={13}/>{saved ? "Saved" : saving ? "Saving…" : "Save changes"}</button>}
  </div>;
}

function FieldInput({ field, value, onChange }: { field: Field; value: any; onChange: (v: string) => void }) { const common = "mt-1 w-full bg-panel2 border border-border rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-golddim"; if (field.type === "textarea") return <textarea value={value ?? ""} onChange={e => onChange(e.target.value)} rows={4} className={common} />; if (field.type === "select") return <select value={value ?? field.options?.[0] ?? ""} onChange={e => onChange(e.target.value)} className={common}>{field.options?.map(o => <option key={o} value={o}>{o}</option>)}</select>; return <input type={field.type === "url" ? "url" : field.type === "date" ? "date" : "text"} value={value ?? ""} onChange={e => onChange(e.target.value)} className={common} />; }
function CollectionEditor({ fields, items, setItems }: { fields: Field[]; items: any[]; setItems: (v: any[]) => void }) { const add = () => setItems([...items, blank(fields)]); const update = (index: number, key: string, value: string) => { const next = [...items]; next[index] = { ...next[index], [key]: value }; setItems(next); }; return <section><div className="flex justify-between items-center mb-5"><div><h3 className="font-serif text-2xl font-bold">Manage records</h3><p className="text-textfaint text-xs mt-1">{items.length} record{items.length === 1 ? "" : "s"}</p></div><button onClick={add} className="border border-golddim px-3 py-2 text-gold font-mono text-[10px] uppercase flex gap-1 rounded-lg"><Plus size={12}/> Add record</button></div>{items.map((item, i) => <article key={item.id || i} className="border border-border bg-panel p-5 mb-4 rounded-xl"><div className="flex justify-between items-center mb-4"><span className="font-mono text-[9px] uppercase text-textfaint">Record {i + 1}</span><button onClick={() => setItems(items.filter((_, n) => n !== i))} className="text-textfaint hover:text-red-300" aria-label="Delete record"><Trash2 size={15}/></button></div><div className="grid md:grid-cols-2 gap-4">{fields.map(field => <label key={field.key} className={`font-mono text-[9px] uppercase text-textfaint ${field.type === "textarea" ? "md:col-span-2" : ""}`}>{field.label}<FieldInput field={field} value={item[field.key]} onChange={v => update(i, field.key, v)} /></label>)}</div></article>)}{!items.length && <div className="border border-dashed border-border rounded-xl p-12 text-center text-textfaint text-sm">No records yet. Add the first one.</div>}</section>; }
function SettingsEditor({ fields, value, setValue }: { fields: Field[]; value: any; setValue: (v: any) => void }) { return <section><div className="mb-5"><h3 className="font-serif text-2xl font-bold">Site settings</h3><p className="text-textfaint text-xs mt-1">Core organization information.</p></div><div className="border border-border bg-panel p-5 rounded-xl grid md:grid-cols-2 gap-4">{fields.map(field => <label key={field.key} className="font-mono text-[9px] uppercase text-textfaint">{field.label}<FieldInput field={field} value={value[field.key]} onChange={v => setValue({ ...value, [field.key]: v })} /></label>)}</div></section>; }
