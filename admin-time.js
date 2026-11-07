
"use strict";

// CONSTRUCTION GROUP — Time Tracking 3.0
// Automatic hourly rates from Supabase.
// Existing payroll accrual and approval RPCs are preserved.

document.addEventListener("DOMContentLoaded", () => {
  const section = document.getElementById("time");
  const panel = section?.querySelector(".panel");
  if (!section || !panel) return;

  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  let content = panel.querySelector(
    'div[style*="padding:20px"]'
  );

  if (!content) {
    content = document.createElement("div");
    content.style.padding = "20px";
    panel.appendChild(content);
  }

  const fieldStyle =
    "display:block;width:100%;padding:11px;" +
    "margin-top:6px;background:#30343a;" +
    "color:#f5f5f4;border:1px solid #4a4e55;" +
    "border-radius:8px;box-sizing:border-box";

  const buttonStyle =
    "padding:11px 17px;background:#ff812e;" +
    "color:#202226;border:0;border-radius:8px;" +
    "font-weight:700;cursor:pointer";

  const secondaryButton =
    "padding:9px 13px;background:#34383e;" +
    "color:#f5f5f4;border:1px solid #50545b;" +
    "border-radius:8px;cursor:pointer";

  const panelStyle =
    "border:1px solid #3b3f46;border-radius:12px;" +
    "padding:20px;margin-bottom:20px;background:#292c31";

  content.innerHTML = `
    <div style="display:flex;align-items:center;
                justify-content:space-between;
                flex-wrap:wrap;gap:12px;margin-bottom:20px">
      <div>
        <h2 style="margin:0 0 6px">Учёт рабочего времени</h2>
        <p style="color:#a4a7ad;margin:0">
          Работы, часы, объёмы и начисления сотрудников
        </p>
      </div>
      <button type="button" id="timeRefreshBtn"
              style="${secondaryButton}">
        ↻ Обновить
      </button>
    </div>

    <p id="timeMessage" role="status"
       style="color:#a4a7ad;margin-bottom:16px"></p>

    <div style="${panelStyle}">
      <h3 style="margin:0 0 8px">
        Добавить выполненную работу
      </h3>
      <p style="color:#a4a7ad;margin:0 0 18px">
        Почасовая ставка выбирается автоматически
        по сотруднику, объекту и дате.
      </p>

      <form id="timeWorkForm">
        <div style="display:grid;
                    grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
                    gap:14px">

          <label>
            Сотрудник
            <select id="timeWorkEmployee" required
                    style="${fieldStyle}">
              <option value="">Выберите сотрудника</option>
            </select>
          </label>

          <label>
            Объект
            <select id="timeWorkProject" required
                    style="${fieldStyle}">
              <option value="">Выберите объект</option>
            </select>
          </label>

          <label>
            Дата работы
            <input id="timeWorkDate" type="date" required
                   style="${fieldStyle}">
          </label>

          <label>
            Тип оплаты
            <select id="timeWorkType"
                    style="${fieldStyle}">
              <option value="hourly">Почасовая</option>
              <option value="piecework">Сдельная</option>
            </select>
          </label>

          <label id="timeHoursBox">
            Отработано часов
            <input id="timeWorkHours" type="number"
                   min="0.01" step="0.01"
                   placeholder="Например: 10"
                   style="${fieldStyle}">
          </label>

          <label id="timeQuantityBox"
                 style="display:none">
            Объём работы
            <input id="timeWorkQuantity" type="number"
                   min="0.01" step="0.01"
                   placeholder="Например: 25"
                   style="${fieldStyle}">
          </label>

          <label id="timeUnitBox"
                 style="display:none">
            Единица измерения
            <select id="timeWorkUnit"
                    style="${fieldStyle}">
              <option value="m2">м²</option>
              <option value="m">Погонный метр</option>
              <option value="pcs">Штука</option>
              <option value="job">Работа</option>
            </select>
          </label>

          <label id="timeRateBox"
                 style="display:none">
            Цена за единицу, zł
            <input id="timeWorkRate" type="number"
                   min="0" step="0.01"
                   placeholder="Например: 50"
                   style="${fieldStyle}">
          </label>

        </div>

        <label style="display:block;margin-top:14px">
          Описание работы
          <textarea id="timeWorkDescription"
                    rows="2"
                    placeholder="Что было сделано?"
                    style="${fieldStyle};resize:vertical"></textarea>
        </label>

        <div style="margin-top:18px;padding:16px;
                    background:#202226;border-radius:10px;
                    border:1px solid #3b3f46">
          <div style="color:#a4a7ad;font-size:12px;
                      margin-bottom:6px">
            ПРЕДВАРИТЕЛЬНЫЙ РАСЧЁТ
          </div>
          <div id="timeRatePreview"
               style="font-size:15px;margin-bottom:6px">
            Выберите сотрудника, объект и дату
          </div>
          <strong id="timeSalaryPreview"
                  style="font-size:24px;color:#ff812e">
            —
          </strong>
        </div>

        <div style="display:flex;align-items:center;
                    flex-wrap:wrap;gap:12px;margin-top:18px">
          <button id="timeSaveWorkBtn" type="submit"
                  style="${buttonStyle}">
            Сохранить работу
          </button>
          <span id="timeWorkMessage" role="status"
                style="color:#a4a7ad"></span>
        </div>
      </form>
    </div>

    <div style="${panelStyle}">
      <h3 style="margin:0 0 8px">Рабочие записи</h3>
      <p style="color:#a4a7ad;margin:0 0 16px">
        Новые записи сохраняются как черновики.
        После проверки их можно подтвердить.
      </p>
      <div id="timeTable" style="overflow-x:auto"></div>
    </div>

    <div style="${panelStyle}">
      <h3 style="margin:0 0 8px">
        Сформировать начисление за период
      </h3>
      <p style="color:#a4a7ad;margin:0 0 16px">
        Только по подтверждённым работам.
        Начисление не является выплатой денег.
      </p>

      <form id="timeAccrualForm"
            style="display:grid;
                   grid-template-columns:repeat(auto-fit,minmax(190px,1fr));
                   gap:12px">

        <label>
          Сотрудник
          <select id="timeEmployee" required
                  style="${fieldStyle}">
            <option value="">Выберите сотрудника</option>
          </select>
        </label>

        <label>
          Объект
          <select id="timeProject" required
                  style="${fieldStyle}">
            <option value="">Выберите объект</option>
          </select>
        </label>

        <label>
          С
          <input id="timeFrom" type="date" required
                 style="${fieldStyle}">
        </label>

        <label>
          По
          <input id="timeTo" type="date" required
                 style="${fieldStyle}">
        </label>

        <div style="display:flex;align-items:end">
          <button type="submit" id="timeCreateBtn"
                  style="${buttonStyle}">
            Сформировать начисление
          </button>
        </div>
      </form>

      <p id="timeAccrualMessage" role="status"
         style="margin-top:14px;color:#a4a7ad"></p>
    </div>
  `;

  const $ = id => document.getElementById(id);

  const msg = $("timeMessage");
  const table = $("timeTable");
  const accrualMsg = $("timeAccrualMessage");
  const createBtn = $("timeCreateBtn");
  const workMsg = $("timeWorkMessage");
  const saveBtn = $("timeSaveWorkBtn");

  const money = n =>
    Number(n || 0).toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " zł";

  const safe = value =>
    String(value ?? "—")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  if (!window.supabase) {
    msg.textContent = "Не загрузилась библиотека Supabase.";
    saveBtn.disabled = true;
    createBtn.disabled = true;
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  let entries = [];
  let employees = new Map();
  let projects = new Map();
  let busy = false;
  let saving = false;
  let previewRequest = 0;
  let loaded = false;

  async function sessionRequired() {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session) {
      throw new Error("Войдите в аккаунт администратора.");
    }
  }

  function fillSelect(select, records, labelKey) {
    const previous = select.value;
    select.replaceChildren(new Option("Выберите", ""));

    records.forEach(item => {
      select.add(
        new Option(item[labelKey] || item.id, item.id)
      );
    });

    if (records.some(item => item.id === previous)) {
      select.value = previous;
    }
  }

  function updateWorkType() {
    const hourly = $("timeWorkType").value === "hourly";

    $("timeHoursBox").style.display =
      hourly ? "block" : "none";

    $("timeQuantityBox").style.display =
      hourly ? "none" : "block";

    $("timeUnitBox").style.display =
      hourly ? "none" : "block";

    $("timeRateBox").style.display =
      hourly ? "none" : "block";

    $("timeWorkHours").required = hourly;
    $("timeWorkQuantity").required = !hourly;
    $("timeWorkRate").required = !hourly;

    updatePreview();
  }

  async function getHourlyRate(employeeId, projectId, date) {
    // Read-only lookup. The server independently
    // resolves the rate again when saving work.
    const { data, error } = await client
      .from("employee_rates")
      .select("amount,project_id,valid_from,valid_to")
      .eq("employee_id", employeeId)
      .eq("rate_type", "hourly")
      .lte("valid_from", date)
      .or(`valid_to.is.null,valid_to.gte.${date}`)
      .order("valid_from", { ascending: false });

    if (error) throw error;

    const rows = data || [];

    const projectRate = rows.find(
      r => r.project_id === projectId
    );

    const generalRate = rows.find(
      r => r.project_id === null
    );

    const selected = projectRate || generalRate;

    return selected ? Number(selected.amount) : null;
  }

  async function updatePreview() {
    const request = ++previewRequest;
    const employeeId = $("timeWorkEmployee").value;
    const projectId = $("timeWorkProject").value;
    const date = $("timeWorkDate").value;
    const type = $("timeWorkType").value;

    const rateText = $("timeRatePreview");
    const salaryText = $("timeSalaryPreview");

    salaryText.textContent = "—";

    if (type === "piecework") {
      const quantity = Number($("timeWorkQuantity").value);
      const rate = Number($("timeWorkRate").value);

      rateText.textContent =
        "Сдельная ставка: " + money(rate);

      salaryText.textContent =
        quantity > 0 && rate >= 0
          ? money(quantity * rate)
          : "—";

      return;
    }

    if (!employeeId || !projectId || !date) {
      rateText.textContent =
        "Выберите сотрудника, объект и дату";
      return;
    }

    rateText.textContent = "Загрузка ставки...";

    try {
      const rate = await getHourlyRate(
        employeeId,
        projectId,
        date
      );

      if (request !== previewRequest) return;

      if (rate === null) {
        rateText.textContent =
          "На эту дату ставка не установлена";
        return;
      }

      rateText.textContent =
        "Автоматическая ставка: " + money(rate) + "/час";

      const hours = Number($("timeWorkHours").value);

      salaryText.textContent =
        hours > 0 ? money(hours * rate) : "—";

    } catch (error) {
      if (request !== previewRequest) return;

      console.error("Rate preview:", error);
      rateText.textContent =
        "Ставка скрыта или недоступна для просмотра. " +
        "При сохранении её определит сервер.";
    }
  }

  async function loadEntries() {
    msg.textContent = "Загрузка записей...";

    try {
      await sessionRequired();

      const [
        workResult,
        employeeResult,
        projectResult
      ] = await Promise.all([
        client.from("payroll_work_entries")
          .select(
            "id,employee_id,project_id,work_date," +
            "work_type,hours,quantity,unit,rate," +
            "calculated_amount,status"
          )
          .order("work_date", { ascending: false })
          .limit(200),

        client.from("employees")
          .select("id,full_name")
          .order("full_name"),

        client.from("projects")
          .select("id,name")
          .order("name")
      ]);

      for (const result of [
        workResult,
        employeeResult,
        projectResult
      ]) {
        if (result.error) throw result.error;
      }

      entries = workResult.data || [];

      employees = new Map(
        (employeeResult.data || [])
          .map(x => [x.id, x.full_name])
      );

      projects = new Map(
        (projectResult.data || [])
          .map(x => [x.id, x.name])
      );

      fillSelect(
        $("timeEmployee"),
        employeeResult.data || [],
        "full_name"
      );

      fillSelect(
        $("timeProject"),
        projectResult.data || [],
        "name"
      );

      fillSelect(
        $("timeWorkEmployee"),
        employeeResult.data || [],
        "full_name"
      );

      fillSelect(
        $("timeWorkProject"),
        projectResult.data || [],
        "name"
      );

      renderEntries();

      msg.textContent =
        `Загружено записей: ${entries.length}`;

      loaded = true;
      updatePreview();

    } catch (error) {
      console.error("Time tracking load:", error);
      msg.textContent =
        "Ошибка загрузки: " + error.message;
    }
  }

  function renderEntries() {
    if (!entries.length) {
      table.textContent =
        "Записей пока нет или они недоступны " +
        "для этой учётной записи.";
      return;
    }

    const statusNames = {
      draft: "Черновик",
      submitted: "На проверке",
      approved: "Подтверждено",
      rejected: "Отклонено"
    };

    table.innerHTML = `
      <table style="width:100%;min-width:950px;
                    border-collapse:collapse">
        <thead>
          <tr style="text-align:left;color:#a4a7ad">
            <th style="padding:10px 6px">Дата</th>
            <th>Сотрудник</th>
            <th>Объект</th>
            <th>Работа</th>
            <th>Часы / объём</th>
            <th>Ставка</th>
            <th>Сумма</th>
            <th>Статус</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          ${entries.map(e => `
            <tr style="border-top:1px solid #3b3f46">
              <td style="padding:11px 6px">
                ${safe(e.work_date)}
              </td>
              <td>
                ${safe(
                  employees.get(e.employee_id) ||
                  e.employee_id
                )}
              </td>
              <td>
                ${safe(
                  projects.get(e.project_id) ||
                  e.project_id
                )}
              </td>
              <td>
                ${e.work_type === "hourly"
                  ? "Почасовая"
                  : "Сдельная"}
              </td>
              <td>
                ${safe(e.hours ?? e.quantity)}
                ${safe(e.hours != null ? "ч" : e.unit)}
              </td>
              <td>${money(e.rate)}</td>
              <td>${money(e.calculated_amount)}</td>
              <td>
                ${safe(statusNames[e.status] || e.status)}
              </td>
              <td>
                ${e.status === "draft" ||
                  e.status === "submitted"
                    ? `<button type="button"
                         data-approve-work="${safe(e.id)}"
                         style="${secondaryButton}">
                         Подтвердить
                       </button>`
                    : "—"}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  async function saveWork(event) {
    event.preventDefault();

    if (saving) return;

    const employeeId = $("timeWorkEmployee").value;
    const projectId = $("timeWorkProject").value;
    const date = $("timeWorkDate").value;
    const type = $("timeWorkType").value;

    const hours = Number($("timeWorkHours").value);
    const quantity = Number($("timeWorkQuantity").value);
    const rate = Number($("timeWorkRate").value);

    const description =
      $("timeWorkDescription").value.trim();

    if (!employeeId || !projectId || !date) {
      workMsg.textContent =
        "Заполните сотрудника, объект и дату.";
      return;
    }

    if (type === "hourly" && !(hours > 0)) {
      workMsg.textContent =
        "Укажите количество часов.";
      return;
    }

    if (
      type === "piecework" &&
      (!(quantity > 0) || !Number.isFinite(rate) || rate < 0)
    ) {
      workMsg.textContent =
        "Укажите объём и цену за единицу.";
      return;
    }

    saving = true;
    saveBtn.disabled = true;
    workMsg.textContent = "Сохранение...";

    try {
      await sessionRequired();

      const { data, error } = await client.rpc(
        "create_payroll_work_entry",
        {
          p_employee_id: employeeId,
          p_project_id: projectId,
          p_work_date: date,
          p_work_type: type,
          p_hours: type === "hourly" ? hours : null,
          p_quantity: type === "piecework"
            ? quantity
            : null,
          p_unit: type === "piecework"
            ? $("timeWorkUnit").value
            : null,
          p_rate: type === "piecework" ? rate : null,
          p_description: description || null
        }
      );

      if (error) throw error;

      workMsg.textContent =
        "Работа сохранена как черновик.";

      $("timeWorkHours").value = "";
      $("timeWorkQuantity").value = "";
      $("timeWorkRate").value = "";
      $("timeWorkDescription").value = "";

      await loadEntries();

    } catch (error) {
      console.error("Save payroll work:", error);
      workMsg.textContent =
        "Ошибка сохранения: " + error.message;
    } finally {
      saving = false;
      saveBtn.disabled = false;
    }
  }

  async function approveWork(entryId, button) {
    if (busy) return;

    const entry = entries.find(e => e.id === entryId);
    if (!entry) return;

    const name =
      employees.get(entry.employee_id) || "сотрудника";

    if (!window.confirm(
      `Подтвердить работу сотрудника ${name}?\n` +
      `Дата: ${entry.work_date}\n` +
      `Сумма: ${money(entry.calculated_amount)}`
    )) return;

    busy = true;
    button.disabled = true;

    try {
      await sessionRequired();

      const { error } = await client.rpc(
        "approve_payroll_work_entry",
        { p_entry_id: entryId }
      );

      if (error) throw error;

      msg.textContent = "Работа подтверждена.";
      await loadEntries();

    } catch (error) {
      console.error("Approve work:", error);
      msg.textContent =
        "Не удалось подтвердить: " + error.message;
      button.disabled = false;
    } finally {
      busy = false;
    }
  }

  async function createAccrual(event) {
    event.preventDefault();

    if (busy) return;

    const employeeId = $("timeEmployee").value;
    const projectId = $("timeProject").value;
    const start = $("timeFrom").value;
    const end = $("timeTo").value;

    if (
      !employeeId || !projectId ||
      !start || !end || start > end
    ) {
      accrualMsg.textContent =
        "Выберите сотрудника, объект и правильный период.";
      return;
    }

    busy = true;
    createBtn.disabled = true;

    accrualMsg.textContent =
      "Проверяем записи и существующие начисления...";

    try {
      await sessionRequired();

      const { data: approved, error: workError } =
        await client.from("payroll_work_entries")
          .select("id,calculated_amount")
          .eq("employee_id", employeeId)
          .eq("project_id", projectId)
          .eq("status", "approved")
          .gte("work_date", start)
          .lte("work_date", end);

      if (workError) throw workError;

      if (!approved?.length) {
        throw new Error(
          "Нет подтверждённых работ за этот период."
        );
      }

      const { data: existing, error: accrualError } =
        await client.from("payroll_accruals")
          .select("id,status,period_start,period_end")
          .eq("employee_id", employeeId)
          .eq("project_id", projectId)
          .lte("period_start", end)
          .gte("period_end", start)
          .neq("status", "cancelled");

      if (accrualError) throw accrualError;

      if (existing?.length) {
        throw new Error(
          "За этот период уже есть пересекающееся " +
          "начисление. Новое не создано."
        );
      }

      const sum = approved.reduce(
        (total, item) =>
          total + Number(item.calculated_amount || 0),
        0
      );

      const ok = window.confirm(
        `Создать начисление за ${start} — ${end}?\n` +
        `Подтверждённых записей: ${approved.length}\n` +
        `Сумма работ: ${money(sum)}\n` +
        `Это НЕ утверждение и НЕ выплата.`
      );

      if (!ok) {
        accrualMsg.textContent = "Создание отменено.";
        return;
      }

      const { data, error } = await client.rpc(
        "create_payroll_accrual",
        {
          p_employee_id: employeeId,
          p_project_id: projectId,
          p_period_start: start,
          p_period_end: end
        }
      );

      if (error) throw error;

      accrualMsg.textContent =
        "Начисление создано. ID: " + data +
        ". Проверьте его во вкладке «Зарплаты».";

    } catch (error) {
      console.error("Create accrual:", error);
      accrualMsg.textContent =
        "Начисление не создано: " + error.message;
    } finally {
      busy = false;
      createBtn.disabled = false;
    }
  }

  $("timeWorkType").addEventListener(
    "change",
    updateWorkType
  );

  [
    "timeWorkEmployee",
    "timeWorkProject",
    "timeWorkDate",
    "timeWorkHours",
    "timeWorkQuantity",
    "timeWorkRate"
  ].forEach(id => {
    $(id).addEventListener("input", updatePreview);
    $(id).addEventListener("change", updatePreview);
  });

  $("timeWorkForm").addEventListener(
    "submit",
    saveWork
  );

  $("timeAccrualForm").addEventListener(
    "submit",
    createAccrual
  );

  table.addEventListener("click", event => {
    const button = event.target.closest(
      "[data-approve-work]"
    );

    if (!button) return;

    approveWork(
      button.dataset.approveWork,
      button
    );
  });

  $("timeRefreshBtn").addEventListener(
    "click",
    loadEntries
  );

  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#time") {
      loadEntries();
    }
  });

  updateWorkType();

  if (window.location.hash === "#time") {
    loadEntries();
  }
});
