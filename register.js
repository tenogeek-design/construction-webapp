
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const message = document.getElementById("registerMessage");
  const button = document.getElementById("registerButton");

  if (!form || !message || !button) return;

  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  if (!window.supabase) {
    showMessage("Ошибка загрузки Supabase.", true);
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  function showMessage(text, error = false) {
    message.textContent = text;
    message.className = "message visible";

    if (error) {
      message.classList.add("error");
    }
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstName =
      document.getElementById("firstName").value.trim();

    const lastName =
      document.getElementById("lastName").value.trim();

    const phone =
      document.getElementById("phone").value.trim();

    const email =
      document.getElementById("email").value.trim();

    const password =
      document.getElementById("password").value;

    const passwordConfirm =
      document.getElementById("passwordConfirm").value;

    const agreement =
      document.getElementById("agreement").checked;

    if (!firstName || !lastName || !phone || !email) {
      showMessage("Заполните все обязательные поля.", true);
      return;
    }

    if (password.length < 8) {
      showMessage("Пароль должен содержать минимум 8 символов.", true);
      return;
    }

    if (password !== passwordConfirm) {
      showMessage("Пароли не совпадают.", true);
      return;
    }

    if (!agreement) {
      showMessage("Примите условия регистрации.", true);
      return;
    }

    button.disabled = true;
    button.querySelector("span").textContent = "СОЗДАЁМ АККАУНТ...";

    try {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo:
            window.location.origin + "/login.html",

          data: {
            first_name: firstName,
            last_name: lastName,
            full_name: firstName + " " + lastName,
            phone: phone
          }
        }
      });

      if (error) throw error;

      if (!data.user) {
        throw new Error("Пользователь не создан.");
      }

      // Если подтверждение email отключено,
      // завершаем сессию и предлагаем войти.
      if (data.session) {
        await client.auth.signOut();
      }

      form.reset();

      showMessage(
        data.session
          ? "Аккаунт создан! Теперь войдите через страницу авторизации."
          : "Аккаунт создан! Проверьте электронную почту и подтвердите адрес. После этого войдите в систему."
      );

    } catch (error) {
      console.error("Registration error:", error);

      const text = (error.message || "").toLowerCase();

      if (
        text.includes("already registered") ||
        text.includes("already exists")
      ) {
        showMessage("Этот email уже зарегистрирован.", true);
      } else {
        showMessage(
          error.message || "Ошибка регистрации. Попробуйте ещё раз.",
          true
        );
      }

    } finally {
      button.disabled = false;
      button.querySelector("span").textContent = "СОЗДАТЬ АККАУНТ";
    }
  });
});
