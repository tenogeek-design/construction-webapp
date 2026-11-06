"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("loginForm");
  const message = document.getElementById("loginMessage");

  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    message.textContent =
      "Авторизация ещё не подключена. Скоро здесь будет вход в систему.";

  });
});
