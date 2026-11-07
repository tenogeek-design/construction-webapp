"use strict";

// CONSTRUCTION GROUP — Time Tracking 2.0
// Reads approved work entries and creates draft accruals via the existing RPC.
// Supabase RLS and RPC permissions remain authoritative.

document.addEventListener("DOMContentLoaded", () => {
  const section = document.getElementById("time");
  const panel = section?.querySelector(".panel");
  if (!section || !panel) return;

  const SUPABASE_URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  let content = panel.querySelector('div[style*="padding:20px"]');
  if (!content) {
    content = document.createElement("div");
    content.style.padding = "20px";
    panel.appendChild(content);
  }

  content.innerHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:14px">
      <button type="button" id="timeRefreshBtn">↻ Обновить записи</button>
      <span id="timeMessage" role="status" style="color:#a4a7ad"></span>
    </div>
    <div id="timeTable" style="overflow-x:auto"></div>
    <div style="border-top:1px solid #3b3f46;margin-top:24px;padding-top:20px">
      <h3 style="margin:0 0 8px">Сформировать начисление за период</h3>
      <p style="color:#a4a7ad;margin:0 0 16px">Только по подтверждённым работам. Перед созданием проверяем пересечения с существующими начислениями.</p>
      <form id="timeAccrualForm" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px">
        <label>Сотрудник<select id="timeEmployee" required style="display:block;width:100%;padding:10px;margin-top:6px"><option value="">Выберите сотрудника</option></select></label>
        <label>Объект<select id="timeProject" required style="display:block;width:100%;padding:10px;margin-top:6px"><option value="">Выберите объект</option></select></label>
        <label>С<input id="timeFrom" type="date" required style="display:block;width:100%;padding:10px;margin-top:6px"></label>
        <label>По<input id="timeTo" type="date" required style="display:block;width:100%;padding:10px;margin-top:6px"></label>
        <div style="display:flex;align-items:end"><button type="submit" id="timeCreateBtn">Сформировать начисление</button></div>
      </form>
      <p id="timeAccrualMessage" role="status" style="margin-top:12px"></p>
    </div>`;

  const $ = id => document.getElementById(id);
  const msg = $("timeMessage");
  const table = $("timeTable");
  const accrualMsg = $("timeAccrualMessage");
  const createBtn = $("timeCreateBtn");
  const money = n => Number(n || 0).toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " zł";
  const safe = value => String(value ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  if (!window.supabase) {
    msg.textContent = "Не загрузилась библиотека Supabase.";
    createBtn.disabled = true;
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  let entries = [];
  let employees = new Map();
  let projects = new Map();
  let busy = false;

  async function sessionRequired() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error("Войдите в аккаунт администратора.");
  }

  function fillSelect(select, records, labelKey) {
    select.replaceChildren(new Option("Выберите", ""));
    records.forEach(item => select.add(new Option(item[labelKey] || item.id, item.id)));
  }

  async function loadEntries() {
    msg.textContent = "Загрузка записей...";
    try {
      await sessionRequired();
      const [workResult, employeeResult, projectResult] = await Promise.all([
        client.from("payroll_work_entries").select("id,employee_id,project_id,work_date,work_type,hours,quantity,unit,rate,calculated_amount,status").order("work_date", { ascending: false }).limit(200),
        client.from("employees").select("id,full_name").order("full_name"),
        client.from("projects").select("id,name").order("name")
      ]);
      for (const result of [workResult, employeeResult, projectResult]) {
        if (result.error) throw result.error;
      }
      entries = workResult.data || [];
      employees = new Map((employeeResult.data || []).map(x => [x.id, x.full_name]));
      projects = new Map((projectResult.data || []).map(x => [x.id, x.name]));
      fillSelect($("timeEmployee"), employeeResult.data || [], "full_name");
      fillSelect($("timeProject"), projectResult.data || [], "name");
      if (!entries.length) {
        table.textContent = "Записей пока нет или они недоступны для этой учётной записи.";
      } else {
        table.innerHTML = `<table style="width:100%;min-width:850px;border-collapse:collapse"><thead><tr style="text-align:left;color:#a4a7ad"><th>Дата</th><th>Сотрудник</th><th>Объект</th><th>Работа</th><th>Часы / объём</th><th>Ставка</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>${entries.map(e => `<tr style="border-top:1px solid #3b3f46"><td style="padding:10px 6px">${safe(e.work_date)}</td><td>${safe(employees.get(e.employee_id) || e.employee_id)}</td><td>${safe(projects.get(e.project_id) || e.project_id)}</td><td>${safe(e.work_type)}</td><td>${safe(e.hours ?? e.quantity)} ${safe(e.hours != null ? "ч" : e.unit)}</td><td>${money(e.rate)}</td><td>${money(e.calculated_amount)}</td><td>${safe(e.status === "approved" ? "Подтверждено" : e.status)}</td></tr>`).join("")}</tbody></table>`;
      }
      msg.textContent = `Загружено записей: ${entries.length}`;
    } catch (error) {
      console.error("Time tracking load:", error);
      msg.textContent = `Ошибка загрузки: ${error.message}`;
    }
  }

  $("timeAccrualForm").addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    const employeeId = $("timeEmployee").value;
    const projectId = $("timeProject").value;
    const start = $("timeFrom").value;
    const end = $("timeTo").value;
    if (!employeeId || !projectId || !start || !end || start > end) {
      accrualMsg.textContent = "Выберите сотрудника, объект и правильный период.";
      return;
    }
    busy = true;
    createBtn.disabled = true;
    accrualMsg.textContent = "Проверяем записи и существующие начисления...";
    try {
      await sessionRequired();
      const { data: approved, error: workError } = await client.from("payroll_work_entries")
        .select("id,calculated_amount")
        .eq("employee_id", employeeId).eq("project_id", projectId)
        .eq("status", "approved").gte("work_date", start).lte("work_date", end);
      if (workError) throw workError;
      if (!approved?.length) throw new Error("Нет подтверждённых работ за этот период.");

      const { data: existing, error: accrualError } = await client.from("payroll_accruals")
        .select("id,status,period_start,period_end")
        .eq("employee_id", employeeId).eq("project_id", projectId)
        .lte("period_start", end).gte("period_end", start)
        .neq("status", "cancelled");
      if (accrualError) throw accrualError;
      if (existing?.length) throw new Error("За этот период уже есть пересекающееся начисление. Новое не создано.");

      const sum = approved.reduce((total, item) => total + Number(item.calculated_amount || 0), 0);
      const ok = window.confirm(`Создать начисление за ${start} — ${end}?\nПодтверждённых записей: ${approved.length}\nСумма работ: ${money(sum)}\nЭто НЕ утверждение и НЕ выплата.`);
      if (!ok) {
        accrualMsg.textContent = "Создание отменено.";
        return;
      }

      const { data, error } = await client.rpc("create_payroll_accrual", {
        p_employee_id: employeeId,
        p_project_id: projectId,
        p_period_start: start,
        p_period_end: end
      });
      if (error) throw error;
      accrualMsg.textContent = `Начисление создано. Результат: ${typeof data === "string" ? data : JSON.stringify(data)}. Проверьте его во вкладке «Зарплаты» перед утверждением.`;
    } catch (error) {
      console.error("Create accrual:", error);
      accrualMsg.textContent = `Начисление не создано: ${error.message}`;
    } finally {
      busy = false;
      createBtn.disabled = false;
    }
  });

  $("timeRefreshBtn").addEventListener("click", loadEntries);
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#time") loadEntries();
  });
  if (window.location.hash === "#time") loadEntries();
});
