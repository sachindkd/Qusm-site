"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ShieldCheck } from "lucide-react";

const SPECIAL_OWNER_ID = "1210317929485181000";

export default function PermissionTesterNav() {
  const { data: session, status } = useSession();
  const user = session?.user as ({ id?: string; discordId?: string } | undefined);
  const discordId = user?.discordId ?? user?.id;

  if (status !== "authenticated" || discordId !== SPECIAL_OWNER_ID) return null;

  return (
    <Link
      href="/permission-tester"
      className="fixed right-16 top-4 z-[240] flex items-center gap-2 rounded-full border border-amber-300/30 bg-[#050706]/95 px-3 py-2 text-[9px] font-semibold tracking-[.18em] text-amber-200 shadow-xl backdrop-blur-xl transition hover:border-amber-300/60 hover:bg-amber-300/10 md:right-5 md:top-5 md:px-4 md:py-2 md:text-[10px]"
      aria-label="Open Discord Permission Tester"
    >
      <ShieldCheck size={14} strokeWidth={1.7} />
      TESTER
    </Link>
  );
}
