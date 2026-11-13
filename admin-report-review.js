"use strict";
(() => {
 const root=document.getElementById("ownerReportReview");
 if(!root||!window.supabase)return;
 const db=window.supabase.createClient("https://yepxskcfxyiyqqhmdpve.supabase.co","sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH");
 const money=n=>new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN"}).format(Number(n||0));
 const num=n=>new Intl.NumberFormat("pl-PL",{maximumFractionDigits:2}).format(Number(n||0));
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const labels={draft:"Черновик",submitted:"Ожидает подтверждения",approved:"Подтверждено",rejected:"Отклонено",changes_requested:"На исправлении"};
 let selected=null,busy=false;
 async function call(projectId,action,body={}){
  const {data:{session},error}=await db.auth.getSession();
  if(error||!session?.access_token)throw Error("Сессия закончилась. Войди снова.");
  const query=action?"":("?projectId="+encodeURIComponent(projectId));
  const response=await fetch("/api/daily-reports"+query,{method:action?"POST":"GET",headers:{Authorization:"Bearer "+session.access_token,...(action?{"Content-Type":"application/json"}:{})},...(action?{body:JSON.stringify({action,...body})}:{})});
  const json=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(json.error||"Ошибка сервера");
  if(json.isOwner===false)throw Error("Войди в аккаунт OWNER для подтверждения.");
  return json;
 }
 const notice=(s,bad=false)=>{const el=root.querySelector("#ownerReviewMessage");if(el){el.textContent=s;el.style.color=bad?"#ffb9b0":"#c7d9e8"}};
 async function open(project){
  selected=project;
  root.hidden=false;
  root.innerHTML='<div class="owner-review-head"><div><small>OWNER · ПРОВЕРКА РАБОТ</small><h3>Отчёты: '+esc(project.name)+'</h3><p>Здесь подтверждаются объёмы. Деньги из кассы согласовываются отдельно.</p></div><button type="button" id="ownerReviewClose">Закрыть ✕</button></div><div id="ownerReviewMessage" role="status"></div><div id="ownerReviewList"></div>';
  root.querySelector("#ownerReviewClose").onclick=()=>{root.hidden=true;selected=null};
  root.scrollIntoView({behavior:"smooth",block:"start"});
  await refresh();
 }
 async function refresh(){
  if(!selected)return;
  notice("Загружаем отчёты...");
  try{
   const projectId=selected.id;
   const res=await call(projectId);
   const byId=new Map((res.positions||[]).map(x=>[x.id,x]));
   const items=(res.items||[]).filter(r=>r.status!=="draft");
   items.sort((a,b)=>(a.status==="submitted"?-1:1)-(b.status==="submitted"?-1:1));
   const pending=items.filter(x=>x.status==="submitted").length;
   const list=root.querySelector("#ownerReviewList");
   list.innerHTML='<div class="owner-review-summary"><strong>'+pending+' на подтверждении</strong><span>'+items.length+' отправленных отчётов</span></div>'+
   (items.length?items.map(r=>{
    const lines=(r.lines||[]).map(x=>{const p=byId.get(x.position_id);return '<div class="owner-review-line"><b>'+esc(p?.name||"Работа по смете")+'</b><span>'+num(x.quantity)+' '+esc(p?.unit||"")+(p?.rate!=null?' · '+money(Number(x.quantity)*Number(p.rate)):'')+'</span></div>'}).join("");
    const extras=(r.extras||[]).map(x=>'<div class="owner-review-line"><b>'+esc(x.work_name)+' <small>Дополнительная работа</small></b><span>'+num(x.quantity)+' '+esc(x.unit)+(x.unit_price!=null?' · '+money(Number(x.quantity)*Number(x.unit_price)):'')+'</span></div>').join("");
    const plannedAmount=(r.lines||[]).reduce((s,x)=>s+Number(x.quantity)*(Number(byId.get(x.position_id)?.rate)||0),0);
    const extraAmount=(r.extras||[]).reduce((s,x)=>s+Number(x.quantity)*(Number(x.unit_price)||0),0);
    const estimate=plannedAmount+extraAmount;
    const photos=(r.photos||[]).filter(x=>x.url).map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(x.url)+'" loading="lazy" alt="Фото выполненных работ"></a>').join("");
    return '<article class="owner-review-card" data-report-id="'+esc(r.id)+'" data-estimate="'+estimate+'" data-cash-requested="'+Number(r.cash_requested_amount||0)+'" data-has-photo="'+(r.photos||[]).some(x=>x.url)+'"><div class="owner-review-title"><div><b>'+esc(r.work_date)+'</b><span>'+esc(labels[r.status]||r.status)+'</span></div><strong>'+money(estimate)+'</strong></div>'+
     (r.description?'<p>'+esc(r.description)+'</p>':'')+
     '<div class="owner-review-line"><b>По согласованной смете</b><strong>'+money(plannedAmount)+'</strong></div>'+lines+
     (r.extras?.length?'<div class="owner-review-extra-note"><strong>Вне сметы: '+money(extraAmount)+'</strong><p>Дополнительные позиции НЕ включаются в утверждённую смету автоматически. Для их оплаты нужно отдельное согласование.</p></div>':'')+extras+
     (photos?'<div class="owner-review-photos">'+photos+'</div>':'<p class="owner-review-muted">Фото не приложены</p>')+
     (r.status==="submitted"&&estimate>500&&!(r.photos||[]).some(x=>x.url)?'<p class="owner-review-photo-warning">⚠ Для подтверждения работ свыше 500 zł требуется фотоотчёт. Верните отчёт на исправление.</p>':'')+
     (r.cash_requested?'<div class="owner-review-cash"><b>Запрос из кассы: '+money(r.cash_requested_amount)+'</b><p>'+esc(r.cash_purpose||"")+'</p><small>Статус: '+esc(r.cash_status||"pending")+'</small></div>':'')+
     (r.review_note?'<p class="owner-review-muted">Комментарий: '+esc(r.review_note)+'</p>':'')+
     (r.status==="submitted"?'<div class="owner-review-actions"><button type="button" class="approve" data-review="approve" data-id="'+esc(r.id)+'">✓ Подтвердить работы</button><button type="button" data-review="return" data-id="'+esc(r.id)+'">↩ Вернуть на исправление</button><button type="button" class="reject" data-review="reject" data-id="'+esc(r.id)+'">Отклонить</button></div>':'')+
     (r.status==="approved"&&r.cash_requested&&r.cash_status==="pending"?'<div class="owner-review-cash-actions"><label>Согласовать из кассы, zł<input type="number" min="0.01" step="0.01" data-cash-amount="'+esc(r.id)+'" value="'+esc(r.cash_requested_amount)+'"></label><label>Причина изменения или отказа<input data-cash-note="'+esc(r.id)+'" placeholder="Комментарий"></label><button type="button" data-cash="approve" data-id="'+esc(r.id)+'">Согласовать деньги</button><button type="button" data-cash="reject" data-id="'+esc(r.id)+'">Отказать в деньгах</button><small>Согласование не означает фактическую выдачу денег.</small></div>':'')+
     '</article>';
   }).join(""):'<p class="owner-review-empty">Отправленных отчётов пока нет.</p>');
   list.querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>decide(b.dataset.id,b.dataset.review));
   list.querySelectorAll("[data-cash]").forEach(b=>b.onclick=()=>cash(b.dataset.id,b.dataset.cash));
   notice("Загружено. Ожидают решения: "+pending);
  }catch(e){notice(e.message,true)}
 }
 async function decide(id,decision){
  if(busy||!selected)return;
  const promptText=decision==="return"?"Что нужно исправить?":decision==="reject"?"Причина отказа:":"Комментарий (необязательно):";
  const note=prompt(promptText,"");
  if(note===null||decision!=="approve"&&!note.trim())return;
  if(decision==="approve"){
   const card=root.querySelector('[data-report-id="'+id+'"]');
   const amount=Number(card?.dataset.estimate||0);
   const hasPhoto=card?.dataset.hasPhoto==="true";
   if(amount>500&&!hasPhoto){notice("Для подтверждения работ свыше 500 zł нужен фотоотчёт. Верни отчёт бригадиру.",true);return}
   if(!confirm("Подтвердить объёмы по смете? Дополнительные работы не утверждаются автоматически. Деньги НЕ списываются."))return;
  }
  busy=true;try{await call(selected.id,"review-work",{reportId:id,decision,note});await refresh();notice("Решение сохранено.")}catch(e){notice(e.message,true)}finally{busy=false}
 }
 async function cash(id,decision){
  if(busy||!selected)return;
  const amount=Number(root.querySelector('[data-cash-amount="'+id+'"]')?.value);
  const note=root.querySelector('[data-cash-note="'+id+'"]')?.value.trim()||"";
  if(decision==="approve"&&(!Number.isFinite(amount)||amount<=0)){notice("Укажи корректную сумму",true);return}
  const card=root.querySelector('[data-report-id="'+id+'"]');
  const requested=Number(card?.dataset.cashRequested||0);
  if(decision==="reject"&&!note){notice("При отказе укажи причину",true);return}
  if(decision==="approve"&&Math.abs(amount-requested)>0.005&&!note){notice("При изменении суммы укажи причину",true);return}
  if(decision==="approve"&&!confirm("Согласовать "+money(amount)+"? Это не списание денег."))return;
  busy=true;try{await call(selected.id,"review-cash",{reportId:id,decision,approvedAmount:amount,note});await refresh();notice("Решение по кассе сохранено.")}catch(e){notice(e.message,true)}finally{busy=false}
 }
 window.ownerReportReview={open};
})();
