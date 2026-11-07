
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;

  const ALLOWED_RECEIPT_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf"
  };

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
  const receiptInfo = document.getElementById("expenseReceiptInfo");
  const receiptFileName = document.getElementById("expenseReceiptFileName");
  const receiptPreview = document.getElementById("expenseReceiptPreview");
  const receiptPreviewImage = document.getElementById("expenseReceiptPreviewImage");
  const submitButton = document.getElementById("submitExpenseButton");
  const cancelButton = document.getElementById("cancelExpenseButton");
  const formMessage = document.getElementById("expenseFormMessage");

  if (!window.supabase) {
    balanceElement.textContent = "Ошибка загрузки авторизации";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  let availableProjects = [];
  let isSubmitting = false;
  let previewUrl = null;

  const moneyFormat = (amount, currency = "PLN") =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency
    }).format(Number(amount || 0));

  function showError(message) {
    balanceElement.textContent = "Ошибка";
    nameElement.textContent = message;
  }

  function setFormMessage(message, type = "") {
    formMessage.textContent = message;
    formMessage.className = "form-message";

    if (type) {
      formMessage.classList.add(type);
    }
  }

  function clearReceiptPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      previewUrl = null;
    }

    receiptPreviewImage.removeAttribute("src");
    receiptPreview.hidden = true;
    receiptInfo.hidden = true;
    receiptFileName.textContent = "";
  }

  function validateReceipt(file) {
    if (!file) return null;

    if (!Object.prototype.hasOwnProperty.call(
      ALLOWED_RECEIPT_TYPES,
      file.type
    )) {
      return "Разрешены только JPG, PNG, WEBP и PDF.";
    }

    if (file.size === 0) {
      return "Выбранный файл пустой.";
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      return "Максимальный размер чека — 10 МБ.";
    }

    return null;
  }

  function handleReceiptChange() {
    clearReceiptPreview();
    setFormMessage("");

    const file = receiptInput.files?.[0];

    if (!file) return;

    const validationError = validateReceipt(file);

    if (validationError) {
      receiptInput.value = "";
      setFormMessage(validationError, "error");
      return;
    }

    receiptFileName.textContent =
      `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} МБ)`;

    receiptInfo.hidden = false;

    if (file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
      receiptPreviewImage.src = previewUrl;
      receiptPreview.hidden = false;
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
    cancelled: "Отменён",
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

    if (item.receipt_path) {
      const receipt = document.createElement("div");
      receipt.style.color = "#22a06b";
      receipt.style.marginTop = "6px";
      receipt.textContent = "✓ Чек прикреплён";
      details.appendChild(receipt);
    }

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
    clearReceiptPreview();
    setFormMessage("");
  }

  // ==========================================
  // 7. ЗАГРУЗКА ЧЕКА
  // ==========================================

  async function uploadExpenseReceipt(expenseId, file) {
    const extension = ALLOWED_RECEIPT_TYPES[file.type];

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    const filePath = `${expenseId}/${fileName}`;

    const { error: uploadError } = await client.storage
      .from("expense-receipts")
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      throw new Error(
        "Не удалось загрузить чек: " + uploadError.message
      );
    }

    const { error: attachError } = await client.rpc(
      "attach_expense_receipt",
      {
        p_expense_id: expenseId,
        p_receipt_path: filePath
      }
    );

    if (attachError) {
      throw new Error(
        "Файл загружен, но не привязан к расходу: " +
        attachError.message
      );
    }
  }

  function extractExpenseId(data) {
    if (typeof data === "string") {
      return data;
    }

    if (Array.isArray(data) && data.length > 0) {
      return data[0]?.id ||
        data[0]?.expense_id ||
        null;
    }

    if (data && typeof data === "object") {
      return data.id ||
        data.expense_id ||
        null;
    }

    return null;
  }

  // ==========================================
  // 8. СОЗДАНИЕ РАСХОДА
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
    const receiptFile = receiptInput.files?.[0] || null;

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
        Math.abs(
          Math.round(amount * 100) - amount * 100
        ) > 0.000001) {
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

    const receiptError = validateReceipt(receiptFile);

    if (receiptError) {
      setFormMessage(receiptError, "error");
      return;
    }

    isSubmitting = true;
    submitButton.disabled = true;
    cancelButton.disabled = true;
    addExpenseButton.disabled = true;
    receiptInput.disabled = true;

    let expenseCreated = false;

    try {
      setFormMessage("Создаём заявку на расход...", "warning");

      const { data, error } = await client.rpc(
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

      expenseCreated = true;

      if (receiptFile) {
        const expenseId = extractExpenseId(data);

        if (!expenseId) {
          throw new Error(
            "Расход создан, но сервер не вернул его ID. " +
            "Чек не загружен. Не отправляйте расход повторно."
          );
        }

        setFormMessage(
          "Заявка создана. Загружаем фотографию чека...",
          "warning"
        );

        await uploadExpenseReceipt(expenseId, receiptFile);
      }

      expenseForm.reset();
      clearReceiptPreview();

      setFormMessage(
        receiptFile
          ? "Расход создан, чек успешно прикреплён."
          : "Расход успешно отправлен на согласование.",
        "success"
      );

      await loadMyExpenses();

    } catch (error) {
      setFormMessage(
        expenseCreated
          ? "Заявка уже создана, но возникла ошибка с чеком: " +
            error.message +
            " Проверьте список расходов и не создавайте дубликат."
          : "Ошибка создания расхода: " + error.message,
        "error"
      );

      if (expenseCreated) {
        await loadMyExpenses();
      }

    } finally {
      isSubmitting = false;
      submitButton.disabled = availableProjects.length === 0;
      cancelButton.disabled = false;
      addExpenseButton.disabled = false;
      receiptInput.disabled = false;
    }
  }

  // ==========================================
  // 9. ОБНОВЛЕНИЕ ДАННЫХ
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
  // 10. ЗАПУСК
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

  receiptInput.addEventListener(
    "change",
    handleReceiptChange
  );

  expenseForm.addEventListener(
    "submit",
    submitNewExpense
  );

  await refreshFinance();
});
