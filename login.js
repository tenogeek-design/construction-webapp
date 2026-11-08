
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");
  const button = form?.querySelector('button[type="submit"]');

  if (!form || !message || !button) return;

  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  if (!window.supabase) {
    message.textContent = "Не удалось загрузить Supabase.";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  let busy = false;

  // Основной кабинет выбирается по приоритету.
  // Пользователь может сохранять несколько ролей.
  const destinations = [
    { role: "owner", path: "/admin.html" },
    { role: "admin", path: "/admin.html" },
    { role: "foreman", path: "/foreman.html" },
    { role: "worker", path: "/worker.html" },
    { role: "client", path: "/client.html" }
  ];

  function getDestination(roles) {
    const match = destinations.find(item =>
      roles.includes(item.role)
    );

    return match?.path || null;
  }

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

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (busy) return;

    const email = document
      .getElementById("username")
      .value.trim();

    const password = document
      .getElementById("password")
      .value;

    if (!email || !password) {
      message.textContent =
        "Введите электронную почту и пароль.";
      return;
    }

    busy = true;
    button.disabled = true;
    message.textContent = "Проверяем данные...";

    try {
      // 1. Авторизация Supabase
      const { data, error } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      if (!data?.user) {
        throw new Error("Не удалось получить пользователя.");
      }

      // 2. Получаем действующие роли
      const roles = await getUserRoles(data.user.id);

      console.log("Active user roles:", roles);

      // 3. Выбираем основной кабинет
      const destination = getDestination(roles);

      if (!destination) {
        message.textContent =
          "Аккаунт создан, но доступ ещё не назначен. " +
          "Обратитесь к администратору CONSTRUCTION GROUP.";
        return;
      }

      // 4. Перенаправление
      message.textContent =
        "Авторизация успешна. Открываем кабинет...";

      window.location.replace(destination);

    } catch (error) {
      console.error("Login error:", error);

      message.textContent =
        error.message || "Ошибка входа.";

    } finally {
      busy = false;
      button.disabled = false;
    }
  });
});
