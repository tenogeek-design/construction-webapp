
"use strict";

// CONSTRUCTION GROUP
// Задания, прогресс и фотоотчёты работника.

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  if (!window.supabase) {
    console.error("Supabase не загружен");
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const card = document.querySelector(
    "#workerContent .cards .card:nth-child(2)"
  );

  if (!card) return;

  const title = card.querySelector("h3");
  if (!title) return;

  const statusNames = {
    new: "Новое",
    in_progress: "В работе",
    review: "На проверке",
    completed: "Подтверждено",
    cancelled: "Отменено"
  };

  const originalDescription = card.querySelector("p");

  if (originalDescription) {
    originalDescription.remove();
  }

  const container = document.createElement("div");
  container.id = "workerTasksContainer";
  card.appendChild(container);

  // ==========================================
  // СТИЛИ
  // ==========================================

  const style = document.createElement("style");

  style.textContent = `
    .worker-task {
      padding: 18px 0;
      border-top: 1px solid #454950;
      margin-top: 14px;
      overflow-wrap: anywhere;
    }

    .worker-task-name {
      display: block;
      font-size: 16px;
      margin-bottom: 12px;
      color: #ffffff;
    }

    .worker-task-text {
      color: #a4a7ad;
      font-size: 14px;
      line-height: 1.5;
      margin: 10px 0;
    }

    .worker-task-progress {
      width: 100%;
      height: 9px;
      background: #41464d;
      border-radius: 20px;
      overflow: hidden;
      margin: 12px 0;
    }

    .worker-task-fill {
      height: 100%;
      background: #ff812e;
      border-radius: 20px;
      transition: width 0.2s ease;
    }

    .worker-task-button {
      display: block;
      width: 100%;
      padding: 12px;
      margin-top: 12px;
      border-radius: 8px;
      border: 0;
      background: #ff812e;
      color: #111;
      font-size: 13px;
      font-weight: bold;
      cursor: pointer;
    }

    .worker-task-button:hover {
      background: #ff9a50;
    }

    .worker-task-button:disabled {
      opacity: 0.5;
      cursor: wait;
    }

    .worker-task-slider {
      width: 100%;
      margin: 14px 0;
      accent-color: #ff812e;
      cursor: pointer;
    }

    .worker-task-message {
      color: #91d6a5;
      font-size: 13px;
      line-height: 1.5;
      margin-top: 12px;
    }

    .worker-task-error {
      color: #ff938a;
    }

    .worker-task-section {
      margin-top: 20px;
      border-top: 1px solid #454950;
      padding-top: 16px;
    }

    .worker-task-photo-title {
      font-size: 15px;
      font-weight: bold;
      color: white;
    }
  `;

  document.head.appendChild(style);

  // ==========================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ==========================================

  function addText(parent, value, bold = false) {
    const element = document.createElement(
      bold ? "strong" : "p"
    );

    element.className = bold
      ? "worker-task-name"
      : "worker-task-text";

    element.textContent = value;
    parent.appendChild(element);

    return element;
  }

  function showMessage(target, text, error = false) {
    target.textContent = text;

    target.className = error
      ? "worker-task-message worker-task-error"
      : "worker-task-message";
  }

  function createButton(text, callback) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "worker-task-button";
    button.textContent = text;
    button.addEventListener("click", callback);

    return button;
  }

  function normalizeProgress(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return 0;

    return Math.max(
      0,
      Math.min(100, Math.round(number))
    );
  }

  // ==========================================
  // ИЗМЕНЕНИЕ СВОЕЙ ЗАДАЧИ
  // ==========================================

  async function updateTask(taskId, action, progress = null) {
    const { data: auth, error: authError } =
      await db.auth.getUser();

    if (authError || !auth?.user) {
      throw new Error("Войдите в аккаунт заново.");
    }

    const { data, error } = await db.rpc(
      "update_my_worker_task",
      {
        p_task_id: taskId,
        p_action: action,
        p_progress: progress
      }
    );

    if (error) throw error;

    if (!data?.success) {
      throw new Error("Не удалось обновить задание.");
    }

    return data;
  }

  // ==========================================
  // ФОТООТЧЁТ
  // ==========================================

  function mountPhotoReport(task, parent) {
    if (typeof window.CGWorkerPhotos?.mount !== "function") {
      addText(
        parent,
        "Модуль фотографий не подключён."
      );
      return;
    }

    try {
      window.CGWorkerPhotos.mount({
        db,
        task,
        actions: parent
      });
    } catch (error) {
      console.error("Photo module error:", error);

      addText(
        parent,
        "Не удалось открыть фотоотчёт."
      );
    }
  }

  // ==========================================
  // КАРТОЧКА ЗАДАНИЯ
  // ==========================================

  function renderTask(task) {
    const item = document.createElement("div");
    item.className = "worker-task";

    addText(
      item,
      task.title || "Без названия",
      true
    );

    if (task.project_name) {
      addText(
        item,
        "Объект: " + task.project_name
      );
    }

    if (task.description) {
      addText(item, task.description);
    }

    const statusLabel = addText(
      item,
      "Статус: " +
      (statusNames[task.status] || task.status)
    );

    let savedProgress = normalizeProgress(
      task.progress_percent
    );

    const progressLabel = addText(
      item,
      "Выполнено: " + savedProgress + "%"
    );

    const track = document.createElement("div");
    track.className = "worker-task-progress";

    const fill = document.createElement("div");
    fill.className = "worker-task-fill";
    fill.style.width = savedProgress + "%";

    track.appendChild(fill);
    item.appendChild(track);

    if (task.due_date) {
      addText(item, "Срок: " + task.due_date);
    }

    if (task.photo_required) {
      addText(item, "Фотоотчёт: обязателен");
    }

    const actions = document.createElement("div");
    const message = document.createElement("div");

    item.append(actions, message);

    let busy = false;

    // ========================================
    // УПРАВЛЕНИЕ СТАТУСАМИ
    // ========================================

    function renderActions() {
      actions.replaceChildren();

      statusLabel.textContent =
        "Статус: " +
        (statusNames[task.status] || task.status);

      progressLabel.textContent =
        "Выполнено: " + savedProgress + "%";

      fill.style.width = savedProgress + "%";

      // ======================================
      // НОВАЯ ЗАДАЧА
      // ======================================

      if (task.status === "new") {
        const startButton = createButton(
          "▶ Начать работу",
          async () => {
            if (busy) return;

            busy = true;
            startButton.disabled = true;

            showMessage(
              message,
              "Начинаем выполнение..."
            );

            try {
              const result = await updateTask(
                task.task_id,
                "start"
              );

              task.status = result.status;

              savedProgress = normalizeProgress(
                result.progress_percent
              );

              showMessage(
                message,
                "Работа успешно начата!"
              );

              renderActions();

            } catch (error) {
              showMessage(
                message,
                error.message || "Ошибка запуска задания.",
                true
              );

            } finally {
              busy = false;
              startButton.disabled = false;
            }
          }
        );

        actions.appendChild(startButton);
      }

      // ======================================
      // В РАБОТЕ
      // ======================================

      else if (task.status === "in_progress") {
        const slider = document.createElement("input");

        slider.type = "range";
        slider.className = "worker-task-slider";
        slider.min = String(savedProgress);
        slider.max = "100";
        slider.step = "1";
        slider.value = String(savedProgress);

        const selected = addText(
          actions,
          "Выбранный прогресс: " + savedProgress + "%"
        );

        slider.addEventListener("input", () => {
          selected.textContent =
            "Выбранный прогресс: " +
            slider.value + "%";
        });

        const saveButton = createButton(
          "✓ Сохранить прогресс",
          async () => {
            if (busy) return;

            const progress = Number(slider.value);

            if (progress < savedProgress) {
              showMessage(
                message,
                "Уменьшать прогресс нельзя.",
                true
              );
              return;
            }

            busy = true;
            saveButton.disabled = true;
            slider.disabled = true;

            showMessage(
              message,
              "Сохраняем прогресс..."
            );

            try {
              const result = await updateTask(
                task.task_id,
                "progress",
                progress
              );

              savedProgress = normalizeProgress(
                result.progress_percent
              );

              task.status = result.status;

              showMessage(
                message,
                "Прогресс успешно сохранён!"
              );

              renderActions();

            } catch (error) {
              showMessage(
                message,
                error.message ||
                "Ошибка сохранения прогресса.",
                true
              );

            } finally {
              busy = false;
              saveButton.disabled = false;
              slider.disabled = false;
            }
          }
        );

        actions.append(
          slider,
          selected,
          saveButton
        );
      }

      // ======================================
      // НА ПРОВЕРКЕ
      // ======================================

      else if (task.status === "review") {
        addText(
          actions,
          "Работа находится на проверке у прораба."
        );
      }

      // ======================================
      // ПОДТВЕРЖДЕНО
      // ======================================

      else if (task.status === "completed") {
        addText(
          actions,
          "Работа подтверждена."
        );
      }

      // ======================================
      // ОТМЕНЕНО
      // ======================================

      else if (task.status === "cancelled") {
        addText(
          actions,
          "Задание отменено."
        );
      }

      // ======================================
      // ФОТООТЧЁТ ЗАДАНИЯ
      // ======================================

      const photoSection =
        document.createElement("div");

      photoSection.className =
        "worker-task-section";

      actions.appendChild(photoSection);

      mountPhotoReport(task, photoSection);
    }

    renderActions();
    container.appendChild(item);
  }

  // ==========================================
  // ЗАГРУЗКА ЗАДАНИЙ ИЗ SUPABASE
  // ==========================================

  async function loadTasks() {
    container.textContent = "Загружаем задания...";

    try {
      const { data: auth, error: authError } =
        await db.auth.getUser();

      if (authError || !auth?.user) {
        container.textContent =
          "Войдите в аккаунт для просмотра заданий.";
        return;
      }

      const { data, error } = await db.rpc(
        "get_my_worker_tasks"
      );

      if (error) throw error;

      const tasks = Array.isArray(data) ? data : [];

      container.replaceChildren();

      addText(
        container,
        "Всего заданий: " + tasks.length
      );

      if (!tasks.length) {
        addText(
          container,
          "Назначенных заданий пока нет."
        );
        return;
      }

      tasks.forEach(renderTask);

    } catch (error) {
      console.error("Worker tasks error:", error);

      container.textContent =
        "Ошибка загрузки заданий: " +
        (error.message || "Неизвестная ошибка");
    }
  }

  await loadTasks();
});
