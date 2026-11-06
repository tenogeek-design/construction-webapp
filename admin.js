
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const loginUrl = "/login.html";

  if (!window.supabase) {
    document.body.textContent =
      "Ошибка загрузки системы авторизации. Обновите страницу.";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // 1. Проверка авторизации и роли
  async function checkAccess() {
    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {
      window.location.replace(loginUrl);
      return null;
    }

    const user = data.session.user;

    const { data: roles, error: roleError } = await client
      .from("app_user_roles")
      .select("role_code")
      .eq("user_id", user.id)
      .is("revoked_at", null);

    if (roleError) {
      console.error("Role check error:", roleError);
      document.body.textContent =
        "Не удалось проверить права доступа.";
      return null;
    }

    const userRoles = (roles || []).map(role => role.role_code);
    const allowedRoles = ["owner", "admin"];

    if (!userRoles.some(role => allowedRoles.includes(role))) {
      await client.auth.signOut();
      window.location.replace(loginUrl);
      return null;
    }

    return { user, userRoles };
  }

  const access = await checkAccess();

  if (!access) return;

  // 2. Профиль пользователя
  const profile = document.querySelector(".profile");

  if (profile) {
    const name = profile.querySelector("strong");
    const role = profile.querySelector("small");

    if (name) {
      name.textContent = access.user.email || "Пользователь";
    }

    if (role) {
      role.textContent = access.userRoles
        .map(value => value.toUpperCase())
        .join(" / ");
    }

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.textContent = "Выйти";
    logoutButton.className = "logout-button";

    logoutButton.style.marginLeft = "12px";
    logoutButton.style.padding = "8px 12px";
    logoutButton.style.border = "1px solid #ff812e";
    logoutButton.style.borderRadius = "6px";
    logoutButton.style.background = "transparent";
    logoutButton.style.color = "#ff812e";
    logoutButton.style.cursor = "pointer";

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "Выход...";

      const { error } = await client.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        logoutButton.disabled = false;
        logoutButton.textContent = "Выйти";
        alert("Не удалось завершить сеанс. Попробуйте ещё раз.");
        return;
      }

      window.location.replace(loginUrl);
    });

    profile.appendChild(logoutButton);
  }

  // 3. Панель проверки разрешений
  const permissionPanel = document.createElement("section");

  permissionPanel.style.margin = "20px";
  permissionPanel.style.padding = "20px";
  permissionPanel.style.background = "#242424";
  permissionPanel.style.border = "1px solid #444";
  permissionPanel.style.borderRadius = "10px";
  permissionPanel.style.color = "#fff";

  permissionPanel.innerHTML = `
    <h3 style="margin-top:0">Проверка системы разрешений</h3>
    <p id="permissionStatus">Проверяем разрешения...</p>
    <div id="permissionDetails"></div>
  `;

  const main = document.querySelector("main");

  if (main) {
    main.prepend(permissionPanel);
  } else {
    document.body.prepend(permissionPanel);
  }

  const permissionStatus =
    permissionPanel.querySelector("#permissionStatus");

  const permissionDetails =
    permissionPanel.querySelector("#permissionDetails");

  const { data: permissions, error: permissionError } =
    await client.rpc("get_my_effective_permissions");

  if (permissionError) {
    permissionStatus.textContent =
      "Ошибка проверки разрешений: " + permissionError.message;

    permissionStatus.style.color = "#ff7373";
    return;
  }

  const permissionList = permissions || [];

  permissionStatus.textContent =
    `Разрешения загружены: ${permissionList.length}`;

  permissionStatus.style.color = "#72d68b";

  const permissionUl = document.createElement("ul");

  permissionUl.style.paddingLeft = "20px";
  permissionUl.style.maxHeight = "250px";
  permissionUl.style.overflowY = "auto";

  permissionList.forEach(permission => {
    const item = document.createElement("li");
    item.textContent =
      `${permission.permission_code} — ${permission.scope}`;
    permissionUl.appendChild(item);
  });

  permissionDetails.appendChild(permissionUl);

  // 4. Динамическое меню
  const permissionSet = new Set(
    permissionList.map(item => item.permission_code)
  );

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

  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    const href = item.getAttribute("href") || "";
    const section = (
      href.split("#")[1] ||
      item.dataset.section ||
      ""
    ).toLowerCase();

    const requiredPermission = menuPermissions[section];

    if (
      requiredPermission &&
      !permissionSet.has(requiredPermission)
    ) {
      item.style.display = "none";
    }

    item.addEventListener("click", () => {
      navItems.forEach(link => link.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // 5. Дата
  const dateElement = document.getElementById("currentDate");

  if (dateElement) {
    dateElement.textContent = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());
  }

  // 6. Форматирование заявок
  function formatDate(value) {
    if (!value) return "Дата не указана";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Дата не указана";
    }

    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function statusLabel(status) {
    const labels = {
      NOWA: "Новая",
      KONTAKT: "Контакт",
      USTALENIA: "Согласование",
      ZAAKCEPTOWANA: "Принята",
      ODRZUCONA: "Отклонена"
    };

    return labels[status] || status || "Не указан";
  }

  // 7. Загрузка заявок из защищённой функции
  async function loadRequests() {
    if (!permissionSet.has("requests.view")) {
      return;
    }

    const { data: requests, error } = await client.rpc(
      "get_admin_requests",
      { p_limit: 20 }
    );

    const latestPanel = document.querySelector(
      ".dashboard-grid .panel"
    );

    if (error) {
      console.error("Requests loading error:", error);

      if (latestPanel) {
        const empty = latestPanel.querySelector(".empty-state");

        if (empty) {
          empty.innerHTML = `
            <strong>Не удалось загрузить заявки</strong>
            <p>Ошибка: ${String(error.message).replace(/</g, "&lt;")}</p>
          `;
        }
      }

      return;
    }

    const list = requests || [];

    // Счётчик новых заявок
    const newCount = list.filter(
      request => request.status === "NOWA"
    ).length;

    const requestNav = document.querySelector(
      '.nav-item[href="#requests"]'
    );

    if (requestNav) {
      const count = requestNav.querySelector(".nav-count");
      if (count) count.textContent = String(newCount);
    }

    // Карточка новых заявок на Dashboard
    const firstStat = document.querySelector(".stat-card strong");

    if (firstStat) {
      firstStat.textContent = String(newCount);
    }

    if (!latestPanel) return;

    const oldEmpty = latestPanel.querySelector(".empty-state");
    if (oldEmpty) oldEmpty.remove();

    const oldList = latestPanel.querySelector(".request-list");
    if (oldList) oldList.remove();

    if (list.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `
        <div class="empty-icon">▤</div>
        <strong>Пока нет заявок</strong>
        <p>Новые обращения клиентов появятся здесь.</p>
      `;
      latestPanel.appendChild(empty);
      return;
    }

    const requestList = document.createElement("div");
    requestList.className = "request-list";

    requestList.style.display = "grid";
    requestList.style.gap = "12px";
    requestList.style.padding = "16px";

    list.slice(0, 5).forEach(request => {
      const card = document.createElement("article");

      card.style.padding = "14px";
      card.style.background = "#242424";
      card.style.border = "1px solid #444";
      card.style.borderRadius = "8px";

      const title = document.createElement("strong");
      title.textContent =
        `Заявка №${request.request_number} — ${request.customer_name}`;

      const details = document.createElement("p");
      details.textContent =
        `${request.city}, ${request.street} ${request.building_number}`;

      const phone = document.createElement("p");
      phone.textContent = `Телефон: ${request.phone}`;

      const status = document.createElement("p");
      status.textContent = `Статус: ${statusLabel(request.status)}`;

      const date = document.createElement("small");
      date.textContent = formatDate(request.created_at);

      [title, details, phone, status, date].forEach(element => {
        element.style.display = "block";
        element.style.margin = "0 0 7px";
        card.appendChild(element);
      });

      requestList.appendChild(card);
    });

    latestPanel.appendChild(requestList);
  }

  await loadRequests();

  // 8. Проверка выхода из аккаунта
  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      window.location.replace(loginUrl);
    }
  });

  console.info("CONSTRUCTION GROUP ADMIN");
  console.info("Authentication: connected");
  console.info("User:", access.user.email);
  console.info("Roles:", access.userRoles);
  console.info("Permissions:", permissionList.length);
});
