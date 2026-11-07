
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document
      .getElementById("username")
      .value.trim();

    const password = document
      .getElementById("password")
      .value;

    message.textContent = "Проверяем данные...";
    button.disabled = true;

    try {
      // 1. Авторизация
      const { data, error } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

      // 2. Получаем активные роли пользователя
      const { data: roleData, error: roleError } =
        await client
          .from("app_user_roles")
          .select("role_code")
          .eq("user_id", data.user.id)
          .is("revoked_at", null);

      if (roleError) throw roleError;

      const roles = (roleData || []).map(
        role => role.role_code
      );

      // 3. Определяем кабинет
      let destination = null;

      // Владелец и администратор
      if (
        roles.includes("owner") ||
        roles.includes("admin")
      ) {
        destination = "/admin.html";
      }

      // Прораб
      else if (roles.includes("foreman")) {
        destination = "/foreman.html";
      }

      // Заказчик
      else if (roles.includes("client")) {
        destination = "/client.html";
      }

      // Работник — кабинет создадим следующим этапом
      else if (roles.includes("worker")) {
        message.textContent =
          "Аккаунт работника активен. Кабинет находится в разработке.";
        return;
      }

      // Неизвестная роль
      if (!destination) {
        throw new Error(
          "Для вашего аккаунта не назначена активная роль. Обратитесь к администратору."
        );
      }

      // 4. Переход в нужный кабинет
      message.textContent = "Вход выполнен. Открываем кабинет...";

      window.location.replace(destination);

    } catch (error) {
      console.error("Login error:", error);

      message.textContent =
        error.message || "Ошибка авторизации.";

    } finally {
      button.disabled = false;
    }
  });
});
