
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const balanceElement = document.getElementById("myBalance");
  const nameElement = document.getElementById("cashboxName");
  const historyElement = document.getElementById("myFinanceHistory");
  const refreshButton = document.getElementById("refreshBalance");

  const expensesElement = document.getElementById("foremanExpenses");
  const addExpenseButton = document.getElementById("foremanAddExpense");

  if (!window.supabase) {
    balanceElement.textContent = "Ошибка загрузки авторизации";
    return;
  }

  // Общая сессия с login.html
  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const moneyFormat = (amount, currency = "PLN") => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency
    }).format(Number(amount || 0));
  };

  function showError(message) {
    balanceElement.textContent = "Ошибка";
    nameElement.textContent = message;
  }

  // ==========================================
  // 1. АВТОРИЗАЦИЯ
  // ==========================================

  async function checkAccess() {
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      window.location.replace("/login.html");
      return false;
    }

    const { error: permissionsError } =
      await client.rpc("get_my_effective_permissions");

    if (permissionsError) {
      showError("Не удалось проверить права пользователя");
      return false;
    }

    return true;
  }

  // ==========================================
  // 2. МОЯ КАССА
  // ==========================================

  async function loadMyBalance() {
    balanceElement.textContent = "Загрузка...";
    nameElement.textContent = "";

    const { data, error } = await client.rpc(
      "get_my_finance_balances"
    );

    if (error) {
      showError(error.message);
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      balanceElement.textContent = "Нет доступа";
      nameElement.textContent =
        "Активная касса не назначена или нет роли бригадира.";
      return;
    }

    const total = data.reduce(
      (sum, account) => sum + Number(account.balance || 0),
      0
    );

    balanceElement.textContent =
      moneyFormat(total, data[0].currency || "PLN");

    nameElement.textContent =
      data.map(account => account.account_name).join(", ");
  }

  // ==========================================
  // 3. ИСТОРИЯ КАССЫ
  // ==========================================

  function createHistoryRow(item) {
    const row = document.createElement("div");

    row.style.cssText = [
      "padding:16px 0",
      "border-bottom:1px solid #3b3f46",
      "display:flex",
      "justify-content:space-between",
      "align-items:center",
      "gap:16px",
      "flex-wrap:wrap"
    ].join(";");

    const details = document.createElement("div");

    const title = document.createElement("div");
    title.style.fontWeight = "bold";

    const isIncome = item.direction === "income";

    title.textContent = isIncome
      ? "Поступление"
      : "Расход";

    const description = document.createElement("div");
    description.className = "muted";
    description.style.marginTop = "6px";
    description.textContent =
      item.description || item.category || "Без описания";

    const date = document.createElement("div");
    date.className = "muted";
    date.style.marginTop = "6px";

    date.textContent = item.transaction_date
      ? item.transaction_date.split("-").reverse().join(".")
      : "Дата не указана";

    details.append(title, description, date);

    const amount = document.createElement("div");
    amount.style.fontWeight = "bold";
    amount.style.fontSize = "20px";
    amount.style.color = isIncome
      ? "#22a06b"
      : "#ff812e";

    amount.textContent =
      (isIncome ? "+" : "−") +
      moneyFormat(item.amount, item.currency || "PLN");

    row.append(details, amount);

    return row;
  }

  async function loadMyHistory() {
    if (!historyElement) return;

    historyElement.textContent = "Загрузка истории...";

    const { data, error } = await client.rpc(
      "get_my_finance_history",
      { p_limit: 50 }
    );

    if (error) {
      historyElement.textContent =
        "Ошибка загрузки истории: " + error.message;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      historyElement.textContent = "Операций пока нет.";
      return;
    }

    historyElement.replaceChildren();

    for (const item of data) {
      historyElement.appendChild(createHistoryRow(item));
    }
  }

  // ==========================================
  // 4. РАСХОДЫ И ЧЕКИ
  // ==========================================

  const expenseStatusLabels = {
    pending: "Ожидает подтверждения",
    approved: "Подтверждён",
    rejected: "Отклонён",
    paid: "Оплачен"
  };

  function createExpenseRow(item) {
    const row = document.createElement("div");

    row.style.cssText = [
      "padding:16px 0",
      "border-bottom:1px solid #3b3f46",
      "display:flex",
      "justify-content:space-between",
      "align-items:center",
      "gap:16px",
      "flex-wrap:wrap"
    ].join(";");

    const details = document.createElement("div");

    const title = document.createElement("div");
    title.style.fontWeight = "bold";
    title.textContent = item.title || "Расход";

    const description = document.createElement("div");
    description.className = "muted";
    description.style.marginTop = "6px";
    description.textContent =
      item.description || item.category || "Без описания";

    const status = document.createElement("div");
    status.className = "muted";
    status.style.marginTop = "6px";

    status.textContent =
      expenseStatusLabels[item.status] ||
      item.status ||
      "Статус неизвестен";

    const date = document.createElement("div");
    date.className = "muted";
    date.style.marginTop = "6px";

    date.textContent = item.expense_date
      ? item.expense_date.split("-").reverse().join(".")
      : "Дата не указана";

    details.append(title, description, status, date);

    const amount = document.createElement("div");
    amount.style.fontWeight = "bold";
    amount.style.fontSize = "20px";
    amount.style.color = "#ff812e";

    amount.textContent = moneyFormat(
      item.amount,
      item.currency || "PLN"
    );

    row.append(details, amount);

    return row;
  }

  async function loadMyExpenses() {
    if (!expensesElement) return;

    expensesElement.textContent = "Загрузка расходов...";

    // Эта функция будет создана следующим шагом.
    // До её появления не запрашиваем таблицу напрямую.
    const { data, error } = await client.rpc(
      "get_my_expense_requests"
    );

    if (error) {
      if (error.code === "PGRST202" ||
          error.code === "42883") {
        expensesElement.textContent =
          "Раздел готов. Ожидается подключение функции расходов.";
        return;
      }

      expensesElement.textContent =
        "Ошибка загрузки расходов: " + error.message;
      return;
    }

    if (!Array.isArray(data) || data.length === 0) {
      expensesElement.textContent =
        "Заявок на расходы пока нет.";
      return;
    }

    expensesElement.replaceChildren();

    for (const item of data) {
      expensesElement.appendChild(createExpenseRow(item));
    }
  }

  // ==========================================
  // 5. ОБНОВЛЕНИЕ ДАННЫХ
  // ==========================================

  async function refreshFinance() {
    refreshButton.disabled = true;

    try {
      await Promise.all([
        loadMyBalance(),
        loadMyHistory(),
        loadMyExpenses()
      ]);
    } finally {
      refreshButton.disabled = false;
    }
  }

  // ==========================================
  // 6. ЗАПУСК
  // ==========================================

  const hasAccess = await checkAccess();

  if (!hasAccess) return;

  refreshButton.addEventListener(
    "click",
    refreshFinance
  );

  // Пока создание расходов не подключено,
  // кнопка остаётся отключённой.
  if (addExpenseButton) {
    addExpenseButton.disabled = true;
  }

  await refreshFinance();
});
