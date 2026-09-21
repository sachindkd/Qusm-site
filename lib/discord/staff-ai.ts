import { ephemeral } from "@/lib/discord/quota/discord-api";
import { interactionUserId, interactionDisplayName, interactionUsername } from "@/lib/discord/quota/types";
import { askPerformanceAI } from "@/lib/discord/performance";
import { getStaffProfile, isHighcom } from "@/lib/staff-management";

export async function handleStaffAskAi(interaction:any){
  if(!(await isHighcom(interaction))) return ephemeral("Only COS+/HighCOM can use /ask-ai.");
  const question=String((interaction?.data?.options||[]).find((x:any)=>x?.name==="question")?.value||"").trim();
  const targetId=String((interaction?.data?.options||[]).find((x:any)=>x?.name==="user")?.value||"").trim();
  const resolved=targetId?interaction?.data?.resolved?.users?.[targetId]:null;
  const username=String(resolved?.username||resolved?.global_name||"");
  if(!question)return ephemeral("Please provide a question.");
  try{
    const profile=targetId?await getStaffProfile(targetId):null;
    const profileContext=profile?`\n\nAdditional Staff Profile context (authoritative QUSM management layer): username=${profile.username}; rank=${profile.rank}; status=${profile.status}; merits=${profile.merits}; demerits=${profile.demerits}; net=${profile.net}; rankLocked=${profile.rankLocked}; warnings=${profile.warnings.length}; strikes=${profile.strikes.length}; quotaMinutes=${profile.quotaMinutes}; tickets=${profile.tickets}; departments=${JSON.stringify(profile.departments)}; promotionEligibility=${profile.eligibility.eligible}; eligibilityReasons=${profile.eligibility.reasons.join("; ")}.`:"";
    const result=await askPerformanceAI(interactionUserId(interaction),question+profileContext,targetId,username);
    const text=String(result.answer||"").slice(0,1900);
    return {type:4,data:{content:`**QUSM HighCOM AI**\n${text}${profile?"\n\n_Staff Profile data was included from the centralized management layer._":""}`,flags:64}};
  }catch(e){return ephemeral(`⚠️ /ask-ai could not answer: ${e instanceof Error?e.message:"unknown error"}`)}
}
