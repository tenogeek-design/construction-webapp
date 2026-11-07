
"use strict";

/*
 CONSTRUCTION GROUP
 Employee Rates v1.0

 Separate module.
 Does not replace existing employees or brigades code.
 Only OWNER can manage rates.
*/

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("employees");

  if (!root || !window.supabase) return;

  const db = window.supabase.createClient(
    "https://yepxskcfxyiyqqhmdpve.supabase.co",
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH"
  );

  const $ = id => document.getElementById(id);

  let employees = [];
  let rates = [];
  let loading = false;
  let saving = false;
  let authorized = false;

  const TYPES = {
    hourly: "Почасовая — zł/час",
    square_meter: "За м² — zł/м²",
    linear_meter: "За погонный метр — zł/м",
    piece: "За штуку — zł/шт.",
    fixed: "Фиксированная — zł"
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function localDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function previousDate(dateString) {
    const d = new Date(dateString + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function money(value, currency = "PLN") {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency
    }).format(Number(value));
  }

  function showMessage(text, error = false) {
    const el = $("ratesMessage");
    if (!el) return;

    el.textContent = text;
    el.style.color = error ? "#ff7777" : "#22c55e";
  }

  function makeUI() {
    if ($("employeeRatesPanel")) return;

    const panel = document.createElement("section");
    panel.id = "employeeRatesPanel";
    panel.className = "panel";
    panel.style.marginTop = "20px";

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <h3>Ставки сотрудников</h3>
          <p>Оплата труда и история изменений</p>
        </div>
        <button type="button" id="ratesRefresh">
          Обновить
        </button>
      </div>

      <div style="padding:20px;display:grid;gap:20px">

        <div>
          <label for="ratesEmployee">
            <strong>Сотрудник</strong>
          </label>
          <select id="ratesEmployee"
            style="width:100%;padding:12px;margin-top:8px">
            <option value="">Выберите сотрудника</option>
          </select>
        </div>

        <div id="ratesCurrent"></div>

        <div style="
          border-top:1px solid #3b3f46;
          padding-top:20px;
        ">
          <h3>Назначить новую ставку</h3>
          <p style="color:#a4a7ad;margin:8px 0 16px">
            Предыдущая ставка того же типа
            будет закрыта автоматически.
          </p>

          <form id="ratesForm"
            style="display:grid;gap:14px">

            <div>
              <label for="ratesType">Тип оплаты</label>
              <select id="ratesType" required
                style="width:100%;padding:12px;margin-top:6px">
                <option value="hourly">Почасовая</option>
                <option value="square_meter">За м²</option>
                <option value="linear_meter">За погонный метр</option>
                <option value="piece">За штуку</option>
                <option value="fixed">Фиксированная</option>
              </select>
            </div>

            <div>
              <label for="ratesAmount">Сумма (PLN)</label>
              <input id="ratesAmount"
                type="number"
                min="0"
                step="0.01"
                required
                placeholder="Например: 40"
                style="width:100%;padding:12px;margin-top:6px">
            </div>

            <div>
              <label for="ratesStart">Дата начала</label>
              <input id="ratesStart"
                type="date"
                required
                style="width:100%;padding:12px;margin-top:6px">
            </div>

            <div>
              <label for="ratesNote">Примечание</label>
              <textarea id="ratesNote"
                rows="3"
                placeholder="Причина изменения ставки"
                style="width:100%;padding:12px;margin-top:6px">
              </textarea>
            </div>

            <button type="submit" id="ratesSave">
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

        <p id="ratesMessage" role="status"></p>

      </div>
    `;

    root.appendChild(panel);

    $("ratesStart").value = localDate();

    $("ratesEmployee").addEventListener("change", render);
    $("ratesType").addEventListener("change", render);
    $("ratesForm").addEventListener("submit", saveRate);

    $("ratesRefresh").addEventListener("click", () => {
      loadData().catch(handleError);
    });
  }

  function handleError(error) {
    console.error("Employee Rates:", error);
    showMessage(error.message || String(error), true);
  }

  async function checkOwner() {
    const { data: sessionData, error: sessionError } =
      await db.auth.getSession();

    if (sessionError) throw sessionError;

    if (!sessionData.session) {
      throw new Error("Нет активной сессии OWNER.");
    }

    const { data, error } = await db.rpc("is_owner");

    if (error) throw error;

    if (data !== true) {
      throw new Error(
        "Управление ставками доступно только OWNER."
      );
    }

    authorized = true;
  }

  async function loadData() {
    if (loading) return;

    loading = true;

    try {
      showMessage("Загрузка ставок...");

      await checkOwner();

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
        employees.map(e => `
          <option value="${esc(e.id)}">
            ${esc(e.full_name)}
            ${e.status === "inactive" ? " (неактивен)" : ""}
          </option>
        `).join("");

      if (employees.some(e => e.id === previous)) {
        select.value = previous;
      }

      render();
      showMessage("");

    } finally {
      loading = false;
    }
  }

  function selectedRates() {
    const employeeId = $("ratesEmployee").value;

    return rates.filter(
      r => r.employee_id === employeeId
    );
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

    const today = localDate();
    const all = selectedRates();

    const active = all.filter(r =>
      r.valid_from <= today &&
      (!r.valid_to || r.valid_to >= today)
    );

    currentEl.innerHTML = `
      <h3>Действующие ставки</h3>
      <div style="display:grid;gap:10px;margin-top:12px">
        ${active.length ? active.map(r => `
          <div style="
            background:#30343a;
            border:1px solid #3b3f46;
            border-radius:10px;
            padding:14px;
          ">
            <div style="color:#a4a7ad">
              ${esc(TYPES[r.rate_type] || r.rate_type)}
            </div>
            <strong style="font-size:22px">
              ${esc(money(r.amount, r.currency))}
            </strong>
            <div style="margin-top:6px;font-size:12px">
              С ${esc(r.valid_from)}
            </div>
          </div>
        `).join("") : `
          <p style="color:#a4a7ad">
            Действующих ставок нет.
          </p>
        `}
      </div>
    `;

    historyEl.innerHTML = all.length
      ? all.map(r => `
        <div style="
          padding:12px 0;
          border-bottom:1px solid #3b3f46;
        ">
          <div style="
            display:flex;
            justify-content:space-between;
            gap:10px;
            flex-wrap:wrap;
          ">
            <strong>
              ${esc(TYPES[r.rate_type] || r.rate_type)}
            </strong>
            <strong>
              ${esc(money(r.amount, r.currency))}
            </strong>
          </div>

          <div style="
            color:#a4a7ad;
            font-size:12px;
            margin-top:6px;
          ">
            ${esc(r.valid_from)}
            —
            ${esc(r.valid_to || "действует бессрочно")}
          </div>

          ${r.description ? `
            <div style="margin-top:6px">
              ${esc(r.description)}
            </div>
          ` : ""}
        </div>
      `).join("")
      : '<p style="color:#a4a7ad">История пуста.</p>';
  }

  async function saveRate(event) {
    event.preventDefault();

    if (saving) return;

    const employeeId = $("ratesEmployee").value;
    const rateType = $("ratesType").value;
    const amount = Number($("ratesAmount").value);
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

    if (!Number.isFinite(amount) || amount < 0) {
      showMessage("Укажите правильную сумму.", true);
      return;
    }

    if (!startDate) {
      showMessage("Укажите дату начала.", true);
      return;
    }

    if (startDate > localDate()) {
      showMessage(
        "В этой версии будущие ставки пока не назначаем.",
        true
      );
      return;
    }

    saving = true;
    $("ratesSave").disabled = true;

    try {
      await checkOwner();

      /*
        Refresh this employee's rates before saving.
        Project-specific rates are not changed.
      */

      const { data: freshRates, error: freshError } =
        await db.from("employee_rates")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("rate_type", rateType)
          .is("project_id", null)
          .order("valid_from", {
            ascending: false
          });

      if (freshError) throw freshError;

      const existing = freshRates || [];

      const overlaps = existing.filter(r =>
        r.valid_from <= startDate &&
        (!r.valid_to || r.valid_to >= startDate)
      );

      if (overlaps.length > 1) {
        throw new Error(
          "Найдены пересекающиеся ставки. " +
          "Нужно исправить историю перед сохранением."
        );
      }

      const current = overlaps[0] || null;

      if (current && current.valid_from === startDate) {
        throw new Error(
          "На эту дату ставка уже существует. " +
          "Выберите другую дату начала."
        );
      }

      const future = existing.some(r =>
        r.valid_from > startDate
      );

      if (future) {
        throw new Error(
          "В истории уже есть более новая ставка. " +
          "Изменение задним числом пока недоступно."
        );
      }

      const employee = employees.find(
        e => e.id === employeeId
      );

      const confirmed = confirm(
        `Сотрудник: ${employee?.full_name || employeeId}\n` +
        `Тип: ${TYPES[rateType]}\n` +
        `Новая сумма: ${amount} PLN\n` +
        `С даты: ${startDate}\n\n` +
        "Сохранить новую ставку?"
      );

      if (!confirmed) return;

      /*
        Close the previous rate.
        If inserting the new rate fails,
        attempt to restore the previous end date.
      */

      let previousClosed = false;
      let previousEnd = null;

      if (current) {
        previousEnd = current.valid_to;

        const { data, error } = await db
          .from("employee_rates")
          .update({
            valid_to: previousDate(startDate)
          })
          .eq("id", current.id)
          .eq("valid_from", current.valid_from)
          .select("id");

        if (error) throw error;

        if (!data || data.length !== 1) {
          throw new Error(
            "Не удалось закрыть предыдущую ставку."
          );
        }

        previousClosed = true;
      }

      const { data: inserted, error: insertError } =
        await db.from("employee_rates")
          .insert({
            employee_id: employeeId,
            rate_type: rateType,
            amount,
            currency: "PLN",
            valid_from: startDate,
            valid_to: null,
            project_id: null,
            description: description || null
          })
          .select("id");

      if (insertError || !inserted || inserted.length !== 1) {
        if (previousClosed && current) {
          const rollback = await db
            .from("employee_rates")
            .update({
              valid_to: previousEnd
            })
            .eq("id", current.id);

          if (rollback.error) {
            throw new Error(
              "Новая ставка не сохранена. " +
              "Автоматическое восстановление старой ставки " +
              "тоже не удалось. Проверьте данные в Supabase."
            );
          }
        }

        throw insertError || new Error(
          "База не подтвердила новую ставку."
        );
      }

      $("ratesAmount").value = "";
      $("ratesNote").value = "";

      await loadData();

      showMessage("Новая ставка успешно сохранена.");

    } catch (error) {
      handleError(error);
    } finally {
      saving = false;
      $("ratesSave").disabled = false;
    }
  }

  makeUI();

  document.querySelectorAll(
    'a[href="#employees"]'
  ).forEach(link => {
    link.addEventListener("click", () => {
      setTimeout(() => {
        loadData().catch(handleError);
      }, 250);
    });
  });

  if (location.hash === "#employees") {
    setTimeout(() => {
      loadData().catch(handleError);
    }, 500);
  }

  console.log(
    "CONSTRUCTION GROUP — Employee Rates v1.0 initialized"
  );
});
