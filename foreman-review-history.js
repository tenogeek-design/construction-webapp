
"use strict";

/*
  CONSTRUCTION GROUP
  История проверки рабочего времени.

  RPC:
  - get_foreman_project_workers
  - get_foreman_work_review_history

  Только просмотр истории.
  Никаких изменений зарплат или денег.
*/

document.addEventListener("DOMContentLoaded", () => {
  if (!window.supabase) return;

  const db = window.supabase.createClient(
    "https://yepxskcfxyiyqqhmdpve.supabase.co",
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH"
  );

  const css = document.createElement("style");

  css.textContent = `
    .cgr-panel {
      margin-top: 16px;
      padding-top: 15px;
      border-top: 1px solid #526176;
      color: #f0f5fc;
    }

    .cgr-title {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 13px;
    }

    .cgr-title strong {
      font-size: 15px;
    }

    .cgr-refresh {
      background: #345e8e !important;
      color: #fff;
      border: 0;
      border-radius: 8px;
      padding: 8px 11px;
      cursor: pointer;
      font-size: 12px;
    }

    .cgr-card {
      border: 1px solid #45566c;
      background: #253244;
      border-radius: 12px;
      margin-bottom: 10px;
      padding: 14px;
    }

    .cgr-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .cgr-label {
      color: #aebfd3;
      font-size: 12px;
    }

    .cgr-action {
      font-size: 11px;
      font-weight: 700;
      padding: 6px 9px;
      border-radius: 7px;
      background: #315b49;
      color: #b8efd2;
    }

    .cgr-action.reject {
      background: #62383e;
      color: #ffd0d0;
    }

    .cgr-values {
      display: grid;
      grid-template-columns: 1fr 30px 1fr;
      gap: 10px;
      align-items: center;
      margin: 14px 0;
    }

    .cgr-value {
      background: #304155;
      border-radius: 9px;
      padding: 12px;
      min-width: 0;
    }

    .cgr-value small {
      display: block;
      color: #a8bad0;
      font-size: 11px;
      margin-bottom: 7px;
    }

    .cgr-value strong {
      display: block;
      color: #fff;
      font-size: 18px;
    }

    .cgr-value span {
      display: block;
      color: #b9cbe0;
      font-size: 12px;
      margin-top: 5px;
    }

    .cgr-arrow {
      color: #91bdf4;
      text-align: center;
      font-size: 22px;
    }

    .cgr-reason {
      background: #1f2b3b;
      padding: 11px;
      border-radius: 8px;
      color: #cbd8e7;
      font-size: 12px;
      line-height: 1.6;
      overflow-wrap: anywhere;
    }

    .cgr-footer {
      color: #a7b9ce;
      font-size: 11px;
      margin-top: 12px;
      line-height: 1.6;
    }

    .cgr-message {
      padding: 12px;
      background: #2b3b50;
      border-radius: 8px;
      color: #c4d8ef;
      font-size: 12px;
      line-height: 1.6;
    }
  `;

  document.head.append(css);

  function el(tag, className = "", text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function hours(value) {
    if (value == null) return "—";
    return Number(value) + " ч";
  }

  function money(value) {
    if (value == null) return "—";

    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN"
    }).format(Number(value));
  }

  function dateTime(value) {
    if (!value) return "—";

    return new Intl.DateTimeFormat("ru-RU", {
      timeZone: "Europe/Warsaw",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  }

  const actionNames = {
    approve: "Подтверждение",
    correct: "Корректировка",
    reject: "Отклонение"
  };

  function valueBox(title, h, amount) {
    const box = el("div", "cgr-value");

    box.append(
      el("small", "", title),
      el("strong", "", hours(h)),
      el("span", "", money(amount))
    );

    return box;
  }

  function renderRecords(target, records) {
    const content = target.querySelector(".cgr-content");
    content.replaceChildren();

    if (!records.length) {
      content.append(
        el(
          "div",
          "cgr-message",
          "Истории решений пока нет."
        )
      );
      return;
    }

    for (const record of records) {
      const card = el("article", "cgr-card");

      const top = el("div", "cgr-row");

      const action = el(
        "span",
        "cgr-action " +
          (record.action === "reject" ? "reject" : ""),
        actionNames[record.action] || record.action
      );

      top.append(
        el("span", "cgr-label", dateTime(record.reviewed_at)),
        action
      );

      card.append(top);

      const values = el("div", "cgr-values");

      values.append(
        valueBox(
          "Было",
          record.old_hours,
          record.old_amount
        ),
        el("span", "cgr-arrow", "→"),
        valueBox(
          "Стало",
          record.new_hours,
          record.new_amount
        )
      );

      card.append(values);

      if (record.reason) {
        card.append(
          el(
            "div",
            "cgr-reason",
            "Причина: " + record.reason
          )
        );
      }

      const footer = el("div", "cgr-footer");

      footer.textContent =
        "Дата работы: " + record.work_date +
        " · Проверил: " +
        (record.reviewer_name || "Пользователь системы");

      card.append(footer);
      content.append(card);
    }
  }

  async function loadHistory(
    target,
    projectId,
    workerId
  ) {
    const content = target.querySelector(".cgr-content");

    content.replaceChildren(
      el("div", "cgr-message", "Загружаем историю...")
    );

    try {
      const { data, error } = await db.rpc(
        "get_foreman_work_review_history",
        {
          p_project_id: projectId,
          p_employee_id: workerId
        }
      );

      if (error) throw error;

      renderRecords(
        target,
        Array.isArray(data) ? data : []
      );

    } catch (error) {
      console.error("Review history:", error);

      content.replaceChildren(
        el(
          "div",
          "cgr-message",
          "Ошибка: " +
          (error.message || "Не удалось загрузить историю")
        )
      );
    }
  }

  async function openHistory(button) {
    const worker = button.closest(".cfp-worker");
    const project = button.closest(".cfp-project");

    const body = worker?.querySelector(".cfp-worker-body");

    if (!worker || !project || !body || body.hidden) {
      return;
    }

    let target = body.querySelector(".cgr-panel");

    if (!target) {
      target = el("section", "cgr-panel");

      const header = el("div", "cgr-title");
      const reload = el(
        "button",
        "cgr-refresh",
        "↻ Обновить историю"
      );

      reload.type = "button";

      header.append(
        el("strong", "", "История решений"),
        reload
      );

      target.append(
        header,
        el("div", "cgr-content")
      );

      body.append(target);
    }

    const content = target.querySelector(".cgr-content");

    content.replaceChildren(
      el("div", "cgr-message", "Загружаем историю...")
    );

    try {
      const { data, error } = await db.rpc(
        "get_foreman_project_workers"
      );

      if (error) throw error;

      const projectName = project.querySelector(
        ".cfp-project-name"
      )?.textContent.trim();

      const workerName = worker.querySelector(
        ".cfp-worker-name"
      )?.textContent.trim();

      const matches = (data || []).filter(item =>
        item.project_name === projectName &&
        item.worker_name === workerName
      );

      if (matches.length !== 1) {
        throw new Error(
          "Не удалось однозначно определить сотрудника."
        );
      }

      const { project_id, worker_id } = matches[0];

      target.querySelector(".cgr-refresh").onclick = () =>
        loadHistory(target, project_id, worker_id);

      await loadHistory(target, project_id, worker_id);

    } catch (error) {
      content.replaceChildren(
        el(
          "div",
          "cgr-message",
          "Ошибка: " + error.message
        )
      );
    }
  }

  // Делегирование событий:
  // работает после обновления карточек объектов.

  document.addEventListener("click", event => {
    const button = event.target.closest(
      "#cgForemanProjects .cfp-worker-head"
    );

    if (!button) return;

    // Сначала существующий код раскрывает карточку.
    setTimeout(() => openHistory(button), 0);
  });
});
