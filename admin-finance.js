
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

  // Используем стандартное хранилище авторизации,
  // как в основном модуле админки.
  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
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

    const element = document.getElementById(
      "financeMessage"
    );

    if (element) {
      element.style.color = isError
        ? "#ff6b6b"
        : "#22a06b";
    }
  }

  function validAmount(value) {
    if (value === "" || value === null) return false;

    const amount = Number(value);

    return (
      Number.isFinite(amount) &&
      amount > 0 &&
      Math.abs(
        Math.round(amount * 100) - amount * 100
      ) < 0.000001
    );
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

  function createSelect(options = []) {
    const select = document.createElement("select");

    options.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      select.appendChild(option);
    });

    return select;
  }

  function createInput(type, placeholder = "") {
    const input = document.createElement("input");

    input.type = type;
    input.placeholder = placeholder;

    if (type === "number") {
      input.min = "0.01";
      input.step = "0.01";
    }

    return input;
  }

  function createButton(text, primary = false) {
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

  function createModal(titleText, subtitleText) {
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

    const subtitle = document.createElement("p");
    subtitle.textContent = subtitleText;
    subtitle.style.color = "#a4a7ad";

    const form = document.createElement("form");
    form.noValidate = true;

    const fields = document.createElement("div");

    const errorText = document.createElement("p");
    errorText.style.color = "#ff6b6b";
    errorText.style.whiteSpace = "pre-wrap";

    const actions = document.createElement("div");

    Object.assign(actions.style, {
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "flex-end",
      gap: "10px",
      marginTop: "20px"
    });

    const cancel = createButton("Отмена");
    const submit = createButton("Сохранить", true);

    actions.append(cancel, submit);
    form.append(fields, errorText, actions);
    modal.append(title, subtitle, form);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    cancel.addEventListener("click", close);

    overlay.addEventListener("click", event => {
      if (
        event.target === overlay &&
        !submit.disabled
      ) {
        close();
      }
    });

    return {
      overlay,
      form,
      fields,
      errorText,
      cancel,
      submit,
      close
    };
  }

  function addFields(modal, fields) {
    fields.forEach(([label, element]) => {
      modal.fields.appendChild(
        createField(label, element)
      );
    });
  }

  function setBusy(modal, busy, text) {
    if (busy) {
      modal.submit.dataset.original =
        modal.submit.textContent;

      modal.submit.textContent = text || "Сохраняем...";
    } else {
      modal.submit.textContent =
        modal.submit.dataset.original || "Сохранить";
    }

    modal.submit.disabled = busy;
    modal.cancel.disabled = busy;
  }

  function attachSubmit(modal, handler) {
    modal.submit.addEventListener("click", handler);

    modal.form.addEventListener("submit", event => {
      event.preventDefault();
      handler();
    });
  }

  function accountOptions(accounts) {
    return accounts.map(account => [
      account.account_id,
      `${account.account_name} — ${money(account.balance)}`
    ]);
  }

  // =========================================
  // АВТОРИЗАЦИЯ
  // =========================================

  async function checkFinanceSession() {
    const { data, error } =
      await client.auth.getSession();

    if (error) throw error;

    if (!data.session) {
      throw new Error(
        "Нет активной сессии Supabase. Выйди из админки и войди снова."
      );
    }

    return data.session;
  }

  // =========================================
  // БАЛАНСЫ
  // =========================================

  async function loadBalances() {
    await checkFinanceSession();

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
    setText(
      "financeTotalBalance",
      money(cash + bank)
    );

    return accountsCache;
  }

  // =========================================
  // ИСТОРИЯ ФИНАНСОВ
  // =========================================

  async function loadHistory() {
    const container =
      document.getElementById("financeHistory");

    if (!container) return;

    await checkFinanceSession();

    const { data, error } = await client.rpc(
      "get_finance_history",
      { p_limit: 50 }
    );

    if (error) throw error;

    container.replaceChildren();

    if (!data || !data.length) {
      container.textContent =
        "Финансовых операций пока нет.";
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.style.overflowX = "auto";

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
    wrapper.appendChild(table);
    container.appendChild(wrapper);
  }

  // =========================================
  // ОБЩИЙ ФИНАНСОВЫЙ DASHBOARD
  // =========================================

  function dashboardPanel() {
    let panel = document.getElementById("financeDashboard");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "financeDashboard";
    Object.assign(panel.style, {
      marginTop: "20px", padding: "20px", border: "1px solid #3b3f46",
      borderRadius: "10px", background: "#292c31", color: "#f5f5f4"
    });
    section.insertBefore(panel, section.firstChild);
    return panel;
  }

  function dashboardCard(label, value, hint) {
    const card = document.createElement("article");
    Object.assign(card.style, {
      minWidth: "170px", flex: "1 1 170px", padding: "16px",
      border: "1px solid #3b3f46", borderRadius: "9px", background: "#24272c"
    });
    const title = document.createElement("div");
    title.textContent = label;
    title.style.color = "#a4a7ad";
    const amount = document.createElement("strong");
    amount.textContent = value;
    amount.style.cssText = "display:block;font-size:22px;margin:9px 0;";
    const note = document.createElement("small");
    note.textContent = hint || "";
    note.style.color = "#a4a7ad";
    card.append(title, amount, note);
    return card;
  }

  function dashboardHeading(text) {
    const h = document.createElement("h3");
    h.textContent = text;
    h.style.margin = "20px 0 10px";
    return h;
  }

  async function loadDashboard() {
    const panel = dashboardPanel();
    panel.replaceChildren();
    const title = document.createElement("h2");
    title.textContent = "Обзор финансов компании";
    title.style.marginTop = "0";
    const subtitle = document.createElement("p");
    subtitle.textContent = "Подтверждённые операции в PLN. Внутренние переводы не считаются доходом или расходом.";
    subtitle.style.color = "#a4a7ad";
    panel.append(title, subtitle);

    const { data, error } = await client.rpc("get_finance_dashboard");
    if (error) {
      const err = document.createElement("p");
      err.textContent = "Не удалось загрузить финансовую статистику: " + error.message;
      err.style.color = "#ff7373";
      panel.appendChild(err);
      throw error;
    }
    const stats = data || {};
    const all = stats.all_time || {};
    const month = stats.month || {};
    const week = stats.week || {};
    const net = Number(all.income || 0) - Number(all.expenses || 0);

    panel.appendChild(dashboardHeading("За всё время"));
    const allCards = document.createElement("div");
    Object.assign(allCards.style, { display: "flex", flexWrap: "wrap", gap: "12px" });
    allCards.append(
      dashboardCard("Поступления", money(all.income), "Подтверждённые доходные операции"),
      dashboardCard("Расходы", money(all.expenses), "Подтверждённые расходы"),
      dashboardCard("Денежный результат", money(net), "Поступления минус расходы"),
      dashboardCard("Операции", String(all.operations || 0), "Включая внутренние переводы")
    );
    panel.appendChild(allCards);

    panel.appendChild(dashboardHeading("Периоды"));
    const periodCards = document.createElement("div");
    Object.assign(periodCards.style, { display: "flex", flexWrap: "wrap", gap: "12px" });
    periodCards.append(
      dashboardCard("Доходы за месяц", money(month.income), "С начала текущего месяца"),
      dashboardCard("Расходы за месяц", money(month.expenses), "С начала текущего месяца"),
      dashboardCard("Доходы за 7 дней", money(week.income), "Последние 7 календарных дней"),
      dashboardCard("Расходы за 7 дней", money(week.expenses), "Последние 7 календарных дней")
    );
    panel.appendChild(periodCards);

    panel.appendChild(dashboardHeading("Расходы по категориям"));
    const categories = document.createElement("div");
    if (!stats.categories?.length) {
      categories.textContent = "Подтверждённых расходов пока нет.";
    } else {
      const list = document.createElement("div");
      list.style.display = "grid";
      list.style.gap = "8px";
      stats.categories.forEach(item => {
        const row = document.createElement("div");
        Object.assign(row.style, { display: "flex", justifyContent: "space-between", gap: "12px", padding: "10px", background: "#24272c", borderRadius: "7px" });
        const name = document.createElement("span");
        name.textContent = `${item.category || "Без категории"} · ${item.operations} оп.`;
        const amount = document.createElement("strong");
        amount.textContent = money(item.total);
        row.append(name, amount);
        list.appendChild(row);
      });
      categories.appendChild(list);
    }
    panel.appendChild(categories);

    panel.appendChild(dashboardHeading("Финансы по объектам"));
    const projects = stats.projects || [];
    if (!projects.length) {
      const empty = document.createElement("p");
      empty.textContent = "Объектов пока нет.";
      panel.appendChild(empty);
    } else {
      const wrap = document.createElement("div");
      wrap.style.overflowX = "auto";
      const table = document.createElement("table");
      table.style.cssText = "width:100%;border-collapse:collapse;color:#f5f5f4;";
      const headers = ["Объект", "Поступления", "Расходы", "Денежный результат"];
      const thead = document.createElement("thead");
      const trh = document.createElement("tr");
      headers.forEach(label => {
        const th = document.createElement("th");
        th.textContent = label;
        th.style.cssText = "text-align:left;padding:10px;border-bottom:1px solid #444;";
        trh.appendChild(th);
      });
      thead.appendChild(trh);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      projects.forEach(project => {
        const tr = document.createElement("tr");
        const income = Number(project.income || 0);
        const expenses = Number(project.expenses || 0);
        [project.project_name || "Без названия", money(income), money(expenses), money(income - expenses)].forEach(value => {
          const td = document.createElement("td");
          td.textContent = String(value);
          td.style.cssText = "padding:10px;border-bottom:1px solid #383838;";
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      wrap.appendChild(table);
      panel.appendChild(wrap);
    }
  }

  // =========================================
  // ЗАГРУЗКА ФИНАНСОВ
  // =========================================

  async function loadFinance() {
    if (loading) return;

    loading = true;
    showMessage("Загружаем финансовые данные...");

    try {
      await checkFinanceSession();

      const results = await Promise.allSettled([
        loadBalances(),
        loadHistory(),
        loadDashboard()
      ]);

      const errors = results
        .filter(result =>
          result.status === "rejected"
        )
        .map(result =>
          result.reason?.message || "Неизвестная ошибка"
        );

      if (errors.length) {
        showMessage(
          "Ошибка: " + errors.join("; "),
          true
        );

        console.error(
          "Finance loading errors:",
          errors
        );
      } else {
        showMessage(
          "Финансовые данные успешно загружены."
        );
      }
    } catch (error) {
      console.error("Finance error:", error);
      showMessage(error.message, true);
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

    const accountSelect = createSelect(
      accountOptions(accounts)
    );

    const amountInput = createInput(
      "number",
      "Например, 1500.00"
    );

    const categorySelect = createSelect([
      ["client_payment", "Оплата клиента"],
      ["advance", "Аванс"],
      ["contract_payment", "Оплата договора"],
      ["other", "Другой доход"]
    ]);

    const projectSelect = createSelect([
      ["", "Без привязки к объекту"]
    ]);

    const description =
      document.createElement("textarea");

    description.rows = 3;
    description.placeholder = "Описание поступления...";

    addFields(modal, [
      ["Счёт зачисления", accountSelect],
      ["Сумма (PLN)", amountInput],
      ["Категория дохода", categorySelect],
      ["Объект (необязательно)", projectSelect],
      ["Описание", description]
    ]);

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
          "Укажи корректную сумму.";
        return;
      }

      const amount = Number(amountInput.value);

      if (!window.confirm(
        `Зарегистрировать поступление ${money(amount)}?`
      )) return;

      setBusy(modal, true, "Сохраняем...");

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
        modal.errorText.textContent =
          error.message;
        setBusy(modal, false);
      }
    }

    attachSubmit(modal, submitIncome);
  }

  // =========================================
  // ПЕРЕВОД МЕЖДУ СЧЕТАМИ
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
      "Внутренний перевод между счетами компании."
    );

    const fromSelect = createSelect(
      accountOptions(accounts)
    );

    const toSelect = createSelect(
      accountOptions(accounts)
    );

    const amountInput = createInput(
      "number",
      "Например, 50.00"
    );

    const description =
      document.createElement("textarea");

    description.rows = 3;
    description.maxLength = 2000;
    description.placeholder =
      "Например, выдача наличных бригадиру";

    const firstWithFunds = accounts.find(account =>
      Number(account.balance) > 0
    );

    if (firstWithFunds) {
      fromSelect.value = firstWithFunds.account_id;
    }

    addFields(modal, [
      ["Откуда перевести", fromSelect],
      ["Куда перевести", toSelect],
      ["Сумма (PLN)", amountInput],
      ["Комментарий (необязательно)", description]
    ]);

    const balanceNote = document.createElement("p");
    balanceNote.style.color = "#a4a7ad";
    balanceNote.style.fontSize = "13px";

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
          "Укажи корректную сумму.";
        return;
      }

      const amount = Number(amountInput.value);

      if (amount > Number(source.balance)) {
        modal.errorText.textContent =
          "Недостаточно денег на счёте.";
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

        await loadFinance();

        showMessage(
          `Перевод ${money(amount)} выполнен. ` +
          `Операция: ${data}`
        );
      } catch (error) {
        console.error("Transfer error:", error);

        modal.errorText.textContent =
          "Ошибка перевода: " + error.message;

        setBusy(modal, false);
      }
    }

    attachSubmit(modal, executeTransfer);
  }

  // =========================================
  // ЗАГРУЗКА ОБЪЕКТОВ ДЛЯ РАСХОДОВ
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
    const projects = await loadExpenseProjects();

    if (!projects.length) {
      showMessage(
        "Нет доступных объектов. Для заявки нужен объект.",
        true
      );
      return;
    }

    const modal = createModal(
      "Новая заявка на расход",
      "Баланс изменится после утверждения и оплаты расхода."
    );

    const projectSelect = createSelect(
      projects.map(project => [
        project.id,
        project.name
      ])
    );

    const titleInput = createInput(
      "text",
      "Например, покупка мешков для мусора"
    );

    titleInput.maxLength = 160;

    const amountInput = createInput(
      "number",
      "0.00"
    );

    const categorySelect = createSelect([
      ["materials", "Материалы"],
      ["tools", "Инструменты"],
      ["transport", "Транспорт"],
      ["fuel", "Топливо"],
      ["debris", "Вывоз мусора"],
      ["food", "Питание и вода"],
      ["other", "Другое"]
    ]);

    const paymentSelect = createSelect([
      ["cash", "Наличные компании"],
      ["bank", "Банковский счёт"],
      ["personal", "Личные деньги сотрудника"]
    ]);

    const descriptionInput =
      document.createElement("textarea");

    descriptionInput.rows = 3;
    descriptionInput.maxLength = 2000;
    descriptionInput.placeholder =
      "Дополнительные подробности...";

    addFields(modal, [
      ["Объект", projectSelect],
      ["На что потрачены деньги", titleInput],
      ["Сумма (PLN)", amountInput],
      ["Категория", categorySelect],
      ["Способ оплаты", paymentSelect],
      ["Описание", descriptionInput]
    ]);

    const receiptNote = document.createElement("p");

    receiptNote.textContent =
      "Фотография чека будет подключена после настройки хранилища чеков.";

    receiptNote.style.color = "#a4a7ad";
    receiptNote.style.fontSize = "12px";

    modal.fields.appendChild(receiptNote);

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
          error.message;

        setBusy(modal, false);
      }
    }

    attachSubmit(modal, submitExpense);
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

  // =========================================
  // ЗАГРУЗКА ЗАЯВОК НА РАСХОДЫ
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

    const refresh = createButton("Обновить заявки");

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

    if (!data || !data.length) {
      const empty = document.createElement("p");
      empty.textContent =
        "Заявок на расходы пока нет.";
      panel.appendChild(empty);
      return;
    }

    const accountResult = accountsCache.length
      ? { data: accountsCache, error: null }
      : await client.rpc("get_finance_balances");

    const accountData = accountResult.data || [];

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

      // УТВЕРЖДЕНИЕ

      if (expense.status === "pending") {
        const approve = createButton(
          "Утвердить"
        );

        approve.style.background = "#22a06b";

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

        const reject = createButton(
          "Отклонить"
        );

        reject.style.background = "#a83e3e";

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

      // ОПЛАТА

      if (
        expense.status === "approved" &&
        !expense.finance_transaction_id
      ) {
        const pay = createButton(
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

          const selected =
            compatibleAccounts[choice - 1];

          if (!window.confirm(
            `Списать ${money(expense.amount)} ` +
            `со счёта ${selected.account_name}?`
          )) return;

          pay.disabled = true;

          try {
            const { data: transactionId, error } =
              await client.rpc("pay_expense", {
                p_expense_id: expense.id,
                p_account_id: selected.account_id
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
    });
  }

  // =========================================
  // УПРАВЛЕНИЕ СЧЕТАМИ (ТОЛЬКО OWNER)
  // =========================================

  const accountTypes = { cash: "Касса", bank: "Банковский счёт" };

  function accountPanel() {
    let panel = document.getElementById("financeAccountsPanel");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.id = "financeAccountsPanel";
    Object.assign(panel.style, {
      marginTop: "20px", padding: "20px", border: "1px solid #3b3f46",
      borderRadius: "10px", background: "#292c31", color: "#f5f5f4"
    });

    const history = document.getElementById("financeHistory");
    const historyCard = history?.closest(".panel, .card");
    if (historyCard?.parentElement) {
      historyCard.parentElement.insertBefore(panel, historyCard);
    } else {
      section.appendChild(panel);
    }
    return panel;
  }

  async function getAccountRows() {
    await checkFinanceSession();
    const { data, error } = await client
      .from("finance_accounts")
      .select("id, name, account_type, currency, opening_balance, status, description, responsible_employee_id, created_at")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async function getEmployees() {
    const { data, error } = await client
      .from("employees")
      .select("*")
      .eq("status", "active")
      .limit(500);
    if (error) throw error;
    return (data || []).map(e => ({
      id: e.id,
      name: [e.first_name, e.last_name].filter(Boolean).join(" ") ||
        e.full_name || e.name || e.phone || `Сотрудник ${e.id.slice(0, 8)}`
    }));
  }

  function accountBalance(row) {
    const current = accountsCache.find(a => a.account_id === row.id);
    return current ? Number(current.balance) : null;
  }

  async function openAccountForm(existing = null) {
    const modal = createModal(
      existing ? "Редактировать счёт" : "Новый финансовый счёт",
      existing
        ? "История операций и начальный баланс не изменяются."
        : "Создай кассу или банковский счёт компании. Валюта — PLN."
    );
    const name = createInput("text", "Например, Касса бригады №1");
    name.maxLength = 120;
    name.value = existing?.name || "";

    const type = createSelect([
      ["cash", "Касса (наличные)"],
      ["bank", "Банковский счёт"]
    ]);
    type.value = existing?.account_type || "cash";

    const opening = createInput("number", "0.00");
    opening.min = "0";
    opening.value = existing ? String(existing.opening_balance) : "0";

    const responsible = createSelect([["", "Не назначен"]]);
    const description = document.createElement("textarea");
    description.rows = 3;
    description.maxLength = 2000;
    description.value = existing?.description || "";

    addFields(modal, [
      ["Название", name],
      ["Тип счёта", type],
      ...(!existing ? [["Начальный баланс (PLN)", opening]] : []),
      ["Ответственный за кассу", responsible],
      ["Описание", description]
    ]);

    // После появления операций тип счёта менять опасно:
    // при редактировании тип и начальный баланс фиксированы.
    if (existing) type.disabled = true;

    try {
      const employees = await getEmployees();
      employees.forEach(e => {
        const option = document.createElement("option");
        option.value = e.id;
        option.textContent = e.name;
        responsible.appendChild(option);
      });
      responsible.value = existing?.responsible_employee_id || "";
      if (existing?.responsible_employee_id && !responsible.value) {
        const option = document.createElement("option");
        option.value = existing.responsible_employee_id;
        option.textContent = "Текущий ответственный (неактивен)";
        responsible.appendChild(option);
        responsible.value = existing.responsible_employee_id;
      }
    } catch (error) {
      modal.errorText.textContent = "Не удалось загрузить сотрудников: " + error.message;
      modal.submit.disabled = true;
      return;
    }

    function updateResponsibleState() {
      responsible.disabled = type.value !== "cash";
      if (type.value !== "cash") responsible.value = "";
    }
    type.addEventListener("change", updateResponsibleState);
    updateResponsibleState();
    modal.submit.textContent = existing ? "Сохранить изменения" : "Создать счёт";

    attachSubmit(modal, async () => {
      if (modal.submit.disabled) return;
      modal.errorText.textContent = "";
      const cleanName = name.value.trim();
      if (!cleanName) {
        modal.errorText.textContent = "Укажи название счёта.";
        return;
      }
      const amount = Number(opening.value);
      if (!existing && (opening.value === "" || !Number.isFinite(amount) || amount < 0 ||
          Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001)) {
        modal.errorText.textContent = "Начальный баланс должен быть неотрицательной суммой с точностью до гроша.";
        return;
      }
      const payload = {
        name: cleanName,
        description: description.value.trim() || null,
        responsible_employee_id: type.value === "cash" ? (responsible.value || null) : null
      };
      if (!existing) {
        payload.account_type = type.value;
        payload.currency = "PLN";
        payload.opening_balance = amount;
        payload.status = "active";
      }
      if (!window.confirm(existing ? "Сохранить изменения счёта?" :
          `Создать счёт «${cleanName}» с начальным балансом ${money(amount)}?`)) return;

      setBusy(modal, true, "Сохраняем...");
      try {
        const result = existing
          ? await client.from("finance_accounts").update(payload).eq("id", existing.id).select("id")
          : await client.from("finance_accounts").insert(payload).select("id");
        if (result.error) throw result.error;
        if (!result.data?.length) throw new Error("Изменение не подтверждено базой. Проверь права владельца.");
        modal.close();
        await loadFinance();
        await loadAccountPanel();
        showMessage(existing ? "Счёт обновлён." : "Счёт создан.");
      } catch (error) {
        modal.errorText.textContent = error.message;
        setBusy(modal, false);
      }
    });
  }

  async function archiveAccount(row) {
    // Архивирование — только при нулевом балансе. Повторная проверка
    // делается по свежим данным; для строгой атомарности потребуется RPC.
    await loadBalances();
    const balance = accountBalance(row);
    if (balance === null) throw new Error("Не удалось проверить баланс счёта.");
    if (Math.abs(balance) > 0.000001) {
      throw new Error("Нельзя архивировать счёт с остатком. Сначала переведи деньги на другой счёт.");
    }
    if (!window.confirm(`Архивировать счёт «${row.name}»? История сохранится.`)) return;
    const { data, error } = await client.from("finance_accounts")
      .update({ status: "archived" })
      .eq("id", row.id)
      .eq("status", "active")
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("Счёт не обновлён. Возможно, его статус уже изменился.");
    await loadFinance();
    await loadAccountPanel();
    showMessage("Счёт архивирован. Финансовая история сохранена.");
  }

  async function restoreAccount(row) {
    if (!window.confirm(`Восстановить счёт «${row.name}»?`)) return;
    const { data, error } = await client.from("finance_accounts")
      .update({ status: "active" })
      .eq("id", row.id)
      .eq("status", "archived")
      .select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("Счёт не обновлён.");
    await loadFinance();
    await loadAccountPanel();
    showMessage("Счёт восстановлен.");
  }

  async function showAccountHistory(row) {
    const modal = createModal("История счёта: " + row.name,
      "Последние 100 операций, включая переводы.");
    modal.submit.remove();
    const content = document.createElement("div");
    content.textContent = "Загружаем операции...";
    modal.fields.appendChild(content);
    try {
      const { data, error } = await client.from("finance_transactions")
        .select("id, transaction_date, transaction_type, amount, currency, description, from_account_id, to_account_id, status")
        .or(`from_account_id.eq.${row.id},to_account_id.eq.${row.id}`)
        .order("transaction_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      content.replaceChildren();
      if (!data?.length) {
        content.textContent = "Операций по счёту пока нет.";
        return;
      }
      for (const op of data) {
        const item = document.createElement("div");
        Object.assign(item.style, {
          padding: "10px 0", borderBottom: "1px solid #444", whiteSpace: "pre-wrap"
        });
        const direction = op.transaction_type === "transfer"
          ? (op.from_account_id === row.id ? "Перевод исходящий" : "Перевод входящий")
          : op.transaction_type === "income" ? "Поступление" : "Расход";
        item.textContent = `${op.transaction_date || "—"} · ${direction} · ${money(op.amount)}\n${op.description || "Без описания"} · ${op.status || "—"}`;
        content.appendChild(item);
      }
    } catch (error) {
      content.textContent = "Не удалось загрузить историю: " + error.message;
    }
  }

  async function loadAccountPanel() {
    const panel = accountPanel();
    panel.replaceChildren();
    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      flexWrap: "wrap", gap: "12px", marginBottom: "12px"
    });
    const title = document.createElement("h3");
    title.textContent = "Счета и кассы компании";
    title.style.margin = "0";
    const create = createButton("+ Создать счёт", true);
    create.addEventListener("click", () => openAccountForm().catch(e => showMessage(e.message, true)));
    header.append(title, create);
    panel.appendChild(header);

    const note = document.createElement("p");
    note.style.color = "#a4a7ad";
    note.textContent = "Управление счетами доступно владельцу. Архивирование не удаляет операции.";
    panel.appendChild(note);

    let rows;
    try {
      rows = await getAccountRows();
    } catch (error) {
      const err = document.createElement("p");
      err.style.color = "#ff7373";
      err.textContent = "Не удалось загрузить счета: " + error.message;
      panel.appendChild(err);
      return;
    }
    if (!rows.length) {
      const empty = document.createElement("p");
      empty.textContent = "Счетов пока нет. Нажми «Создать счёт».";
      panel.appendChild(empty);
      return;
    }

    for (const row of rows) {
      const card = document.createElement("article");
      Object.assign(card.style, {
        padding: "14px", marginTop: "12px", border: "1px solid #444",
        borderRadius: "8px", background: "#24272c"
      });
      const name = document.createElement("strong");
      name.textContent = row.name;
      name.style.display = "block";
      const balance = accountBalance(row);
      const info = document.createElement("p");
      info.textContent = `${accountTypes[row.account_type] || row.account_type} · ${row.currency} · ` +
        `${row.status === "active" ? "Активен" : "Архив"} · ` +
        `Баланс: ${balance === null ? "не отображается" : money(balance)}`;
      info.style.color = "#a4a7ad";
      const description = document.createElement("p");
      description.textContent = row.description || "Без описания";
      const responsible = document.createElement("small");
      responsible.style.color = "#a4a7ad";
      responsible.textContent = row.responsible_employee_id
        ? `Ответственный: ${row.responsible_employee_id}`
        : "Ответственный не назначен";
      const actions = document.createElement("div");
      Object.assign(actions.style, { display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" });
      const history = createButton("История");
      history.addEventListener("click", () => showAccountHistory(row));
      actions.appendChild(history);
      if (row.status === "active") {
        const edit = createButton("Изменить");
        edit.addEventListener("click", () => openAccountForm(row).catch(e => showMessage(e.message, true)));
        const archive = createButton("Архивировать");
        archive.addEventListener("click", async () => {
          archive.disabled = true;
          try { await archiveAccount(row); }
          catch (e) { showMessage(e.message, true); archive.disabled = false; }
        });
        actions.append(edit, archive);
      } else {
        const restore = createButton("Восстановить");
        restore.addEventListener("click", async () => {
          restore.disabled = true;
          try { await restoreAccount(row); }
          catch (e) { showMessage(e.message, true); restore.disabled = false; }
        });
        actions.appendChild(restore);
      }
      card.append(name, info, description, responsible, actions);
      panel.appendChild(card);
    }
  }

  // =========================================
  // ДОЛГИ И ЗАДОЛЖЕННОСТИ КОМПАНИИ
  // =========================================

  function debtPanel() {
    let panel = document.getElementById("companyDebtsPanel");
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "companyDebtsPanel";
    Object.assign(panel.style, {
      marginTop: "20px", padding: "20px", border: "1px solid #3b3f46",
      borderRadius: "10px", background: "#292c31", color: "#f5f5f4"
    });
    const account = document.getElementById("financeAccountsPanel");
    if (account?.parentElement) account.parentElement.insertBefore(panel, account.nextSibling);
    else section.appendChild(panel);
    return panel;
  }

  function debtButton(label, primary = false) {
    return createButton(label, primary);
  }

  function debtDate(value) {
    if (!value) return "—";
    return new Date(value + "T00:00:00").toLocaleDateString("pl-PL");
  }

  async function loadCompanyDebts() {
    const panel = debtPanel();
    panel.replaceChildren();

    const header = document.createElement("div");
    Object.assign(header.style, {
      display: "flex", justifyContent: "space-between", alignItems: "center",
      flexWrap: "wrap", gap: "12px"
    });
    const heading = document.createElement("h3");
    heading.textContent = "Долги и задолженности";
    heading.style.margin = "0";
    const add = debtButton("+ Добавить задолженность", true);
    add.addEventListener("click", () => openCompanyDebtForm().catch(e => showMessage(e.message, true)));
    header.append(heading, add);
    panel.appendChild(header);

    const subtitle = document.createElement("p");
    subtitle.textContent = "Нам должны и мы должны. Частичные оплаты автоматически отражаются в финансовой истории.";
    subtitle.style.color = "#a4a7ad";
    panel.appendChild(subtitle);

    const tabs = document.createElement("div");
    Object.assign(tabs.style, { display: "flex", gap: "8px", flexWrap: "wrap", margin: "14px 0" });
    const listWrap = document.createElement("div");
    let currentType = "all";
    const tabButtons = [];
    const tabDefs = [
      ["all", "Все задолженности"],
      ["receivable", "Нам должны"],
      ["payable", "Мы должны"]
    ];
    tabDefs.forEach(([value, label]) => {
      const b = debtButton(label, value === currentType);
      b.addEventListener("click", () => {
        currentType = value;
        tabButtons.forEach(x => { x.button.style.background = x.value === value ? "#ff812e" : "#444"; x.button.style.color = x.value === value ? "#202226" : "#fff"; });
        renderRows();
      });
      tabButtons.push({ value, button: b });
      tabs.appendChild(b);
    });
    panel.append(tabs, listWrap);

    const { data, error } = await client.from("company_debts")
      .select("id,debt_type,counterparty_name,counterparty_type,project_id,description,document_number,total_amount,currency,debt_date,due_date,status,created_at")
      .order("created_at", { ascending: false }).limit(300);
    if (error) {
      const err = document.createElement("p");
      err.style.color = "#ff7373";
      err.textContent = "Не удалось загрузить задолженности: " + error.message;
      listWrap.appendChild(err);
      return;
    }

    const debtRows = data || [];
    const { data: payments, error: paymentsError } = await client.from("company_debt_payments")
      .select("id,debt_id,amount,payment_date,note,created_at")
      .order("payment_date", { ascending: false }).limit(1000);
    if (paymentsError) {
      const err = document.createElement("p");
      err.style.color = "#ff7373";
      err.textContent = "Не удалось загрузить историю оплат: " + paymentsError.message;
      listWrap.appendChild(err);
      return;
    }
    const paymentRows = payments || [];
    const paidByDebt = new Map();
    paymentRows.forEach(p => paidByDebt.set(p.debt_id, (paidByDebt.get(p.debt_id) || 0) + Number(p.amount || 0)));

    const summary = document.createElement("div");
    Object.assign(summary.style, { display: "flex", flexWrap: "wrap", gap: "10px", margin: "12px 0 18px" });
    const openReceivable = debtRows.filter(d => d.debt_type === "receivable" && d.status === "open").reduce((s,d) => s + Math.max(0, Number(d.total_amount) - (paidByDebt.get(d.id) || 0)), 0);
    const openPayable = debtRows.filter(d => d.debt_type === "payable" && d.status === "open").reduce((s,d) => s + Math.max(0, Number(d.total_amount) - (paidByDebt.get(d.id) || 0)), 0);
    summary.append(
      dashboardCard("Нам должны", money(openReceivable), "Остаток открытых долгов"),
      dashboardCard("Мы должны", money(openPayable), "Остаток наших обязательств")
    );
    panel.insertBefore(summary, tabs);

    function renderRows() {
      listWrap.replaceChildren();
      const visible = debtRows.filter(d => currentType === "all" || d.debt_type === currentType);
      if (!visible.length) {
        const empty = document.createElement("p");
        empty.textContent = "Задолженностей в этой категории пока нет.";
        empty.style.color = "#a4a7ad";
        listWrap.appendChild(empty);
      }
      visible.forEach(debt => {
        const paid = paidByDebt.get(debt.id) || 0;
        const remaining = Math.max(0, Number(debt.total_amount) - paid);
        const card = document.createElement("article");
        Object.assign(card.style, { padding: "14px", marginTop: "10px", border: "1px solid #444", borderRadius: "8px", background: "#24272c" });
        const name = document.createElement("strong");
        name.textContent = `${debt.debt_type === "receivable" ? "Нам должны: " : "Мы должны: "}${debt.counterparty_name}`;
        name.style.display = "block";
        const details = document.createElement("p");
        details.textContent = `${debt.counterparty_type || "other"} · ${debt.status === "closed" ? "Закрыт" : debt.status === "cancelled" ? "Отменён" : "Открыт"} · Дата: ${debtDate(debt.debt_date)} · Срок: ${debtDate(debt.due_date)}`;
        details.style.color = "#a4a7ad";
        const amounts = document.createElement("p");
        amounts.innerHTML = "";
        amounts.textContent = `Всего: ${money(debt.total_amount)} · Оплачено: ${money(paid)} · Остаток: ${money(remaining)}`;
        amounts.style.fontWeight = "600";
        card.append(name, details, amounts);
        if (debt.description) {
          const desc = document.createElement("p"); desc.textContent = debt.description; card.appendChild(desc);
        }
        if (debt.document_number) {
          const doc = document.createElement("small"); doc.textContent = "Документ: " + debt.document_number; doc.style.color = "#a4a7ad"; card.appendChild(doc);
        }
        const actions = document.createElement("div");
        Object.assign(actions.style, { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" });
        if (debt.status === "open" && remaining > 0.000001) {
          const pay = debtButton(debt.debt_type === "receivable" ? "Принять оплату" : "Погасить долг", true);
          pay.addEventListener("click", () => openDebtPaymentForm(debt, remaining).catch(e => showMessage(e.message, true)));
          actions.appendChild(pay);
        }
        const history = debtButton("История оплат");
        history.addEventListener("click", () => showDebtPaymentHistory(debt, paymentRows));
        actions.appendChild(history);
        card.appendChild(actions);
        listWrap.appendChild(card);
      });
    }
    renderRows();
  }

  async function openCompanyDebtForm() {
    const modal = createModal("Новая задолженность", "Создай обязательство клиента или компании. Валюта — PLN.");
    const type = createSelect([["receivable", "Нам должны (клиент/заказчик)"], ["payable", "Мы должны (поставщик/работник/подрядчик)"]]);
    const counterparty = createInput("text", "Название клиента или компании"); counterparty.maxLength = 160;
    const counterpartyType = createSelect([["client", "Клиент"], ["supplier", "Поставщик"], ["employee", "Работник"], ["contractor", "Подрядчик"], ["other", "Другое"]]);
    const amount = createInput("number", "0.00");
    const debtDateInput = createInput("date"); debtDateInput.value = new Date().toISOString().slice(0,10);
    const dueDate = createInput("date");
    const project = createSelect([["", "Без привязки к объекту"]]);
    const docNumberInput = createInput("text", "Номер счёта / документа (необязательно)");
    const description = document.createElement("textarea"); description.rows = 3; description.maxLength = 2000; description.placeholder = "Описание задолженности...";
    addFields(modal, [["Тип задолженности", type], ["Контрагент", counterparty], ["Тип контрагента", counterpartyType], ["Общая сумма (PLN)", amount], ["Дата возникновения", debtDateInput], ["Срок оплаты", dueDate], ["Объект", project], ["Номер документа", docNumberInput], ["Описание", description]]);
    try {
      const projects = await loadExpenseProjects();
      projects.forEach(p => { const o = document.createElement("option"); o.value = p.id; o.textContent = p.name; project.appendChild(o); });
    } catch (e) { console.warn("Debt projects unavailable", e); }
    modal.submit.textContent = "Создать задолженность";
    attachSubmit(modal, async () => {
      modal.errorText.textContent = "";
      if (!counterparty.value.trim()) { modal.errorText.textContent = "Укажи контрагента."; return; }
      if (!validAmount(amount.value)) { modal.errorText.textContent = "Укажи корректную сумму."; return; }
      if (!debtDateInput.value || (dueDate.value && dueDate.value < debtDateInput.value)) { modal.errorText.textContent = "Проверь даты задолженности."; return; }
      setBusy(modal, true, "Сохраняем...");
      try {
        const { error } = await client.from("company_debts").insert({
          debt_type: type.value, counterparty_name: counterparty.value.trim(), counterparty_type: counterpartyType.value,
          project_id: project.value || null, description: description.value.trim() || null,
          document_number: docNumberInput.value.trim() || null, total_amount: Number(amount.value), currency: "PLN",
          debt_date: debtDateInput.value, due_date: dueDate.value || null, status: "open"
        });
        if (error) throw error;
        modal.close(); await loadCompanyDebts(); showMessage("Задолженность создана.");
      } catch (e) { modal.errorText.textContent = e.message; setBusy(modal, false); }
    });
  }

  async function openDebtPaymentForm(debt, remaining) {
    await loadBalances();
    const accounts = accountsCache.filter(a => a.currency === debt.currency && a.account_id);
    if (!accounts.length) throw new Error("Нет доступных активных счетов PLN.");
    const modal = createModal(debt.debt_type === "receivable" ? "Принять оплату долга" : "Погасить задолженность", `Контрагент: ${debt.counterparty_name}. Остаток: ${money(remaining)}.`);
    const account = createSelect(accountOptions(accounts));
    const amount = createInput("number", "0.00"); amount.value = remaining.toFixed(2); amount.max = remaining.toFixed(2);
    const date = createInput("date"); date.value = new Date().toISOString().slice(0,10);
    const note = document.createElement("textarea"); note.rows = 2; note.maxLength = 1000; note.placeholder = "Комментарий (необязательно)";
    addFields(modal, [[debt.debt_type === "receivable" ? "Счёт зачисления" : "Счёт списания", account], ["Сумма (PLN)", amount], ["Дата оплаты", date], ["Комментарий", note]]);
    modal.submit.textContent = "Провести оплату";
    attachSubmit(modal, async () => {
      modal.errorText.textContent = "";
      if (!validAmount(amount.value) || Number(amount.value) > remaining + 0.000001) { modal.errorText.textContent = `Сумма должна быть больше 0 и не превышать ${money(remaining)}.`; return; }
      if (!date.value) { modal.errorText.textContent = "Укажи дату оплаты."; return; }
      if (!window.confirm(`Провести ${money(amount.value)} по задолженности «${debt.counterparty_name}»?`)) return;
      setBusy(modal, true, "Проводим...");
      try {
        const { data, error } = await client.rpc("register_company_debt_payment", {
          p_debt_id: debt.id, p_account_id: account.value, p_amount: Number(amount.value),
          p_payment_date: date.value, p_note: note.value.trim() || null
        });
        if (error) throw error;
        modal.close();
        await loadFinance(); await loadCompanyDebts();
        showMessage(`Оплата зарегистрирована. Остаток: ${money(data?.remaining)}.`);
      } catch (e) { modal.errorText.textContent = e.message; setBusy(modal, false); }
    });
  }

  function showDebtPaymentHistory(debt, payments) {
    const modal = createModal("История оплат", `Задолженность: ${debt.counterparty_name}`);
    modal.submit.remove();
    const rows = payments.filter(p => p.debt_id === debt.id);
    if (!rows.length) {
      const empty = document.createElement("p"); empty.textContent = "Оплат пока нет."; modal.fields.appendChild(empty); return;
    }
    rows.forEach(p => {
      const item = document.createElement("p");
      item.style.cssText = "padding:10px 0;border-bottom:1px solid #444;";
      item.textContent = `${debtDate(p.payment_date)} · ${money(p.amount)}${p.note ? " · " + p.note : ""}`;
      modal.fields.appendChild(item);
    });
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
      await loadCompanyDebts();
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
    await loadAccountPanel();
    await loadExpenseRequests();
    await loadCompanyDebts();
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
