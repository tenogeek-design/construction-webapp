
"use strict";

/*
  CONSTRUCTION GROUP
  Brigade Management v1.1

  Full replacement for admin-brigades.js.
  Does not modify admin-employees.js or other modules.
*/

document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  const root = $("employees");
  const tableContainer = $("brigadesTable");

  if (!root || !tableContainer || !window.supabase) {
    console.warn("Brigades: required elements not found.");
    return;
  }

const db = window.supabase.createClient(
  "https://yepxskcfxyiyqqhmdpve.supabase.co",
  "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH"
);

  let employees = [];
  let brigades = [];
  let members = [];

  let selectedId = null;
  let canManage = false;
  let loadingPromise = null;
  let busy = false;

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));
  }

  function today() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getEmployee(id) {
    return employees.find(item => item.id === id);
  }

  function getBrigade(id) {
    return brigades.find(item => item.id === id);
  }

  function message(text, error = false) {
    const element = $("brigadeManagerMessage");

    if (!element) return;

    element.textContent = text;
    element.style.color = error ? "#ff7777" : "#22c55e";
  }

  function showError(error) {
    console.error("Brigades:", error);

    const text = error?.message || String(error);

    message(text, true);
    alert("Ошибка: " + text);
  }

  async function authorize() {
    const { data, error } = await db.auth.getSession();

    if (error) throw error;

    if (!data.session) {
      throw new Error(
        "Нет активной сессии. Обновите страницу или войдите заново."
      );
    }

    const result = await db.rpc("is_owner");

    if (result.error) throw result.error;

    canManage = result.data === true;

    if (!canManage) {
      throw new Error(
        "Управление бригадами доступно только OWNER."
      );
    }
  }

  function createPanel() {
    if ($("brigadeManagerPanel")) return;

    const panel = document.createElement("section");

    panel.id = "brigadeManagerPanel";
    panel.className = "panel";
    panel.style.display = "none";
    panel.style.marginTop = "20px";

    panel.innerHTML = `
      <div class="panel-header">
        <div>
          <h3 id="brigadeManagerTitle">
            Карточка бригады
          </h3>
          <p>Бригадир и участники команды</p>
        </div>

        <button
          type="button"
          id="brigadeManagerClose">
          Закрыть ✕
        </button>
      </div>

      <div style="
        padding:20px;
        display:grid;
        gap:22px;
      ">

        <div>
          <label for="brigadeForemanSelect">
            <strong>Бригадир</strong>
          </label>

          <div style="
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            margin-top:10px;
          ">
            <select
              id="brigadeForemanSelect"
              style="
                padding:12px;
                flex:1;
                min-width:200px;
              ">
            </select>

            <button
              type="button"
              id="brigadeSaveForeman">
              Сохранить
            </button>
          </div>
        </div>

        <div>
          <h3>Участники бригады</h3>

          <div
            id="brigadeMembersList"
            style="margin-top:12px;">
          </div>
        </div>

        <div>
          <label for="brigadeEmployeeSelect">
            <strong>Добавить работника</strong>
          </label>

          <div style="
            display:flex;
            gap:10px;
            flex-wrap:wrap;
            margin-top:10px;
          ">
            <select
              id="brigadeEmployeeSelect"
              style="
                padding:12px;
                flex:1;
                min-width:200px;
              ">
            </select>

            <button
              type="button"
              id="brigadeAddEmployee">
              + Добавить
            </button>
          </div>
        </div>

        <p
          id="brigadeManagerMessage"
          role="status">
        </p>

      </div>
    `;

    const parentPanel = tableContainer.closest(".panel");

    if (parentPanel) {
      parentPanel.insertAdjacentElement("afterend", panel);
    } else {
      root.appendChild(panel);
    }

    $("brigadeManagerClose").addEventListener(
      "click",
      closePanel
    );

    $("brigadeSaveForeman").addEventListener(
      "click",
      saveForeman
    );

    $("brigadeAddEmployee").addEventListener(
      "click",
      addEmployee
    );

    $("brigadeMembersList").addEventListener(
      "click",
      event => {
        const button = event.target.closest(
          "[data-remove-member]"
        );

        if (!button) return;

        removeEmployee(button.dataset.removeMember);
      }
    );
  }

  function closePanel() {
    const panel = $("brigadeManagerPanel");

    if (panel) {
      panel.style.display = "none";
    }

    selectedId = null;
  }

  function renderDetails() {
    const brigade = getBrigade(selectedId);

    if (!brigade) {
      message("Бригада не найдена.", true);
      return;
    }

    $("brigadeManagerTitle").textContent = brigade.name;

    const activeEmployees = employees.filter(
      employee => employee.status === "active"
    );

    const foremanSelect = $("brigadeForemanSelect");

    const foremanOptions = [...activeEmployees];

    if (
      brigade.foreman_id &&
      !foremanOptions.some(e => e.id === brigade.foreman_id)
    ) {
      const previousForeman = getEmployee(brigade.foreman_id);

      if (previousForeman) {
        foremanOptions.push(previousForeman);
      }
    }

    foremanSelect.innerHTML =
      '<option value="">Не назначен</option>' +
      foremanOptions.map(employee => `
        <option value="${escapeHtml(employee.id)}">
          ${escapeHtml(employee.full_name)}
        </option>
      `).join("");

    foremanSelect.value = brigade.foreman_id || "";

    const activeMembers = members.filter(member =>
      member.brigade_id === selectedId &&
      member.left_at === null
    );

    const activeMemberIds = new Set(
      activeMembers.map(member => member.employee_id)
    );

    const employeeSelect = $("brigadeEmployeeSelect");

    employeeSelect.innerHTML =
      '<option value="">Выберите работника</option>' +
      activeEmployees
        .filter(employee => !activeMemberIds.has(employee.id))
        .map(employee => `
          <option value="${escapeHtml(employee.id)}">
            ${escapeHtml(employee.full_name)}
          </option>
        `).join("");

    const membersList = $("brigadeMembersList");

    if (activeMembers.length === 0) {
      membersList.innerHTML = `
        <p style="color:#a4a7ad;">
          Участников пока нет.
        </p>
      `;
      return;
    }

    membersList.innerHTML = activeMembers.map(member => {
      const employee = getEmployee(member.employee_id);

      const name = employee
        ? employee.full_name
        : "Неизвестный сотрудник";

      const isForeman =
        member.employee_id === brigade.foreman_id;

      return `
        <div style="
          display:flex;
          justify-content:space-between;
          align-items:center;
          flex-wrap:wrap;
          gap:12px;
          padding:12px 0;
          border-bottom:1px solid #3b3f46;
        ">
          <div>
            <strong>${escapeHtml(name)}</strong>

            ${isForeman ? `
              <span style="
                margin-left:10px;
                color:#ff812e;
                font-size:12px;
              ">
                Бригадир
              </span>
            ` : ""}
          </div>

          <button
            type="button"
            data-remove-member="${escapeHtml(member.id)}">
            Исключить
          </button>
        </div>
      `;
    }).join("");
  }

  /*
    IMPORTANT:
    Do not recreate existing buttons.
    Recreating buttons inside MutationObserver
    caused repeated DOM mutations in v1.0.
  */

  function renderButtons() {
    if (!canManage) return;

    const table = tableContainer.querySelector("table");

    if (!table) return;

    const rows = table.querySelectorAll("tbody tr");

    rows.forEach(row => {
      const cells = row.querySelectorAll("td");

      if (cells.length < 3) return;

      const name = cells[0].textContent.trim();

      const brigade = brigades.find(item =>
        item.name.trim() === name
      );

      if (!brigade) return;

      let actionCell = row.querySelector(
        "[data-brigade-action-cell]"
      );

      if (!actionCell) {
        actionCell = document.createElement("td");
        actionCell.dataset.brigadeActionCell = "true";
        row.appendChild(actionCell);
      }

      let button = actionCell.querySelector(
        "[data-open-brigade]"
      );

      if (!button) {
        button = document.createElement("button");

        button.type = "button";
        button.textContent = "Открыть";
        button.dataset.openBrigade = brigade.id;

        actionCell.appendChild(button);
      } else if (button.dataset.openBrigade !== brigade.id) {
        button.dataset.openBrigade = brigade.id;
      }
    });

    const heading = table.querySelector("thead tr");

    if (
      heading &&
      !heading.querySelector("[data-brigade-actions-heading]")
    ) {
      const th = document.createElement("th");

      th.textContent = "Действия";
      th.dataset.brigadeActionsHeading = "true";

      heading.appendChild(th);
    }
  }

  async function loadData() {
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async () => {
      await authorize();

      const results = await Promise.all([
        db.from("employees")
          .select("id,full_name,status")
          .order("full_name"),

        db.from("brigades")
          .select("id,name,foreman_id,status")
          .order("name"),

        db.from("brigade_members")
          .select(
            "id,brigade_id,employee_id,joined_at,left_at"
          )
      ]);

      for (const result of results) {
        if (result.error) throw result.error;
      }

      employees = results[0].data || [];
      brigades = results[1].data || [];
      members = results[2].data || [];

      renderButtons();

      if (selectedId) {
        renderDetails();
      }
    })();

    try {
      await loadingPromise;
    } finally {
      loadingPromise = null;
    }
  }

  async function openBrigade(id) {
    if (busy) return;

    busy = true;

    try {
      createPanel();

      selectedId = id;

      const panel = $("brigadeManagerPanel");

      panel.style.display = "block";

      message("Загрузка бригады...");

      await loadData();

      if (!getBrigade(id)) {
        throw new Error("Бригада не найдена.");
      }

      renderDetails();
      message("");

      panel.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    } catch (error) {
      showError(error);
    } finally {
      busy = false;
    }
  }

  async function saveForeman() {
    if (!selectedId || busy) return;

    const brigadeId = selectedId;
    const foremanId =
      $("brigadeForemanSelect").value || null;

    busy = true;

    try {
      await authorize();

      const { data, error } = await db
        .from("brigades")
        .update({
          foreman_id: foremanId
        })
        .eq("id", brigadeId)
        .select("id");

      if (error) throw error;

      if (!data || data.length !== 1) {
        throw new Error(
          "Изменение не подтверждено базой данных."
        );
      }

      await loadData();

      message("Бригадир успешно сохранён.");

    } catch (error) {
      showError(error);
    } finally {
      busy = false;
    }
  }

  async function addEmployee() {
    if (!selectedId || busy) return;

    const brigadeId = selectedId;
    const employeeId = $("brigadeEmployeeSelect").value;

    if (!employeeId) {
      message("Сначала выберите работника.", true);
      return;
    }

    busy = true;

    try {
      await authorize();

      const { data: existing, error: checkError } = await db
        .from("brigade_members")
        .select("id")
        .eq("brigade_id", brigadeId)
        .eq("employee_id", employeeId)
        .is("left_at", null);

      if (checkError) throw checkError;

      if (existing && existing.length > 0) {
        throw new Error(
          "Этот работник уже находится в бригаде."
        );
      }

      const { data, error } = await db
        .from("brigade_members")
        .insert({
          brigade_id: brigadeId,
          employee_id: employeeId,
          joined_at: today()
        })
        .select("id");

      if (error) throw error;

      if (!data || data.length !== 1) {
        throw new Error(
          "Добавление не подтверждено базой данных."
        );
      }

      await loadData();

      message("Работник успешно добавлен.");

    } catch (error) {
      showError(error);
    } finally {
      busy = false;
    }
  }

  async function removeEmployee(memberId) {
    if (!selectedId || busy) return;

    const brigadeId = selectedId;

    const member = members.find(item =>
      item.id === memberId &&
      item.brigade_id === brigadeId &&
      item.left_at === null
    );

    if (!member) {
      message("Участник не найден.", true);
      return;
    }

    const employee = getEmployee(member.employee_id);

    const name = employee?.full_name || "работника";

    if (!confirm(`Исключить ${name} из бригады?`)) {
      return;
    }

    busy = true;

    try {
      await authorize();

      const { data, error } = await db
        .from("brigade_members")
        .update({
          left_at: today()
        })
        .eq("id", memberId)
        .eq("brigade_id", brigadeId)
        .is("left_at", null)
        .select("id");

      if (error) throw error;

      if (!data || data.length !== 1) {
        throw new Error(
          "Исключение не подтверждено базой данных."
        );
      }

      await loadData();

      message(
        "Работник исключён. История участия сохранена."
      );

    } catch (error) {
      showError(error);
    } finally {
      busy = false;
    }
  }

  /*
    Single delegated click handler.
    Works even after the employees module
    recreates the brigade table.
  */

  root.addEventListener("click", event => {
    const button = event.target.closest(
      "[data-open-brigade]"
    );

    if (!button || !root.contains(button)) return;

    event.preventDefault();

    const brigadeId = button.dataset.openBrigade;

    if (brigadeId) {
      openBrigade(brigadeId);
    }
  });

  /*
    Observe table changes without modifying
    existing buttons repeatedly.
  */

  let updateScheduled = false;

  const observer = new MutationObserver(() => {
    if (updateScheduled) return;

    updateScheduled = true;

    setTimeout(() => {
      updateScheduled = false;
      renderButtons();
    }, 100);
  });

  observer.observe(tableContainer, {
    childList: true,
    subtree: true
  });

  /*
    Load when the Employees section opens.
  */

  document.querySelectorAll(
    'a[href="#employees"]'
  ).forEach(link => {
    link.addEventListener("click", () => {
      setTimeout(() => {
        loadData().catch(showError);
      }, 200);
    });
  });

  if (location.hash === "#employees") {
    setTimeout(() => {
      loadData().catch(showError);
    }, 500);
  }

  console.log(
    "CONSTRUCTION GROUP — Brigade Management v1.1 initialized"
  );
});
