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
 function findPosition(id){
   for(const s of workspace?.stages||[]){
     const p=(s.items||[]).find(x=>x.id===id);
     if(p)return p;
   }
   return null;
 }
 function stageForPosition(id){
   for(const s of workspace?.stages||[]){
     if((s.items||[]).some(p=>p.id===id))return s.id;
   }
   return "";
 }
 function stageOptions(selected=""){
   return '<option value="">Выбери этап работ</option>'+
     (workspace?.stages||[]).map(s=>
       '<option value="'+esc(s.id)+'"'+(selected===s.id?' selected':'')+'>'+esc(s.name)+'</option>'
     ).join("");
 }
 function posOptions(selected="",stageId=""){
   const stage=(workspace?.stages||[]).find(s=>s.id===stageId);
   return '<option value="">'+(stage?'Выбери позицию':'Сначала выбери этап')+'</option>'+
     (stage?.items||[]).map(p=>
       '<option value="'+esc(p.id)+'"'+(p.id===selected?' selected':'')+'>'+
       esc(p.name)+' · '+num(p.completed_quantity||0)+'/'+num(p.quantity)+' '+esc(p.unit)+'</option>'
     ).join("");
 }

 const aliases={
   tile:"укладка плитки кладка плитка плиточные работы облицовка kafel kafle",
   demoTile:"снятие плитки сбить плитку демонтаж плитки",
   demoScreed:"снять стяжку демонтаж бетона стяжки",
   demoFloor:"снять пол демонтаж пола",
   demoWalls:"слом стен демонтаж перегородок",
   demoPlaster:"сбить штукатурку штукатурки",
   gkFrame:"гипсокартон гк каркас профиль каркаса stelaż",
   gkCeiling:"потолок гк потолки гипсокартон",
   gkPartition:"перегородки гк стена гипсокартон",
   rubble:"мусор мусора винос вынос вывоз gruz wywoz smieci",
   cleanup:"уборка мусора уборка после ремонта",
   paint:"покраска покрасить стены малярка",
   skim:"шпатлевка шпаклевка шпаклевание",
   primer:"грунтовка грунтование"
 };
 const catalog=()=>Object.entries(window.CG_WORK_CATALOG||{}).map(([key,item])=>({key,...item}));
 const norm=v=>String(v||"").toLocaleLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").replace(/ł/g,"l").replace(/ґ/g,"г")
    .replace(/[^\p{L}\p{N}]+/gu," ").trim();
 function suggestions(line){
   const input=line.querySelector(".dailySearch"),box=line.querySelector(".dailySuggestions");
   if(!input||!box)return;
   const term=norm(input.value);
   if(term.length<2){box.hidden=true;box.innerHTML="";return;}
   const words=term.split(/\s+/).filter(Boolean);
   const matchesProject=(workspace?.stages||[]).flatMap(s=>(s.items||[])
      .filter(p=>words.every(w=>norm(p.name+" "+s.name).includes(w)))
      .map(p=>({type:"project",id:p.id,name:p.name,unit:p.unit,rate:p.rate,stageId:s.id})));
   const matchesCatalog=catalog()
     .filter(item=>words.every(w=>norm(item.pl+" "+item.ua+" "+(aliases[item.key]||"")).includes(w)))
     .map(item=>({type:"catalog",id:item.key,name:item.ua||item.pl,
       unit:item.unit,rate:item.price}));
   const matches=[...matchesProject,...matchesCatalog].slice(0,9);
   box.hidden=false;
   box.innerHTML=matches.length?matches.map(m=>
     '<button type="button" class="dailySuggestion" data-kind="'+esc(m.type)+
      '" data-id="'+esc(m.id)+'"><b>'+esc(m.name)+'</b><small>'+
      (m.type==="project"?"Согласовано в объекте · ":"Прайс · ")+
      esc(m.unit)+(m.rate!==null&&m.rate!==undefined?" · "+money(m.rate):" · цена вручную")+
      '</small></button>').join(""):
     '<div class="note">Нет в прайсе — впиши свою работу. Если это просто заметка, достаточно названия.</div>';
 }
 function recalcLine(line){
   const qtyRaw=line.querySelector(".dailyQty")?.value||"";
   const qty=Number(qtyRaw),mode=line.querySelector(".dailyMode")?.value;
   let rate=null,unit="",label="";
   if(mode==="object"){
      const p=findPosition(line.querySelector(".dailyPosition")?.value);
      if(p){rate=Number(p.rate);unit=p.unit;label="Ставка по объекту";}
   }else{
      const raw=line.querySelector(".dailyRate")?.value||"";
      if(raw!==""){rate=Number(raw);unit=line.querySelector(".dailyUnit")?.value||"";}
      label=line.dataset.catalogKey?"Цена из прайса (ориентир)":"Указанная вручную цена";
   }
   const output=line.querySelector(".dailyCalc");
   if(!output)return;
   output.textContent=qtyRaw!==""&&qty>0&&rate!==null&&Number.isFinite(rate)?
    label+": "+num(qty)+" "+unit+" × "+money(rate)+" = "+money(qty*rate):
    "Расчёт появится после выбора работы, объёма и цены";
 }
 function recalcEditor(){
   const host=root()?.querySelector("#dailyEditor");
   if(!host)return;
   let total=0,unpriced=0,count=0;
   host.querySelectorAll(".dailyLine").forEach(line=>{
     const quantity=Number(line.querySelector(".dailyQty")?.value);
     if(!Number.isFinite(quantity)||quantity<=0)return;
     let rate=null;
     if(line.querySelector(".dailyMode")?.value==="object"){
       const p=findPosition(line.querySelector(".dailyPosition")?.value);
       if(p)rate=Number(p.rate);
     }else{
       const rateRaw=line.querySelector(".dailyRate")?.value;
       if(rateRaw!==""&&rateRaw!==undefined)rate=Number(rateRaw);
     }
     if(rate===null||!Number.isFinite(rate)){unpriced++;return}
     total+=quantity*rate;count++;
   });
   const output=host.querySelector("#dailyGrand");
   if(output){
     output.innerHTML='<span>Стоимость выполненных работ</span><strong>'+money(total)+'</strong>'+
       '<small>'+(unpriced?unpriced+' поз. без цены · ':'')+
       'Предварительная сумма. После отправки её проверит OWNER; это не выплата.</small>';
   }
 }
 function row(p={}){
   const positionId=p.position_id||p.positionId||"";
   const stageId=stageForPosition(positionId);
   const isExtra=Boolean(p.source||p.work_name);
   const mode=isExtra?"extra":(positionId?"object":"extra");
   const workName=p.work_name||p.name||"";
   const rawPrice=p.unit_price??p.price??"";
   return '<div class="dailyLine" data-catalog-key="'+esc(p.catalog_key||p.catalogKey||"")+'">'+
    '<label>Вид работы<select class="dailyMode">'+
    '<option value="extra"'+(mode==="extra"?" selected":"")+'>Поиск в прайсе / своя работа</option>'+
    '<option value="object"'+(mode==="object"?" selected":"")+'>Позиция утверждённого объекта</option></select></label>'+
    '<div class="dailyApprovedFields"'+(mode==="extra"?" hidden":"")+'>'+
      '<div class="dailyFieldsGrid">'+
      '<label>Этап<select class="dailyStage">'+stageOptions(stageId)+'</select></label>'+
      '<label>Позиция<select class="dailyPosition">'+posOptions(positionId,stageId)+'</select></label></div>'+
      '<p class="note">Для согласованных позиций ставка берётся из сметы объекта.</p></div>'+
    '<div class="dailyExtraFields"'+(mode==="object"?" hidden":"")+'>'+
      '<label>Название работы — начни вводить<input class="dailySearch" autocomplete="off" maxlength="160" placeholder="Плитка, демонтаж, GK, вывоз мусора..." value="'+esc(workName)+'"></label>'+
      '<div class="dailySuggestions" role="group" aria-label="Подсказки из прайса" hidden></div>'+
      '<div class="dailyFieldsGrid">'+
        '<label>Единица измерения<input class="dailyUnit" maxlength="24" placeholder="м² / м³ / шт. (без числа)" value="'+esc(p.unit||"")+'"></label>'+
        '<label>Цена за единицу, zł<input class="dailyRate" type="number" min="0" max="10000000" step="0.01" placeholder="Можно не указывать" value="'+esc(rawPrice)+'"></label></div>'+
      '<p class="note">Новая робота — окремий запис. Ціна орієнтовна, кошторис не змінюється. Лише зауваження чи сміття? Можна залишити тільки назву без ціни та кількості.</p></div>'+
    '<div class="dailyProgressEntry"><label>Количество выполнено (например, 20)<input class="dailyQty" type="number" min="0.01" step="0.01" value="'+esc(p.quantity??"")+'" placeholder="20"></label>'+ 
    (mode==="object"?'<label>Или укажи % от общего объёма<input class="dailyPercent" type="number" min="0.01" max="100" step="0.01" placeholder="Например: 15"><small class="dailyPercentHint">Процент переведём в объём по смете</small></label>':'')+'</div>'+
    '<div class="dailyCalc" aria-live="polite">Расчёт по позиции</div>'+
    '<button type="button" data-remove-line aria-label="Удалить позицию">×</button></div>';
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
      '<p class="note">Объект → этап → позиция → выполненный объём → фотографии → OWNER. Деньги из кассы согласовываются отдельно.</p></div>'+
      '<div class="actions">'+(foreman&&["active","paused"].includes(workspace.project.status)?
        '<button class="main" id="dailyNew" type="button">+ Вечерний отчёт</button>':"")+
      '<button id="dailyRefresh" type="button">↻ Обновить</button></div></div>'+
      (workspace.isOwner?'<p class="note">Вы вошли как OWNER. Здесь можно проверять и подтверждать отчёты. Создание вечерних отчётов доступно только назначенному бригадиру в его кабинете.</p>':'')+
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
      const extras=(r.extras||[]).map(x=>
       '<div class="dailyEntry"><strong>'+esc(x.work_name)+
       '<small class="note"> · '+(x.source==="catalog"?"Из прайса":"Своя работа")+'</small></strong>'+
       '<span>+'+num(x.quantity)+' '+esc(x.unit)+
       (x.unit_price!==null?' · '+money(Number(x.quantity)*Number(x.unit_price)):' · цена не указана')+
       '</span></div>').join("");
      const pricedPlan=(r.lines||[]).reduce((sum,x)=>{
        const p=findPosition(x.position_id);return sum+(p?Number(x.quantity)*Number(p.rate):0);
      },0);
      const pricedExtra=(r.extras||[]).reduce((sum,x)=>
        sum+(x.unit_price===null?0:Number(x.quantity)*Number(x.unit_price)),0);
      const hasAnyRate=(r.lines||[]).some(x=>findPosition(x.position_id))||
        (r.extras||[]).some(x=>x.unit_price!==null);
      const lineEstimate=hasAnyRate?
        '<div class="dailyEstimate">Ориентировочная стоимость указанных работ: <strong>'+
        money(pricedPlan+pricedExtra)+'</strong><div class="note">Не выплата, не утверждённое изменение сметы.'+
        ' Цены из прайса — ориентир; позиции вне объекта требуют отдельного согласования.</div></div>':"";
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
       lines+extras+lineEstimate+'<div class="dailyPhotoStrip">'+photos+'</div>'+
       (r.cash_requested?'<div class="dailyCash"><b>Запрос из кассы: '+money(r.cash_requested_amount)+'</b>'+
        '<div class="note">'+esc(r.cash_purpose||"")+' · '+esc(cashStatus[r.cash_status]||r.cash_status)+
         (r.cash_approved_amount!==null?' · Решение OWNER: '+money(r.cash_approved_amount):"")+
         (r.cash_note?' · '+esc(r.cash_note):"")+'</div></div>':"")+
       (canReview?'<div class="actions"><button class="main" data-work-action="approve" data-report="'+esc(r.id)+'">Утвердить отчёт</button>'+
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
 document.addEventListener("cg:daily-report-position",event=>{
   const positionId=event.detail?.positionId;
   if(!positionId||!findPosition(positionId)||workspace?.isOwner)return;
   openEditor({id:null,work_date:localToday(),description:"",lines:[{position_id:positionId}],
     extras:[],cash_requested:false,cash_requested_amount:"",cash_purpose:"",photos:[]});
 });
 function openEditor(r){
   if(workspace?.isOwner){msg("OWNER проверяет отчёты. Для отправки войдите под назначенным бригадиром.",true);return;}
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
    '<h4 style="margin:16px 0 6px">Что сделали</h4><p class="note">Пиши название — покажем совпадения из прайса или утверждённых позиций. Если это вывоз мусора чи інша нестандартна робота, напиши вручну.</p>'+
     '<div id="dailyLines">'+(([...(r.lines||[]),...(r.extras||[])].length?
       [...(r.lines||[]),...(r.extras||[])]:[{}]).map(row).join(""))+'</div>'+
    '<button type="button" id="dailyAddLine">+ Добавить ещё работу</button>'+
    '<div class="dailyGrand" id="dailyGrand" aria-live="polite">Расчёт по всем позициям</div>'+
    '<details class="dailyMaterials" '+(r.cash_requested?'open':"")+'><summary>Материалы · доставка · деньги из кассы <small>Открыть при необходимости</small></summary>'+
    '<p class="note">Тут запрашивают средства на закупку или доставку. Это не оплата выполненной работы.</p>'+
    '<div class="dailyCashDecision"><label class="dailyCheck"><input type="checkbox" id="dailyNeedCash" '+(r.cash_requested?'checked':"")+'><span>Нужны деньги из кассы объекта</span></label>'+
    '<div id="dailyCashFields" '+(!r.cash_requested?'hidden':"")+' class="grid2">'+
    '<label>Сумма запроса, zł<input id="dailyCashAmount" type="number" min="0.01" step="0.01" value="'+esc(r.cash_requested_amount??"")+'" placeholder="500"></label>'+
    '<label>На что нужны деньги<input id="dailyCashPurpose" maxlength="500" value="'+esc(r.cash_purpose||"")+'" placeholder="Материалы, доставка, аренда..."></label></div></div></details>'+
    '<div class="dailyPhotoBox"><label>Фотографии выполненной работы (JPG, PNG или WEBP, до 5 МБ каждая, максимум 50)<input id="dailyPhotos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label>'+
    '<p class="note">При отправке OWNER сейчас обязательна минимум одна фотография. Для закрытия работ свыше 500 zł фото обязательно по правилу компании. Черновик сохраняется без фото.</p>'+
    '<div class="dailyPhotoStrip">'+(r.photos||[]).map(p=>p.url?
      '<span class="dailyPhotoWrap"><a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(p.url)+'" alt="Фото работы"></a>'+
      '<button type="button" data-delete-photo="'+esc(p.id)+'" title="Удалить фото">×</button></span>':"").join("")+'</div></div>'+
    '<div class="dailySubmitGuide"><strong>Как записать работу?</strong><p><b>Сохранить сделанное</b> — оставить запись за день без отправки. <b>Отправить OWNER</b> — передать объёмы и предварительную стоимость на подтверждение. Например: залито 20 ям × 140 zł = 2 800 zł к согласованию.</p></div>'+
    '<div class="actions"><button type="button" id="dailySaveDraft">Сохранить сделанное</button>'+
    '<button type="button" id="dailySend" class="main">Отправить работы и сумму OWNER</button></div>'+
    '<p id="dailyEditorMessage" class="note" aria-live="polite"></p></div>';
   host.querySelector("#dailyClose").onclick=()=>{editing=null;host.replaceChildren()};
   host.querySelector("#dailyNeedCash").onchange=e=>host.querySelector("#dailyCashFields").hidden=!e.target.checked;
   host.querySelector("#dailyAddLine").onclick=()=>{
     host.querySelector("#dailyLines").insertAdjacentHTML("beforeend",row());
     recalcEditor();
   };
   const linesHost=host.querySelector("#dailyLines");
   // Common mobile input: "20м²" typed into the unit field. Split it into
   // quantity=20 and unit=м², only if quantity has not already been entered.
   linesHost.addEventListener("focusout",event=>{
     if(!event.target.matches(".dailyUnit"))return;
     const input=event.target,line=input.closest(".dailyLine");
     const quantity=line?.querySelector(".dailyQty");
     const match=input.value.trim().match(/^(\\d+(?:[.,]\\d+)?)\\s*(м²|м2|m²|m2|м³|м3|m³|m3|шт\\.?|szt\\.?|mb|мп)$/iu);
     if(!match||!quantity||quantity.value.trim())return;
     quantity.value=match[1].replace(",",".");
     input.value=match[2];
     recalcLine(line);recalcEditor();
   },true);
   linesHost.addEventListener("change",event=>{
     const line=event.target.closest(".dailyLine");if(!line)return;
     if(event.target.matches(".dailyMode")){
       const manual=event.target.value==="extra";
       line.querySelector(".dailyApprovedFields").hidden=manual;
       line.querySelector(".dailyExtraFields").hidden=!manual;
       line.querySelector(".dailySuggestions").hidden=true;
     }
     if(event.target.matches(".dailyStage")){
       const position=line.querySelector(".dailyPosition");
       if(position)position.innerHTML=posOptions("",event.target.value);
     }
     recalcLine(line);
     recalcEditor();
   });
   linesHost.addEventListener("input",event=>{
     const line=event.target.closest(".dailyLine");if(!line)return;
     if(event.target.matches(".dailyPercent")){
       const p=findPosition(line.querySelector(".dailyPosition")?.value);
       const pct=Number(event.target.value);
       const quantity=line.querySelector(".dailyQty");
       if(p&&quantity&&event.target.value!==""&&Number.isFinite(pct)&&pct>0&&pct<=100){
         quantity.value=(Number(p.quantity)*pct/100).toFixed(2);
         const hint=line.querySelector(".dailyPercentHint");
         if(hint)hint.textContent=pct+"% от "+num(p.quantity)+" "+p.unit+" = "+num(quantity.value)+" "+p.unit+" · предложено OWNER";
       }
     }
     if(event.target.matches(".dailyQty")){
       const hint=line.querySelector(".dailyPercentHint");
       if(hint)hint.textContent="Указан объём вручную — он отправится OWNER на проверку";
       const pct=line.querySelector(".dailyPercent");
       if(pct)pct.value="";
     }
     if(event.target.matches(".dailySearch")){
       line.dataset.catalogKey="";
       suggestions(line);
     }
     recalcLine(line);
     recalcEditor();
   });
   linesHost.addEventListener("focusin",event=>{
     const line=event.target.closest(".dailyLine");
     if(line&&event.target.matches(".dailySearch"))suggestions(line);
   });
   linesHost.addEventListener("click",event=>{
     const pick=event.target.closest(".dailySuggestion");
     if(pick){
       const line=pick.closest(".dailyLine");
       const key=pick.dataset.id;
       if(pick.dataset.kind==="project"){
         const stageId=stageForPosition(key);
         line.querySelector(".dailyMode").value="object";
         line.querySelector(".dailyApprovedFields").hidden=false;
         line.querySelector(".dailyExtraFields").hidden=true;
         line.querySelector(".dailyStage").value=stageId;
         line.querySelector(".dailyPosition").innerHTML=posOptions(key,stageId);
         line.dataset.catalogKey="";
       }else{
         const item=(window.CG_WORK_CATALOG||{})[key];
         if(item){
           line.querySelector(".dailySearch").value=item.ua||item.pl;
           line.querySelector(".dailyUnit").value=item.unit||"";
           line.querySelector(".dailyRate").value=item.price??"";
           line.dataset.catalogKey=key;
         }
       }
       line.querySelector(".dailySuggestions").hidden=true;
       recalcLine(line);
     recalcEditor();
       return;
     }
     const remove=event.target.closest("[data-remove-line]");
     if(remove){remove.closest(".dailyLine")?.remove();recalcEditor();return;}
   });
   linesHost.querySelectorAll(".dailyLine").forEach(recalcLine);
   recalcEditor();
   host.querySelector("#dailySaveDraft").onclick=()=>save(false);
   host.querySelector("#dailySend").onclick=()=>save(true);
   host.querySelectorAll("[data-delete-photo]").forEach(b=>b.onclick=()=>deletePhoto(b.dataset.deletePhoto));
 }
 function collect(){
   const host=root().querySelector("#dailyEditor");
   const lines=[],extras=[];
   const workRows=[...host.querySelectorAll(".dailyLine")];
   for(const e of workRows){
     const mode=e.querySelector(".dailyMode")?.value;
     const quantityRaw=e.querySelector(".dailyQty")?.value?.trim()||"";
     const quantity=Number(quantityRaw);
     if(mode==="object"){
       const positionId=e.querySelector(".dailyPosition")?.value||"";
       if(!positionId&&!quantityRaw)continue;
       if(!positionId||!quantityRaw||!Number.isFinite(quantity)||quantity<=0||quantity>1000000)
         throw Error("Для работы из объекта выбери этап, позицию и положительный объём");
       if(lines.some(x=>x.positionId===positionId))
         throw Error("Позиция объекта повторяется — объедини объёмы в одну строку");
       lines.push({positionId,quantity});
     }else{
       const name=e.querySelector(".dailySearch")?.value?.trim()||"";
       const unit=e.querySelector(".dailyUnit")?.value?.trim()||"";
       const rateRaw=e.querySelector(".dailyRate")?.value?.trim()||"";
       if(!name&&!unit&&!quantityRaw&&!rateRaw)continue;
       const noteOnly=name.length>=2 && !e.dataset.catalogKey && !unit && !quantityRaw && !rateRaw;
       if(noteOnly){
         extras.push({source:"manual",catalogKey:null,name,unit:"заметка",quantity:1,price:null});
         continue;
       }
       if(name.length<2||name.length>160||unit.length<1||unit.length>24||
          !quantityRaw||!Number.isFinite(quantity)||quantity<=0||quantity>1000000)
         throw Error("Заполни название, единицу и объём новой работы (или оставь только название для заметки)");
       const price=rateRaw===""?null:Number(rateRaw);
       if(price!==null&&(!Number.isFinite(price)||price<0||price>10000000))
         throw Error("Проверь цену за единицу");
       const catalogKey=e.dataset.catalogKey||null;
       extras.push({source:catalogKey?"catalog":"manual",catalogKey,
         name,unit,quantity,price});
     }
   }
   if(lines.length+extras.length>40)throw Error("В одном отчёте максимум 40 позиций");
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
     lines,extras,cashRequested:need,cashAmount:need?amount:null,
     cashPurpose:need?host.querySelector("#dailyCashPurpose").value.trim():null,files};
 }
 async function save(submit){
   if(workspace?.isOwner){msg("OWNER не отправляет отчёты от имени бригадира.",true);return;}
   if(busy)return;
   busy=true;
   const status=root()?.querySelector("#dailyEditorMessage"),buttons=root()?.querySelectorAll("#dailyEditor button");
   buttons?.forEach(b=>b.disabled=true);
   try{
     const values=collect();
     if(submit && !values.lines.length && !values.extras.length)throw Error("Добавь хотя бы одну позицию");
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
   if(decision==="approve"&&!confirm("Утвердить отчёт? Подтверждённый объём прибавится к прогрессу объекта. Деньги не спишутся."))return;
   busy=true;
   try{await call("review-work",{reportId:id,decision,note});await refresh();msg("Решение по выполненным работам сохранено.");}
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
