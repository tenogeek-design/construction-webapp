
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const section = document.getElementById("finance");

  if (!window.supabase) {
    console.error("Supabase library is not loaded");
    return;
  }

  if (!section) {
    console.error("Finance HTML section not found");
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const money = value =>
    new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN"
    }).format(Number(value) || 0);

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function showMessage(message, error = false) {
    setText("financeMessage", message);

    const element = document.getElementById("financeMessage");

    if (element) {
      element.style.color = error ? "#ff6b6b" : "#22a06b";
    }
  }

  async function loadBalances() {
    const { data, error } = await client.rpc(
      "get_finance_balances"
    );

    if (error) throw error;

    const accounts = data || [];

    const cash = accounts
      .filter(a =>
        a.account_type === "cash" &&
        a.currency === "PLN"
      )
      .reduce((sum, a) => sum + Number(a.balance), 0);

    const bank = accounts
      .filter(a =>
        a.account_type === "bank" &&
        a.currency === "PLN"
      )
      .reduce((sum, a) => sum + Number(a.balance), 0);

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

    const columns = [
      "Дата",
      "Операция",
      "Категория",
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

    const labels = {
      income: "Поступление",
      expense: "Расход",
      transfer: "Перевод"
    };

    data.forEach(operation => {
      const row = document.createElement("tr");

      let account = "—";

      if (operation.transaction_type === "income") {
        account = operation.to_account || "—";
      } else if (operation.transaction_type === "expense") {
        account = operation.from_account || "—";
      } else if (operation.transaction_type === "transfer") {
        account =
          (operation.from_account || "—") +
          " → " +
          (operation.to_account || "—");
      }

      const values = [
        operation.transaction_date || "—",
        labels[operation.transaction_type] ||
          operation.transaction_type,
        operation.category || "—",
        money(operation.amount),
        account,
        operation.description || "—"
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

  let loading = false;

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
      console.error("Finance loading error:", error);

      showMessage(
        "Ошибка загрузки: " + error.message,
        true
      );
    } finally {
      loading = false;
    }
  }

  const refreshButton =
    document.getElementById("financeRefreshBtn");

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      loadFinance
    );
  }

  // Пока не подключены формы операций,
  // защищаем кнопки от случайных нажатий.
  [
    "financeIncomeBtn",
    "financeExpenseBtn",
    "financeTransferBtn"
  ].forEach(id => {
    const button = document.getElementById(id);

    if (button) {
      button.disabled = true;
      button.title = "Подключим на следующем этапе";
      button.style.opacity = "0.5";
      button.style.cursor = "not-allowed";
    }
  });

  // Обновление при открытии раздела финансов
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
