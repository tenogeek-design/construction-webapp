
"use strict";

/*
 CONSTRUCTION GROUP
 FOREMAN — просмотр табелей работников

 Использует существующие RPC:
 get_foreman_project_workers
 get_foreman_worker_hours

 Только чтение. Финансовые данные не изменяет.
*/

document.addEventListener("DOMContentLoaded", () => {
  const ROOT_ID = "cgForemanProjects";

  const URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  if (!window.supabase) return;

  const db = window.supabase.createClient(URL, KEY);

  const css = document.createElement("style");

  css.textContent = `
    .cgh-wrap {
      margin-top: 17px;
      border-top: 1px solid #526176;
      padding-top: 16px;
      color: #f0f4fb;
    }

    .cgh-heading {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 12px;
    }

    .cgh-week {
      border: 1px solid #485b70;
      background: #253141;
      border-radius: 12px;
      margin-bottom: 12px;
      overflow: hidden;
    }

    .cgh-week-head {
      background: #304155;
      padding: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }

    .cgh-week-title {
      font-size: 13px;
      font-weight: 700;
    }

    .cgh-week-total {
      font-weight: 700;
      color: #a7ceff;
    }

    .cgh-entry {
      padding: 14px;
      border-top: 1px solid #425369;
    }

    .cgh-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .cgh-date {
      font-size: 12px;
      color: #a9bdd5;
    }

    .cgh-hours {
      font-size: 17px;
      font-weight: 700;
      color: #fff;
    }

    .cgh-note {
      font-size: 13px;
      color: #d1dcec;
      margin: 12px 0;
      line-height: 1.5;
      overflow-wrap: anywhere;
    }

    .cgh-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      align-items: center;
      margin-top: 9px;
    }

    .cgh-badge {
      font-size: 11px;
      padding: 6px 9px;
      border-radius: 7px;
      background: #5b482e;
      color: #ffdaa0;
    }

    .cgh-badge.approved {
      background: #255643;
      color: #aaf0c9;
    }

    .cgh-badge.rejected {
      background: #65383d;
      color: #ffd0d0;
    }

    .cgh-amount {
      color: #b8c9dc;
      font-size: 12px;
    }

    .cgh-info {
      padding: 13px;
      background: #27384a;
      border-radius: 9px;
      font-size: 12px;
      line-height: 1.6;
      color: #b6cae1;
      margin: 12px 0;
    }

    .cgh-error {
      color: #ffaaaa;
    }

    .cgh-reload {
      background: #376bad;
      color: #fff;
      border: 0;
      padding: 10px 14px;
      border-radius: 8px;
      cursor: pointer;
    }
  `;

  document.head.appendChild(css);

  function node(tag, className, content) {
    const el = document.createElement(tag);

    if (className) el.className = className;

    if (content !== undefined) {
      el.textContent = String(content);
    }

    return el;
  }

  function dateLabel(value) {
    if (!value) return "—";

    const [y, m, d] = value.split("-");

    return `${d}.${m}.${y}`;
  }

  function weekStart(value) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12);

    date.setDate(
      date.getDate() - ((date.getDay() + 6) % 7)
    );

    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yy}-${mm}-${dd}`;
  }

  function addDays(value, count) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12);

    date.setDate(date.getDate() + count);

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function hours(value) {
    return Number(Number(value || 0).toFixed(2)) + " ч";
  }

  function money(value) {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN"
    }).format(Number(value || 0));
  }

  const statuses = {
    submitted: "На проверке",
    approved: "Подтверждено",
    rejected: "Отклонено"
  };

  function renderHours(container, records) {
    container.replaceChildren();

    container.append(
      node("div", "cgh-heading", "Рабочие часы")
    );

    if (!records.length) {
      container.append(
        node(
          "div",
          "cgh-info",
          "Пока нет отправленных записей времени."
        )
      );
      return;
    }

    const weeks = new Map();

    for (const entry of records) {
      const monday = weekStart(entry.work_date);

      if (!weeks.has(monday)) weeks.set(monday, []);

      weeks.get(monday).push(entry);
    }

    const sortedWeeks = [...weeks.keys()].sort().reverse();

    for (const monday of sortedWeeks) {
      const list = weeks.get(monday);
      const sunday = addDays(monday, 6);

      const section = node("div", "cgh-week");
      const head = node("div", "cgh-week-head");

      const total = list.reduce(
        (sum, item) =>
          sum + (item.status === "rejected"
            ? 0
            : Number(item.hours || 0)),
        0
      );

      head.append(
        node(
          "span",
          "cgh-week-title",
          dateLabel(monday) + " — " + dateLabel(sunday)
        ),
        node("span", "cgh-week-total", hours(total))
      );

      section.append(head);

      for (const entry of list) {
        const row = node("div", "cgh-entry");

        const line = node("div", "cgh-line");

        line.append(
          node("span", "cgh-date", dateLabel(entry.work_date)),
          node("span", "cgh-hours", hours(entry.hours))
        );

        row.append(line);

        row.append(
          node(
            "p",
            "cgh-note",
            entry.description || "Без пояснения"
          )
        );

        const meta = node("div", "cgh-meta");

        const badge = node(
          "span",
          "cgh-badge " + (
            entry.status === "approved" ? "approved" :
            entry.status === "rejected" ? "rejected" : ""
          ),
          statuses[entry.status] || entry.status
        );

        meta.append(
          badge,
          node(
            "span",
            "cgh-amount",
            "Расчётно: " + money(entry.calculated_amount)
          )
        );

        row.append(meta);
        section.append(row);
      }

      container.append(section);
    }

    container.append(
      node(
        "div",
        "cgh-info",
        "Это просмотр табеля. Начисление и выплата " +
        "зарплаты не производятся автоматически."
      )
    );
  }

  async function loadWorker(projectId, workerId, target) {
    target.replaceChildren(
      node("div", "cgh-info", "Загружаем табель...")
    );

    try {
      const { data, error } = await db.rpc(
        "get_foreman_worker_hours",
        {
          p_project_id: projectId,
          p_employee_id: workerId
        }
      );

      if (error) throw error;

      renderHours(target, Array.isArray(data) ? data : []);

    } catch (error) {
      target.replaceChildren(
        node(
          "div",
          "cgh-info cgh-error",
          "Ошибка загрузки: " + error.message
        )
      );
    }
  }

  async function openWorker(button) {
    const workerCard = button.closest(".cfp-worker");
    const projectCard = button.closest(".cfp-project");
    const workerBody =
      workerCard?.querySelector(".cfp-worker-body");

    if (!workerCard || !projectCard || !workerBody) return;
    if (workerBody.hidden) return;

    let panel = workerBody.querySelector(".cgh-wrap");

    if (!panel) {
      panel = node("div", "cgh-wrap");
      workerBody.append(panel);
    }

    try {
      // Получаем реальные UUID с сервера,
      // не доверяя именам как идентификаторам.
      const { data, error } = await db.rpc(
        "get_foreman_project_workers"
      );

      if (error) throw error;

      const projectName = projectCard
        .querySelector(".cfp-project-name")
        ?.textContent.trim();

      const workerName = workerCard
        .querySelector(".cfp-worker-name")
        ?.textContent.trim();

      const matches = (data || []).filter(row =>
        row.project_name === projectName &&
        row.worker_name === workerName
      );

      if (matches.length !== 1) {
        throw new Error(
          "Не удалось однозначно определить работника."
        );
      }

      await loadWorker(
        matches[0].project_id,
        matches[0].worker_id,
        panel
      );

    } catch (error) {
      panel.replaceChildren(
        node(
          "div",
          "cgh-info cgh-error",
          "Ошибка: " + error.message
        )
      );
    }
  }

  // Работает и после обновления списка объектов.
  document.addEventListener("click", event => {
    const button = event.target.closest(
      "#cgForemanProjects .cfp-worker-head"
    );

    if (!button) return;

    // Старый обработчик раскрывает карточку.
    // Запускаем загрузку после его выполнения.
    setTimeout(() => openWorker(button), 0);
  });
});
