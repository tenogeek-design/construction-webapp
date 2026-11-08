
"use strict";

/*
  CONSTRUCTION GROUP
  Календарь рабочего времени.

  Функции Supabase:
  - get_my_worker_projects
  - get_my_work_hours
  - submit_my_work_hours
  - update_my_work_hours

  Работник:
  - видит свои часы;
  - создаёт черновики;
  - редактирует свои черновики;
  - не изменяет ставки или подтверждения.
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

  if (!card) return;
  if (card.dataset.timeReady === "true") return;

  card.dataset.timeReady = "true";

  const oldDescription = card.querySelector("p");
  if (oldDescription) oldDescription.remove();

  const root = document.createElement("div");
  root.id = "cgTimeCalendar";
  card.appendChild(root);

  // ==========================================
  // STYLES
  // ==========================================

  const style = document.createElement("style");

  style.textContent = `
    #cgTimeCalendar {
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
      color: #eef2f7;
    }

    #cgTimeCalendar * {
      box-sizing: border-box;
    }

    .cgt-stats {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
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
      font-size: 11px;
      color: #a4b1c2;
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
      color: white;
      border: 1px solid #45566b;
      border-radius: 9px;
      padding: 9px 14px;
      cursor: pointer;
    }

    .cgt-month-title {
      font-size: 15px;
      font-weight: 700;
      text-align: center;
      text-transform: capitalize;
    }

    .cgt-calendar {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
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
      justify-content: center;
      align-items: center;
      gap: 4px;
      min-width: 0;
      min-height: 52px;
      background: #262f3a;
      border: 1px solid #3c4653;
      border-radius: 9px;
      color: #edf3fa;
      cursor: pointer;
      padding: 5px 1px;
    }

    .cgt-day:hover {
      background: #354456;
    }

    .cgt-day.active {
      border: 2px solid #659ff0;
      background: #294569;
    }

    .cgt-day.future {
      opacity: 0.5;
    }

    .cgt-day small {
      color: #b7c8dc;
      font-size: 10px;
    }

    .cgt-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      flex-shrink: 0;
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
      color: #d7e8fc;
    }

    .cgt-entry-info {
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
      min-width: 0;
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
      font-weight: 700;
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

    .cgt-button:disabled {
      cursor: not-allowed;
      opacity: .5;
    }

    .cgt-message {
      margin: 12px 0;
      font-size: 12px;
      line-height: 1.5;
      color: #9ce2bb;
    }

    .cgt-message.error {
      color: #ff9898;
    }

    .cgt-note {
      color: #a9b8c9;
      font-size: 12px;
      line-height: 1.5;
      margin: 10px 0;
    }

    @media (max-width: 480px) {
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
    }
  `;

  document.head.appendChild(style);

  // ==========================================
  // STATE
  // ==========================================

  const initialDate = new Date();

  let year = initialDate.getFullYear();
  let month = initialDate.getMonth();

  let selectedDate = formatDate(initialDate);

  let entries = [];
  let projects = [];

  let editingId = null;
  let busy = false;
  let notice = null;

  const statusNames = {
    draft: "Черновик",
    submitted: "На проверке",
    approved: "Подтверждено",
    rejected: "Отклонено"
  };

  const statusColors = {
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
    return entries.filter(
      entry =>
        entry.work_date === date &&
        entry.work_type === "hourly"
    );
  }

  function sumHours(list) {
    return list.reduce(
      (sum, entry) => sum + Number(entry.hours || 0),
      0
    );
  }

  function formatHours(number) {
    return Number(number.toFixed(2)).toString();
  }

  function projectName(projectId) {
    const project = projects.find(
      item => item.id === projectId
    );

    return project
      ? project.name
      : "Объект";
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

  function field(parent, title, control) {
    const wrapper = el("div", "cgt-field");
    const label = el("label", "", title);

    wrapper.append(label, control);
    parent.appendChild(wrapper);

    return wrapper;
  }

  function button(text, callback, secondary = false) {
    const btn = el(
      "button",
      secondary
        ? "cgt-button secondary"
        : "cgt-button",
      text
    );

    btn.type = "button";
    btn.addEventListener("click", callback);

    return btn;
  }

  function showNotice(text, error = false) {
    notice = { text, error };
    render();
  }

  // ==========================================
  // SUPABASE
  // ==========================================

  async function requireUser() {
    const { data, error } = await db.auth.getUser();

    if (error || !data?.user) {
      throw new Error("Войдите в аккаунт заново.");
    }

    return data.user;
  }

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
      (project, index, array) =>
        array.findIndex(
          item => item.id === project.id
        ) === index
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
  // STATISTICS
  // ==========================================

  function renderStats() {
    const active = entries.filter(
      entry =>
        entry.work_type === "hourly" &&
        entry.status !== "rejected"
    );

    const approved = active.filter(
      entry => entry.status === "approved"
    );

    const pending = active.filter(
      entry => entry.status !== "approved"
    );

    const wrapper = el("div", "cgt-stats");

    function stat(title, hours) {
      const box = el("div", "cgt-stat");

      box.append(
        el("small", "", title),
        el("strong", "", formatHours(hours) + " ч")
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
  // CALENDAR
  // ==========================================

  async function changeMonth(step) {
    if (busy) return;

    const date = new Date(year, month + step, 1);

    year = date.getFullYear();
    month = date.getMonth();
    selectedDate = formatDate(date);
    editingId = null;
    notice = null;

    await refresh();
  }

  function renderCalendar() {
    const navigation = el("div", "cgt-month");

    const previous = button("‹", () => changeMonth(-1));
    const next = button("›", () => changeMonth(1));

    previous.className = "cgt-arrow";
    next.className = "cgt-arrow";

    const heading = el(
      "div",
      "cgt-month-title",
      new Intl.DateTimeFormat("ru-RU", {
        month: "long",
        year: "numeric"
      }).format(new Date(year, month, 1))
    );

    navigation.append(previous, heading, next);
    root.appendChild(navigation);

    const grid = el("div", "cgt-calendar");

    for (const day of [
      "Пн", "Вт", "Ср", "Чт",
      "Пт", "Сб", "Вс"
    ]) {
      grid.appendChild(
        el("div", "cgt-weekday", day)
      );
    }

    const offset =
      (new Date(year, month, 1).getDay() + 6) % 7;

    const days =
      new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      grid.appendChild(el("div"));
    }

    for (let day = 1; day <= days; day++) {
      const date = formatDate(
        new Date(year, month, day)
      );

      const records = dateEntries(date);

      const dayButton = el("button", "cgt-day");

      dayButton.type = "button";
      dayButton.appendChild(
        el("span", "", String(day))
      );

      if (date === selectedDate) {
        dayButton.classList.add("active");
      }

      if (date > today()) {
        dayButton.classList.add("future");
      }

      if (records.length) {
        const hours = sumHours(
          records.filter(
            record => record.status !== "rejected"
          )
        );

        const status =
          records.some(
            record => record.status === "rejected"
          )
            ? "rejected"
            : records.every(
                record => record.status === "approved"
              )
              ? "approved"
              : records.some(
                  record => record.status === "submitted"
                )
                ? "submitted"
                : "draft";

        dayButton.appendChild(
          el("small", "", formatHours(hours) + "ч")
        );

        const dot = el("div", "cgt-dot");
        dot.style.background =
          statusColors[status];

        dayButton.appendChild(dot);
      }

      dayButton.addEventListener("click", () => {
        if (busy) return;

        selectedDate = date;
        editingId = null;
        notice = null;

        render();
      });

      grid.appendChild(dayButton);
    }

    root.appendChild(grid);

    const legend = el("div", "cgt-legend");

    for (const status of [
      "approved",
      "submitted",
      "draft",
      "rejected"
    ]) {
      const item = el("span", "cgt-legend-item");
      const dot = el("div", "cgt-dot");

      dot.style.background =
        statusColors[status];

      item.append(
        dot,
        el("span", "", statusNames[status])
      );

      legend.appendChild(item);
    }

    root.appendChild(legend);
  }

  // ==========================================
  // EDIT DRAFT
  // ==========================================

  function renderEditForm(section, entry) {
    const form = el("div", "cgt-entry");

    form.appendChild(
      el("strong", "", "Редактирование черновика")
    );

    form.appendChild(
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

    const message = el("p", "cgt-message");

    const save = button(
      "✓ Сохранить изменения",
      async () => {
        if (busy) return;

        if (!validHours(hours.value)) {
          message.textContent =
            "Введите от 0.01 до 24 часов.";
          message.classList.add("error");
          return;
        }

        busy = true;
        save.disabled = true;
        cancel.disabled = true;

        message.classList.remove("error");
        message.textContent =
          "Сохраняем изменения...";

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

          message.textContent =
            error.message ||
            "Ошибка сохранения изменений.";

          message.classList.add("error");

        } finally {
          busy = false;
          save.disabled = false;
          cancel.disabled = false;
        }
      }
    );

    const cancel = button(
      "Отмена",
      () => {
        editingId = null;
        render();
      },
      true
    );

    form.append(save, cancel, message);
    section.appendChild(form);
  }

  // ==========================================
  // EXISTING RECORDS
  // ==========================================

  function renderRecords(section, records) {
    if (!records.length) return;

    section.appendChild(
      el("p", "cgt-note", "Записи за выбранный день:")
    );

    for (const entry of records) {
      const box = el("div", "cgt-entry");

      const header = el("div", "cgt-entry-header");

      const status = el(
        "span",
        "cgt-status",
        statusNames[entry.status] || entry.status
      );

      status.style.color =
        statusColors[entry.status] || "#d7e8fc";

      header.append(
        el(
          "strong",
          "cgt-entry-hours",
          formatHours(Number(entry.hours)) + " ч"
        ),
        status
      );

      box.appendChild(header);

      box.appendChild(
        el(
          "p",
          "cgt-entry-info",
          projectName(entry.project_id)
        )
      );

      if (entry.description) {
        box.appendChild(
          el("p", "cgt-entry-info", entry.description)
        );
      }

      if (entry.status === "draft") {
        const edit = button(
          "✎ Редактировать",
          () => {
            editingId = entry.id;
            notice = null;
            render();
          },
          true
        );

        box.appendChild(edit);
      }

      section.appendChild(box);

      if (editingId === entry.id &&
          entry.status === "draft") {
        renderEditForm(section, entry);
      }
    }
  }

  // ==========================================
  // CREATE DAILY RECORD
  // ==========================================

  function renderCreateForm(section, existing) {
    if (editingId) return;

    const form = el("div");

    form.appendChild(
      el(
        "p",
        "cgt-note",
        "Добавить рабочие часы за выбранный день"
      )
    );

    const select = el("select");

    const placeholder = el(
      "option",
      "",
      "Выберите объект"
    );
    placeholder.value = "";
    select.appendChild(placeholder);

    for (const project of projects) {
      const option = el(
        "option",
        "",
        project.name
      );

      option.value = project.id;
      select.appendChild(option);
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
      "Сохранить рабочие часы",
      async () => {
        if (busy) return;

        if (!validHours(hours.value)) {
          message.textContent =
            "Введите от 0.01 до 24 часов.";
          message.classList.add("error");
          return;
        }

        busy = true;
        save.disabled = true;

        message.classList.remove("error");
        message.textContent =
          "Сохраняем рабочие часы...";

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

          notice = {
            text: "✓ Рабочие часы успешно сохранены!",
            error: false
          };

          await refresh();

        } catch (error) {
          console.error("Create work hours:", error);

          message.textContent =
            error.message ||
            "Ошибка сохранения часов.";

          message.classList.add("error");

        } finally {
          busy = false;
          save.disabled = false;
        }
      }
    );

    function updateAvailability() {
      const duplicate = existing.some(
        entry =>
          entry.project_id === select.value &&
          entry.status !== "rejected"
      );

      const future = selectedDate > today();

      const disabled =
        busy ||
        future ||
        duplicate ||
        !select.value;

      save.disabled = disabled;
      hours.disabled = disabled;
      description.disabled = disabled;

      if (future) {
        message.textContent =
          "Будущие дни пока нельзя заполнять.";
      } else if (duplicate) {
        message.textContent =
          "Запись за этот день уже существует. " +
          "Используйте кнопку «Редактировать».";
      } else {
        message.textContent = "";
      }
    }

    select.addEventListener(
      "change",
      updateAvailability
    );

    form.append(save, message);
    section.appendChild(form);

    updateAvailability();
  }

  // ==========================================
  // SELECTED DATE
  // ==========================================

  function renderEditor() {
    const section = el("section", "cgt-editor");

    const dateLabel = selectedDate
      .split("-")
      .reverse()
      .join(".");

    section.appendChild(
      el("strong", "", "Дата: " + dateLabel)
    );

    const records = dateEntries(selectedDate);

    renderRecords(section, records);
    renderCreateForm(section, records);

    if (!projects.length) {
      section.appendChild(
        el(
          "p",
          "cgt-note",
          "Нет доступных объектов. Обратитесь к прорабу."
        )
      );
    }

    root.appendChild(section);
  }

  // ==========================================
  // RENDER
  // ==========================================

  function render() {
    root.replaceChildren();

    if (notice) {
      const msg = el(
        "div",
        notice.error
          ? "cgt-message error"
          : "cgt-message",
        notice.text
      );

      root.appendChild(msg);
    }

    renderStats();
    renderCalendar();
    renderEditor();
  }

  // ==========================================
  // REFRESH
  // ==========================================

  async function refresh() {
    root.textContent = "Загружаем рабочее время...";

    try {
      await requireUser();

      await Promise.all([
        loadProjects(),
        loadEntries()
      ]);

      render();

    } catch (error) {
      console.error("Worker time calendar:", error);

      root.replaceChildren();

      root.appendChild(
        el(
          "p",
          "cgt-message error",
          "Ошибка загрузки: " +
          (error.message || "Неизвестная ошибка")
        )
      );

      root.appendChild(
        button("Повторить", refresh)
      );
    }
  }

  await refresh();
});
