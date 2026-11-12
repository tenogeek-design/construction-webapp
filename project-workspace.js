"use strict";
document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  const id = new URLSearchParams(location.search).get("id");
  const SUPABASE_URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const PUBLISHABLE_KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";
  const db=window.supabase?.createClient(SUPABASE_URL,PUBLISHABLE_KEY);
  const names={planned:"Запланирован",active:"В работе",paused:"Приостановлен",completed:"Завершён",cancelled:"Отменён"};
  const fmt=n=>new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN"}).format(Number(n||0));
  const num=n=>new Intl.NumberFormat("pl-PL",{maximumFractionDigits:2}).format(Number(n||0));
  const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const status=(name)=>names[name]||name;
  let project=null,stages=[],isOwner=false,employees=[],brigades=[],activeTab="overview",query="",busy=false;
  const setMessage=(text,error=false)=>{const el=$("message");el.textContent=text;el.style.color=error?"#ffc3bd":"#c3d6e6";el.hidden=false;};
  const onError=e=>setMessage(e?.message||"Ошибка загрузки",true);
  if(!db){setMessage("Не удалось загрузить систему авторизации.",true);return;}

  async function api(method,body,urlQuery=""){
    const {data:{session},error}=await db.auth.getSession();
    if(error||!session?.access_token){location.href="/login.html";throw Error("Войдите в кабинет");}
    const response=await fetch("/api/project-workspace"+urlQuery,{
      method,headers:{"Authorization":"Bearer "+session.access_token,...(body?{"Content-Type":"application/json"}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||"Сервер временно недоступен");
    return result;
  }
  function lineTotal(p){return Number(p.quantity)*Number(p.rate);}
  function doneTotal(p){return Number(p.completed_quantity)*Number(p.rate);}
  function totals(){
    const items=stages.flatMap(s=>s.items||[]);
    const plan=items.reduce((a,p)=>a+lineTotal(p),0),done=items.reduce((a,p)=>a+doneTotal(p),0);
    const pieces=items.length,perc=plan>0?Math.min(100,Math.max(0,Math.round(done/plan*100))):0;
    return {plan,done,pieces,perc};
  }
  function renderHeader(){
    const t=totals(),p=project;
    return '<div class="hero"><div><div class="kicker">CONSTRUCTION GROUP · OBIEKT</div><h1>'+html(p.name)+'</h1><p>'+html([p.city,p.street,p.building_number].filter(Boolean).join(", "))+'</p></div><span class="chip '+html(p.status)+'">'+html(status(p.status))+'</span></div>'+
     '<div class="metrics">'+
     '<div class="metric"><small>Смета по позициям</small><strong class="orange">'+fmt(t.plan)+'</strong></div>'+
     '<div class="metric"><small>Объём выполненных работ</small><strong>'+fmt(t.done)+'</strong></div>'+
     '<div class="metric"><small>Выполнено по стоимости</small><strong>'+t.perc+'%</strong></div>'+
     '<div class="metric"><small>Этапов / позиций</small><strong>'+stages.length+' / '+t.pieces+'</strong></div></div>';
  }
  function renderOverview(){
    return '<div class="panel"><div class="section-header"><h2>Обзор объекта</h2><span class="chip '+html(project.status)+'">'+html(status(project.status))+'</span></div>'+
     '<p class="note">Этот объект сохраняется в общей базе. Этапы и цены можно смотреть из кабинетов OWNER и назначенного бригадира.</p>'+
     '<div class="grid2">'+
     '<div class="data"><small>Адрес</small><b>'+html([project.city,project.street,project.building_number,project.apartment_number].filter(Boolean).join(", ")||"—")+'</b></div>'+
     '<div class="data"><small>Сроки</small><b>'+html([project.start_date||"Не указаны",project.end_date||""].filter(Boolean).join(" — "))+'</b></div>'+
     '<div class="data"><small>Ответственный</small><b id="overviewForeman">—</b></div>'+
     '<div class="data"><small>Бригада</small><b id="overviewBrigade">—</b></div>'+
     '<div class="data"><small>Сумма договора</small><b>'+(project.contract_amount==null?"Не указана":fmt(project.contract_amount))+'</b></div>'+
     '<div class="data"><small>Описание</small><b>'+html(project.description||"—")+'</b></div>'+
     '</div>'+
     (project.status==="planned"&&!project.foreman_id?'<p class="warning" style="margin-top:15px">Объект подтверждён, но ответственный бригадир ещё не назначен. Для начала работ OWNER должен назначить бригаду.</p>':"")+
     '<div class="actions" style="margin-top:18px"><button type="button" data-tab-switch="stages">Открыть этапы и позиции</button>'+
       (isOwner&&project.status==="planned"?'<button type="button" class="main" data-tab-switch="team">Назначить бригаду / начать работу</button>':"")+'</div>'+
     '<p class="note" style="margin-top:17px">Следующий модуль: рабочий день, фотографии, отчёты по конкретным позициям и заявки на дополнительные работы. Здесь пока не создаются финансовые начисления.</p></div>';
  }
  function renderStages(){
    const picked=query.toLocaleLowerCase().trim();
    const results=stages.map((s,idx)=>{
      const items=(s.items||[]).filter(p=>!picked||s.name.toLocaleLowerCase().includes(picked)||p.name.toLocaleLowerCase().includes(picked));
      if(picked&&!items.length)return "";
      const total=(s.items||[]).reduce((a,p)=>a+lineTotal(p),0),done=(s.items||[]).reduce((a,p)=>a+doneTotal(p),0),pct=total>0?Math.round(done/total*100):0;
      const itemHtml=items.length?items.map(p=>{
        const percent=Number(p.quantity)>0?Math.max(0,Math.min(100,Math.round(Number(p.completed_quantity)/Number(p.quantity)*100))):0;
        return '<div class="work"><div><b>'+html(p.name)+'</b><small>План: '+num(p.quantity)+' '+html(p.unit)+' · Выполнено: '+num(p.completed_quantity)+' '+html(p.unit)+'</small><div class="progress"><div style="width:'+percent+'%"></div></div></div><div><small>Ставка за '+html(p.unit)+'</small><b>'+fmt(p.rate)+'</b></div><div class="money">'+fmt(lineTotal(p))+'</div></div>';
      }).join(""):'<div class="empty">В этом этапе пока нет позиций.</div>';
      return '<article class="stage"><button type="button" data-stage-toggle="'+html(s.id)+'" aria-expanded="true"><span><strong>'+String(idx+1).padStart(2,"0")+' — '+html(s.name)+'</strong><small style="display:block;margin-top:5px;color:#b4c8d8">'+s.items.length+' позиций · '+pct+'% выполнено</small></span><span>⌄</span></button>'+
        '<div class="body" data-stage-body="'+html(s.id)+'">'+itemHtml+
        '<div class="stageTotal">Итого этапа: '+fmt(total)+'</div></div></article>';
    }).filter(Boolean).join("");
    return '<div class="panel"><div class="section-header"><h2>Этапы и позиции</h2><span class="note">'+stages.length+' этапов</span></div>'+
       '<p class="note">Согласованный план и цены. Новые позиции будем добавлять отдельной заявкой, сохраняя первоначальную смету и историю.</p>'+
       '<label style="max-width:520px;margin:17px 0">Поиск по работе или этапу<input id="positionSearch" type="search" placeholder="Например: GK, демонтаж, плитка..." value="'+html(query)+'"></label>'+
       (results||'<div class="empty">Позиции не найдены. Измени поисковый запрос или добавь их после согласования.</div>')+'</div>';
  }
  function option(id,label,selected){
    return '<option value="'+html(id)+'"'+(id===selected?' selected':'')+'>'+html(label)+'</option>';
  }
  function renderTeam(){
    const e=employees.find(x=>x.id===project.foreman_id),b=brigades.find(x=>x.id===project.brigade_id);
    if(!isOwner)return '<div class="panel"><h2>Команда объекта</h2><div class="grid2">'+
      '<div class="data"><small>Ответственный бригадир</small><b>Назначен OWNER</b></div>'+
      '<div class="data"><small>Объект</small><b>'+html(status(project.status))+'</b></div></div>'+
      '<p class="note">Назначение бригад и изменение статуса контролирует OWNER. Табели, зарплаты и расходы остаются в существующих разделах.</p></div>';
    const canEdit=!["completed","cancelled"].includes(project.status);
    return '<div class="panel"><h2>Управление объектом · OWNER</h2>'+
     '<p class="note">1. Назначь ответственного и бригаду. 2. Сохрани назначение. 3. Начни работу. Бюджеты зарплат и расходы этим действием не меняются.</p>'+
     '<form id="assignmentForm"><div class="grid2">'+
       '<label>Бригада<select id="brigadeId" '+(!canEdit?'disabled':'')+'>'+option("","Не назначена",project.brigade_id)+brigades.map(x=>option(x.id,x.name,project.brigade_id)).join("")+'</select></label>'+
       '<label>Ответственный бригадир<select id="foremanId" '+(!canEdit?'disabled':'')+'>'+option("","Не назначен",project.foreman_id)+employees.map(x=>option(x.id,x.full_name,project.foreman_id)).join("")+'</select></label>'+
     '</div><div class="actions"><button type="submit" class="main" '+(!canEdit?'disabled':'')+'>Сохранить назначение</button></div></form>'+
     '<div class="warning" style="margin-top:17px">Статус «Запланирован» не означает начало работ. Для запуска необходимо назначить бригаду и ответственного.</div>'+
     '<div class="actions">'+
     (project.status==="planned"?'<button class="main" data-action="start" '+(!project.foreman_id||!project.brigade_id?'disabled':'')+'>Начать работу</button>':"")+
     (project.status==="active"?'<button data-action="pause">Приостановить</button><button class="danger" data-action="complete">Завершить объект</button>':"")+
     (project.status==="paused"?'<button class="main" data-action="resume">Возобновить</button><button class="danger" data-action="complete">Завершить объект</button>':"")+
     '</div><div id="actionMessage" class="status" role="status"></div></div>';
  }
  function showTab(tab){
    activeTab=tab;
    document.querySelectorAll("[data-tab]").forEach(btn=>{
      const selected=btn.dataset.tab===tab;
      btn.classList.toggle("active",selected);
      btn.setAttribute("aria-selected",String(selected));
    });
    for(const key of ["overview","stages","team"]){const panel=$("panel-"+key);if(panel)panel.hidden=key!==tab}
  }
  function updateOverviewNames(){
    const foreman=employees.find(x=>x.id===project.foreman_id),brigade=brigades.find(x=>x.id===project.brigade_id);
    if($("overviewForeman"))$("overviewForeman").textContent=foreman?.full_name||(project.foreman_id?"Назначен":"Не назначен");
    if($("overviewBrigade"))$("overviewBrigade").textContent=brigade?.name||(project.brigade_id?"Назначена":"Не назначена");
  }
  async function changeState(action,foremanId=null,brigadeId=null){
    if(busy)return;
    if(action==="complete"&&!confirm("Завершить объект? Это действие нельзя отменить из кабинета."))return;
    busy=true;const info=$("actionMessage");
    if(info)info.textContent="Сохраняем...";
    try{
      await api("POST",{projectId:project.id,action,foremanId,brigadeId});
      await loadDetail();
      showTab("team");
      if($("actionMessage"))$("actionMessage").textContent="Изменения сохранены в Supabase.";
    }catch(e){if(info)info.textContent="Ошибка: "+e.message;else onError(e)}
    finally{busy=false}
  }
  function wire(){
    document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tab)));
    document.querySelectorAll("[data-tab-switch]").forEach(b=>b.addEventListener("click",()=>showTab(b.dataset.tabSwitch)));
    const stagePanel=$("panel-stages");
    stagePanel?.addEventListener("click",event=>{
      const button=event.target.closest("[data-stage-toggle]");
      if(!button||!stagePanel.contains(button))return;
      const body=stagePanel.querySelector('[data-stage-body="'+button.dataset.stageToggle+'"]');
      if(!body)return;
      body.hidden=!body.hidden;
      button.setAttribute("aria-expanded",String(!body.hidden));
    });
    stagePanel?.addEventListener("input",event=>{
      if(event.target.id!=="positionSearch")return;
      query=event.target.value;
      const cursor=event.target.selectionStart;
      stagePanel.innerHTML=renderStages();
      const input=$("positionSearch");
      input.focus();
      input.setSelectionRange(cursor,cursor);
    });
    $("assignmentForm")?.addEventListener("submit",ev=>{
      ev.preventDefault();changeState("assign",$("foremanId").value||null,$("brigadeId").value||null);
    });
    $("brigadeId")?.addEventListener("change",ev=>{
      const br=brigades.find(x=>x.id===ev.target.value);
      if(br?.foreman_id && $("foremanId"))$("foremanId").value=br.foreman_id;
    });
    document.querySelectorAll("[data-action]").forEach(b=>b.addEventListener("click",()=>changeState(b.dataset.action)));
  }
  function displayDetail(){
    $("message").hidden=true;
    $("page").hidden=false;
    const section=$("page");
    section.innerHTML=renderHeader()+
      '<div class="nav" role="tablist" aria-label="Раздел объекта">'+
        '<button data-tab="overview" type="button" role="tab">Обзор</button>'+
        '<button data-tab="stages" type="button" role="tab">Этапы и позиции</button>'+
        '<button data-tab="team" type="button" role="tab">Бригада и статус</button>'+
      '</div>'+
      '<section id="panel-overview">'+renderOverview()+'</section>'+
      '<section id="panel-stages">'+renderStages()+'</section>'+
      '<section id="panel-team">'+renderTeam()+'</section>';
    updateOverviewNames();
    wire();
    showTab(activeTab);
    $("back").href=isOwner?"/admin.html#projects":"/foreman.html#projects";
  }
  async function loadDetail(){
    const result=await api("GET",null,"?id="+encodeURIComponent(id));
    project=result.project;stages=result.stages||[];isOwner=Boolean(result.isOwner);
    employees=result.employees||[];brigades=result.brigades||[];
    document.title=project.name+" — CONSTRUCTION GROUP";
    displayDetail();
  }
  async function loadList(){
    const result=await api("GET");isOwner=Boolean(result.isOwner);
    $("back").href=isOwner?"/admin.html#projects":"/foreman.html#projects";
    $("message").hidden=true;$("page").hidden=false;
    const cards=(result.items||[]).map(p=>
      '<a class="listCard" href="/project-workspace.html?id='+encodeURIComponent(p.id)+'"><div><h3>'+html(p.name)+'</h3><p>'+html([p.city,p.street].filter(Boolean).join(", "))+' · '+html(status(p.status))+'</p></div><span class="back">Открыть объект →</span></a>').join("");
    $("page").innerHTML='<div class="hero"><div><div class="kicker">CONSTRUCTION GROUP</div><h1>Мои объекты</h1><p>Выбери объект для просмотра работ и управления.</p></div></div>'+
      (cards||'<div class="empty">Нет назначенных объектов. OWNER должен назначить ответственного и бригаду.</div>');
  }
  try{if(id)await loadDetail();else await loadList()}
  catch(e){onError(e);$("page").hidden=true}
});