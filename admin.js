
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

    if (!target || !target.classList.contains("dashboard-section")) {
      console.warn("Раздел отсутствует:", section);
      return;
    }

    document.querySelectorAll(".dashboard-section")
      .forEach(page => {
        page.style.display =
          page.id === section ? "block" : "none";
      });

    navItems.forEach(item => {
      item.classList.toggle(
        "active",
        item.getAttribute("href") === "#" + section
      );
    });

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
      const titles = {
        dashboard: "Панель управления",
        requests: "Заявки клиентов",
        payroll: "Зарплаты",
        finance: "Финансы",
        time: "Учёт времени"
      };

      pageTitle.textContent =
        titles[section] || "CONSTRUCTION GROUP";
    }

    window.scrollTo(0, 0);
  }

  navItems.forEach(item => {
    item.addEventListener("click", event => {
      const href = item.getAttribute("href") || "";

      if (!href.startsWith("#")) return;

      event.preventDefault();

      const section = href.slice(1);

      if (window.location.hash === href) {
        openAdminSection(section);
      } else {
        window.location.hash = href;
      }
    });
  });

  window.addEventListener("hashchange", () => {
    openAdminSection(
      window.location.hash.slice(1) || "dashboard"
    );
  });

  openAdminSection(
    window.location.hash.slice(1) || "dashboard"
  );


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
