
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
      const { data, error } =
        await client.auth.signInWithPassword({
          email,
          password
        });

      if (error) throw error;

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

      let destination = null;

      // Владелец и администратор
      if (
        roles.includes("owner") ||
        roles.includes("admin")
      ) {
        destination = "/admin.html";
      }

      // Бригадир
      else if (roles.includes("foreman")) {
        destination = "/foreman.html";
      }

      // Остальные роли пока не имеют кабинета
      if (!destination) {
        await client.auth.signOut();

        throw new Error(
          "Для вашей роли кабинет пока недоступен."
        );
      }

      window.location.replace(destination);

    } catch (error) {
      message.textContent =
        error.message || "Ошибка авторизации.";
    } finally {
      button.disabled = false;
    }
  });
});
