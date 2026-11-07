
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

  const section = document.getElementById("finance");

  if (!section) {
    console.error("Finance section not found");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        storageKey: "construction-finance-auth"
      }
    }
  );

  let accountsCache = [];
  let loading = false;

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
      element.style.color = isError
        ? "#ff6b6b"
        : "#22a06b";
    }
  }

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

  function addOptions(select, options) {
    options.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });
    return select;
  }

  function validAmount(value) {
    const amount = Number(value);
    return (
      Number.isFinite(amount) &&
      amount > 0 &&
      Math.abs(
        Math.round(amount * 100) - amount * 100
      ) < 0.000001
    );
  }

  function makeButton(text, primary = false) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = text;

    Object.assign(button.style, {
      padding: "11px 15px",
      borderRadius: "7px",
      border: "none",
      cursor: "pointer",
      fontWeight: "600",
      background: primary ? "#ff812e" : "#444",
      color: primary ? "#202226" : "#fff"
    });

    return button;
  }

  function createModal(titleText, descriptionText) {
    const overlay = document.createElement("div");

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,.78)",
      zIndex: "100001",
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

    const title = document.createElement("h2");
    title.textContent = titleText;
    title.style.marginTop = "0";

    const description = document.createElement("p");
    description.textContent = descriptionText;
    description.style.color = "#a4a7ad";

    const form = document.createElement("form");
    form.noValidate = true;

    const errorText = document.createElement("p");
    errorText.style.color = "#ff6b6b";
    errorText.style.whiteSpace = "pre-wrap";

    const actions = document.createElement("div");

    Object.assign(actions.style, {
      display: "flex",
      justifyContent: "flex-end",
      flexWrap: "wrap",
      gap: "10px",
      marginTop: "20px"
    });

    const cancel = makeButton("Отмена");
    const submit = makeButton("Сохранить", true);

    actions.append(cancel, submit);
    form.append(errorText, actions);
    modal.append(title, description, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    cancel.addEventListener("click", close);

    overlay.addEventListener("click", event => {
      if (event.target === overlay && !submit.disabled) {
        close();
      }
    });

    return {
      overlay,
      modal,
      form,
      errorText,
      cancel,
      submit,
      close,
      actions
    };
  }

  function addFormFields(form, fields) {
    const actions = form.querySelector("div:last-child");

    fields.forEach(([label, element]) => {
      const field = createField(label, element);
      form.insertBefore(field, form.firstChild);
    });

    return actions;
  }

  function setBusy(modal, busy, text = "Сохраняем...") {
    modal.submit.disabled = busy;
    modal.cancel.disabled = busy;

    if (busy) {
      modal.submit.dataset.original =
        modal.submit.textContent;
      modal.submit.textContent = text;
    } else {
      modal.submit.textContent =
        modal.submit.dataset.original || "Сохранить";
    }
  }

  // =========================================
  // БАЛАНСЫ
  // =========================================

  async function loadBalances() {
    const { data, error } = await client.rpc(
      "get_finance_balances"
    );

    if (error) throw error;

    accountsCache = data || [];

    const sumType = type =>
      accountsCache
        .filter(account =>
          account.account_type === type &&
          account.currency === "PLN"
        )
        .reduce(
          (sum, account) =>
            sum + Number(account.balance || 0),
          0
        );

    const cash = sumType("cash");
    const bank = sumType("bank");

    setText("financeCashBalance", money(cash));
    setText("financeBankBalance", money(bank));
    setText("financeTotalBalance", money(cash + bank));

    return accountsCache;
  }

  // =========================================
  // ИСТОРИЯ ОПЕРАЦИЙ
  // =========================================

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

    const thead = document.createElement("thead");
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
          operation.transaction_type || "—",
        money(operation.amount),
        account,
        operation.description || "—"
      ].forEach(value => {
        const td = document.createElement("td");
        td.textContent = String(value);
        td.style.padding = "12px";
        td.style.borderBottom =
          "1px solid #383838";
        row.appendChild(td);
      });

      tbody.appendChild(row);
    });

    table.appendChild(tbody);

    const wrapper = document.createElement("div");
    wrapper.style.overflowX = "auto";
    wrapper.appendChild(table);

    container.appendChild(wrapper);
  }

  // =========================================
  // ОБНОВЛЕНИЕ ФИНАНСОВ
  // =========================================

  async function loadFinance() {
    if (loading) return;

    loading = true;
    showMessage("Загружаем финансовые данные...");

    try {
      const results = await Promise.allSettled([
        loadBalances(),
        loadHistory()
      ]);

      const errors = results
        .filter(result => result.status === "rejected")
        .map(result => result.reason?.message || "Ошибка");

      if (errors.length) {
        showMessage(errors.join("; "), true);
        console.error("Finance loading errors:", errors);
      } else {
        showMessage(
          "Финансовые данные успешно загружены."
        );
      }
    } finally {
      loading = false;
    }
  }

  // =========================================
  // ПОСТУПЛЕНИЯ
  // =========================================

  async function openIncomeForm() {
    await loadBalances();

    const accounts = accountsCache.filter(account =>
      account.currency === "PLN" &&
      account.account_id
    );

    if (!accounts.length) {
      showMessage(
        "Нет доступных финансовых счетов.",
        true
      );
      return;
    }

    const modal = createModal(
      "Новое поступление",
      "Регистрация поступления денег компании"
    );

    const accountSelect = addOptions(
      createSelect(),
      accounts.map(account => [
        account.account_id,
        `${account.account_name} — ${money(account.balance)}`
      ])
    );

    const amountInput = createInput("number");
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.placeholder = "Например, 1500.00";

    const categorySelect = addOptions(
      createSelect(),
      [
        ["client_payment", "Оплата клиента"],
        ["advance", "Аванс"],
        ["contract_payment", "Оплата договора"],
        ["other", "Другой доход"]
      ]
    );

    const projectSelect = addOptions(
      createSelect(),
      [["", "Без привязки к объекту"]]
    );

    const description = document.createElement("textarea");
    description.rows = 3;
    description.placeholder = "Описание поступления...";

    const fields = [
      ["Счёт зачисления", accountSelect],
      ["Сумма (PLN)", amountInput],
      ["Категория дохода", categorySelect],
      ["Объект (необязательно)", projectSelect],
      ["Описание", description]
    ];

    fields.reverse().forEach(([label, element]) => {
      modal.form.prepend(createField(label, element));
    });

    modal.submit.textContent =
      "Зарегистрировать поступление";

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
      console.warn("Projects unavailable:", error);
    }

    async function submitIncome() {
      if (modal.submit.disabled) return;

      modal.errorText.textContent = "";

      if (!validAmount(amountInput.value)) {
        modal.errorText.textContent =
          "Укажи корректную сумму с точностью до 2 знаков.";
        return;
      }

      const amount = Number(amountInput.value);

      if (!window.confirm(
        `Зарегистрировать поступление ${money(amount)}?`
      )) return;

      setBusy(modal, true);

      try {
        const { error } = await client.rpc(
          "create_finance_income",
          {
            p_account_id: accountSelect.value,
            p_amount: amount,
            p_category: categorySelect.value,
            p_description:
              description.value.trim() || null,
            p_project_id: projectSelect.value || null
          }
        );

        if (error) throw error;

        modal.close();
        await loadFinance();

        showMessage(
          "Поступление успешно зарегистрировано."
        );
      } catch (error) {
        console.error("Income error:", error);
        modal.errorText.textContent = error.message;
        setBusy(modal, false);
      }
    }

    modal.submit.addEventListener(
      "click",
      submitIncome
    );

    modal.form.addEventListener("submit", event => {
      event.preventDefault();
      submitIncome();
    });
  }

  // =========================================
  // ПЕРЕВОДЫ МЕЖДУ СЧЕТАМИ
  // =========================================

  async function openTransferForm() {
    await loadBalances();

    const accounts = accountsCache.filter(account =>
      account.currency === "PLN" &&
      account.account_id
    );

    if (accounts.length < 2) {
      showMessage(
        "Для перевода нужны минимум два счёта PLN.",
        true
      );
      return;
    }

    const modal = createModal(
      "Перевести деньги",
      "Внутренний перевод между счетами компании. Общий баланс не изменится."
    );

    const fromSelect = createSelect();
    const toSelect = createSelect();

    accounts.forEach(account => {
      [fromSelect, toSelect].forEach(select => {
        const option = document.createElement("option");
        option.value = account.account_id;
        option.textContent =
          `${account.account_name} — ${money(account.balance)}`;
        select.appendChild(option);
      });
    });

    const firstWithFunds = accounts.find(
      account => Number(account.balance) > 0
    );

    if (firstWithFunds) {
      fromSelect.value = firstWithFunds.account_id;
    }

    const balanceNote = document.createElement("p");
    balanceNote.style.color = "#a4a7ad";
    balanceNote.style.fontSize = "13px";

    const amountInput = createInput("number");
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.placeholder = "Например, 50.00";

    const description = document.createElement("textarea");
    description.rows = 3;
    description.maxLength = 2000;
    description.placeholder =
      "Например, выдача наличных бригадиру";

    const fields = [
      ["Откуда перевести", fromSelect],
      ["Куда перевести", toSelect],
      ["Сумма (PLN)", amountInput],
      ["Комментарий (необязательно)", description]
    ];

    fields.reverse().forEach(([label, element]) => {
      modal.form.prepend(createField(label, element));
    });

    fromSelect.parentElement.after(balanceNote);

    function updateDestination() {
      if (fromSelect.value === toSelect.value) {
        const other = accounts.find(account =>
          account.account_id !== fromSelect.value
        );

        if (other) {
          toSelect.value = other.account_id;
        }
      }

      const source = accounts.find(account =>
        account.account_id === fromSelect.value
      );

      balanceNote.textContent = source
        ? `Доступно: ${money(source.balance)}`
        : "";
    }

    fromSelect.addEventListener(
      "change",
      updateDestination
    );

    updateDestination();

    modal.submit.textContent = "Перевести деньги";

    async function executeTransfer() {
      if (modal.submit.disabled) return;

      modal.errorText.textContent = "";

      const source = accounts.find(account =>
        account.account_id === fromSelect.value
      );

      const destination = accounts.find(account =>
        account.account_id === toSelect.value
      );

      if (!source || !destination) {
        modal.errorText.textContent =
          "Выбери счета перевода.";
        return;
      }

      if (source.account_id === destination.account_id) {
        modal.errorText.textContent =
          "Нельзя переводить деньги на тот же счёт.";
        return;
      }

      if (!validAmount(amountInput.value)) {
        modal.errorText.textContent =
          "Укажи корректную сумму с точностью до 2 знаков.";
        return;
      }

      const amount = Number(amountInput.value);

      if (amount > Number(source.balance)) {
        modal.errorText.textContent =
          "Недостаточно денег на счёте отправителя.";
        return;
      }

      const confirmed = window.confirm(
        `Подтвердить перевод ${money(amount)}?\n\n` +
        `Откуда: ${source.account_name}\n` +
        `Куда: ${destination.account_name}`
      );

      if (!confirmed) return;

      setBusy(modal, true, "Переводим...");

      try {
        const { data, error } = await client.rpc(
          "transfer_finance_money",
          {
            p_from_account_id: source.account_id,
            p_to_account_id: destination.account_id,
            p_amount: amount,
            p_description:
              description.value.trim() || null
          }
        );

        if (error) throw error;

        modal.close();

        try {
          await loadFinance();
          showMessage(
            `Перевод ${money(amount)} выполнен. Операция: ${data}`
          );
        } catch (refreshError) {
          console.error(refreshError);
          showMessage(
            "Перевод выполнен, но обновление данных не удалось.",
            true
          );
        }
      } catch (error) {
        console.error("Transfer error:", error);
        modal.errorText.textContent =
          "Ошибка перевода: " + error.message;
        setBusy(modal, false);
      }
    }

    modal.submit.addEventListener(
      "click",
      executeTransfer
    );

    modal.form.addEventListener("submit", event => {
      event.preventDefault();
      executeTransfer();
    });
  }

  // =========================================
  // РАСХОДЫ — ОБЪЕКТЫ
  // =========================================

  async function loadExpenseProjects() {
    const { data, error } = await client
      .from("projects")
      .select("id, name, status")
      .in("status", ["planned", "active", "paused"])
      .order("name");

    if (error) throw error;
    return data || [];
  }

  // =========================================
  // СОЗДАНИЕ ЗАЯВКИ НА РАСХОД
  // =========================================

  async function openExpenseForm() {
    let projects;

    try {
      projects = await loadExpenseProjects();
    } catch (error) {
      showMessage(
        "Не удалось загрузить объекты: " +
        error.message,
        true
      );
      return;
    }

    if (!projects.length) {
      showMessage(
        "Нет доступных объектов. Для заявки нужен объект.",
        true
      );
      return;
    }

    const modal = createModal(
      "Новая заявка на расход",
      "Баланс изменится только после утверждения и оплаты расхода."
    );

    const projectSelect = addOptions(
      createSelect(),
      projects.map(project => [
        project.id,
        project.name
      ])
    );

    const titleInput = createInput("text");
    titleInput.maxLength = 160;
    titleInput.placeholder =
      "Например, покупка мешков для мусора";

    const amountInput = createInput("number");
    amountInput.min = "0.01";
    amountInput.step = "0.01";
    amountInput.placeholder = "0.00";

    const categorySelect = addOptions(
      createSelect(),
      [
        ["materials", "Материалы"],
        ["tools", "Инструменты"],
        ["transport", "Транспорт"],
        ["fuel", "Топливо"],
        ["debris", "Вывоз мусора"],
        ["food", "Питание и вода"],
        ["other", "Другое"]
      ]
    );

    const paymentSelect = addOptions(
      createSelect(),
      [
        ["cash", "Наличные компании"],
        ["bank", "Банковский счёт"],
        ["personal", "Личные деньги сотрудника"]
      ]
    );

    const descriptionInput =
      document.createElement("textarea");

    descriptionInput.rows = 3;
    descriptionInput.maxLength = 2000;
    descriptionInput.placeholder =
      "Дополнительные подробности...";

    const fields = [
      ["Объект", projectSelect],
      ["На что потрачены деньги", titleInput],
      ["Сумма (PLN)", amountInput],
      ["Категория", categorySelect],
      ["Способ оплаты", paymentSelect],
      ["Описание", descriptionInput]
    ];

    fields.reverse().forEach(([label, element]) => {
      modal.form.prepend(createField(label, element));
    });

    const receiptNote = document.createElement("p");
    receiptNote.textContent =
      "Фотография чека будет подключена после настройки хранилища чеков в Supabase.";

    Object.assign(receiptNote.style, {
      color: "#a4a7ad",
      fontSize: "12px",
      lineHeight: "1.5"
    });

    modal.errorText.before(receiptNote);
    modal.submit.textContent = "Отправить заявку";

    async function submitExpense() {
      if (modal.submit.disabled) return;

      modal.errorText.textContent = "";

      if (!titleInput.value.trim()) {
        modal.errorText.textContent =
          "Укажи, на что потрачены деньги.";
        return;
      }

      if (!validAmount(amountInput.value)) {
        modal.errorText.textContent =
          "Укажи корректную сумму.";
        return;
      }

      setBusy(modal, true, "Отправляем...");

      try {
        const { data, error } = await client.rpc(
          "submit_expense",
          {
            p_project_id: projectSelect.value,
            p_title: titleInput.value.trim(),
            p_amount: Number(amountInput.value),
            p_payment_method: paymentSelect.value,
            p_description:
              descriptionInput.value.trim() || null,
            p_category: categorySelect.value,
            p_receipt_path: null
          }
        );

        if (error) throw error;

        modal.close();

        showMessage(
          "Заявка на расход создана. ID: " + data
        );

        await loadExpenseRequests();
      } catch (error) {
        console.error("Expense error:", error);

        modal.errorText.textContent =
          error.message +
          "\nПроверь запись сотрудника и доступ к объекту.";

        setBusy(modal, false);
      }
    }

    modal.submit.addEventListener(
      "click",
      submitExpense
    );

    modal.form.addEventListener("submit", event => {
      event.preventDefault();
      submitExpense();
    });
  }

  // =========================================
  // ПАНЕЛЬ ЗАЯВОК НА РАСХОДЫ
  // =========================================

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

      const history =
        document.getElementById("financeHistory");

      const historyCard =
        history?.closest(".panel, .card");

      if (historyCard?.parentElement) {
        historyCard.parentElement.insertBefore(
          panel,
          historyCard
        );
      } else {
        section.appendChild(panel);
      }
    }

    return panel;
  }

  function expenseButton(text, background) {
    const button = makeButton(text);
    button.style.background = background;
    button.style.color = "#fff";
    return button;
  }

  // =========================================
  // ЗАГРУЗКА ЗАЯВОК
  // =========================================

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

    const refresh = makeButton("Обновить заявки");
    refresh.style.marginBottom = "12px";

    refresh.addEventListener("click", async () => {
      try {
        await loadExpenseRequests();
      } catch (error) {
        showMessage(error.message, true);
      }
    });

    panel.append(heading, subtitle, refresh);

    const { data, error } = await client
      .from("expense_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      const message = document.createElement("p");
      message.textContent =
        "Не удалось загрузить заявки: " +
        error.message;
      message.style.color = "#ff7373";
      panel.appendChild(message);
      return;
    }

    if (!data || data.length === 0) {
      const empty = document.createElement("p");
      empty.textContent =
        "Заявок на расходы пока нет.";
      panel.appendChild(empty);
      return;
    }

    const accountResult = accountsCache.length
      ? { data: accountsCache, error: null }
      : await client.rpc("get_finance_balances");

    if (accountResult.error) {
      console.error(accountResult.error);
    }

    const accountData = accountResult.data || [];

    const statusLabels = {
      pending: "Ожидает проверки",
      approved: "Утверждён",
      rejected: "Отклонён",
      paid: "Оплачен"
    };

    for (const expense of data) {
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
        `${money(expense.amount)} · ` +
        `${expense.category || "Без категории"} · ` +
        `${statusLabels[expense.status] || expense.status}`;

      const info = document.createElement("small");
      info.textContent =
        `Дата: ${expense.expense_date ||
          expense.created_at?.slice(0, 10) || "—"} · ` +
        `Объект ID: ${expense.project_id || "—"} · ` +
        `Сотрудник ID: ${expense.employee_id || "—"}`;

      info.style.color = "#a4a7ad";
      info.style.display = "block";

      card.append(title, details, info);

      if (expense.description) {
        const description = document.createElement("p");
        description.textContent = expense.description;
        card.appendChild(description);
      }

      if (expense.receipt_path) {
        const receipt = document.createElement("p");
        receipt.textContent =
          "Чек приложен: " + expense.receipt_path;
        receipt.style.color = "#a4a7ad";
        card.appendChild(receipt);
      }

      const buttons = document.createElement("div");

      Object.assign(buttons.style, {
        display: "flex",
        flexWrap: "wrap",
        gap: "8px",
        marginTop: "12px"
      });

      // УТВЕРЖДЕНИЕ И ОТКЛОНЕНИЕ

      if (expense.status === "pending") {
        const approve = expenseButton(
          "Утвердить",
          "#22a06b"
        );

        approve.addEventListener("click", async () => {
          if (!window.confirm(
            "Утвердить эту заявку на расход?"
          )) return;

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
          } catch (error) {
            showMessage(
              "Ошибка утверждения: " +
              error.message,
              true
            );
            approve.disabled = false;
          }
        });

        const reject = expenseButton(
          "Отклонить",
          "#a83e3e"
        );

        reject.addEventListener("click", async () => {
          const reason = window.prompt(
            "Укажи причину отклонения:"
          );

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
          } catch (error) {
            showMessage(
              "Ошибка отклонения: " +
              error.message,
              true
            );
            reject.disabled = false;
          }
        });

        buttons.append(approve, reject);
      }

      // ОПЛАТА УТВЕРЖДЁННОГО РАСХОДА

      if (
        expense.status === "approved" &&
        !expense.finance_transaction_id
      ) {
        const pay = makeButton(
          "Оплатить со счёта",
          true
        );

        pay.addEventListener("click", async () => {
          const compatibleAccounts =
            accountData.filter(account =>
              account.currency === expense.currency
            );

          if (!compatibleAccounts.length) {
            showMessage(
              "Нет подходящего активного счёта.",
              true
            );
            return;
          }

          const options = compatibleAccounts
            .map((account, index) =>
              `${index + 1}. ${account.account_name} ` +
              `(${money(account.balance)})`
            )
            .join("\n");

          const choice = Number(window.prompt(
            "Выбери счёт для оплаты:\n" +
            options +
            "\nВведи номер счёта:"
          ));

          if (
            !Number.isInteger(choice) ||
            choice < 1 ||
            choice > compatibleAccounts.length
          ) return;

          const selectedAccount =
            compatibleAccounts[choice - 1];

          if (!window.confirm(
            `Списать ${money(expense.amount)} ` +
            `со счёта ${selectedAccount.account_name}?`
          )) return;

          pay.disabled = true;

          try {
            const { data: transactionId, error } =
              await client.rpc("pay_expense", {
                p_expense_id: expense.id,
                p_account_id: selectedAccount.account_id
              });

            if (error) throw error;

            showMessage(
              "Расход оплачен. Операция: " +
              transactionId
            );

            await loadFinance();
            await loadExpenseRequests();
          } catch (error) {
            showMessage(
              "Ошибка оплаты: " +
              error.message,
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
    }
  }

  // =========================================
  // ПОДКЛЮЧЕНИЕ КНОПОК
  // =========================================

  function bindButton(id, handler) {
    const button = document.getElementById(id);

    if (!button) {
      console.warn("Button not found:", id);
      return;
    }

    button.disabled = false;
    button.removeAttribute("disabled");
    button.style.pointerEvents = "auto";

    button.addEventListener("click", async event => {
      event.preventDefault();

      try {
        await handler();
      } catch (error) {
        console.error(
          "Finance button error:",
          id,
          error
        );

        showMessage(
          "Ошибка: " + error.message,
          true
        );
      }
    });
  }

  bindButton(
    "financeIncomeBtn",
    openIncomeForm
  );

  bindButton(
    "financeExpenseBtn",
    openExpenseForm
  );

  bindButton(
    "financeTransferBtn",
    openTransferForm
  );

  bindButton(
    "financeRefreshBtn",
    async () => {
      await loadFinance();
      await loadExpenseRequests();
    }
  );

  // =========================================
  // АВТООБНОВЛЕНИЕ
  // =========================================

  const observer = new MutationObserver(() => {
    if (section.style.display !== "none") {
      loadFinance();
    }
  });

  observer.observe(section, {
    attributes: true,
    attributeFilter: ["style"]
  });

  // =========================================
  // ЗАПУСК
  // =========================================

  await loadFinance();

  try {
    await loadExpenseRequests();
  } catch (error) {
    console.error(
      "Expense requests initialization error:",
      error
    );
  }

  console.log(
    "CONSTRUCTION GROUP FINANCE initialized"
  );
});
