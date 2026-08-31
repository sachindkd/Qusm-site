import FBMRExperience from "./FBMRExperience";
import NSASection from "./NSASection";
import RulesSection from "./RulesSection";
import StoreSection from "./StoreSection";
import CustomSections from "./CustomSections";
import PublicCMSSections from "./PublicCMSSections";
import { loadContent } from "@/lib/content-store";
export const dynamic = "force-dynamic";
export default async function LivePage() {
  const content = await loadContent();
  return <><FBMRExperience /><NSASection /><RulesSection /><PublicCMSSections /><StoreSection /><CustomSections sections={content.customSections || []} /></>;
}
