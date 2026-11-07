"use strict";

// CONSTRUCTION GROUP — кабинет бригадира, задачи 2.0 (безопасный этап чтения)
// Серверные RLS-политики должны ограничивать доступ к tasks и projects.
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.getElementById("foremanTasksSection");
  if (!root) return;
  const list = document.getElementById("foremanTasksList");
  const message = document.getElementById("foremanTasksMessage");
  const projectFilter = document.getElementById("foremanTasksProject");
  const statusFilter = document.getElementById("foremanTasksStatus");
  const refresh = document.getElementById("foremanRefreshTasks");
  const total = document.getElementById("foremanTasksTotal");
  const active = document.getElementById("foremanTasksActive");
  const review = document.getElementById("foremanTasksReview");
  const completed = document.getElementById("foremanTasksCompleted");
  const statusNames = {
    new: "Новая", planned: "Запланирована", pending: "Новая",
    in_progress: "В работе", active: "В работе",
    review: "На проверке", in_review: "На проверке", pending_review: "На проверке",
    completed: "Завершена", approved: "Утверждена", done: "Завершена",
    rejected: "Возвращена", cancelled: "Отменена"
  };
  const $ = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = String(text);
    if (className) element.className = className;
    return element;
  };
  if (!window.supabase) {
    message.textContent = "Supabase не загрузился.";
    return;
  }
  const client = window.supabase.createClient(
    "https://yepxskcfxyiyqqhmdpve.supabase.co",
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH"
  );
  let tasks = [];
  let projectNames = new Map();
  let isLoading = false;
  const textStatus = s => statusNames[s] || s || "Не указан";
  const isActive = s => ["in_progress", "active"].includes(s);
  const isReview = s => ["review", "in_review", "pending_review"].includes(s);
  const isCompleted = s => ["completed", "approved", "done"].includes(s);
  const formatDate = s => s ? String(s).split("-").reverse().join(".") : "Без срока";

  function render() {
    const project = projectFilter.value;
    const status = statusFilter.value;
    const filtered = tasks.filter(t =>
      (!project || t.project_id === project) && (!status || t.status === status)
    );
    total.textContent = tasks.length;
    active.textContent = tasks.filter(t => isActive(t.status)).length;
    review.textContent = tasks.filter(t => isReview(t.status)).length;
    completed.textContent = tasks.filter(t => isCompleted(t.status)).length;
    list.replaceChildren();
    if (!filtered.length) {
      list.appendChild($("div", "По выбранным условиям задач нет.", "empty-state"));
      return;
    }
    for (const task of filtered) {
      const card = $("article", undefined, "foreman-task-item");
      const title = $("h3", task.title || "Без названия");
      const info = $("p", `${projectNames.get(task.project_id) || "Объект"} · ${textStatus(task.status)} · Срок: ${formatDate(task.due_date)}`, "muted");
      card.append(title, info);
      if (task.description) card.appendChild($("p", task.description));
      const details = $("p", `Приоритет: ${task.priority || "обычный"} · Фотоотчёт: ${task.photo_required ? "обязателен" : "необязателен"}`, "muted");
      card.appendChild(details);
      list.appendChild(card);
    }
  }

  async function load() {
    if (isLoading) return;
    isLoading = true;
    refresh.disabled = true;
    message.textContent = "Загружаем задачи...";
    try {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (userError || !userData?.user) throw new Error("Войдите в кабинет через страницу авторизации.");

      // RPC возвращает объекты, назначенные бригадиру. Не полагаемся на фильтр UI.
      const { data: assigned, error: projectError } = await client.rpc("get_my_expense_projects");
      if (projectError) throw projectError;
      const projects = Array.isArray(assigned) ? assigned : [];
      projectNames = new Map(projects.map(p => [p.project_id, p.project_name]));
      const allowedIds = [...projectNames.keys()].filter(Boolean);
      const previousProject = projectFilter.value;
      projectFilter.replaceChildren(new Option("Все мои объекты", ""));
      projects.forEach(p => projectFilter.appendChild(new Option(p.project_name || p.project_id, p.project_id)));
      if (allowedIds.includes(previousProject)) projectFilter.value = previousProject;
      if (!allowedIds.length) {
        tasks = [];
        render();
        message.textContent = "Назначенных объектов пока нет.";
        return;
      }

      // Даже с ID своих объектов Supabase RLS обязан запрещать чужие задачи.
      const { data, error } = await client.from("tasks")
        .select("id,project_id,title,description,priority,status,due_date,photo_required,brigade_id,assigned_employee_id")
        .in("project_id", allowedIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      tasks = Array.isArray(data) ? data : [];
      render();
      message.textContent = `Загружено задач: ${tasks.length}. Доступ определяется политиками Supabase.`;
    } catch (error) {
      tasks = [];
      render();
      message.textContent = "Ошибка загрузки задач: " + (error.message || "неизвестная ошибка");
    } finally {
      isLoading = false;
      refresh.disabled = false;
    }
  }
  projectFilter.addEventListener("change", render);
  statusFilter.addEventListener("change", render);
  refresh.addEventListener("click", load);
  await load();
});
