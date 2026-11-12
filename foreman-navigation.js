
"use strict";

/*
  CONSTRUCTION GROUP
  FOREMAN CONTROL CENTER

  Карточный кабинет и меню.
  Существующие финансовые и рабочие модули
  остаются на своих местах.

  Новых финансовых операций этот файл не создаёт.
*/

document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("cgControlCenter")) return;

  const main = document.querySelector("body > main");
  if (!main) return;

  const sections = [...main.querySelectorAll(":scope > section.card")];

  const byTitle = text => sections.find(section =>
    (section.querySelector("h2")?.textContent || "")
      .trim()
      .startsWith(text)
  );

  const cash = byTitle("Моя касса");
  const history = byTitle("История операций");
  const payroll = document.getElementById("foremanPayrollSection");
  const expenses = byTitle("Расходы и чеки");
  const tasks = document.getElementById("foremanTasksSection");
  const projects = document.getElementById("cgForemanProjects");

  const photoPanel = document
    .getElementById("foremanPhotoTask")
    ?.closest(".expense-form-container");

  const modules = [
    cash, history, payroll, expenses, tasks, projects
  ].filter(Boolean);

  const menu = [
    {id:"home",icon:"⌂",label:"Главная",description:"Сегодня и быстрые действия"},
    {id:"projects",icon:"▣",label:"Объекты",description:"Объекты, этапы и позиции"},
    {id:"reports",icon:"▤",label:"Рабочие дни",description:"Отчёты, фото и запросы OWNER"},
    {id:"workers",icon:"♙",label:"Бригада",description:"Сотрудники на объектах"},
    {id:"time",icon:"◷",label:"Табели",description:"Часы работников и проверка"},
    {id:"tasks",icon:"☑",label:"Задачи и фото",description:"Задания и фотографии"},
    {id:"finance",icon:"₴",label:"Касса и зарплаты",description:"Баланс, выплаты и история"},
    {id:"expenses",icon:"▧",label:"Расходы и чеки",description:"Покупки, чеки, согласования"}
  ];

  const style = document.createElement("style");

  style.textContent = `
    :root {
      --cg-bg: #171d25;
      --cg-panel: #232d39;
      --cg-panel2: #2c3948;
      --cg-border: #3c4b60;
      --cg-blue: #3c77bd;
      --cg-text: #f0f5fb;
      --cg-muted: #a3b4c9;
    }

    body {
      background: var(--cg-bg);
      color: var(--cg-text);
    }

    body > header {
      background: #202a36;
      border-bottom: 1px solid var(--cg-border);
    }

    body > header .brand {
      color: #e8f1ff;
      letter-spacing: 1px;
    }

    body > main {
      max-width: none;
      margin: 0;
      padding: 0;
    }

    body > main > h1,
    body > main > p.muted {
      display: none;
    }

    #cgControlCenter {
      display: grid;
      grid-template-columns: 238px minmax(0, 1fr);
      min-height: calc(100vh - 90px);
      font-family: Arial, sans-serif;
    }

    #cgControlCenter * {
      box-sizing: border-box;
    }

    .cg-sidebar {
      padding: 24px 14px;
      border-right: 1px solid var(--cg-border);
      background: #1c2530;
    }

    .cg-side-title {
      font-size: 11px;
      color: #8ea3bd;
      letter-spacing: 1.4px;
      padding: 10px 12px 18px;
    }

    .cg-menu-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 12px;
      text-align: left;
      background: transparent;
      color: #b4c5d9;
      border: 1px solid transparent;
      padding: 13px 12px;
      margin-bottom: 6px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .cg-menu-button:hover {
      background: #29394b;
      color: white;
    }

    .cg-menu-button.active {
      background: #29496d;
      border-color: #497cad;
      color: #fff;
    }

    .cg-menu-icon {
      font-size: 19px;
      width: 23px;
      display: inline-block;
      text-align: center;
      color: #8dbdff;
    }

    .cg-main {
      padding: 30px;
      min-width: 0;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }

    .cg-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 24px;
    }

    .cg-page-title {
      font-size: 26px;
      margin: 0 0 8px;
      color: #fff;
    }

    .cg-page-description {
      font-size: 13px;
      color: var(--cg-muted);
      margin: 0;
    }

    .cg-refresh {
      background: #345f93;
      color: white;
      border: 1px solid #527eb3;
      border-radius: 9px;
      padding: 10px 14px;
      cursor: pointer;
    }

    .cg-dashboard {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .cg-dashboard-card {
      text-align: left;
      background: var(--cg-panel);
      border: 1px solid var(--cg-border);
      border-radius: 13px;
      padding: 19px;
      min-width: 0;
      color: white;
      cursor: pointer;
      transition: background .2s, border-color .2s;
    }

    .cg-dashboard-card:hover {
      background: #2e4055;
      border-color: #5f89bb;
    }

    .cg-dashboard-icon {
      display: block;
      font-size: 26px;
      color: #8bbcff;
      margin-bottom: 17px;
    }

    .cg-dashboard-name {
      display: block;
      font-size: 16px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .cg-dashboard-description {
      color: var(--cg-muted);
      display: block;
      line-height: 1.5;
      font-size: 12px;
    }

    .cg-module {
      min-width: 0;
    }

    .cg-module > .card,
    .cg-module .card {
      background: var(--cg-panel);
      border-color: var(--cg-border);
    }

    .cg-module .card h2 {
      color: #f0f5fc;
    }

    .cg-module .balance,
    .cg-module .payroll-metric strong {
      color: #91c1ff;
    }

    .cg-module button:not(.secondary-button) {
      background: #366fae;
      color: #fff;
    }

    .cg-module button:disabled {
      opacity: .5;
    }

    .cg-module .form-field input,
    .cg-module .form-field select,
    .cg-module .form-field textarea {
      background: #202b38;
      border-color: #45576e;
      color: #fff;
    }

    .cg-module .payroll-item,
    .cg-module .payroll-metric,
    .cg-module .foreman-task-item {
      background: #202b38;
      border-color: var(--cg-border);
    }

    .cg-module .foreman-task-item h3 {
      color: #8bbcff;
    }

    .cg-empty {
      padding: 22px;
      background: var(--cg-panel);
      border: 1px solid var(--cg-border);
      border-radius: 12px;
      color: var(--cg-muted);
      line-height: 1.7;
    }

    .cg-mobile-menu {
      display: none;
    }

    .cg-home-note {
      grid-column: 1 / -1;
      background: #243a54;
      border: 1px solid #3c638e;
      border-radius: 12px;
      padding: 17px;
      color: #c9def7;
      line-height: 1.6;
      font-size: 13px;
    }

    [hidden] {
      display: none !important;
    }

    @media (max-width: 1000px) {
      .cg-dashboard {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .cg-main {
        padding: 22px;
      }
    }

    @media (max-width: 720px) {
      #cgControlCenter {
        display: block;
      }

      .cg-sidebar {
        display: none;
      }

      .cg-mobile-menu {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7px;
        margin-bottom: 22px;
      }

      .cg-mobile-menu .cg-menu-button {
        justify-content: center;
        padding: 10px 4px;
        gap: 5px;
        flex-direction: column;
        background: #273443;
        font-size: 11px;
        min-height: 67px;
      }

      .cg-mobile-menu .cg-menu-button.active {
        background: #29496d;
      }

      .cg-main {
        padding: 16px 12px 55px;
      }

      .cg-dashboard {
        gap: 9px;
      }

      .cg-dashboard-card {
        padding: 14px;
      }

      .cg-dashboard-icon {
        font-size: 22px;
        margin-bottom: 11px;
      }

      .cg-dashboard-name {
        font-size: 14px;
      }

      .cg-page-title {
        font-size: 21px;
      }

      .cg-top {
        align-items: flex-start;
      }
    }
  `;

  document.head.appendChild(style);
  const premium = document.createElement("link");
  premium.rel = "stylesheet";
  premium.href = "/foreman-premium.css?v=2";
  document.head.appendChild(premium);

  // ==================================
  // CREATE LAYOUT
  // ==================================

  const shell = document.createElement("div");
  shell.id = "cgControlCenter";

  const sidebar = document.createElement("aside");
  sidebar.className = "cg-sidebar";

  const sideTitle = document.createElement("div");
  sideTitle.className = "cg-side-title";
  sideTitle.innerHTML = '<span class="cg-brand-mark">C</span><span><b>CONSTRUCTION</b><small>GROUP · FOREMAN</small></span>';

  sidebar.appendChild(sideTitle);

  const content = document.createElement("div");
  content.className = "cg-main";

  const mobileMenu = document.createElement("nav");
  mobileMenu.className = "cg-mobile-menu";
  mobileMenu.setAttribute("aria-label", "Меню кабинета");

  const top = document.createElement("div");
  top.className = "cg-top";

  const titles = document.createElement("div");

  const pageTitle = document.createElement("h1");
  pageTitle.className = "cg-page-title";

  const pageDescription = document.createElement("p");
  pageDescription.className = "cg-page-description";

  titles.append(pageTitle, pageDescription);

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "cg-refresh";
  refresh.textContent = "↻ Обновить";

  top.append(titles, refresh);

  const workspace = document.createElement("div");
  workspace.className = "cg-module";
  const context = document.createElement("div");
  context.className = "cg-context";
  context.hidden = true;

  content.append(mobileMenu, top, context, workspace);
  shell.append(sidebar, content);

  main.prepend(shell);

  const home = document.createElement("div");
  home.className = "cg-dashboard";

  function makeMenuButton(item) {
    const btn = document.createElement("button");

    btn.type = "button";
    btn.className = "cg-menu-button";
    btn.dataset.page = item.id;

    const icon = document.createElement("span");
    icon.className = "cg-menu-icon";
    icon.textContent = item.icon;

    const name = document.createElement("span");
    name.textContent = item.label;

    btn.append(icon, name);

    btn.addEventListener("click", () => {
      openPage(item.id);
    });

    return btn;
  }

  for (const item of menu) {
    sidebar.append(makeMenuButton(item));
    mobileMenu.append(makeMenuButton(item));
  }

  function makeDashboardCard(item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cg-dashboard-card";

    const icon = document.createElement("span");
    icon.className = "cg-dashboard-icon";
    icon.textContent = item.icon;

    const name = document.createElement("span");
    name.className = "cg-dashboard-name";
    name.textContent = item.label;

    const description = document.createElement("span");
    description.className = "cg-dashboard-description";
    description.textContent = item.description;

    btn.append(icon, name, description);

    btn.addEventListener("click", () => openPage(item.id));

    return btn;
  }

  const hero = document.createElement("section");
  hero.className = "cg-hero";
  hero.innerHTML = '<div class="cg-hero-content"><div class="cg-eyebrow">CONSTRUCTION GROUP · WORKSPACE</div>'+
    '<h2>Рабочий день под контролем.</h2>'+
    '<p>Объекты, отчёты, команда и деньги — в одном кабинете.</p>'+
    '<div class="cg-hero-actions"><button type="button" data-go="reports" class="cg-primary-action">+ Отчёт за сегодня</button>'+
    '<button type="button" data-go="projects" class="cg-secondary-action">Мои объекты</button></div></div>';
  home.append(hero);
  const metrics=document.createElement("div");
  metrics.className="cg-home-metrics";
  metrics.innerHTML='<div><span>Назначено объектов</span><strong id="cgMetricObjects">—</strong></div>'+
    '<div><span>В работе</span><strong id="cgMetricActive">—</strong></div>'+
    '<div><span>Ожидают старта</span><strong id="cgMetricPlanned">—</strong></div>';
  home.append(metrics);
  async function loadHomeMetrics(){
    try{
      if(!window.supabase)return;
      const db=window.supabase.createClient("https://yepxskcfxyiyqqhmdpve.supabase.co",
        "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH");
      const {data:{session}}=await db.auth.getSession();
      if(!session?.access_token)return;
      const response=await fetch("/api/project-workspace",{headers:{Authorization:"Bearer "+session.access_token}});
      if(!response.ok)return;
      const result=await response.json();
      const items=Array.isArray(result.items)?result.items:[];
      metrics.querySelector("#cgMetricObjects").textContent=String(items.length);
      metrics.querySelector("#cgMetricActive").textContent=String(items.filter(x=>x.status==="active").length);
      metrics.querySelector("#cgMetricPlanned").textContent=String(items.filter(x=>x.status==="planned").length);
    }catch(error){console.warn("Foreman metrics unavailable",error)}
  }
  loadHomeMetrics();
  const actionHeading = document.createElement("div");
  actionHeading.className = "cg-home-heading";
  actionHeading.innerHTML = '<div><span class="cg-eyebrow">БЫСТРЫЙ ДОСТУП</span><h2>Что делаем сегодня</h2></div>';
  home.append(actionHeading);
  for (const id of ["projects","reports","tasks","workers","time","finance","expenses"]) {
    const item = menu.find(x=>x.id===id);
    if(item)home.append(makeDashboardCard(item));
  }
  const note = document.createElement("div");
  note.className = "cg-home-note";
  note.innerHTML = '<strong>Порядок работы</strong><span>1. Выбери объект → 2. Открой рабочий день → 3. Укажи выполненные позиции и фото → 4. Отправь OWNER. Расходы и зарплаты учитываются отдельно.</span>';
  home.append(note);
  home.querySelectorAll("[data-go]").forEach(btn=>btn.addEventListener("click",()=>openPage(btn.dataset.go)));

  // ==================================
  // EXISTING MODULES
  // ==================================

  function currentPhotoPanel() {
    return document.getElementById("foremanPhotoTask")
      ?.closest(".expense-form-container") || photoPanel;
  }

  function setVisible(node, visible) {
    if (node) node.hidden = !visible;
  }

  function showModules(page) {
    // Оставляем DOM на месте, чтобы не нарушать
    // существующие слушатели кнопок и формы.
    for (const module of modules) {
      module.hidden = true;
    }

    const photo = currentPhotoPanel();

    if (page === "home") {
      workspace.append(home);
      return;
    }

    if (home.parentElement === workspace) home.remove();

    if (
      page === "projects" ||
      page === "reports" ||
      page === "workers" ||
      page === "time"
    ) {
      setVisible(projects, true);

      // Раскрываем объекты для разделов работников
      // и табелей.
      if (page === "workers" || page === "time") {
        projects
          ?.querySelectorAll(".cfp-project-head")
          .forEach(btn => {
            if (btn.getAttribute("aria-expanded") === "false") {
              btn.click();
            }
          });
      }
    }

    if (page === "tasks") {
      setVisible(tasks, true);
      setVisible(photo, true);
    }
    tasks?.classList.remove("cg-photo-mode");

    if (page === "finance") {
      setVisible(cash, true);
      setVisible(payroll, true);
      setVisible(history, true);
    }

    if (page === "expenses") {
      setVisible(expenses, true);
    }

    // Модули остались в исходном main, поэтому
    // переносим только визуальный контейнер.
  }

  // Существующие section.card и проекты должны
  // отображаться в рабочей части кабинета.
  // Перемещаем их ровно один раз.
  // Все DOM-узлы и их обработчики сохраняются.

  for (const node of modules) {
    workspace.appendChild(node);
  }

  // Photo mode: скрываем остальную часть задач
  // без удаления элементов.
  const extraStyle = document.createElement("style");

  extraStyle.textContent = `
    #foremanTasksSection.cg-photo-mode > :not(.expense-form-container) {
      display: none !important;
    }

    #foremanTasksSection.cg-photo-mode
    > .expense-form-container {
      display: block !important;
    }

    #cgForemanProjects[hidden] {
      display: none !important;
    }

    #cgForemanProjects {
      margin: 0 auto;
      padding: 0;
    }

    .cg-module > .card {
      margin-top: 0;
      margin-bottom: 16px;
    }
  `;

  document.head.appendChild(extraStyle);

  let activePage = "home";

  function openPage(id) {
    const item = menu.find(x => x.id === id) || menu[0];

    activePage = item.id;

    pageTitle.textContent = item.label;
    pageDescription.textContent = item.description;

    document.querySelectorAll(
      "#cgControlCenter .cg-menu-button"
    ).forEach(btn => {
      const isActive = btn.dataset.page === item.id;

      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-current",
        isActive ? "page" : "false");
    });

    const contextual = {
      projects:["Мои объекты","Открывай карточку объекта, чтобы управлять этапами, работами и дневными отчётами."],
      reports:["Вечерние отчёты","Выбери назначенный объект и открой вкладку «Рабочий день». Там доступны черновики, фото, расчёт работ и запрос денег OWNER."],
      workers:["Состав команды","Работники и назначения привязаны к объектам. Раскрой нужный объект для просмотра бригады."],
      time:["Табели по объектам","Открой объект и выбери работников для просмотра рабочего времени и проверки часов."],
      tasks:["Задачи и фото","Задачи и связанные с ними фото находятся в одном разделе. Отчёты по объёмам работ — в карточке объекта."],
      finance:["Деньги бригады","Баланс, зарплаты, авансы и история операций. Согласование запроса денег в отчёте само по себе не означает выдачу."],
      expenses:["Покупки и чеки","Создавай расходы по объектам, прикладывай чеки и следи за согласованием."]
    };
    const info=contextual[item.id];
    context.hidden=!info;
    if(info)context.innerHTML='<strong>'+info[0]+'</strong><span>'+info[1]+'</span>';
    showModules(item.id);

    refresh.hidden = item.id === "home";

    const hash = "#" + item.id;
    if (window.location.hash !== hash) {
      historyReplace(hash);
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function historyReplace(hash) {
    window.history.replaceState(null, "", hash);
  }

  refresh.addEventListener("click", () => {
    const ids = {
      projects: [],
      reports: [],
      workers: [],
      time: [],
      tasks: ["foremanRefreshTasks","foremanPhotoRefresh"],
      finance: ["refreshBalance", "foremanRefreshPayroll"],
      expenses: []
    };

    const actions = ids[activePage] || [];

    actions.forEach(id => {
      document.getElementById(id)?.click();
    });

    if (
      ["projects", "reports", "workers", "time"].includes(activePage)
    ) {
      document.querySelector(
        "#cgForemanProjects .cfp-refresh"
      )?.click();
    }

    if (!actions.length &&
        !["projects", "reports", "workers", "time"].includes(activePage)) {
      // Для модулей без кнопки обновления
      // повторно читаем страницу без изменения БД.
      window.location.reload();
    }
  });

  const initial = window.location.hash.slice(1);
  openPage(menu.some(x => x.id === initial) ? initial : "home");

  window.addEventListener("hashchange", () => {
    const next = window.location.hash.slice(1);

    if (menu.some(x => x.id === next)) {
      openPage(next);
    }
  });

  // Раздел проектов создаётся отдельным скриптом.
  // Если он добавлен чуть позже, подключаем его
  // к рабочей области без перезагрузки.
  if (!projects) {
    const observer = new MutationObserver(() => {
      const lateProjects =
        document.getElementById("cgForemanProjects");

      if (!lateProjects) return;

      observer.disconnect();
      lateProjects.hidden =
        !["projects", "reports", "workers", "time"].includes(activePage);

      workspace.append(lateProjects);
    });

    observer.observe(main, { childList: true });
  }
});
