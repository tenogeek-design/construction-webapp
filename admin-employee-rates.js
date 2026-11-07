
"use strict";

/*
  CONSTRUCTION GROUP
  Employee Rates v1.1

  - OWNER access
  - Five payment types
  - Future rate changes
  - Full rate history
  - Atomic saving through Supabase RPC
  - General employee rates only
*/

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("employees");

  if (!root || !window.supabase) return;

  const db = window.supabase.createClient(
    "https://yepxskcfxyiyqqhmdpve.supabase.co",
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH"
  );

  const $ = id => document.getElementById(id);

  const TYPES = {
    hourly: ["Почасовая", "час"],
    square_meter: ["За м²", "м²"],
    linear_meter: ["За погонный метр", "м"],
    piece: ["За штуку", "шт."],
    fixed: ["Фиксированная", "работа"]
  };

  let employees = [];
  let rates = [];
  let loadingPromise = null;
  let saving = false;

  function escapeHtml(value) {
    return String(value ?? "").replace(
      /[&<>"']/g,
      char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char])
    );
  }

  function today() {
    const d = new Date();

    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, "0"),
      String(d.getDate()).padStart(2, "0")
    ].join("-");
  }

  function formatDate(date) {
    if (!date) return "Бессрочно";

    const parts = date.split("-");

    if (parts.length !== 3) return date;

    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }

  function formatMoney(amount) {
    return new Intl.NumberFormat("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount)) + " zł";
  }

  function rateLabel(rate) {
    const type = TYPES[rate.rate_type];

    if (!type) return String(rate.rate_type);

    return type[0];
  }

  function rateAmount(rate) {
    const type = TYPES[rate.rate_type];
    const unit = type ? type[1] : "";

    return (
      formatMoney(rate.amount) +
      (rate.rate_type === "fixed" ? "" : `/${unit}`)
    );
  }

  function showMessage(message, error = false) {
    const el = $("ratesMessage");

    if (!el) return;

    el.textContent = message;
    el.style.color = error ? "#ff7777" : "#22c55e";
  }

  function showError(error) {
    console.error("Employee Rates:", error);

    showMessage(
      error?.message || "Неизвестная ошибка",
      true
    );
  }

  function createInterface() {
    if ($("employeeRatesPanel")) return;

    const panel = document.createElement("section");

    panel.id = "employeeRatesPanel";
    panel.className = "panel";
    panel.style.marginTop = "20px";

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <h3>Ставки сотрудников</h3>
          <p>
            Оплата труда, будущие повышения
            и история изменений
          </p>
        </div>

        <button type="button" id="ratesRefresh">
          Обновить
        </button>
      </div>

      <div style="
        padding:20px;
        display:grid;
        gap:20px;
      ">

        <div>
          <label for="ratesEmployee">
            <strong>Сотрудник</strong>
          </label>

          <select id="ratesEmployee"
            style="
              width:100%;
              padding:12px;
              margin-top:8px;
            ">
            <option value="">
              Выберите сотрудника
            </option>
          </select>
        </div>

        <div id="ratesCurrent"></div>

        <div style="
          border-top:1px solid #3b3f46;
          padding-top:20px;
        ">
          <h3>Назначить новую ставку</h3>

          <p style="
            color:#a4a7ad;
            margin:8px 0 16px;
          ">
            Можно указать будущую дату.
            Старая ставка будет закрыта
            автоматически.
          </p>

          <form id="ratesForm"
            style="display:grid;gap:14px">

            <div>
              <label for="ratesType">
                Тип оплаты
              </label>

              <select id="ratesType"
                required
                style="
                  width:100%;
                  padding:12px;
                  margin-top:6px;
                ">
                <option value="hourly">
                  Почасовая
                </option>

                <option value="square_meter">
                  За м²
                </option>

                <option value="linear_meter">
                  За погонный метр
                </option>

                <option value="piece">
                  За штуку
                </option>

                <option value="fixed">
                  Фиксированная
                </option>
              </select>
            </div>

            <div>
              <label for="ratesAmount">
                Сумма (PLN)
              </label>

              <input
                id="ratesAmount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Например: 45"
                style="
                  width:100%;
                  padding:12px;
                  margin-top:6px;
                "
              >
            </div>

            <div>
              <label for="ratesStart">
                Дата начала
              </label>

              <input
                id="ratesStart"
                type="date"
                required
                style="
                  width:100%;
                  padding:12px;
                  margin-top:6px;
                "
              >
            </div>

            <div>
              <label for="ratesNote">
                Примечание
              </label>

              <textarea
                id="ratesNote"
                rows="3"
                placeholder="Например: Повышение ставки"
                style="
                  width:100%;
                  padding:12px;
                  margin-top:6px;
                "
              ></textarea>
            </div>

            <button
              type="submit"
              id="ratesSave"
            >
              Сохранить новую ставку
            </button>
          </form>
        </div>

        <div style="
          border-top:1px solid #3b3f46;
          padding-top:20px;
        ">
          <h3>История ставок</h3>

          <div id="ratesHistory"
            style="margin-top:12px">
            Выберите сотрудника.
          </div>
        </div>

        <p id="ratesMessage"
          role="status"></p>

      </div>
    `;

    root.appendChild(panel);

    $("ratesStart").value = today();

    $("ratesEmployee").addEventListener(
      "change",
      render
    );

    $("ratesType").addEventListener(
      "change",
      render
    );

    $("ratesForm").addEventListener(
      "submit",
      saveRate
    );

    $("ratesRefresh").addEventListener(
      "click",
      () => loadData().catch(showError)
    );
  }

  async function verifyOwner() {
    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      throw new Error(
        "Сессия не найдена. Войдите в админку."
      );
    }

    const { data, error } =
      await db.rpc("is_owner");

    if (error) throw error;

    if (data !== true) {
      throw new Error(
        "Управление ставками доступно только OWNER."
      );
    }
  }

  async function loadData() {
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      showMessage("Загрузка данных...");

      await verifyOwner();

      const [employeesResult, ratesResult] =
        await Promise.all([
          db.from("employees")
            .select("id,full_name,status")
            .order("full_name"),

          db.from("employee_rates")
            .select("*")
            .is("project_id", null)
            .order("valid_from", {
              ascending: false
            })
        ]);

      if (employeesResult.error) {
        throw employeesResult.error;
      }

      if (ratesResult.error) {
        throw ratesResult.error;
      }

      employees = employeesResult.data || [];
      rates = ratesResult.data || [];

      const select = $("ratesEmployee");
      const previous = select.value;

      select.innerHTML =
        '<option value="">Выберите сотрудника</option>' +
        employees.map(employee => `
          <option value="${escapeHtml(employee.id)}">
            ${escapeHtml(employee.full_name)}
            ${employee.status === "inactive"
              ? "(неактивен)"
              : ""}
          </option>
        `).join("");

      if (employees.some(e => e.id === previous)) {
        select.value = previous;
      }

      render();
      showMessage("");
    })();

    try {
      await loadingPromise;
    } finally {
      loadingPromise = null;
    }
  }

  function getSelectedRates() {
    const employeeId = $("ratesEmployee").value;

    return rates
      .filter(rate => rate.employee_id === employeeId)
      .sort((a, b) =>
        b.valid_from.localeCompare(a.valid_from)
      );
  }

  function rateCard(rate, future = false) {
    const borderColor = future
      ? "#5489d8"
      : "#22a06b";

    return `
      <div style="
        background:#30343a;
        border:1px solid ${borderColor};
        border-radius:10px;
        padding:14px;
      ">
        <div style="color:#a4a7ad">
          ${escapeHtml(rateLabel(rate))}
        </div>

        <strong style="
          display:block;
          font-size:22px;
          margin-top:6px;
        ">
          ${escapeHtml(rateAmount(rate))}
        </strong>

        <div style="
          font-size:12px;
          margin-top:8px;
          color:#a4a7ad;
        ">
          ${future ? "Начнёт действовать" : "Действует с"}
          ${escapeHtml(formatDate(rate.valid_from))}
        </div>
      </div>
    `;
  }

  function render() {
    const employeeId = $("ratesEmployee").value;

    const currentEl = $("ratesCurrent");
    const historyEl = $("ratesHistory");

    if (!employeeId) {
      currentEl.innerHTML = "";
      historyEl.textContent = "Выберите сотрудника.";
      return;
    }

    const date = today();
    const all = getSelectedRates();

    const current = all.filter(rate =>
      rate.valid_from <= date &&
      (!rate.valid_to || rate.valid_to >= date)
    );

    const future = all.filter(rate =>
      rate.valid_from > date
    );

    currentEl.innerHTML = `
      <h3>Действующие ставки</h3>

      <div style="
        display:grid;
        gap:10px;
        margin-top:12px;
      ">
        ${current.length
          ? current.map(rate => rateCard(rate)).join("")
          : '<p style="color:#a4a7ad">Действующих ставок нет.</p>'
        }
      </div>

      ${future.length ? `
        <h3 style="margin-top:20px">
          Запланированные ставки
        </h3>

        <div style="
          display:grid;
          gap:10px;
          margin-top:12px;
        ">
          ${future.map(rate =>
            rateCard(rate, true)
          ).join("")}
        </div>
      ` : ""}
    `;

    historyEl.innerHTML = all.length
      ? all.map(rate => {
          let status = "Завершена";

          if (rate.valid_from > date) {
            status = "Запланирована";
          } else if (
            !rate.valid_to ||
            rate.valid_to >= date
          ) {
            status = "Действует";
          }

          return `
            <div style="
              padding:14px 0;
              border-bottom:1px solid #3b3f46;
            ">
              <div style="
                display:flex;
                justify-content:space-between;
                gap:12px;
                flex-wrap:wrap;
              ">
                <strong>
                  ${escapeHtml(rateLabel(rate))}
                </strong>

                <strong>
                  ${escapeHtml(rateAmount(rate))}
                </strong>
              </div>

              <div style="
                color:#a4a7ad;
                font-size:12px;
                margin-top:8px;
              ">
                ${escapeHtml(formatDate(rate.valid_from))}
                —
                ${rate.valid_to
                  ? escapeHtml(formatDate(rate.valid_to))
                  : "Бессрочно"}
              </div>

              <div style="
                margin-top:6px;
                font-size:12px;
                color:${status === "Запланирована"
                  ? "#79aaff"
                  : status === "Действует"
                    ? "#22c55e"
                    : "#a4a7ad"};
              ">
                ${status}
              </div>

              ${rate.description ? `
                <div style="margin-top:8px">
                  ${escapeHtml(rate.description)}
                </div>
              ` : ""}
            </div>
          `;
        }).join("")
      : '<p style="color:#a4a7ad">История пуста.</p>';
  }

  async function saveRate(event) {
    event.preventDefault();

    if (saving) return;

    const employeeId = $("ratesEmployee").value;
    const rateType = $("ratesType").value;
    const rawAmount = $("ratesAmount").value.trim();
    const amount = Number(rawAmount);
    const startDate = $("ratesStart").value;
    const description = $("ratesNote").value.trim();

    if (!employeeId) {
      showMessage("Выберите сотрудника.", true);
      return;
    }

    if (!TYPES[rateType]) {
      showMessage("Неверный тип оплаты.", true);
      return;
    }

    if (
      rawAmount === "" ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      showMessage("Укажите правильную сумму.", true);
      return;
    }

    if (!startDate) {
      showMessage("Выберите дату начала.", true);
      return;
    }

    const employee = employees.find(
      item => item.id === employeeId
    );

    if (!employee) {
      showMessage("Сотрудник не найден.", true);
      return;
    }

    const confirmed = confirm(
      "Назначить новую ставку?\n\n" +
      `Сотрудник: ${employee.full_name}\n` +
      `Тип: ${TYPES[rateType][0]}\n` +
      `Сумма: ${amount} PLN\n` +
      `Начало: ${formatDate(startDate)}\n\n` +
      "Предыдущая ставка будет закрыта " +
      "за день до новой."
    );

    if (!confirmed) return;

    saving = true;
    $("ratesSave").disabled = true;

    try {
      showMessage("Сохранение...");

      await verifyOwner();

      const { data, error } = await db.rpc(
        "set_employee_rate",
        {
          p_employee_id: employeeId,
          p_rate_type: rateType,
          p_amount: amount,
          p_valid_from: startDate,
          p_description: description || null
        }
      );

      if (error) throw error;

      if (!data) {
        throw new Error(
          "База не вернула ID новой ставки."
        );
      }

      $("ratesAmount").value = "";
      $("ratesNote").value = "";

      await loadData();

      showMessage(
        "Новая ставка успешно сохранена. " +
        "История обновлена."
      );

    } catch (error) {
      showError(error);
    } finally {
      saving = false;
      $("ratesSave").disabled = false;
    }
  }

  createInterface();

  document.querySelectorAll(
    'a[href="#employees"]'
  ).forEach(link => {
    link.addEventListener("click", () => {
      setTimeout(() => {
        loadData().catch(showError);
      }, 250);
    });
  });

  if (location.hash === "#employees") {
    setTimeout(() => {
      loadData().catch(showError);
    }, 500);
  }

  console.log(
    "CONSTRUCTION GROUP — Employee Rates v1.1 initialized"
  );
});
