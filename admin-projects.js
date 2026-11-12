"use strict";
(() => {
  const URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";
  const $ = id => document.getElementById(id);
  if (!$('projectsTable') || !window.supabase) return;
  const db = window.supabase.createClient(URL, KEY);
  const statuses = {planned:'Запланирован',active:'В работе',paused:'Приостановлен',completed:'Завершён',cancelled:'Отменён'};
  const ids = {id:'projectId',name:'projectName',city:'projectCity',street:'projectStreet',building_number:'projectBuilding',apartment_number:'projectApartment',status:'projectStatus',start_date:'projectStartDate',end_date:'projectEndDate',contract_amount:'projectAmount',brigade_id:'projectBrigade',foreman_id:'projectForeman',description:'projectDescription',private_notes:'projectNotes'};
  let projects = [], brigades = [], employees = [], dynamics = new Map(), canWrite = false, initialized = false;
  const msg = (s, error=false) => { $('projectsMessage').textContent=s; $('projectsMessage').style.color=error?'#ff8585':'#a4a7ad'; };
  const formMsg = (s,error=false) => { $('projectFormMessage').textContent=s; $('projectFormMessage').style.color=error?'#ff8585':'#a4a7ad'; };
  const errorText = e => e?.message || String(e);
  const money = n => n == null ? '—' : new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(Number(n));
  const displayName = e => [e.first_name,e.last_name].filter(Boolean).join(' ') || e.full_name || e.name || e.email || String(e.id).slice(0,8);
  const option = (value,label) => { const el=document.createElement('option'); el.value=value; el.textContent=label; return el; };
  const setOptions = (id, list, title, labelFn) => { const el=$(id); el.replaceChildren(option('',title)); list.forEach(x=>el.append(option(x.id,labelFn(x)))); };
  async function auth() {
    const {data:{session},error} = await db.auth.getSession();
    if(error || !session) throw new Error('Войдите в админку заново.');
    const {data, error:permError} = await db.rpc('get_my_effective_permissions');
    if(permError) throw new Error('Не удалось проверить права: '+errorText(permError));
    const list = Array.isArray(data) ? data : [];
    const allowed = code => list.some(x => x.permission_code===code && x.scope==='all');
    if(!allowed('projects.view')) throw new Error('Нет разрешения projects.view:all.');
    canWrite=allowed('projects.create') && allowed('projects.update');
    $('projectNewBtn').style.display=allowed('projects.create')?'':'none';
    return {create:allowed('projects.create'),update:allowed('projects.update')};
  }
  let access={create:false,update:false};
  async function load() {
    msg('Загружаем объекты...');
    try {
      access=await auth();
      const [p,b,e] = await Promise.all([
        db.from('projects').select('*').order('created_at',{ascending:false}),
        db.from('brigades').select('id,name,foreman_id').order('name'),
        db.from('employees').select('*').limit(500)
      ]);
      if(p.error) throw p.error;
      projects=p.data||[];
      if(b.error) { brigades=[]; msg('Объекты загружены, но бригады недоступны: '+errorText(b.error),true); } else brigades=b.data||[];
      if(e.error) { employees=[]; msg('Объекты загружены, но сотрудники недоступны: '+errorText(e.error),true); } else employees=e.data||[];
      try{
        const {data:{session}}=await db.auth.getSession();
        const response=await fetch('/api/owner-project-dynamics',{headers:{Authorization:'Bearer '+session.access_token}});
        const json=await response.json();
        if(!response.ok)throw Error(json.error||'Нет данных');
        dynamics=new Map((json.items||[]).map(x=>[x.id,x]));
      }catch(err){dynamics=new Map();msg('Объекты загружены. Динамика временно недоступна: '+errorText(err),true);}
      setOptions('projectBrigade',brigades,'Не назначена',x=>x.name);
      setOptions('projectForeman',employees,'Не назначен',displayName);
      render();
      if(!b.error && !e.error) msg('Загружено объектов: '+projects.length+(dynamics.size?' · динамика работ обновлена':' · динамика пока недоступна'));
    } catch(err) { msg(errorText(err),true); $('projectsTable').replaceChildren(); }
  }
  function render() {
    $('projectsTotal').textContent=projects.length;
    for(const [id,status] of [['projectsActive','active'],['projectsPlanned','planned'],['projectsCompleted','completed']]) $(id).textContent=projects.filter(p=>p.status===status).length;
    const search=$('projectsSearch').value.trim().toLocaleLowerCase();
    const filter=$('projectsStatusFilter').value;
    const filtered=projects.filter(p=>(!filter||p.status===filter)&&[p.name,p.city,p.street].some(v=>String(v||'').toLocaleLowerCase().includes(search)));
    const host=$('projectsTable'); host.replaceChildren();
    if(!filtered.length) { const p=document.createElement('p'); p.textContent='Объекты не найдены.'; p.style.padding='16px'; host.append(p); return; }
    const grid=document.createElement('div');grid.className='owner-project-grid';
    const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x;};
    filtered.forEach(p=>{
      const d=dynamics.get(p.id),brigade=brigades.find(b=>b.id===p.brigade_id);
      const card=el('article','owner-project-card');
      const head=el('div','owner-project-head');
      const heading=el('div','owner-project-heading');
      heading.append(el('h3','',p.name||'Без названия'));
      heading.append(el('p','', [p.city,p.street,p.building_number].filter(Boolean).join(', ')||'Адрес не указан'));
      head.append(heading,el('span','owner-project-status status-'+p.status,statuses[p.status]||p.status));
      card.append(head);
      const meta=el('div','owner-project-meta');
      meta.append(el('span','',brigade?.name||'Бригада не назначена'));
      if(p.start_date||p.end_date)meta.append(el('span','',[p.start_date||'—',p.end_date||'—'].join(' → ')));
      card.append(meta);
      const numbers=el('div','owner-project-numbers');
      const metric=(title,value)=>{const wrap=el('div','owner-project-metric');wrap.append(el('small','',title),el('strong','',value));return wrap};
      numbers.append(metric('Смета работ',d?.positions?money(d.estimate):'—'),
       metric('Подтверждено',d?.positions?money(d.completed):'—'),
       metric('Выполнено',d?.progress==null?'—':d.progress+'%'));
      card.append(numbers);
      const progress=el('div','owner-project-progress');
      const fill=el('div','owner-project-progress-fill');fill.style.width=(d?.progress||0)+'%';progress.append(fill);card.append(progress);
      const activity=el('div','owner-project-activity');
      activity.append(el('span','',d?'Позиций: '+d.positions+' · Отчётов: '+d.reportCount:'Динамика загружается'));
      activity.append(el('span','',d?.lastReport?'Последний отчёт: '+d.lastReport:'Нет отправленных отчётов'));
      card.append(activity);
      if(d?.pending){card.append(el('div','owner-project-alert','● На проверке: '+money(d.pendingValue)+' · '+d.pending+' отчёт(ов) от бригадира'))}
      if(d?.cashPending){card.append(el('div','owner-project-alert cash','● Запросы из кассы: '+money(d.cashRequested)+' · '+d.cashPending+' заявок'))}
      const actions=el('div','owner-project-actions');
      const review=el('button','owner-project-review','Проверить отчёты'+(d?.pending?' ('+d.pending+')':''));
      review.type='button';
      review.addEventListener('click',()=>{
        if(!window.ownerReportReview){msg('Модуль проверки ещё загружается. Обнови страницу.',true);return}
        window.ownerReportReview.open(p);
      });
      const workspace=el('a','owner-project-open','Открыть объект');workspace.href='/project-workspace.html?id='+encodeURIComponent(p.id);
      const editBtn=el('button','owner-project-edit',access.update?'Редактировать':'Просмотр');editBtn.type='button';editBtn.addEventListener('click',()=>edit(p));
      actions.append(review,workspace,editBtn);card.append(actions);grid.append(card);
    });
    host.append(grid);
  }
  function edit(p=null) {
    $('projectForm').reset();
    Object.entries(ids).forEach(([field,id])=>{const el=$(id);if(el)el.value=p?.[field]??'';});
    $('projectStatus').value=p?.status||'planned';
    $('projectEditorTitle').textContent=p?(access.update?'Редактировать объект':'Просмотр объекта'):'Новый объект';
    const writable=p?access.update:access.create;
    $('projectForm').querySelectorAll('input,select,textarea').forEach(el=>{if(el.type!=='hidden')el.disabled=!writable;});
    // Assignment and lifecycle are changed only via the audited OWNER workspace.
    for(const id of ['projectStatus','projectBrigade','projectForeman']) $(id).disabled=true;
    $('projectSaveBtn').style.display=writable?'':'none';
    formMsg('Статус, бригада и ответственный назначаются через кнопку «Открыть» → «Бригада и статус». Здесь редактируются только данные объекта и сумма договора.');$('projectEditorPanel').style.display='block';$('projectEditorPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function save(ev) {
    ev.preventDefault();
    const id=$('projectId').value;
    if(!(id?access.update:access.create)) return formMsg('Нет прав на сохранение.',true);
    const payload={};
    for(const [field,elementId] of Object.entries(ids)) {
      if(field==='id'||field==='status'||field==='brigade_id'||field==='foreman_id')continue;
      const raw=$(elementId).value.trim();
      payload[field]=raw===''?null:field==='contract_amount'?Number(raw):raw;
    }
    payload.name=$('projectName').value.trim();payload.city=$('projectCity').value.trim();
    // New legacy projects start as planned, without assignments.
    // Existing status and assigned team must never be overwritten here.
    if(!id){payload.status='planned';payload.foreman_id=null;payload.brigade_id=null;}
    payload.currency='PLN';
    if(!payload.name||!payload.city)return formMsg('Название и город обязательны.',true);
    if(payload.start_date&&payload.end_date&&payload.end_date<payload.start_date)return formMsg('Дата окончания раньше начала.',true);
    if(payload.contract_amount!==null&&(!Number.isFinite(payload.contract_amount)||payload.contract_amount<0))return formMsg('Некорректная сумма.',true);
    const btn=$('projectSaveBtn');btn.disabled=true;formMsg('Сохраняем...');
    try {
      await auth();
      const query=id?db.from('projects').update(payload).eq('id',id).select('id'):db.from('projects').insert(payload).select('id');
      const {data,error}=await query;
      if(error)throw error;
      if(!data?.length)throw new Error('Сохранение не подтверждено. Проверьте RLS и разрешения.');
      $('projectEditorPanel').style.display='none';await load();msg('Объект сохранён.');
    }catch(err){formMsg('Ошибка: '+errorText(err),true);}finally{btn.disabled=false;}
  }
  $('projectNewBtn').addEventListener('click',()=>edit());
  $('projectsRefreshBtn').addEventListener('click',load);
  $('projectsSearch').addEventListener('input',render);
  $('projectsStatusFilter').addEventListener('change',render);
  $('projectForm').addEventListener('submit',save);
  for(const id of ['projectEditorCloseBtn','projectCancelBtn'])$(id).addEventListener('click',()=>{$('projectEditorPanel').style.display='none';});
  const observer=new MutationObserver(()=>{
    if(getComputedStyle($('projects')).display!=='none'&&!initialized){initialized=true;load();}
  });observer.observe($('projects'),{attributes:true,attributeFilter:['style']});
  if(getComputedStyle($('projects')).display!=='none'){initialized=true;load();}
})();
