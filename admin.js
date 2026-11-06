
  // Динамическое меню по разрешениям
  const permissionSet = new Set(
    (permissions || []).map(item => item.permission_code)
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
