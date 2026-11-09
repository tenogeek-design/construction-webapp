
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

    mode = mode === "login" ? "register" : "login";

    const url = new URL(window.location.href);

    if (mode === "register") {
      url.searchParams.set("mode", "register");
    } else {
      url.searchParams.delete("mode");
    }

    window.history.replaceState({}, "", url);
    renderMode();
  });

  async function getUserRoles(userId) {
    const { data, error } = await client
      .from("app_user_roles")
      .select("role_code")
      .eq("user_id", userId)
      .is("revoked_at", null);

    if (error) throw error;

    return [...new Set(
      (data || [])
        .map(item => item.role_code)
        .filter(Boolean)
    )];
  }

  function openDestination(item) {
    window.location.replace(item.path);
  }

  function showRoleChoice(available) {
    form.hidden = true;
    switchButton.hidden = true;
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

    available.forEach(item => {
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
        openDestination(item);
      });

      container.appendChild(button);
    });

    form.after(container);
  }

  async function routeUser(user) {
    const roles = await getUserRoles(user.id);

    const available = destinations.filter(item =>
      roles.includes(item.role)
    );

    if (!available.length) {
      setMessage(
        "Аккаунт существует, но доступ ещё не назначен. " +
        "Обратитесь к администратору CONSTRUCTION GROUP."
      );
      return;
    }

    // Запрошенный кабинет доступен только с реальной ролью.
    const preferred = available.find(
      item => item.role === requestedRole
    );

    if (preferred) {
      openDestination(preferred);
      return;
    }

    if (available.length === 1) {
      openDestination(available[0]);
      return;
    }

    // Несколько ролей — пользователь выбирает кабинет.
    showRoleChoice(available);
  }

  async function signIn(email, password) {
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
  }

  async function signUp(email, password) {
    if (password.length < 6) {
      throw new Error("Пароль должен содержать минимум 6 символов.");
    }

    const options = {
      emailRedirectTo:
        window.location.origin + "/login.html"
    };

    // Только пожелание пользователя, не системная роль.
    if (roleNames[requestedRole] &&
        !["owner", "admin"].includes(requestedRole)) {
      options.data = {
        requested_role: requestedRole
      };
    }

    const { data, error } =
      await client.auth.signUp({
        email,
        password,
        options
      });

    if (error) throw error;

    if (!data?.user) {
      throw new Error("Не удалось создать аккаунт.");
    }

    if (!data.session) {
      setMessage(
        "Если регистрация принята, проверьте почту " +
        "для подтверждения email. После подтверждения " +
        "войдите в систему. Доступ назначает администратор."
      );
      return;
    }

    setMessage("Аккаунт создан. Проверяем доступ...");
    await routeUser(data.user);
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (busy) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setMessage("Введите email и пароль.");
      return;
    }

    if (mode === "register" &&
        password !== confirmInput.value) {
      setMessage("Пароли не совпадают.");
      return;
    }

    setBusy(true);
    setMessage(
      mode === "register"
        ? "Создаём аккаунт..."
        : "Проверяем данные..."
    );

    try {
      if (mode === "register") {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      console.error("Auth error:", error);
      setMessage(error.message || "Ошибка авторизации.");
    } finally {
      setBusy(false);
    }
  });

  renderMode();

  // Уже авторизованному пользователю не нужен повторный вход.
  if (mode === "login") {
    try {
      const { data, error } = await client.auth.getUser();

      if (error && error.name !== "AuthSessionMissingError") {
        console.warn("Session check:", error.message);
      }

      if (data?.user) {
        setMessage("Проверяем активную сессию...");
        await routeUser(data.user);
      }
    } catch (error) {
      console.warn("Automatic login:", error);
      setMessage("");
    }
  }
});
