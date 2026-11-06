
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";
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

  let allRequests = [];
  let selectedRequest = null;

  // ==========================================
  // 1. АВТОРИЗАЦИЯ И ПРОВЕРКА РОЛИ
  // ==========================================

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

  // ==========================================
  // 2. ПРОФИЛЬ И ВЫХОД
  // ==========================================

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

    Object.assign(logoutButton.style, {
      marginLeft: "12px",
      padding: "8px 12px",
      border: "1px solid #ff812e",
      borderRadius: "6px",
      background: "transparent",
      color: "#ff812e",
      cursor: "pointer"
    });

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "Выход...";

      const { error } = await client.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        logoutButton.disabled = false;
        logoutButton.textContent = "Выйти";
        alert("Не удалось завершить сеанс.");
        return;
      }

      window.location.replace(loginUrl);
    });

    profile.appendChild(logoutButton);
  }

  // ==========================================
  // 3. РАЗРЕШЕНИЯ
  // ==========================================

  const { data: permissions, error: permissionError } =
    await client.rpc("get_my_effective_permissions");

  if (permissionError) {
    console.error("Permission error:", permissionError);
    alert("Не удалось загрузить разрешения пользователя.");
    return;
  }

  const permissionList = permissions || [];

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
  });

  // ==========================================
  // 4. ДАТА
  // ==========================================

  const dateElement = document.getElementById("currentDate");

  if (dateElement) {
    dateElement.textContent = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());
  }

  // ==========================================
  // 5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ==========================================

  function formatDate(value) {
    if (!value) return "Не указана";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Не указана";
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

  function createElement(tag, className, value) {
    const element = document.createElement(tag);

    if (className) element.className = className;
    if (value !== undefined && value !== null) {
      element.textContent = String(value);
    }

    return element;
  }

  function displayValue(value) {
    if (value === null || value === undefined || value === "") {
      return "Не указано";
    }

    if (typeof value === "boolean") {
      return value ? "Да" : "Нет";
    }

    if (Array.isArray(value)) {
      return value.length ? value.join(", ") : "Не указано";
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }

  function getAddress(request) {
    return [
      request.city,
      request.street,
      request.building_number,
      request.apartment_number
        ? `кв. ${request.apartment_number}`
        : ""
    ].filter(Boolean).join(", ");
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  // ==========================================
  // 6. ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ
  // ==========================================

  function showSection(sectionName) {
    const dashboard = document.getElementById("dashboard");
    const requestsSection = document.getElementById("requests");

    if (dashboard) {
      dashboard.style.display =
        sectionName === "dashboard" ? "" : "none";
    }

    if (requestsSection) {
      requestsSection.style.display =
        sectionName === "requests" ? "" : "none";
    }

    navItems.forEach(item => {
      const href = item.getAttribute("href") || "";
      const section = href.split("#")[1];

      item.classList.toggle("active", section === sectionName);
    });

    const pageTitle = document.querySelector(".page-title");

    if (pageTitle) {
      pageTitle.textContent =
        sectionName === "requests" ? "Заявки" : "Панель управления";
    }

    if (sectionName === "requests") {
      renderRequests();
    }
  }

  navItems.forEach(item => {
    item.addEventListener("click", event => {
      const href = item.getAttribute("href") || "";
      const section = href.split("#")[1];

      if (section === "dashboard" || section === "requests") {
        event.preventDefault();
        showSection(section);
      }
    });
  });

  // ==========================================
  // 7. СТАТИСТИКА ЗАЯВОК
  // ==========================================

  function updateRequestStats() {
    const total = allRequests.length;

    const newCount = allRequests.filter(
      request => request.status === "NOWA"
    ).length;

    const accepted = allRequests.filter(
      request => request.status === "ZAAKCEPTOWANA"
    ).length;

    const rejected = allRequests.filter(
      request => request.status === "ODRZUCONA"
    ).length;

    setText("requestsTotal", total);
    setText("requestsNew", newCount);
    setText("requestsAccepted", accepted);
    setText("requestsRejected", rejected);

    const dashboardNew = document.getElementById("dashboardNewRequests");

    if (dashboardNew) {
      dashboardNew.textContent = String(newCount);
    }

    const requestNav = document.querySelector(
      '.nav-item[href="#requests"]'
    );

    if (requestNav) {
      const count = requestNav.querySelector(".nav-count");

      if (count) {
        count.textContent = String(newCount);
      }
    }

    const firstStat = document.querySelector(".stat-card strong");

    if (firstStat && !document.getElementById("dashboardNewRequests")) {
      firstStat.textContent = String(newCount);
    }
  }

  // ==========================================
  // 8. ПОСЛЕДНИЕ ЗАЯВКИ НА DASHBOARD
  // ==========================================

  function renderDashboardRequests() {
    const latestPanel = document.querySelector(
      ".dashboard-grid .panel"
    );

    if (!latestPanel) return;

    const oldEmpty = latestPanel.querySelector(".empty-state");
    const oldList = latestPanel.querySelector(".request-list");

    if (oldEmpty) oldEmpty.remove();
    if (oldList) oldList.remove();

    if (!allRequests.length) {
      const empty = createElement("div", "empty-state");
      empty.appendChild(createElement("div", "empty-icon", "▤"));
      empty.appendChild(
        createElement("strong", "", "Пока нет заявок")
      );
      empty.appendChild(
        createElement("p", "", "Новые обращения клиентов появятся здесь.")
      );
      latestPanel.appendChild(empty);
      return;
    }

    const requestList = createElement("div", "request-list");

    Object.assign(requestList.style, {
      display: "grid",
      gap: "12px",
      padding: "16px"
    });

    allRequests.slice(0, 5).forEach(request => {
      const card = createElement("article");

      Object.assign(card.style, {
        padding: "14px",
        background: "#242424",
        border: "1px solid #444",
        borderRadius: "8px",
        cursor: "pointer"
      });

      const title = createElement(
        "strong",
        "",
        `Заявка №${request.request_number} — ${request.customer_name}`
      );

      const address = createElement("p", "", getAddress(request));
      const phone = createElement("p", "", `Телефон: ${request.phone}`);
      const status = createElement(
        "p",
        "",
        `Статус: ${statusLabel(request.status)}`
      );
      const date = createElement(
        "small",
        "",
        formatDate(request.created_at)
      );

      [title, address, phone, status, date].forEach(element => {
        element.style.display = "block";
        element.style.margin = "0 0 7px";
        card.appendChild(element);
      });

      card.addEventListener("click", () => {
        showSection("requests");
        openRequestDetails(request);
      });

      requestList.appendChild(card);
    });

    latestPanel.appendChild(requestList);
  }

  // ==========================================
  // 9. ТАБЛИЦА ЗАЯВОК
  // ==========================================

  function renderRequests() {
    const container = document.getElementById(
      "requestsTableContainer"
    );

    if (!container) return;

    const searchInput = document.getElementById("requestSearch");
    const statusFilter = document.getElementById("requestStatusFilter");

    const search = (searchInput?.value || "").trim().toLowerCase();
    const selectedStatus = statusFilter?.value || "";

    const filtered = allRequests.filter(request => {
      const searchable = [
        request.request_number,
        request.customer_name,
        request.phone,
        request.email,
        request.city,
        request.street,
        request.building_number
      ].filter(Boolean).join(" ").toLowerCase();

      const matchesSearch = !search || searchable.includes(search);
      const matchesStatus =
        !selectedStatus ||
        selectedStatus === "all" ||
        request.status === selectedStatus;

      return matchesSearch && matchesStatus;
    });

    container.replaceChildren();

    const loading = document.getElementById("requestsLoading");
    const empty = document.getElementById("requestsEmpty");

    if (loading) loading.style.display = "none";

    if (!filtered.length) {
      if (empty) {
        empty.style.display = "";
      } else {
        const message = createElement(
          "div",
          "empty-state",
          allRequests.length
            ? "По заданным условиям заявки не найдены."
            : "Заявок пока нет."
        );
        container.appendChild(message);
      }

      return;
    }

    if (empty) empty.style.display = "none";

    const table = createElement("table", "requests-table");

    Object.assign(table.style, {
      width: "100%",
      borderCollapse: "collapse",
      color: "inherit"
    });

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    [
      "Номер",
      "Клиент",
      "Телефон",
      "Адрес",
      "Статус",
      "Дата"
    ].forEach(label => {
      const th = createElement("th", "", label);

      Object.assign(th.style, {
        textAlign: "left",
        padding: "12px",
        borderBottom: "1px solid #444",
        whiteSpace: "nowrap"
      });

      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    filtered.forEach(request => {
      const row = document.createElement("tr");

      Object.assign(row.style, {
        cursor: "pointer",
        borderBottom: "1px solid #383838"
      });

      const values = [
        `#${request.request_number}`,
        request.customer_name,
        request.phone,
        getAddress(request),
        statusLabel(request.status),
        formatDate(request.created_at)
      ];

      values.forEach(value => {
        const td = createElement("td", "", value);

        Object.assign(td.style, {
          padding: "12px",
          verticalAlign: "top"
        });

        row.appendChild(td);
      });

      row.addEventListener("click", () => {
        openRequestDetails(request);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  // ==========================================
  // 10. ПОДРОБНОСТИ ЗАЯВКИ
  // ==========================================

  const fieldLabels = {
    id: "ID заявки",
    request_number: "Номер заявки",
    status: "Статус",
    customer_name: "Имя клиента",
    phone: "Телефон",
    telegram_user_id: "Telegram ID",
    email: "Электронная почта",
    city: "Город",
    street: "Улица",
    building_number: "Номер дома",
    apartment_number: "Номер квартиры",
    object_type: "Тип объекта",
    area_sqm: "Площадь, м²",
    object_condition: "Состояние объекта",
    floor: "Этаж",
    has_elevator: "Есть лифт",
    vehicle_access: "Подъезд транспорта",
    description: "Описание работ",
    preferred_start: "Предпочтительное время начала",
    preferred_start_date: "Предпочтительная дата",
    debris_removal: "Вывоз мусора",
    debris_volume: "Объём мусора",
    additional_services: "Дополнительные услуги",
    materials_source: "Источник материалов",
    tools_source: "Источник инструментов",
    calculator_items: "Позиции калькулятора",
    estimated_total: "Предварительная стоимость",
    estimated_currency: "Валюта",
    is_direct_owner: "Клиент — владелец объекта",
    contact_preference: "Предпочтительный способ связи",
    rejection_reason: "Причина отклонения",
    created_at: "Дата создания",
    updated_at: "Дата обновления"
  };

  function openRequestDetails(request) {
    const panel = document.getElementById("requestDetails");
    const title = document.getElementById("requestDetailsTitle");
    const content = document.getElementById("requestDetailsContent");

    if (!panel || !content) return;

    selectedRequest = request;

    if (title) {
      title.textContent =
        `Заявка №${request.request_number} — ${request.customer_name}`;
    }

    content.replaceChildren();

    const orderedFields = [
      "status",
      "customer_name",
      "phone",
      "email",
      "telegram_user_id",
      "city",
      "street",
      "building_number",
      "apartment_number",
      "object_type",
      "area_sqm",
      "object_condition",
      "floor",
      "has_elevator",
      "vehicle_access",
      "description",
      "preferred_start",
      "preferred_start_date",
      "debris_removal",
      "debris_volume",
      "additional_services",
      "materials_source",
      "tools_source",
      "calculator_items",
      "estimated_total",
      "estimated_currency",
      "is_direct_owner",
      "contact_preference",
      "rejection_reason",
      "created_at",
      "updated_at",
      "id"
    ];

    orderedFields.forEach(key => {
      const value = request[key];

      if (
        value === null ||
        value === undefined ||
        value === ""
      ) {
        return;
      }

      const field = createElement("div", "request-detail-field");

      Object.assign(field.style, {
        padding: "12px",
        borderBottom: "1px solid #3b3f46"
      });

      const label = createElement(
        "strong",
        "",
        fieldLabels[key] || key
      );

      Object.assign(label.style, {
        display: "block",
        marginBottom: "6px",
        color: "#ff812e"
      });

      const valueElement = createElement(
        "div",
        "",
        key === "status"
          ? statusLabel(value)
          : key.endsWith("_at")
            ? formatDate(value)
            : displayValue(value)
      );

      Object.assign(valueElement.style, {
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere"
      });

      field.append(label, valueElement);
      content.appendChild(field);
    });

    panel.style.display = "";
    panel.scrollIntoView({
      behavior: "smooth",
      block: "nearest"
    });
  }

  function closeRequestDetails() {
    const panel = document.getElementById("requestDetails");

    if (panel) panel.style.display = "none";

    selectedRequest = null;
  }

  const closeDetailsButton = document.getElementById(
    "closeRequestDetails"
  );

  if (closeDetailsButton) {
    closeDetailsButton.addEventListener(
      "click",
      closeRequestDetails
    );
  }

  // ==========================================
  // 11. ПОИСК И ФИЛЬТРЫ
  // ==========================================

  const searchInput = document.getElementById("requestSearch");
  const statusFilter = document.getElementById("requestStatusFilter");

  if (searchInput) {
    searchInput.addEventListener("input", renderRequests);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", renderRequests);
  }

  // ==========================================
  // 12. ЗАГРУЗКА ЗАЯВОК ИЗ SUPABASE
  // ==========================================

  async function loadRequests() {
    if (!permissionSet.has("requests.view")) {
      allRequests = [];
      updateRequestStats();
      return;
    }

    const loading = document.getElementById("requestsLoading");
    const empty = document.getElementById("requestsEmpty");
    const container = document.getElementById("requestsTableContainer");

    if (loading) loading.style.display = "";
    if (empty) empty.style.display = "none";

    if (container) container.replaceChildren();

    const refreshButton = document.getElementById("refreshRequests");

    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = "Загрузка...";
    }

    const { data, error } = await client.rpc(
      "get_admin_requests",
      { p_limit: 100 }
    );

    if (loading) loading.style.display = "none";

    if (refreshButton) {
      refreshButton.disabled = false;
      refreshButton.textContent = "Обновить";
    }

    if (error) {
      console.error("Requests loading error:", error);

      if (container) {
        const errorMessage = createElement(
          "div",
          "empty-state",
          `Не удалось загрузить заявки: ${error.message}`
        );

        errorMessage.style.color = "#ff7373";
        container.appendChild(errorMessage);
      }

      return;
    }

    allRequests = data || [];

    updateRequestStats();
    renderDashboardRequests();
    renderRequests();

    if (
      selectedRequest &&
      document.getElementById("requestDetails")?.style.display !== "none"
    ) {
      const updated = allRequests.find(
        item => item.id === selectedRequest.id
      );

      if (updated) openRequestDetails(updated);
    }
  }

  const refreshButton = document.getElementById("refreshRequests");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadRequests);
  }

  // ==========================================
  // 13. ПЕРВИЧНЫЙ ЗАПУСК
  // ==========================================

  if (!permissionSet.has("dashboard.view")) {
    const dashboard = document.getElementById("dashboard");
    if (dashboard) dashboard.style.display = "none";
  }

  if (!permissionSet.has("requests.view")) {
    const requestsSection = document.getElementById("requests");
    if (requestsSection) requestsSection.style.display = "none";
  }

  await loadRequests();

  if (
    !permissionSet.has("dashboard.view") &&
    permissionSet.has("requests.view")
  ) {
    showSection("requests");
  } else {
    showSection("dashboard");
  }

  // ==========================================
  // 14. КОНТРОЛЬ СЕССИИ
  // ==========================================

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
  console.info("Requests:", allRequests.length);
});
