import Link from "next/link";
import { cookies } from "next/headers";
import { ShieldCheck } from "lucide-react";
import FBMRExperience from "./FBMRExperience";
import AmbientConstellation from "./AmbientConstellation";
import MobileNavigation from "@/components/MobileNavigation";
import NSASection from "./NSASection";
import RulesSection from "./RulesSection";
import StoreSection from "./StoreSection";
import CustomSections from "./CustomSections";
import PublicCMSSections from "./PublicCMSSections";
import { loadContent } from "@/lib/content-store";
import { DISCORD_SESSION_COOKIE, readDiscordSession } from "@/lib/discord-session";

export const dynamic = "force-dynamic";

const SPECIAL_OWNER_ID = "1210317929485181000";

export default async function LivePage() {
  const content = await loadContent();
  const cookieStore = await cookies();
  const session = readDiscordSession(cookieStore.get(DISCORD_SESSION_COOKIE)?.value);
  const showPermissionTester = session?.id === SPECIAL_OWNER_ID;

  return (
    <>
      <AmbientConstellation />
      <FBMRExperience />
      {showPermissionTester && (
        <Link
          href="/permission-tester"
          className="fixed right-16 top-4 z-[240] flex items-center gap-2 rounded-full border border-amber-300/30 bg-[#050706]/95 px-3 py-2 text-[9px] font-semibold tracking-[.18em] text-amber-200 shadow-xl backdrop-blur-xl transition hover:border-amber-300/60 hover:bg-amber-300/10 md:right-5 md:top-5 md:px-4 md:py-2 md:text-[10px]"
          aria-label="Open Discord Permission Tester"
        >
          <ShieldCheck size={14} strokeWidth={1.7} />
          TESTER
        </Link>
      )}
      <NSASection />
      <RulesSection />
      <PublicCMSSections />
      <StoreSection />
      <CustomSections sections={content.customSections || []} />
      <MobileNavigation />
    </>
  );
}
