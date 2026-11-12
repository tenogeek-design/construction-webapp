import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const DB = "https://yepxskcfxyiyqqhmdpve.supabase.co";
const BUCKET = "cg-daily-reports";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MIME = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
const validId = value => typeof value==="string" && UUID.test(value);
const validAmount = value => typeof value==="number" && Number.isFinite(value) && value>0 && value<=1000000;
const clean = (value,max=500) => typeof value==="string" ? value.trim().slice(0,max) : "";

export default async function handler(req,res) {
  res.setHeader("Cache-Control","private, no-store");
  if(!["GET","POST"].includes(req.method)) return res.status(405).json({error:"Method not allowed"});
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY, url=process.env.SUPABASE_URL||DB;
  if(!key) return res.status(503).json({error:"Server configuration missing"});
  const token=(req.headers.authorization||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if(!token) return res.status(401).json({error:"Login required"});
  const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:{user},error:authError}=await db.auth.getUser(token);
  if(authError||!user) return res.status(401).json({error:"Invalid session"});
  const acting=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},
    auth:{autoRefreshToken:false,persistSession:false}});

  try {
    const [{data:roles,error:rolesErr},{data:employee,error:empErr}]=await Promise.all([
      db.from("app_user_roles").select("role_code").eq("user_id",user.id).is("revoked_at",null),
      db.from("employees").select("id,status").eq("user_id",user.id).maybeSingle()
    ]);
    if(rolesErr||empErr) throw rolesErr||empErr;
    const owner=(roles||[]).some(x=>x.role_code==="owner");
    const foreman=(roles||[]).some(x=>x.role_code==="foreman");
    if(!owner&&!foreman) return res.status(403).json({error:"OWNER or foreman role required"});
    async function permission(projectId) {
      if(!validId(projectId)) return null;
      const {data:project,error}=await db.from("projects")
        .select("id,status,foreman_id,name").eq("id",projectId).maybeSingle();
      if(error)throw error;
      return project && (owner||(foreman&&employee?.status==="active"&&project.foreman_id===employee.id))?project:null;
    }
    async function reportAccess(reportId,edit=false) {
      if(!validId(reportId))return null;
      const {data:report,error}=await db.from("daily_work_reports")
        .select("*").eq("id",reportId).maybeSingle();
      if(error)throw error;
      if(!report||!await permission(report.project_id))return null;
      if(edit && (report.created_by!==user.id || !foreman || !["draft","rejected","changes_requested"].includes(report.status))) return null;
      return report;
    }
    if(req.method==="GET") {
      const projectId=typeof req.query?.projectId==="string"?req.query.projectId:"";
      if(!await permission(projectId))return res.status(403).json({error:"Project not accessible"});
      const {data:reports,error}=await db.from("daily_work_reports").select("*")
        .eq("project_id",projectId).order("work_date",{ascending:false})
        .order("created_at",{ascending:false}).limit(60);
      if(error)throw error;
      const ids=(reports||[]).map(x=>x.id);
      if(!ids.length)return res.status(200).json({success:true,items:[],isOwner:owner});
      const [entries,photos,history]=await Promise.all([
        db.from("daily_work_report_items").select("id,report_id,position_id,quantity").in("report_id",ids),
        db.from("daily_work_report_photos").select("id,report_id,storage_path,original_name,mime_type,size_bytes,created_at").in("report_id",ids).order("created_at"),
        db.from("daily_work_report_history").select("id,report_id,event,details,created_at").in("report_id",ids).order("created_at")
      ]);
      if(entries.error||photos.error||history.error)throw entries.error||photos.error||history.error;
      const photoLinks=await Promise.all((photos.data||[]).map(async photo=>{
        const {data}=await db.storage.from(BUCKET).createSignedUrl(photo.storage_path,1200);
        return {...photo,url:data?.signedUrl||null};
      }));
      return res.status(200).json({success:true,isOwner:owner,items:reports.map(r=>({
        ...r,lines:(entries.data||[]).filter(x=>x.report_id===r.id),
        photos:photoLinks.filter(x=>x.report_id===r.id),
        history:(history.data||[]).filter(x=>x.report_id===r.id)
      }))});
    }

    const body=typeof req.body==="string"?JSON.parse(req.body):req.body||{};
    const action=body.action;
    if(action==="save") {
      if(!foreman || employee?.status!=="active")return res.status(403).json({error:"Foreman role required"});
      const project=await permission(body.projectId);
      if(!project)return res.status(403).json({error:"Object not assigned to you"});
      if(!["active","paused"].includes(project.status)||body.submit&&project.status!=="active")
        return res.status(409).json({error:"Object must be active to send the report"});
      if(body.reportId && !await reportAccess(body.reportId,true))
        return res.status(403).json({error:"Report is not your editable draft"});
      if(!Array.isArray(body.lines)||body.lines.length>40)
        return res.status(400).json({error:"Invalid work entries"});
      if(body.lines.some(x=>!validId(x.positionId)||!validAmount(Number(x.quantity))))
        return res.status(400).json({error:"Select a work position and valid quantity"});
      if(body.cashRequested && (!validAmount(Number(body.cashAmount))||!clean(body.cashPurpose,500)))
        return res.status(400).json({error:"Enter cash amount and purpose"});
      const {data,error}=await acting.rpc("save_daily_work_report",{
        p_report_id:body.reportId||null,p_project_id:body.projectId,
        p_work_date:body.workDate,p_description:clean(body.description,2000),
        p_items:body.lines.map(x=>({positionId:x.positionId,quantity:Number(x.quantity)})),
        p_cash_requested:body.cashRequested===true,
        p_cash_amount:body.cashRequested?Number(body.cashAmount):null,
        p_cash_purpose:body.cashRequested?clean(body.cashPurpose,500):null,
        p_submit:body.submit===true
      });
      if(error)return res.status(400).json({error:error.message});
      return res.status(200).json({success:true,reportId:data,status:body.submit?"submitted":"draft"});
    }
    if(action==="review-work"||action==="review-cash"){
      if(!owner)return res.status(403).json({error:"OWNER role required"});
      if(!await reportAccess(body.reportId))return res.status(404).json({error:"Report not found"});
      const note=clean(body.note,1000);
      const method=action==="review-work"?"review_daily_work_report":"review_daily_work_cash";
      const args=action==="review-work"
       ?{p_report_id:body.reportId,p_action:body.decision,p_note:note}
       :{p_report_id:body.reportId,p_action:body.decision,
         p_approved_amount:body.decision==="approve"?Number(body.approvedAmount):null,p_note:note};
      const {data,error}=await acting.rpc(method,args);
      if(error)return res.status(400).json({error:error.message});
      return res.status(200).json({success:true,status:data});
    }
    if(action==="photo-sign"){
      const report=await reportAccess(body.reportId,true);
      if(!report)return res.status(403).json({error:"Editable report required"});
      if(!MIME[body.mime] || !Number.isInteger(body.size)||body.size<1||body.size>5242880)
       return res.status(400).json({error:"Only JPG, PNG or WEBP up to 5 MB"});
      const {count,error:countErr}=await db.from("daily_work_report_photos")
        .select("id",{head:true,count:"exact"}).eq("report_id",report.id);
      if(countErr)throw countErr;
      if((count||0)>=50)return res.status(400).json({error:"Maximum 50 photos"});
      const path=report.id+"/"+randomUUID()+"."+MIME[body.mime];
      const {data,error}=await db.storage.from(BUCKET).createSignedUploadUrl(path);
      if(error)throw error;
      return res.status(200).json({success:true,path,token:data.token});
    }
    if(action==="photo-attach"){
      const report=await reportAccess(body.reportId,true);
      if(!report)return res.status(403).json({error:"Editable report required"});
      const path=typeof body.path==="string"?body.path:"";
      if(!new RegExp("^"+report.id+"/[0-9a-f-]{36}\\.(jpg|png|webp)$","i").test(path))
        return res.status(400).json({error:"Invalid photo path"});
      const {count,error:countErr}=await db.from("daily_work_report_photos")
        .select("id",{count:"exact",head:true}).eq("report_id",report.id);
      if(countErr)throw countErr;
      if((count||0)>=50)return res.status(400).json({error:"Maximum 50 photos"});
      const filename=path.split("/")[1];
      const {data:objects,error:listErr}=await db.storage.from(BUCKET).list(report.id,{search:filename,limit:100});
      if(listErr)throw listErr;
      const photo=objects?.find(x=>x.name===filename);
      if(!photo)return res.status(400).json({error:"Photo upload not finished"});
      const actualSize=Number(photo.metadata?.size||0);
      const mime=Object.keys(MIME).find(x=>MIME[x]===filename.split(".").pop());
      if(actualSize<=0||actualSize>5242880)return res.status(400).json({error:"Photo is too large or empty"});
      const {error}=await db.from("daily_work_report_photos").insert({
        report_id:report.id,storage_path:path,mime_type:mime,
        original_name:clean(body.name,150)||filename,size_bytes:actualSize
      });
      if(error)return res.status(400).json({error:error.message});
      return res.status(200).json({success:true});
    }
    if(action==="photo-delete") {
      const report=await reportAccess(body.reportId,true);
      if(!report)return res.status(403).json({error:"Editable report required"});
      const {data:photo,error:photoErr}=await db.from("daily_work_report_photos")
        .select("id,storage_path").eq("id",body.photoId).eq("report_id",report.id).maybeSingle();
      if(photoErr)throw photoErr;
      if(!photo)return res.status(404).json({error:"Photo not found"});
      const {error}=await db.from("daily_work_report_photos").delete().eq("id",photo.id);
      if(error)throw error;
      await db.storage.from(BUCKET).remove([photo.storage_path]);
      return res.status(200).json({success:true});
    }
    return res.status(400).json({error:"Unknown action"});
  }catch(e){
    console.error("Daily reports error",e);
    return res.status(503).json({error:"Could not process daily report"});
  }
}
