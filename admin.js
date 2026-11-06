// ==========================================
// 6. ПЕРЕКЛЮЧЕНИЕ РАЗДЕЛОВ
// ==========================================
const navItems = document.querySelectorAll(".nav-item");

const sectionTitles = {
  dashboard: "Панель управления",
  requests: "Заявки",
  finance: "Финансы компании"
};

function showSection(sectionName) {
  const requiredPermission = menuPermissions[sectionName];

  if (
    !Object.hasOwn(sectionTitles, sectionName) ||
    (requiredPermission && !permissionSet.has(requiredPermission))
  ) {
    return;
  }

  // Скрываем остальные разделы
  ["dashboard", "requests", "finance"].forEach(name => {
    const section = document.getElementById(name);

    if (section) {
      section.style.display =
        name === sectionName ? "" : "none";
    }
  });

  // Подсветка выбранного пункта
  navItems.forEach(item => {
    const href = item.getAttribute("href") || "";
    const name = href.split("#")[1];

    item.classList.toggle(
      "active",
      name === sectionName
    );
  });

  // Заголовок страницы
  const pageTitle = document.getElementById("pageTitle");

  if (pageTitle) {
    pageTitle.textContent = sectionTitles[sectionName];
  }

  // Обновляем таблицу заявок
  if (sectionName === "requests") {
    renderRequests();
  }
}

// Обработчики меню
navItems.forEach(item => {
  item.addEventListener("click", event => {
    const href = item.getAttribute("href") || "";
    const section = href.split("#")[1];

    if (Object.hasOwn(sectionTitles, section)) {
      event.preventDefault();
      showSection(section);
    }
  });
});
