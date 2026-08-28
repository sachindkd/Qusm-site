import fs from "fs/promises";
import path from "path";
export type Content={org:any;announcements:any[];leadership:any[];divisions:any[];rules:any[];government:any[];ranks:any[];news:any[];media:any[];applications:any[]};
const filePath=path.join(process.cwd(),"data","content.json");
const defaults:Content={org:{name:"FBMRP",fullName:"Fort Bliss Military Roleplay",owner:"",coOwner:"",status:"active"},announcements:[],leadership:[],divisions:[],rules:[],government:[],ranks:[],news:[],media:[],applications:[]};
export async function getContent():Promise<Content>{try{return {...defaults,...JSON.parse(await fs.readFile(filePath,"utf-8"))}}catch{return defaults}}
export async function saveContent(content:Content){await fs.mkdir(path.dirname(filePath),{recursive:true});await fs.writeFile(filePath,JSON.stringify(content,null,2),"utf8")}
