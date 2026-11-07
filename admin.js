
  const permissionList = permissions || [];

  const permissionSet = new Set(
    permissionList.map(item => item.permission_code)
  );

  function hasPermission(code) {
    return permissionList.some(item =>
      item.permission_code === code &&
      item.scope === "all"
    );
  }

  const canUpdateRequests = hasPermission("requests.update");
  const canApproveRequests = hasPermission("requests.approve");

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
  // 3.1. НАВИГАЦИЯ
  // ==========================================

  function openAdminSection(sectionName) {
    const section = String(sectionName || "dashboard")
      .replace(/^#/, "")
      .toLowerCase();

    const requiredPermission = menuPermissions[section];

    if (
      requiredPermission &&
      !permissionSet.has(requiredPermission)
    ) {
      console.warn("Нет доступа к разделу:", section);
      return;
    }

    const target = document.getElementById(section);

    if (!target) {
      console.warn(
        "Раздел не найден в admin.html:",
        section
      );
      return;
    }

    navItems.forEach(item => {
      const href = item.getAttribute("href") || "";
      const itemSection = (
        href.split("#")[1] ||
        item.dataset.section ||
        ""
      ).toLowerCase();

      item.classList.toggle(
        "active",
        itemSection === section
      );
    });

    // Не скрываем другие разделы, так как
    // их отображением может управлять
    // существующий код админ-панели.
    target.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  navItems.forEach(item => {
    item.addEventListener("click", event => {
      const href = item.getAttribute("href") || "";

      if (!href.startsWith("#")) return;

      const section = href.slice(1).toLowerCase();

      if (!document.getElementById(section)) {
        console.warn(
          "Не найден HTML-раздел для меню:",
          section
        );
        return;
      }

      event.preventDefault();

      if (window.location.hash !== href) {
        window.location.hash = href;
      } else {
        openAdminSection(section);
      }
    });
  });

  window.addEventListener("hashchange", () => {
    const section = window.location.hash.slice(1);
    if (section) openAdminSection(section);
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
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "Не указано";
    }

    if (typeof value === "boolean") {
      return value ? "Да" : "Нет";
    }

    if (Array.isArray(value)) {
      return value.length
        ? value.join(", ")
        : "Не указано";
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
