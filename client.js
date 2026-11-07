
"use strict";

document.addEventListener("DOMContentLoaded", async () => {

  // ==========================================
  // SUPABASE
  // ==========================================

  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const LOGIN_URL = "/login.html";

  const $ = id => document.getElementById(id);

  const message = $("clientMessage");

  function showMessage(text, error = false) {
    if (!message) return;

    message.textContent = text;
    message.className = "message visible";

    if (error) {
      message.style.borderColor = "#914f4f";
      message.style.color = "#ffaaaa";
    } else {
      message.style.borderColor = "";
      message.style.color = "";
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function formatDate(value) {
    if (!value) return "—";

    return new Date(value).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function formatMoney(value, currency = "PLN") {
    if (value === null || value === undefined) {
      return "По договорённости";
    }

    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: currency || "PLN"
    }).format(Number(value));
  }

  function statusInfo(status) {
    const statuses = {
      NOWA: {
        label: "Новая",
        className: ""
      },
      KONTAKT: {
        label: "Контакт",
        className: ""
      },
      USTALENIA: {
        label: "Согласование",
        className: ""
      },
      ZAAKCEPTOWANA: {
        label: "Принята",
        className: "accepted"
      },
      ODRZUCONA: {
        label: "Отклонена",
        className: "rejected"
      },
      "Рассматривается": {
        label: "Рассматривается",
        className: ""
      },
      "Ожидайте звонка": {
        label: "Ожидайте звонка",
        className: ""
      },
      "Ожидайте сообщения в Telegram": {
        label: "Ожидайте сообщения",
        className: ""
      },
      "Принята": {
        label: "Принята",
        className: "accepted"
      },
      "Отклонена": {
        label: "Отклонена",
        className: "rejected"
      }
    };

    return statuses[status] || {
      label: status || "В обработке",
      className: ""
    };
  }

  // ==========================================
  // ПРОВЕРКА SUPABASE
  // ==========================================

  if (!window.supabase) {
    showMessage("Не удалось загрузить Supabase.", true);
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  // ==========================================
  // ПРОВЕРКА АВТОРИЗАЦИИ
  // ==========================================

  async function checkAccess() {
    const {
      data: sessionData,
      error: sessionError
    } = await client.auth.getSession();

    if (sessionError) throw sessionError;

    const session = sessionData.session;

    if (!session) {
      window.location.replace(LOGIN_URL);
      return null;
    }

    const {
      data: userData,
      error: userError
    } = await client.auth.getUser();

    if (userError || !userData.user) {
      await client.auth.signOut();
      window.location.replace(LOGIN_URL);
      return null;
    }

    const user = userData.user;

    const {
      data: roleData,
      error: roleError
    } = await client
      .from("app_user_roles")
      .select("role_code")
      .eq("user_id", user.id)
      .is("revoked_at", null);

    if (roleError) throw roleError;

    const roles = (roleData || []).map(
      role => role.role_code
    );

    if (!roles.includes("client")) {
      const destination =
        roles.includes("owner") || roles.includes("admin")
          ? "/admin.html"
          : roles.includes("foreman")
            ? "/foreman.html"
            : LOGIN_URL;

      window.location.replace(destination);
      return null;
    }

    return user;
  }

  // ==========================================
  // ПРОФИЛЬ
  // ==========================================

  function renderProfile(user) {
    const metadata = user.user_metadata || {};

    const firstName = metadata.first_name || "";
    const lastName = metadata.last_name || "";

    const fullName =
      metadata.full_name ||
      [firstName, lastName].filter(Boolean).join(" ") ||
      "Заказчик";

    $("clientName").textContent = fullName;
    $("clientEmail").textContent =
      user.email || "Email не указан";

    $("clientPhone").textContent =
      metadata.phone || "Телефон не указан";
  }

  // ==========================================
  // ЗАГРУЗКА ЗАЯВОК
  // ==========================================

  async function loadRequests() {
    const list = $("requestsList");

    list.innerHTML =
      '<div class="loading-state">Загружаем ваши заявки...</div>';

    const {
      data,
      error
    } = await client
      .from("requests")
      .select(`
        id,
        request_number,
        status,
        customer_name,
        city,
        street,
        building_number,
        apartment_number,
        description,
        estimated_total,
        estimated_currency,
        rejection_reason,
        created_at
      `)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      console.error("Requests loading error:", error);

      list.innerHTML = `
        <div class="empty-card">
          <strong>Не удалось загрузить заявки</strong>
          <small>${escapeHTML(error.message)}</small>
        </div>
      `;

      showMessage(
        "Ошибка загрузки заявок. Проверьте политики доступа Supabase.",
        true
      );

      return;
    }

    const requests = data || [];

    $("requestsCount").textContent = requests.length;

    const active = requests.filter(request =>
      !["ZAAKCEPTOWANA", "ODRZUCONA", "Принята", "Отклонена"]
        .includes(request.status)
    );

    const accepted = requests.filter(request =>
      ["ZAAKCEPTOWANA", "Принята"]
        .includes(request.status)
    );

    $("activeCount").textContent = active.length;
    $("acceptedCount").textContent = accepted.length;

    if (!requests.length) {
      list.innerHTML = `
        <div class="empty-card">
          <span>▤</span>
          <strong>У вас пока нет заявок</strong>
          <small>Создайте первую заявку через калькулятор.</small>
        </div>
      `;

      return;
    }

    list.innerHTML = requests.map(request => {
      const status = statusInfo(request.status);

      const address = [
        request.city,
        request.street,
        request.building_number,
        request.apartment_number
          ? "кв. " + request.apartment_number
          : ""
      ].filter(Boolean).join(", ");

      return `
        <article class="request-card">

          <div class="request-top">
            <span class="request-number">
              Заявка № ${escapeHTML(request.request_number)}
            </span>

            <span class="request-date">
              ${formatDate(request.created_at)}
            </span>
          </div>

          <div class="request-description">
            <strong>${escapeHTML(address || "Адрес не указан")}</strong>
            <br>
            ${escapeHTML(request.description || "Описание отсутствует")}
          </div>

          <div class="request-top" style="margin-top:15px">
            <span class="request-status ${status.className}">
              ${escapeHTML(status.label)}
            </span>

            <strong>
              ${formatMoney(
                request.estimated_total,
                request.estimated_currency
              )}
            </strong>
          </div>

          ${
            request.rejection_reason
              ? `<p class="request-date">Причина отказа: ${escapeHTML(request.rejection_reason)}</p>`
              : ""
          }

        </article>
      `;
    }).join("");
  }

  // ==========================================
  // ОБНОВЛЕНИЕ
  // ==========================================

  $("refreshButton").addEventListener("click", async () => {
    const button = $("refreshButton");

    button.disabled = true;
    button.textContent = "Загрузка...";

    try {
      await loadRequests();
    } finally {
      button.disabled = false;
      button.textContent = "↻ Обновить";
    }
  });

  // ==========================================
  // ВЫХОД
  // ==========================================

  $("logoutButton").addEventListener("click", async () => {
    const button = $("logoutButton");

    button.disabled = true;

    const { error } = await client.auth.signOut();

    if (error) {
      showMessage(error.message, true);
      button.disabled = false;
      return;
    }

    window.location.replace(LOGIN_URL);
  });

  // ==========================================
  // ЗАПУСК КАБИНЕТА
  // ==========================================

  try {
    const user = await checkAccess();

    if (!user) return;

    renderProfile(user);

    await loadRequests();

    // Следим за окончанием пользовательской сессии.
    client.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        window.location.replace(LOGIN_URL);
      }
    });

  } catch (error) {
    console.error("Client cabinet error:", error);

    showMessage(
      "Ошибка запуска кабинета: " + error.message,
      true
    );
  }

});
