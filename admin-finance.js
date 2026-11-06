"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  if (!window.supabase) {
    console.error("Supabase library not loaded");
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

  const $ = id => document.getElementById(id);

  const money = value =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN"
    }).format(Number(value) || 0);

  function message(text, error = false) {
    const element = $("financeMessage");
    if (!element) return;

    element.textContent = text;
    element.style.color = error ? "#ff6b6b" : "#22a06b";
  }

  let accounts = [];
  let loading = false;

  // ======================================
  // BALANCES
  // ======================================

  async function loadBalances() {
    const { data, error } = await client.rpc(
      "get_finance_balances"
    );

    if (error) throw error;

    accounts = data || [];

    const calculate = type =>
      accounts
        .filter(a =>
          a.account_type === type &&
          a.currency === "PLN"
        )
        .reduce(
          (sum, a) => sum + Number(a.balance),
          0
        );

    const cash = calculate("cash");
    const bank = calculate("bank");

    if ($("financeCashBalance"))
      $("financeCashBalance").textContent = money(cash);

    if ($("financeBankBalance"))
      $("financeBankBalance").textContent = money(bank);

    if ($("financeTotalBalance"))
      $("financeTotalBalance").textContent =
        money(cash + bank);
  }

  // ======================================
  // HISTORY
  // ======================================

  async function loadHistory() {
    const container = $("financeHistory");
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

    const labels = {
      income: "Поступление",
      expense: "Расход",
      transfer: "Перевод"
    };

    const columns = [
      "Дата",
      "Операция",
      "Сумма",
      "Счёт",
      "Описание"
    ];

    const thead = document.createElement("thead");
    const header = document.createElement("tr");

    columns.forEach(name => {
      const th = document.createElement("th");
      th.textContent = name;
      th.style.padding = "12px";
      th.style.textAlign = "left";
      th.style.borderBottom = "1px solid #444";
      header.appendChild(th);
    });

    thead.appendChild(header);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    data.forEach(item => {
      const row = document.createElement("tr");

      const account =
        item.transaction_type === "transfer"
          ? `${item.from_account || "—"} → ${item.to_account || "—"}`
          : item.transaction_type === "income"
            ? item.to_account || "—"
            : item.from_account || "—";

      const values = [
        item.transaction_date || "—",
        labels[item.transaction_type] ||
          item.transaction_type,
        money(item.amount),
        account,
        item.description || "—"
      ];

      values.forEach(value => {
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

  // ======================================
  // LOAD FINANCE
  // ======================================

  async function loadFinance() {
    if (loading) return;

    loading = true;
    message("Загружаем финансовые данные...");

    try {
      await Promise.all([
        loadBalances(),
        loadHistory()
      ]);

      message("Финансовые данные успешно загружены.");
    } catch (error) {
      console.error("Finance loading error:", error);
      message("Ошибка загрузки: " + error.message, true);
    } finally {
      loading = false;
    }
  }

  // ======================================
  // MODAL
  // ======================================

  function createElement(tag, text = "") {
    const element = document.createElement(tag);
    element.textContent = text;
    return element;
  }

  function createField(labelText, input) {
    const label = createElement("label", labelText);

    Object.assign(label.style, {
      display: "flex",
      flexDirection: "column",
      gap: "8px",
      marginBottom: "16px",
      color: "#a4a7ad"
    });

    Object.assign(input.style, {
      width: "100%",
      padding: "12px",
      borderRadius: "7px",
      border: "1px solid #444",
      background: "#202226",
      color: "#fff",
      boxSizing: "border-box",
      font: "inherit"
    });

    label.appendChild(input);
    return label;
  }

  function createButton(text, color = "#ff812e") {
    const button = createElement("button", text);
    button.type = "button";

    Object.assign(button.style, {
      padding: "12px 16px",
      background: color,
      color: "#202226",
      border: "none",
      borderRadius: "7px",
      cursor: "pointer",
      fontWeight: "600"
    });

    return button;
  }

  function openNotice(titleText, description) {
    const overlay = createElement("div");

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      background: "rgba(0,0,0,.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px"
    });

    const modal = createElement("div");

    Object.assign(modal.style, {
      background: "#292c31",
      color: "#fff",
      padding: "24px",
      borderRadius: "12px",
      width: "100%",
      maxWidth: "420px"
    });

    const title = createElement("h2", titleText);
    const text = createElement("p", description);
    text.style.color = "#a4a7ad";

    const close = createButton("Закрыть", "#444");
    close.style.color = "#fff";

    close.addEventListener("click", () => overlay.remove());

    modal.append(title, text, close);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  // ======================================
  // INCOME FORM
  // ======================================

  async function openIncomeForm() {
    await loadBalances();

    const availableAccounts = accounts.filter(
      account =>
        account.currency === "PLN" &&
        account.account_id
    );

    if (!availableAccounts.length) {
      throw new Error("Нет доступных активных счетов.");
    }

    const overlay = createElement("div");

    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      zIndex: "99999",
      background: "rgba(0,0,0,.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      overflowY: "auto"
    });

    const modal = createElement("div");

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

    const title = createElement("h2", "Новое поступление");
    const subtitle = createElement(
      "p",
      "Регистрация поступления денег компании"
    );

    subtitle.style.color = "#a4a7ad";

    const form = createElement("form");

    const account = createElement("select");

    availableAccounts.forEach(item => {
      const option = createElement(
        "option",
        item.account_name
      );

      option.value = item.account_id;
      account.appendChild(option);
    });

    const amount = createElement("input");
    amount.type = "number";
    amount.min = "0.01";
    amount.step = "0.01";
    amount.placeholder = "Например, 1500.00";
    amount.required = true;

    const category = createElement("select");

    [
      ["client_payment", "Оплата клиента"],
      ["advance", "Аванс"],
      ["contract_payment", "Оплата договора"],
      ["other", "Другой доход"]
    ].forEach(([value, label]) => {
      const option = createElement("option", label);
      option.value = value;
      category.appendChild(option);
    });

    const project = createElement("select");

    const noProject = createElement(
      "option",
      "Без привязки к объекту"
    );

    noProject.value = "";
    project.appendChild(noProject);

    const description = createElement("textarea");
    description.rows = 3;
    description.placeholder = "Описание поступления...";

    form.append(
      createField("Счёт зачисления", account),
      createField("Сумма (PLN)", amount),
      createField("Категория дохода", category),
      createField("Объект", project),
      createField("Описание", description)
    );

    // Загрузка объектов
    try {
      const { data, error } = await client
        .from("projects")
        .select("id, name")
        .eq("status", "active")
        .order("name");

      if (error) throw error;

      (data || []).forEach(item => {
        const option = createElement("option", item.name);
        option.value = item.id;
        project.appendChild(option);
      });
    } catch (error) {
      console.warn("Projects loading:", error);
    }

    const errorText = createElement("p");
    errorText.style.color = "#ff6b6b";

    const buttons = createElement("div");

    Object.assign(buttons.style, {
      display: "flex",
      justifyContent: "flex-end",
      gap: "10px",
      flexWrap: "wrap"
    });

    const cancel = createButton("Отмена", "#444");
    cancel.style.color = "#fff";

    const submit = createButton("Зарегистрировать поступление");
    submit.type = "submit";

    buttons.append(cancel, submit);
    form.append(errorText, buttons);

    modal.append(title, subtitle, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    cancel.addEventListener("click", close);

    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });

    form.addEventListener("submit", async event => {
      event.preventDefault();

      const value = Number(amount.value);

      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        Math.round(value * 100) !== value * 100
      ) {
        errorText.textContent = "Проверь правильность суммы.";
        return;
      }

      submit.disabled = true;
      submit.textContent = "Сохраняем...";

      try {
        const { data, error } = await client.rpc(
          "create_finance_income",
          {
            p_account_id: account.value,
            p_amount: value,
            p_category: category.value,
            p_description: description.value.trim() || null,
            p_project_id: project.value || null
          }
        );

        if (error) throw error;

        console.log("Income created:", data);

        close();

        await loadFinance();

        message("Поступление успешно зарегистрировано.");

      } catch (error) {
        console.error("Income error:", error);

        errorText.textContent = error.message;
        submit.disabled = false;
        submit.textContent = "Зарегистрировать поступление";
      }
    });
  }

  // ======================================
  // BUTTONS — ALL CLICKABLE
  // ======================================

  function activateButton(id, callback) {
    const button = $(id);

    if (!button) {
      console.error("Button not found:", id);
      return;
    }

    button.disabled = false;
    button.removeAttribute("disabled");
    button.style.pointerEvents = "auto";
    button.style.cursor = "pointer";
    button.style.opacity = "1";

    button.addEventListener("click", async event => {
      event.preventDefault();

      try {
        await callback();
      } catch (error) {
        console.error("Finance button error:", error);
        message(error.message, true);
      }
    });
  }

  activateButton("financeIncomeBtn", openIncomeForm);

  activateButton("financeExpenseBtn", async () => {
    openNotice(
      "Новый расход",
      "Форма расхода будет подключена после проверки существующего процесса заявок и оплаты."
    );
  });

  activateButton("financeTransferBtn", async () => {
    openNotice(
      "Перевод между счетами",
      "Форма перевода будет подключена после проверки существующей функции перевода."
    );
  });

  activateButton("financeRefreshBtn", loadFinance);

  // ======================================
  // AUTO REFRESH
  // ======================================

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
