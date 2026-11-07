
async function openTransferForm() {
  await loadBalances();

  const accounts = accountsCache.filter(account =>
    account.currency === "PLN" && account.account_id
  );

  if (accounts.length < 2) {
    showMessage("Для перевода нужны минимум два счёта PLN.", true);
    return;
  }

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
    maxWidth: "520px",
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
  title.textContent = "Перевести деньги";
  title.style.marginTop = "0";

  const note = document.createElement("p");
  note.textContent =
    "Внутренний перевод между счетами компании. Общий баланс не изменится.";
  note.style.color = "#a4a7ad";

  const form = document.createElement("form");
  form.noValidate = true;

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
      option.textContent =
        `${account.account_name} — ${money(account.balance)}`;
      select.appendChild(option);
    }
  }

  const firstWithFunds = accounts.find(
    account => Number(account.balance) > 0
  );

  if (firstWithFunds) {
    fromSelect.value = firstWithFunds.account_id;
  }

  const balanceNote = document.createElement("p");
  balanceNote.style.color = "#a4a7ad";
  balanceNote.style.fontSize = "13px";

  function updateDestination() {
    const other = accounts.find(
      account => account.account_id !== fromSelect.value
    );

    if (toSelect.value === fromSelect.value && other) {
      toSelect.value = other.account_id;
    }

    const source = accounts.find(
      account => account.account_id === fromSelect.value
    );

    balanceNote.textContent = source
      ? `Доступно на счёте отправителя: ${money(source.balance)}`
      : "";
  }

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
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    justifyContent: "flex-end",
    marginTop: "20px"
  });

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Отмена";

  const submit = document.createElement("button");
  submit.type = "button";
  submit.textContent = "Перевести деньги";

  for (const button of [cancel, submit]) {
    Object.assign(button.style, {
      padding: "12px 16px",
      borderRadius: "7px",
      border: "none",
      cursor: "pointer",
      fontWeight: "600"
    });
  }

  cancel.style.background = "#444";
  cancel.style.color = "#fff";

  submit.style.background = "#ff812e";
  submit.style.color = "#202226";
  submit.style.pointerEvents = "auto";

  actions.append(cancel, submit);
  form.append(errorText, actions);
  modal.append(title, note, form);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  function close() {
    overlay.remove();
  }

  cancel.addEventListener("click", close);

  overlay.addEventListener("click", event => {
    if (event.target === overlay && !submit.disabled) {
      close();
    }
  });

  async function executeTransfer() {
    if (submit.disabled) return;

    errorText.textContent = "";

    const amount = Number(amountInput.value);

    const source = accounts.find(
      account => account.account_id === fromSelect.value
    );

    const destination = accounts.find(
      account => account.account_id === toSelect.value
    );

    if (!source || !destination) {
      errorText.textContent = "Выбери счета перевода.";
      return;
    }

    if (source.account_id === destination.account_id) {
      errorText.textContent =
        "Нельзя переводить деньги на тот же счёт.";
      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001
    ) {
      errorText.textContent =
        "Укажи корректную сумму с точностью до 2 знаков.";
      return;
    }

    if (amount > Number(source.balance)) {
      errorText.textContent =
        "Недостаточно денег на счёте отправителя.";
      return;
    }

    const confirmed = window.confirm(
      `Подтвердить перевод ${money(amount)}?\n\n` +
      `Откуда: ${source.account_name}\n` +
      `Куда: ${destination.account_name}`
    );

    if (!confirmed) return;

    submit.disabled = true;
    cancel.disabled = true;
    submit.textContent = "Переводим...";

    try {
      const { data, error } = await client.rpc(
        "transfer_finance_money",
        {
          p_from_account_id: source.account_id,
          p_to_account_id: destination.account_id,
          p_amount: amount,
          p_description: description.value.trim() || null
        }
      );

      if (error) throw error;

      close();

      try {
        await loadFinance();
        showMessage(
          `Перевод ${money(amount)} выполнен. Операция: ${data}`
        );
      } catch (refreshError) {
        console.error("Balance refresh error:", refreshError);
        showMessage(
          "Перевод выполнен, но данные не обновились. Обнови страницу.",
          true
        );
      }

    } catch (error) {
      console.error("Finance transfer error:", error);

      errorText.textContent =
        "Ошибка перевода: " + error.message;

      submit.disabled = false;
      cancel.disabled = false;
      submit.textContent = "Перевести деньги";
    }
  }

  submit.addEventListener("click", executeTransfer);

  form.addEventListener("submit", event => {
    event.preventDefault();
    executeTransfer();
  });
}
