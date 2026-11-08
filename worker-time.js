
"use strict";

/*
  CONSTRUCTION GROUP
  Ежедневный табель + еженедельная отправка.

  Supabase RPC:
  - get_my_worker_projects
  - get_my_work_hours
  - submit_my_work_hours
  - update_my_work_hours
  - submit_my_work_week
*/

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.supabase) return;

  const URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const card = document.querySelector(
    "#workerContent .cards .card:nth-child(3)"
  );

  if (!card || card.dataset.timeReady === "true") return;
  card.dataset.timeReady = "true";

  const db = window.supabase.createClient(URL, KEY);
  const oldText = card.querySelector("p");
  if (oldText) oldText.remove();

  const root = document.createElement("div");
  root.id = "cgTimeCalendar";
  card.appendChild(root);

  // ==========================================
  // DESIGN
  // ==========================================

  const css = document.createElement("style");

  css.textContent = `
    #cgTimeCalendar {
      max-width: 700px;
      margin: 0 auto;
      color: #eef2f7;
      font-size: 14px;
    }

    #cgTimeCalendar * {
      box-sizing: border-box;
    }

    .cgt-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 9px;
      margin: 16px 0;
    }

    .cgt-stat, .cgt-panel, .cgt-entry {
      background: #222b36;
      border: 1px solid #3d4857;
      border-radius: 12px;
      padding: 14px;
      min-width: 0;
    }

    .cgt-stat small {
      display: block;
      color: #a9b6c7;
      font-size: 11px;
      margin-bottom: 6px;
    }

    .cgt-stat strong {
      font-size: 21px;
      color: #fff;
    }

    .cgt-month {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin: 19px 0 12px;
    }

    .cgt-month strong {
      text-transform: capitalize;
    }

    .cgt-arrow {
      background: #334254;
      border: 1px solid #52647c;
      color: #fff;
      padding: 9px 14px;
      border-radius: 9px;
      cursor: pointer;
    }

    .cgt-calendar {
      display: grid;
      grid-template-columns: repeat(7,minmax(0,1fr));
      gap: 5px;
    }

    .cgt-weekday {
      text-align: center;
      padding: 8px 0;
      font-size: 11px;
      color: #aab7c7;
    }

    .cgt-day {
      min-width: 0;
      min-height: 53px;
      padding: 5px 2px;
      background: #28323e;
      border: 1px solid #405063;
      border-radius: 9px;
      color: #fff;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      cursor: pointer;
    }

    .cgt-day.active {
      background: #294a70;
      border: 2px solid #70a9f5;
    }

    .cgt-day.future {
      opacity: .5;
    }

    .cgt-day small {
      color: #c0d4ec;
      font-size: 10px;
    }

    .cgt-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .cgt-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 14px 0 18px;
      font-size: 11px;
      color: #b2c0d0;
    }

    .cgt-legend span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .cgt-section {
      margin-top: 22px;
      padding-top: 18px;
      border-top: 1px solid #455162;
    }

    .cgt-panel {
      margin-top: 12px;
    }

    .cgt-week-grid {
      display: grid;
      grid-template-columns: repeat(7,minmax(0,1fr));
      gap: 5px;
      margin: 14px 0;
    }

    .cgt-week-day {
      background: #2e3a48;
      border-radius: 8px;
      padding: 8px 2px;
      min-width: 0;
      text-align: center;
    }

    .cgt-week-day small {
      display: block;
      color: #aebed0;
      font-size: 10px;
      margin-bottom: 5px;
    }

    .cgt-week-day strong {
      display: block;
      font-size: 12px;
      color: #fff;
    }

    .cgt-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .cgt-muted {
      color: #acbacb;
      font-size: 12px;
      line-height: 1.6;
      margin: 9px 0;
    }

    .cgt-entry {
      margin-top: 10px;
    }

    .cgt-status {
      font-size: 11px;
      background: #354355;
      padding: 5px 8px;
      border-radius: 7px;
    }

    .cgt-field {
      margin: 12px 0;
    }

    .cgt-field label {
      display: block;
      color: #c5d0dd;
      font-size: 12px;
      margin-bottom: 6px;
    }

    .cgt-field input,
    .cgt-field select,
    .cgt-field textarea {
      width: 100%;
      min-width: 0;
      padding: 11px;
      border-radius: 9px;
      background: #1d2631;
      color: #fff;
      border: 1px solid #506074;
      font: inherit;
    }

    .cgt-field textarea {
      min-height: 65px;
      resize: vertical;
    }

    .cgt-button {
      width: 100%;
      border: 0;
      border-radius: 9px;
      background: #4386db;
      color: #fff;
      padding: 12px;
      font-weight: 700;
      cursor: pointer;
      margin-top: 10px;
    }

    .cgt-button.secondary {
      background: #37475a;
      border: 1px solid #53667f;
    }

    .cgt-button.submit {
      background: #218562;
    }

    .cgt-button:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .cgt-actions {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 8px;
    }

    .cgt-message {
      font-size: 12px;
      margin: 12px 0;
      color: #9ce2bb;
      line-height: 1.5;
    }

    .cgt-message.error {
      color: #ff9898;
    }

    @media(max-width:480px) {
      .cgt-stat { padding: 9px; }
      .cgt-stat strong { font-size: 17px; }
      .cgt-calendar { gap: 3px; }
      .cgt-day { min-height: 45px; }
      .cgt-week-grid { gap: 3px; }
      .cgt-week-day { padding: 7px 1px; }
      .cgt-actions {
        grid-template-columns: minmax(0,1fr);
      }
    }
  `;

  document.head.appendChild(css);

  // ==========================================
  // STATE
  // ==========================================

  let selectedDate = dateString(new Date());
  let year = Number(selectedDate.slice(0, 4));
  let month = Number(selectedDate.slice(5, 7)) - 1;

  let entries = [];
  let weeklyEntries = [];
  let projects = [];

  let editingId = null;
  let showCreate = false;
  let busy = false;
  let notice = null;

  const labels = {
    draft: "Черновик",
    submitted: "На проверке",
    approved: "Подтверждено",
    rejected: "Отклонено"
  };

  const colors = {
    draft: "#659ff0",
    submitted: "#e8b454",
    approved: "#39ae7c",
    rejected: "#e77878"
  };

  // ==========================================
  // HELPERS
  // ==========================================

  function el(tag, className = "", value) {
    const node = document.createElement(tag);

    if (className) node.className = className;

    if (value !== undefined) {
      node.textContent = value;
    }

    return node;
  }

  function dateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function parseDate(value) {
    const [y, m, d] = value.split("-").map(Number);
    return new Date(y, m - 1, d, 12);
  }

  function addDays(value, days) {
    const d = parseDate(value);
    d.setDate(d.getDate() + days);
    return dateString(d);
  }

  function warsawToday() {
    const parts = new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: "Europe/Warsaw",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(new Date());

    const part = name =>
      parts.find(p => p.type === name)?.value;

    return [
      part("year"),
      part("month"),
      part("day")
    ].join("-");
  }

  function weekStart(value) {
    const d = parseDate(value);
    const offset = (d.getDay() + 6) % 7;
    return addDays(value, -offset);
  }

  function weekEnd(value) {
    return addDays(weekStart(value), 6);
  }

  function hoursTotal(list) {
    return list.reduce(
      (sum, entry) => sum + Number(entry.hours || 0),
      0
    );
  }

  function hoursText(value) {
    return Number(Number(value).toFixed(2)) + " ч";
  }

  function projectName(id) {
    return projects.find(p => p.id === id)?.name ||
      "Объект";
  }

  function recordsForDay(date, list = entries) {
    return list.filter(
      e => e.work_date === date &&
        e.work_type === "hourly"
    );
  }

  function isValidHours(value) {
    const n = Number(value);

    return value !== "" &&
      Number.isFinite(n) &&
      n > 0 && n <= 24 &&
      Math.abs(n * 100 - Math.round(n * 100)) < 0.000001;
  }

  function button(text, callback, variant = "") {
    const btn = el(
      "button",
      "cgt-button " + variant,
      text
    );

    btn.type = "button";
    btn.addEventListener("click", callback);
    return btn;
  }

  function field(parent, label, input) {
    const box = el("div", "cgt-field");

    box.append(
      el("label", "", label),
      input
    );

    parent.appendChild(box);
  }

  function statusOf(records) {
    if (records.some(e => e.status === "rejected")) {
      return "rejected";
    }

    if (records.some(e => e.status === "submitted")) {
      return "submitted";
    }

    if (records.some(e => e.status === "draft")) {
      return "draft";
    }

    return "approved";
  }

  function setNotice(text, error = false) {
    notice = { text, error };
  }

  function resetEditor() {
    editingId = null;
    showCreate = false;
    notice = null;
  }

  // ==========================================
  // SUPABASE
  // ==========================================

  async function loadProjects() {
    const { data, error } = await db.rpc(
      "get_my_worker_projects"
    );

    if (error) throw error;

    const list = Array.isArray(data) ? data : [];

    projects = list.map(p => ({
      id: p.project_id || p.id,
      name: p.project_name || p.name || "Объект"
    })).filter(p => p.id);

    projects = projects.filter(
      (p, i, arr) =>
        arr.findIndex(x => x.id === p.id) === i
    );
  }

  async function getEntries(from, to) {
    const { data, error } = await db.rpc(
      "get_my_work_hours",
      {
        p_from: from,
        p_to: to
      }
    );

    if (error) throw error;

    return Array.isArray(data) ? data : [];
  }

  async function loadEntries() {
    const start = dateString(new Date(year, month, 1));
    const end = dateString(new Date(year, month + 1, 0));

    const monday = weekStart(selectedDate);
    const sunday = weekEnd(selectedDate);

    [entries, weeklyEntries] = await Promise.all([
      getEntries(start, end),
      getEntries(monday, sunday)
    ]);
  }

  async function requireUser() {
    const { data, error } = await db.auth.getUser();

    if (error || !data?.user) {
      throw new Error("Войдите в аккаунт заново.");
    }
  }

  // ==========================================
  // MONTHLY STATISTICS
  // ==========================================

  function renderStats() {
    const active = entries.filter(
      e => e.status !== "rejected"
    );

    const approved = active.filter(
      e => e.status === "approved"
    );

    const waiting = active.filter(
      e => e.status !== "approved"
    );

    const grid = el("div", "cgt-stats");

    function stat(name, list) {
      const card = el("div", "cgt-stat");

      card.append(
        el("small", "", name),
        el("strong", "", hoursText(hoursTotal(list)))
      );

      return card;
    }

    grid.append(
      stat("За месяц", active),
      stat("Подтверждено", approved),
      stat("Ожидают", waiting)
    );

    root.append(grid);
  }

  // ==========================================
  // CALENDAR
  // ==========================================

  async function changeMonth(delta) {
    if (busy) return;

    const next = new Date(year, month + delta, 1);

    year = next.getFullYear();
    month = next.getMonth();
    selectedDate = dateString(next);

    resetEditor();
    await refresh();
  }

  function renderCalendar() {
    const nav = el("div", "cgt-month");

    const previous = button(
      "‹",
      () => changeMonth(-1)
    );

    const next = button(
      "›",
      () => changeMonth(1)
    );

    previous.className = "cgt-arrow";
    next.className = "cgt-arrow";

    const title = new Intl.DateTimeFormat(
      "ru-RU",
      { month: "long", year: "numeric" }
    ).format(new Date(year, month, 1));

    nav.append(
      previous,
      el("strong", "", title),
      next
    );

    root.append(nav);

    const grid = el("div", "cgt-calendar");

    ["Пн","Вт","Ср","Чт","Пт","Сб","Вс"]
      .forEach(d => {
        grid.append(el("div", "cgt-weekday", d));
      });

    const offset =
      (new Date(year, month, 1).getDay() + 6) % 7;

    for (let i = 0; i < offset; i++) {
      grid.append(el("div"));
    }

    const days = new Date(
      year, month + 1, 0
    ).getDate();

    for (let n = 1; n <= days; n++) {
      const date = dateString(new Date(year, month, n));
      const records = recordsForDay(date);

      const day = el("button", "cgt-day");
      day.type = "button";
      day.append(el("span", "", String(n)));

      if (date === selectedDate) {
        day.classList.add("active");
      }

      if (date > warsawToday()) {
        day.classList.add("future");
      }

      if (records.length) {
        const active = records.filter(
          e => e.status !== "rejected"
        );

        day.append(
          el("small", "", hoursText(hoursTotal(active)))
        );

        const dot = el("span", "cgt-dot");
        dot.style.background = colors[statusOf(records)];

        day.append(dot);
      }

      day.onclick = async () => {
        if (busy) return;

        selectedDate = date;
        resetEditor();

        await loadSelectedWeek();
        render();
      };

      grid.append(day);
    }

    root.append(grid);

    const legend = el("div", "cgt-legend");

    for (const status of [
      "approved","submitted","draft","rejected"
    ]) {
      const item = el("span");
      const dot = el("i", "cgt-dot");

      dot.style.background = colors[status];

      item.append(
        dot,
        el("span", "", labels[status])
      );

      legend.append(item);
    }

    root.append(legend);
  }

  async function loadSelectedWeek() {
    weeklyEntries = await getEntries(
      weekStart(selectedDate),
      weekEnd(selectedDate)
    );
  }

  // ==========================================
  // WEEKLY REPORT
  // ==========================================

  function renderWeek() {
    const monday = weekStart(selectedDate);
    const sunday = weekEnd(selectedDate);

    const active = weeklyEntries.filter(
      e => e.status !== "rejected"
    );

    const drafts = active.filter(
      e => e.status === "draft"
    );

    const submitted = active.filter(
      e => e.status === "submitted"
    );

    const approved = active.filter(
      e => e.status === "approved"
    );

    const section = el("section", "cgt-section");

    section.append(
      el("strong", "", "Табель за неделю"),
      el(
        "p",
        "cgt-muted",
        monday.split("-").reverse().join(".") +
        " — " +
        sunday.split("-").reverse().join(".")
      )
    );

    const panel = el("div", "cgt-panel");
    const grid = el("div", "cgt-week-grid");

    const days = [
      "Пн","Вт","Ср","Чт","Пт","Сб","Вс"
    ];

    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const records = recordsForDay(
        date, weeklyEntries
      ).filter(e => e.status !== "rejected");

      const box = el("div", "cgt-week-day");

      box.append(
        el(
          "small",
          "",
          days[i] + " " + Number(date.slice(-2))
        ),
        el(
          "strong",
          "",
          records.length
            ? hoursText(hoursTotal(records))
            : "—"
        )
      );

      if (records.length) {
        const dot = el("span", "cgt-dot");
        dot.style.background =
          colors[statusOf(records)];
        box.append(dot);
      }

      grid.append(box);
    }

    panel.append(grid);

    const total = el("div", "cgt-row");

    total.append(
      el("span", "cgt-muted", "Всего за неделю"),
      el("strong", "", hoursText(hoursTotal(active)))
    );

    panel.append(total);

    const line = el("p", "cgt-muted");

    line.textContent =
      "Черновики: " + hoursText(hoursTotal(drafts)) +
      " · На проверке: " + hoursText(hoursTotal(submitted)) +
      " · Подтверждено: " + hoursText(hoursTotal(approved));

    panel.append(line);

    const ended = sunday <= warsawToday();

    if (drafts.length && ended) {
      const send = button(
        "➤ Отправить неделю на проверку",
        async () => {
          if (busy) return;

          const yes = window.confirm(
            "Отправить неделю " +
            monday + " — " + sunday +
            " на проверку?\n\n" +
            "Записей: " + drafts.length +
            "\nЧасов: " + hoursText(hoursTotal(drafts)) +
            "\n\nПосле отправки черновики нельзя редактировать."
          );

          if (!yes) return;

          busy = true;
          send.disabled = true;

          try {
            await requireUser();

            const { data, error } = await db.rpc(
              "submit_my_work_week",
              {
                p_week_start: monday
              }
            );

            if (error) throw error;

            setNotice(
              "✓ Неделя отправлена на проверку. " +
              "Записей: " + data.entries_submitted +
              ", часов: " + data.hours_submitted
            );

            await refresh();

          } catch (error) {
            console.error("Week submit:", error);

            setNotice(
              error.message || "Ошибка отправки недели.",
              true
            );

            render();

          } finally {
            busy = false;
            send.disabled = false;
          }
        },
        "submit"
      );

      panel.append(send);
    } else if (drafts.length && !ended) {
      panel.append(
        el(
          "p",
          "cgt-muted",
          "Неделя ещё продолжается. " +
          "Можно сохранять часы каждый день. " +
          "Отправка станет доступна после окончания недели."
        )
      );
    } else if (submitted.length) {
      panel.append(
        el(
          "p",
          "cgt-muted",
          "Записи отправлены и ожидают проверки руководителем."
        )
      );
    } else if (approved.length) {
      panel.append(
        el(
          "p",
          "cgt-muted",
          "Все показанные записи за неделю подтверждены."
        )
      );
    } else {
      panel.append(
        el(
          "p",
          "cgt-muted",
          "За эту неделю ещё нет записей рабочего времени."
        )
      );
    }

    section.append(panel);
    root.append(section);
  }

  // ==========================================
  // EDIT WORK HOURS
  // ==========================================

  function renderEdit(parent, entry) {
    const form = el("div", "cgt-panel");

    form.append(
      el("strong", "", "Редактировать черновик")
    );

    const hours = el("input");
    hours.type = "number";
    hours.min = "0.01";
    hours.max = "24";
    hours.step = "0.01";
    hours.value = String(entry.hours);

    field(form, "Отработанные часы", hours);

    const note = el("textarea");
    note.maxLength = 500;
    note.value = entry.description || "";

    field(form, "Примечание", note);

    const message = el("p", "cgt-message");

    const cancel = button(
      "Отмена",
      () => {
        editingId = null;
        render();
      },
      "secondary"
    );

    const save = button(
      "✓ Сохранить изменения",
      async () => {
        if (busy) return;

        if (!isValidHours(hours.value)) {
          message.textContent =
            "Введите от 0.01 до 24 часов.";
          message.classList.add("error");
          return;
        }

        busy = true;
        save.disabled = true;
        cancel.disabled = true;
        message.textContent = "Сохраняем...";

        try {
          await requireUser();

          const { error } = await db.rpc(
            "update_my_work_hours",
            {
              p_entry_id: entry.id,
              p_hours: Number(hours.value),
              p_description: note.value.trim() || null
            }
          );

          if (error) throw error;

          editingId = null;
          setNotice("✓ Черновик обновлён!");

          await refresh();

        } catch (error) {
          message.textContent =
            error.message || "Ошибка сохранения.";
          message.classList.add("error");

        } finally {
          busy = false;
          save.disabled = false;
          cancel.disabled = false;
        }
      }
    );

    form.append(save, cancel, message);
    parent.append(form);
  }

  // ==========================================
  // DAILY RECORDS
  // ==========================================

  function renderRecords(parent, records) {
    for (const entry of records) {
      const box = el("div", "cgt-entry");

      const header = el("div", "cgt-row");

      const status = el(
        "span",
        "cgt-status",
        labels[entry.status] || entry.status
      );

      status.style.color = colors[entry.status];

      header.append(
        el("strong", "", hoursText(entry.hours)),
        status
      );

      box.append(header);

      box.append(
        el(
          "p",
          "cgt-muted",
          projectName(entry.project_id)
        )
      );

      if (entry.description) {
        box.append(
          el("p", "cgt-muted", entry.description)
        );
      }

      // Только черновики редактируем.
      // Ежедневной отправки больше нет.
      if (entry.status === "draft") {
        box.append(
          button(
            "✎ Редактировать",
            () => {
              editingId =
                editingId === entry.id ? null : entry.id;

              render();
            },
            "secondary"
          )
        );
      }

      if (entry.status === "submitted") {
        box.append(
          el(
            "p",
            "cgt-muted",
            "На проверке у руководителя."
          )
        );
      }

      if (entry.status === "approved") {
        box.append(
          el(
            "p",
            "cgt-muted",
            "Часы подтверждены."
          )
        );
      }

      if (entry.status === "rejected") {
        box.append(
          el(
            "p",
            "cgt-muted",
            "Запись отклонена. Требуется уточнение у руководителя."
          )
        );
      }

      parent.append(box);

      if (
        entry.status === "draft" &&
        editingId === entry.id
      ) {
        renderEdit(parent, entry);
      }
    }
  }

  // ==========================================
  // ADD HOURS
  // ==========================================

  function renderCreate(parent, records) {
    if (editingId) return;

    const available = projects.filter(p =>
      !records.some(r =>
        r.project_id === p.id &&
        r.status !== "rejected"
      )
    );

    if (!available.length) return;

    const toggle = button(
      showCreate
        ? "− Скрыть добавление"
        : "+ Добавить рабочие часы",
      () => {
        showCreate = !showCreate;
        render();
      },
      "secondary"
    );

    parent.append(toggle);

    if (!showCreate) return;

    const form = el("div", "cgt-panel");
    const select = el("select");

    const empty = el("option", "", "Выберите объект");
    empty.value = "";
    select.append(empty);

    available.forEach(p => {
      const option = el("option", "", p.name);
      option.value = p.id;
      select.append(option);
    });

    field(form, "Объект", select);

    const hours = el("input");
    hours.type = "number";
    hours.min = "0.01";
    hours.max = "24";
    hours.step = "0.01";
    hours.placeholder = "Например, 10";

    field(form, "Отработанные часы", hours);

    const note = el("textarea");
    note.maxLength = 500;
    note.placeholder = "Что делали на объекте?";

    field(form, "Примечание", note);

    const message = el("p", "cgt-message");

    const save = button(
      "Сохранить часы",
      async () => {
        if (busy || save.disabled) return;

        if (!isValidHours(hours.value)) {
          message.textContent =
            "Введите от 0.01 до 24 часов.";
          message.classList.add("error");
          return;
        }

        busy = true;
        save.disabled = true;

        try {
          await requireUser();

          const { error } = await db.rpc(
            "submit_my_work_hours",
            {
              p_project_id: select.value,
              p_work_date: selectedDate,
              p_hours: Number(hours.value),
              p_description: note.value.trim() || null
            }
          );

          if (error) throw error;

          showCreate = false;
          setNotice("✓ Рабочие часы сохранены!");

          await refresh();

        } catch (error) {
          message.textContent =
            error.message || "Ошибка сохранения.";
          message.classList.add("error");

        } finally {
          busy = false;
          save.disabled = false;
        }
      }
    );

    function checkAvailability() {
      const currentHours = hoursTotal(
        records.filter(e => e.status !== "rejected")
      );

      const tooMany =
        currentHours + Number(hours.value || 0) > 24;

      const future = selectedDate > warsawToday();

      save.disabled =
        busy || !select.value || future || tooMany;

      if (future) {
        message.textContent =
          "Будущие дни нельзя заполнять.";
      } else if (tooMany) {
        message.textContent =
          "Суммарно за день нельзя указать более 24 часов.";
        message.classList.add("error");
      } else {
        message.textContent = "";
        message.classList.remove("error");
      }
    }

    select.addEventListener("change", checkAvailability);
    hours.addEventListener("input", checkAvailability);

    form.append(save, message);
    parent.append(form);

    checkAvailability();
  }

  // ==========================================
  // SELECTED DAY
  // ==========================================

  function renderDay() {
    const section = el("section", "cgt-section");

    section.append(
      el(
        "strong",
        "",
        "День: " +
        selectedDate.split("-").reverse().join(".")
      )
    );

    const records = recordsForDay(selectedDate);

    if (records.length) {
      renderRecords(section, records);
    } else {
      section.append(
        el(
          "p",
          "cgt-muted",
          "За выбранный день часов пока нет."
        )
      );
    }

    renderCreate(section, records);
    root.append(section);
  }

  // ==========================================
  // RENDER
  // ==========================================

  function render() {
    root.replaceChildren();

    if (notice) {
      root.append(
        el(
          "p",
          notice.error
            ? "cgt-message error"
            : "cgt-message",
          notice.text
        )
      );
    }

    renderStats();
    renderCalendar();
    renderWeek();
    renderDay();
  }

  // ==========================================
  // REFRESH
  // ==========================================

  async function refresh() {
    root.textContent = "Загружаем табель...";

    try {
      await requireUser();

      await Promise.all([
        loadProjects(),
        loadEntries()
      ]);

      render();

    } catch (error) {
      console.error("Worker time:", error);

      root.replaceChildren();

      root.append(
        el(
          "p",
          "cgt-message error",
          "Ошибка: " +
          (error.message || "Неизвестная ошибка")
        )
      );

      root.append(
        button("Повторить загрузку", refresh)
      );
    }
  }

  await refresh();
});
