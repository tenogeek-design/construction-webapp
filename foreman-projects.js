
"use strict";

/*
 CONSTRUCTION GROUP
 FOREMAN MANAGEMENT SYSTEM

 Объекты -> Работники -> Табели
 Данные: get_foreman_project_workers()

 На этом этапе только просмотр.
*/

document.addEventListener("DOMContentLoaded", async () => {
  if (!window.supabase) {
    console.error("Supabase SDK не загружен");
    return;
  }

  if (document.getElementById("cgForemanProjects")) return;

  const URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const db = window.supabase.createClient(URL, KEY);

  const host =
    document.querySelector("#foremanContent") ||
    document.querySelector("main") ||
    document.body;

  const root = document.createElement("section");
  root.id = "cgForemanProjects";

  host.appendChild(root);

  // ======================================
  // DESIGN
  // ======================================

  const style = document.createElement("style");

  style.textContent = `
    #cgForemanProjects {
      color: #edf2fa;
      max-width: 1120px;
      margin: 24px auto;
      padding: 0 16px 60px;
      font-family: Arial, sans-serif;
    }

    #cgForemanProjects * {
      box-sizing: border-box;
    }

    .cfp-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 14px;
      margin-bottom: 22px;
    }

    .cfp-title {
      font-size: 24px;
      font-weight: 700;
      margin: 0;
      color: #fff;
    }

    .cfp-subtitle {
      color: #9eafc6;
      font-size: 13px;
      margin: 8px 0 0;
    }

    .cfp-tag {
      background: #254b78;
      color: #bfdbff;
      padding: 7px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: bold;
      white-space: nowrap;
    }

    .cfp-stats {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 24px;
    }

    .cfp-stat {
      background: #293340;
      border: 1px solid #3d4b5d;
      border-radius: 13px;
      padding: 16px;
      min-width: 0;
    }

    .cfp-stat-label {
      font-size: 12px;
      color: #9fb0c5;
    }

    .cfp-stat-value {
      display: block;
      font-size: 27px;
      color: #fff;
      font-weight: 700;
      margin-top: 9px;
    }

    .cfp-project {
      background: #252e3b;
      border: 1px solid #3d4859;
      border-radius: 15px;
      margin-bottom: 14px;
      overflow: hidden;
    }

    .cfp-project-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      padding: 17px;
      border: 0;
      background: transparent;
      color: #fff;
      text-align: left;
      cursor: pointer;
    }

    .cfp-project-head:hover {
      background: #2d394a;
    }

    .cfp-project-name {
      display: block;
      font-size: 17px;
      font-weight: 700;
    }

    .cfp-project-meta {
      display: block;
      color: #a5b6ca;
      font-size: 12px;
      margin-top: 7px;
    }

    .cfp-project-body {
      border-top: 1px solid #3e4a5a;
      padding: 15px;
    }

    .cfp-project-body[hidden],
    .cfp-worker-body[hidden] {
      display: none !important;
    }

    .cfp-section-label {
      font-size: 12px;
      color: #a8bacf;
      font-weight: 700;
      margin: 0 0 13px;
    }

    .cfp-worker {
      background: #2e3a49;
      border: 1px solid #465467;
      border-radius: 11px;
      margin-top: 9px;
      overflow: hidden;
    }

    .cfp-worker-head {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      background: transparent;
      border: 0;
      text-align: left;
      padding: 14px;
      color: #fff;
      cursor: pointer;
    }

    .cfp-worker-head:hover {
      background: #38485b;
    }

    .cfp-worker-name {
      font-size: 14px;
      font-weight: 700;
    }

    .cfp-worker-info {
      font-size: 12px;
      color: #a9bad0;
      margin-top: 5px;
    }

    .cfp-worker-body {
      padding: 14px;
      border-top: 1px solid #47566b;
    }

    .cfp-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 11px 0;
    }

    .cfp-label {
      color: #a9bad0;
      font-size: 13px;
    }

    .cfp-value {
      color: #fff;
      font-size: 14px;
      font-weight: 700;
    }

    .cfp-badge {
      display: inline-block;
      background: #53442c;
      color: #f0c780;
      font-size: 11px;
      padding: 6px 9px;
      border-radius: 8px;
      white-space: nowrap;
    }

    .cfp-badge.empty {
      background: #354355;
      color: #bacce2;
    }

    .cfp-note {
      background: #243144;
      border-radius: 9px;
      padding: 12px;
      color: #b4c8e4;
      font-size: 12px;
      line-height: 1.6;
      margin-top: 14px;
    }

    .cfp-refresh {
      background: #376bad;
      border: 0;
      color: #fff;
      padding: 10px 13px;
      border-radius: 9px;
      cursor: pointer;
      font-weight: 700;
    }

    .cfp-refresh:disabled {
      opacity: .5;
    }

    .cfp-message {
      padding: 20px;
      background: #293340;
      border: 1px solid #40516a;
      border-radius: 12px;
      color: #c5d3e4;
    }

    @media(max-width:650px) {
      #cgForemanProjects {
        padding: 0 12px 35px;
        margin-top: 16px;
      }

      .cfp-title {
        font-size: 20px;
      }

      .cfp-stats {
        gap: 7px;
      }

      .cfp-stat {
        padding: 10px;
      }

      .cfp-stat-label {
        font-size: 10px;
      }

      .cfp-stat-value {
        font-size: 21px;
      }

      .cfp-project-head {
        padding: 13px;
      }

      .cfp-project-name {
        font-size: 15px;
      }

      .cfp-worker-head {
        padding: 12px;
      }
    }
  `;

  document.head.appendChild(style);

  // ======================================
  // HELPERS
  // ======================================

  function element(tag, className, text) {
    const node = document.createElement(tag);

    if (className) node.className = className;

    if (text !== undefined) {
      node.textContent = String(text);
    }

    return node;
  }

  function formatHours(value) {
    const number = Number(value || 0);

    return (
      Number(number.toFixed(2)).toString() + " ч"
    );
  }

  function createStat(label, value) {
    const box = element("div", "cfp-stat");

    box.append(
      element("span", "cfp-stat-label", label),
      element("strong", "cfp-stat-value", value)
    );

    return box;
  }

  function createRow(label, value) {
    const row = element("div", "cfp-row");

    row.append(
      element("span", "cfp-label", label),
      element("strong", "cfp-value", value)
    );

    return row;
  }

  // ======================================
  // WORKER CARD
  // ======================================

  function createWorker(worker) {
    const card = element("div", "cfp-worker");

    const head = element(
      "button",
      "cfp-worker-head"
    );
    head.type = "button";
    head.setAttribute("aria-expanded", "false");

    const identity = element("div");

    identity.append(
      element(
        "div",
        "cfp-worker-name",
        worker.worker_name || "Работник"
      ),
      element(
        "div",
        "cfp-worker-info",
        worker.worker_position || "Сотрудник"
      )
    );

    const count = Number(
      worker.submitted_entries || 0
    );

    const badge = element(
      "span",
      count > 0
        ? "cfp-badge"
        : "cfp-badge empty",
      count > 0
        ? count + " на проверке"
        : "Нет ожидающих"
    );

    head.append(identity, badge);

    const body = element(
      "div",
      "cfp-worker-body"
    );
    body.hidden = true;

    body.append(
      createRow(
        "Часов на проверке",
        formatHours(worker.submitted_hours)
      ),
      createRow(
        "Записей на проверке",
        String(count)
      ),
      createRow(
        "Назначен на объект",
        worker.assigned_at || "—"
      )
    );

    body.append(
      element(
        "div",
        "cfp-note",
        "Здесь будет недельный табель: " +
        "дата, часы, пояснение работника, " +
        "подтверждение, корректировка и отклонение. " +
        "Все изменения будут сохраняться в истории."
      )
    );

    head.addEventListener("click", () => {
      body.hidden = !body.hidden;

      head.setAttribute(
        "aria-expanded",
        String(!body.hidden)
      );
    });

    card.append(head, body);

    return card;
  }

  // ======================================
  // PROJECT CARD
  // ======================================

  function createProject(project) {
    const card = element(
      "article",
      "cfp-project"
    );

    const head = element(
      "button",
      "cfp-project-head"
    );
    head.type = "button";
    head.setAttribute("aria-expanded", "false");

    const summary = element("div");

    summary.append(
      element(
        "span",
        "cfp-project-name",
        project.name
      ),
      element(
        "span",
        "cfp-project-meta",
        project.workers.length +
        " работников · " +
        formatHours(project.hours)
        + " на проверке"
      )
    );

    head.append(
      summary,
      element("span", "", "⌄")
    );

    const body = element(
      "div",
      "cfp-project-body"
    );
    body.hidden = true;

    body.append(
      element(
        "p",
        "cfp-section-label",
        "РАБОТНИКИ ОБЪЕКТА"
      )
    );

    for (const worker of project.workers) {
      body.append(createWorker(worker));
    }

    head.addEventListener("click", () => {
      body.hidden = !body.hidden;

      head.setAttribute(
        "aria-expanded",
        String(!body.hidden)
      );
    });

    card.append(head, body);
    return card;
  }

  // ======================================
  // RENDER
  // ======================================

  function render(rows) {
    root.replaceChildren();

    const header = element("div", "cfp-header");
    const titles = element("div");

    titles.append(
      element(
        "h2",
        "cfp-title",
        "Управление объектами"
      ),
      element(
        "p",
        "cfp-subtitle",
        "Объекты → Работники → Табели"
      )
    );

    const refresh = element(
      "button",
      "cfp-refresh",
      "Обновить"
    );
    refresh.type = "button";
    refresh.onclick = load;

    header.append(titles, refresh);
    root.append(header);

    const projects = new Map();

    for (const row of rows) {
      if (!projects.has(row.project_id)) {
        projects.set(row.project_id, {
          id: row.project_id,
          name: row.project_name || "Объект",
          status: row.project_status,
          workers: [],
          hours: 0,
          entries: 0
        });
      }

      const project = projects.get(row.project_id);

      project.workers.push(row);
      project.hours += Number(
        row.submitted_hours || 0
      );
      project.entries += Number(
        row.submitted_entries || 0
      );
    }

    const projectList = [...projects.values()];
    const workerKeys = new Set(
      rows.map(row => row.worker_id)
    );

    const allHours = projectList.reduce(
      (sum, project) => sum + project.hours,
      0
    );

    const allEntries = projectList.reduce(
      (sum, project) => sum + project.entries,
      0
    );

    const stats = element(
      "div",
      "cfp-stats"
    );

    stats.append(
      createStat("Объекты", projectList.length),
      createStat("Работники", workerKeys.size),
      createStat("На проверке", allEntries)
    );

    root.append(stats);

    if (!projectList.length) {
      root.append(
        element(
          "div",
          "cfp-message",
          "Нет доступных объектов или назначенных " +
          "работников. Проверьте назначения и роль."
        )
      );
      return;
    }

    for (const project of projectList) {
      root.append(createProject(project));
    }
  }

  // ======================================
  // LOAD DATA
  // ======================================

  async function load() {
    root.replaceChildren(
      element(
        "div",
        "cfp-message",
        "Загружаем объекты и работников..."
      )
    );

    try {
      const { data: auth, error: authError } =
        await db.auth.getUser();

      if (authError || !auth?.user) {
        throw new Error(
          "Войдите в аккаунт прораба."
        );
      }

      const { data, error } = await db.rpc(
        "get_foreman_project_workers"
      );

      if (error) throw error;

      render(Array.isArray(data) ? data : []);

    } catch (error) {
      console.error("Foreman projects:", error);

      root.replaceChildren(
        element(
          "div",
          "cfp-message",
          "Ошибка загрузки: " +
          (error.message || "Неизвестная ошибка")
        )
      );
    }
  }

  await load();
});
