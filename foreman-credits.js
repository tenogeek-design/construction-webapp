"use strict";
// Internal, non-bank extra-work credits for foremen. This widget NEVER initiates payouts.
(() => {
 if(!window.supabase)return;
 const db=window.supabase.createClient("https://yepxskcfxyiyqqhmdpve.supabase.co","sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH");
 const money=n=>new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN"}).format(Number(n||0));
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const css=document.createElement("style");
 css.textContent=`
 .cg-credit-panel{margin:14px 0 22px;padding:17px 19px;border-radius:15px;border:1px solid #4e7495;background:linear-gradient(128deg,#1e3850,#1a2939);color:#f0f6fc;font-family:Manrope,Arial,sans-serif}
 .cg-credit-panel *{box-sizing:border-box}
 .cg-credit-header{display:flex;justify-content:space-between;align-items:center;gap:15px;flex-wrap:wrap}
 .cg-credit-header small{display:block;color:#a5bfd2;font-size:11px;letter-spacing:.07em;margin-bottom:6px}
 .cg-credit-header strong{display:block;color:#ffba83;font-size:clamp(21px,3vw,29px)}
 .cg-credit-panel button{border:1px solid #5c88aa;border-radius:9px;padding:9px 13px;background:#31516c;color:#fff;cursor:pointer;font-weight:700}
 .cg-credit-panel p{font-size:12px;line-height:1.6;color:#bacfdf;margin:10px 0}
 .cg-credit-note{margin-top:12px;padding:11px;border:1px solid #436884;background:#20394d;border-radius:10px;font-size:12px;line-height:1.6}
 .cg-credit-note b{color:#f9fafc}
 .cg-credit-note time{display:block;color:#a8c0d3;font-size:10px;margin-top:5px}
 .cg-credit-panel .cg-credit-status{color:#bce3ca}
 .daily-credit,.daily-credit-note{padding:13px;margin:12px 0;border:1px solid #638566;border-radius:11px;background:#203b37;color:#e5f7e7}
 .daily-credit strong,.daily-credit small{display:block}
 .daily-credit small{margin-top:5px;color:#b5d4c4;line-height:1.5}
 .daily-credit-note button{border-radius:8px;padding:10px 14px}
 @media(max-width:650px){.cg-credit-panel{padding:14px 13px}.cg-credit-header{align-items:flex-start}}
 `;
 document.head.append(css);
 let projectId=null, host=null;
 async function load(){
  if(!host)return;
  const status=host.querySelector(".cg-credit-status");
  status.textContent="Загружаем внутренний баланс...";
  try {
   const {data:{user},error:ue}=await db.auth.getUser();
   if(ue||!user){status.textContent="Войди в кабинет бригадира.";return}
   let query=db.from("foreman_extra_work_credits").select("report_id,project_id,credited_amount,original_amount,adjustment_reason,created_at").eq("foreman_user_id",user.id).order("created_at",{ascending:false}).limit(200);
   const {data:credits,error:ce}=await query;
   if(ce)throw ce;
   const all=credits||[];
   const visible=projectId?all.filter(x=>x.project_id===projectId):all;
   const total=visible.reduce((a,x)=>a+Number(x.credited_amount),0);
   host.querySelector(".cg-credit-amount").textContent=money(total);
   const {data:messages,error:me}=await db.from("foreman_credit_notifications").select("id,project_id,message,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(20);
   if(me)throw me;
   const filtered=projectId?(messages||[]).filter(x=>x.project_id===projectId):messages||[];
   host.querySelector(".cg-credit-messages").innerHTML=filtered.slice(0,4).map(n=>
      '<div class="cg-credit-note"><b>✓ Работа принята OWNER</b><div>'+esc(n.message)+'</div><time>'+esc(new Date(n.created_at).toLocaleString("ru-RU"))+'</time></div>').join("") ||
      '<p>Пока нет зачислений за дополнительные работы.</p>';
   status.textContent=all.length?"Начислено сразу после принятия OWNER · без реальных переводов.":"Внутренние зачисления пока отсутствуют.";
  }catch(e){status.textContent="Не удалось загрузить начисления: "+e.message}
 }
 function attach(parent,id){
  if(!parent||parent.querySelector(".cg-credit-panel"))return;
  projectId=id||null;
  host=document.createElement("section");host.className="cg-credit-panel";
  host.innerHTML='<div class="cg-credit-header"><div><small>CONSTRUCTION GROUP · ВНУТРЕННИЙ СЧЁТ</small><strong class="cg-credit-amount">—</strong></div><button type="button" class="cg-credit-refresh">↻ Обновить</button></div>'+
    '<p>Здесь отображаются принятые OWNER дополнительные работы по согласованной ставке бригадира. Основные объёмы учитываются отдельно. Это не банковский баланс и не факт выплаты.</p>'+
    '<p class="cg-credit-status" role="status"></p><div class="cg-credit-messages"></div>';
  host.querySelector(".cg-credit-refresh").onclick=load;
  parent.prepend(host);load();
 }
 document.addEventListener("cgWorkspaceReady",e=>{
   if(e.detail?.isOwner)return;
   const area=document.querySelector("#panel-overview");
   if(area)attach(area,e.detail.project.id);
 });
 document.addEventListener("DOMContentLoaded",()=>{
   if(location.pathname==="/foreman.html"){
    const parent=document.querySelector("#cgControlCenter .cg-main");
    if(parent)attach(parent,null);
   }
 });
})();
