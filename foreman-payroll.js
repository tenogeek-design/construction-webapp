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
    const {data:balances,error:balanceError}=await client.rpc('get_my_finance_balances');
    if(balanceError)throw balanceError;
    const {data:assignedProjects,error:projectsError}=await client.rpc('get_my_expense_projects');
    if(projectsError)throw projectsError;
    // Never use the unrestricted list of brigades to grant a foreman access.
    brigadeIds=new Set([...(balances||[]),...(assignedProjects||[])].map(x=>x.brigade_id).filter(uuid));
    select.replaceChildren();
    select.appendChild(new Option('Выберите бригаду',''));
    if(!brigadeIds.size) {
      select.disabled=true;
      msg('Нужна привязка бригадира к бригаде: get_my_finance_balances / get_my_expense_projects пока не возвращают brigade_id. Выплаты отключены.');
      return false;
    }
    const all=await get('brigades','id,name,status');
    for(const b of all.filter(b=>brigadeIds.has(b.id)&&b.status==='active')) select.appendChild(new Option(b.name,b.id));
    select.disabled=select.options.length===1;
    if(brigadeIds.has(selected))select.value=selected;
    else if(select.options.length===2)select.selectedIndex=1;
    return !!select.value;
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
    reset();msg('Загрузка...');
    try {
      const {data:{user},error:authError}=await client.auth.getUser();
      if(authError||!user){msg('Войдите в систему');return;}
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
      employees=await get('employees','id,full_name');
      accounts=await get('finance_accounts','id,name,account_type,currency,status');
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
  $('foremanRefreshPayroll').addEventListener('click',()=>refresh(true));
  await refresh(true);
});
