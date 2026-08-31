import LiveHomeRevampV3 from "./LiveHomeRevampV3";
import NSASection from "./NSASection";
import InvestigationAgenciesSection from "./InvestigationAgenciesSection";

export const dynamic = "force-dynamic";

export default function LivePage() {
  return <><LiveHomeRevampV3 /><NSASection /><InvestigationAgenciesSection /></>;
}
