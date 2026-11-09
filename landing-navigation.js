
"use strict";

// CONSTRUCTION GROUP — MAIN NAVIGATION
// Подключается после landing-premium.js.

document.addEventListener("DOMContentLoaded", () => {
  const LOGIN = "/login.html";

  const links = {
    login: LOGIN,
    register: LOGIN + "?mode=register",
    foreman: LOGIN + "?role=foreman",
    worker: LOGIN + "?role=worker",
    client: LOGIN + "?role=client"
  };

  function updateLink(element, url) {
    if (!element) return;

    element.setAttribute("href", url);
  }

  // 1. Кнопка входа
  document.querySelectorAll(
    'a[href="/login.html"]'
  ).forEach(element => {
    updateLink(element, links.login);
  });

  // 2. Кнопка регистрации
  document.querySelectorAll(
    ".lg-header-register"
  ).forEach(element => {
    updateLink(element, links.register);
  });

  // 3. Кнопки ролей
  const roleLinks = document.querySelectorAll(
    "#cgLanding .lg-role"
  );

  const roleOrder = [
    "foreman",
    "worker",
    "client"
  ];

  roleLinks.forEach((element, index) => {
    const role = roleOrder[index];

    if (role && links[role]) {
      updateLink(element, links[role]);
    }
  });

  // 4. Переход на регистрацию
  document.querySelectorAll(
    'a[href="/register.html"]'
  ).forEach(element => {
    if (
      element.classList.contains("lg-role") ||
      element.classList.contains("lg-header-register")
    ) {
      return;
    }

    updateLink(element, links.register);
  });

  // 5. Кнопка личного кабинета
  const cabinetLink = document.querySelector(
    "#cgLanding .lg-footer a"
  );

  updateLink(cabinetLink, links.login);

  console.info(
    "CONSTRUCTION GROUP: navigation initialized"
  );
});
