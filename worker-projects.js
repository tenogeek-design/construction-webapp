
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

  // Первая карточка кабинета — Мои объекты
  const card = document.querySelector(
    "#workerContent .cards .card:first-child"
  );

  if (!card) return;

  const content = card.querySelector("p");
  if (!content) return;

  content.textContent = "Загружаем ваши объекты...";

  try {
    const { data: auth, error: authError } =
      await db.auth.getUser();

    if (authError || !auth?.user) {
      content.textContent =
        "Войдите в аккаунт для просмотра объектов.";
      return;
    }

    const { data, error } = await db.rpc(
      "get_my_worker_projects"
    );

    if (error) throw error;

    const projects = Array.isArray(data) ? data : [];

    if (!projects.length) {
      content.textContent =
        "Вы пока не назначены ни на один объект.";
      return;
    }

    // Убираем текст-заглушку.
    content.remove();

    const count = document.createElement("p");
    count.textContent =
      "Назначенных объектов: " + projects.length;
    card.appendChild(count);

    projects.forEach(project => {
      const item = document.createElement("div");

      item.style.cssText = `
        padding: 14px 0;
        margin-top: 12px;
        border-top: 1px solid #454950;
      `;

      const name = document.createElement("strong");
      name.textContent =
        project.project_name || "Без названия";

      const address = document.createElement("p");

      address.textContent = [
        project.city,
        project.street,
        project.building_number
      ].filter(Boolean).join(", ");

      const status = document.createElement("p");
      status.textContent =
        "Статус: " +
        (project.project_status || "Не указан");

      const assigned = document.createElement("p");
      assigned.textContent =
        "Назначен: " +
        (project.assigned_at || "Дата не указана");

      item.append(name, address, status, assigned);
      card.appendChild(item);
    });

  } catch (error) {
    console.error("Worker projects:", error);

    content.textContent =
      "Ошибка загрузки объектов: " +
      (error.message || "Неизвестная ошибка");
  }
});
