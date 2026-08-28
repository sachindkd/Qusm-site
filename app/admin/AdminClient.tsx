"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Users,
  Shield,
  ScrollText,
  LogOut,
  Check,
  Plus,
  Trash2,
  Landmark,
  BadgeCheck,
  Rss,
  Image as ImageIcon,
  ClipboardList,
} from "lucide-react";
import Dock from "@/components/Dock";
import type { Content } from "@/lib/content";

const SECTIONS = [
  { id: "announcements", label: "News", icon: Megaphone },
  { id: "leadership", label: "Command", icon: Users },
  { id: "divisions", label: "Divisions", icon: Shield },
  { id: "rules", label: "Rules", icon: ScrollText },
  { id: "government", label: "Gov't", icon: Landmark },
  { id: "ranks", label: "Ranks", icon: BadgeCheck },
  { id: "news", label: "Bulletin", icon: Rss },
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "applications", label: "Apps", icon: ClipboardList },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function AdminClient({
  initialContent,
  email,
}: {
  initialContent: Content;
  email: string;
}) {
  const [content, setContent] = useState<Content>(initialContent);
  const [active, setActive] = useState("announcements");
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(content),
    });
    setSaving(false);
    if (res.ok) setSavedAt(new Date().toLocaleTimeString());
  }

  function update<K extends keyof Content>(key: K, value: Content[K]) {
    setContent((c) => ({ ...c, [key]: value }));
  }

  return (
    <div className="min-h-screen bg-bg text-white pb-32">
      <header className="border-b border-border px-6 sm:px-16 py-6 flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-1">
            Admin Console
          </div>
          <h1 className="font-serif text-xl font-bold">QUSM Content Editor</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] text-textfaint hidden sm:block">{email}</span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-textdim hover:text-white border border-border px-3 py-2 transition-colors"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </header>

      <div className="px-6 sm:px-16 py-10 max-w-3xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
          >
            {active === "announcements" && (
              <ListEditor
                title="Announcements"
                items={content.announcements}
                onChange={(items) => update("announcements", items)}
                fields={[
                  { key: "date", label: "Date", placeholder: "2026-08-28" },
                  { key: "title", label: "Title", placeholder: "Headline" },
                  { key: "body", label: "Body", placeholder: "Details...", area: true },
                ]}
                newItem={() => ({ id: uid(), date: "", title: "", body: "" })}
              />
            )}
            {active === "leadership" && (
              <ListEditor
                title="Chain of Command"
                items={content.leadership}
                onChange={(items) => update("leadership", items)}
                fields={[
                  { key: "rank", label: "Rank / Code", placeholder: "AO" },
                  { key: "name", label: "Name", placeholder: "Full name" },
                  { key: "role", label: "Role", placeholder: "Description of role" },
                ]}
                newItem={() => ({ id: uid(), rank: "", name: "", role: "" })}
              />
            )}
            {active === "divisions" && (
              <ListEditor
                title="Divisions"
                items={content.divisions}
                onChange={(items) => update("divisions", items)}
                fields={[
                  { key: "name", label: "Division Name", placeholder: "Navy" },
                  { key: "head", label: "Head", placeholder: "Division head name" },
                  { key: "desc", label: "Description", placeholder: "What this division does", area: true },
                ]}
                newItem={() => ({ id: uid(), name: "", head: "", desc: "" })}
              />
            )}
            {active === "rules" && (
              <ListEditor
                title="Rules & Regulations"
                items={content.rules}
                onChange={(items) => update("rules", items)}
                fields={[
                  { key: "title", label: "Rule Title", placeholder: "Chain of Command" },
                  { key: "body", label: "Rule Text", placeholder: "Details...", area: true },
                ]}
                newItem={() => ({ id: uid(), title: "", body: "" })}
              />
            )}
            {active === "government" && (
              <ListEditor
                title="Government"
                items={content.government}
                onChange={(items) => update("government", items)}
                fields={[
                  { key: "title", label: "Office", placeholder: "Secretary of Defense" },
                  { key: "name", label: "Name", placeholder: "Full name (or Vacant)" },
                  { key: "note", label: "Description", placeholder: "What this office does", area: true },
                ]}
                newItem={() => ({ id: uid(), title: "", name: "Vacant", note: "" })}
              />
            )}
            {active === "ranks" && (
              <ListEditor
                title="Rank Structure"
                items={content.ranks}
                onChange={(items) => update("ranks", items)}
                fields={[
                  { key: "code", label: "Code", placeholder: "E-1 / O-1 / DIR" },
                  { key: "name", label: "Rank Name", placeholder: "Recruit" },
                  { key: "desc", label: "Description", placeholder: "What this rank means", area: true },
                ]}
                newItem={() => ({ id: uid(), code: "", name: "", desc: "" })}
              />
            )}
            {active === "news" && (
              <ListEditor
                title="News & Updates"
                items={content.news}
                onChange={(items) => update("news", items)}
                fields={[
                  { key: "date", label: "Date", placeholder: "2026-08-28" },
                  { key: "tag", label: "Tag", placeholder: "Staffing / Policy / Development" },
                  { key: "title", label: "Headline", placeholder: "Headline" },
                  { key: "body", label: "Body", placeholder: "Details...", area: true },
                ]}
                newItem={() => ({ id: uid(), date: "", tag: "", title: "", body: "" })}
              />
            )}
            {active === "media" && (
              <ListEditor
                title="Media"
                items={content.media}
                onChange={(items) => update("media", items)}
                fields={[
                  { key: "caption", label: "Caption", placeholder: "Formation — 08.28.26" },
                  { key: "imageUrl", label: "Image URL", placeholder: "https://... (leave blank for placeholder)" },
                ]}
                newItem={() => ({ id: uid(), caption: "", imageUrl: "" })}
              />
            )}
            {active === "applications" && (
              <ListEditor
                title="Applications"
                items={content.applications}
                onChange={(items) => update("applications", items)}
                fields={[
                  { key: "name", label: "Application Name", placeholder: "General Enlistment" },
                  { key: "desc", label: "Description", placeholder: "What this application is for", area: true },
                  { key: "status", label: "Status", options: ["open", "closed"] },
                ]}
                newItem={() => ({ id: uid(), name: "", desc: "", status: "open" as const })}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
        {savedAt && (
          <span className="font-mono text-[10px] text-olive flex items-center gap-1">
            <Check size={12} /> saved {savedAt}
          </span>
        )}
        <button
          onClick={save}
          disabled={saving}
          className="bg-gold text-black font-mono text-[11px] uppercase tracking-wide font-semibold px-5 py-2.5 hover:bg-white transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>

      <Dock items={SECTIONS} active={active} onSelect={setActive} />
    </div>
  );
}

type Field = { key: string; label: string; placeholder?: string; area?: boolean; options?: string[] };

function ListEditor<T extends { id: string }>({
  title,
  items,
  onChange,
  fields,
  newItem,
}: {
  title: string;
  items: T[];
  onChange: (items: T[]) => void;
  fields: Field[];
  newItem: () => T;
}) {
  function updateItem(id: string, key: string, value: string) {
    onChange(items.map((it) => (it.id === id ? { ...it, [key]: value } : it)) as unknown as T[]);
  }
  function removeItem(id: string) {
    onChange(items.filter((it) => it.id !== id));
  }
  function addItem() {
    onChange([...items, newItem()]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-bold">{title}</h2>
        <button
          onClick={addItem}
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide text-gold border border-golddim px-3 py-2 hover:bg-panel2 transition-colors"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item: any) => (
          <div key={item.id} className="border border-border bg-panel p-5 relative">
            <button
              onClick={() => removeItem(item.id)}
              className="absolute top-4 right-4 text-textfaint hover:text-red transition-colors"
              aria-label="Remove"
            >
              <Trash2 size={15} />
            </button>
            <div className="grid gap-4 pr-8">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className="block font-mono text-[9px] uppercase tracking-wide text-textfaint mb-1.5">
                    {f.label}
                  </label>
                  {f.options ? (
                    <select
                      value={item[f.key] ?? f.options[0]}
                      onChange={(e) => updateItem(item.id, f.key, e.target.value)}
                      className="w-full bg-panel2 border border-border focus:border-golddim outline-none px-3 py-2 text-sm text-white"
                    >
                      {f.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : f.area ? (
                    <textarea
                      value={item[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => updateItem(item.id, f.key, e.target.value)}
                      rows={3}
                      className="w-full bg-panel2 border border-border focus:border-golddim outline-none px-3 py-2 text-sm text-white resize-none"
                    />
                  ) : (
                    <input
                      value={item[f.key] ?? ""}
                      placeholder={f.placeholder}
                      onChange={(e) => updateItem(item.id, f.key, e.target.value)}
                      className="w-full bg-panel2 border border-border focus:border-golddim outline-none px-3 py-2 text-sm text-white"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-textfaint text-sm font-mono py-8 text-center border border-dashed border-border">
            Nothing here yet — click Add.
          </div>
        )}
      </div>
    </div>
  );
}
