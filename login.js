
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const emailInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form || !message || !emailInput ||
      !passwordInput || !submitButton) return;

  if (!window.supabase) {
    message.textContent = "Не удалось загрузить Supabase.";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const destinations = [
    { role: "owner", title: "Владелец", path: "/admin.html" },
    { role: "admin", title: "Администратор", path: "/admin.html" },
    { role: "foreman", title: "Бригадир", path: "/foreman.html" },
    { role: "worker", title: "Исполнитель", path: "/worker.html" },
    { role: "client", title: "Заказчик", path: "/client.html" }
  ];

  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get("role");
  const initialMode = params.get("mode");

  let mode = initialMode === "register" ? "register" : "login";
  let busy = false;

  const heading = document.querySelector(".login-heading h2");
  const description = document.querySelector(".login-heading p");

  // Дополнительное поле регистрации
  const confirmLabel = document.createElement("label");
  confirmLabel.htmlFor = "confirmPassword";
  confirmLabel.textContent = "Повторите пароль";

  const confirmInput = document.createElement("input");
  confirmInput.id = "confirmPassword";
  confirmInput.type = "password";
  confirmInput.autocomplete = "new-password";
  confirmInput.placeholder = "Повторите пароль";

  passwordInput.after(confirmLabel, confirmInput);

  // Переключатель входа и регистрации
  const switchButton = document.createElement("button");
  switchButton.type = "button";
  switchButton.id = "authSwitch";
  switchButton.style.cssText = [
    "background:transparent",
    "border:1px solid #516273",
    "color:#dce8f3",
    "padding:12px",
    "width:100%",
    "margin-top:14px",
    "cursor:pointer",
    "border-radius:8px",
    "font:inherit"
  ].join(";");

  form.after(switchButton);

  const roleHint = document.createElement("p");
  roleHint.style.cssText =
    "font-size:12px;color:#a9bbc9;margin:12px 0;text-align:center";

  form.before(roleHint);

  const roleNames = {
    owner: "владельца",
    admin: "администратора",
    foreman: "бригадира",
    worker: "исполнителя",
    client: "заказчика"
  };

  function setMessage(text) {
    message.textContent = text;
  }

  function setBusy(value) {
    busy = value;
    submitButton.disabled = value;
    switchButton.disabled = value;
  }

  function renderMode() {
    const registering = mode === "register";

    if (heading) {
      heading.textContent = registering
        ? "Создать аккаунт"
        : "Добро пожаловать";
    }

    if (description) {
      description.textContent = registering
        ? "Регистрация в CONSTRUCTION GROUP"
        : "Войдите в рабочую систему компании";
    }

    confirmLabel.hidden = !registering;
    confirmInput.hidden = !registering;
    confirmInput.required = registering;

    passwordInput.autocomplete = registering
      ? "new-password"
      : "current-password";

    submitButton.textContent = registering
      ? "Зарегистрироваться →"
      : "Войти в систему →";

    switchButton.textContent = registering
      ? "Уже есть аккаунт? Войти"
      : "Нет аккаунта? Регистрация";

    roleHint.textContent = roleNames[requestedRole]
      ? "Выбран кабинет " + roleNames[requestedRole]
      : "";

    setMessage("");
  }

switchButton.addEventListener("click", () => {
  if (busy) return;

  const allowedRoles = ["client", "worker", "foreman"];

  const role = allowedRoles.includes(requestedRole)
    ? requestedRole
    : "client";

  window.location.href = "/register.html?role=" + role;
});
