import FBMRExperience from "./FBMRExperience";
import MediaSection from "./MediaSection";
import NSASection from "./NSASection";
import StoreSection from "./StoreSection";
import CustomSections from "./CustomSections";
import { loadContent } from "@/lib/content-store";
export const dynamic = "force-dynamic";
export default async function LivePage() {
  const content = await loadContent();
  return <><FBMRExperience /><MediaSection /><NSASection /><StoreSection /><CustomSections sections={content.customSections || []} /></>;
}
