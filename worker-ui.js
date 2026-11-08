
"use strict";

/*
 CONSTRUCTION GROUP
 Компактный кабинет работника.
 Не изменяет данные Supabase.
*/

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector("#workerContent");
  const cards = root?.querySelector(".cards");

  if (!root || !cards) {
    console.warn("Worker UI: карточки не найдены");
    return;
  }

  if (root.dataset.cgUiReady === "true") return;
  root.dataset.cgUiReady = "true";

  const sections = Array.from(cards.children)
    .filter(el => el.classList.contains("card"))
    .slice(0, 4);

  if (sections.length !== 4) {
    console.warn("Worker UI: ожидались 4 карточки");
    return;
  }

  const [projects, tasks, time, salary] = sections;

  // ==========================================
  // СТИЛИ
  // ==========================================

  const style = document.createElement("style");

  style.textContent = `
    #workerContent {
      max-width: 1040px;
      margin-left: auto;
      margin-right: auto;
      padding-left: 14px;
      padding-right: 14px;
      padding-bottom: 90px;
    }

    #workerContent .cg-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 22px 0 16px;
    }

    #workerContent .cg-nav-button {
      border: 1px solid #414a56;
      border-radius: 10px;
      background: #292f38;
      color: #c8d2df;
      padding: 11px 15px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    #workerContent .cg-nav-button:hover {
      background: #364459;
    }

    #workerContent .cg-nav-button.active {
      background: #315f9b;
      border-color: #578ee0;
      color: white;
    }

    #workerContent .cg-grid {
      display: grid !important;
      grid-template-columns:
        minmax(0, 1fr) minmax(0, 1fr) !important;
      gap: 16px !important;
      align-items: start;
      margin-top: 0 !important;
    }

    #workerContent .cg-grid > .card {
      min-width: 0;
      min-height: 0 !important;
      height: auto !important;
      grid-column: auto !important;
      background: #292f38;
      border: 1px solid #3d4652;
      border-radius: 14px;
      padding: 18px !important;
      box-shadow: none;
      overflow-wrap: anywhere;
    }

    #workerContent .cg-grid > .card[hidden] {
      display: none !important;
    }

    #workerContent .cg-grid.cg-single {
      grid-template-columns: minmax(0, 1fr) !important;
    }

    #workerContent .cg-grid .card h3 {
      margin-top: 0;
      margin-bottom: 12px;
      font-size: 17px;
    }

    #workerContent .cg-grid .card p {
      line-height: 1.55;
    }

    #workerContent .worker-task {
      padding: 12px 0;
      margin-top: 8px;
    }

    #workerContent .worker-task-name {
      font-size: 15px;
      margin-bottom: 10px;
    }

    #workerContent .cg-task-toggle {
      width: 100%;
      text-align: left;
      margin: 10px 0 0;
      padding: 11px 12px;
      border: 1px solid #43658a;
      border-radius: 9px;
      background: #30445e;
      color: #e3efff;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    #workerContent .cg-task-toggle:hover {
      background: #3a5679;
    }

    #workerContent .cg-task-body {
      padding-top: 12px;
    }

    #workerContent .cg-task-body[hidden] {
      display: none !important;
    }

    #workerContent .worker-task-button {
      width: 100%;
      max-width: 340px;
      margin-top: 10px;
      border-radius: 9px;
    }

    #workerContent .worker-task-slider {
      display: block;
      width: 100%;
      max-width: 400px;
    }

    #workerContent .cg-grid .card input[type=file] {
      max-width: 100%;
    }

    @media (max-width: 700px) {
      #workerContent {
        padding-left: 12px;
        padding-right: 12px;
        padding-bottom: 105px;
      }

      #workerContent .cg-nav {
        position: fixed;
        z-index: 1000;
        bottom: 0;
        left: 0;
        right: 0;
        margin: 0;
        padding: 10px 8px max(10px, env(safe-area-inset-bottom));
        background: #20262f;
        border-top: 1px solid #404955;
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 4px;
      }

      #workerContent .cg-nav-button {
        min-width: 0;
        border: 0;
        padding: 10px 2px;
        font-size: 10px;
        border-radius: 8px;
        line-height: 1.4;
      }

      #workerContent .cg-grid {
        grid-template-columns: minmax(0, 1fr) !important;
        gap: 12px !important;
      }

      #workerContent .cg-grid > .card {
        grid-column: 1 / -1 !important;
        padding: 15px !important;
      }

      #workerContent .worker-task-button,
      #workerContent .worker-task-slider {
        max-width: 100%;
      }
    }
  `;

  document.head.appendChild(style);
  cards.classList.add("cg-grid");

  // ==========================================
  // НАВИГАЦИЯ
  // ==========================================

  const navigation = document.createElement("nav");
  navigation.className = "cg-nav";
  navigation.setAttribute(
    "aria-label",
    "Разделы кабинета работника"
  );

  const items = [
    { id: "home", text: "⌂ Главная" },
    { id: "projects", text: "▤ Объекты" },
    { id: "tasks", text: "☑ Задания" },
    { id: "time", text: "◷ Время" },
    { id: "salary", text: "₽ Зарплата" }
  ];

  const buttons = new Map();

  function navigate(tab) {
    const validTabs = items.map(item => item.id);

    if (!validTabs.includes(tab)) {
      tab = "home";
    }

    projects.hidden =
      tab !== "home" && tab !== "projects";

    tasks.hidden =
      tab !== "home" && tab !== "tasks";

    time.hidden = tab !== "time";
    salary.hidden = tab !== "salary";

    cards.classList.toggle(
      "cg-single",
      tab !== "home"
    );

    for (const [id, button] of buttons) {
      const active = id === tab;

      button.classList.toggle("active", active);

      button.setAttribute(
        "aria-current",
        active ? "page" : "false"
      );
    }

    // На главной подробности задания скрываем.
    // Во вкладке заданий можно раскрыть их вручную.
    if (tab === "home") {
      collapseAllTasks();
    }

    root.dataset.cgTab = tab;
  }

  for (const item of items) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "cg-nav-button";
    button.textContent = item.text;

    button.addEventListener("click", () => {
      navigate(item.id);
    });

    navigation.appendChild(button);
    buttons.set(item.id, button);
  }

  cards.parentNode.insertBefore(
    navigation,
    cards
  );

  // ==========================================
  // РАСКРЫВАЮЩИЕСЯ ЗАДАНИЯ
  // ==========================================

  function collapseAllTasks() {
    tasks.querySelectorAll(
      ".cg-task-body"
    ).forEach(body => {
      body.hidden = true;

      const toggle = body.parentElement.querySelector(
        ".cg-task-toggle"
      );

      if (toggle) {
        toggle.textContent = "Открыть задание";
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  function decorateTasks() {
    const taskItems = tasks.querySelectorAll(
      ".worker-task"
    );

    taskItems.forEach(item => {
      if (item.dataset.cgDecorated === "true") {
        return;
      }

      const name = item.querySelector(
        ".worker-task-name"
      );

      if (!name) return;

      item.dataset.cgDecorated = "true";

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "cg-task-toggle";
      toggle.textContent = "Открыть задание";
      toggle.setAttribute("aria-expanded", "false");

      const body = document.createElement("div");
      body.className = "cg-task-body";
      body.hidden = true;

      // Оставляем название на карточке,
      // все действия перемещаем внутрь.
      const children = Array.from(item.children);

      children.forEach(child => {
        if (child !== name) {
          body.appendChild(child);
        }
      });

      item.appendChild(toggle);
      item.appendChild(body);

      toggle.addEventListener("click", () => {
        const expanded = !body.hidden;

        body.hidden = expanded;

        toggle.textContent = expanded
          ? "Открыть задание"
          : "Скрыть детали";

        toggle.setAttribute(
          "aria-expanded",
          expanded ? "false" : "true"
        );
      });
    });
  }

  // Задания приходят из Supabase асинхронно.
  // Поэтому оформляем и уже загруженные,
  // и новые элементы после загрузки.
  const observer = new MutationObserver(() => {
    decorateTasks();
  });

  observer.observe(tasks, {
    childList: true,
    subtree: true
  });

  decorateTasks();

  // ==========================================
  // СТАРТОВЫЙ ЭКРАН
  // ==========================================

  navigate("home");

  console.log(
    "CONSTRUCTION GROUP: компактный кабинет активен"
  );
});
