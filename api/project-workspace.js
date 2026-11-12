import { createClient } from "@supabase/supabase-js";

const DB = "https://yepxskcfxyiyqqhmdpve.supabase.co";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedActions = new Set(["assign","start","pause","resume","complete"]);

export default async function handler(req, res) {
  res.setHeader("Cache-Control","private, no-store");
  if (!["GET","POST"].includes(req.method)) return res.status(405).json({error:"Method not allowed"});
  const url = process.env.SUPABASE_URL || DB;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return res.status(503).json({error:"Server configuration missing"});
  const token = (req.headers.authorization||"").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return res.status(401).json({error:"Login required"});

  const db = createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}});
  const {data:auth,error:authError} = await db.auth.getUser(token);
  if (authError || !auth?.user) return res.status(401).json({error:"Invalid session"});
  const user = auth.user;

  try {
    const {data:roles,error:roleErr} = await db.from("app_user_roles")
      .select("role_code").eq("user_id",user.id).is("revoked_at",null);
    if (roleErr) throw roleErr;
    const owner=roles.some(r=>r.role_code==="owner");
    const foreman=roles.some(r=>r.role_code==="foreman");
    if (!owner&&!foreman) return res.status(403).json({error:"OWNER or foreman role required"});

    const {data:employee,error:employeeErr} = await db.from("employees")
      .select("id").eq("user_id",user.id).maybeSingle();
    if (employeeErr) throw employeeErr;
    const projectFields="id,name,city,street,building_number,apartment_number,description,status,start_date,end_date,contract_amount,currency,foreman_id,brigade_id,created_at";

    if (req.method==="GET") {
      const id=typeof req.query?.id==="string"?req.query.id:null;
      if (id && !UUID.test(id)) return res.status(400).json({error:"Invalid project ID"});
      if (id) {
        const {data:project,error:projectErr}=await db.from("projects")
          .select(projectFields).eq("id",id).maybeSingle();
        if (projectErr) throw projectErr;
        if (!project) return res.status(404).json({error:"Project not found"});
        if (!owner && (!employee || project.foreman_id!==employee.id)) {
          return res.status(403).json({error:"Project is not assigned to you"});
        }
        const {data:stages,error:stageErr}=await db.from("project_work_stages")
          .select("id,name,sort_order,project_id").eq("project_id",id).order("sort_order");
        if (stageErr) throw stageErr;
        const stageIds=(stages||[]).map(x=>x.id);
        let positions=[];
        if (stageIds.length) {
          const {data:work,error:workErr}=await db.from("project_work_positions")
            .select("id,stage_id,name,unit,quantity,rate,completed_quantity,sort_order")
            .in("stage_id",stageIds).order("sort_order");
          if (workErr) throw workErr;
          positions=work||[];
        }
        const result={project,stages:(stages||[]).map(s=>({...s,items:positions.filter(x=>x.stage_id===s.id)})),isOwner:owner};
        if (owner) {
          const b=await db.from("brigades").select("id,name,foreman_id,status")
            .eq("status","active").order("name");
          if(b.error)throw b.error;
          const {data:allowedRoles,error:allowedErr}=await db.from("app_user_roles")
            .select("user_id").in("role_code",["foreman","owner"]).is("revoked_at",null);
          if (allowedErr) throw allowedErr;
          const permitted=new Set((allowedRoles||[]).map(x=>x.user_id));
          const {data:staff,error:staffErr}=await db.from("employees")
            .select("id,full_name,user_id,status").eq("status","active");
          if(staffErr)throw staffErr;
          result.employees=(staff||[]).filter(x=>permitted.has(x.user_id))
            .map(x=>({id:x.id,full_name:x.full_name}));
          result.brigades=b.data||[];
        }
        return res.status(200).json({success:true,...result});
      }
      let query=db.from("projects").select(projectFields).order("created_at",{ascending:false}).limit(150);
      if (!owner) {
        if (!employee) return res.status(200).json({success:true,items:[],isOwner:false});
        query=query.eq("foreman_id",employee.id);
      }
      const {data,error}=await query;
      if(error)throw error;
      return res.status(200).json({success:true,items:data||[],isOwner:owner});
    }

    if(!owner)return res.status(403).json({error:"Only OWNER may change project assignments or status"});
    const body=typeof req.body==="string"?JSON.parse(req.body):req.body;
    if(!body || !UUID.test(body.projectId||"") || !allowedActions.has(body.action))
      return res.status(400).json({error:"Invalid project action"});
    const nullableUuid=v=>v===null||v===""||v===undefined?null:(typeof v==="string"&&UUID.test(v)?v:undefined);
    const f=nullableUuid(body.foremanId),b=nullableUuid(body.brigadeId);
    if (body.action==="assign"&&(f===undefined||b===undefined))
      return res.status(400).json({error:"Invalid assignment"});
    const acting=createClient(url,key,{global:{headers:{Authorization:"Bearer "+token}},
      auth:{autoRefreshToken:false,persistSession:false}});
    const {data:status,error:writeErr}=await acting.rpc("owner_update_project_workflow",{
      p_project_id:body.projectId,p_action:body.action,
      p_foreman_id:body.action==="assign"?f:null,p_brigade_id:body.action==="assign"?b:null
    });
    if(writeErr) return res.status(400).json({error:writeErr.message});
    return res.status(200).json({success:true,status});
  } catch(e) {
    console.error("Project workspace error",e);
    return res.status(503).json({error:"Could not load project workspace"});
  }
}