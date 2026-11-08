
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

  const { data: sessionData } = await db.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user) return;

  // Кнопку показываем только OWNER.
  // Сам API также независимо проверяет роль.
  const { data: ownerRole, error: roleError } = await db
    .from("app_user_roles")
    .select("role_code")
    .eq("user_id", user.id)
    .eq("role_code", "owner")
    .is("revoked_at", null)
    .limit(1);

  if (roleError || !ownerRole?.length) return;

  const nav = document.querySelector(".navigation");
  if (!nav) return;

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
      margin: auto;
    }

    .cg-candidate-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
      margin-bottom: 24px;
    }

    .cg-candidate-btn {
      background: #30343a;
      border: 1px solid #454950;
      border-radius: 8px;
      padding: 11px 16px;
      color: white;
      cursor: pointer;
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
    }

    .cg-candidate-field {
      margin: 7px 0;
      color: #d5d6da;
      white-space: pre-wrap;
    }

    .cg-candidate-status {
      display: inline-block;
      background: #383d48;
      border-radius: 6px;
      padding: 6px 10px;
      margin-bottom: 12px;
      color: #a8c8ff;
    }

    @media(max-width: 600px) {
      .cg-candidate-overlay { padding: 15px; }
      .cg-candidate-head { align-items: flex-start; }
    }
  `;
  document.head.appendChild(style);

  const navButton = document.createElement("button");
  navButton.type = "button";
  navButton.className = "nav-item";
  navButton.textContent = "♧ Кандидаты";
  navButton.style.cssText =
    "width:100%;text-align:left;cursor:pointer;border:0;";
  nav.appendChild(navButton);

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
  close.className = "cg-candidate-btn";
  close.textContent = "← Назад";
  close.onclick = () => {
    overlay.hidden = true;
    overlay.style.display = "none";
  };

  head.append(title, close);

  const refresh = document.createElement("button");
  refresh.className = "cg-candidate-btn";
  refresh.textContent = "Обновить заявки";

  const summary = document.createElement("p");
  summary.style.margin = "20px 0";

  const list = document.createElement("div");

  inner.append(head, refresh, summary, list);
  overlay.appendChild(inner);
  document.body.appendChild(overlay);

  function addField(card, label, value) {
    if (value === null ||
        value === undefined ||
        value === "") return;

    const field = document.createElement("div");
    field.className = "cg-candidate-field";

    const strong = document.createElement("strong");
    strong.textContent = label + ": ";

    const span = document.createElement("span");
    span.textContent = Array.isArray(value)
      ? value.join(", ")
      : typeof value === "object"
        ? JSON.stringify(value, null, 2)
        : String(value);

    field.append(strong, span);
    card.appendChild(field);
  }

  function renderRequest(item) {
    const card = document.createElement("div");
    card.className = "cg-candidate-card";

    const name = document.createElement("h3");
    name.textContent = item.full_name || "Без имени";

    const status = document.createElement("span");
    status.className = "cg-candidate-status";
    status.textContent = item.status || "pending";

    card.append(name, status);

    addField(card, "Email", item.email);
    addField(card, "Телефон", item.phone);
    addField(card, "Роль", item.requested_role);
    addField(card, "Тип сотрудничества", item.cooperation_type);
    addField(card, "Опыт (лет)", item.experience_years);
    addField(card, "Специализация", item.specialization);
    addField(card, "Бригада", item.brigade_name);
    addField(card, "Количество людей", item.brigade_size);
    addField(card, "Специализации бригады",
      item.brigade_specializations);
    addField(card, "Есть инструменты", item.brigade_has_tools);
    addField(card, "Есть транспорт", item.brigade_has_transport);
    addField(card, "Состав бригады", item.brigade_members_data);
    addField(card, "Дополнительно", item.additional_info);
    addField(card, "Комментарий проверки", item.review_comment);
    addField(card, "Дата заявки", item.created_at
      ? new Date(item.created_at).toLocaleString("ru-RU")
      : "");

    list.appendChild(card);
  }

  async function loadRequests() {
    summary.textContent = "Загрузка заявок...";
    list.replaceChildren();
    refresh.disabled = true;

    try {
      const { data, error } = await db.auth.getSession();

      if (error || !data?.session?.access_token) {
        throw new Error("Сессия завершена. Войдите заново.");
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

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || result.message ||
          "Ошибка получения заявок"
        );
      }

const requests = result.requests || [];
      summary.textContent =
        "Всего заявок: " + (result.total ?? requests.length);

      if (!requests.length) {
        list.textContent = "Заявок пока нет.";
        return;
      }

      requests.forEach(renderRequest);

    } catch (err) {
      summary.textContent =
        "Ошибка: " + (err.message || "Неизвестная ошибка");
    } finally {
      refresh.disabled = false;
    }
  }

  refresh.addEventListener("click", loadRequests);

  navButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    overlay.hidden = false;
    overlay.style.display = "block";
    loadRequests();
  });
});
