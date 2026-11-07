
"use strict";
/* CONSTRUCTION GROUP: payroll section for foreman. All confirmations enforced by server RPC. */
document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);
  if (!$('foremanPayrollSection') || !window.supabase) return;
  const client = window.supabase.createClient(
    'https://yepxskcfxyiyqqhmdpve.supabase.co',
    'sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH'
  );
  const money = n => Number(n || 0).toLocaleString('pl-PL',{minimumFractionDigits:2,maximumFractionDigits:2})+' zł';
  const msg = text => { $('foremanPayrollMessage').textContent = text; };
  const select = $('foremanPayrollBrigade');
  const paymentForm = $('foremanPaymentForm');
  let currentUserId = null;
  let foremanEmployeeId = null;
  let eligibleEmployees = [];
  let eligibleProjects = [];
  let projects = [], payments = [], employees = [], accounts = [], brigadeIds = new Set(), busy = false;
  const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
  const label = (p, type) => {const el=document.createElement(type||'span');el.textContent=String(p??'—');return el;};
  const rpc = async (name,args) => {const {data,error}=await client.rpc(name,args);if(error)throw error;return data;};
  const get = async (table,columns) => {const {data,error}=await client.from(table).select(columns).limit(1000);if(error)throw error;return data||[];};
  function reset() {
    for (const id of ['foremanBudgetAllocated','foremanBudgetSpent','foremanBudgetAvailable']) $(id).textContent='—';
    $('foremanPayrollDrafts').replaceChildren();$('foremanPayrollHistory').replaceChildren();
  }
  async function loadBrigades() {
    const selected=select.value;
    // Server derives brigade membership from the authenticated foreman.
    const myBrigades=await rpc('get_my_foreman_brigades');
    const allowed=(Array.isArray(myBrigades)?myBrigades:[])
      .filter(b=>uuid(b.brigade_id));
    brigadeIds=new Set(allowed.map(b=>b.brigade_id));
    select.replaceChildren();
    select.appendChild(new Option('Выберите бригаду',''));
    for(const b of allowed)
      select.appendChild(new Option(b.brigade_name||'Бригада',b.brigade_id));
    if(!brigadeIds.size) {
      select.disabled=true;
      msg('За вашим аккаунтом не закреплена активная бригада. Обратитесь к владельцу.');
      return false;
    }
    select.disabled=select.options.length===1;
    if(brigadeIds.has(selected))select.value=selected;
    else if(select.options.length===2)select.selectedIndex=1;
    return !!select.value;
  }
  function fillOptions(id, items, placeholder) {
    const el=$(id);el.replaceChildren(new Option(placeholder,''));
    for(const item of items)el.appendChild(new Option(item.name,item.id));
  }
  async function loadEligibleOptions(brigadeId) {
    // A worker must be an active brigade member; projects must belong to this brigade.
    // Supabase RLS is still responsible for enforcing actual access.
    const members=await get('brigade_members','brigade_id,employee_id,joined_at,left_at');
    const today=new Date().toISOString().slice(0,10);
    const memberIds=new Set(members.filter(m=>m.brigade_id===brigadeId && m.joined_at<=today && (!m.left_at||m.left_at>=today)).map(m=>m.employee_id));
    eligibleEmployees=employees.filter(e=>memberIds.has(e.id)&&e.id!==foremanEmployeeId);
    eligibleProjects=projects.filter(p=>p.brigade_id===brigadeId);
    fillOptions('foremanPaymentEmployee',eligibleEmployees.map(e=>({id:e.id,name:e.full_name})),'Выберите работника');
    fillOptions('foremanPaymentProject',eligibleProjects.map(p=>({id:p.id,name:p.name})),'Выберите объект');
    $('foremanNewPayment').disabled=!eligibleEmployees.length||!eligibleProjects.length;
    if(!eligibleEmployees.length||!eligibleProjects.length)
      msg('Нет доступных работников или объектов для создания выплаты.');
  }
  function closePaymentForm() {
    $('foremanPaymentFormWrap').hidden=true;
    paymentForm.reset();
  }
  async function savePaymentDraft(event) {
    event.preventDefault();
    if(busy)return;
    const brigadeId=select.value;
    const employeeId=$('foremanPaymentEmployee').value;
    const projectId=$('foremanPaymentProject').value;
    const amount=Number($('foremanPaymentAmount').value);
    const date=$('foremanPaymentDate').value;
    const method=$('foremanPaymentMethod').value;
    const type=$('foremanPaymentType').value;
    if(!brigadeIds.has(brigadeId)||!eligibleEmployees.some(e=>e.id===employeeId)||!eligibleProjects.some(p=>p.id===projectId)) {
      msg('Выберите работника и объект своей бригады.');return;
    }
    if(employeeId===foremanEmployeeId){msg('Бригадир не может выплачивать самому себе.');return;}
    if(!Number.isFinite(amount)||amount<=0||Math.abs(amount*100-Math.round(amount*100))>0.00001){msg('Введите корректную сумму с точностью до 0,01 zł.');return;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!['cash','bank'].includes(method)||!['advance','salary'].includes(type)){
      msg('Проверьте дату и параметры выплаты.');return;
    }
    const save=$('foremanSavePayment');busy=true;save.disabled=true;
    try {
      // The DB must allow this INSERT under its existing RLS policy.
      // Never use service_role or broaden policies in the browser.
      const {error}=await client.from('payroll_payments').insert({
        employee_id:employeeId,project_id:projectId,payment_type:type,amount,
        currency:'PLN',payment_method:method,payment_date:date,
        description:$('foremanPaymentDescription').value.trim()||null,
        status:'draft',created_by:currentUserId
      });
      if(error)throw error;
      closePaymentForm();
      await refresh(false);
      msg('Черновик сохранён. Деньги не списаны.');
    }catch(err){msg('Черновик не создан: '+(err.message||err));}
    finally{busy=false;save.disabled=false;}
  }
  function renderPayment(p,history=false) {
    const row=document.createElement('div');row.className='payroll-item';
    const details=document.createElement('div');
    const emp=employees.find(x=>x.id===p.employee_id);
    const project=projects.find(x=>x.id===p.project_id);
    const type=p.payment_type==='advance'?'Аванс':'Зарплата';
    details.append(label((emp?.full_name||'Сотрудник')+' — '+money(p.amount),'strong'));
    const info=label(type+' · '+(project?.name||'Объект')+' · '+(p.payment_date||''),'p');info.className='muted';details.append(info);
    row.append(details);
    if(!history) {
      const controls=document.createElement('div');controls.className='payroll-item-actions';
      const accountsSelect=document.createElement('select');accountsSelect.setAttribute('aria-label','Касса для выплаты');
      accountsSelect.appendChild(new Option('Выберите кассу',''));
      for(const a of accounts.filter(a=>a.account_type===p.payment_method && a.currency==='PLN' && a.status==='active'))
        accountsSelect.appendChild(new Option(a.name,a.id));
      const button=label('Подтвердить выплату','button');button.type='button';
      button.disabled=accountsSelect.options.length===1;
      button.addEventListener('click',async()=>{
        if(busy)return;
        if(!accountsSelect.value){msg('Выберите кассу');return;}
        const brigadeId=select.value;
        if(!brigadeIds.has(brigadeId)){msg('Бригада не назначена');return;}
        if(!window.confirm(`Подтвердить выплату ${money(p.amount)} сотруднику ${emp?.full_name||''}? Деньги спишутся с кассы и бюджета. Операцию нельзя отменить.`))return;
        busy=true;button.disabled=true;
        try {
          await rpc('confirm_brigade_payroll_payment',{p_payment_id:p.id,p_brigade_id:brigadeId,p_account_id:accountsSelect.value});
          msg('Выплата подтверждена.');await refresh(false);
        }catch(err){msg('Выплата не подтверждена: '+err.message);button.disabled=false;}
        finally{busy=false;}
      });
      controls.append(accountsSelect,button);row.append(controls);
    }else{row.append(label('Подтверждено','strong'));}
    return row;
  }
  async function refresh(reloadBrigades=true) {
    if(busy && reloadBrigades)return;
    reset();$('foremanNewPayment').disabled=true;closePaymentForm();msg('Загрузка...');
    try {
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user){msg('Войдите в систему');return;}
      currentUserId=user.id;
      if(reloadBrigades && !(await loadBrigades()))return;
      const id=select.value;
      if(!brigadeIds.has(id)){msg('Выберите свою бригаду');return;}
      const b=await rpc('get_brigade_payroll_budget',{p_brigade_id:id});
      const budget=Array.isArray(b)?b[0]:b;
      if(!budget)throw Error('Бюджет бригады не найден');
      $('foremanBudgetAllocated').textContent=money(budget.allocated);
      $('foremanBudgetSpent').textContent=money(budget.spent);
      $('foremanBudgetAvailable').textContent=money(budget.available);
      projects=await get('projects','id,name,brigade_id');
      const ownProjects=projects.filter(p=>p.brigade_id===id);
      const ownProjectIds=new Set(ownProjects.map(p=>p.id));
      // Read operations still require RLS; UI filtering is not a security boundary.
      payments=await get('payroll_payments','id,status,payment_type,employee_id,project_id,amount,currency,payment_method,payment_date');
      employees=await get('employees','id,full_name,user_id');
      foremanEmployeeId=employees.find(e=>e.user_id===currentUserId)?.id||null;
      accounts=await get('finance_accounts','id,name,account_type,currency,status');
      await loadEligibleOptions(id);
      const scoped=payments.filter(p=>ownProjectIds.has(p.project_id) && ['advance','salary'].includes(p.payment_type) && p.currency==='PLN');
      const drafts=scoped.filter(p=>p.status==='draft');
      const confirmed=scoped.filter(p=>p.status==='confirmed');
      for(const p of drafts) $('foremanPayrollDrafts').append(renderPayment(p));
      for(const p of confirmed.slice(0,30)) $('foremanPayrollHistory').append(renderPayment(p,true));
      if(!drafts.length)$('foremanPayrollDrafts').append(label('Черновиков выплат пока нет.','p'));
      if(!confirmed.length)$('foremanPayrollHistory').append(label('Выплат пока нет.','p'));
      msg('Черновиков: '+drafts.length+'. Подтверждение доступно только для назначенной бригады.');
    }catch(err){msg('Ошибка загрузки зарплат: '+(err.message||err));}
  }
  select.addEventListener('change',()=>refresh(false));
  $('foremanNewPayment').addEventListener('click',()=>{
    $('foremanPaymentFormWrap').hidden=false;
    $('foremanPaymentDate').value=new Date().toLocaleDateString('en-CA');
  });
  $('foremanCancelPayment').addEventListener('click',closePaymentForm);
  paymentForm.addEventListener('submit',savePaymentDraft);
  $('foremanRefreshPayroll').addEventListener('click',()=>refresh(true));
  await refresh(true);
});
