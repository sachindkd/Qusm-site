"use client";

import { useState } from "react";

export default function AuthorizePage() {
  const [loading, setLoading] = useState(false);

  function authorize() {
    setLoading(true);
    window.location.href = "/api/auth/signin/discord";
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] shadow-2xl backdrop-blur-xl overflow-hidden">
          <div className="px-8 pt-10 pb-8 text-center">
            <div className="mx-auto mb-6 h-20 w-20 rounded-2xl bg-indigo-500/15 border border-indigo-400/20 flex items-center justify-center shadow-lg shadow-indigo-950/30">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-indigo-300" fill="currentColor" aria-hidden="true">
                <path d="M19.54 5.07A16.8 16.8 0 0 0 15.46 3.8l-.52 1.06a15.2 15.2 0 0 0-5.88 0L8.54 3.8a16.8 16.8 0 0 0-4.08 1.27C1.87 8.88 1.17 12.75 1.52 16.57a16.7 16.7 0 0 0 5.15 2.6l1.25-1.7a10.8 10.8 0 0 1-1.97-.96l.48-.37c3.8 1.78 8.02 1.78 11.78 0l.5.37c-.64.38-1.3.7-1.98.96l1.25 1.7a16.7 16.7 0 0 0 5.15-2.6c.41-4.43-.7-8.27-3.59-11.5ZM8.02 14.48c-1.14 0-2.08-1.04-2.08-2.32s.92-2.33 2.08-2.33 2.1 1.04 2.08 2.33c0 1.28-.92 2.32-2.08 2.32Zm7.96 0c-1.14 0-2.08-1.04-2.08-2.32s.92-2.33 2.08-2.33 2.1 1.04 2.08 2.33c0 1.28-.92 2.32-2.08 2.32Z" />
              </svg>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-300/80">FBMRP</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Welcome to FBMRP</h1>
            <p className="mt-3 text-sm leading-6 text-white/60">Authorize with Discord to continue. Your Discord profile will be used to personalize your experience.</p>
            <button onClick={authorize} disabled={loading} className="mt-8 w-full rounded-xl bg-indigo-500 px-5 py-3.5 text-sm font-semibold shadow-lg shadow-indigo-950/40 transition hover:bg-indigo-400 disabled:cursor-wait disabled:opacity-60">
              {loading ? "Connecting to Discord…" : "Authorize with Discord"}
            </button>
            <p className="mt-5 text-xs text-white/35">Secure Discord authorization · No password required</p>
          </div>
          <div className="border-t border-white/10 bg-black/10 px-8 py-5 text-center text-xs text-white/40">After authorization, your profile can display your Discord avatar, username and server roles.</div>
        </div>
      </div>
    </main>
  );
}
