"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDenied(new URLSearchParams(window.location.search).get("error") === "AccessDenied");
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated") router.replace("/admin");
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-6">
      <div className="w-full max-w-sm border border-border bg-panel p-10">
        <div className="font-mono text-[10px] tracking-[2px] text-golddim uppercase mb-2">
          Restricted Access
        </div>
        <h1 className="font-serif text-2xl font-bold mb-6">Admin Sign In</h1>
        <p className="text-sm text-textdim mb-8 leading-relaxed">
          Only authorized QUSM administrator accounts may sign in. Access is granted by Google
          account, not by password.
        </p>

        {denied && (
          <div className="flex items-start gap-2 border border-red text-red text-xs mb-6 p-3">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>That Google account isn't authorized for admin access.</span>
          </div>
        )}

        <button
          onClick={() => signIn("google", { callbackUrl: "/admin" })}
          className="w-full flex items-center justify-center gap-3 bg-white text-black font-medium text-sm py-3 hover:bg-gray-100 transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z"/>
            <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z"/>
          </svg>
          Sign in with Google
        </button>

        <div className="mt-8 pt-6 border-t border-border font-mono text-[9px] text-textfaint tracking-wide">
          <a href="/" className="hover:text-textdim transition-colors">&larr; back to site</a>
        </div>
      </div>
    </div>
  );
}
