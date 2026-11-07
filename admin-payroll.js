"use strict";
/* CONSTRUCTION GROUP — payroll read-only admin module */
(() => {
  const URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";
  const $ = (id) => document.getElementById(id);
  const money = (v) => `${Number(v || 0).toLocaleString("pl-PL", {minimumFractionDigits:2,maximumFractionDigits:2})} zł`;
  const safe = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client, rows = [], initialized = false;
  let employeeOptions = [], projectOptions = [], workRows = [];
  const moneyInput = v => Number(v || 0).toLocaleString('pl-PL', {minimumFractionDigits:2,maximumFractionDigits:2});

  async function load() {
    if (!$('payrollMessage')) return;
    $('payrollMessage').textContent = 'Загружаем начисления…';
    $('payrollTable').innerHTML = '';
    try {
      if (!window.supabase) throw new Error('Библиотека Supabase не загрузилась');
      client ||= window.supabase.createClient(URL, KEY);
      const {data:{user}, error:authError} = await client.auth.getUser();
      if (authError || !user) throw new Error('Сначала войдите в админку');
      const {data:owner,error:ownerError}=await client.rpc('is_owner');
      if(ownerError||owner!==true) throw new Error('Этот интерфейс пока доступен только владельцу');
      // The owner-only RLS policy is the authority. Never query owner_message.
      const {data:accruals,error:aErr} = await client.from('payroll_accruals')
        .select('id,employee_id,project_id,period_start,period_end,final_amount,currency,status')
        .order('period_end',{ascending:false}).limit(1000);
      if (aErr) throw aErr;
      const {data:employees,error:eErr} = await client.from('employees').select('id,full_name').limit(1000);
      if (eErr) throw eErr;
      const {data:projects,error:pErr} = await client.from('projects').select('id,name').limit(1000);
      if (pErr) throw pErr;
      const {data:allocs,error:lErr} = await client.from('payroll_payment_allocations')
        .select('accrual_id,payment_id,amount').limit(10000);
      if (lErr) throw lErr;
      const {data:payments,error:payErr} = await client.from('payroll_payments')
        .select('id,status,payment_type,employee_id,currency').limit(10000);
      if (payErr) throw payErr;
      employeeOptions = employees || [];
      projectOptions = projects || [];
      const names = new Map((employees||[]).map(x=>[x.id,x.full_name]));
      const projectNames = new Map((projects||[]).map(x=>[x.id,x.name]));
      const paymentMap = new Map((payments||[]).map(x=>[x.id,x]));
      const paidMap = new Map();
      for (const a of allocs||[]) {
        const p = paymentMap.get(a.payment_id);
        if (p?.status !== 'confirmed' || p?.payment_type !== 'salary') continue;
        paidMap.set(a.accrual_id,(paidMap.get(a.accrual_id)||0)+Number(a.amount));
      }
      rows = (accruals||[]).map(a=>({
        ...a,name:names.get(a.employee_id)||'Сотрудник',project:projectNames.get(a.project_id)||'Без объекта',
        paid:paidMap.get(a.id)||0
      }));
      render();
      updateOptions();
      await loadWork();
      $('payrollMessage').textContent = `Загружено начислений: ${rows.length}. Данные только для просмотра.`;
    } catch (err) {
      $('payrollMessage').textContent = `Ошибка загрузки: ${err.message || err}`;
    }
  }

  function render() {
    const filter = ($('payrollSearch')?.value||'').trim().toLowerCase();
    const status = $('payrollStatus')?.value||'';
    const visible = rows.filter(r=>(!status||r.status===status) &&
      (!filter||`${r.name} ${r.project}`.toLowerCase().includes(filter)));
    const approved = rows.filter(r=>r.status==='approved');
    const total = approved.reduce((s,r)=>s+Number(r.final_amount||0),0);
    const paid = approved.reduce((s,r)=>s+r.paid,0);
    $('payrollAccrued').textContent=money(total);
    $('payrollPaid').textContent=money(paid);
    $('payrollRemaining').textContent=money(total-paid);
    if (!visible.length) { $('payrollTable').textContent='Начислений по фильтру нет.'; return; }
    const labels={approved:'Утверждено',submitted:'На проверке',draft:'Черновик',cancelled:'Отменено'};
    $('payrollTable').innerHTML=`<table style="width:100%;border-collapse:collapse;min-width:780px;text-align:left;">
      <thead><tr>${['Сотрудник','Объект','Период','Статус','Начислено','Выплачено','Остаток'].map(x=>`<th style="padding:12px;border-bottom:1px solid #3b3f46;">${x}</th>`).join('')}</tr></thead>
      <tbody>${visible.map(r=>`<tr>
        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${safe(r.name)}</td>
        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${safe(r.project)}</td>
        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${safe(r.period_start)} — ${safe(r.period_end)}</td>
        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${safe(labels[r.status]||r.status)}</td>
        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${money(r.final_amount)}</td>
        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${r.status==='approved'?money(r.paid):'—'}</td>
        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${r.status==='approved'?money(Number(r.final_amount)-r.paid):'—'} ${r.status==='submitted'?`<button type="button" data-approve-accrual="${safe(r.id)}" style="cursor:pointer">Утвердить</button>`:''}</td>
      </tr>`).join('')}</tbody></table>`;
  }

  const rpc = async (name, args) => {
    const {data,error} = await client.rpc(name,args);
    if(error) throw new Error(error.message || 'Ошибка операции');
    return data;
  };
  const notify = (message, error=false) => {
    const el=$('payrollActionMessage');
    if(el) { el.textContent=message; el.style.color=error?'#ff8d8d':'#a4d7b5'; }
  };
  const optionHtml = (items, label) => `<option value="">${label}</option>` +
    items.map(x=>`<option value="${safe(x.id)}">${safe(x.full_name||x.name||'Без названия')}</option>`).join('');
  function setupActions() {
    if ($('payrollActions')) return;
    const section=$('payroll');
    const firstPanel=section?.querySelector('.panel');
    if(!section||!firstPanel) return;
    const wrap=document.createElement('section');
    wrap.className='panel'; wrap.id='payrollActions';
    wrap.style.marginBottom='20px';
    wrap.innerHTML=`
      <div class="panel-header"><div><h3>Учёт работ и начисления</h3><p>Сначала запись работы, затем подтверждение и начисление</p></div></div>
      <form id="payrollWorkForm" style="padding:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;">
        <label>Сотрудник<select id="pwEmployee" required style="display:block;width:100%;padding:12px;margin-top:5px;"></select></label>
        <label>Объект<select id="pwProject" required style="display:block;width:100%;padding:12px;margin-top:5px;"></select></label>
        <label>Дата работы<input id="pwDate" type="date" required style="display:block;width:100%;padding:12px;margin-top:5px;"></label>
        <label>Оплата<select id="pwType" style="display:block;width:100%;padding:12px;margin-top:5px;"><option value="hourly">Почасовая</option><option value="piecework">Сдельная</option></select></label>
        <label id="pwHoursWrap">Часы<input id="pwHours" type="number" min="0.01" step="0.25" required style="display:block;width:100%;padding:12px;margin-top:5px;"></label>
        <label id="pwQuantityWrap" style="display:none">Объём<input id="pwQuantity" type="number" min="0.01" step="0.01" style="display:block;width:100%;padding:12px;margin-top:5px;"></label>
        <label id="pwUnitWrap" style="display:none">Единица<input id="pwUnit" placeholder="м², м, шт" style="display:block;width:100%;padding:12px;margin-top:5px;"></label>
        <label>Ставка, zł<input id="pwRate" type="number" min="0.01" step="0.01" required style="display:block;width:100%;padding:12px;margin-top:5px;"></label>
        <label style="grid-column:1/-1">Примечание<input id="pwDescription" maxlength="500" placeholder="Какие работы выполнены" style="display:block;width:100%;padding:12px;margin-top:5px;"></label>
        <div style="grid-column:1/-1;display:flex;align-items:center;gap:16px;flex-wrap:wrap"><strong>Сумма: <span id="pwTotal">0,00 zł</span></strong><button type="submit" id="pwSave" style="padding:12px 18px;cursor:pointer">Сохранить черновик</button></div>
      </form>
      <p id="payrollActionMessage" role="status" style="padding:0 18px 18px;color:#a4a7ad">Операции доступны только при наличии прав.</p>
      <div class="panel-header"><div><h3>Записи работ</h3><p>Подтверждение выполненных работ</p></div></div>
      <div id="payrollWorkTable" style="overflow-x:auto;padding:12px 18px 20px">Загрузка...</div>
      <div class="panel-header"><div><h3>Создать начисление за период</h3><p>В начисление попадут подтверждённые записи</p></div></div>
      <form id="payrollAccrualForm" style="padding:18px;display:flex;flex-wrap:wrap;gap:12px;align-items:end">
        <label>Сотрудник<select id="paEmployee" required style="display:block;padding:12px;margin-top:5px"></select></label>
        <label>Объект<select id="paProject" required style="display:block;padding:12px;margin-top:5px"></select></label>
        <label>С<input id="paStart" type="date" required style="display:block;padding:12px;margin-top:5px"></label>
        <label>По<input id="paEnd" type="date" required style="display:block;padding:12px;margin-top:5px"></label>
        <button type="submit" id="paSave" style="padding:12px;cursor:pointer">Сформировать начисление</button>
      </form>
      <p style="padding:0 18px 18px;color:#a4a7ad">Начисление создаётся на проверке. Для утверждения используйте кнопку в таблице начислений.</p>`;
    firstPanel.parentNode.insertBefore(wrap,firstPanel);
    const today=new Date().toLocaleDateString('en-CA');
    $('pwDate').value=today; $('paStart').value=today; $('paEnd').value=today;
    $('pwType').addEventListener('change',()=>{
      const piece=$('pwType').value==='piecework';
      $('pwHoursWrap').style.display=piece?'none':'';
      $('pwQuantityWrap').style.display=piece?'':'none';
      $('pwUnitWrap').style.display=piece?'':'none';
      $('pwHours').required=!piece; $('pwQuantity').required=piece; $('pwUnit').required=piece;
      calcWork();
    });
    for(const id of ['pwHours','pwQuantity','pwRate']) $(id).addEventListener('input',calcWork);
    $('payrollWorkForm').addEventListener('submit',saveWork);
    $('payrollAccrualForm').addEventListener('submit',saveAccrual);
    $('payrollWorkTable').addEventListener('click',async e=>{
      const btn=e.target.closest('[data-approve-work]'); if(!btn)return;
      if(!confirm('Подтвердить выполненную работу? После этого редактирование будет закрыто.'))return;
      btn.disabled=true;
      try { await rpc('approve_payroll_work_entry',{p_entry_id:btn.dataset.approveWork}); notify('Работа подтверждена'); await loadWork(); }
      catch(err){notify(err.message,true);}finally{btn.disabled=false;}
    });
    $('payrollTable').addEventListener('click',async e=>{
      const btn=e.target.closest('[data-approve-accrual]');if(!btn)return;
      if(!confirm('Утвердить начисление без корректировки суммы?'))return;
      btn.disabled=true;
      try {
        await rpc('approve_payroll_accrual',{p_accrual_id:btn.dataset.approveAccrual,p_final_amount:null,p_adjustment_reason:null,p_message:null});
        notify('Начисление утверждено'); await load();
      }catch(err){notify(err.message,true);}finally{btn.disabled=false;}
    });
    updateOptions();
  }
  function updateOptions(){
    for(const id of ['pwEmployee','paEmployee']) if($(id)) $(id).innerHTML=optionHtml(employeeOptions,'Выберите сотрудника');
    for(const id of ['pwProject','paProject']) if($(id)) $(id).innerHTML=optionHtml(projectOptions,'Выберите объект');
  }
  function calcWork(){
    if(!$('pwTotal'))return;
    const amount=Number($('pwRate').value||0)*Number(($('pwType').value==='hourly' ? $('pwHours'): $('pwQuantity')).value||0);
    $('pwTotal').textContent=money(amount);
  }
  async function saveWork(e){
    e.preventDefault(); const btn=$('pwSave');btn.disabled=true;
    try {
      const piece=$('pwType').value==='piecework';
      const rate=Number($('pwRate').value);
      const qty=Number((piece?$('pwQuantity'):$('pwHours')).value);
      if(!Number.isFinite(rate)||rate<=0||!Number.isFinite(qty)||qty<=0)throw Error('Укажите положительную ставку и количество');
      await rpc('create_payroll_work_entry',{
        p_employee_id:$('pwEmployee').value,p_project_id:$('pwProject').value,
        p_work_date:$('pwDate').value,p_work_type:$('pwType').value,
        p_hours:piece?null:qty,p_quantity:piece?qty:null,
        p_unit:piece?$('pwUnit').value.trim():null,p_rate:rate,
        p_description:$('pwDescription').value.trim()||null
      });
      notify('Черновик работы сохранён'); $('pwHours').value='';$('pwQuantity').value='';$('pwDescription').value='';calcWork();await loadWork();
    }catch(err){notify(err.message,true);}finally{btn.disabled=false;}
  }
  async function saveAccrual(e){
    e.preventDefault();const btn=$('paSave');btn.disabled=true;
    try{
      if($('paEnd').value<$('paStart').value)throw Error('Конец периода раньше начала');
      await rpc('create_payroll_accrual',{
        p_employee_id:$('paEmployee').value,p_project_id:$('paProject').value,
        p_period_start:$('paStart').value,p_period_end:$('paEnd').value
      });
      notify('Начисление создано и ожидает утверждения');await load();
    }catch(err){notify(err.message,true);}finally{btn.disabled=false;}
  }
  async function loadWork(){
    if(!$('payrollWorkTable'))return;
    try{
      const {data,error}=await client.from('payroll_work_entries')
        .select('id,employee_id,project_id,work_date,work_type,hours,quantity,unit,rate,calculated_amount,status')
        .order('work_date',{ascending:false}).limit(200);
      if(error)throw error;
      workRows=data||[];
      const names=new Map(employeeOptions.map(x=>[x.id,x.full_name]));
      const projects=new Map(projectOptions.map(x=>[x.id,x.name]));
      $('payrollWorkTable').innerHTML=workRows.length?`<table style="width:100%;min-width:700px;text-align:left;border-collapse:collapse"><thead><tr>${['Дата','Сотрудник','Объект','Работа','Сумма','Статус','Действие'].map(x=>`<th style="padding:10px;border-bottom:1px solid #3b3f46">${x}</th>`).join('')}</tr></thead><tbody>${workRows.map(r=>`<tr><td style="padding:10px">${safe(r.work_date)}</td><td>${safe(names.get(r.employee_id)||'—')}</td><td>${safe(projects.get(r.project_id)||'—')}</td><td>${r.work_type==='hourly'?safe(r.hours)+' ч':safe(r.quantity)+' '+safe(r.unit||'')}</td><td>${money(r.calculated_amount)}</td><td>${safe(r.status)}</td><td>${['draft','submitted'].includes(r.status)?`<button type="button" data-approve-work="${safe(r.id)}" style="cursor:pointer">Подтвердить</button>`:'—'}</td></tr>`).join('')}</tbody></table>`:'Записей работ пока нет.';
    }catch(err){$('payrollWorkTable').textContent='Ошибка загрузки работ: '+err.message;}
  }
  function show() {
    document.querySelectorAll('.dashboard-section').forEach(s=>s.style.display='none');
    $('payroll').style.display='block';
    document.querySelectorAll('.nav-item').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#payroll'));
    if ($('pageTitle')) $('pageTitle').textContent='Зарплаты';
    if (!initialized) { initialized=true; setupActions(); load(); }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const nav=document.querySelector('.nav-item[href="#payroll"]');
    if (!nav || !$('payroll')) return;
    nav.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();history.replaceState(null,'','#payroll');show();},true);
    $('payrollRefreshBtn')?.addEventListener('click',load);
    $('payrollSearch')?.addEventListener('input',render);
    $('payrollStatus')?.addEventListener('change',render);
    if (location.hash==='#payroll') show();
  });
})();
