import { verifyDiscordSignature } from "@/lib/discord/quota/security";
import { handleGet, handlePost } from "@/lib/discord/quota/handler";
import { jsonResponse } from "@/lib/discord/quota/discord-api";
import { runQuotaReminderCheck } from "@/lib/discord/quota/reminders";
import { handleTicketPost } from "@/lib/discord/tickets/handler";
import { handleStaffCommand, handleStaffComponent, handleStaffModal, handleStaffApproval, handleProfileSync } from "@/lib/discord/staff-management";

export async function GET(){try{await runQuotaReminderCheck("startup")}catch(error){console.error("[quota-reminder] startup scan failed",error)}return handleGet()}
export async function POST(request:Request){const body=await request.text();const timestamp=request.headers.get("x-signature-timestamp")||"";const signature=request.headers.get("x-signature-ed25519")||"";if(!verifyDiscordSignature(body,timestamp,signature))return jsonResponse({error:"invalid signature"},401);try{const interaction=JSON.parse(body);if(interaction?.type===1)return jsonResponse({type:1});const customId=String(interaction?.data?.custom_id||"");const commandName=String(interaction?.data?.name||"");
 if(commandName==="staff-panel")return handleStaffCommand(interaction);
 if(commandName==="profile-sync")return handleProfileSync(interaction);
 if(customId.startsWith("staffcase:"))return handleStaffApproval(interaction);
 if(customId.startsWith("staffmodal:"))return handleStaffModal(interaction);
 if(customId.startsWith("staff:"))return handleStaffComponent(interaction);
 if(commandName==="operations-halt"){console.info("[operations-halt] interaction received",{interactionId:interaction.id});return handlePost(interaction)}
 try{await runQuotaReminderCheck("startup")}catch(error){console.error("[quota-reminder] startup scan failed",error)}
 const isTicket=commandName==="ticket-log"||customId.startsWith("ticket:")||customId.startsWith("tac:")||customId.startsWith("trj:");
 console.info(isTicket?"[ticket] interaction received":"[quota] interaction received",{interactionId:interaction.id,interactionType:interaction.type,userId:interaction?.member?.user?.id||interaction?.user?.id,customId});
 return isTicket?handleTicketPost(interaction):handlePost(interaction)
 }catch{return jsonResponse({error:"invalid json"},400)}}
