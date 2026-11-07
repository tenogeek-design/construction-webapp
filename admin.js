
  // ==========================================
  // 3. ПРАВА ДОСТУПА
  // ==========================================

  const permissionList =
    typeof permissions !== "undefined" &&
    Array.isArray(permissions)
      ? permissions
      : [];

  const permissionsLoaded = permissionList.length > 0;

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

  function isSectionAllowed(section) {
    const requiredPermission = menuPermissions[section];

    // Временный режим, пока загрузка прав не восстановлена.
    // Это НЕ серверная проверка доступа.
    if (!permissionsLoaded) {
      return true;
    }

    return !requiredPermission ||
      permissionSet.has(requiredPermission);
  }

  // Показываем только разрешённые пункты меню
  navItems.forEach(item => {
    const href = item.getAttribute("href") || "";

    const section = (
      href.split("#")[1] ||
      item.dataset.section ||
      ""
    ).toLowerCase();

    item.style.display =
      isSectionAllowed(section) ? "" : "none";
  });

  // ==========================================
  // 3.1. НАВИГАЦИЯ
  // ==========================================

  function openAdminSection(sectionName) {
    const section = String(sectionName || "dashboard")
      .replace(/^#/, "")
      .toLowerCase();

    if (!isSectionAllowed(section)) {
      console.warn("Нет доступа к разделу:", section);
      return;
    }

    const target = document.getElementById(section);

    if (
      !target ||
      !target.classList.contains("dashboard-section")
    ) {
      console.warn(
        "Раздел отсутствует в admin.html:",
        section
      );
      return;
    }

    // Переключаем страницы
    document.querySelectorAll(".dashboard-section")
      .forEach(page => {
        page.style.display =
          page.id === section ? "block" : "none";
      });

    // Подсвечиваем активный пункт меню
    navItems.forEach(item => {
      const href = item.getAttribute("href") || "";

      item.classList.toggle(
        "active",
        href === "#" + section
      );
    });

    // Обновляем заголовок
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

    const pageTitle = document.getElementById("pageTitle");

    if (pageTitle) {
      pageTitle.textContent =
        titles[section] || "Панель управления";
    }

    window.scrollTo(0, 0);
  }

  // Обработка нажатий
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

  // Переключение через адресную строку
  window.addEventListener("hashchange", () => {
    openAdminSection(
      window.location.hash.slice(1) || "dashboard"
    );
  });

  // Начальная страница
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

    if (className) {
      element.className = className;
    }

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
