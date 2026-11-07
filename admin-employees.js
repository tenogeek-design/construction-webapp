
"use strict";

/*
  CONSTRUCTION GROUP
  Employees & Brigades — Version 1.0
*/

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);
  const section = $("employees");

  if (!section || !window.supabase) return;

  const db = window.supabase.createClient(
    "https://yepxskcfxyiyqqhmdpve.supabase.co",
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH"
  );

  let employees = [];
  let brigades = [];
  let rates = [];
  let permissions = new Set();
  let initialized = false;
  let loading = false;

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  const message = (id, value) => {
    const element = $(id);
    if (element) element.textContent = value;
  };

  const can = (code) => permissions.has(code + ":all");

  const money = (value, currency = "PLN") =>
    Number(value).toLocaleString("pl-PL", {
      maximumFractionDigits: 2
    }) + " " + currency;

  const rateTypes = {
    hourly: "/ час",
    square_meter: "/ м²",
    linear_meter: "/ пог. м",
    piece: "/ шт.",
    fixed: "фиксированно"
  };

  async function checkAccess() {
    const { data: { session }, error: sessionError } =
      await db.auth.getSession();

    if (sessionError || !session) {
      throw new Error("Необходимо войти в админку.");
    }

    const { data, error } =
      await db.rpc("get_my_effective_permissions");

    if (error) throw error;

    permissions = new Set(
      (data || []).map((p) =>
        p.permission_code + ":" + p.scope
      )
    );

    if (!can("employees.view")) {
      throw new Error("Нет права просмотра сотрудников.");
    }
  }

  async function loadData() {
    if (loading) return;
    loading = true;

    message("employeesMessage", "Загружаем сотрудников...");
    message("brigadesMessage", "Загружаем бригады...");

    try {
      await checkAccess();

      const [employeeResult, brigadeResult, rateResult] =
        await Promise.all([
          db.from("employees")
            .select("*")
            .order("full_name"),

          db.from("brigades")
            .select("*")
            .order("name"),

          db.from("employee_rates")
            .select("*")
            .is("valid_to", null)
            .order("valid_from", { ascending: false })
        ]);

      if (employeeResult.error) throw employeeResult.error;
      if (brigadeResult.error) throw brigadeResult.error;
      if (rateResult.error) throw rateResult.error;

      employees = employeeResult.data || [];
      brigades = brigadeResult.data || [];
      rates = rateResult.data || [];

      renderEmployees();
      renderBrigades();

      $("employeeNewBtn").disabled =
        !can("employees.create");

      $("brigadeNewBtn").disabled =
        !can("employees.create");

    } catch (error) {
      console.error("Employees:", error);

      message(
        "employeesMessage",
        "Ошибка: " + error.message
      );

      message(
        "brigadesMessage",
        "Не удалось загрузить данные."
      );
    } finally {
      loading = false;
    }
  }

  function employeeRate(employeeId) {
    const current = rates.find((rate) =>
      rate.employee_id === employeeId &&
      !rate.project_id &&
      rate.valid_from <=
        new Date().toLocaleDateString("en-CA")
    );

    if (!current) return "Не установлена";

    return money(current.amount, current.currency) +
      " " + (rateTypes[current.rate_type] || "");
  }

  function renderEmployees() {
    const search =
      ($("employeesSearch")?.value || "")
        .trim()
        .toLowerCase();

    const filtered = employees.filter((employee) =>
      [
        employee.full_name,
        employee.phone,
        employee.position
      ].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );

    $("employeesTotal").textContent = employees.length;

    $("employeesActive").textContent =
      employees.filter((e) => e.status === "active").length;

    $("employeesBrigades").textContent = brigades.length;

    message(
      "employeesMessage",
      "Найдено сотрудников: " + filtered.length
    );

    if (!filtered.length) {
      $("employeesTable").innerHTML =
        "<p>Сотрудники не найдены.</p>";
      return;
    }

    $("employeesTable").innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:12px;text-align:left;">Сотрудник</th>
            <th style="padding:12px;text-align:left;">Телефон</th>
            <th style="padding:12px;text-align:left;">Должность</th>
            <th style="padding:12px;text-align:left;">Ставка</th>
            <th style="padding:12px;text-align:left;">Статус</th>
            <th style="padding:12px;text-align:left;">Действия</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((employee) => `
            <tr style="border-top:1px solid #3b3f46;">
              <td style="padding:12px;">
                <strong>${escapeHtml(employee.full_name)}</strong>
              </td>
              <td style="padding:12px;">
                ${escapeHtml(employee.phone || "—")}
              </td>
              <td style="padding:12px;">
                ${escapeHtml(employee.position || "—")}
              </td>
              <td style="padding:12px;">
                ${escapeHtml(employeeRate(employee.id))}
              </td>
              <td style="padding:12px;">
                ${employee.status === "active"
                  ? "🟢 Активный"
                  : "⚪ Неактивный"}
              </td>
              <td style="padding:12px;">
                <button type="button"
                  data-edit-employee="${escapeHtml(employee.id)}"
                  ${can("employees.update") ? "" : "disabled"}>
                  Изменить
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function renderBrigades() {
    $("employeesBrigades").textContent = brigades.length;

    message(
      "brigadesMessage",
      "Всего бригад: " + brigades.length
    );

    if (!brigades.length) {
      $("brigadesTable").innerHTML =
        "<p>Бригад пока нет.</p>";
      return;
    }

    $("brigadesTable").innerHTML = `
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:12px;text-align:left;">Бригада</th>
            <th style="padding:12px;text-align:left;">Бригадир</th>
            <th style="padding:12px;text-align:left;">Статус</th>
          </tr>
        </thead>
        <tbody>
          ${brigades.map((brigade) => {
            const foreman = employees.find(
              (employee) => employee.id === brigade.foreman_id
            );

            return `
              <tr style="border-top:1px solid #3b3f46;">
                <td style="padding:12px;">
                  ${escapeHtml(brigade.name)}
                </td>
                <td style="padding:12px;">
                  ${escapeHtml(foreman?.full_name || "Не назначен")}
                </td>
                <td style="padding:12px;">
                  ${brigade.status === "active"
                    ? "🟢 Активна"
                    : "⚪ Архив"}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function openEditor(employee = null) {
    if (!can(employee ? "employees.update" : "employees.create")) {
      return;
    }

    $("employeeForm").reset();
    $("employeeId").value = employee?.id || "";
    $("employeeName").value = employee?.full_name || "";
    $("employeePhone").value = employee?.phone || "";
    $("employeePosition").value = employee?.position || "";
    $("employeeHiredAt").value = employee?.hired_at || "";

    // В employees допустимы только active и inactive.
    $("employeeStatus").value =
      employee?.status === "inactive" ? "inactive" : "active";

    $("employeeNotes").value = employee?.private_notes || "";

    $("employeeEditorTitle").textContent = employee
      ? "Редактировать сотрудника"
      : "Новый сотрудник";

    message("employeeFormMessage", "");

    $("employeeEditorPanel").style.display = "block";
    $("employeeEditorPanel").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  function closeEditor() {
    $("employeeEditorPanel").style.display = "none";
  }

  async function saveEmployee(event) {
    event.preventDefault();

    const id = $("employeeId").value;
    const requiredPermission =
      id ? "employees.update" : "employees.create";

    if (!can(requiredPermission)) {
      message("employeeFormMessage", "Недостаточно прав.");
      return;
    }

    const fullName = $("employeeName").value.trim();

    if (!fullName) {
      message("employeeFormMessage", "Введите имя сотрудника.");
      return;
    }

    const payload = {
      full_name: fullName,
      phone: $("employeePhone").value.trim() || null,
      position: $("employeePosition").value.trim() || null,
      hired_at: $("employeeHiredAt").value || null,
      status: $("employeeStatus").value === "inactive"
        ? "inactive"
        : "active",
      private_notes: $("employeeNotes").value.trim() || null
    };

    const button = $("employeeSaveBtn");
    button.disabled = true;

    message("employeeFormMessage", "Сохраняем...");

    try {
      await checkAccess();

      if (!can(requiredPermission)) {
        throw new Error("Недостаточно прав.");
      }

      const query = id
        ? db.from("employees")
            .update(payload)
            .eq("id", id)
        : db.from("employees")
            .insert(payload);

      const { data, error } =
        await query.select("id").single();

      if (error) throw error;
      if (!data?.id) {
        throw new Error("Сохранение не подтверждено.");
      }

      closeEditor();
      await loadData();

    } catch (error) {
      message(
        "employeeFormMessage",
        "Ошибка: " + error.message
      );
    } finally {
      button.disabled = false;
    }
  }

  async function createBrigade() {
    if (!can("employees.create")) return;

    const name = prompt("Название новой бригады:");

    if (name === null || !name.trim()) return;

    const brigadeName = name.trim();

    if (brigadeName.length > 150) {
      alert("Название слишком длинное.");
      return;
    }

    const button = $("brigadeNewBtn");
    button.disabled = true;

    try {
      await checkAccess();

      if (!can("employees.create")) {
        throw new Error("Недостаточно прав.");
      }

      const { error } = await db
        .from("brigades")
        .insert({
          name: brigadeName,
          status: "active"
        });

      if (error) throw error;

      await loadData();

    } catch (error) {
      alert("Ошибка создания бригады: " + error.message);
    } finally {
      button.disabled = !can("employees.create");
    }
  }

  $("employeeNewBtn")?.addEventListener(
    "click",
    () => openEditor()
  );

  $("employeeEditorCloseBtn")?.addEventListener(
    "click",
    closeEditor
  );

  $("employeeForm")?.addEventListener(
    "submit",
    saveEmployee
  );

  $("employeesSearch")?.addEventListener(
    "input",
    renderEmployees
  );

  $("employeesRefreshBtn")?.addEventListener(
    "click",
    loadData
  );

  $("brigadeNewBtn")?.addEventListener(
    "click",
    createBrigade
  );

  $("employeesTable")?.addEventListener(
    "click",
    (event) => {
      const button = event.target.closest(
        "[data-edit-employee]"
      );

      if (!button) return;

      const employee = employees.find(
        (item) =>
          item.id === button.dataset.editEmployee
      );

      if (employee) openEditor(employee);
    }
  );

  // Загружаем данные только при открытии раздела.
  function onSectionOpen() {
    if (!initialized) {
      initialized = true;
      loadData();
    }
  }

  document.querySelectorAll(
    'a[href="#employees"]'
  ).forEach((link) => {
    link.addEventListener("click", () => {
      setTimeout(() => {
        if (section.style.display !== "none") {
          onSectionOpen();
        }
      }, 150);
    });
  });

  if (location.hash === "#employees") {
    setTimeout(onSectionOpen, 500);
  }
});
