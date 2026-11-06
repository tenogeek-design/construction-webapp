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

    // Загрузка списка объектов
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

    expenseButton.addEventListener("click", () => {
      showMessage(
        "Форма расхода ещё не подключена. Деньги не списаны.",
        true
      );
    });
  }

  const transferButton =
    document.getElementById("financeTransferBtn");

  if (transferButton) {
    transferButton.disabled = false;
    transferButton.removeAttribute("disabled");
    transferButton.style.pointerEvents = "auto";

    transferButton.addEventListener("click", () => {
      showMessage(
        "Форма перевода ещё не подключена. Перевод не выполнен.",
        true
      );
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

  console.log("CONSTRUCTION GROUP FINANCE initialized");
});
