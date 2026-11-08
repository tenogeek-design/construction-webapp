
"use strict";

// CONSTRUCTION GROUP — OWNER / ADMIN CORE
// Остальные разделы подключены отдельными admin-*.js.

document.addEventListener("DOMContentLoaded", async () => {
  const URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";
  const $ = id => document.getElementById(id);

  if (!window.supabase) {
    document.body.textContent =
      "Ошибка загрузки авторизации. Обновите страницу.";
    return;
  }

  const db = window.supabase.createClient(URL, KEY);
  const navItems = [...document.querySelectorAll(".nav-item")];
  const pages = [...document.querySelectorAll(".dashboard-section")];

  const menuPermissions = {
    dashboard: "dashboard.view",
    requests: "requests.view",
    employees: "employees.view",
    projects: "projects.view",
    tasks: "tasks.view",
    time: "time.view",
    payroll: "payroll.view",
    finance: "finance.view",
    services: "services.view",
    clients: "clients.view",
    documents: "documents.view",
    notifications: "notifications.view",
    analytics: "analytics.view",
    settings: "settings.view",
    roles: "roles.view"
  };

  const titles = {
    dashboard: "Панель управления",
    requests: "Заявки клиентов",
    employees: "Сотрудники",
    projects: "Объекты",
    tasks: "Задачи",
    time: "Учёт времени",
    payroll: "Зарплаты",
    finance: "Финансы",
    services: "Услуги и цены",
    clients: "Клиенты",
    documents: "Документы",
    notifications: "Уведомления",
    analytics: "Аналитика",
    settings: "Настройки",
    roles: "Роли и доступ"
  };

  let permissions = [];
  let allRequests = [];
  let selectedRequestId = null;
  let requestsBusy = false;

  const can = code => permissions.some(p =>
    p.permission_code === code && p.scope === "all"
  );

  const allowed = section => Boolean(
    $(section) &&
    pages.includes($(section)) &&
    menuPermissions[section] &&
    can(menuPermissions[section])
  );

  const labelStatus = value => ({
    NOWA: "Новая",
    KONTAKT: "Контакт",
    USTALENIA: "Согласование",
    ZAAKCEPTOWANA: "Принята",
    ODRZUCONA: "Отклонена"
  }[value] || value || "—");

  const valueText = value => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }
    if (typeof value === "boolean") {
      return value ? "Да" : "Нет";
    }
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const formatDate = value => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const address = request => [
    request.city,
    request.street,
    request.building_number,
    request.apartment_number
      ? "кв. " + request.apartment_number
      : null
  ].filter(Boolean).join(", ") || "—";

  const make = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined) {
      el.textContent = String(text);
    }
    if (className) {
      el.className = className;
    }
    return el;
  };

  const show = (id, text) => {
    if ($(id)) $(id).textContent = text;
  };

  const errorText = error => error?.message || String(error);

  // ==========================================
  // 1. АВТОРИЗАЦИЯ
  // ==========================================

  async function checkAccess() {
    const {
      data: { session },
      error: sessionError
    } = await db.auth.getSession();

    if (sessionError || !session) {
      window.location.replace("/login.html");
      return false;
    }

    const {
      data: { user },
      error: userError
    } = await db.auth.getUser();

    if (userError || !user) {
      throw new Error("Не удалось подтвердить вход.");
    }

    const [roleResult, permissionResult] = await Promise.all([
      db.from("app_user_roles")
        .select("role_code")
        .eq("user_id", user.id)
        .is("revoked_at", null),

      db.rpc("get_my_effective_permissions")
    ]);

    if (roleResult.error) throw roleResult.error;
    if (permissionResult.error) throw permissionResult.error;

    const roles = (roleResult.data || [])
      .map(r => r.role_code);

    if (
      !roles.includes("owner") &&
      !roles.includes("admin")
    ) {
      throw new Error("Доступ только для OWNER и ADMIN.");
    }

    permissions = Array.isArray(permissionResult.data)
      ? permissionResult.data
      : [];

    if (!permissions.length) {
      throw new Error("Не удалось загрузить разрешения.");
    }

    const profile = document.querySelector(".topbar .profile");

    if (profile) {
      const strong = profile.querySelector("strong");
      const small = profile.querySelector("small");
      const avatar = profile.querySelector(".avatar");

      if (strong) strong.textContent = user.email || "Пользователь";
      if (small) {
        small.textContent = roles.includes("owner")
          ? "OWNER"
          : "ADMIN";
      }
      if (avatar) {
        avatar.textContent = (user.email || "A")[0].toUpperCase();
      }
    }

    const signOut = make("button", "Выйти");
    signOut.type = "button";

    signOut.style.cssText = `
      padding:9px 13px;
      border:1px solid #555;
      border-radius:8px;
      background:#30343a;
      color:#fff;
      cursor:pointer;
    `;

    signOut.addEventListener("click", async () => {
      signOut.disabled = true;

      const { error } = await db.auth.signOut();

      if (error) {
        alert("Не удалось выйти: " + error.message);
        signOut.disabled = false;
      } else {
        window.location.replace("/login.html");
      }
    });

    document.querySelector(".topbar-actions")?.append(signOut);
    return true;
  }

  // ==========================================
  // 2. НАВИГАЦИЯ
  // ==========================================

  function openSection(name) {
    const section = String(name || "dashboard")
      .replace(/^#/, "")
      .toLowerCase();

    const next = allowed(section) ? section : "dashboard";

    if (!allowed(next)) {
      pages.forEach(page => {
        page.style.display = "none";
      });
      return;
    }

    pages.forEach(page => {
      page.style.display =
        page.id === next ? "block" : "none";
    });

    navItems.forEach(item => {
      item.classList.toggle(
        "active",
        item.getAttribute("href") === "#" + next
      );
    });

    show("pageTitle", titles[next] || "Панель управления");

    if (next === "requests") {
      loadRequests();
    }

    window.scrollTo(0, 0);
  }

  function setupNavigation() {
    navItems.forEach(item => {
      const href = item.getAttribute("href") || "";
      const section = href.startsWith("#")
        ? href.slice(1)
        : "";

      if (section && !allowed(section)) {
        item.style.display = "none";
        return;
      }

      item.style.display = "";

      item.addEventListener("click", event => {
        if (!href.startsWith("#")) return;

        event.preventDefault();

        if (window.location.hash === href) {
          openSection(section);
        } else {
          window.location.hash = href;
        }
      });
    });

    window.addEventListener("hashchange", () => {
      openSection(window.location.hash.slice(1));
    });

    openSection(
      window.location.hash.slice(1) || "dashboard"
    );
  }

  // ==========================================
  // 3. СЧЁТЧИКИ ЗАЯВОК
  // ==========================================

  function updateCounters() {
    const total = allRequests.length;

    const count = status =>
      allRequests.filter(r => r.status === status).length;

    const newCount = count("NOWA");

    show("requestsTotal", total);
    show("requestsNew", newCount);
    show("requestsAccepted", count("ZAAKCEPTOWANA"));
    show("requestsRejected", count("ODRZUCONA"));
    show("dashboardNewRequests", newCount);

    document
      .querySelectorAll('a[href="#requests"] .nav-count')
      .forEach(el => {
        el.textContent = String(newCount);
      });

    const recentPanel = [
      ...document.querySelectorAll("#dashboard .panel")
    ].find(panel =>
      panel.querySelector("h3")
        ?.textContent
        ?.includes("Последние заявки")
    );

    const old = recentPanel?.querySelector(
      ".empty-state, .request-recent-list"
    );

    if (!old) return;

    const list = make("div", undefined, "request-recent-list");

    list.style.cssText = `
      padding:12px 20px;
      display:grid;
      gap:9px;
    `;

    if (!total) {
      list.textContent = "Заявок пока нет.";
    }

    allRequests.slice(0, 5).forEach(r => {
      const link = make(
        "a",
        "№" + (r.request_number ?? "—") +
        " · " + (r.customer_name || "Клиент") +
        " · " + labelStatus(r.status)
      );

      link.href = "#requests";

      link.style.cssText = `
        color:inherit;
        text-decoration:none;
        border-bottom:1px solid #444;
        padding:8px 0;
      `;

      link.addEventListener("click", () => {
        selectedRequestId = r.id;

        if (window.location.hash === "#requests") {
          openSection("requests");
          renderDetails();
        } else {
          window.location.hash = "#requests";
        }
      });

      list.append(link);
    });

    old.replaceWith(list);
  }

  // ==========================================
  // 4. ТАБЛИЦА ЗАЯВОК
  // ==========================================

  function tableCell(row, text) {
    const cell = make("td", text);

    cell.style.cssText = `
      padding:11px 12px;
      border-bottom:1px solid #3b3f46;
      white-space:nowrap;
    `;

    row.append(cell);
  }

  function renderRequests() {
    const search = (
      $("requestSearch")?.value || ""
    ).trim().toLowerCase();

    const filter = $("requestStatusFilter")?.value || "";

    const rows = allRequests.filter(r => {
      const haystack = [
        r.request_number,
        r.customer_name,
        r.phone,
        r.city,
        r.street
      ].map(v =>
        String(v ?? "").toLowerCase()
      ).join(" ");

      return (
        (!filter || r.status === filter) &&
        (!search || haystack.includes(search))
      );
    });

    const container = $("requestsTableContainer");
    if (!container) return;

    container.replaceChildren();

    if ($("requestsEmpty")) {
      $("requestsEmpty").style.display =
        rows.length ? "none" : "block";
    }

    if (!rows.length) return;

    const table = make("table");

    table.style.cssText = `
      width:100%;
      border-collapse:collapse;
      font-size:13px;
      text-align:left;
    `;

    const header = make("tr");

    [
      "Номер",
      "Клиент",
      "Телефон",
      "Адрес",
      "Статус",
      "Дата",
      "Действие"
    ].forEach(v => {
      const th = make("th", v);

      th.style.cssText = `
        padding:12px;
        border-bottom:1px solid #555;
        white-space:nowrap;
      `;

      header.append(th);
    });

    const head = make("thead");
    head.append(header);
    table.append(head);

    const body = make("tbody");

    rows.forEach(r => {
      const tr = make("tr");

      tableCell(tr, r.request_number ?? "—");
      tableCell(tr, r.customer_name || "—");
      tableCell(tr, r.phone || "—");
      tableCell(tr, address(r));
      tableCell(tr, labelStatus(r.status));
      tableCell(tr, formatDate(r.created_at));

      const action = make("td");
      action.style.padding = "8px";

      const btn = make("button", "Открыть");
      btn.type = "button";

      btn.style.cssText = `
        padding:7px 10px;
        background:#383c42;
        color:#fff;
        border:1px solid #666;
        border-radius:6px;
        cursor:pointer;
      `;

      btn.addEventListener("click", () => {
        selectedRequestId = r.id;
        renderDetails();
      });

      action.append(btn);
      tr.append(action);
      body.append(tr);
    });

    table.append(body);
    container.append(table);
  }

  // ==========================================
  // 5. КАРТОЧКА ЗАЯВКИ
  // ==========================================

  function detailField(parent, label, value) {
    const item = make("div");

    item.style.cssText = `
      border-bottom:1px solid #444;
      padding:8px 0;
      min-width:220px;
    `;

    const heading = make("div", label);

    heading.style.cssText = `
      font-size:12px;
      color:#a4a7ad;
      margin-bottom:4px;
    `;

    const content = make("div", valueText(value));

    content.style.cssText = `
      white-space:pre-wrap;
      overflow-wrap:anywhere;
    `;

    item.append(heading, content);
    parent.append(item);
  }

  function renderDetails() {
    const r = allRequests.find(
      x => x.id === selectedRequestId
    );

    const panel = $("requestDetails");
    const content = $("requestDetailsContent");

    if (!panel || !content) return;

    if (!r) {
      panel.style.display = "none";
      return;
    }

    panel.style.display = "block";

    show(
      "requestDetailsTitle",
      "Заявка №" + (r.request_number ?? "—")
    );

    content.replaceChildren();

    const grid = make("div");

    grid.style.cssText = `
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(220px,1fr));
      gap:8px 16px;
    `;

    const fields = [
      ["Статус", labelStatus(r.status)],
      ["Клиент", r.customer_name],
      ["Телефон", r.phone],
      ["Email", r.email],
      ["Адрес", address(r)],
      ["Telegram ID", r.telegram_user_id],
      ["Тип объекта", r.object_type],
      ["Площадь, м²", r.area_sqm],
      ["Состояние объекта", r.object_condition],
      ["Этаж", r.floor],
      ["Лифт", r.has_elevator],
      ["Подъезд транспорта", r.vehicle_access],
      [
        "Начало работ",
        r.preferred_start_date || r.preferred_start
      ],
      ["Вывоз мусора", r.debris_removal],
      ["Объём мусора", r.debris_volume],
      ["Материалы", r.materials_source],
      ["Инструмент", r.tools_source],
      [
        "Оценка",
        r.estimated_total == null
          ? null
          : r.estimated_total + " " +
            (r.estimated_currency || "PLN")
      ],
      ["Дата заявки", formatDate(r.created_at)],
      ["Причина отказа", r.rejection_reason]
    ];

    fields.forEach(([label, value]) =>
      detailField(grid, label, value)
    );

    content.append(grid);

    [
      ["Описание", r.description],
      ["Дополнительные услуги", r.additional_services],
      ["Расчёт калькулятора", r.calculator_items]
    ].forEach(([label, value]) => {
      if (value != null && value !== "") {
        detailField(content, label, value);
      }
    });

    if (can("requests.update")) {
      const actionRow = make("div");

      actionRow.style.cssText = `
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:18px;
      `;

      const actions = [
        ["Контакт", "KONTAKT"],
        ["Согласование", "USTALENIA"],
        ["Принять", "ZAAKCEPTOWANA"],
        ["Отклонить", "ODRZUCONA"]
      ];

      actions.forEach(([name, nextStatus]) => {
        if (
          ["ZAAKCEPTOWANA", "ODRZUCONA"].includes(nextStatus) &&
          !can("requests.approve")
        ) {
          return;
        }

        if (r.status === nextStatus) return;

        const button = make("button", name);
        button.type = "button";

        button.style.cssText = `
          padding:10px 14px;
          border:1px solid #555;
          border-radius:8px;
          background:#35383e;
          color:#fff;
          cursor:pointer;
        `;

        button.addEventListener("click", () =>
          updateRequest(r, nextStatus, button)
        );

        actionRow.append(button);
      });

      content.append(actionRow);
    }

    panel.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  // ==========================================
  // 6. ИЗМЕНЕНИЕ СТАТУСА
  // ==========================================

  async function updateRequest(r, status, button) {
    if (!can("requests.update")) return;

    let reason = null;

    if (status === "ODRZUCONA") {
      reason = prompt("Укажите причину отклонения заявки:");

      if (reason === null) return;

      reason = reason.trim();

      if (!reason) {
        alert("Причина отклонения обязательна.");
        return;
      }
    } else {
      const confirmed = confirm(
        "Изменить статус заявки №" +
        (r.request_number ?? "—") +
        " на «" + labelStatus(status) + "»?"
      );

      if (!confirmed) return;
    }

    button.disabled = true;

    try {
      const { error } = await db.rpc(
        "admin_update_request",
        {
          p_request_id: r.id,
          p_status: status,
          p_rejection_reason: reason
        }
      );

      if (error) throw error;

      await loadRequests();

      selectedRequestId = r.id;
      renderDetails();
    } catch (error) {
      alert(
        "Не удалось изменить статус: " +
        errorText(error)
      );
    } finally {
      button.disabled = false;
    }
  }

  // ==========================================
  // 7. ЗАГРУЗКА ЗАЯВОК
  // ==========================================

  async function loadRequests() {
    if (!can("requests.view") || requestsBusy) return;

    requestsBusy = true;

    if ($("requestsLoading")) {
      $("requestsLoading").textContent = "Загружаем заявки...";
      $("requestsLoading").style.display = "block";
    }

    try {
      const { data, error } = await db.rpc(
        "get_admin_requests",
        { p_limit: 100 }
      );

      if (error) throw error;

      allRequests = Array.isArray(data) ? data : [];

      updateCounters();
      renderRequests();

      if (
        $("requestDetails")?.style.display === "block" &&
        selectedRequestId
      ) {
        renderDetails();
      }
    } catch (error) {
      if ($("requestsTableContainer")) {
        $("requestsTableContainer").replaceChildren();
      }

      show(
        "requestsLoading",
        "Не удалось загрузить заявки: " +
        errorText(error)
      );

      console.error("get_admin_requests:", error);
      return;
    } finally {
      requestsBusy = false;
    }

    if ($("requestsLoading")) {
      $("requestsLoading").style.display = "none";
    }
  }

  // ==========================================
  // 8. СОБЫТИЯ
  // ==========================================

  $("requestSearch")?.addEventListener(
    "input",
    renderRequests
  );

  $("requestStatusFilter")?.addEventListener(
    "change",
    renderRequests
  );

  $("refreshRequests")?.addEventListener(
    "click",
    loadRequests
  );

  $("closeRequestDetails")?.addEventListener(
    "click",
    () => {
      selectedRequestId = null;

      if ($("requestDetails")) {
        $("requestDetails").style.display = "none";
      }
    }
  );

  // ==========================================
  // 9. ЗАПУСК
  // ==========================================

  try {
    if (!await checkAccess()) return;

    setupNavigation();

    if ($("currentDate")) {
      $("currentDate").textContent =
        new Date().toLocaleDateString("ru-RU", {
          day: "numeric",
          month: "long",
          year: "numeric"
        });
    }

    await loadRequests();
  } catch (error) {
    console.error("Ошибка запуска админки:", error);

    pages.forEach(page => {
      page.style.display = "none";
    });

    const main = document.querySelector(".main-content");

    if (main) {
      const notice = make(
        "div",
        "Ошибка доступа: " + errorText(error)
      );

      notice.style.cssText = `
        margin:30px;
        padding:24px;
        border:1px solid #a44;
        border-radius:10px;
        color:#ff9d9d;
        background:#30272a;
      `;

      main.append(notice);
    }

    navItems.forEach(item => {
      item.style.display = "none";
    });
  }
});
