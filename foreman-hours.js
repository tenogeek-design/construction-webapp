
"use strict";

/*
  CONSTRUCTION GROUP
  Проверка рабочих часов прорабом

  RPC:
  - get_foreman_project_workers
  - get_foreman_worker_hours
  - review_foreman_work_entry

  Деньги не перечисляет.
  Начисления не создаёт.
*/

document.addEventListener("DOMContentLoaded", () => {
  if (!window.supabase) return;

  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const css = document.createElement("style");

  css.textContent = `
    .cgh-wrap {
      margin-top: 16px;
      border-top: 1px solid #526176;
      padding-top: 16px;
      color: #f0f4fb;
    }

    .cgh-title {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 13px;
    }

    .cgh-week {
      border: 1px solid #46576b;
      background: #253141;
      border-radius: 12px;
      overflow: hidden;
      margin-bottom: 13px;
    }

    .cgh-week-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      padding: 13px;
      background: #304155;
      font-size: 13px;
      font-weight: 700;
    }

    .cgh-week-total {
      color: #a6ccff;
    }

    .cgh-entry {
      padding: 15px;
      border-top: 1px solid #425369;
    }

    .cgh-line {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .cgh-muted {
      color: #aebfd4;
      font-size: 12px;
      line-height: 1.6;
    }

    .cgh-hours {
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }

    .cgh-note {
      margin: 11px 0;
      color: #e0e8f3;
      font-size: 13px;
      overflow-wrap: anywhere;
    }

    .cgh-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      margin-top: 10px;
    }

    .cgh-status {
      border-radius: 7px;
      padding: 6px 9px;
      background: #57472f;
      color: #ffdfa7;
      font-size: 11px;
    }

    .cgh-status.approved {
      background: #265542;
      color: #b4f0cc;
    }

    .cgh-status.rejected {
      background: #63383e;
      color: #ffd0d0;
    }

    .cgh-actions {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 9px;
      margin-top: 15px;
    }

    .cgh-btn {
      border: 0;
      padding: 12px 9px;
      border-radius: 9px;
      color: #fff;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
    }

    .cgh-btn.approve {
      background: #237451 !important;
    }

    .cgh-btn.correct {
      background: #365f96 !important;
    }

    .cgh-btn.reject {
      background: #94464c !important;
      grid-column: 1 / -1;
    }

    .cgh-btn.cancel {
      background: #435166 !important;
    }

    .cgh-btn:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .cgh-form {
      background: #1c2837;
      border: 1px solid #50627a;
      border-radius: 10px;
      padding: 14px;
      margin-top: 13px;
    }

    .cgh-form label {
      display: block;
      font-size: 12px;
      color: #c5d3e4;
      margin: 12px 0 6px;
    }

    .cgh-form input,
    .cgh-form textarea {
      width: 100%;
      padding: 11px;
      border: 1px solid #526780;
      border-radius: 8px;
      color: #fff;
      background: #263648;
      font: inherit;
      box-sizing: border-box;
    }

    .cgh-form textarea {
      min-height: 80px;
      resize: vertical;
    }

    .cgh-message {
      background: #304459;
      border-radius: 8px;
      padding: 12px;
      margin: 12px 0;
      color: #caddf3;
      font-size: 12px;
      line-height: 1.6;
    }

    .cgh-error {
      color: #ffb1b1;
    }

    .cgh-success {
      color: #b4f0cd;
    }

    @media(max-width:460px) {
      .cgh-actions {
        grid-template-columns: 1fr;
      }

      .cgh-btn.reject {
        grid-column: auto;
      }
    }
  `;

  document.head.append(css);

  // ============================================
  // HELPERS
  // ============================================

  function el(tag, cls = "", text) {
    const node = document.createElement(tag);

    if (cls) node.className = cls;

    if (text !== undefined) {
      node.textContent = String(text);
    }

    return node;
  }

  function dateLabel(value) {
    if (!value) return "—";

    const [year, month, day] = value.split("-");

    return `${day}.${month}.${year}`;
  }

  function weekStart(value) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12);

    date.setDate(
      date.getDate() - ((date.getDay() + 6) % 7)
    );

    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function addDays(value, days) {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(y, m - 1, d, 12);

    date.setDate(date.getDate() + days);

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

  const busyEntries = new Set();

  // ============================================
  // SERVER REVIEW
  // ============================================

  async function reviewEntry(
    entry,
    action,
    correctedHours,
    reason,
    container,
    projectId,
    workerId
  ) {
    if (busyEntries.has(entry.entry_id)) return;

    busyEntries.add(entry.entry_id);

    try {
      const { data, error } = await db.rpc(
        "review_foreman_work_entry",
        {
          p_entry_id: entry.entry_id,
          p_action: action,
          p_corrected_hours: correctedHours,
          p_reason: reason
        }
      );

      if (error) throw error;

      if (!data?.success) {
        throw new Error("Решение не сохранено");
      }

      await loadWorker(
        projectId,
        workerId,
        container
      );

      const message = el(
        "div",
        "cgh-message cgh-success",
        "✓ Решение сохранено в истории. " +
        "Обнови список объектов для пересчёта счётчиков."
      );

      container.prepend(message);

    } catch (error) {
      console.error("Work review:", error);

      const message = el(
        "div",
        "cgh-message cgh-error",
        "Ошибка: " +
        (error.message || "Не удалось сохранить решение")
      );

      container.prepend(message);

    } finally {
      busyEntries.delete(entry.entry_id);
    }
  }

  // ============================================
  // CORRECTION / REJECTION FORM
  // ============================================

  function showDecisionForm(
    entry,
    action,
    entryBox,
    container,
    projectId,
    workerId
  ) {
    entryBox.querySelector(".cgh-form")?.remove();

    const form = el("div", "cgh-form");

    form.append(
      el(
        "strong",
        "",
        action === "correct"
          ? "Корректировка рабочих часов"
          : "Причина отклонения"
      )
    );

    let hoursInput = null;

    if (action === "correct") {
      form.append(
        el("label", "", "Подтверждаемое количество часов")
      );

      hoursInput = el("input");
      hoursInput.type = "number";
      hoursInput.min = "0.01";
      hoursInput.max = "24";
      hoursInput.step = "0.01";
      hoursInput.value = String(entry.hours);

      form.append(hoursInput);

      form.append(
        el(
          "p",
          "cgh-muted",
          "Было: " + hours(entry.hours) +
          ". Старое значение сохранится в истории."
        )
      );
    }

    form.append(
      el("label", "", "Причина решения (обязательно)")
    );

    const reasonInput = el("textarea");

    reasonInput.placeholder =
      action === "correct"
        ? "Например: подтверждено 8 часов вместо 10"
        : "Например: работа в этот день не подтверждена";

    reasonInput.maxLength = 1000;
    form.append(reasonInput);

    const message = el("div", "cgh-muted");

    const actions = el("div", "cgh-actions");

    const save = el(
      "button",
      "cgh-btn " + (
        action === "correct" ? "correct" : "reject"
      ),
      action === "correct"
        ? "Сохранить и подтвердить"
        : "Отклонить запись"
    );

    save.type = "button";

    const cancel = el(
      "button",
      "cgh-btn cancel",
      "Отмена"
    );
    cancel.type = "button";

    cancel.onclick = () => form.remove();

    save.onclick = async () => {
      const reason = reasonInput.value.trim();

      if (!reason) {
        message.textContent = "Укажи причину.";
        message.className = "cgh-message cgh-error";
        return;
      }

      let corrected = null;

      if (action === "correct") {
        corrected = Number(hoursInput.value);

        if (
          !hoursInput.value ||
          !Number.isFinite(corrected) ||
          corrected <= 0 ||
          corrected > 24 ||
          corrected === Number(entry.hours) ||
          Math.abs(corrected * 100 -
            Math.round(corrected * 100)) > 0.000001
        ) {
          message.textContent =
            "Укажи новые часы от 0.01 до 24, " +
            "отличающиеся от исходных.";
          message.className = "cgh-message cgh-error";
          return;
        }
      }

      const question =
        action === "correct"
          ? "Подтвердить изменённые часы?"
          : "Отклонить эту рабочую запись?";

      if (!window.confirm(question)) return;

      save.disabled = true;
      cancel.disabled = true;

      await reviewEntry(
        entry,
        action,
        corrected,
        reason,
        container,
        projectId,
        workerId
      );

      save.disabled = false;
      cancel.disabled = false;
    };

    actions.append(save, cancel);
    form.append(actions, message);

    entryBox.append(form);
  }

  // ============================================
  // RECORD CARD
  // ============================================

  function renderEntry(
    entry,
    container,
    projectId,
    workerId
  ) {
    const box = el("div", "cgh-entry");

    const heading = el("div", "cgh-line");

    heading.append(
      el("span", "cgh-muted", dateLabel(entry.work_date)),
      el("strong", "cgh-hours", hours(entry.hours))
    );

    box.append(heading);

    box.append(
      el(
        "p",
        "cgh-note",
        entry.description || "Без пояснения"
      )
    );

    const meta = el("div", "cgh-meta");

    const status = el(
      "span",
      "cgh-status " + (
        entry.status === "approved" ? "approved" :
        entry.status === "rejected" ? "rejected" : ""
      ),
      statuses[entry.status] || entry.status
    );

    meta.append(
      status,
      el(
        "span",
        "cgh-muted",
        "Расчётно: " + money(entry.calculated_amount)
      )
    );

    box.append(meta);

    if (entry.status === "submitted") {
      const actions = el("div", "cgh-actions");

      const approve = el(
        "button",
        "cgh-btn approve",
        "✓ Подтвердить"
      );

      const correct = el(
        "button",
        "cgh-btn correct",
        "✎ Корректировать"
      );

      const reject = el(
        "button",
        "cgh-btn reject",
        "✕ Отклонить с причиной"
      );

      for (const button of [
        approve, correct, reject
      ]) {
        button.type = "button";
      }

      approve.onclick = async () => {
        const yes = window.confirm(
          "Подтвердить запись?\n\n" +
          dateLabel(entry.work_date) +
          "\n" + hours(entry.hours) +
          "\n" + money(entry.calculated_amount) +
          "\n\nЭто подтверждение часов, не выплата денег."
        );

        if (!yes) return;

        approve.disabled = true;

        await reviewEntry(
          entry,
          "approve",
          null,
          null,
          container,
          projectId,
          workerId
        );

        approve.disabled = false;
      };

      correct.onclick = () => {
        showDecisionForm(
          entry,
          "correct",
          box,
          container,
          projectId,
          workerId
        );
      };

      reject.onclick = () => {
        showDecisionForm(
          entry,
          "reject",
          box,
          container,
          projectId,
          workerId
        );
      };

      actions.append(approve, correct, reject);
      box.append(actions);
    }

    return box;
  }

  // ============================================
  // WEEKLY GROUPS
  // ============================================

  function renderHours(
    container,
    records,
    projectId,
    workerId
  ) {
    container.replaceChildren();

    container.append(
      el("div", "cgh-title", "Рабочие часы")
    );

    if (!records.length) {
      container.append(
        el(
          "div",
          "cgh-message",
          "Нет отправленных записей рабочего времени."
        )
      );
      return;
    }

    const weeks = new Map();

    for (const record of records) {
      const monday = weekStart(record.work_date);

      if (!weeks.has(monday)) {
        weeks.set(monday, []);
      }

      weeks.get(monday).push(record);
    }

    const sortedWeeks = [...weeks.keys()]
      .sort()
      .reverse();

    for (const monday of sortedWeeks) {
      const sunday = addDays(monday, 6);
      const records = weeks.get(monday);

      const week = el("div", "cgh-week");
      const header = el("div", "cgh-week-header");

      const total = records.reduce(
        (sum, record) =>
          sum + (
            record.status === "rejected"
              ? 0
              : Number(record.hours || 0)
          ),
        0
      );

      header.append(
        el(
          "span",
          "",
          dateLabel(monday) +
          " — " +
          dateLabel(sunday)
        ),
        el("span", "cgh-week-total", hours(total))
      );

      week.append(header);

      for (const record of records) {
        week.append(
          renderEntry(
            record,
            container,
            projectId,
            workerId
          )
        );
      }

      container.append(week);
    }

    container.append(
      el(
        "div",
        "cgh-message",
        "Подтверждение часов не списывает деньги " +
        "из кассы и не создаёт выплату."
      )
    );
  }

  // ============================================
  // LOAD WORKER
  // ============================================

  async function loadWorker(
    projectId,
    workerId,
    container
  ) {
    container.replaceChildren(
      el("div", "cgh-message", "Загрузка табеля...")
    );

    const { data, error } = await db.rpc(
      "get_foreman_worker_hours",
      {
        p_project_id: projectId,
        p_employee_id: workerId
      }
    );

    if (error) throw error;

    renderHours(
      container,
      Array.isArray(data) ? data : [],
      projectId,
      workerId
    );
  }

  // ============================================
  // CONNECT TO PROJECT CARDS
  // ============================================

  async function openWorker(button) {
    const workerCard = button.closest(".cfp-worker");
    const projectCard = button.closest(".cfp-project");

    const workerBody =
      workerCard?.querySelector(".cfp-worker-body");

    if (!workerCard || !projectCard || !workerBody) {
      return;
    }

    if (workerBody.hidden) return;

    let panel = workerBody.querySelector(".cgh-wrap");

    if (!panel) {
      panel = el("div", "cgh-wrap");
      workerBody.append(panel);
    }

    try {
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

      const matches = (data || []).filter(item =>
        item.project_name === projectName &&
        item.worker_name === workerName
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
      console.error("Worker hours:", error);

      panel.replaceChildren(
        el(
          "div",
          "cgh-message cgh-error",
          "Ошибка: " +
          (error.message || "Ошибка загрузки")
        )
      );
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest(
      "#cgForemanProjects .cfp-worker-head"
    );

    if (!button) return;

    // Ждём выполнения обработчика раскрытия
    // из foreman-projects.js.
    setTimeout(() => openWorker(button), 0);
  });
});
