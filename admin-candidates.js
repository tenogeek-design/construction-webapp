
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  if (!window.supabase) {
    console.error("Supabase не загружен.");
    return;
  }

  const db = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // ==========================================
  // 1. ПРОВЕРКА АВТОРИЗАЦИИ OWNER
  // ==========================================

  const { data: sessionData, error: sessionError } =
    await db.auth.getSession();

  if (sessionError || !sessionData?.session?.user) {
    return;
  }

  const user = sessionData.session.user;

  const { data: ownerRole, error: roleError } =
    await db
      .from("app_user_roles")
      .select("role_code")
      .eq("user_id", user.id)
      .eq("role_code", "owner")
      .is("revoked_at", null)
      .limit(1);

  if (roleError || !ownerRole?.length) {
    return;
  }

  // ==========================================
  // 2. ПОИСК МЕНЮ
  // ==========================================

  const nav = document.querySelector(".navigation");

  if (!nav) {
    console.error("Меню администратора не найдено.");
    return;
  }

  // ==========================================
  // 3. СТИЛИ РАЗДЕЛА КАНДИДАТОВ
  // ==========================================

  const style = document.createElement("style");

  style.textContent = `
    .cg-candidate-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #202226;
      color: #f5f5f4;
      overflow-y: auto;
      padding: 30px;
      font-family: Arial, sans-serif;
    }

    .cg-candidate-inner {
      max-width: 1100px;
      margin: 0 auto;
    }

    .cg-candidate-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 15px;
      margin-bottom: 24px;
    }

    .cg-candidate-head h2 {
      margin: 0;
    }

    .cg-candidate-btn {
      background: #30343a;
      border: 1px solid #454950;
      border-radius: 8px;
      padding: 11px 16px;
      color: white;
      cursor: pointer;
    }

    .cg-candidate-btn:hover {
      background: #41464d;
    }

    .cg-candidate-btn:disabled {
      opacity: 0.5;
      cursor: wait;
    }

    .cg-candidate-summary {
      margin: 20px 0;
      color: #d5d6da;
    }

    .cg-candidate-card {
      background: #292c31;
      border: 1px solid #3b3f46;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 14px;
      overflow-wrap: anywhere;
    }

    .cg-candidate-card h3 {
      margin: 0 0 12px;
      font-size: 18px;
      color: #fff;
    }

    .cg-candidate-field {
      margin: 9px 0;
      color: #d5d6da;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .cg-candidate-field strong {
      color: #f5f5f4;
    }

    .cg-candidate-status {
      display: inline-block;
      background: #383d48;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 15px;
      color: #a8c8ff;
      font-size: 12px;
    }

    .cg-candidate-empty {
      padding: 25px;
      background: #292c31;
      border: 1px solid #3b3f46;
      border-radius: 10px;
      color: #a4a7ad;
    }

    @media (max-width: 600px) {
      .cg-candidate-overlay {
        padding: 15px;
      }

      .cg-candidate-head {
        align-items: flex-start;
      }

      .cg-candidate-card {
        padding: 15px;
      }
    }
  `;

  document.head.appendChild(style);

  // ==========================================
  // 4. КНОПКА В МЕНЮ OWNER
  // ==========================================

  const navButton = document.createElement("button");

  navButton.type = "button";
  navButton.className = "nav-item";
  navButton.textContent = "♧ Кандидаты";

  navButton.style.cssText = `
    width: 100%;
    text-align: left;
    cursor: pointer;
    border: 0;
  `;

  nav.appendChild(navButton);

  // ==========================================
  // 5. СОЗДАЁМ РАЗДЕЛ КАНДИДАТОВ
  // ==========================================

  const overlay = document.createElement("div");
  overlay.className = "cg-candidate-overlay";
  overlay.hidden = true;
  overlay.style.display = "none";

  const inner = document.createElement("div");
  inner.className = "cg-candidate-inner";

  const head = document.createElement("div");
  head.className = "cg-candidate-head";

  const title = document.createElement("h2");
  title.textContent = "Кандидаты CONSTRUCTION GROUP";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "cg-candidate-btn";
  close.textContent = "← Назад";

  close.addEventListener("click", () => {
    overlay.hidden = true;
    overlay.style.display = "none";
  });

  head.append(title, close);

  const refresh = document.createElement("button");
  refresh.type = "button";
  refresh.className = "cg-candidate-btn";
  refresh.textContent = "Обновить заявки";

  const summary = document.createElement("p");
  summary.className = "cg-candidate-summary";

  const list = document.createElement("div");

  inner.append(head, refresh, summary, list);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  // ==========================================
  // 6. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ==========================================

  function formatValue(value) {
    if (value === null || value === undefined) {
      return "";
    }

    if (typeof value === "boolean") {
      return value ? "Да" : "Нет";
    }

    if (Array.isArray(value)) {
      return value
        .map(item => {
          if (typeof item === "object" && item !== null) {
            return JSON.stringify(item, null, 2);
          }
          return String(item);
        })
        .join(", ");
    }

    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }

    return String(value);
  }

  function addField(card, label, value) {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return;
    }

    const field = document.createElement("div");
    field.className = "cg-candidate-field";

    const strong = document.createElement("strong");
    strong.textContent = label + ": ";

    const span = document.createElement("span");
    span.textContent = formatValue(value);

    field.append(strong, span);
    card.appendChild(field);
  }

  function formatStatus(status) {
    const statuses = {
      pending: "Новая заявка",
      under_review: "На рассмотрении",
      approved: "Принята",
      rejected: "Отклонена"
    };

    return statuses[status] || status || "Новая заявка";
  }

  function formatRole(role) {
    const roles = {
      worker: "Работник",
      foreman: "Бригадир"
    };

    return roles[role] || role || "Не указано";
  }

  // ==========================================
  // 7. КАРТОЧКА КАНДИДАТА
  // ==========================================

  function renderRequest(item) {
    if (!item || typeof item !== "object") {
      return;
    }

    const card = document.createElement("div");
    card.className = "cg-candidate-card";

    const name = document.createElement("h3");
    name.textContent =
      item.full_name || "Кандидат без имени";

    const status = document.createElement("span");
    status.className = "cg-candidate-status";
    status.textContent = formatStatus(item.status);

    card.append(name, status);

    addField(card, "Email", item.email);
    addField(card, "Телефон", item.phone);

    addField(
      card,
      "Роль",
      formatRole(item.requested_role)
    );

    addField(
      card,
      "Тип сотрудничества",
      item.cooperation_type
    );

    addField(
      card,
      "Опыт работы (лет)",
      item.experience_years
    );

    addField(
      card,
      "Специализации",
      item.specialization
    );

    addField(
      card,
      "Название бригады",
      item.brigade_name
    );

    addField(
      card,
      "Количество работников",
      item.brigade_size
    );

    addField(
      card,
      "Специализации бригады",
      item.brigade_specializations
    );

    addField(
      card,
      "Есть инструменты",
      item.brigade_has_tools
    );

    addField(
      card,
      "Есть транспорт",
      item.brigade_has_transport
    );

    addField(
      card,
      "Состав бригады",
      item.brigade_members_data
    );

    addField(
      card,
      "Дополнительная информация",
      item.additional_info
    );

    addField(
      card,
      "Комментарий проверки",
      item.review_comment
    );

    if (item.created_at) {
      const timestamp = new Date(item.created_at);

      if (!Number.isNaN(timestamp.getTime())) {
        addField(
          card,
          "Дата заявки",
          timestamp.toLocaleString("ru-RU", {
            timeZone: "Europe/Warsaw"
          })
        );
      }
    }

    // Действия доступны только для новых заявок.
    if (
      item.status === "pending" ||
      item.status === "under_review"
    ) {
      const actions = document.createElement("div");

      actions.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 20px;
      `;

      const approveButton = document.createElement("button");
      approveButton.type = "button";
      approveButton.className = "cg-candidate-btn";
      approveButton.textContent = "✓ Принять";
      approveButton.style.background = "#206c4d";

      const rejectButton = document.createElement("button");
      rejectButton.type = "button";
      rejectButton.className = "cg-candidate-btn";
      rejectButton.textContent = "✕ Отклонить";
      rejectButton.style.background = "#793737";

      if (item.applicant_user_id === user.id) {
        approveButton.disabled = true;
        approveButton.title =
          "Нельзя принять заявку аккаунта OWNER";
      }

      approveButton.addEventListener("click", () => {
        reviewCandidate(item, "approved");
      });

      rejectButton.addEventListener("click", () => {
        reviewCandidate(item, "rejected");
      });

      actions.append(approveButton, rejectButton);
      card.appendChild(actions);
    }

    list.appendChild(card);
  }

  // ==========================================
  // 8. ЗАГРУЗКА ЗАЯВОК ИЗ API
  // ==========================================

  async function loadRequests() {
    summary.textContent = "Загрузка заявок...";
    list.replaceChildren();

    refresh.disabled = true;

    try {
      const { data, error } =
        await db.auth.getSession();

      if (
        error ||
        !data?.session?.access_token
      ) {
        throw new Error(
          "Сессия завершена. Войдите заново."
        );
      }

      const response = await fetch(
        "/api/company-join-list",
        {
          method: "GET",
          headers: {
            Authorization:
              "Bearer " + data.session.access_token
          },
          cache: "no-store"
        }
      );

      const raw = await response.text();

      let result;

      try {
        result = JSON.parse(raw);
      } catch {
        throw new Error(
          "API вернул неверный формат ответа. " +
          "Проверьте публикацию Vercel."
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          result.message ||
          "Ошибка получения заявок"
        );
      }

      // ВАЖНО:
      // Наш сервер возвращает applications.
      // Поэтому читаем именно это поле.

      const requests = Array.isArray(result.applications)
        ? result.applications
        : [];

      // ======================================
      // 9. СТАТИСТИКА
      // ======================================

      const total =
        result.statistics?.total ?? requests.length;

      summary.textContent =
        "Всего заявок: " + total;

      // ======================================
      // 10. ОТОБРАЖЕНИЕ КАРТОЧЕК
      // ======================================

      if (requests.length === 0) {
        const empty = document.createElement("div");
        empty.className = "cg-candidate-empty";
        empty.textContent = "Заявок пока нет.";

        list.appendChild(empty);
        return;
      }

      requests.forEach(renderRequest);

      console.log(
        "CONSTRUCTION GROUP candidates loaded:",
        requests.length
      );

    } catch (err) {
      console.error(
        "Candidate loading error:",
        err
      );

      summary.textContent =
        "Ошибка: " +
        (err.message || "Неизвестная ошибка");

    } finally {
      refresh.disabled = false;
    }
  }

  // ==========================================
  // 11. ОБНОВЛЕНИЕ И ОТКРЫТИЕ
  // ==========================================

  refresh.addEventListener(
    "click",
    loadRequests
  );

  navButton.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();

    overlay.hidden = false;
    overlay.style.display = "block";

    loadRequests();
  });
});
