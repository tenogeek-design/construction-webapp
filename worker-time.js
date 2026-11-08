
"use strict";

/*
  CONSTRUCTION GROUP
  Календарь рабочего времени работника.

  Данные: Supabase
  Создание: submit_my_work_hours RPC
  Просмотр: payroll_work_entries RLS
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

  const oldDescription = card.querySelector("p");
  if (oldDescription) oldDescription.remove();

  const root = document.createElement("div");
  root.id = "cgTimeCalendar";
  card.appendChild(root);

  const styles = document.createElement("style");
  styles.textContent = `
    #cgTimeCalendar {
      max-width: 680px;
      margin: 0 auto;
      color: #e9edf4;
    }
    #cgTimeCalendar * { box-sizing: border-box; }
    .cgt-stats {
      display: grid;
      grid-template-columns: repeat(3,minmax(0,1fr));
      gap: 8px;
      margin: 15px 0;
    }
    .cgt-stat {
      background: #222a35;
      border: 1px solid #3c4653;
      border-radius: 10px;
      padding: 12px;
    }
    .cgt-stat small {
      display: block;
      color: #9daabd;
      font-size: 11px;
      margin-bottom: 7px;
    }
    .cgt-stat strong { font-size: 21px; }
    .cgt-month {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 17px 0 12px;
    }
    .cgt-arrow {
      background: #313e50;
      color: #eef4ff;
      border: 1px solid #45566b;
      border-radius: 8px;
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
      grid-template-columns: repeat(7,minmax(0,1fr));
      gap: 5px;
    }
    .cgt-weekday {
      text-align: center;
      font-size: 11px;
      color: #9daabd;
      padding: 9px 0;
    }
    .cgt-day {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      min-width: 0;
      min-height: 53px;
      padding: 5px 2px;
      border: 1px solid #3c4653;
      border-radius: 9px;
      background: #262f3a;
      color: #e9edf4;
      cursor: pointer;
    }
    .cgt-day:hover { background: #334456; }
    .cgt-day.active {
      border: 2px solid #659ff0;
      background: #294569;
    }
    .cgt-day.today {
      box-shadow: inset 0 0 0 1px #6587ab;
    }
    .cgt-day.future { opacity: 0.48; }
    .cgt-day small {
      font-size: 10px;
      color: #b8c8db;
    }
    .cgt-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }
    .cgt-legend {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin: 13px 0;
      color: #aab7c7;
      font-size: 11px;
    }
    .cgt-legend span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .cgt-editor {
      border-top: 1px solid #424d5a;
      margin-top: 18px;
      padding-top: 18px;
    }
    .cgt-field {
      display: block;
      margin: 12px 0;
    }
    .cgt-field label {
      display: block;
      color: #bdc8d7;
      font-size: 12px;
      margin-bottom: 7px;
    }
    .cgt-field select,
    .cgt-field input,
    .cgt-field textarea {
      display: block;
      width: 100%;
      background: #1e2630;
      color: #ffffff;
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
    .cgt-field :disabled { opacity: 0.65; }
    .cgt-save {
      background: #3d82df;
      color: #ffffff;
      border: 0;
      border-radius: 9px;
      padding: 12px 18px;
      width: 100%;
      font-weight: 700;
      cursor: pointer;
      margin-top: 8px;
    }
    .cgt-save:hover { background: #5594e9; }
    .cgt-save:disabled {
      opacity: .5;
      cursor: not-allowed;
    }
    .cgt-note {
      color: #aab7c7;
      font-size: 12px;
      line-height: 1.5;
      margin: 10px 0;
    }
    .cgt-message {
      font-size: 13px;
      margin-top: 12px;
      line-height: 1.5;
      color: #9ce2bb;
    }
    @media(max-width:480px) {
      .cgt-stat { padding: 9px; }
      .cgt-stat strong { font-size: 17px; }
      .cgt-day { min-height: 44px; }
      .cgt-calendar { gap: 3px; }
      .cgt-month-title { font-size: 13px; }
    }
  `;
  document.head.appendChild(styles);

  const now = new Date();

  let year = now.getFullYear();
  let month = now.getMonth();
  let selectedDate = formatDate(now);
  let entries = [];
  let projects = [];
  let saving = false;

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

  function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function localToday() {
    return formatDate(new Date());
  }

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function dateEntries(date) {
    return entries.filter(
      entry =>
        entry.work_date === date &&
        entry.work_type === "hourly"
    );
  }

  function sumHours(items) {
    return items.reduce(
      (total, entry) => total + Number(entry.hours || 0),
      0
    );
  }

  function monthKey() {
    return (
      year + "-" +
      String(month + 1).padStart(2, "0")
    );
  }

  async function loadProjects() {
    const { data, error } = await db.rpc(
      "get_my_worker_projects"
    );
    if (error) throw error;

    projects = (Array.isArray(data) ? data : [])
      .map(project => ({
        id: project.project_id || project.id,
        name:
          project.project_name ||
          project.name ||
          "Без названия"
      }))
      .filter(project => project.id);

    // Убираем повторяющиеся объекты
    projects = projects.filter(
      (p, index, array) =>
        array.findIndex(item => item.id === p.id) === index
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

  if (error) {
    console.error(
      "Ошибка загрузки часов:",
      error
    );
    throw error;
  }

  entries = Array.isArray(data) ? data : [];

  console.log(
    "CONSTRUCTION GROUP — часы за месяц:",
    entries
  );
}


  function stat(label, value) {
    const box = el("div", "cgt-stat");
    box.append(
      el("small", "", label),
      el("strong", "", value)
    );
    return box;
  }

  function renderStats() {
    const all = entries.filter(
      entry =>
        entry.status !== "rejected" &&
        entry.work_type === "hourly"
    );

    const approved = all.filter(
      entry => entry.status === "approved"
    );

    const pending = all.filter(
      entry => entry.status !== "approved"
    );

    const wrapper = el("div", "cgt-stats");

    wrapper.append(
      stat("За месяц", sumHours(all) + " ч"),
      stat("Подтверждено", sumHours(approved) + " ч"),
      stat("Ожидают", sumHours(pending) + " ч")
    );

    root.appendChild(wrapper);
  }

  function moveMonth(step) {
    const date = new Date(year, month + step, 1);
    year = date.getFullYear();
    month = date.getMonth();
    selectedDate = formatDate(date);
    refresh();
  }

  function renderCalendar() {
    const navigation = el("div", "cgt-month");

    const previous = el("button", "cgt-arrow", "‹");
    previous.type = "button";
    previous.onclick = () => moveMonth(-1);

    const next = el("button", "cgt-arrow", "›");
    next.type = "button";
    next.onclick = () => moveMonth(1);

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

    for (const name of [
      "Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"
    ]) {
      grid.appendChild(el("div", "cgt-weekday", name));
    }

    const firstDay = new Date(year, month, 1);
    const offset = (firstDay.getDay() + 6) % 7;
    const days = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      grid.appendChild(el("div"));
    }

    for (let day = 1; day <= days; day++) {
      const date = formatDate(new Date(year, month, day));
      const dayEntries = dateEntries(date);

      const button = el("button", "cgt-day");
      button.type = "button";
      button.appendChild(el("span", "", String(day)));

      if (date === selectedDate) {
        button.classList.add("active");
      }

      if (date === localToday()) {
        button.classList.add("today");
      }

      if (date > localToday()) {
        button.classList.add("future");
      }

      if (dayEntries.length) {
        const total = sumHours(dayEntries);
        const status =
          dayEntries.some(e => e.status === "rejected")
            ? "rejected"
            : dayEntries.every(e => e.status === "approved")
              ? "approved"
              : dayEntries.some(e => e.status === "submitted")
                ? "submitted"
                : "draft";

        button.appendChild(
          el("small", "", total + "ч")
        );

        const dot = el("div", "cgt-dot");
        dot.style.background =
          statusColors[status] || "#659ff0";

        button.appendChild(dot);
      }

      button.onclick = () => {
        selectedDate = date;
        render();
      };

      grid.appendChild(button);
    }

    root.appendChild(grid);

    const legend = el("div", "cgt-legend");

    for (const [status, name] of Object.entries({
      approved: "Подтверждено",
      submitted: "На проверке",
      draft: "Черновик",
      rejected: "Отклонено"
    })) {
      const item = el("span");
      const dot = el("div", "cgt-dot");
      dot.style.background = statusColors[status];

      item.append(dot, el("span", "", name));
      legend.appendChild(item);
    }

    root.appendChild(legend);
  }

  function field(parent, title, control) {
    const wrapper = el("div", "cgt-field");
    const label = el("label", "", title);
    wrapper.append(label, control);
    parent.appendChild(wrapper);
    return wrapper;
  }

  function renderEditor() {
    const section = el("section", "cgt-editor");

    const dateLabel = selectedDate
      .split("-")
      .reverse()
      .join(".");

    section.append(
      el("strong", "", "Дата: " + dateLabel)
    );

    const existing = dateEntries(selectedDate);

    if (existing.length) {
      section.append(
        el(
          "p",
          "cgt-note",
          "Записи за выбранный день:"
        )
      );

      for (const entry of existing) {
        const project = projects.find(
          p => p.id === entry.project_id
        );

        const line = el("div", "cgt-stat");
        line.style.marginTop = "9px";

        line.append(
          el(
            "strong",
            "",
            Number(entry.hours) + " ч"
          ),
          el(
            "p",
            "cgt-note",
            (project?.name || "Объект") +
            " · " +
            (statusNames[entry.status] || entry.status)
          )
        );

        if (entry.description) {
          line.append(
            el("p", "cgt-note", entry.description)
          );
        }

        section.appendChild(line);
      }
    }

    const select = el("select");
    const emptyOption = el(
      "option",
      "",
      "Выберите объект"
    );
    emptyOption.value = "";
    select.appendChild(emptyOption);

    for (const project of projects) {
      const option = el(
        "option",
        "",
        project.name
      );

      option.value = project.id;
      select.appendChild(option);
    }

    field(section, "Объект", select);

    const hours = el("input");
    hours.type = "number";
    hours.min = "0.01";
    hours.max = "24";
    hours.step = "0.25";
    hours.placeholder = "Например: 10";
    field(section, "Отработанные часы", hours);

    const description = el("textarea");
    description.maxLength = 500;
    description.placeholder =
      "Что делали на объекте?";
    field(section, "Примечание", description);

    const save = el(
      "button",
      "cgt-save",
      "Сохранить рабочие часы"
    );
    save.type = "button";

    const message = el("p", "cgt-message");

    section.append(save, message);
    root.appendChild(section);

    function updateFormAvailability() {
      const duplicate = existing.some(
        entry =>
          entry.project_id === select.value &&
          entry.status !== "rejected"
      );

      const future = selectedDate > localToday();

      hours.disabled = duplicate || future;
      description.disabled = duplicate || future;

      save.disabled =
        saving ||
        duplicate ||
        future ||
        !select.value;

      if (future) {
        message.textContent =
          "Будущие дни пока нельзя заполнять.";
      } else if (duplicate) {
        message.textContent =
          "На этом объекте за выбранную дату уже есть запись. " +
          "Чтобы исправить часы, понадобится отдельная функция редактирования.";
      } else {
        message.textContent = "";
      }
    }

    select.addEventListener(
      "change",
      updateFormAvailability
    );

    updateFormAvailability();

    save.addEventListener("click", async () => {
      if (saving || save.disabled) return;

      const value = Number(hours.value);

      if (
        !hours.value ||
        !Number.isFinite(value) ||
        value <= 0 ||
        value > 24 ||
        Math.round(value * 100) !== value * 100
      ) {
        message.textContent =
          "Введите корректное количество часов от 0.01 до 24.";
        message.style.color = "#ff9696";
        return;
      }

      saving = true;
      save.disabled = true;

      message.style.color = "#9ce2bb";
      message.textContent = "Сохраняем запись...";

      try {
        const { data: auth, error: authError } =
          await db.auth.getUser();

        if (authError || !auth?.user) {
          throw new Error("Войдите в аккаунт заново.");
        }

        const { error } = await db.rpc(
          "submit_my_work_hours",
          {
            p_project_id: select.value,
            p_work_date: selectedDate,
            p_hours: value,
            p_description:
              description.value.trim() || null
          }
        );

        if (error) throw error;

        await refresh();

const success = document.createElement("p");
success.className = "cgt-message";
success.textContent = "✓ Рабочие часы успешно сохранены!";
success.style.color = "#9ce2bb";
root.prepend(success);

      } catch (error) {
        console.error("Timekeeping error:", error);

        message.style.color = "#ff9696";
        message.textContent =
          error.message || "Ошибка сохранения.";

      } finally {
        saving = false;
        save.disabled = false;
        updateFormAvailability();
      }
    });
  }

  function render() {
    root.replaceChildren();
    renderStats();
    renderCalendar();
    renderEditor();
  }

  async function refresh() {
    root.textContent = "Загружаем рабочее время...";

    try {
      const { data: auth, error: authError } =
        await db.auth.getUser();

      if (authError || !auth?.user) {
        throw new Error("Войдите в аккаунт.");
      }

      await Promise.all([
        loadProjects(),
        loadEntries()
      ]);

      render();

      if (!projects.length) {
        root.appendChild(
          el(
            "p",
            "cgt-note",
            "Нет доступных объектов. Обратитесь к прорабу."
          )
        );
      }

    } catch (error) {
      console.error("Worker calendar:", error);

      root.replaceChildren();

      const text = el(
        "p",
        "cgt-message",
        "Ошибка: " + error.message
      );
      text.style.color = "#ff9696";

      root.appendChild(text);

      const retry = el(
        "button",
        "cgt-save",
        "Повторить загрузку"
      );
      retry.onclick = refresh;
      root.appendChild(retry);
    }
  }

  await refresh();
});
