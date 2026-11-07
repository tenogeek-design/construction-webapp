
"use strict";

/*
  CONSTRUCTION GROUP — Brigade Management v1.0
  Works alongside admin-employees.js.
  Existing modules are not modified.
*/

document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);
  const root = $("employees");
  if (!root || !window.supabase) return;

  const db = window.supabase.createClient(
    "https://yepxskcfxyiyqqhmdpve.supabase.co",
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH"
  );

  let employees = [];
  let brigades = [];
  let members = [];
  let selectedId = null;
  let canManage = false;
  let loading = false;

  const escapeHtml = value =>
    String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));

  function getEmployee(id) {
    return employees.find(e => e.id === id);
  }

  function getBrigade(id) {
    return brigades.find(b => b.id === id);
  }

  function showError(error) {
    alert(error?.message || String(error));
  }

  async function authorize() {
    const { data: { session }, error: authError } =
      await db.auth.getSession();

    if (authError || !session) {
      throw new Error("Необходимо войти в систему.");
    }

    // Brigade management is OWNER-only in this version.
    const { data: owner, error: ownerError } =
      await db.rpc("is_owner");

    if (ownerError) throw ownerError;
    canManage = owner === true;

    if (!canManage) {
      throw new Error("Управление бригадами доступно OWNER.");
    }
  }

  function ensurePanel() {
    if ($("brigadeManagerPanel")) return;

    const panel = document.createElement("section");
    panel.id = "brigadeManagerPanel";
    panel.className = "panel";
    panel.style.cssText =
      "display:none;margin-top:20px;";

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <h3 id="brigadeManagerTitle">Карточка бригады</h3>
          <p>Бригадир и участники команды</p>
        </div>
        <button type="button" id="brigadeManagerClose">
          Закрыть ✕
        </button>
      </div>

      <div style="padding:20px;display:grid;gap:18px;">

        <div>
          <label for="brigadeForemanSelect">
            <strong>Бригадир</strong>
          </label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            <select id="brigadeForemanSelect"
              style="padding:12px;flex:1;min-width:200px;">
            </select>
            <button type="button" id="brigadeSaveForeman">
              Сохранить
            </button>
          </div>
        </div>

        <div>
          <h3>Участники бригады</h3>
          <div id="brigadeMembersList"
            style="margin-top:12px;"></div>
        </div>

        <div>
          <label for="brigadeEmployeeSelect">
            <strong>Добавить работника</strong>
          </label>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">
            <select id="brigadeEmployeeSelect"
              style="padding:12px;flex:1;min-width:200px;">
            </select>
            <button type="button" id="brigadeAddEmployee">
              + Добавить
            </button>
          </div>
        </div>

        <p id="brigadeManagerMessage" role="status"></p>
      </div>
    `;

    const brigadesTable = $("brigadesTable");
    const parentPanel = brigadesTable?.closest(".panel");

    if (parentPanel) {
      parentPanel.insertAdjacentElement("afterend", panel);
    }

    $("brigadeManagerClose").addEventListener(
      "click", () => {
        panel.style.display = "none";
        selectedId = null;
      }
    );

    $("brigadeSaveForeman").addEventListener(
      "click", saveForeman
    );

    $("brigadeAddEmployee").addEventListener(
      "click", addEmployee
    );

    $("brigadeMembersList").addEventListener(
      "click", event => {
        const button = event.target.closest(
          "[data-remove-member]"
        );
        if (button) removeEmployee(button.dataset.removeMember);
      }
    );
  }

  async function load() {
    if (loading) return;
    loading = true;

    try {
      await authorize();

      const results = await Promise.all([
        db.from("employees")
          .select("id,full_name,status")
          .order("full_name"),
        db.from("brigades")
          .select("id,name,foreman_id,status")
          .order("name"),
        db.from("brigade_members")
          .select("id,brigade_id,employee_id,joined_at,left_at")
      ]);

      for (const result of results) {
        if (result.error) throw result.error;
      }

      employees = results[0].data || [];
      brigades = results[1].data || [];
      members = results[2].data || [];

      renderBrigadeButtons();

      if (selectedId) renderDetails();

    } catch (error) {
      console.error("Brigades:", error);
      const msg = $("brigadeManagerMessage");
      if (msg) msg.textContent = "Ошибка: " + error.message;
    } finally {
      loading = false;
    }
  }

  function renderBrigadeButtons() {
    const table = $("brigadesTable");
    if (!table || !canManage) return;

    // Preserve the existing table generated by admin-employees.js.
    const rows = table.querySelectorAll("tbody tr");

    rows.forEach((row, index) => {
      const brigade = brigades[index];
      if (!brigade) return;

      let cell = row.querySelector(
        "[data-brigade-action-cell]"
      );

      if (!cell) {
        cell = document.createElement("td");
        cell.dataset.brigadeActionCell = "true";
        cell.style.padding = "12px";
        row.appendChild(cell);
      }

      cell.replaceChildren();

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Открыть";
      button.dataset.openBrigade = brigade.id;
      cell.appendChild(button);
    });

    const heading = table.querySelector("thead tr");

    if (heading &&
        !heading.querySelector("[data-brigade-actions-heading]")) {
      const th = document.createElement("th");
      th.dataset.brigadeActionsHeading = "true";
      th.textContent = "Действия";
      th.style.cssText = "padding:12px;text-align:left;";
      heading.appendChild(th);
    }
  }

  function renderDetails() {
    const brigade = getBrigade(selectedId);
    if (!brigade) return;

    $("brigadeManagerTitle").textContent =
      brigade.name;

    const foremanSelect = $("brigadeForemanSelect");
    const employeeSelect = $("brigadeEmployeeSelect");

    const activeEmployees = employees.filter(
      e => e.status === "active"
    );

    foremanSelect.innerHTML =
      `<option value="">Не назначен</option>` +
      activeEmployees.map(e => `
        <option value="${escapeHtml(e.id)}">
          ${escapeHtml(e.full_name)}
        </option>
      `).join("");

    foremanSelect.value = brigade.foreman_id || "";

    const activeMembers = members.filter(m =>
      m.brigade_id === selectedId &&
      m.left_at === null
    );

    const memberIds = new Set(
      activeMembers.map(m => m.employee_id)
    );

    employeeSelect.innerHTML =
      `<option value="">Выберите работника</option>` +
      activeEmployees
        .filter(e => !memberIds.has(e.id))
        .map(e => `
          <option value="${escapeHtml(e.id)}">
            ${escapeHtml(e.full_name)}
          </option>
        `).join("");

    $("brigadeMembersList").innerHTML =
      activeMembers.length
        ? activeMembers.map(m => `
          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:12px;
            padding:12px 0;
            border-bottom:1px solid #3b3f46;
          ">
            <span>
              ${escapeHtml(
                getEmployee(m.employee_id)?.full_name ||
                "Неизвестный сотрудник"
              )}
            </span>
            <button type="button"
              data-remove-member="${escapeHtml(m.id)}">
              Исключить
            </button>
          </div>
        `).join("")
        : "<p>Участников пока нет.</p>";

    $("brigadeManagerMessage").textContent = "";
  }

  async function openBrigade(id) {
    selectedId = id;
    ensurePanel();

    try {
      await load();
      renderDetails();

      const panel = $("brigadeManagerPanel");
      panel.style.display = "block";
      panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    } catch (error) {
      showError(error);
    }
  }

  async function saveForeman() {
    if (!selectedId || !canManage) return;

    const foremanId =
      $("brigadeForemanSelect").value || null;

    try {
      await authorize();

      const { error } = await db.from("brigades")
        .update({ foreman_id: foremanId })
        .eq("id", selectedId);

      if (error) throw error;

      await load();
      $("brigadeManagerMessage").textContent =
        "Бригадир сохранён.";

    } catch (error) {
      showError(error);
    }
  }

  async function addEmployee() {
    if (!selectedId || !canManage) return;

    const employeeId =
      $("brigadeEmployeeSelect").value;

    if (!employeeId) return;

    try {
      await authorize();

      const existing = members.find(m =>
        m.brigade_id === selectedId &&
        m.employee_id === employeeId &&
        m.left_at === null
      );

      if (existing) {
        throw new Error("Работник уже в этой бригаде.");
      }

      const today = new Date()
        .toLocaleDateString("en-CA");

      const { error } = await db
        .from("brigade_members")
        .insert({
          brigade_id: selectedId,
          employee_id: employeeId,
          joined_at: today
        });

      if (error) throw error;

      await load();
      $("brigadeManagerMessage").textContent =
        "Работник добавлен.";

    } catch (error) {
      showError(error);
    }
  }

  async function removeEmployee(memberId) {
    if (!selectedId || !canManage) return;

    if (!confirm("Исключить работника из бригады?")) {
      return;
    }

    try {
      await authorize();

      const today = new Date()
        .toLocaleDateString("en-CA");

      const { error } = await db
        .from("brigade_members")
        .update({ left_at: today })
        .eq("id", memberId)
        .eq("brigade_id", selectedId)
        .is("left_at", null);

      if (error) throw error;

      await load();
      $("brigadeManagerMessage").textContent =
        "Работник исключён. История сохранена.";

    } catch (error) {
      showError(error);
    }
  }

  // Event delegation survives table refreshes.
  $("brigadesTable")?.addEventListener(
    "click", event => {
      const button = event.target.closest(
        "[data-open-brigade]"
      );

      if (button) openBrigade(button.dataset.openBrigade);
    }
  );

  // Observe updates from the existing employees module.
  const table = $("brigadesTable");

  if (table) {
    let scheduled = false;
    const observer = new MutationObserver(() => {
      if (scheduled) return;
      scheduled = true;

      setTimeout(() => {
        scheduled = false;
        renderBrigadeButtons();
      }, 50);
    });

    observer.observe(table, {
      childList: true,
      subtree: true
    });
  }

  document.querySelectorAll(
    'a[href="#employees"]'
  ).forEach(link => {
    link.addEventListener("click", () => {
      setTimeout(load, 200);
    });
  });

  if (location.hash === "#employees") {
    setTimeout(load, 700);
  }
});
