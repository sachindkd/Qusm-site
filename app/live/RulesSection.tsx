"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, ChevronDown, LifeBuoy, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

type Rule = {
  id?: string;
  title?: string;
  category?: string;
  body?: string;
  order?: number;
  active?: boolean;
  status?: string;
};

const clean = (items: Rule[] = []) =>
  items
    .filter((x) => x?.active !== false && x?.status !== "inactive" && x?.status !== "draft")
    .sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));

const SUPPORT_URL = "https://discord.com/channels/1426271681969655913/1506712548433596638";
const DISCORD_TERMS_URL = "https://discord.com/terms";
const DISCORD_GUIDELINES_URL = "https://discord.com/guidelines";
const ROBLOX_TERMS_URL = "https://en.help.roblox.com/hc/en-us/articles/115004647846-Roblox-Terms-of-Use";
const ROBLOX_STANDARDS_URL = "https://en.help.roblox.com/hc/en-us/articles/203313410-Roblox-Community-Standards";

const legalLinks = [
  { label: "Discord Terms", href: DISCORD_TERMS_URL },
  { label: "Discord Guidelines", href: DISCORD_GUIDELINES_URL },
  { label: "Roblox Terms", href: ROBLOX_TERMS_URL },
  { label: "Roblox Standards", href: ROBLOX_STANDARDS_URL },
];

export default function RulesSection() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/content", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive) return;
        setRules(clean(Array.isArray(data?.rules) ? data.rules : []));
      })
      .catch(() => alive && setRules([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section id="rules" className="relative border-t border-white/10 py-28 md:py-40">
      <div className="mx-auto max-w-[1500px] px-5 md:px-10">
        <div className="mb-14 flex items-end justify-between gap-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono text-[9px] tracking-[.35em] text-[#d4b56a]">05 / RULES & STANDARDS</span>
              <span className="rounded-full border border-[#d4b56a]/20 bg-[#d4b56a]/5 px-2.5 py-1 font-mono text-[8px] uppercase tracking-[.18em] text-[#d4b56a]/70">
                Updated 31 AUG 2026
              </span>
            </div>
            <h2 className="mt-5 text-6xl font-semibold tracking-[-.07em] md:text-8xl">THE<br/><span className="text-[#d4b56a]">RULEBOOK.</span></h2>
            <p className="mt-7 max-w-2xl text-sm leading-7 text-white/40 md:text-base">
              Official FBMR community standards. Read every rule before participating in the community, affiliated games, or staff operations.
            </p>
          </div>
          <BookOpen className="hidden text-[#d4b56a] md:block" size={28}/>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 animate-pulse border border-white/10 bg-white/[.025]" />)}
          </div>
        ) : rules.length ? (
          <div className="space-y-2">
            {rules.map((rule, i) => {
              const key = rule.id || `${rule.title || "rule"}-${i}`;
              const expanded = open === key;
              return (
                <motion.article key={key} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="border border-white/10 bg-[#0b0e0c] transition-colors hover:border-[#d4b56a]/20">
                  <button onClick={() => setOpen(expanded ? null : key)} aria-expanded={expanded} className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left md:px-7">
                    <span className="flex min-w-0 items-center gap-4">
                      <span className="font-mono text-[9px] text-[#d4b56a]">{String(i + 1).padStart(2, "0")}</span>
                      <span className="min-w-0">
                        <span className="block break-words text-base font-semibold md:text-lg">{rule.title || `Rule ${i + 1}`}</span>
                        {rule.category && <span className="mt-1 block font-mono text-[8px] uppercase tracking-[.18em] text-white/30">{rule.category}</span>}
                      </span>
                    </span>
                    <ChevronDown size={17} className={`shrink-0 text-[#d4b56a] transition-transform ${expanded ? "rotate-180" : ""}`} />
                  </button>
                  {expanded && (
                    <div className="border-t border-white/10 px-5 py-6 text-sm leading-7 text-white/55 md:px-7">
                      {rule.body || "No additional details have been published for this rule."}
                    </div>
                  )}
                </motion.article>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 px-6 py-16 text-center">
            <BookOpen className="mx-auto mb-4 text-[#d4b56a]/50" size={28}/>
            <h3 className="text-2xl">No rules published yet.</h3>
            <p className="mt-2 text-sm text-white/30">Rules will appear here once published through Staff Management.</p>
          </div>
        )}

        <div className="mt-10 grid gap-3 lg:grid-cols-[1.15fr_1fr]">
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between border border-[#d4b56a]/25 bg-[#d4b56a]/[.055] px-5 py-5 transition-all hover:border-[#d4b56a]/50 hover:bg-[#d4b56a]/[.09] md:px-7"
          >
            <span className="flex items-center gap-4">
              <span className="flex h-10 w-10 items-center justify-center border border-[#d4b56a]/20 bg-black/20 text-[#d4b56a]"><LifeBuoy size={18}/></span>
              <span>
                <span className="block font-mono text-[8px] uppercase tracking-[.2em] text-[#d4b56a]/70">Need assistance?</span>
                <span className="mt-1 block text-base font-semibold">Open the FBMR Assistance channel</span>
              </span>
            </span>
            <ArrowUpRight className="shrink-0 text-[#d4b56a] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" size={18}/>
          </a>

          <div className="border border-white/10 bg-[#0b0e0c] px-5 py-5 md:px-7">
            <div className="flex items-center gap-3">
              <ShieldCheck size={18} className="text-[#d4b56a]" />
              <div>
                <div className="font-mono text-[8px] uppercase tracking-[.2em] text-white/30">Platform requirements</div>
                <div className="mt-1 text-sm font-semibold">Discord & Roblox policies</div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3">
              {legalLinks.map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1.5 text-xs text-white/45 transition-colors hover:text-[#d4b56a]">
                  {link.label}
                  <ArrowUpRight size={12} className="text-[#d4b56a]/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-[11px] leading-5 text-white/25">
          These community rules supplement the official policies of Discord and Roblox. Where a platform policy is stricter, the platform policy applies. Staff may take proportionate action based on severity.
        </p>
      </div>
    </section>
  );
}
