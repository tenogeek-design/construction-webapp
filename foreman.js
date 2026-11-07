
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const balanceElement = document.getElementById("myBalance");
  const nameElement = document.getElementById("cashboxName");
  const refreshButton = document.getElementById("refreshBalance");

  if (!window.supabase) {
    balanceElement.textContent = "Ошибка загрузки авторизации";
    return;
  }

  // Используем ту же сессию, что и login.html.
  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  function showError(message) {
    balanceElement.textContent = "Ошибка";
    nameElement.textContent = message;
  }

  async function checkAccess() {
    const { data, error } = await client.auth.getUser();

    if (error || !data.user) {
      window.location.replace(
        "/login.html?next=" +
        encodeURIComponent("/foreman.html")
      );
      return false;
    }

    // Проверяем роль через серверную функцию.
    const { data: permissions, error: permissionsError } =
      await client.rpc("get_my_effective_permissions");

    if (permissionsError) {
      showError("Не удалось проверить права пользователя");
      return false;
    }

    // Роль и назначение кассы дополнительно
    // проверяются на сервере внутри RPC.
    return true;
  }

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

    const currency = data[0].currency || "PLN";

    balanceElement.textContent =
      new Intl.NumberFormat("pl-PL", {
        style: "currency",
        currency
      }).format(total);

    nameElement.textContent =
      data.map(account => account.account_name).join(", ");
  }

  const hasAccess = await checkAccess();

  if (!hasAccess) {
    return;
  }

  refreshButton.addEventListener("click", loadMyBalance);

  await loadMyBalance();
});
