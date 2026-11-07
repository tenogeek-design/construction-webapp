"use strict";
(() => {
  const URL = 'https://yepxskcfxyiyqqhmdpve.supabase.co';
  const KEY = 'sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH';
  const $ = id => document.getElementById(id);
  if (!$('tasksTable') || !window.supabase) return;
  const db = window.supabase.createClient(URL, KEY);
  const labels = {new:'Новая',in_progress:'В работе',review:'На проверке',completed:'Завершена',cancelled:'Отменена',draft:'Черновик',pending:'Ожидает',done:'Выполнена'};
  const fields = {project_id:'taskProject',title:'taskTitle',brigade_id:'taskBrigade',assigned_employee_id:'taskEmployee',priority:'taskPriority',status:'taskStatus',due_date:'taskDueDate',description:'taskDescription'};
  let tasks=[], projects=[], brigades=[], employees=[], rights={view:false,create:false,update:false}, loaded=false, loading=false;
  const errorText = e => e?.message || String(e);
  const message = (s,bad=false) => { $('tasksMessage').textContent=s; $('tasksMessage').style.color=bad?'#ff8989':'#a4a7ad'; };
  const formMessage = (s,bad=false) => { $('taskFormMessage').textContent=s; $('taskFormMessage').style.color=bad?'#ff8989':'#a4a7ad'; };
  const opt = (v,s) => {const x=document.createElement('option');x.value=v;x.textContent=s;return x;};
  const fill = (id,rows,empty,name,preserve=false) => {
    const el=$(id), old=preserve?el.value:'';
    el.replaceChildren(opt('',empty));
    rows.forEach(r=>el.append(opt(r.id,name(r))));
    el.value=old && [...el.options].some(o=>o.value===old)?old:'';
  };
  const employeeName = e => e ? ([e.first_name,e.last_name].filter(Boolean).join(' ') || e.full_name || e.name || e.email || String(e.id||'').slice(0,8) || '—') : '—';
  async function authorize() {
    const {data:{session},error:sessionError}=await db.auth.getSession();
    if(sessionError||!session) throw new Error('Войдите в админку заново.');
    const {data,error}=await db.rpc('get_my_effective_permissions');
    if(error)throw new Error('Проверка разрешений: '+errorText(error));
    const permissions=Array.isArray(data)?data:[];
    const has=code=>permissions.some(p=>p.permission_code===code&&p.scope==='all');
    rights={view:has('tasks.view'),create:has('tasks.create'),update:has('tasks.update')};
    if(!rights.view)throw new Error('Нет разрешения tasks.view:all.');
    $('taskNewBtn').disabled=!rights.create;
    $('taskNewBtn').textContent='+ Новая задача';
    $('tasksRefreshBtn').disabled=false;
    $('tasksSearch').disabled=false;
    $('tasksProjectFilter').disabled=false;
    $('tasksStatusFilter').disabled=false;
  }
  async function load({resetFilters=false}={}) {
    if(loading)return;
    loading=true;
    message('Загружаем задачи...');
    try {
      await authorize();
      const [t,p,b,e]=await Promise.all([
        db.from('tasks').select('*').order('created_at',{ascending:false}).limit(500),
        db.from('projects').select('id,name,brigade_id').order('name'),
        db.from('brigades').select('id,name').order('name'),
        db.from('employees').select('*').limit(500)
      ]);
      if(t.error)throw t.error;
      if(p.error)throw new Error('Объекты: '+errorText(p.error));
      tasks=t.data||[];projects=p.data||[];
      brigades=b.error?[]:(b.data||[]);
      employees=e.error?[]:(e.data||[]);
      fill('taskProject',projects,'Выберите объект',x=>x.name);
      fill('taskBrigade',brigades,'Не назначена',x=>x.name);
      fill('taskEmployee',employees,'Не назначен',employeeName);
      fill('tasksProjectFilter',projects,'Все объекты',x=>x.name,!resetFilters);
      const statusFilter=$('tasksStatusFilter');
      const oldStatus=resetFilters?'':statusFilter.value;
      statusFilter.replaceChildren(opt('','Все статусы'));
      [...new Set([...Object.keys(labels),...tasks.map(x=>x.status).filter(Boolean)])].forEach(s=>statusFilter.append(opt(s,labels[s]||s)));
      statusFilter.value=oldStatus && [...statusFilter.options].some(o=>o.value===oldStatus)?oldStatus:'';
      if(resetFilters)$('tasksSearch').value='';
      loaded=true;
      render();
      const warnings=[];
      if(b.error)warnings.push('бригады: '+errorText(b.error));
      if(e.error)warnings.push('сотрудники: '+errorText(e.error));
      message('Загружено задач: '+tasks.length+(warnings.length?'. Не удалось загрузить '+warnings.join('; '):''),warnings.length>0);
    } catch(err) {message('Ошибка: '+errorText(err),true);$('tasksTable').replaceChildren();}
    finally {loading=false;}
  }
  function render() {
    $('tasksTotal').textContent=tasks.length;
    $('tasksActive').textContent=tasks.filter(t=>t.status==='in_progress').length;
    $('tasksReview').textContent=tasks.filter(t=>t.status==='review').length;
    $('tasksCompleted').textContent=tasks.filter(t=>t.status==='completed').length;
    const q=$('tasksSearch').value.trim().toLocaleLowerCase();
    const project=$('tasksProjectFilter').value,status=$('tasksStatusFilter').value;
    const filtered=tasks.filter(t=>(!project||t.project_id===project)&&(!status||t.status===status)&&String(t.title||'').toLocaleLowerCase().includes(q));
    const host=$('tasksTable');host.replaceChildren();
    const count=document.createElement('div');count.className='muted';count.style.cssText='padding:8px 0 12px';
    count.textContent=`Показано ${filtered.length} из ${tasks.length} задач`;
    host.append(count);
    if(!filtered.length){
      const p=document.createElement('p');p.textContent=tasks.length?'Нет задач по выбранным фильтрам.':'Задач пока нет.';p.style.padding='16px';host.append(p);
      if(tasks.length){const reset=document.createElement('button');reset.type='button';reset.textContent='Сбросить фильтры';reset.addEventListener('click',resetFilters);host.append(reset);}
      return;
    }
    const wrap=document.createElement('div');wrap.style.cssText='width:100%;overflow-x:auto';
    const table=document.createElement('table');table.style.cssText='width:100%;min-width:760px;border-collapse:collapse;text-align:left;';
    const thead=document.createElement('thead'),trh=document.createElement('tr');
    ['Задача','Объект','Статус','Исполнитель','Срок','Фото','Действие'].forEach(s=>{const th=document.createElement('th');th.textContent=s;th.style.padding='12px';trh.append(th);});
    thead.append(trh);table.append(thead);
    const body=document.createElement('tbody');
    filtered.forEach(t=>{
      const tr=document.createElement('tr');tr.style.borderTop='1px solid #3b3f46';
      const values=[t.title||'—',projects.find(p=>p.id===t.project_id)?.name||'—',labels[t.status]||t.status||'—',employeeName(employees.find(e=>e.id===t.assigned_employee_id)),t.due_date||'—',t.photo_required?'Обязательно':'Нет'];
      values.forEach(s=>{const td=document.createElement('td');td.textContent=s;td.style.padding='12px';tr.append(td);});
      const td=document.createElement('td');td.style.padding='12px';const btn=document.createElement('button');btn.type='button';btn.textContent=rights.update?'Редактировать':'Просмотр';btn.addEventListener('click',()=>edit(t));td.append(btn);tr.append(td);body.append(tr);
    });table.append(body);wrap.append(table);host.append(wrap);
  }
  function resetFilters(){ $('tasksSearch').value='';$('tasksProjectFilter').value='';$('tasksStatusFilter').value='';render(); }
  function edit(t=null){
    $('taskForm').reset();$('taskId').value=t?.id||'';
    for(const [key,id] of Object.entries(fields))$(id).value=t?.[key]??(key==='status'?'new':key==='priority'?'normal':'');
    $('taskPhotoRequired').checked=!!t?.photo_required;
    $('taskEditorTitle').textContent=t?(rights.update?'Редактировать задачу':'Просмотр задачи'):'Новая задача';
    const writable=t?rights.update:rights.create;
    $('taskForm').querySelectorAll('input,select,textarea').forEach(el=>{if(el.type!=='hidden')el.disabled=!writable;});
    $('taskSaveBtn').style.display=writable?'':'none';
    formMessage('');$('taskEditorPanel').style.display='block';$('taskEditorPanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function save(ev){
    ev.preventDefault();const id=$('taskId').value;
    if(!(id?rights.update:rights.create))return formMessage('Нет прав на сохранение.',true);
    const payload={};
    for(const [key,elementId] of Object.entries(fields)){const v=$(elementId).value.trim();payload[key]=v||null;}
    payload.title=$('taskTitle').value.trim();payload.project_id=$('taskProject').value;
    payload.photo_required=$('taskPhotoRequired').checked;
    if(!payload.title||!payload.project_id)return formMessage('Укажи объект и название задачи.',true);
    const btn=$('taskSaveBtn');btn.disabled=true;formMessage('Сохраняем...');
    try{
      await authorize();
      if(!(id?rights.update:rights.create))throw new Error('Нет разрешения на сохранение.');
      const result=id?await db.from('tasks').update(payload).eq('id',id).select('id'):await db.from('tasks').insert(payload).select('id');
      if(result.error)throw result.error;
      if(!result.data?.length)throw new Error('Сохранение не подтверждено. Проверь RLS для таблицы tasks.');
      $('taskEditorPanel').style.display='none';await load({resetFilters:true});message('Задача сохранена.');
    }catch(err){formMessage('Ошибка: '+errorText(err),true);}finally{btn.disabled=false;}
  }
  $('taskNewBtn').addEventListener('click',()=>edit());
  $('tasksRefreshBtn').addEventListener('click',()=>load({resetFilters:true}));
  $('tasksSearch').addEventListener('input',render);
  $('tasksProjectFilter').addEventListener('change',render);
  $('tasksStatusFilter').addEventListener('change',render);
  $('taskForm').addEventListener('submit',save);
  $('taskCancelBtn').addEventListener('click',()=>{$('taskEditorPanel').style.display='none';});
  $('taskEditorCloseBtn').addEventListener('click',()=>{$('taskEditorPanel').style.display='none';});
  $('taskProject').addEventListener('change',()=>{const p=projects.find(x=>x.id===$('taskProject').value);if(p?.brigade_id&&!$('taskBrigade').value)$('taskBrigade').value=p.brigade_id;});
  const observer=new MutationObserver(()=>{if($('tasks').style.display!=='none'&&!loaded)load({resetFilters:true});});
  observer.observe($('tasks'),{attributes:true,attributeFilter:['style']});
  if(location.hash==='#tasks')load({resetFilters:true});
})();
