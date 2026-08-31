import FBMRExperience from "./FBMRExperience";
import NSASection from "./NSASection";
import StoreSection from "./StoreSection";
import RulesSection from "./RulesSection";
import CustomSections from "./CustomSections";
import { loadContent } from "@/lib/content-store";
export const dynamic = "force-dynamic";
export default async function LivePage() {
  const content = await loadContent();
  return <><FBMRExperience /><NSASection /><RulesSection /><StoreSection /><CustomSections sections={content.customSections || []} /></>;
}
