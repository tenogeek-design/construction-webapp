
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

  const formContainer = document.getElementById("expenseFormContainer");
  const expenseForm = document.getElementById("foremanExpenseForm");
  const projectSelect = document.getElementById("expenseProject");
  const titleInput = document.getElementById("expenseTitle");
  const amountInput = document.getElementById("expenseAmount");
  const categorySelect = document.getElementById("expenseCategory");
  const paymentSelect = document.getElementById("expensePaymentMethod");
  const descriptionInput = document.getElementById("expenseDescription");
  const receiptInput = document.getElementById("expenseReceipt");
  const submitButton = document.getElementById("submitExpenseButton");
  const cancelButton = document.getElementById("cancelExpenseButton");
  const formMessage = document.getElementById("expenseFormMessage");

  if (!window.supabase) {
    balanceElement.textContent = "Ошибка загрузки авторизации";
    return;
  }

  // Используем общую сессию с login.html.
  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  let availableProjects = [];
  let isSubmitting = false;

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

  function setFormMessage(message, type = "") {
    if (!formMessage) return;

    formMessage.textContent = message;
    formMessage.className = "form-message";

    if (type) {
      formMessage.classList.add(type);
    }
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
  // 4. СПИСОК РАСХОДОВ
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

    const { data, error } = await client.rpc(
      "get_my_expense_requests"
    );

    if (error) {
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
  // 5. ЗАГРУЗКА ОБЪЕКТОВ
  // ==========================================

  async function loadMyProjects() {
    projectSelect.replaceChildren();

    const loadingOption = document.createElement("option");
    loadingOption.value = "";
    loadingOption.textContent = "Загрузка объектов...";
    projectSelect.appendChild(loadingOption);

    projectSelect.disabled = true;
    submitButton.disabled = true;

    const { data, error } = await client.rpc(
      "get_my_expense_projects"
    );

    projectSelect.replaceChildren();

    if (error) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Ошибка загрузки объектов";
      projectSelect.appendChild(option);

      setFormMessage(
        "Не удалось загрузить объекты: " + error.message,
        "error"
      );
      return;
    }

    availableProjects = Array.isArray(data) ? data : [];

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Выберите объект";
    projectSelect.appendChild(placeholder);

    for (const project of availableProjects) {
      const option = document.createElement("option");

      option.value = project.project_id;

      option.textContent = project.project_address
        ? `${project.project_name} — ${project.project_address}`
        : project.project_name;

      projectSelect.appendChild(option);
    }

    if (availableProjects.length === 0) {
      setFormMessage(
        "У вас пока нет назначенных активных объектов.",
        "warning"
      );
      return;
    }

    projectSelect.disabled = false;
    submitButton.disabled = false;
  }

  // ==========================================
  // 6. ОТКРЫТИЕ И ЗАКРЫТИЕ ФОРМЫ
  // ==========================================

  async function openExpenseForm() {
    if (!formContainer || isSubmitting) return;

    formContainer.hidden = false;
    addExpenseButton.disabled = true;

    setFormMessage("");

    await loadMyProjects();

    addExpenseButton.disabled = false;

    formContainer.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function closeExpenseForm() {
    if (isSubmitting) return;

    formContainer.hidden = true;
    expenseForm.reset();
    setFormMessage("");
  }

  // ==========================================
  // 7. СОЗДАНИЕ РАСХОДА
  // ==========================================

  async function submitNewExpense(event) {
    event.preventDefault();

    if (isSubmitting) return;

    const projectId = projectSelect.value;
    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categorySelect.value;
    const paymentMethod = paymentSelect.value;
    const description = descriptionInput.value.trim();

    if (!projectId ||
        !availableProjects.some(
          project => project.project_id === projectId
        )) {
      setFormMessage("Выберите доступный объект.", "error");
      return;
    }

    if (!title) {
      setFormMessage("Укажите, что было куплено.", "error");
      return;
    }

    if (!Number.isFinite(amount) ||
        amount <= 0 ||
        Math.round(amount * 100) !== amount * 100) {
      setFormMessage(
        "Введите корректную сумму с точностью до 0,01 zł.",
        "error"
      );
      return;
    }

    if (!["cash", "bank", "personal"].includes(paymentMethod)) {
      setFormMessage("Некорректный способ оплаты.", "error");
      return;
    }

    if (receiptInput && receiptInput.files.length > 0) {
      setFormMessage(
        "Загрузка чеков ещё не подключена. Уберите файл.",
        "error"
      );
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    cancelButton.disabled = true;
    addExpenseButton.disabled = true;

    setFormMessage("Отправляем заявку...", "warning");

    try {
      const { error } = await client.rpc(
        "submit_expense",
        {
          p_project_id: projectId,
          p_title: title,
          p_amount: amount,
          p_payment_method: paymentMethod,
          p_description: description || null,
          p_category: category || null,
          p_receipt_path: null
        }
      );

      if (error) {
        throw error;
      }

      expenseForm.reset();

      setFormMessage(
        "Расход успешно отправлен на согласование.",
        "success"
      );

      await loadMyExpenses();

    } catch (error) {
      setFormMessage(
        "Ошибка создания расхода: " + error.message,
        "error"
      );

    } finally {
      isSubmitting = false;
      submitButton.disabled = availableProjects.length === 0;
      cancelButton.disabled = false;
      addExpenseButton.disabled = false;
    }
  }

  // ==========================================
  // 8. ОБНОВЛЕНИЕ ДАННЫХ
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
  // 9. ЗАПУСК
  // ==========================================

  const hasAccess = await checkAccess();

  if (!hasAccess) return;

  refreshButton.addEventListener(
    "click",
    refreshFinance
  );

  addExpenseButton.disabled = false;

  addExpenseButton.addEventListener(
    "click",
    openExpenseForm
  );

  cancelButton.addEventListener(
    "click",
    closeExpenseForm
  );

  expenseForm.addEventListener(
    "submit",
    submitNewExpense
  );

  await refreshFinance();
});
