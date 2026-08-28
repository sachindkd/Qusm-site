import fs from "fs/promises";
import path from "path";
import { gzipSync, gunzipSync } from "zlib";
import { FBMRP_GUILD_ID } from "./discord-roles";

export type Content={org:any;announcements:any[];calendar:any[];leadership:any[];divisions:any[];rules:any[];government:any[];ranks:any[];news:any[];media:any[];applications:any[]};
const filePath=path.join(process.cwd(),"data","content.json");
const defaults:Content={org:{name:"FBMRP",fullName:"Fort Bliss Military Roleplay",owner:"",coOwner:"",status:"active"},announcements:[],calendar:[],leadership:[],divisions:[],rules:[],government:[],ranks:[],news:[],media:[],applications:[]};
const CMS_CHANNEL="qusm-cms-data"; const PREFIX="FBMRP_CMS_GZIP:"; const bot=()=>process.env.DISCORD_BOT_TOKEN;
async function d(p:string,i?:RequestInit){const t=bot();if(!t)throw Error("Discord storage unavailable");return fetch(`https://discord.com/api/v10${p}`,{...i,headers:{Authorization:`Bot ${t}`,...(i?.headers||{})},cache:"no-store"})}
function pack(c:Content){return PREFIX+gzipSync(Buffer.from(JSON.stringify(c),"utf8")).toString("base64")}
function unpack(s:string){return JSON.parse(gunzipSync(Buffer.from(s.slice(PREFIX.length),"base64")).toString("utf8"))}
async function readRemote(){try{const r=await d(`/guilds/${FBMRP_GUILD_ID}/channels`);if(!r.ok)return null;const cs=await r.json();const ch=cs.find((c:any)=>c.type===0&&c.name===CMS_CHANNEL);if(!ch)return null;const m=await d(`/channels/${ch.id}/messages?limit=20`);if(!m.ok)return null;const x=(await m.json()).find((m:any)=>m.author?.bot&&m.content?.startsWith(PREFIX));return x?unpack(x.content):null}catch{return null}}
async function writeRemote(c:Content){const r=await d(`/guilds/${FBMRP_GUILD_ID}/channels`);if(!r.ok)throw Error("Discord channels unavailable");const cs=await r.json();let ch=cs.find((x:any)=>x.type===0&&x.name===CMS_CHANNEL);if(!ch){const cr=await d(`/guilds/${FBMRP_GUILD_ID}/channels`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:CMS_CHANNEL,type:0})});if(!cr.ok)throw Error("CMS channel cannot be created");ch=await cr.json()}const body=pack(c);if(body.length>2000)throw Error("CMS payload too large");const m=await d(`/channels/${ch.id}/messages?limit=20`);const old=m.ok?(await m.json()).find((x:any)=>x.author?.bot&&x.content?.startsWith(PREFIX)):null;if(old){const u=await d(`/channels/${ch.id}/messages/${old.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:body})});if(!u.ok)throw Error("CMS update failed")}else{const p=await d(`/channels/${ch.id}/messages`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:body})});if(!p.ok)throw Error("CMS create failed")}}
export async function getContent():Promise<Content>{const remote=await readRemote();if(remote)return {...defaults,...remote,calendar:remote.calendar||[]};try{return {...defaults,...JSON.parse(await fs.readFile(filePath,"utf8"))}}catch{return defaults}}
export async function saveContent(c:Content){if(bot()){await writeRemote(c);return}await fs.mkdir(path.dirname(filePath),{recursive:true});await fs.writeFile(filePath,JSON.stringify(c,null,2),"utf8")}
