import { createClient } from "@supabase/supabase-js";
export default async function handler(req,res){
 res.setHeader("Cache-Control","private, no-store");
 if(req.method!=="GET")return res.status(405).json({error:"Method not allowed"});
 const token=(req.headers.authorization||"").match(/^Bearer\s+(.+)$/i)?.[1];
 if(!token)return res.status(401).json({error:"Login required"});
 const url=process.env.SUPABASE_URL||"https://yepxskcfxyiyqqhmdpve.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return res.status(503).json({error:"Server not configured"});
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
 try{
  const {data:{user},error:authErr}=await db.auth.getUser(token);
  if(authErr||!user)return res.status(401).json({error:"Invalid session"});
  const {data:roles,error:roleErr}=await db.from("app_user_roles").select("role_code").eq("user_id",user.id).is("revoked_at",null);
  if(roleErr)throw roleErr;
  if(!(roles||[]).some(r=>r.role_code==="owner"))return res.status(403).json({error:"OWNER role required"});
  const [ps,ss,rs]=await Promise.all([
   db.from("projects").select("id").limit(150),
   db.from("project_work_stages").select("id,project_id").limit(5000),
   db.from("daily_work_reports").select("id,project_id,status,work_date,cash_requested,cash_status,created_at").order("created_at",{ascending:false}).limit(5000)
  ]);
  if(ps.error||ss.error||rs.error)throw ps.error||ss.error||rs.error;
  const stageIds=(ss.data||[]).map(x=>x.id);
  const wr=stageIds.length?await db.from("project_work_positions").select("id,stage_id,quantity,rate,completed_quantity").in("stage_id",stageIds).limit(10000):{data:[],error:null};
  if(wr.error)throw wr.error;
  const byStage=new Map((ss.data||[]).map(s=>[s.id,s.project_id]));
  const result=(ps.data||[]).map(p=>{
   let estimate=0,completed=0,positions=0;
   for(const w of wr.data||[])if(byStage.get(w.stage_id)===p.id){
    positions++;const rate=Number(w.rate)||0;
    estimate+=(Number(w.quantity)||0)*rate;completed+=(Number(w.completed_quantity)||0)*rate;
   }
   const reports=(rs.data||[]).filter(r=>r.project_id===p.id);
   const latest=reports.find(r=>r.status!=="draft");
   return {id:p.id,estimate:Math.round(estimate*100)/100,completed:Math.round(completed*100)/100,
    progress:estimate>0?Math.min(100,Math.max(0,Math.round(completed/estimate*100))):null,
    positions,pending:reports.filter(r=>r.status==="submitted").length,
    cashPending:reports.filter(r=>r.cash_requested&&r.cash_status==="pending").length,
    lastReport:latest?.work_date||null,reportCount:reports.filter(r=>r.status!=="draft").length};
  });
  return res.status(200).json({success:true,items:result});
 }catch(e){console.error("Owner project dynamics",e);return res.status(503).json({error:"Could not load project dynamics"})}
}