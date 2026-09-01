"use client";

import { useState } from "react";

export default function AuthorizePage() {
  const [loading, setLoading] = useState(false);
  function authorize() { setLoading(true); window.location.href = "/api/auth/signin/discord?callbackUrl=/staff"; }
  return (
    <main className="min-h-screen bg-[#060a12] text-white flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="px-7 sm:px-9 pt-9 pb-8 text-center">
            <div className="mx-auto h-20 w-20 rounded-2xl border border-amber-300/20 bg-amber-300/10 flex items-center justify-center">
              <span className="text-3xl">✦</span>
            </div>
            <p className="mt-6 font-mono text-[9px] tracking-[3px] text-amber-300 uppercase">FBMRP · STAFF ACCESS</p>
            <h1 className="mt-3 text-3xl sm:text-4xl font-bold tracking-tight">Staff Login</h1>
            <p className="mt-3 text-sm leading-6 text-white/55">Sign in with Discord to verify your FBMRP staff role and open the Staff Panel.</p>
            <button onClick={authorize} disabled={loading} className="mt-8 w-full rounded-xl border border-amber-200/20 bg-amber-300 px-5 py-3.5 text-sm font-bold text-black transition hover:bg-amber-200 disabled:opacity-60">
              {loading ? "CONNECTING TO DISCORD…" : "CONTINUE WITH DISCORD"}
            </button>
            <p className="mt-5 text-[11px] text-white/30">Staff access is controlled by your live Discord server roles.</p>
          </div>
          <div className="border-t border-white/10 bg-black/10 px-7 py-5 text-center font-mono text-[8px] uppercase tracking-wider text-white/30">Authorized staff only · FBMRP Command Center</div>
        </div>
      </div>
    </main>
  );
}
