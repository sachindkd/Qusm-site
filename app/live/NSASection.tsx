"use client";

import { motion } from "framer-motion";
import { LockKeyhole, ShieldAlert, Sparkles, Search, Scale, Cpu } from "lucide-react";

const agencies = [
  {
    code: "OPR",
    name: "Office of Professional Responsibility",
    icon: Scale,
    description:
      "Handles internal affairs, professional standards, misconduct investigations, personnel accountability, and integrity matters within DHS.",
    scope: "Personnel · Internal Affairs · Professional Standards",
  },
  {
    code: "HSI",
    name: "Homeland Security Investigations",
    icon: Search,
    description:
      "Handles criminal, intelligence, and other investigative operations involving domestic QUSM-related threats and violations regarding personnel up to VPOTUS.",
    scope: "Criminal · Intelligence · Investigations",
  },
  {
    code: "CISA",
    name: "Cybersecurity and Infrastructure Security Agency",
    icon: Cpu,
    description:
      "Handles cybersecurity, cyber threat response, digital security, and resilience against cyber threats to QUSM.",
    scope: "Cybersecurity · Threat Response · Resilience",
  },
];

export default function NSASection() {
  return (
    <section id="investigations" className="relative overflow-hidden border-t border-white/10 bg-[#070908] px-5 py-24 sm:px-8 lg:px-12 lg:py-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(199,170,104,.10),transparent_34%),radial-gradient(circle_at_15%_80%,rgba(255,255,255,.035),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-14 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3 font-mono text-[9px] tracking-[.28em] text-[#c7aa68]">
              <ShieldAlert size={14} /> 05 / INVESTIGATIONS
            </div>
            <h2 className="max-w-4xl text-[clamp(3rem,8vw,7rem)] font-semibold leading-[.86] tracking-[-.06em]">
              NATIONAL SECURITY<br /><span className="text-[#c7aa68]">AGENCY.</span>
            </h2>
          </div>
          <div className="max-w-sm border-l border-[#c7aa68]/40 pl-5 font-mono text-[9px] uppercase leading-6 text-white/35">
            Highest security authority · Roleplay & out-of-roleplay jurisdiction · CM+ controlled
          </div>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: .2 }}
          transition={{ duration: .5 }}
          className="relative overflow-hidden border border-[#c7aa68]/25 bg-[#0c100d]"
        >
          <div className="grid lg:grid-cols-[1.2fr_.8fr]">
            <div className="p-7 sm:p-10 lg:p-14">
              <div className="mb-7 inline-flex items-center gap-2 border border-[#c7aa68]/25 bg-[#c7aa68]/[.06] px-3 py-2 font-mono text-[8px] tracking-[.18em] text-[#c7aa68]">
                <LockKeyhole size={12} /> RESTRICTED AUTHORITY
              </div>
              <h3 className="text-3xl font-semibold sm:text-4xl">The highest security authority in QUSM.</h3>
              <p className="mt-6 max-w-3xl text-sm leading-7 text-white/50 sm:text-base">
                The National Security Agency handles matters involving national security, intelligence, investigations, and serious threats across QUSM. Its jurisdiction covers both in-roleplay and out-of-roleplay security matters where the safety, integrity, or continuity of the community is concerned.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-white/50 sm:text-base">
                NSA holds the highest authority among QUSM security and investigative agencies. Its mandate can extend across security agencies and staff matters when a national-security issue requires intervention. This authority exists to protect the organization, not to replace ordinary chain-of-command procedures.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                {["National Security", "Intelligence", "Investigations", "Security Oversight", "RP + OORP"].map(x => (
                  <span key={x} className="border border-white/10 bg-white/[.025] px-3 py-2 font-mono text-[8px] uppercase tracking-[.12em] text-white/40">{x}</span>
                ))}
              </div>
            </div>

            <aside className="border-t border-white/10 bg-black/20 p-7 sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <div className="font-mono text-[8px] tracking-[.2em] text-white/25">ACCESS PROTOCOL</div>
              <div className="mt-5 flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#c7aa68]/30 bg-[#c7aa68]/[.06] text-[#c7aa68]"><LockKeyhole size={17} /></div>
                <div>
                  <h4 className="text-xl font-semibold">CM+ only</h4>
                  <p className="mt-2 text-sm leading-6 text-white/40">Only Chairman-level and above may access, manage, or directly act within NSA. No lower rank may operate the agency.</p>
                </div>
              </div>
              <div className="mt-10 border-t border-white/10 pt-8">
                <div className="flex items-center gap-2 font-mono text-[8px] tracking-[.18em] text-[#c7aa68]"><Sparkles size={12} /> FIELD MOTTO</div>
                <p className="mt-4 text-2xl font-semibold leading-tight text-white/80">“We larp, we love, we lie.”</p>
                <p className="mt-3 text-xs leading-5 text-white/30">Because sometimes the most classified operation is keeping a straight face.</p>
              </div>
            </aside>
          </div>
        </motion.article>

        <div className="mt-20 mb-10 flex flex-col gap-3 border-t border-white/10 pt-10 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="font-mono text-[9px] tracking-[.28em] text-[#c7aa68]">06 / INVESTIGATION UNITS</div>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Other security agencies.</h3>
          </div>
          <p className="max-w-md text-xs leading-6 text-white/30">These agencies operate below NSA and handle their defined investigative, personnel, and security responsibilities.</p>
        </div>

        <div className="grid gap-px overflow-hidden border border-white/10 bg-white/10 md:grid-cols-3">
          {agencies.map((agency, index) => {
            const Icon = agency.icon;
            return (
              <motion.article
                key={agency.code}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: .15 }}
                transition={{ duration: .4, delay: index * .08 }}
                className="group bg-[#0b0e0c] p-7 transition-colors duration-300 hover:bg-[#101410] sm:p-9"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center border border-[#c7aa68]/20 bg-[#c7aa68]/[.05] text-[#c7aa68]"><Icon size={17} /></div>
                  <span className="font-mono text-[9px] tracking-[.2em] text-white/20">0{index + 1}</span>
                </div>
                <div className="mt-8 font-mono text-[9px] tracking-[.25em] text-[#c7aa68]">{agency.code}</div>
                <h4 className="mt-3 text-2xl font-semibold leading-tight">{agency.name}</h4>
                <p className="mt-5 text-sm leading-6 text-white/40">{agency.description}</p>
                <div className="mt-7 border-t border-white/10 pt-5 font-mono text-[8px] uppercase tracking-[.14em] text-white/25">{agency.scope}</div>
              </motion.article>
            );
          })}
        </div>

        <div className="mt-10 flex items-center gap-4 border-t border-white/10 pt-6 font-mono text-[8px] uppercase tracking-[.18em] text-white/25">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c7aa68]" /> NSA remains the highest security authority; other investigation units follow below it in the security structure.
        </div>
      </div>
    </section>
  );
}
