
"use strict";

/*
  CONSTRUCTION GROUP
  Календарь учёта рабочего времени.

  Возможности:
  - Просмотр часов за месяц
  - Создание черновика
  - Редактирование своего черновика
  - Отправка на проверку прорабу
  - Защита подтверждённых записей

  Supabase RPC:
  get_my_worker_projects
  get_my_work_hours
  submit_my_work_hours
  update_my_work_hours
  submit_my_work_for_review
*/

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.supabase) return;

  const URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const db = window.supabase.createClient(URL, KEY);

  const card = document.querySelector(
    "#workerContent .cards .card:nth-child(3)"
  );

  if (!card || card.dataset.timeReady === "true") return;

  card.dataset.timeReady = "true";

  const description = card.querySelector("p");
  if (description) description.remove();

  const root = document.createElement("div");
  root.id = "cgTimeCalendar";
  card.appendChild(root);

  // ==========================================
  // CSS
  // ==========================================

  const style = document.createElement("style");

  style.textContent = `
    #cgTimeCalendar {
      max-width: 680px;
      width: 100%;
      margin: 0 auto;
      color: #eef2f7;
    }

    #cgTimeCalendar * {
      box-sizing: border-box;
    }

    .cgt-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0,1fr));
      gap: 9px;
      margin: 14px 0;
    }

    .cgt-stat {
      background: #222a35;
      border: 1px solid #3c4653;
      border-radius: 11px;
      padding: 12px;
      min-width: 0;
    }

    .cgt-stat small {
      display: block;
      color: #a4b1c2;
      font-size: 11px;
      margin-bottom: 6px;
    }

    .cgt-stat strong {
      font-size: 20px;
      color: #fff;
    }

    .cgt-month {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 20px 0 12px;
    }

    .cgt-arrow {
      background: #313e50;
      color: #fff;
      border: 1px solid #45566b;
      border-radius: 9px;
      padding: 9px 14px;
      cursor: pointer;
    }

    .cgt-month-title {
      font-size: 15px;
      font-weight: bold;
      text-align: center;
      text-transform: capitalize;
    }

    .cgt-calendar {
      display: grid;
      grid-template-columns: repeat(7,minmax(0,1fr));
      gap: 5px;
    }

    .cgt-weekday {
      text-align: center;
      color: #a5b1c1;
      font-size: 11px;
      padding: 9px 0;
    }

    .cgt-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 0;
      min-height: 52px;
      gap: 4px;
      padding: 5px 1px;
      background: #262f3a;
      border: 1px solid #3c4653;
      border-radius: 9px;
      color: #edf3fa;
      cursor: pointer;
    }

    .cgt-day:hover {
      background: #354456;
    }

    .cgt-day.active {
      border: 2px solid #659ff0;
      background: #294569;
    }

    .cgt-day.future {
      opacity: .5;
    }

    .cgt-day small {
      font-size: 10px;
      color: #b7c8dc;
    }

    .cgt-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .cgt-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      color: #adbacb;
      font-size: 11px;
      margin: 14px 0;
    }

    .cgt-legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .cgt-editor {
      margin-top: 18px;
      padding-top: 18px;
      border-top: 1px solid #424d5a;
    }

    .cgt-entry {
      background: #222b36;
      border: 1px solid #3d4857;
      border-radius: 11px;
      padding: 13px;
      margin-top: 10px;
    }

    .cgt-entry-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .cgt-entry-hours {
      font-size: 19px;
      font-weight: 700;
    }

    .cgt-status {
      font-size: 11px;
      border-radius: 7px;
      padding: 5px 8px;
      background: #354355;
      white-space: nowrap;
    }

    .cgt-entry-info,
    .cgt-note {
      font-size: 12px;
      color: #b2c0d0;
      line-height: 1.5;
      margin: 9px 0;
    }

    .cgt-field {
      display: block;
      margin: 13px 0;
    }

    .cgt-field label {
      display: block;
      color: #c1cbd8;
      font-size: 12px;
      margin-bottom: 7px;
    }

    .cgt-field input,
    .cgt-field select,
    .cgt-field textarea {
      display: block;
      width: 100%;
      background: #1e2630;
      color: #fff;
      border: 1px solid #465364;
      border-radius: 9px;
      padding: 11px;
      font: inherit;
      font-size: 14px;
    }

    .cgt-field textarea {
      resize: vertical;
      min-height: 70px;
    }

    .cgt-button {
      display: block;
      width: 100%;
      padding: 11px 13px;
      border: 0;
      border-radius: 9px;
      font-weight: bold;
      cursor: pointer;
      margin-top: 10px;
      background: #3d82df;
      color: #fff;
    }

    .cgt-button:hover {
      background: #5795eb;
    }

    .cgt-button.secondary {
      background: #354356;
      border: 1px solid #53647a;
    }

    .cgt-button.submit {
      background: #218562;
    }

    .cgt-button.submit:hover {
      background: #2a9e75;
    }

    .cgt-button:disabled {
      opacity: .5;
      cursor: not-allowed;
    }

    .cgt-actions {
      display: grid;
      grid-template-columns: repeat(2,minmax(0,1fr));
      gap: 9px;
      margin-top: 12px;
    }

    .cgt-actions .cgt-button {
      margin: 0;
    }

    .cgt-message {
      font-size: 12px;
      line-height: 1.5;
      margin: 12px 0;
      color: #9ce2bb;
    }

    .cgt-message.error {
      color: #ff9898;
    }

    .cgt-add-toggle {
      margin-top: 17px;
      background: transparent;
      border: 1px dashed #53647a;
      border-radius: 9px;
      padding: 11px;
      width: 100%;
      color: #b9cce6;
      font-weight: 600;
      cursor: pointer;
    }

    @media(max-width:480px) {
      .cgt-stat {
        padding: 9px;
      }

      .cgt-stat strong {
        font-size: 17px;
      }

      .cgt-calendar {
        gap: 3px;
      }

      .cgt-day {
        min-height: 45px;
      }

      .cgt-actions {
        grid-template-columns: minmax(0,1fr);
      }
    }
  `;

  document.head.appendChild(style);

  // ==========================================
  // STATE
  // ==========================================

  const initial = new Date();

  let year = initial.getFullYear();
  let month = initial.getMonth();
  let selectedDate = formatDate(initial);

  let entries = [];
  let projects = [];

  let editingId = null;
  let showCreate = false;
  let busy = false;
  let notice = null;

  const statusNames = {
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

  function el(tag, className = "", text) {
    const node = document.createElement(tag);

    if (className) {
      node.className = className;
    }

    if (text !== undefined) {
      node.textContent = text;
    }

    return node;
  }

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  function today() {
    return formatDate(new Date());
  }

  function monthKey() {
    return (
      year + "-" +
      String(month + 1).padStart(2, "0")
    );
  }

  function dateEntries(date) {
    return entries.filter(entry =>
      entry.work_date === date &&
      entry.work_type === "hourly"
    );
  }

  function sumHours(list) {
    return list.reduce(
      (sum, entry) =>
        sum + Number(entry.hours || 0),
      0
    );
  }

  function formatHours(value) {
    return Number(Number(value).toFixed(2)).toString();
  }

  function projectName(id) {
    return projects.find(p => p.id === id)?.name ||
      "Объект";
  }

  function validHours(value) {
    const number = Number(value);

    return (
      value !== "" &&
      Number.isFinite(number) &&
      number > 0 &&
      number <= 24 &&
      Math.abs(number * 100 -
        Math.round(number * 100)) < 0.000001
    );
  }

  function field(parent, title, input) {
    const wrapper = el("div", "cgt-field");

    wrapper.append(
      el("label", "", title),
      input
    );

    parent.appendChild(wrapper);
    return wrapper;
  }

  function button(text, callback, className = "") {
    const btn = el(
      "button",
      "cgt-button " + className,
      text
    );

    btn.type = "button";
    btn.addEventListener("click", callback);

    return btn;
  }

  function resetEditor() {
    editingId = null;
    showCreate = false;
    notice = null;
  }

  async function requireUser() {
    const { data, error } = await db.auth.getUser();

    if (error || !data?.user) {
      throw new Error("Войдите в аккаунт заново.");
    }

    return data.user;
  }

  // ==========================================
  // SUPABASE — ЧТЕНИЕ
  // ==========================================

  async function loadProjects() {
    const { data, error } = await db.rpc(
      "get_my_worker_projects"
    );

    if (error) throw error;

    const list = Array.isArray(data) ? data : [];

    projects = list.map(project => ({
      id: project.project_id || project.id,
      name:
        project.project_name ||
        project.name ||
        "Без названия"
    })).filter(project => project.id);

    projects = projects.filter(
      (p, i, all) =>
        all.findIndex(x => x.id === p.id) === i
    );
  }

  async function loadEntries() {
    const from = `${monthKey()}-01`;

    const last = new Date(
      year,
      month + 1,
      0
    ).getDate();

    const to =
      `${monthKey()}-${String(last).padStart(2, "0")}`;

    const { data, error } = await db.rpc(
      "get_my_work_hours",
      {
        p_from: from,
        p_to: to
      }
    );

    if (error) throw error;

    entries = Array.isArray(data) ? data : [];
  }

  // ==========================================
  // СТАТИСТИКА
  // ==========================================

  function renderStats() {
    const active = entries.filter(
      e => e.status !== "rejected"
    );

    const approved = active.filter(
      e => e.status === "approved"
    );

    const pending = active.filter(
      e => e.status !== "approved"
    );

    const wrapper = el("div", "cgt-stats");

    function stat(label, value) {
      const box = el("div", "cgt-stat");

      box.append(
        el("small", "", label),
        el("strong", "", formatHours(value) + " ч")
      );

      return box;
    }

    wrapper.append(
      stat("За месяц", sumHours(active)),
      stat("Подтверждено", sumHours(approved)),
      stat("Ожидают", sumHours(pending))
    );

    root.appendChild(wrapper);
  }

  // ==========================================
  // КАЛЕНДАРЬ
  // ==========================================

  async function changeMonth(direction) {
    if (busy) return;

    const d = new Date(
      year,
      month + direction,
      1
    );

    year = d.getFullYear();
    month = d.getMonth();
    selectedDate = formatDate(d);

    resetEditor();
    await refresh();
  }

  function renderCalendar() {
    const nav = el("div", "cgt-month");

    const prev = button("‹", () => changeMonth(-1));
    const next = button("›", () => changeMonth(1));

    prev.className = "cgt-arrow";
    next.className = "cgt-arrow";

    nav.append(
      prev,
      el(
        "div",
        "cgt-month-title",
        new Intl.DateTimeFormat("ru-RU", {
          month: "long",
          year: "numeric"
        }).format(new Date(year, month, 1))
      ),
      next
    );

    root.appendChild(nav);

    const grid = el("div", "cgt-calendar");

    for (const name of [
      "Пн", "Вт", "Ср",
      "Чт", "Пт", "Сб", "Вс"
    ]) {
      grid.append(
        el("div", "cgt-weekday", name)
      );
    }

    const offset =
      (new Date(year, month, 1).getDay() + 6) % 7;

    const days =
      new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      grid.append(el("div"));
    }

    for (let day = 1; day <= days; day++) {
      const date = formatDate(
        new Date(year, month, day)
      );

      const records = dateEntries(date);

      const cell = el("button", "cgt-day");
      cell.type = "button";

      cell.append(
        el("span", "", String(day))
      );

      if (date === selectedDate) {
        cell.classList.add("active");
      }

      if (date > today()) {
        cell.classList.add("future");
      }

      if (records.length) {
        const included = records.filter(
          e => e.status !== "rejected"
        );

        cell.append(
          el(
            "small",
            "",
            formatHours(sumHours(included)) + "ч"
          )
        );

        const priority = [
          "rejected",
          "submitted",
          "draft",
          "approved"
        ];

        const status = priority.find(s =>
          records.some(e => e.status === s)
        ) || "draft";

        const dot = el("div", "cgt-dot");
        dot.style.background = colors[status];

        cell.append(dot);
      }

      cell.addEventListener("click", () => {
        if (busy) return;

        selectedDate = date;
        resetEditor();
        render();
      });

      grid.append(cell);
    }

    root.append(grid);

    const legend = el("div", "cgt-legend");

    for (const status of [
      "approved",
      "submitted",
      "draft",
      "rejected"
    ]) {
      const item = el(
        "span",
        "cgt-legend-item"
      );

      const dot = el("span", "cgt-dot");
      dot.style.background = colors[status];

      item.append(
        dot,
        el("span", "", statusNames[status])
      );

      legend.append(item);
    }

    root.append(legend);
  }

  // ==========================================
  // РЕДАКТИРОВАНИЕ ЧЕРНОВИКА
  // ==========================================

  function renderEditForm(section, entry) {
    const form = el("div", "cgt-entry");

    form.append(
      el("strong", "", "Редактирование черновика"),
      el(
        "p",
        "cgt-note",
        projectName(entry.project_id)
      )
    );

    const hours = el("input");
    hours.type = "number";
    hours.min = "0.01";
    hours.max = "24";
    hours.step = "0.01";
    hours.value = String(entry.hours);

    field(form, "Отработанные часы", hours);

    const description = el("textarea");
    description.maxLength = 500;
    description.value = entry.description || "";

    field(form, "Примечание", description);

    const msg = el("p", "cgt-message");

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

        if (!validHours(hours.value)) {
          msg.textContent =
            "Укажите от 0.01 до 24 часов.";
          msg.classList.add("error");
          return;
        }

        busy = true;
        save.disabled = true;
        cancel.disabled = true;

        msg.textContent = "Сохраняем...";
        msg.classList.remove("error");

        try {
          await requireUser();

          const { error } = await db.rpc(
            "update_my_work_hours",
            {
              p_entry_id: entry.id,
              p_hours: Number(hours.value),
              p_description:
                description.value.trim() || null
            }
          );

          if (error) throw error;

          editingId = null;

          notice = {
            text: "✓ Черновик успешно обновлён!",
            error: false
          };

          await refresh();

        } catch (error) {
          console.error("Update hours:", error);

          msg.textContent =
            error.message ||
            "Не удалось изменить часы.";

          msg.classList.add("error");

        } finally {
          busy = false;
          save.disabled = false;
          cancel.disabled = false;
        }
      }
    );

    form.append(save, cancel, msg);
    section.append(form);
  }

  // ==========================================
  // ОТПРАВКА НА ПРОВЕРКУ
  // ==========================================

  async function submitForReview(entry, message, controls) {
    if (busy) return;

    const confirmed = window.confirm(
      "Отправить " +
      formatHours(Number(entry.hours)) +
      " часов за " +
      entry.work_date +
      " на проверку?\n\n" +
      "После отправки редактирование будет недоступно."
    );

    if (!confirmed) return;

    busy = true;

    for (const control of controls) {
      control.disabled = true;
    }

    message.classList.remove("error");
    message.textContent =
      "Отправляем на проверку...";

    try {
      await requireUser();

      const { error } = await db.rpc(
        "submit_my_work_for_review",
        {
          p_entry_id: entry.id
        }
      );

      if (error) throw error;

      editingId = null;

      notice = {
        text: "✓ Часы отправлены на проверку прорабу!",
        error: false
      };

      await refresh();

    } catch (error) {
      console.error("Submit work review:", error);

      message.classList.add("error");
      message.textContent =
        error.message ||
        "Не удалось отправить запись.";

    } finally {
      busy = false;

      for (const control of controls) {
        control.disabled = false;
      }
    }
  }

  // ==========================================
  // ЗАПИСИ ЗА ДЕНЬ
  // ==========================================

  function renderRecords(section, records) {
    if (!records.length) return;

    section.append(
      el(
        "p",
        "cgt-note",
        "Записи за выбранный день:"
      )
    );

    for (const entry of records) {
      const box = el("div", "cgt-entry");

      const header = el(
        "div",
        "cgt-entry-header"
      );

      const status = el(
        "span",
        "cgt-status",
        statusNames[entry.status] || entry.status
      );

      status.style.color =
        colors[entry.status] || "#fff";

      header.append(
        el(
          "strong",
          "cgt-entry-hours",
          formatHours(Number(entry.hours)) + " ч"
        ),
        status
      );

      box.append(header);

      box.append(
        el(
          "p",
          "cgt-entry-info",
          projectName(entry.project_id)
        )
      );

      if (entry.description) {
        box.append(
          el(
            "p",
            "cgt-entry-info",
            entry.description
          )
        );
      }

      if (entry.status === "draft") {
        const actions = el(
          "div",
          "cgt-actions"
        );

        const edit = button(
          "✎ Редактировать",
          () => {
            editingId =
              editingId === entry.id
                ? null
                : entry.id;

            notice = null;
            render();
          },
          "secondary"
        );

        const message = el(
          "p",
          "cgt-message"
        );

        const send = button(
          "➤ На проверку",
          () => submitForReview(
            entry,
            message,
            [edit, send]
          ),
          "submit"
        );

        actions.append(edit, send);
        box.append(actions, message);
      }

      if (entry.status === "submitted") {
        box.append(
          el(
            "p",
            "cgt-note",
            "Ожидает проверки руководителем. " +
            "Редактирование заблокировано."
          )
        );
      }

      if (entry.status === "approved") {
        box.append(
          el(
            "p",
            "cgt-note",
            "Рабочие часы подтверждены."
          )
        );
      }

      if (entry.status === "rejected") {
        box.append(
          el(
            "p",
            "cgt-note",
            "Запись отклонена. " +
            "Для исправления потребуется решение руководителя."
          )
        );
      }

      section.append(box);

      if (
        editingId === entry.id &&
        entry.status === "draft"
      ) {
        renderEditForm(section, entry);
      }
    }
  }

  // ==========================================
  // СОЗДАНИЕ ЧАСОВ
  // ==========================================

  function renderCreateForm(section, existing) {
    if (editingId) return;

    const available = projects.filter(project =>
      !existing.some(entry =>
        entry.project_id === project.id &&
        entry.status !== "rejected"
      )
    );

    // Если запись уже существует на всех
    // доступных объектах, форму не показываем.
    if (!available.length) return;

    const toggle = el(
      "button",
      "cgt-add-toggle",
      showCreate
        ? "− Скрыть форму"
        : "+ Добавить рабочие часы"
    );

    toggle.type = "button";

    toggle.addEventListener("click", () => {
      showCreate = !showCreate;
      render();
    });

    section.append(toggle);

    if (!showCreate) return;

    const form = el("div", "cgt-entry");

    const select = el("select");

    const placeholder = el(
      "option",
      "",
      "Выберите объект"
    );

    placeholder.value = "";
    select.append(placeholder);

    for (const project of available) {
      const option = el(
        "option",
        "",
        project.name
      );

      option.value = project.id;
      select.append(option);
    }

    field(form, "Объект", select);

    const hours = el("input");
    hours.type = "number";
    hours.min = "0.01";
    hours.max = "24";
    hours.step = "0.01";
    hours.placeholder = "Например: 10";

    field(form, "Отработанные часы", hours);

    const description = el("textarea");
    description.maxLength = 500;
    description.placeholder =
      "Что делали на объекте?";

    field(form, "Примечание", description);

    const message = el("p", "cgt-message");

    const save = button(
      "Сохранить часы",
      async () => {
        if (busy) return;

        if (!validHours(hours.value)) {
          message.classList.add("error");
          message.textContent =
            "Укажите от 0.01 до 24 часов.";
          return;
        }

        busy = true;
        save.disabled = true;

        message.classList.remove("error");
        message.textContent = "Сохраняем...";

        try {
          await requireUser();

          const { error } = await db.rpc(
            "submit_my_work_hours",
            {
              p_project_id: select.value,
              p_work_date: selectedDate,
              p_hours: Number(hours.value),
              p_description:
                description.value.trim() || null
            }
          );

          if (error) throw error;

          showCreate = false;

          notice = {
            text: "✓ Рабочие часы сохранены!",
            error: false
          };

          await refresh();

        } catch (error) {
          console.error("Create hours:", error);

          message.classList.add("error");
          message.textContent =
            error.message ||
            "Ошибка сохранения часов.";

        } finally {
          busy = false;
          save.disabled = false;
        }
      }
    );

    function updateAvailability() {
      const future = selectedDate > today();

      const existingHours = existing
        .filter(e => e.status !== "rejected")
        .reduce(
          (sum, e) => sum + Number(e.hours || 0),
          0
        );

      const entered = Number(hours.value || 0);

      const tooMany = existingHours + entered > 24;

      save.disabled =
        busy ||
        future ||
        !select.value ||
        tooMany;

      if (future) {
        message.textContent =
          "Будущую дату пока нельзя заполнять.";
      } else if (tooMany) {
        message.textContent =
          "Общее количество часов за день " +
          "не может превышать 24.";
        message.classList.add("error");
      } else {
        message.textContent = "";
        message.classList.remove("error");
      }
    }

    select.addEventListener(
      "change",
      updateAvailability
    );

    hours.addEventListener(
      "input",
      updateAvailability
    );

    form.append(save, message);
    section.append(form);

    updateAvailability();
  }

  // ==========================================
  // ВЫБРАННЫЙ ДЕНЬ
  // ==========================================

  function renderEditor() {
    const section = el(
      "section",
      "cgt-editor"
    );

    const label = selectedDate
      .split("-")
      .reverse()
      .join(".");

    section.append(
      el("strong", "", "Дата: " + label)
    );

    const records = dateEntries(selectedDate);

    renderRecords(section, records);
    renderCreateForm(section, records);

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
    renderEditor();
  }

  // ==========================================
  // REFRESH
  // ==========================================

  async function refresh() {
    root.textContent =
      "Загружаем рабочее время...";

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
          "Ошибка загрузки: " +
          (error.message || "Неизвестная ошибка")
        )
      );

      root.append(
        button("Повторить", refresh)
      );
    }
  }

  await refresh();
});
