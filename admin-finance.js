"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  if (!window.supabase) {
    console.error("Supabase library is not loaded");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const section = document.getElementById("finance");

  if (!section) {
    console.error("Finance section not found");
    return;
  }

  const money = value =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN"
    }).format(Number(value) || 0);

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function showMessage(message, isError = false) {
    setText("financeMessage", message);

    const element = document.getElementById("financeMessage");

    if (element) {
      element.style.color = isError ? "#ff6b6b" : "#22a06b";
    }
  }

  let accountsCache = [];
  let loading = false;

  async function loadBalances() {
    const { data, error } = await client.rpc(
      "get_finance_balances"
    );

    if (error) throw error;

    accountsCache = data || [];

    const sumType = type =>
      accountsCache
        .filter(a =>
          a.account_type === type &&
          a.currency === "PLN"
        )
        .reduce(
          (sum, a) => sum + Number(a.balance),
          0
        );

    const cash = sumType("cash");
    const bank = sumType("bank");

    setText("financeCashBalance", money(cash));
    setText("financeBankBalance", money(bank));
    setText("financeTotalBalance", money(cash + bank));
  }

  async function loadHistory() {
    const container =
      document.getElementById("financeHistory");

    if (!container) return;

    const { data, error } = await client.rpc(
      "get_finance_history",
      { p_limit: 50 }
    );

    if (error) throw error;

    container.replaceChildren();

    if (!data || data.length === 0) {
      container.textContent =
        "Финансовых операций пока нет.";
      return;
    }

    const table = document.createElement("table");

    Object.assign(table.style, {
      width: "100%",
      borderCollapse: "collapse",
      color: "#f5f5f4"
    });

    const header = document.createElement("tr");

    [
      "Дата",
      "Операция",
      "Сумма",
      "Счёт",
      "Описание"
    ].forEach(label => {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.padding = "12px";
      th.style.textAlign = "left";
      th.style.borderBottom = "1px solid #444";
      header.appendChild(th);
    });

    const thead = document.createElement("thead");
    thead.appendChild(header);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const labels = {
      income: "Поступление",
      expense: "Расход",
      transfer: "Перевод"
    };

    data.forEach(operation => {
      const row = document.createElement("tr");

      const account =
        operation.transaction_type === "transfer"
          ? `${operation.from_account || "—"} → ${operation.to_account || "—"}`
          : operation.transaction_type === "income"
            ? operation.to_account || "—"
            : operation.from_account || "—";

      [
        operation.transaction_date || "—",
        labels[operation.transaction_type] ||
          operation.transaction_type,
        money(operation.amount),
        account,
        operation.description || "—"
      ].forEach(value => {
        const td = document.createElement("td");
        td.textContent = value;
        td.style.padding = "12px";
        td.style.borderBottom = "1px solid #383838";
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  async function loadFinance() {
    if (loading) return;

    loading = true;
    showMessage("Загружаем финансовые данные...");

    try {
      await Promise.all([
        loadBalances(),
        loadHistory()
      ]);

      showMessage("Финансовые данные успешно загружены.");
    } catch (error) {
      console.error("Finance error:", error);
      showMessage("Ошибка: " + error.message, true);
    } finally {
      loading = false;
    }
  }

  // ======================================
  // ФОРМА ПОСТУПЛЕНИЯ
  // ======================================

  function createField(labelText, element) {
    const wrapper = document.createElement("label");

    Object.assign(wrapper.style, {
      display: "flex",
      flexDirection: "column",
      gap: "7px",
      marginBottom: "15px",
      color: "#a4a7ad"
    });

    const label = document.createElement("span");
    label.textContent = labelText;

    Object.assign(element.style, {
      width: "100%",
      padding: "12px",
      borderRadius: "7px",
      border: "1px solid #444",
      background: "#202226",
      color: "#f5f5f4",
      font: "inherit",
      boxSizing: "border-box"
    });

    wrapper.append(label, element);

    return wrapper;
  }

  function createSelect() {
    return document.createElement("select");
  }

  function createInput(type) {
    const input = document.createElement("input");
    input.type = type;
    return input;
  }

  async function openIncomeForm() {
    await loadBalances();

    const activeAccounts = accountsCache.filter(
      account =>
        account.currency === "PLN" &&
        account.account_id
    );

    if (!activeAccounts.length) {
      showMessage("Нет доступных финансовых счетов.", true);
      return;
    }

    const overlay = document.createElement("div");

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,.75)",
      zIndex: "99999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      overflowY: "auto"
    });

    const modal = document.createElement("div");

    Object.assign(modal.style, {
      background: "#292c31",
      color: "#f5f5f4",
      border: "1px solid #444",
      borderRadius: "12px",
      padding: "24px",
      width: "100%",
      maxWidth: "520px",
      boxSizing: "border-box"
    });

    const title = document.createElement("h2");
    title.textContent = "Новое поступление";
    title.style.marginTop = "0";

    const subtitle = document.createElement("p");
    subtitle.textContent =
      "Регистрация поступления денег компании";
    subtitle.style.color = "#a4a7ad";

    const form = document.createElement("form");

    const accountSelect = createSelect();

    activeAccounts.forEach(account => {
      const option = document.createElement("option");
      option.value = account.account_id;
      option.textContent =
        `${account.account_name} — ${money(account.balance)}`;
      accountSelect.appendChild(option);
    });

    const amountInput = createInput("number");
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.placeholder = "Например, 1500.00";
    amountInput.required = true;

    const categorySelect = createSelect();

    [
      ["client_payment", "Оплата клиента"],
      ["advance", "Аванс"],
      ["contract_payment", "Оплата договора"],
      ["other", "Другой доход"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      categorySelect.appendChild(option);
    });

    const projectSelect = createSelect();

    const noProject = document.createElement("option");
    noProject.value = "";
    noProject.textContent = "Без привязки к объекту";
    projectSelect.appendChild(noProject);

    const description = document.createElement("textarea");
    description.rows = 3;
    description.placeholder = "Описание поступления...";

    form.append(
      createField("Счёт зачисления", accountSelect),
      createField("Сумма (PLN)", amountInput),
      createField("Категория дохода", categorySelect),
      createField("Объект (необязательно)", projectSelect),
      createField("Описание", description)
    );

    try {
      const { data, error } = await client
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (error) throw error;

      (data || []).forEach(project => {
        const option = document.createElement("option");
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
      });
    } catch (error) {
      console.warn("Projects list unavailable:", error);
    }

    const errorText = document.createElement("p");
    errorText.style.color = "#ff6b6b";
    errorText.style.fontSize = "13px";

    const buttons = document.createElement("div");

    Object.assign(buttons.style, {
      display: "flex",
      gap: "10px",
      justifyContent: "flex-end",
      marginTop: "20px"
    });

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.textContent = "Отмена";

    const submitButton = document.createElement("button");
    submitButton.type = "submit";
    submitButton.textContent = "Зарегистрировать поступление";

    [cancelButton, submitButton].forEach(button => {
      Object.assign(button.style, {
        padding: "12px 16px",
        borderRadius: "7px",
        border: "none",
        cursor: "pointer",
        fontWeight: "600"
      });
    });

    cancelButton.style.background = "#444";
    cancelButton.style.color = "#fff";
    submitButton.style.background = "#ff812e";
    submitButton.style.color = "#202226";

    buttons.append(cancelButton, submitButton);

    form.append(errorText, buttons);
    modal.append(title, subtitle, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    function closeForm() {
      overlay.remove();
    }

    cancelButton.addEventListener("click", closeForm);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) closeForm();
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const amount = Number(amountInput.value);

      if (!Number.isFinite(amount) || amount <= 0) {
        errorText.textContent = "Укажи корректную сумму.";
        return;
      }

      if (Math.round(amount * 100) !== amount * 100) {
        errorText.textContent =
          "Допускается не более двух знаков после запятой.";
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Сохраняем...";
      errorText.textContent = "";

      try {
        const { data, error } = await client.rpc(
          "create_finance_income",
          {
            p_account_id: accountSelect.value,
            p_amount: amount,
            p_category: categorySelect.value,
            p_description: description.value.trim() || null,
            p_project_id: projectSelect.value || null
          }
        );

        if (error) throw error;

        console.log("Income transaction created:", data);

        closeForm();

        await loadFinance();

        showMessage(
          "Поступление успешно зарегистрировано."
        );

      } catch (error) {
        console.error("Income creation error:", error);

        errorText.textContent = error.message;
        submitButton.disabled = false;
        submitButton.textContent =
          "Зарегистрировать поступление";
      }
    });
  }

  // ======================================
  // РАСХОДЫ: СОЗДАНИЕ ЗАЯВКИ И УПРАВЛЕНИЕ
  // ======================================

  async function loadExpenseProjects() {
    const { data, error } = await client
      .from("projects")
      .select("id, name, status")
      .in("status", ["planned", "active", "paused"])
      .order("name");

    if (error) throw error;
    return data || [];
  }

  async function uploadExpenseReceipt(file, projectId) {
    if (!file) return null;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic"
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error("Чек должен быть изображением JPG, PNG, WEBP или HEIC.");
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error("Размер фотографии не должен превышать 10 MB.");
    }

    const { data: userResult, error: userError } =
      await client.auth.getUser();

    if (userError) throw userError;

    const user = userResult?.user;

    if (!user) {
      throw new Error("Не удалось определить текущего пользователя.");
    }

    const { data: employee, error: employeeError } = await client
      .from("employees")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (employeeError) throw employeeError;

    if (!employee?.id) {
      throw new Error(
        "Для загрузки чека нужна активная запись сотрудника в системе."
      );
    }

    const extensionByType = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic"
    };

    const extension =
      extensionByType[file.type] || "jpg";

    const fileName =
      `${crypto.randomUUID()}.${extension}`;

    // Структура соответствует Storage policy:
    // project_id/employee_id/filename
    const path =
      `${projectId}/${employee.id}/${fileName}`;

    const { error: uploadError } = await client.storage
      .from("request-photos")
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type
      });

    if (uploadError) throw uploadError;

    return path;
  }

  async function openExpenseForm() {
    let projects;

    try {
      projects = await loadExpenseProjects();
    } catch (error) {
      showMessage("Не удалось загрузить объекты: " + error.message, true);
      return;
    }

    if (!projects.length) {
      showMessage("Нет доступных объектов. Для заявки на расход нужен объект.", true);
      return;
    }

    const overlay = document.createElement("div");

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,.78)",
      zIndex: "100000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      overflowY: "auto"
    });

    const modal = document.createElement("div");

    Object.assign(modal.style, {
      width: "100%",
      maxWidth: "540px",
      maxHeight: "90vh",
      overflowY: "auto",
      boxSizing: "border-box",
      padding: "24px",
      borderRadius: "12px",
      border: "1px solid #444",
      background: "#292c31",
      color: "#f5f5f4"
    });

    const heading = document.createElement("h2");
    heading.textContent = "Новая заявка на расход";
    heading.style.marginTop = "0";

    const note = document.createElement("p");
    note.textContent =
      "Заявка сначала отправляется на проверку. Баланс изменится только после утверждения и оплаты владельцем.";

    Object.assign(note.style, {
      color: "#a4a7ad",
      lineHeight: "1.5"
    });

    const form = document.createElement("form");

    const projectSelect = document.createElement("select");

    projects.forEach(project => {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent = project.name;
      projectSelect.appendChild(option);
    });

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.required = true;
    titleInput.maxLength = 160;
    titleInput.placeholder = "Например: покупка мешков для мусора";

    const amountInput = document.createElement("input");
    amountInput.type = "number";
    amountInput.required = true;
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.placeholder = "0.00";

    const categorySelect = document.createElement("select");

    [
      ["materials", "Материалы"],
      ["tools", "Инструменты"],
      ["transport", "Транспорт"],
      ["fuel", "Топливо"],
      ["debris", "Вывоз мусора"],
      ["food", "Питание и вода"],
      ["other", "Другое"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      categorySelect.appendChild(option);
    });

    const paymentSelect = document.createElement("select");

    [
      ["cash", "Наличные компании"],
      ["bank", "Банковский счёт"],
      ["personal", "Личные деньги сотрудника"]
    ].forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      paymentSelect.appendChild(option);
    });

    const descriptionInput = document.createElement("textarea");
    descriptionInput.rows = 3;
    descriptionInput.maxLength = 2000;
    descriptionInput.placeholder = "Дополнительные подробности...";

    const receiptInput = document.createElement("input");
    receiptInput.type = "file";
    receiptInput.accept = "image/jpeg,image/png,image/webp,image/heic";
    receiptInput.capture = "environment";
    receiptInput.required = false;

    const receiptNote = document.createElement("p");
    receiptNote.textContent =
      "Можно сфотографировать чек или выбрать изображение. Максимальный размер — 10 MB.";

    Object.assign(receiptNote.style, {
      color: "#a4a7ad",
      fontSize: "12px",
      lineHeight: "1.5"
    });

    form.append(
      createField("Объект *", projectSelect),
      createField("На что потрачены деньги *", titleInput),
      createField("Сумма, PLN *", amountInput),
      createField("Категория", categorySelect),
      createField("Способ оплаты", paymentSelect),
      createField("Описание", descriptionInput),
      createField("Фотография чека (необязательно)", receiptInput)
    );

    form.appendChild(receiptNote);

    const errorText = document.createElement("p");
    errorText.style.color = "#ff6b6b";
    errorText.style.whiteSpace = "pre-wrap";

    const actions = document.createElement("div");

    Object.assign(actions.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      marginTop: "18px"
    });

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Отмена";

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Отправить заявку";

    [cancel, submit].forEach(button => {
      Object.assign(button.style, {
        padding: "11px 14px",
        border: "0",
        borderRadius: "7px",
        cursor: "pointer",
        fontWeight: "600"
      });
    });

    cancel.style.background = "#444";
    cancel.style.color = "#fff";
    submit.style.background = "#ff812e";
    submit.style.color = "#202226";

    actions.append(cancel, submit);
    form.append(errorText, actions);
    modal.append(heading, note, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    cancel.addEventListener("click", close);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const amount = Number(amountInput.value);

      if (
        !Number.isFinite(amount) ||
        amount <= 0 ||
        Math.round(amount * 100) !== amount * 100
      ) {
        errorText.textContent =
          "Введи корректную сумму с точностью до 2 знаков.";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Отправляем...";
      errorText.textContent = "";

      try {
        const selectedFile = receiptInput.files?.[0] || null;

        const receiptPath = selectedFile
          ? await uploadExpenseReceipt(
              selectedFile,
              projectSelect.value
            )
          : null;

        const { data, error } = await client.rpc(
          "submit_expense",
          {
            p_project_id: projectSelect.value,
            p_title: titleInput.value.trim(),
            p_amount: amount,
            p_payment_method: paymentSelect.value,
            p_description: descriptionInput.value.trim() || null,
            p_category: categorySelect.value,
            p_receipt_path: receiptPath
          }
        );

        if (error) throw error;

        close();

        showMessage(
          "Заявка на расход создана. ID: " + data
        );

        await loadExpenseRequests();

      } catch (error) {
        console.error("Expense submission error:", error);

        errorText.textContent =
          error.message +
          "\nПроверь, что у текущего пользователя есть активная запись сотрудника и доступ к выбранному объекту.";

        submit.disabled = false;
        submit.textContent = "Отправить заявку";
      }
    });
  }

  function addExpensePanel() {
    let panel = document.getElementById(
      "financeExpenseRequests"
    );

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "financeExpenseRequests";

      Object.assign(panel.style, {
        marginTop: "20px",
        padding: "20px",
        border: "1px solid #3b3f46",
        borderRadius: "10px",
        background: "#292c31",
        color: "#f5f5f4"
      });

      const history = document.getElementById("financeHistory");
      const historyCard = history?.closest(".panel, .card");

      if (historyCard?.parentElement) {
        historyCard.parentElement.insertBefore(panel, historyCard);
      } else {
        section.appendChild(panel);
      }
    }

    return panel;
  }

  async function loadExpenseRequests() {
    const panel = addExpensePanel();
    panel.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Заявки на расходы";
    heading.style.marginTop = "0";

    const subtitle = document.createElement("p");
    subtitle.textContent =
      "Ожидающие проверки, утверждённые и оплаченные расходы.";
    subtitle.style.color = "#a4a7ad";

    const refresh = document.createElement("button");
    refresh.type = "button";
    refresh.textContent = "Обновить заявки";

    Object.assign(refresh.style, {
      padding: "8px 12px",
      marginBottom: "12px",
      border: "1px solid #ff812e",
      borderRadius: "6px",
      background: "transparent",
      color: "#ff812e",
      cursor: "pointer"
    });

    refresh.addEventListener("click", loadExpenseRequests);

    panel.append(heading, subtitle, refresh);

    const { data, error } = await client
      .from("expense_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      const message = document.createElement("p");
      message.textContent =
        "Не удалось загрузить заявки: " + error.message;
      message.style.color = "#ff7373";
      panel.appendChild(message);

      console.error("Expense requests loading error:", error);
      return;
    }

    if (!data || data.length === 0) {
      const empty = document.createElement("p");
      empty.textContent = "Заявок на расходы пока нет.";
      panel.appendChild(empty);
      return;
    }

    const balanceResult = accountsCache.length
      ? { data: accountsCache }
      : await client.rpc("get_finance_balances");

    if (balanceResult.error) {
      throw balanceResult.error;
    }

    const accountData = balanceResult.data || [];

    const statusLabels = {
      pending: "Ожидает проверки",
      approved: "Утверждён",
      rejected: "Отклонён",
      paid: "Оплачен"
    };

    data.forEach(expense => {
      const card = document.createElement("article");

      Object.assign(card.style, {
        padding: "14px",
        marginTop: "12px",
        border: "1px solid #444",
        borderRadius: "8px",
        background: "#24272c"
      });

      const title = document.createElement("strong");
      title.textContent = expense.title || "Расход";
      title.style.display = "block";

      const details = document.createElement("p");
      details.textContent =
        `${money(expense.amount)} · ${expense.category || "Без категории"} · ${statusLabels[expense.status] || expense.status}`;

      details.style.margin = "8px 0";

      const info = document.createElement("small");

      info.textContent =
        `Дата: ${expense.expense_date || expense.created_at?.slice(0, 10) || "—"} · Объект ID: ${expense.project_id || "—"} · Сотрудник ID: ${expense.employee_id || "—"}`;

      info.style.color = "#a4a7ad";
      info.style.display = "block";

      card.append(title, details, info);

      if (expense.description) {
        const description = document.createElement("p");
        description.textContent = expense.description;
        card.appendChild(description);
      }

      if (expense.receipt_path) {
        const receipt = document.createElement("div");
        receipt.style.marginTop = "10px";

        const receiptButton = document.createElement("button");
        receiptButton.type = "button";
        receiptButton.textContent = "Открыть фотографию чека";

        receiptButton.style.cssText =
          "padding:9px 12px;border:1px solid #5489d8;border-radius:6px;background:transparent;color:#8db7ff;cursor:pointer";

        receiptButton.addEventListener("click", async () => {
          receiptButton.disabled = true;
          receiptButton.textContent = "Открываем чек...";

          try {
            const { data: signed, error: signedError } =
              await client.storage
                .from("request-photos")
                .createSignedUrl(expense.receipt_path, 300);

            if (signedError) throw signedError;
            if (!signed?.signedUrl) {
              throw new Error("Не удалось получить ссылку на чек.");
            }

            window.open(
              signed.signedUrl,
              "_blank",
              "noopener,noreferrer"
            );

            receiptButton.textContent = "Открыть фотографию чека";
          } catch (err) {
            console.error("Receipt viewing error:", err);
            showMessage(
              "Не удалось открыть чек: " + err.message,
              true
            );
            receiptButton.textContent = "Повторить открытие чека";
          } finally {
            receiptButton.disabled = false;
          }
        });

        receipt.appendChild(receiptButton);
        card.appendChild(receipt);
      }

      const buttons = document.createElement("div");

      Object.assign(buttons.style, {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginTop: "12px"
      });

      if (expense.status === "pending") {
        const approve = document.createElement("button");
        approve.type = "button";
        approve.textContent = "Утвердить";

        approve.style.cssText =
          "padding:9px 12px;border:0;border-radius:6px;background:#22a06b;color:white;cursor:pointer";

        approve.addEventListener("click", async () => {
          if (!confirm("Утвердить эту заявку на расход?")) return;

          approve.disabled = true;

          try {
            const { error } = await client.rpc(
              "approve_expense",
              {
                p_expense_id: expense.id,
                p_action: "approved",
                p_reason: null
              }
            );

            if (error) throw error;

            showMessage(
              "Расход утверждён. Для списания нажми «Оплатить»."
            );

            await loadExpenseRequests();

          } catch (err) {
            showMessage(
              "Ошибка утверждения: " + err.message,
              true
            );

            approve.disabled = false;
          }
        });

        const reject = document.createElement("button");
        reject.type = "button";
        reject.textContent = "Отклонить";

        reject.style.cssText =
          "padding:9px 12px;border:0;border-radius:6px;background:#a83e3e;color:white;cursor:pointer";

        reject.addEventListener("click", async () => {
          const reason = prompt("Укажи причину отклонения:");

          if (!reason || !reason.trim()) return;

          reject.disabled = true;

          try {
            const { error } = await client.rpc(
              "approve_expense",
              {
                p_expense_id: expense.id,
                p_action: "rejected",
                p_reason: reason.trim()
              }
            );

            if (error) throw error;

            showMessage("Заявка отклонена.");

            await loadExpenseRequests();

          } catch (err) {
            showMessage(
              "Ошибка отклонения: " + err.message,
              true
            );

            reject.disabled = false;
          }
        });

        buttons.append(approve, reject);
      }

      if (
        expense.status === "approved" &&
        !expense.finance_transaction_id
      ) {
        const pay = document.createElement("button");
        pay.type = "button";
        pay.textContent = "Оплатить со счёта";

        pay.style.cssText =
          "padding:9px 12px;border:0;border-radius:6px;background:#ff812e;color:#202226;cursor:pointer";

        pay.addEventListener("click", async () => {
          const compatibleAccounts = accountData.filter(account =>
            account.currency === expense.currency
          );

          if (!compatibleAccounts.length) {
            showMessage(
              "Нет подходящего активного счёта.",
              true
            );
            return;
          }

          const options = compatibleAccounts.map(
            (account, index) =>
              `${index + 1}. ${account.account_name} (${money(account.balance)})`
          ).join("\n");

          const choice = Number(prompt(
            "Выбери счёт для оплаты:\n" +
            options +
            "\nВведи номер счёта:"
          ));

          if (
            !Number.isInteger(choice) ||
            choice < 1 ||
            choice > compatibleAccounts.length
          ) return;

          if (!confirm(
            `Списать ${money(expense.amount)} со счёта ${compatibleAccounts[choice - 1].account_name}?`
          )) return;

          pay.disabled = true;

          try {
            const { data: transactionId, error } =
              await client.rpc("pay_expense", {
                p_expense_id: expense.id,
                p_account_id:
                  compatibleAccounts[choice - 1].account_id
              });

            if (error) throw error;

            showMessage(
              "Расход оплачен. Операция: " + transactionId
            );

            await Promise.all([
              loadFinance(),
              loadExpenseRequests()
            ]);

          } catch (err) {
            showMessage(
              "Ошибка оплаты: " + err.message,
              true
            );

            pay.disabled = false;
          }
        });

        buttons.appendChild(pay);
      }

      if (buttons.childElementCount) {
        card.appendChild(buttons);
      }

      panel.appendChild(card);
    });
  }

  // ======================================
  // ПЕРЕВОД МЕЖДУ СЧЕТАМИ
  // ======================================

  async function openTransferForm() {
    await loadBalances();

    const accounts = accountsCache.filter(account =>
      account.currency === "PLN" && account.account_id
    );

    if (accounts.length < 2) {
      showMessage("Для перевода нужны как минимум два счёта PLN.", true);
      return;
    }

    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed", inset: "0", background: "rgba(0,0,0,.78)",
      zIndex: "100001", display: "flex", alignItems: "center",
      justifyContent: "center", padding: "16px", overflowY: "auto"
    });

    const modal = document.createElement("div");
    Object.assign(modal.style, {
      width: "100%", maxWidth: "520px", maxHeight: "90vh", overflowY: "auto",
      boxSizing: "border-box", padding: "24px", borderRadius: "12px",
      border: "1px solid #444", background: "#292c31", color: "#f5f5f4"
    });

    const title = document.createElement("h2");
    title.textContent = "Перевести деньги";
    title.style.marginTop = "0";

    const note = document.createElement("p");
    note.textContent = "Внутренний перевод между счетами компании. Общий баланс не изменится.";
    note.style.color = "#a4a7ad";

    const form = document.createElement("form");
    const fromSelect = createSelect();
    const toSelect = createSelect();
    const amountInput = createInput("number");
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.required = true;
    amountInput.placeholder = "Например, 50.00";

    const description = document.createElement("textarea");
    description.rows = 3;
    description.maxLength = 2000;
    description.placeholder = "Например, выдача наличных бригадиру";

    for (const account of accounts) {
      for (const select of [fromSelect, toSelect]) {
        const option = document.createElement("option");
        option.value = account.account_id;
        option.textContent = `${account.account_name} — ${money(account.balance)}`;
        select.appendChild(option);
      }
    }

    const firstWithFunds = accounts.find(a => Number(a.balance) > 0);
    if (firstWithFunds) fromSelect.value = firstWithFunds.account_id;

    function updateDestination() {
      const other = accounts.find(a => a.account_id !== fromSelect.value);
      if (toSelect.value === fromSelect.value && other) {
        toSelect.value = other.account_id;
      }
      const source = accounts.find(a => a.account_id === fromSelect.value);
      balanceNote.textContent = source
        ? `Доступно на счёте отправителя: ${money(source.balance)}`
        : "";
    }

    const balanceNote = document.createElement("p");
    balanceNote.style.color = "#a4a7ad";
    balanceNote.style.fontSize = "13px";
    fromSelect.addEventListener("change", updateDestination);
    updateDestination();

    form.append(
      createField("Откуда перевести", fromSelect),
      balanceNote,
      createField("Куда перевести", toSelect),
      createField("Сумма (PLN)", amountInput),
      createField("Комментарий (необязательно)", description)
    );

    const errorText = document.createElement("p");
    errorText.style.color = "#ff6b6b";
    errorText.style.whiteSpace = "pre-wrap";

    const actions = document.createElement("div");
    Object.assign(actions.style, {
      display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "20px"
    });

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = "Отмена";
    const submit = document.createElement("button");
    submit.type = "submit";
    submit.textContent = "Перевести деньги";

    for (const button of [cancel, submit]) {
      Object.assign(button.style, {
        padding: "12px 16px", borderRadius: "7px", border: "none",
        cursor: "pointer", fontWeight: "600"
      });
    }
    cancel.style.background = "#444";
    cancel.style.color = "#fff";
    submit.style.background = "#ff812e";
    submit.style.color = "#202226";

    actions.append(cancel, submit);
    form.append(errorText, actions);
    modal.append(title, note, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();
    cancel.addEventListener("click", close);
    overlay.addEventListener("click", event => {
      if (event.target === overlay && !submit.disabled) close();
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();
      const amount = Number(amountInput.value);
      const source = accounts.find(a => a.account_id === fromSelect.value);
      const destination = accounts.find(a => a.account_id === toSelect.value);

      if (!source || !destination || source.account_id === destination.account_id) {
        errorText.textContent = "Выбери два разных счёта.";
        return;
      }
      if (!Number.isFinite(amount) || amount <= 0 ||
          Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) {
        errorText.textContent = "Укажи сумму больше нуля, не более двух знаков после запятой.";
        return;
      }
      if (amount > Number(source.balance)) {
        errorText.textContent = "Недостаточно денег на счёте отправителя.";
        return;
      }

      if (!confirm(
        `Подтвердить перевод ${money(amount)}?\n\n` +
        `Откуда: ${source.account_name}\nКуда: ${destination.account_name}`
      )) return;

      submit.disabled = true;
      cancel.disabled = true;
      submit.textContent = "Переводим...";
      errorText.textContent = "";

      try {
        const { data, error } = await client.rpc("transfer_finance_money", {
          p_from_account_id: source.account_id,
          p_to_account_id: destination.account_id,
          p_amount: amount,
          p_description: description.value.trim() || null
        });
        if (error) throw error;
        close();
        await loadFinance();
        showMessage(`Перевод ${money(amount)} выполнен. Операция: ${data}`);
      } catch (error) {
        console.error("Finance transfer error:", error);
        errorText.textContent = "Ошибка перевода: " + error.message;
        submit.disabled = false;
        cancel.disabled = false;
        submit.textContent = "Перевести деньги";
      }
    });
  }

  // ======================================
  // КНОПКИ
  // ======================================

  const incomeButton =
    document.getElementById("financeIncomeBtn");

  if (incomeButton) {
    incomeButton.disabled = false;

    incomeButton.addEventListener("click", async () => {
      try {
        await openIncomeForm();
      } catch (error) {
        console.error(error);
        showMessage(error.message, true);
      }
    });
  }

  const expenseButton =
    document.getElementById("financeExpenseBtn");

  if (expenseButton) {
    expenseButton.disabled = false;
    expenseButton.removeAttribute("disabled");
    expenseButton.style.pointerEvents = "auto";

    expenseButton.addEventListener("click", async () => {
      try {
        await openExpenseForm();
      } catch (error) {
        console.error("Expense form error:", error);
        showMessage(error.message, true);
      }
    });
  }

  const transferButton =
    document.getElementById("financeTransferBtn");

  if (transferButton) {
    transferButton.disabled = false;
    transferButton.removeAttribute("disabled");
    transferButton.style.pointerEvents = "auto";

    transferButton.addEventListener("click", async () => {
      try {
        await openTransferForm();
      } catch (error) {
        console.error("Transfer form error:", error);
        showMessage("Не удалось открыть перевод: " + error.message, true);
      }
    });
  }

  const refreshButton =
    document.getElementById("financeRefreshBtn");

  if (refreshButton) {
    refreshButton.addEventListener("click", loadFinance);
  }

  const observer = new MutationObserver(() => {
    if (section.style.display !== "none") {
      loadFinance();
    }
  });

  observer.observe(section, {
    attributes: true,
    attributeFilter: ["style"]
  });

  await loadFinance();

  try {
    await loadExpenseRequests();
  } catch (error) {
    console.error(
      "Expense requests initialization error:",
      error
    );
  }

  console.log("CONSTRUCTION GROUP FINANCE initialized");
});
