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

  const $ = id => document.getElementById(id);

  const balanceElement = $("myBalance");
  const nameElement = $("cashboxName");
  const historyElement = $("myFinanceHistory");
  const refreshButton = $("refreshBalance");

  const expensesElement = $("foremanExpenses");
  const addExpenseButton = $("foremanAddExpense");

  const formContainer = $("expenseFormContainer");
  const expenseForm = $("foremanExpenseForm");
  const projectSelect = $("expenseProject");
  const titleInput = $("expenseTitle");
  const amountInput = $("expenseAmount");
  const categorySelect = $("expenseCategory");
  const paymentSelect = $("expensePaymentMethod");
  const descriptionInput = $("expenseDescription");
  const receiptInput = $("expenseReceipt");
  const receiptInfo = $("expenseReceiptInfo");
  const receiptFileName = $("expenseReceiptFileName");
  const receiptPreview = $("expenseReceiptPreview");
  const receiptPreviewImage = $("expenseReceiptPreviewImage");
  const submitButton = $("submitExpenseButton");
  const cancelButton = $("cancelExpenseButton");
  const formMessage = $("expenseFormMessage");

  if (!window.supabase) {
    if (balanceElement) {
      balanceElement.textContent =
        "Ошибка загрузки авторизации";
    }
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  let availableProjects = [];
  let isSubmitting = false;
  let isAttachingReceipt = false;
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
      `${file.name} (${(file.size / 1048576).toFixed(2)} МБ)`;

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
      showError(
        "Не удалось проверить права пользователя"
      );
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
      (sum, account) =>
        sum + Number(account.balance || 0),
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
  // 4. ПРОСМОТР ЧЕКОВ
  // ==========================================

  function normalizeReceiptPath(rawPath) {
    if (!rawPath || typeof rawPath !== "string") {
      throw new Error("В заявке не указан путь к чеку.");
    }

    let value = rawPath.trim();
    let explicitBucket = null;

    // Поддерживаем как относительный путь из БД,
    // так и полный URL Storage, если он туда попадёт.
    if (/^https?:\/\//i.test(value)) {
      let parsed;

      try {
        parsed = new URL(value);
      } catch {
        throw new Error("Некорректная ссылка на чек.");
      }

      const match = parsed.pathname.match(
        /\/storage\/v1\/object\/(?:sign|public|authenticated)\/([^/]+)\/(.+)$/i
      );

      if (!match) {
        throw new Error("Не удалось определить bucket и путь чека.");
      }

      explicitBucket = match[1];
      value = match[2];
    }

    value = value.replace(/^\/+/, "");

    // Если путь уже содержит имя bucket — убираем его из пути.
    for (const bucket of ["expense-receipts", "request-photos"]) {
      if (value.startsWith(bucket + "/")) {
        explicitBucket = bucket;
        value = value.slice(bucket.length + 1);
        break;
      }
    }

    try {
      value = value.split("/").map(part => decodeURIComponent(part)).join("/");
    } catch {
      throw new Error("Путь к чеку содержит некорректное кодирование.");
    }

    if (!value || value.split("/").some(part => !part || part === "." || part === "..")) {
      throw new Error("Путь к чеку пустой или некорректный.");
    }

    let primaryBucket = explicitBucket;

    if (!primaryBucket) {
      // Старые файлы имели структуру project/employee/file.
      // Новые файлы имеют структуру expense_id/file.
      primaryBucket = value.split("/").length >= 3
        ? "request-photos"
        : "expense-receipts";
    }

    if (!["expense-receipts", "request-photos"].includes(primaryBucket)) {
      throw new Error("Неизвестное хранилище чека: " + primaryBucket);
    }

    const buckets = [
      primaryBucket,
      ...(primaryBucket === "expense-receipts"
        ? ["request-photos"]
        : ["expense-receipts"])
    ];

    return { path: value, buckets };
  }

  function isPdfReceipt(path) {
    return /\.pdf$/i.test(String(path || "").split("?")[0]);
  }

  function openReceiptViewer(url, title, isPdf) {
    if (isPdf) {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }

    const overlay = document.createElement("div");

    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:99999",
      "background:rgba(0,0,0,0.92)",
      "display:flex",
      "flex-direction:column",
      "align-items:center",
      "justify-content:center",
      "padding:20px",
      "box-sizing:border-box"
    ].join(";");

    const header = document.createElement("div");

    header.style.cssText = [
      "width:100%",
      "max-width:1100px",
      "display:flex",
      "justify-content:space-between",
      "align-items:center",
      "gap:16px",
      "margin-bottom:15px"
    ].join(";");

    const heading = document.createElement("div");
    heading.textContent = "Чек — " + title;
    heading.style.cssText = [
      "color:white",
      "font-size:17px",
      "font-weight:bold",
      "overflow-wrap:anywhere"
    ].join(";");

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.textContent = "✕ Закрыть";

    closeButton.style.cssText = [
      "background:#ff812e",
      "color:white",
      "border:0",
      "border-radius:8px",
      "padding:11px 16px",
      "cursor:pointer",
      "white-space:nowrap"
    ].join(";");

    const image = document.createElement("img");
    image.src = url;
    image.alt = "Фотография чека";

    image.style.cssText = [
      "display:block",
      "max-width:100%",
      "max-height:80vh",
      "object-fit:contain",
      "border-radius:8px"
    ].join(";");

    const errorMessage = document.createElement("div");
    errorMessage.style.color = "#ef4444";
    errorMessage.style.marginTop = "12px";

    image.addEventListener("error", () => {
      errorMessage.textContent =
        "Ссылка создана, но браузер не смог загрузить изображение. Обновите страницу и попробуйте ещё раз.";
    });

    function closeViewer() {
      document.removeEventListener("keydown", handleKey);
      overlay.remove();
    }

    function handleKey(event) {
      if (event.key === "Escape") closeViewer();
    }

    closeButton.addEventListener("click", closeViewer);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeViewer();
    });

    document.addEventListener("keydown", handleKey);

    header.append(heading, closeButton);
    overlay.append(header, image, errorMessage);
    document.body.appendChild(overlay);
    closeButton.focus();
  }

  async function viewExpenseReceipt(item, button, message) {
    const rawPath = item.receipt_path;

    if (!rawPath) {
      message.textContent = "У этого расхода нет чека.";
      return;
    }

    button.disabled = true;
    button.textContent = "Открываем...";
    message.textContent = "";
    message.style.color = "#ef4444";

    try {
      const receipt = normalizeReceiptPath(rawPath);
      let signedUrl = null;
      let lastError = null;
      let usedBucket = null;

      // Сначала используем ожидаемый bucket, затем проверяем второй
      // на случай старого пути или миграции файлов.
      for (const bucket of receipt.buckets) {
        const { data, error } = await client.storage
          .from(bucket)
          .createSignedUrl(receipt.path, 300);

        if (!error && data?.signedUrl) {
          signedUrl = data.signedUrl;
          usedBucket = bucket;
          break;
        }

        lastError = error || new Error("Storage не вернул временную ссылку.");
      }

      if (!signedUrl) {
        const detail = lastError?.message || "Файл не найден или нет прав на чтение.";
        throw new Error(detail);
      }

      console.info("Receipt signed URL created", {
        bucket: usedBucket,
        path: receipt.path
      });

      openReceiptViewer(
        signedUrl,
        item.title || "Расход",
        isPdfReceipt(receipt.path)
      );

    } catch (error) {
      console.error("Receipt viewing error:", error);
      message.textContent =
        "Не удалось открыть чек: " + (error.message || "неизвестная ошибка");

    } finally {
      button.disabled = false;
      button.textContent = "👁 Посмотреть чек";
    }
  }

  // ==========================================
  // 5. СПИСОК РАСХОДОВ
  // ==========================================

  const expenseStatusLabels = {
    pending: "Ожидает подтверждения",
    approved: "Подтверждён",
    rejected: "Отклонён",
    cancelled: "Отменён",
    paid: "Оплачен"
  };

  function getExpenseId(item) {
    const value = item.id || item.expense_id || null;

    if (
      typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ) {
      return value;
    }

    return null;
  }

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

    // Просмотр уже прикреплённого чека.

    if (item.receipt_path) {
      const receiptSection = document.createElement("div");
      receiptSection.style.marginTop = "10px";

      const receiptLabel = document.createElement("div");
      receiptLabel.style.color = "#22a06b";
      receiptLabel.style.marginBottom = "8px";
      receiptLabel.textContent = "✓ Чек прикреплён";

      const viewButton = document.createElement("button");
      viewButton.type = "button";
      viewButton.textContent = "👁 Посмотреть чек";

      viewButton.style.cssText = [
        "background:#30343a",
        "color:#ffffff",
        "border:1px solid #ff812e",
        "border-radius:8px",
        "padding:10px 14px",
        "font-size:13px",
        "font-weight:bold",
        "cursor:pointer"
      ].join(";");

      const viewMessage = document.createElement("div");
      viewMessage.style.marginTop = "8px";
      viewMessage.style.fontSize = "12px";

      viewButton.addEventListener("click", () => {
        viewExpenseReceipt(
          item,
          viewButton,
          viewMessage
        );
      });

      receiptSection.append(
        receiptLabel,
        viewButton,
        viewMessage
      );

      details.appendChild(receiptSection);
    }

    // Прикрепление чека к существующему расходу.

    const expenseId = getExpenseId(item);

    if (
      item.status === "pending" &&
      !item.receipt_path &&
      expenseId
    ) {
      const receiptSection = document.createElement("div");
      receiptSection.style.marginTop = "12px";

      const attachButton = document.createElement("button");
      attachButton.type = "button";
      attachButton.textContent = "📎 Прикрепить чек";

      attachButton.style.cssText = [
        "background:#ff812e",
        "color:#ffffff",
        "border:0",
        "border-radius:8px",
        "padding:10px 14px",
        "font-size:13px",
        "font-weight:bold",
        "cursor:pointer"
      ].join(";");

      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept =
        ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf";
      fileInput.hidden = true;

      const uploadMessage = document.createElement("div");
      uploadMessage.className = "muted";
      uploadMessage.style.marginTop = "8px";

      attachButton.addEventListener("click", () => {
        if (isAttachingReceipt || isSubmitting) return;

        fileInput.value = "";
        fileInput.click();
      });

      fileInput.addEventListener("change", async () => {
        const file = fileInput.files?.[0];

        if (!file) return;

        const validationError = validateReceipt(file);

        if (validationError) {
          uploadMessage.textContent = validationError;
          uploadMessage.style.color = "#ef4444";
          return;
        }

        if (isAttachingReceipt || isSubmitting) return;

        isAttachingReceipt = true;
        attachButton.disabled = true;
        attachButton.textContent = "Загрузка...";
        attachButton.style.opacity = "0.6";

        uploadMessage.style.color = "#a4a7ad";
        uploadMessage.textContent =
          "Загружаем чек к существующему расходу...";

        try {
          await uploadExpenseReceipt(expenseId, file);

          uploadMessage.style.color = "#22a06b";
          uploadMessage.textContent =
            "Чек успешно прикреплён!";

          attachButton.textContent = "✓ Чек прикреплён";

          await loadMyExpenses();

        } catch (error) {
          uploadMessage.style.color = "#ef4444";
          uploadMessage.textContent =
            "Ошибка загрузки чека: " + error.message;

          attachButton.disabled = false;
          attachButton.textContent = "📎 Повторить загрузку";
          attachButton.style.opacity = "1";

        } finally {
          isAttachingReceipt = false;
        }
      });

      receiptSection.append(
        attachButton,
        fileInput,
        uploadMessage
      );

      details.appendChild(receiptSection);
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
  // 6. ЗАГРУЗКА ОБЪЕКТОВ
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
  // 7. ФОРМА РАСХОДА
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
  // 8. ЗАГРУЗКА ЧЕКА
  // ==========================================

  async function uploadExpenseReceipt(expenseId, file) {
    const validationError = validateReceipt(file);

    if (validationError) {
      throw new Error(validationError);
    }

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
  // 9. СОЗДАНИЕ РАСХОДА
  // ==========================================

  async function submitNewExpense(event) {
    event.preventDefault();

    if (isSubmitting || isAttachingReceipt) return;

    const projectId = projectSelect.value;
    const title = titleInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categorySelect.value;
    const paymentMethod = paymentSelect.value;
    const description = descriptionInput.value.trim();
    const receiptFile = receiptInput.files?.[0] || null;

    if (
      !projectId ||
      !availableProjects.some(
        project => project.project_id === projectId
      )
    ) {
      setFormMessage("Выберите доступный объект.", "error");
      return;
    }

    if (!title) {
      setFormMessage("Укажите, что было куплено.", "error");
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.abs(
        Math.round(amount * 100) - amount * 100
      ) > 0.000001
    ) {
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
      setFormMessage(
        "Создаём заявку на расход...",
        "warning"
      );

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

      expenseForm.reset();
      clearReceiptPreview();

      if (receiptFile) {
        const expenseId = extractExpenseId(data);

        if (!expenseId) {
          throw new Error(
            "Сервер не вернул ID расхода. " +
            "Прикрепите чек через список расходов."
          );
        }

        setFormMessage(
          "Заявка создана. Загружаем чек...",
          "warning"
        );

        await uploadExpenseReceipt(expenseId, receiptFile);
      }

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
          ? "Заявка уже создана. " +
            "Не создавайте её повторно. " +
            "Прикрепите чек через список расходов. " +
            "Подробности: " + error.message
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
  // 10. ОБНОВЛЕНИЕ ДАННЫХ
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
  // 11. ЗАПУСК
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
