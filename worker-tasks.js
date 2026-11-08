
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  if (!window.supabase) return;

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // Вторая карточка — "Мои задания".
  const card = document.querySelector(
    "#workerContent .cards .card:nth-child(2)"
  );

  if (!card) return;

  const description = card.querySelector("p");

  const statusNames = {
    new: "Новое",
    pending: "Ожидает",
    in_progress: "В работе",
    completed: "Выполнено",
    submitted: "На проверке",
    approved: "Подтверждено",
    rejected: "Возвращено на доработку"
  };

  function addText(parent, value, bold = false) {
    const element = document.createElement(
      bold ? "strong" : "p"
    );

    element.textContent = value;
    parent.appendChild(element);
    return element;
  }

  function showError(text) {
    if (description) {
      description.textContent = text;
    }
  }

  if (description) {
    description.textContent = "Загружаем задания...";
  }

  try {
    const { data: auth, error: authError } =
      await db.auth.getUser();

    if (authError || !auth?.user) {
      showError("Войдите для просмотра заданий.");
      return;
    }

    const { data, error } = await db.rpc(
      "get_my_worker_tasks"
    );

    if (error) throw error;

    const tasks = Array.isArray(data) ? data : [];

    if (description) description.remove();

    addText(card, "Всего заданий: " + tasks.length);

    if (!tasks.length) {
      addText(card, "Назначенных заданий пока нет.");
      return;
    }

    tasks.forEach(task => {
      const item = document.createElement("div");

      item.style.cssText = `
        padding: 16px 0;
        border-top: 1px solid #454950;
        margin-top: 12px;
        overflow-wrap: anywhere;
      `;

      addText(item, task.title || "Без названия", true);

      if (task.project_name) {
        addText(item, "Объект: " + task.project_name);
      }

      if (task.description) {
        addText(item, task.description);
      }

      addText(
        item,
        "Статус: " +
        (statusNames[task.status] || task.status || "Не указан")
      );

      const progress = Number(task.progress_percent);
      const percent = Number.isFinite(progress)
        ? Math.min(100, Math.max(0, progress))
        : 0;

      addText(item, "Выполнено: " + percent + "%");

      const track = document.createElement("div");
      track.style.cssText = `
        height: 8px;
        background: #41464d;
        border-radius: 20px;
        overflow: hidden;
        margin: 10px 0;
      `;

      const fill = document.createElement("div");
      fill.style.cssText = `
        height: 100%;
        width: ${percent}%;
        background: #ff812e;
        border-radius: 20px;
      `;

      track.appendChild(fill);
      item.appendChild(track);

      if (task.due_date) {
        addText(item, "Срок: " + task.due_date);
      }

      if (task.photo_required) {
        addText(item, "Фотоотчёт: обязателен");
      }

      card.appendChild(item);
    });

  } catch (error) {
    console.error("Worker tasks error:", error);

    showError(
      "Ошибка загрузки заданий: " +
      (error.message || "Неизвестная ошибка")
    );
  }
});
