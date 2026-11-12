"use strict";
document.addEventListener("DOMContentLoaded",()=>{
 const ROOT_ID="panel-reports", BUCKET="cg-daily-reports";
 const db=window.supabase?.createClient("https://yepxskcfxyiyqqhmdpve.supabase.co",
   "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH");
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=v=>new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN"}).format(Number(v||0));
 const num=v=>new Intl.NumberFormat("pl-PL",{maximumFractionDigits:2}).format(Number(v||0));
 const localToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
 const workStatus={draft:"Черновик",submitted:"На проверке",approved:"Подтверждено",rejected:"Отклонён",changes_requested:"Вернули на исправление"};
 const cashStatus={none:"Не запрошены",pending:"Ожидает OWNER",approved:"Согласованы к выдаче · не выплачены",rejected:"Отказано"};
 let workspace=null,reports=[],active=false,editing=null,busy=false;
 const root=()=>document.getElementById(ROOT_ID);
 function msg(text,error=false){const el=root()?.querySelector("#dailyMessage");if(el){el.textContent=text;el.style.color=error?"#ffb6ad":"#b8d3e5";}}
 function posOptions(selected=""){
   const all=workspace?.stages||[];
   return '<option value="">Выбери работу из объекта</option>'+all.map(s=>
     '<optgroup label="'+esc(s.name)+'">'+(s.items||[]).map(p=>
       '<option value="'+esc(p.id)+'"'+(p.id===selected?' selected':'')+'>'+
       esc(p.name)+' · '+num(p.completed_quantity||0)+'/'+num(p.quantity)+' '+esc(p.unit)+'</option>').join("")+
     '</optgroup>').join("");
 }
 function findPosition(id){for(const s of workspace?.stages||[]){const p=(s.items||[]).find(x=>x.id===id);if(p)return p;}return null;}
 function row(p={}) {
   return '<div class="dailyLine"><label>Работа<select class="dailyPosition">'+posOptions(p.position_id||p.positionId||"")+'</select></label>'+
    '<label>Сделано за день<input class="dailyQty" type="number" min="0.01" step="0.01" value="'+esc(p.quantity??"")+'" placeholder="Например: 50"></label>'+
    '<button type="button" data-remove-line>×</button></div>';
 }
 async function call(action,values={},method="POST") {
   if(!db)throw Error("Не загрузилась авторизация");
   const {data:{session}}=await db.auth.getSession();
   if(!session?.access_token)throw Error("Войди в кабинет");
   const qs=method==="GET"?"?projectId="+encodeURIComponent(workspace.project.id):"";
   const r=await fetch("/api/daily-reports"+qs,{
     method,headers:{"Authorization":"Bearer "+session.access_token,...(method==="POST"?{"Content-Type":"application/json"}:{})},
     ...(method==="POST"?{body:JSON.stringify({action,...values})}:{})
   });
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw Error(result.error||"Ошибка сервера");
   return result;
 }
 function display(){
   if(!root()||!workspace)return;
   const foreman=!workspace.isOwner;
   root().innerHTML='<div class="panel" id="dailyPanel">'+
      '<div class="section-header"><div><h2>Рабочий день · отчёты</h2>'+
      '<p class="note">Объект → позиция → выполненный объём → фотографии → OWNER. Деньги из кассы согласовываются отдельно.</p></div>'+
      '<div class="actions">'+(foreman&&["active","paused"].includes(workspace.project.status)?
        '<button class="main" id="dailyNew" type="button">+ Вечерний отчёт</button>':"")+
      '<button id="dailyRefresh" type="button">↻ Обновить</button></div></div>'+
      '<div id="dailyMessage" class="status" aria-live="polite"></div>'+
      '<div id="dailyEditor"></div><div id="dailyList"></div></div>';
   root().querySelector("#dailyRefresh").onclick=()=>refresh();
   const newBtn=root().querySelector("#dailyNew");
   if(newBtn)newBtn.onclick=()=>openEditor(null);
   renderList();if(editing)renderEditor();
 }
 function renderList(){
   const holder=root()?.querySelector("#dailyList");if(!holder)return;
   holder.innerHTML='<h3 style="margin:20px 0 12px">История отчётов ('+reports.length+')</h3>'+
     (reports.length?reports.map(r=>{
      const lines=(r.lines||[]).map(l=>{
       const p=findPosition(l.position_id);
       return '<div class="dailyEntry"><strong>'+esc(p?.name||"Позиция")+'</strong><span>+'+num(l.quantity)+' '+esc(p?.unit||"")+'</span></div>';
      }).join("");
      const photos=(r.photos||[]).map(photo=>photo.url?
       '<a href="'+esc(photo.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(photo.original_name)+'"><img loading="lazy" src="'+esc(photo.url)+'" alt="Фото выполненной работы"></a>':"").join("");
      const canEdit=!workspace.isOwner&&["draft","rejected","changes_requested"].includes(r.status)&&["active","paused"].includes(workspace.project.status);
      const canReview=workspace.isOwner&&r.status==="submitted";
      const canCash=workspace.isOwner&&r.status==="approved"&&r.cash_status==="pending";
      return '<article class="dailyReport"><div class="section-header"><div><b>'+esc(r.work_date)+'</b>'+
       '<p class="note">'+esc(workStatus[r.status]||r.status)+(r.review_note?' · '+esc(r.review_note):"")+'</p></div>'+
       (canEdit?'<button type="button" data-edit="'+esc(r.id)+'">Продолжить черновик</button>':
       '<span class="chip '+(r.status==="approved"?"":"planned")+'">'+esc(workStatus[r.status]||r.status)+'</span>')+'</div>'+
       (r.description?'<p class="note" style="margin:8px 0">'+esc(r.description)+'</p>':"")+
       lines+'<div class="dailyPhotoStrip">'+photos+'</div>'+
       (r.cash_requested?'<div class="dailyCash"><b>Запрос из кассы: '+money(r.cash_requested_amount)+'</b>'+
        '<div class="note">'+esc(r.cash_purpose||"")+' · '+esc(cashStatus[r.cash_status]||r.cash_status)+
         (r.cash_approved_amount!==null?' · Решение OWNER: '+money(r.cash_approved_amount):"")+
         (r.cash_note?' · '+esc(r.cash_note):"")+'</div></div>':"")+
       (canReview?'<div class="actions"><button class="main" data-work-action="approve" data-report="'+esc(r.id)+'">Подтвердить объём</button>'+
         '<button data-work-action="return" data-report="'+esc(r.id)+'">Вернуть на исправление</button><button data-work-action="reject" data-report="'+esc(r.id)+'" class="danger">Отклонить</button></div>':"")+
       (canCash?'<div class="dailyCashDecision"><label>Сколько согласовать, zł<input type="number" data-cash-amount="'+esc(r.id)+'" min="0.01" max="1000000" step="0.01" value="'+esc(r.cash_requested_amount)+'"></label>'+
         '<label>Комментарий при изменении суммы или отказе<input data-cash-note="'+esc(r.id)+'" placeholder="Причина изменения или отказа"></label>'+
         '<div class="actions"><button data-cash-action="approve" data-report="'+esc(r.id)+'" class="main">Согласовать сумму</button>'+
         '<button data-cash-action="reject" data-report="'+esc(r.id)+'" class="danger">Отказать</button></div>'+
         '<p class="note">Одобрение суммы не списывает деньги из кассы. Выдача проводится отдельно в финансовом учёте.</p></div>':"")+
       '</article>';
     }).join(""):'<div class="empty">Отчётов пока нет. Бригадир может сохранить первый черновик за рабочий день.</div>');
   holder.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openEditor(reports.find(r=>r.id===b.dataset.edit)));
   holder.querySelectorAll("[data-work-action]").forEach(b=>b.onclick=()=>reviewWork(b.dataset.report,b.dataset.workAction));
   holder.querySelectorAll("[data-cash-action]").forEach(b=>b.onclick=()=>reviewCash(b.dataset.report,b.dataset.cashAction));
 }
 function openEditor(r){
   editing=r?{...r}:{id:null,work_date:localToday(),description:"",lines:[{}],cash_requested:false,cash_requested_amount:"",cash_purpose:"",photos:[]};
   renderEditor();
   root()?.querySelector("#dailyEditor")?.scrollIntoView({behavior:"smooth",block:"start"});
 }
 function renderEditor(){
   const host=root()?.querySelector("#dailyEditor");if(!host||!editing)return;
   const r=editing;
   host.innerHTML='<div class="dailyForm">'+
    '<div class="section-header"><h3>'+(r.id?"Редактировать отчёт":"Новый вечерний отчёт")+'</h3><button id="dailyClose" type="button">Закрыть</button></div>'+
    '<div class="grid2"><label>Дата работы<input id="dailyDate" type="date" value="'+esc(r.work_date||localToday())+'" required></label>'+
    '<label>Краткий комментарий<input id="dailyDescription" maxlength="2000" value="'+esc(r.description||"")+'" placeholder="Например, смонтировали каркас"></label></div>'+
    '<h4 style="margin:16px 0 6px">Что сделали</h4><div id="dailyLines">'+(r.lines||[{}]).map(row).join("")+'</div>'+
    '<button type="button" id="dailyAddLine">+ Добавить ещё работу</button>'+
    '<div class="dailyCashDecision"><label class="dailyCheck"><input type="checkbox" id="dailyNeedCash" '+(r.cash_requested?'checked':"")+'><span>Запросить деньги из кассы объекта</span></label>'+
    '<div id="dailyCashFields" '+(!r.cash_requested?'hidden':"")+' class="grid2">'+
    '<label>Сумма запроса, zł<input id="dailyCashAmount" type="number" min="0.01" step="0.01" value="'+esc(r.cash_requested_amount??"")+'" placeholder="500"></label>'+
    '<label>На что нужны деньги<input id="dailyCashPurpose" maxlength="500" value="'+esc(r.cash_purpose||"")+'" placeholder="Например: материалы на завтра"></label></div></div>'+
    '<div class="dailyPhotoBox"><label>Фотографии выполненной работы (JPG, PNG или WEBP, до 5 МБ каждая, максимум 50)<input id="dailyPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>'+
    '<p class="note">При отправке OWNER нужна минимум одна фотография. Черновик можно сохранить без фото.</p>'+
    '<div class="dailyPhotoStrip">'+(r.photos||[]).map(p=>p.url?
      '<span class="dailyPhotoWrap"><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(p.url)+'" alt="Фото работы"></a>'+
      '<button type="button" data-delete-photo="'+esc(p.id)+'" title="Удалить фото">×</button></span>':"").join("")+'</div></div>'+
    '<div class="actions"><button type="button" id="dailySaveDraft">Сохранить черновик</button>'+
    '<button type="button" id="dailySend" class="main">Отправить OWNER</button></div>'+
    '<p id="dailyEditorMessage" class="note" aria-live="polite"></p></div>';
   host.querySelector("#dailyClose").onclick=()=>{editing=null;host.replaceChildren()};
   host.querySelector("#dailyNeedCash").onchange=e=>host.querySelector("#dailyCashFields").hidden=!e.target.checked;
   host.querySelector("#dailyAddLine").onclick=()=>host.querySelector("#dailyLines").insertAdjacentHTML("beforeend",row());
   host.querySelector("#dailyLines").onclick=e=>{if(e.target.matches("[data-remove-line]"))e.target.closest(".dailyLine").remove()};
   host.querySelector("#dailySaveDraft").onclick=()=>save(false);
   host.querySelector("#dailySend").onclick=()=>save(true);
   host.querySelectorAll("[data-delete-photo]").forEach(b=>b.onclick=()=>deletePhoto(b.dataset.deletePhoto));
 }
 function collect(){
   const host=root().querySelector("#dailyEditor");
   const lines=[...host.querySelectorAll(".dailyLine")].map(e=>({
     positionId:e.querySelector(".dailyPosition").value,quantity:Number(e.querySelector(".dailyQty").value)
   })).filter(x=>x.positionId||x.quantity);
   if(lines.some(x=>!x.positionId||!Number.isFinite(x.quantity)||x.quantity<=0))throw Error("Выбери работу и объём больше нуля");
   const need=host.querySelector("#dailyNeedCash").checked;
   const amount=Number(host.querySelector("#dailyCashAmount").value);
   if(need&&(!Number.isFinite(amount)||amount<=0||!host.querySelector("#dailyCashPurpose").value.trim()))
     throw Error("Укажи сумму и назначение денег из кассы");
   const files=[...host.querySelector("#dailyPhotos").files];
   if(files.some(f=>!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>5242880||f.size===0))
     throw Error("Фотографии должны быть JPG, PNG или WEBP до 5 МБ");
   if(files.length+(editing.photos||[]).length>50)throw Error("Максимум 50 фотографий");
   return {projectId:workspace.project.id,reportId:editing.id||null,
     workDate:host.querySelector("#dailyDate").value,
     description:host.querySelector("#dailyDescription").value.trim(),
     lines,cashRequested:need,cashAmount:need?amount:null,
     cashPurpose:need?host.querySelector("#dailyCashPurpose").value.trim():null,files};
 }
 async function save(submit){
   if(busy)return;
   busy=true;
   const status=root()?.querySelector("#dailyEditorMessage"),buttons=root()?.querySelectorAll("#dailyEditor button");
   buttons?.forEach(b=>b.disabled=true);
   try{
     const values=collect();
     if(submit && !values.lines.length)throw Error("Добавь хотя бы одну позицию");
     status.textContent="Сохраняем...";
     const draft=await call("save",{...values,files:undefined,submit:false});
     editing.id=draft.reportId;
     for(const [index,file] of values.files.entries()){
       status.textContent="Загружаем фотографии: "+(index+1)+" / "+values.files.length;
       const signed=await call("photo-sign",{reportId:editing.id,mime:file.type,size:file.size});
       const {error:uploadError}=await db.storage.from(BUCKET).uploadToSignedUrl(signed.path,signed.token,file,{
         contentType:file.type,upsert:false
       });
       if(uploadError)throw Error("Не удалось загрузить "+file.name+": "+uploadError.message);
       await call("photo-attach",{reportId:editing.id,path:signed.path,name:file.name});
     }
     if(submit){
       status.textContent="Отправляем отчёт OWNER...";
       await call("save",{...values,files:undefined,reportId:editing.id,submit:true});
     }
     editing=null;
     await refresh();
     msg(submit?"Отчёт отправлен OWNER на проверку.":"Черновик сохранён в Supabase.");
   }catch(e){
     if(status)status.textContent="Ошибка: "+e.message;
     // Keep the editor and its newly created report ID for retry.
     buttons?.forEach(b=>b.disabled=false);
   }finally{busy=false}
 }
 async function deletePhoto(id){
   if(busy||!editing?.id)return;
   if(!confirm("Удалить эту фотографию из черновика?"))return;
   try{
     await call("photo-delete",{reportId:editing.id,photoId:id});
     await refresh();
     openEditor(reports.find(x=>x.id===editing.id)||null);
   }catch(e){msg(e.message,true)}
 }
 async function reviewWork(id,decision){
   if(busy)return;
   const note=decision==="return"||decision==="reject"?prompt(decision==="return"?"Что исправить бригадиру?":"Причина окончательного отказа:"):prompt("Комментарий к подтверждению (необязательно):","");
   if(note===null||["return","reject"].includes(decision)&&!note.trim())return;
   if(decision==="approve"&&!confirm("Подтвердить выполненные объёмы? Они прибавятся к прогрессу объекта."))return;
   busy=true;
   try{await call("review-work",{reportId:id,decision,note});if(decision==="approve"){location.reload();return;}await refresh();msg("Решение по выполненным работам сохранено.");}
   catch(e){msg(e.message,true)}finally{busy=false}
 }
 async function reviewCash(id,decision){
   if(busy)return;
   const amountEl=root().querySelector('[data-cash-amount="'+id+'"]');
   const noteEl=root().querySelector('[data-cash-note="'+id+'"]');
   const amount=Number(amountEl?.value),note=noteEl?.value.trim()||"";
   if(decision==="approve"&&(!Number.isFinite(amount)||amount<=0)){msg("Укажи положительную сумму",true);return}
   if(decision==="reject"&&!note){msg("При отказе нужна причина",true);return}
   if(decision==="approve"&&!confirm("Согласовать "+money(amount)+" к выдаче? Деньги НЕ будут списаны автоматически."))return;
   busy=true;
   try{await call("review-cash",{reportId:id,decision,approvedAmount:amount,note});await refresh();
     msg("Решение по кассе сохранено. Фактическая выдача оформляется отдельно.");}
   catch(e){msg(e.message,true)}finally{busy=false}
 }
 async function refresh(){
   if(!workspace||!root())return;
   msg("Загружаем журнал...");
   try{
     const result=await call(null,{},"GET");
     reports=result.items||[];
     const editId=editing?.id;
     editing=editId?reports.find(x=>x.id===editId)||null:null;
     renderList();
     const host=root().querySelector("#dailyEditor");
     if(editing)renderEditor();else host?.replaceChildren();
     msg("История обновлена · "+reports.length+" отчётов.");
   }catch(e){msg(e.message,true)}
 }
 function connect(info){
   workspace=info;
   if(!root()||root().querySelector("#dailyPanel"))return;
   active=true;display();
   if(root().hidden===false)refresh();
 }
 document.addEventListener("cgWorkspaceReady",e=>connect(e.detail));
 document.addEventListener("click",e=>{
   if(e.target.closest('[data-tab="reports"]')){
     if(!active&&window.cgProjectWorkspace)connect(window.cgProjectWorkspace);
     if(active)refresh();
   }
 });
 if(window.cgProjectWorkspace)connect(window.cgProjectWorkspace);
});
