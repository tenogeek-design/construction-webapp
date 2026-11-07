"use strict";

/* CONSTRUCTION GROUP — payroll admin: work, accruals, payment drafts */

(() => {

  const URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const $ = (id) => document.getElementById(id);

  const money = (v) => `${Number(v || 0).toLocaleString("pl-PL", {minimumFractionDigits:2,maximumFractionDigits:2})} zł`;

  const safe = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  let client, rows = [], initialized = false;

  let employeeOptions = [], projectOptions = [], workRows = [], paymentRows = [];

  let paymentAllocations = [];

  let currentUserId = null;

  let brigadeOptions = [];

  let financeAccountOptions = [];

  // Confirmation is always performed server-side by the atomic RPC.

  const PAYOUTS_ENABLED = true;

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

      currentUserId = user.id;

      const {data:owner,error:ownerError}=await client.rpc('is_owner');

      if(ownerError||owner!==true) throw new Error('Этот интерфейс пока доступен только владельцу');

      // The owner-only RLS policy is the authority. Never query owner_message.

      const {data:accruals,error:aErr} = await client.from('payroll_accruals')

        .select('id,employee_id,project_id,period_start,period_end,final_amount,currency,status')

        .order('period_end',{ascending:false}).limit(1000);

      if (aErr) throw aErr;

      const { data: cancellations, error: cErr } = await client

        .from('payroll_accrual_cancellations')

        .select('accrual_id,reason,cancelled_at');

      if (cErr) throw cErr;

      const cancellationMap = new Map(

        (cancellations || []).map(c => [c.accrual_id, c])

      );

      const {data:employees,error:eErr} = await client.from('employees').select('id,full_name').limit(1000);

      if (eErr) throw eErr;

      const {data:projects,error:pErr} = await client.from('projects').select('id,name').limit(1000);

      if (pErr) throw pErr;

      // Список бригад нужен для отдельного бюджета каждой команды.

      // Ошибка этого блока не должна ломать начисления и учёт работ.

      let brigadeLoadError = null;

      const {data:brigades,error:bErr} = await client.from('brigades')

        .select('id,name,status').order('name',{ascending:true}).limit(1000);

      if (bErr) {

        brigadeOptions = [];

        brigadeLoadError = bErr.message;

      } else {

        brigadeOptions = brigades || [];

      }

      const {data:allocs,error:lErr} = await client.from('payroll_payment_allocations')

        .select('accrual_id,payment_id,amount').limit(10000);

      if (lErr) throw lErr;

      const {data:payments,error:payErr} = await client.from('payroll_payments')

        .select('id,status,payment_type,employee_id,project_id,amount,currency,payment_method,payment_date,description').order('payment_date',{ascending:false}).limit(10000);

      if (payErr) throw payErr;

      const {data:accounts,error:accountError} = await client.from('finance_accounts')

        .select('id,name,account_type,currency,status')

        .eq('status','active').eq('currency','PLN').order('name');

      financeAccountOptions = accountError ? [] : (accounts || []);

      if (accountError) console.warn('Finance accounts:', accountError.message);

      employeeOptions = employees || [];

      paymentRows = payments || [];

      paymentAllocations = allocs || [];

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

      rows = (accruals || []).map(a => {

        const cancellation = cancellationMap.get(a.id);

        return {

          ...a,

          status: cancellation ? 'cancelled' : a.status,

          cancellationReason: cancellation?.reason || null,

          cancelledAt: cancellation?.cancelled_at || null,

          name: names.get(a.employee_id) || 'Сотрудник',

          project: projectNames.get(a.project_id) || 'Без объекта',

          paid: paidMap.get(a.id) || 0

        };

      });

      render();

      updateOptions();

      await loadWork();

      renderPayments();

      if ($('payrollBrigadeBudget')) {

        if (brigadeLoadError) {

          $('payrollBrigadeBudget').textContent = 'Ошибка загрузки бригад: ' + brigadeLoadError;

        } else {

          await loadBrigadeBudget();

        }

      }

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

        <td style="padding:12px;border-bottom:1px solid #3b3f46;">

          ${safe(labels[r.status] || r.status)}

          ${r.cancellationReason

            ? `<div style="font-size:12px;color:#a4a7ad;margin-top:5px">

                 Причина: ${safe(r.cancellationReason)}

               </div>`

            : ''}

        </td>

        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${money(r.final_amount)}</td>

        <td style="padding:12px;border-bottom:1px solid #3b3f46;">${r.status==='approved'?money(r.paid):'—'}</td>

        <td style="padding:12px;border-bottom:1px solid #3b3f46;">

          ${r.status === 'approved'

            ? money(Number(r.final_amount) - r.paid)

            : '—'}

          ${r.status === 'submitted'

            ? `<button type="button" data-approve-accrual="${safe(r.id)}" style="cursor:pointer">Утвердить</button>`

            : ''}

          ${r.status === 'approved' && Number(r.paid) === 0

            ? `<button type="button" data-cancel-accrual="${safe(r.id)}"

                style="cursor:pointer;background:#7c3030;color:white;border:0;border-radius:6px;padding:7px 10px;margin-left:8px">

                Отменить

               </button>`

            : ''}

        </td>

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

      const cancelBtn = e.target.closest('[data-cancel-accrual]');

      if (cancelBtn) {

        const reason = prompt('Причина отмены начисления:');

        if (reason === null) return;

        if (!reason.trim()) {

          notify('Причина отмены обязательна', true);

          return;

        }

        if (!confirm('Отменить начисление? История сохранится.')) return;

        cancelBtn.disabled = true;

        try {

          await rpc('cancel_payroll_accrual', {

            p_accrual_id: cancelBtn.dataset.cancelAccrual,

            p_reason: reason.trim()

          });

          notify('Начисление отменено');

          await load();

        } catch (err) {

          notify(err.message, true);

          cancelBtn.disabled = false;

        }

        return;

      }

      const btn=e.target.closest('[data-approve-accrual]');

      if(!btn)return;

      if(!confirm('Утвердить начисление без корректировки суммы?'))return;

      btn.disabled=true;

      try {

        await rpc('approve_payroll_accrual',{p_accrual_id:btn.dataset.approveAccrual,p_final_amount:null,p_adjustment_reason:null,p_message:null});

        notify('Начисление утверждено'); await load();

      }catch(err){notify(err.message,true);}finally{btn.disabled=false;}

    });

    updateOptions();

    setupPayments();

    $('ppTable')?.addEventListener('click', confirmPayment);

    setupBrigadeBudget();

  }

 

  function updateOptions(){

    for(const id of ['pwEmployee','paEmployee']) if($(id)) $(id).innerHTML=optionHtml(employeeOptions,'Выберите сотрудника');

    for(const id of ['pwProject','paProject']) if($(id)) $(id).innerHTML=optionHtml(projectOptions,'Выберите объект');

    updatePaymentOptions();

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

  // Brigade budget: OWNER-only changes through server-side RPC.

  function setupBrigadeBudget() {

    if ($('payrollBrigadeBudgetPanel')) return;

    const anchor = $('payrollActions');

    if (!anchor) return;

    const panel = document.createElement('section');

    panel.id = 'payrollBrigadeBudgetPanel';

    panel.className = 'panel';

    panel.style.marginBottom = '20px';

    panel.innerHTML = `

      <div class="panel-header"><div><h3>Бюджеты бригад</h3>

      <p>Лимиты зарплат, управление и история операций</p></div></div>

      <div style="padding:16px;display:flex;flex-wrap:wrap;gap:12px;align-items:end">

        <label style="flex:1;min-width:180px">Бригада

          <select id="payrollBrigadeSelect" style="display:block;width:100%;min-height:44px;margin-top:6px;padding:10px"></select>

        </label>

        <button id="payrollBudgetRefresh" type="button" style="min-height:44px;padding:10px 16px;cursor:pointer">Обновить</button>

      </div>

      <div id="payrollBrigadeBudget" style="padding:0 16px 16px">Загрузка бюджета…</div>

      <div style="padding:16px;border-top:1px solid #3b3f46">

        <h3 style="margin-bottom:12px">Изменить бюджет · OWNER</h3>

        <form id="payrollBudgetForm" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">

          <label>Операция

            <select id="budgetOperation" style="display:block;width:100%;min-height:44px;margin-top:6px;padding:10px">

              <option value="add">+ Выделить бюджет</option><option value="reduce">− Уменьшить бюджет</option>

            </select>

          </label>

          <label>Сумма, zł

            <input id="budgetAmount" type="number" min="0.01" step="0.01" required style="display:block;width:100%;min-height:44px;margin-top:6px;padding:10px">

          </label>

          <label style="grid-column:1/-1">Комментарий

            <input id="budgetNote" maxlength="500" placeholder="Причина изменения бюджета" style="display:block;width:100%;min-height:44px;margin-top:6px;padding:10px">

          </label>

          <div style="grid-column:1/-1"><button id="budgetSubmit" type="submit" style="min-height:44px;padding:12px 18px;background:#ff812e;color:#202226;border:0;border-radius:9px;font-weight:700;cursor:pointer">Сохранить изменение</button></div>

        </form>

        <p id="budgetActionMessage" role="status" style="margin-top:12px;color:#a4a7ad">Изменения доступны только владельцу.</p>

      </div>

      <div style="padding:16px;border-top:1px solid #3b3f46">

        <h3 style="margin-bottom:12px">История бюджета</h3>

        <div id="budgetHistory" style="overflow-x:auto">Загрузка истории…</div>

      </div>`;

    anchor.insertAdjacentElement('afterend', panel);

    $('payrollBrigadeSelect').addEventListener('change', loadBrigadeBudget);

    $('payrollBudgetRefresh').addEventListener('click', loadBrigadeBudget);

    $('payrollBudgetForm').addEventListener('submit', saveBrigadeBudget);

  }

 

  async function loadBrigadeBudget() {

    const select = $('payrollBrigadeSelect');

    const out = $('payrollBrigadeBudget');

    const historyBox = $('budgetHistory');

    if (!select || !out || !client) return;

    const selected = select.value;

    const active = brigadeOptions.filter(b => b.status === 'active');

    select.innerHTML = optionHtml(active, 'Выберите бригаду');

    if (active.some(b => b.id === selected)) select.value = selected;

    else if (active.length) select.value = active[0].id;

    if (!select.value) {

      out.textContent = 'Активных бригад пока нет.';

      if (historyBox) historyBox.textContent = '';

      return;

    }

    const brigadeId = select.value;

    out.textContent = 'Загрузка бюджета…';

    if (historyBox) historyBox.textContent = 'Загрузка истории…';

    try {

      const data = await rpc('get_brigade_payroll_budget', {p_brigade_id: brigadeId});

      if (select.value !== brigadeId) return;

      const b = Array.isArray(data) ? data[0] : data;

      if (!b) throw Error('Функция не вернула бюджет');

      const item = (label, value, color) => `

        <div style="flex:1;min-width:130px;background:#30343a;border:1px solid #3b3f46;border-radius:10px;padding:15px">

          <small style="color:#a4a7ad">${label}</small>

          <h3 style="margin-top:8px;color:${color};overflow-wrap:anywhere">${money(value)}</h3>

        </div>`;

      out.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:10px">

        ${item('Выделено', b.allocated, '#f5f5f4')}

        ${item('Потрачено', b.spent, '#f5f5f4')}

        ${item('Доступно', b.available, '#22a06b')}

      </div><p style="color:#a4a7ad;margin-top:12px;font-size:12px">Бюджет — лимит выплат, а не остаток кассы.</p>`;

const {data: entries, error} = await client.from('brigade_payroll_budget_entries')
  .select('id,entry_type,amount,note,created_at,created_by')
  .eq('brigade_id', brigadeId).order('created_at', {ascending:false}).limit(100);
        .select('id,entry_type,amount,note,created_at,created_by')

        .eq('brigade_id', brigadeId).order('created_at', {ascending:false}).limit(100);

      if (select.value !== brigadeId || !historyBox) return;

      if (error) {

        historyBox.textContent = 'История недоступна: ' + error.message;

      } else if (!entries?.length) {

        historyBox.textContent = 'Записей пока нет или нет доступа к просмотру истории.';

      } else {

        const labels = {allocation:'Выделение', reduction:'Уменьшение', payment:'Выплата'};

        historyBox.innerHTML = `<table style="width:100%;min-width:560px;border-collapse:collapse;text-align:left">

          <thead><tr>${['Дата','Операция','Сумма','Комментарий'].map(t=>`<th style="padding:10px">${t}</th>`).join('')}</tr></thead>

          <tbody>${entries.map(r=>`<tr>

            <td style="padding:10px;border-top:1px solid #3b3f46">${safe(new Date(r.created_at).toLocaleString('pl-PL'))}</td>

            <td style="padding:10px;border-top:1px solid #3b3f46">${safe(labels[r.entry_type]||r.entry_type)}</td>

            <td style="padding:10px;border-top:1px solid #3b3f46">${r.entry_type==='allocation'?'+':'−'}${money(r.amount)}</td>

            <td style="padding:10px;border-top:1px solid #3b3f46">${safe(r.note||'—')}</td>

          </tr>`).join('')}</tbody></table>`;

      }

    } catch (err) {

      if (select.value === brigadeId) out.textContent = 'Ошибка бюджета: ' + (err.message||err);

    }

  }

 

  async function saveBrigadeBudget(e) {

    e.preventDefault();

    const btn = $('budgetSubmit');

    const message = $('budgetActionMessage');

    const brigadeId = $('payrollBrigadeSelect')?.value;

    const operation = $('budgetOperation').value;

    const raw = $('budgetAmount').value.trim();

    const amount = Number(raw);

    const note = $('budgetNote').value.trim();

    try {

      if (!brigadeId) throw Error('Выберите бригаду');

      if (!raw || !Number.isFinite(amount) || amount <= 0 ||

          !/^\d+(?:\.\d{1,2})?$/.test(raw))

        throw Error('Введите сумму больше нуля с точностью до 0,01 zł');

      const signedAmount = operation === 'reduce' ? -amount : amount;

      const name = brigadeOptions.find(b => b.id === brigadeId)?.name || 'Бригада';

      if (!confirm(`${signedAmount>0?'Выделить':'Уменьшить бюджет на'} ${money(amount)}?\nБригада: ${name}\nКомментарий: ${note||'Без комментария'}\n\nОперация будет записана в историю.`)) return;

      btn.disabled = true;

      message.textContent = 'Сохраняем изменение…';

      message.style.color = '#a4a7ad';

      await rpc('adjust_brigade_payroll_budget', {

        p_brigade_id: brigadeId, p_amount: signedAmount, p_note: note || null

      });

      message.textContent = 'Бюджет успешно изменён.';

      message.style.color = '#22a06b';

      $('budgetAmount').value = '';

      $('budgetNote').value = '';

      await loadBrigadeBudget();

    } catch (err) {

      message.textContent = 'Ошибка: ' + (err.message||err);

      message.style.color = '#ff8d8d';

    } finally {

      btn.disabled = false;

    }

  }

 

  function setupPayments(){

    if ($('payrollPaymentsPanel')) return;

    const section = $('payroll');

    const anchor = $('payrollActions');

    if (!section || !anchor) return;

    const panel = document.createElement('section');

    panel.id = 'payrollPaymentsPanel';

    panel.className = 'panel';

    panel.style.marginBottom = '20px';

    panel.innerHTML = `

      <div class="panel-header"><div><h3>Авансы и выплаты</h3>

      <p>Учёт выплат работникам — черновики отдельно от подтверждённых операций</p></div></div>

      <div style="padding:16px;display:flex;flex-wrap:wrap;gap:20px">

        <div><small>Подтверждённые авансы</small><h3 id="payrollAdvancesTotal">—</h3></div>

        <div><small>Подтверждённая зарплата</small><h3 id="payrollSalaryTotal">—</h3></div>

        <div><small>Черновики выплат</small><h3 id="payrollDraftsTotal">—</h3></div>

      </div>

      <form id="payrollPaymentForm" style="padding:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">

        <label>Сотрудник<select id="ppEmployee" required style="display:block;width:100%;padding:12px;margin-top:5px"></select></label>

        <label>Объект (обязательно для подтверждения)<select id="ppProject" style="display:block;width:100%;padding:12px;margin-top:5px"></select></label>

        <label>Вид выплаты<select id="ppType" required style="display:block;width:100%;padding:12px;margin-top:5px"><option value="advance">Аванс</option><option value="salary">Зарплата</option><option value="bonus">Премия</option></select></label>

        <label>Сумма, zł<input id="ppAmount" type="number" min="0.01" step="0.01" required style="display:block;width:100%;padding:12px;margin-top:5px"></label>

        <label>Способ<select id="ppMethod" required style="display:block;width:100%;padding:12px;margin-top:5px"><option value="cash">Наличные</option><option value="bank">Банк</option></select></label>

        <label>Дата<input id="ppDate" type="date" required style="display:block;width:100%;padding:12px;margin-top:5px"></label>

        <label style="grid-column:1/-1">Примечание<input id="ppDescription" maxlength="500" placeholder="За какой период / комментарий" style="display:block;width:100%;padding:12px;margin-top:5px"></label>

        <div style="grid-column:1/-1"><button id="ppSave" type="submit" style="padding:12px 18px;cursor:pointer">Создать черновик выплаты</button></div>

      </form>

      <p id="ppMessage" role="status" style="padding:0 18px 18px;color:#a4a7ad">Черновик не списывает деньги. Для подтверждения выберите бригаду и счёт в строке выплаты.</p>

      <div class="panel-header"><div><h3>История выплат</h3><p>Черновики и подтверждённые платежи</p></div></div>

      <div id="ppTable" style="padding:12px 18px 20px;overflow-x:auto">Загрузка...</div>`;

    anchor.insertAdjacentElement('afterend', panel);

    $('ppDate').value = new Date().toLocaleDateString('en-CA');

    $('payrollPaymentForm').addEventListener('submit', savePaymentDraft);

    updatePaymentOptions();

    renderPayments();

  }

 

  function updatePaymentOptions(){

    if ($('ppEmployee')) $('ppEmployee').innerHTML=optionHtml(employeeOptions,'Выберите сотрудника');

    if ($('ppProject')) $('ppProject').innerHTML=optionHtml(projectOptions,'Без объекта');

  }

 

  function renderPayments(){

    if (!$('ppTable')) return;

    const confirmed = paymentRows.filter(p=>p.status==='confirmed');

    const total = type=>confirmed.filter(p=>p.payment_type===type).reduce((s,p)=>s+Number(p.amount||0),0);

    $('payrollAdvancesTotal').textContent=money(total('advance'));

    $('payrollSalaryTotal').textContent=money(total('salary'));

    $('payrollDraftsTotal').textContent=String(paymentRows.filter(p=>p.status==='draft').length);

    const names=new Map(employeeOptions.map(e=>[e.id,e.full_name]));

    const types={advance:'Аванс',salary:'Зарплата',bonus:'Премия',adjustment:'Корректировка'};

    const statuses={draft:'Черновик',confirmed:'Подтверждено',cancelled:'Отменено'};

    const activeBrigades=brigadeOptions.filter(b=>b.status==='active');

    const action=p=>{

      if(p.status!=='draft') return '—';

      if(!['advance','salary'].includes(p.payment_type)) return 'Для этого типа выплаты подтверждение пока недоступно';

      if(!p.project_id) return 'Нет объекта — подтверждение невозможно';

      if(!PAYOUTS_ENABLED) return 'Подтверждение отключено';

      const accounts=financeAccountOptions.filter(a=>a.account_type===p.payment_method);

      const availableAccruals=rows.filter(a=>a.status==='approved' &&

        a.employee_id===p.employee_id && a.project_id===p.project_id &&

        a.currency===p.currency && Number(a.final_amount)-a.paid >= Number(p.amount));

      const accrualSelect=p.payment_type==='salary'

        ? `<select data-accrual-for="${safe(p.id)}" aria-label="Начисление">

             <option value="">Выберите начисление</option>

             ${availableAccruals.map(a=>`<option value="${safe(a.id)}">${safe(a.period_start)} — ${safe(a.period_end)} · остаток ${money(Number(a.final_amount)-a.paid)}</option>`).join('')}

           </select>${availableAccruals.length?'':'<small style="color:#ff9b8f">Нет подходящего утверждённого начисления</small>'}`

        : '';

      return `<div style="display:flex;flex-direction:column;gap:6px;min-width:175px">

        <select data-brigade-for="${safe(p.id)}" aria-label="Бригада">${optionHtml(activeBrigades,'Выберите бригаду')}</select>

        <select data-account-for="${safe(p.id)}" aria-label="Финансовый счёт">${optionHtml(accounts,'Выберите счёт')}</select>

        ${accrualSelect}

        <button type="button" data-confirm-payment="${safe(p.id)}" style="cursor:pointer;padding:8px">${p.payment_type==='salary'?'Выплатить и привязать':'Подтвердить аванс'}</button>

      </div>`;

    };

    $('ppTable').innerHTML=paymentRows.length?`<table style="width:100%;min-width:920px;border-collapse:collapse;text-align:left"><thead><tr>${['Дата','Сотрудник','Объект','Тип','Сумма','Способ','Статус','Действие'].map(t=>`<th style="padding:10px;border-bottom:1px solid #3b3f46">${t}</th>`).join('')}</tr></thead><tbody>${paymentRows.map(p=>`<tr>${[

      safe(p.payment_date),safe(names.get(p.employee_id)||'—'),safe(projectOptions.find(x=>x.id===p.project_id)?.name||'—'),safe(types[p.payment_type]||p.payment_type),money(p.amount),p.payment_method==='cash'?'Наличные':'Банк',safe(statuses[p.status]||p.status),action(p)

    ].map(v=>`<td style="padding:10px;border-bottom:1px solid #3b3f46;vertical-align:top">${v}</td>`).join('')}</tr>`).join('')}</tbody></table>`:'Выплат пока нет.';

  }

 

  async function confirmPayment(e){

    const btn=e.target.closest('[data-confirm-payment]');

    if(!btn) return;

    const id=btn.dataset.confirmPayment;

    const payment=paymentRows.find(p=>p.id===id);

    const brigadeId=$('ppTable').querySelector(`[data-brigade-for="${id}"]`)?.value;

    const accountId=$('ppTable').querySelector(`[data-account-for="${id}"]`)?.value;

    const accrualId=$('ppTable').querySelector(`[data-accrual-for="${id}"]`)?.value;

    const msg=$('ppMessage');

    try {

      if(!payment || payment.status!=='draft') throw Error('Черновик не найден или уже обработан');

      if(!['salary','advance'].includes(payment.payment_type)) throw Error('Этот вид выплаты пока недоступен');

      if(!brigadeId || !accountId) throw Error('Выберите бригаду и финансовый счёт');

      if(!payment.project_id) throw Error('Выплата должна быть привязана к объекту');

      if(payment.payment_type==='salary') {

        if(!accrualId) throw Error('Выберите утверждённое начисление');

        const accrual=rows.find(a=>a.id===accrualId);

        if(!accrual || accrual.status!=='approved' ||

           accrual.employee_id!==payment.employee_id ||

           accrual.project_id!==payment.project_id ||

           accrual.currency!==payment.currency ||

           Number(accrual.final_amount)-accrual.paid < Number(payment.amount))

          throw Error('Начисление не подходит или недостаточно остатка');

      }

      const employee=employeeOptions.find(x=>x.id===payment.employee_id)?.full_name||'Сотрудник';

      const account=financeAccountOptions.find(x=>x.id===accountId)?.name||'Счёт';

      const label=payment.payment_type==='salary'?'зарплату с привязкой к начислению':'аванс';

      if(!confirm(`Подтвердить ${label} ${money(payment.amount)}?\nСотрудник: ${employee}\nСчёт: ${account}\nДеньги будут списаны со счёта и бюджета бригады. Операцию нельзя отменить.`))return;

      btn.disabled=true;

      const transactionId=payment.payment_type==='salary'

        ? await rpc('confirm_and_allocate_salary',{

            p_payment_id:id,p_brigade_id:brigadeId,p_account_id:accountId,p_accrual_id:accrualId

          })

        : await rpc('confirm_brigade_payroll_payment',{

            p_payment_id:id,p_brigade_id:brigadeId,p_account_id:accountId

          });

      await load();

      msg.textContent='Выплата подтверждена. Финансовая операция: '+transactionId;

      msg.style.color='#a4d7b5';

    } catch(err) {

      msg.textContent='Выплата не подтверждена: '+(err.message||err);

      msg.style.color='#ff8d8d';

      btn.disabled=false;

    }

  }

 

  async function savePaymentDraft(e){

    e.preventDefault();

    const btn=$('ppSave'); btn.disabled=true;

    const msg=$('ppMessage');

    try {

      if (!client || !currentUserId) throw Error('Сначала обновите данные зарплат');

      const amount=Number($('ppAmount').value);

      if(!Number.isFinite(amount)||amount<=0)throw Error('Укажите сумму больше нуля');

      const {error}=await client.from('payroll_payments').insert({

        employee_id:$('ppEmployee').value,

        project_id:$('ppProject').value||null,

        payment_type:$('ppType').value,

        amount, currency:'PLN', payment_method:$('ppMethod').value,

        payment_date:$('ppDate').value,

        description:$('ppDescription').value.trim()||null,

        status:'draft',created_by:currentUserId

      });

      if(error)throw error;

      msg.textContent='Черновик выплаты сохранён. Деньги ещё не списаны и выплата не подтверждена.';

      msg.style.color='#a4d7b5';

      $('ppAmount').value='';$('ppDescription').value='';

      await load();

    }catch(err){msg.textContent='Ошибка: '+(err.message||err);msg.style.color='#ff8d8d';}

    finally{btn.disabled=false;}

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
