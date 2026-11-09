
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL = "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const SUPABASE_KEY = "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const emailInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const submitButton = form?.querySelector('button[type="submit"]');

  if (!form || !message || !emailInput || !passwordInput || !submitButton) {
    console.error("Не найдены элементы формы входа в login.html");
    return;
  }

  if (!window.supabase) {
    message.textContent = "Не удалось загрузить Supabase. Обновите страницу.";
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get("role");

  const destinations = [
    { role: "owner", title: "Владелец", path: "/admin.html" },
    { role: "admin", title: "Администратор", path: "/admin.html" },
    { role: "foreman", title: "Бригадир", path: "/foreman.html" },
    { role: "worker", title: "Исполнитель", path: "/worker.html" },
    { role: "client", title: "Заказчик", path: "/client.html" }
  ];

  const roleNames = {
    owner: "владельца",
    admin: "администратора",
    foreman: "бригадира",
    worker: "исполнителя",
    client: "заказчика"
  };

  const heading = document.querySelector(".login-heading h2");
  const description = document.querySelector(".login-heading p");

  let busy = false;

  if (heading) heading.textContent = "Добро пожаловать";

  if (description) {
    description.textContent = "Войдите в рабочую систему компании";
  }

  submitButton.textContent = "Войти в систему →";

  // Подпись выбранного кабинета
  const roleHint = document.createElement("p");

  roleHint.style.cssText =
    "font-size:12px;color:#a9bbc9;margin:12px 0;text-align:center";

  roleHint.textContent = roleNames[requestedRole]
    ? "Выбран кабинет " + roleNames[requestedRole]
    : "";

  form.before(roleHint);

  // Кнопка перехода к полноценной регистрации
  const registerButton = document.createElement("button");

  registerButton.type = "button";
  registerButton.id = "authSwitch";
  registerButton.textContent = "Нет аккаунта? Регистрация";

  registerButton.style.cssText = [
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

  form.after(registerButton);

  function setMessage(text) {
    message.textContent = text;
  }

  function setBusy(value) {
    busy = value;

    submitButton.disabled = value;
    registerButton.disabled = value;

    submitButton.textContent = value
      ? "Проверяем вход..."
      : "Войти в систему →";
  }

  // Регистрация всегда через register.html
  registerButton.addEventListener("click", () => {
    if (busy) return;

    const allowedRoles = ["client", "worker", "foreman"];

    const role = allowedRoles.includes(requestedRole)
      ? requestedRole
      : "client";

    window.location.assign("/register.html?role=" + role);
  });

  // Получаем только реально назначенные роли
  async function getUserRoles(userId) {
    const { data, error } = await client
      .from("app_user_roles")
      .select("role_code")
      .eq("user_id", userId)
      .is("revoked_at", null);

    if (error) throw error;

    return [...new Set(
      (data || [])
        .map(row => row.role_code)
        .filter(Boolean)
    )];
  }

  // Выбор кабинета, если ролей несколько
  function showRoleChoice(available) {
    form.hidden = true;
    registerButton.hidden = true;
    roleHint.hidden = true;

    if (heading) heading.textContent = "Выберите кабинет";

    if (description) {
      description.textContent =
        "У вас есть несколько доступных ролей";
    }

    setMessage("");

    const container = document.createElement("div");

    container.style.cssText =
      "display:grid;gap:10px;margin-top:20px";

    for (const item of available) {
      const button = document.createElement("button");

      button.type = "button";
      button.textContent = item.title + " →";

      button.style.cssText = [
        "padding:14px",
        "border:1px solid #5082a5",
        "border-radius:8px",
        "background:#17232f",
        "color:#fff",
        "cursor:pointer",
        "font:inherit"
      ].join(";");

      button.addEventListener("click", () => {
        window.location.assign(item.path);
      });

      container.appendChild(button);
    }

    form.after(container);
  }

  // Направляем пользователя в правильный кабинет
  async function routeUser(user) {
    const roles = await getUserRoles(user.id);

    const available = destinations.filter(item =>
      roles.includes(item.role)
    );

    if (available.length === 0) {
      setMessage(
        "Аккаунт существует, но доступ ещё не назначен. " +
        "Обратитесь к администратору CONSTRUCTION GROUP."
      );
      return;
    }

    // OWNER всегда попадает в панель владельца
    const owner = available.find(item => item.role === "owner");

    if (owner) {
      window.location.assign(owner.path);
      return;
    }

    // Запрошенный кабинет — только если есть такая роль
    const preferred = available.find(
      item => item.role === requestedRole
    );

    if (preferred) {
      window.location.assign(preferred.path);
      return;
    }

    // Одна роль — открываем её кабинет
    if (available.length === 1) {
      window.location.assign(available[0].path);
      return;
    }

    // Несколько ролей — показываем выбор
    showRoleChoice(available);
  }

  // Авторизация
  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (busy) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setMessage("Введите email и пароль.");
      return;
    }

    setBusy(true);
    setMessage("Проверяем данные...");

    try {
      const { data, error } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      if (!data?.user) {
        throw new Error("Не удалось получить пользователя.");
      }

      setMessage("Вход выполнен. Проверяем права доступа...");

      await routeUser(data.user);

    } catch (error) {
      console.error("Login error:", error);

      setMessage(
        error.message || "Ошибка входа."
      );

    } finally {
      setBusy(false);
    }
  });
});
