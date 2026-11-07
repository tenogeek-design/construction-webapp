
"use strict";

// CONSTRUCTION GROUP — Time Tracking v1.0
// Только чтение записей. Без изменения зарплат.

document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const section = document.getElementById("time");

  if (!section) return;

  // Добавляем интерфейс в существующий раздел
  const panel = section.querySelector(".panel");

  if (!panel) return;

  const content = panel.querySelector(
    'div[style*="padding:20px"]'
  );

  if (!content) return;

  content.innerHTML = `
    <div style="margin-bottom:16px;">
      <button type="button" id="timeRefreshBtn">
        ↻ Обновить записи
      </button>
    </div>

    <p id="timeMessage" role="status">
      Ожидание загрузки...
    </p>

    <div id="timeTable" style="overflow-x:auto;"></div>
  `;

  if (!window.supabase) {
    document.getElementById("timeMessage").textContent =
      "Ошибка: Supabase не загружен.";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const message = document.getElementById("timeMessage");
  const table = document.getElementById("timeTable");
  const refresh = document.getElementById("timeRefreshBtn");

  function money(value) {
    return Number(value || 0).toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }) + " zł";
  }

  function safe(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function loadEntries() {
    message.textContent = "Загружаем рабочие записи...";
    table.innerHTML = "";

    const {
      data: { session },
      error: sessionError
    } = await client.auth.getSession();

    if (sessionError || !session) {
      message.textContent =
        "Необходим вход в аккаунт администратора.";
      return;
    }

    const { data, error } = await client
      .from("payroll_work_entries")
      .select("*")
      .order("work_date", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Time tracking:", error);

      message.textContent =
        "Ошибка загрузки: " + error.message;
      return;
    }

    if (!data || !data.length) {
      message.textContent =
        "Рабочих записей пока нет или нет доступа к ним.";
      return;
    }

    message.textContent =
      "Загружено записей: " + data.length;

    const rows = data.map(item => `
      <tr>
        <td>${safe(item.work_date)}</td>
        <td>${safe(item.employee_id)}</td>
        <td>${safe(item.project_id)}</td>
        <td>${safe(item.hours)}</td>
        <td>${money(item.hourly_rate)}</td>
        <td>${money(item.calculated_amount)}</td>
        <td>${safe(item.status)}</td>
      </tr>
    `).join("");

    table.innerHTML = `
      <table style="
        width:100%;
        border-collapse:collapse;
        min-width:800px;
        color:#f5f5f4;
      ">
        <thead>
          <tr style="text-align:left;color:#a4a7ad;">
            <th style="padding:12px;">Дата</th>
            <th style="padding:12px;">Сотрудник ID</th>
            <th style="padding:12px;">Объект ID</th>
            <th style="padding:12px;">Часы</th>
            <th style="padding:12px;">Ставка</th>
            <th style="padding:12px;">Сумма</th>
            <th style="padding:12px;">Статус</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  refresh.addEventListener("click", loadEntries);

  // Загружаем данные при открытии раздела
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#time") {
      loadEntries();
    }
  });

  if (window.location.hash === "#time") {
    loadEntries();
  }
});
