import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
const BUCKET = "cg-daily-reports";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PHOTO_TYPES = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
const EDITABLE = ["draft","rejected","changes_requested"];
const validId = value => typeof value === "string" && UUID.test(value);
const err = (res, code, message) => res.status(code).json({error:message});

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (!["GET","POST"].includes(req.method)) return err(res,405,"Method not allowed");
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return err(res,503,"Server configuration missing");
  const bearer = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (!bearer) return err(res,401,"Login required");
  const url = process.env.SUPABASE_URL || URL;
  const admin = createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:auth,error:authError} = await admin.auth.getUser(bearer[1]);
  if (authError || !auth?.user) return err(res,401,"Invalid session");
  const user = auth.user;
  const acting = createClient(url,secret,{
    global:{headers:{Authorization:"Bearer "+bearer[1]}},
    auth:{autoRefreshToken:false,persistSession:false}
  });

  try {
    const {data:roles,error:rolesError} = await admin.from("app_user_roles")
      .select("role_code").eq("user_id",user.id).is("revoked_at",null);
    if (rolesError) throw rolesError;
    const owner = (roles||[]).some(x=>x.role_code==="owner");
    const foreman = (roles||[]).some(x=>x.role_code==="foreman");
    if (!owner&&!foreman) return err(res,403,"No access to daily reports");
    const {data:employee,error:employeeError} = await admin.from("employees")
      .select("id,status").eq("user_id",user.id).maybeSingle();
    if (employeeError) throw employeeError;

    async function projectAccess(projectId) {
      if (!validId(projectId)) return null;
      const {data:project,error} = await admin.from("projects")
        .select("id,foreman_id,status").eq("id",projectId).maybeSingle();
      if(error) throw error;
      if (!project) return null;
      if (!owner && (!employee || employee.status!=="active" ||
                       project.foreman_id!==employee.id)) return null;
      return project;
    }
    async function reportAccess(reportId) {
      if (!validId(reportId)) return null;
      const {data:report,error} = await admin.from("daily_work_reports")
        .select("*").eq("id",reportId).maybeSingle();
      if(error) throw error;
      if(!report || !(await projectAccess(report.project_id))) return null;
      if(!owner && report.created_by!==user.id) return null;
      return report;
    }
    async function readDetails(report) {
      const [items,photos,history] = await Promise.all([
        admin.from("daily_work_report_items")
          .select("id,position_id,quantity").eq("report_id",report.id),
        admin.from("daily_work_report_photos")
          .select("id,storage_path,original_name,mime_type,size_bytes,created_at")
          .eq("report_id",report.id).order("created_at"),
        admin.from("daily_work_report_history")
          .select("event,performed_by,details,created_at")
          .eq("report_id",report.id).order("created_at",{ascending:false}).limit(50)
      ]);
      for (const q of [items,photos,history]) if(q.error)throw q.error;
      const photoList = await Promise.all((photos.data||[]).map(async p=>{
        const signed = await admin.storage.from(BUCKET).createSignedUrl(p.storage_path,900);
        return {...p,url:signed.error?null:signed.data?.signedUrl||null};
      }));
      return {report,items:items.data||[],photos:photoList,history:history.data||[]};
    }

    if (req.method==="GET") {
      const projectId = typeof req.query?.projectId==="string"?req.query.projectId:"";
      const project = await projectAccess(projectId);
      if(!project)return err(res,403,"Project unavailable");
      const reportId = typeof req.query?.reportId==="string"?req.query.reportId:"";
      if(reportId) {
        const report = await reportAccess(reportId);
        if(!report || report.project_id!==projectId)return err(res,404,"Report unavailable");
        return res.status(200).json({success:true,...await readDetails(report),isOwner:owner});
      }
      let query = admin.from("daily_work_reports").select("*")
        .eq("project_id",projectId).order("created_at",{ascending:false}).limit(80);
      if(!owner)query=query.eq("created_by",user.id);
      const {data:reports,error} = await query;
      if(error)throw error;
      const ids=(reports||[]).map(x=>x.id);
      let items=[],photos=[];
      if(ids.length) {
        const [a,b] = await Promise.all([
          admin.from("daily_work_report_items")
            .select("report_id,position_id,quantity").in("report_id",ids),
          admin.from("daily_work_report_photos")
            .select("id,report_id").in("report_id",ids)
        ]);
        if(a.error)throw a.error;
        if(b.error)throw b.error;
        items=a.data||[];
        photos=b.data||[];
      }
      const result=(reports||[]).map(r=>({
        ...r,items:items.filter(x=>x.report_id===r.id),
        photoCount:photos.filter(x=>x.report_id===r.id).length
      }));
      return res.status(200).json({success:true,items:result,isOwner:owner});
    }

    const body=typeof req.body==="string"?JSON.parse(req.body):req.body||{};
    const action=body.action;
    if (["save","submit"].includes(action)) {
      if(!foreman)return err(res,403,"Foreman role required");
      const project=await projectAccess(body.projectId);
      if(!project || project.foreman_id!==employee?.id)return err(res,403,"Project unavailable");
      if(action==="submit"&& !validId(body.reportId))return err(res,400,"Save the draft first");
      if(body.reportId&&!validId(body.reportId))return err(res,400,"Invalid report ID");
      const qty=Number(body.quantity);
      if(!validId(body.positionId)||!Number.isFinite(qty)||qty<=0||qty>1000000)
        return err(res,400,"Choose a position and enter valid quantity");
      const date=String(body.workDate||"");
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return err(res,400,"Invalid work date");
      const note=String(body.description||"").trim().slice(0,2000);
      const cash=body.cashRequested===true;
      const cashAmount=cash?Number(body.cashAmount):null;
      const cashPurpose=cash?String(body.cashPurpose||"").trim().slice(0,500):null;
      if(cash&&(!Number.isFinite(cashAmount)||cashAmount<=0||!cashPurpose))
        return err(res,400,"Enter cash amount and purpose");
      const {data,error}=await acting.rpc("save_daily_work_report",{
        p_report_id:body.reportId||null,p_project_id:project.id,p_work_date:date,
        p_description:note,p_items:[{positionId:body.positionId,quantity:qty}],
        p_cash_requested:cash,p_cash_amount:cashAmount,
        p_cash_purpose:cashPurpose,p_submit:action==="submit"
      });
      if(error)return err(res,400,error.message);
      return res.status(200).json({success:true,reportId:data,submitted:action==="submit"});
    }

    if (action==="photo_url" || action==="photo_complete") {
      if(!foreman)return err(res,403,"Foreman role required");
      const report=await reportAccess(body.reportId);
      if(!report||report.created_by!==user.id||!EDITABLE.includes(report.status))
        return err(res,403,"Cannot upload photos to this report");
      const pathPrefix=user.id+"/"+report.id+"/";
      if(action==="photo_url") {
        const mime=String(body.mimeType||"");
        const size=Number(body.size);
        if(!PHOTO_TYPES[mime]||!Number.isInteger(size)||size<1||size>5242880)
          return err(res,400,"JPG, PNG or WEBP up to 5 MB only");
        const {count,error:countError}=await admin.from("daily_work_report_photos")
          .select("id",{count:"exact",head:true}).eq("report_id",report.id);
        if(countError)throw countError;
        if((count||0)>=50)return err(res,400,"Maximum 50 photos per report");
        const path=pathPrefix+randomUUID()+"."+PHOTO_TYPES[mime];
        const {data,error}=await admin.storage.from(BUCKET).createSignedUploadUrl(path);
        if(error)return err(res,400,error.message);
        return res.status(200).json({success:true,path,token:data.token});
      }
      const path=String(body.path||"");
      const filename=String(body.fileName||"").trim().slice(0,180);
      if(!path.startsWith(pathPrefix)||
        !/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path.slice(pathPrefix.length))||
        !filename)return err(res,400,"Invalid photo details");
      const {data:existing,error:existingError}=await admin.from("daily_work_report_photos")
        .select("id").eq("storage_path",path).maybeSingle();
      if(existingError)throw existingError;
      if(existing)return res.status(200).json({success:true,photoId:existing.id});
      const fileName=path.slice(pathPrefix.length);
      const {data:found,error:listError}=await admin.storage.from(BUCKET)
        .list(pathPrefix.slice(0,-1),{limit:100,search:fileName});
      if(listError)throw listError;
      const obj=(found||[]).find(x=>x.name===fileName);
      if(!obj)return err(res,400,"Upload was not completed");
      const mime=obj.metadata?.mimetype||obj.metadata?.contentType||"";
      const size=Number(obj.metadata?.size);
      if(!PHOTO_TYPES[mime]||!Number.isFinite(size)||size<1||size>5242880)
        return err(res,400,"Uploaded file metadata is invalid");
      const {data,error}=await admin.from("daily_work_report_photos")
        .insert({report_id:report.id,storage_path:path,original_name:filename,
          mime_type:mime,size_bytes:size}).select("id").single();
      if(error)return err(res,400,error.message);
      return res.status(200).json({success:true,photoId:data.id});
    }

    if (action==="review_work" || action==="review_cash") {
      if(!owner)return err(res,403,"Only OWNER may review reports");
      const report=await reportAccess(body.reportId);
      if(!report)return err(res,404,"Report unavailable");
      let rpc,params;
      if(action==="review_work") {
        if(!["approve","return","reject"].includes(body.decision))
          return err(res,400,"Invalid review action");
        rpc="review_daily_work_report";
        params={p_report_id:report.id,p_action:body.decision,
          p_note:String(body.note||"").trim().slice(0,1000)||null};
      } else {
        if(!["approve","reject"].includes(body.decision))
          return err(res,400,"Invalid cash action");
        const amount=body.decision==="approve"?Number(body.amount):null;
        if(body.decision==="approve"&&(!Number.isFinite(amount)||amount<=0))
          return err(res,400,"Enter approved amount");
        rpc="review_daily_work_cash";
        params={p_report_id:report.id,p_action:body.decision,
          p_approved_amount:amount,p_note:String(body.note||"").trim().slice(0,1000)||null};
      }
      const {data,error}=await acting.rpc(rpc,params);
      if(error)return err(res,400,error.message);
      return res.status(200).json({success:true,result:data});
    }
    return err(res,400,"Unknown action");
  } catch (e) {
    console.error("Daily work reports API",e);
    return err(res,503,"Could not process report");
  }
}