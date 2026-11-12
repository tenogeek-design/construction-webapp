
import { createClient } from "@supabase/supabase-js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const txt=(v,max=300)=>typeof v==="string"?v.trim().slice(0,max):"";
const num=v=>typeof v==="number"&&Number.isFinite(v)?v:NaN;

export default async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(!["GET","POST"].includes(req.method))return res.status(405).json({error:"Method not allowed"});
  const url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)return res.status(503).json({error:"Server not configured"});
  const token=(req.headers.authorization||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token)return res.status(401).json({error:"Login required"});
  const server=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user}={},error:authError}=await server.auth.getUser(token);
  if(authError||!user)return res.status(401).json({error:"Invalid session"});
  const {data:roles,error:roleError}=await server.from("app_user_roles")
    .select("role_code").eq("user_id",user.id).is("revoked_at",null);
  if(roleError)return res.status(503).json({error:"Cannot check permissions"});
  const owner=roles?.some(r=>r.role_code==="owner");
  const foreman=roles?.some(r=>r.role_code==="foreman");
  if(!owner&&!foreman)return res.status(403).json({error:"Foreman or OWNER role required"});
  const payload=typeof req.body==="string"?(()=>{try{return JSON.parse(req.body)}catch{return null}})():req.body;
  const action=req.method==="GET"?"list":payload?.action;
  try{
    if(action==="list"){
      if(owner&&req.query?.scope==="all"){
        const {data,error}=await server.from("foreman_object_proposals")
          .select("*").order("created_at",{ascending:false}).limit(100);
        if(error)throw error;
        return res.status(200).json({success:true,items:data});
      }
      const {data,error}=await server.from("foreman_object_proposals")
        .select("*").eq("created_by",user.id).order("created_at",{ascending:false}).limit(100);
      if(error)throw error;
      return res.status(200).json({success:true,items:data});
    }
    if(action==="submit"){
      if(!foreman&&!owner)return res.status(403).json({error:"Foreman role required"});
      const data=payload?.object;
      if(!data||typeof data!=="object"||Array.isArray(data))return res.status(400).json({error:"Invalid object"});
      const name=txt(data.name,160),address=txt(data.address),city=txt(data.city,100)||"Warszawa";
      if(!name||!address)return res.status(400).json({error:"Name and address required"});
      if(!Array.isArray(data.stages)||data.stages.length<1||data.stages.length>60)return res.status(400).json({error:"Add 1–60 work stages"});
      const stages=[];let total=0,count=0;
      for(const s of data.stages){
        const stageName=txt(s?.name,120);
        if(!stageName||!Array.isArray(s.items)||s.items.length>200)return res.status(400).json({error:"Invalid stage"});
        const items=[];
        for(const p of s.items){
          const workName=txt(p?.name,160),unit=txt(p?.unit,20);
          const qty=num(p?.qty),rate=num(p?.rate);
          if(!workName||!unit||!(qty>0)||qty>1000000||!(rate>=0)||rate>10000000)
            return res.status(400).json({error:"Invalid work position"});
          items.push({name:workName,unit,qty,rate});
          total+=Math.round(qty*rate*100)/100;
          count++;
        }
        stages.push({name:stageName,items});
      }
      if(count<1||count>500||total>100000000)return res.status(400).json({error:"Invalid scope or total"});
      const start=txt(data.start,10)||null,finish=txt(data.finish,10)||null;
      if(start&&!/^\d{4}-\d{2}-\d{2}$/.test(start)||finish&&!/^\d{4}-\d{2}-\d{2}$/.test(finish)||start&&finish&&finish<start)
        return res.status(400).json({error:"Invalid dates"});
      const {data:record,error}=await server.from("foreman_object_proposals")
        .insert({created_by:user.id,name,address,city,start_date:start,end_date:finish,
          description:txt(data.note,3000),stages,estimated_total:Math.round(total*100)/100,status:"pending"})
        .select("id,status,created_at").single();
      if(error)throw error;
      return res.status(201).json({success:true,proposal:record});
    }
    if(action==="review"){
      if(!owner)return res.status(403).json({error:"OWNER role required"});
      if(!UUID.test(payload?.proposalId||"")||!["approved","rejected"].includes(payload?.decision))
        return res.status(400).json({error:"Invalid review"});
      const comment=txt(payload?.comment,2000);
      if(payload.decision==="rejected"&&!comment)return res.status(400).json({error:"Reason required"});
      // Use verified OWNER JWT so auth.uid() inside SQL matches OWNER.
      const authed=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},
        auth:{autoRefreshToken:false,persistSession:false}});
      const {data,error}=await authed.rpc("review_foreman_object_proposal",
        {p_proposal_id:payload.proposalId,p_decision:payload.decision,p_comment:comment||null});
      if(error)throw error;
      return res.status(200).json({success:true,recordId:data});
    }
    return res.status(400).json({error:"Unknown action"});
  }catch(error){
    console.error("Foreman object workflow",error);
    return res.status(503).json({error:"Object workflow unavailable. Check database migration and permissions."});
  }
}
