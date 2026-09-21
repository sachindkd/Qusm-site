import { discordApi, ephemeral, interactionCallback, interactionFollowup, modalValues } from "@/lib/discord/quota/discord-api";
import { interactionDisplayName, interactionUserId, interactionUsername } from "@/lib/discord/quota/types";
import { addPoints, addRecognition, addWarning, changeRank, createCase, decideCase, getStaffProfile, isHighcom, listPendingCases, openStaffByUsername, setRankLock } from "@/lib/staff-management";

function option(interaction:any,name:string){ return (interaction?.data?.options||[]).find((x:any)=>x?.name===name); }
function targetId(interaction:any){ return String(interaction?.data?.custom_id||"").split(":")[2] || ""; }
function issuer(interaction:any){ return { id:interactionUserId(interaction), username:interactionDisplayName(interaction)||interactionUsername(interaction)||interactionUserId(interaction) }; }

function profileEmbed(p:any){
  const eligibility=p.eligibility;
  return { title:`QUSM Staff Profile • ${p.username}`, description:`<@${p.userId}>\n\n**Rank:** ${p.rank}\n**Status:** ${p.status}\n**Rank Lock:** ${p.rankLocked?"🔒 ACTIVE":"🔓 None"}\n\n**Points**\n🟢 Merit: **+${p.merits}**\n🔴 Demerit: **-${p.demerits}**\n⚖️ Net: **${p.net>=0?"+":""}${p.net}**\n\n**Performance**\nQuota: **${p.quotaMinutes} min** • Tickets: **${p.tickets}**\n\n**Discipline**\nWarnings: **${p.warnings.length}** • Strikes: **${p.strikes.length}**\n\n**Promotion Eligibility:** ${eligibility.eligible?"✅ ELIGIBLE":"⛔ BLOCKED"}\n${eligibility.reasons.length?eligibility.reasons.map((x:string)=>`• ${x}`).join("\n"):"All configured requirements passed."}` , color: eligibility.eligible?0x57f287:0xed4245, fields:[
    {name:"Departments",value:p.departments.length?p.departments.map((x:any)=>String(x.name||x)).join(", "):"None",inline:true},
    {name:"Recognition",value:String(p.recognition.length),inline:true},
    {name:"History",value:`Promotions: ${p.promotionHistory.length}\nDemotions: ${p.demotionHistory.length}`,inline:true}
  ], timestamp:new Date().toISOString() };
}
function components(p:any){
  return [{type:1,components:[
    {type:2,style:3,label:"+ Merit",custom_id:`staff:merit:${p.userId}`},
    {type:2,style:4,label:"− Demerit",custom_id:`staff:demerit:${p.userId}`},
    {type:2,style:2,label:"Warning",custom_id:`staff:warning:${p.userId}`},
    {type:2,style:2,label:"Strike Request",custom_id:`staff:strike:${p.userId}`},
    {type:2,style:1,label:p.rankLocked?"Remove Rank Lock":"Apply Rank Lock",custom_id:`staff:lock:${p.userId}`}
  ]},{type:1,components:[
    {type:2,style:3,label:"Promote",custom_id:`staff:promote:${p.userId}`},
    {type:2,style:4,label:"Demote",custom_id:`staff:demote:${p.userId}`},
    {type:2,style:1,label:"Recognition",custom_id:`staff:recognition:${p.userId}`},
    {type:2,style:2,label:"Refresh",custom_id:`staff:refresh:${p.userId}`},
    {type:2,style:2,label:"Pending Approvals",custom_id:`staff:approvals:${p.userId}`}
  ]}];
}
function modal(customId:string,title:string,labels:string[]){ return {type:9,data:{custom_id:customId,title,components:labels.map((label,i)=>({type:1,components:[{type:4,custom_id:`f${i}`,label,style:2,required:true,max_length:1000}]}))}}; }

export async function handleStaffCommand(interaction:any){
  if(!(await isHighcom(interaction))) return ephemeral("Only authorized COS+/HighCOM users can use Staff Management.");
  const user=issuer(interaction); const username=String(option(interaction,"username")?.value||"").trim();
  if(!username) return ephemeral("Enter the exact Discord username to open the Staff Profile.");
  try { const p=await openStaffByUsername(username,user.id,user.username); if(!p) return ephemeral("Staff profile not found."); return {type:4,data:{embeds:[profileEmbed(p)],components:components(p),flags:64}}; }
  catch(e){ return ephemeral(`⚠️ ${e instanceof Error?e.message:"Unable to open Staff Profile."}`); }
}

async function refresh(interaction:any,userId:string){ const p=await getStaffProfile(userId); if(!p) return ephemeral("Staff profile not found."); return {type:7,data:{embeds:[profileEmbed(p)],components:components(p)}}; }

export async function handleStaffComponent(interaction:any){
  if(!(await isHighcom(interaction))) return ephemeral("Only authorized COS+/HighCOM users can use Staff Management.");
  const id=String(interaction?.data?.custom_id||""); const parts=id.split(":"); const action=parts[1]||""; const userId=parts[2]||""; if(!userId) return ephemeral("Invalid Staff Profile action.");
  if(action==="refresh") return refresh(interaction,userId);
  if(action==="approvals") { const cases=await listPendingCases(userId); return ephemeral(cases.length?cases.map((c:any)=>`**#${c.id}** ${c.case_type} — ${c.reason}`).join("\n"):"No pending approvals for this staff member."); }
  const title=action.replace(/-/g," ").replace(/\b\w/g,x=>x.toUpperCase());
  if(["merit","demerit","warning","strike","promote","demote","recognition"].includes(action)) return modal(`staffmodal:${action}:${userId}`,title,[action==="merit"||action==="demerit"?"Amount":"Reason",action==="merit"||action==="demerit"?"Reason":"Confirmation / reason"]);
  if(action==="lock") return modal(`staffmodal:lock:${userId}`,"Rank Lock",["Reason"]);
  return ephemeral("Unknown Staff Profile action.");
}

export async function handleStaffModal(interaction:any){
  if(!(await isHighcom(interaction))) return ephemeral("Only authorized COS+/HighCOM users can use Staff Management.");
  const id=String(interaction?.data?.custom_id||""); const parts=id.split(":"); const action=parts[1]||""; const userId=parts[2]||""; const values=modalValues(interaction); const f0=String(values.f0||"").trim(); const f1=String(values.f1||"").trim(); const u=issuer(interaction);
  try{
    await interactionCallback(interaction,{type:5,data:{flags:64}});
    let p:any;
    if(action==="merit"||action==="demerit") p=await addPoints(userId,Number(f0),action,f1,u.id,u.username);
    else if(action==="warning") p=await addWarning(userId,f0||f1,u.id,u.username);
    else if(action==="recognition") p=await addRecognition(userId,f0||f1,u.id,u.username);
    else if(action==="strike") { const caseId=await createCase(userId,"strike",f0||f1,u.id,u.username,{manual:true}); await interactionFollowup(interaction,{content:`⚠️ Strike request **#${caseId}** created. HighCOM approval is required; no strike was applied yet.`,flags:64}); return new Response(null,{status:204}); }
    else if(action==="lock") { const current=await getStaffProfile(userId); p=await setRankLock(userId,!Boolean(current?.rankLocked),f0,u.id,u.username); }
    else if(action==="promote") p=await changeRank(userId,1,f0||f1,u.id,u.username,false);
    else if(action==="demote") p=await changeRank(userId,-1,f0||f1,u.id,u.username,true);
    else throw new Error("Unknown action.");
    await interactionFollowup(interaction,{embeds:[profileEmbed(p)],components:components(p),flags:64});
  }catch(e){ await interactionFollowup(interaction,{content:`⚠️ ${e instanceof Error?e.message:"Staff action failed."}`,flags:64}); }
  return new Response(null,{status:204});
}

export async function handleStaffApproval(interaction:any){
  if(!(await isHighcom(interaction))) return ephemeral("Only authorized COS+/HighCOM users can approve Staff cases.");
  const id=String(interaction?.data?.custom_id||""); const [_,decision,caseId]=id.split(":");
  try { const p=await decideCase(Number(caseId),decision==="approve"?"approved":"denied",interactionUserId(interaction),interactionDisplayName(interaction)||interactionUsername(interaction)); return ephemeral(`Case **#${caseId}** ${decision==="approve"?"approved":"denied"}.${p?` Updated profile: **${p.username}**.`:""}`); } catch(e){ return ephemeral(`⚠️ ${e instanceof Error?e.message:"Approval failed."}`); }
}
