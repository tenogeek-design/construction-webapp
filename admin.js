
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";

  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  const loginUrl = "/login.html";

  if (!window.supabase) {
    document.body.textContent =
      "Ошибка загрузки системы авторизации. Обновите страницу.";
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  async function checkAccess() {
    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {
      window.location.replace(loginUrl);
      return null;
    }

    const user = data.session.user;

    const { data: roles, error: roleError } = await client
      .from("app_user_roles")
      .select("role_code")
      .eq("user_id", user.id)
      .is("revoked_at", null);

    if (roleError) {
      console.error("Role check error:", roleError);
      document.body.textContent =
        "Не удалось проверить права доступа.";
      return null;
    }

    const allowedRoles = ["owner", "admin"];
    const userRoles = (roles || []).map(role => role.role_code);

    const hasAccess = userRoles.some(role =>
      allowedRoles.includes(role)
    );

    if (!hasAccess) {
      await client.auth.signOut();
      window.location.replace(loginUrl);
      return null;
    }

    return { user, userRoles };
  }

  const access = await checkAccess();

  if (!access) return;

  // Профиль пользователя
  const profile = document.querySelector(".profile");

  if (profile) {
    const name = profile.querySelector("strong");
    const role = profile.querySelector("small");

    if (name) {
      name.textContent = access.user.email || "Пользователь";
    }

    if (role) {
      role.textContent = access.userRoles
        .map(value => value.toUpperCase())
        .join(" / ");
    }

    const logoutButton = document.createElement("button");
    logoutButton.type = "button";
    logoutButton.textContent = "Выйти";
    logoutButton.className = "logout-button";

    logoutButton.style.marginLeft = "12px";
    logoutButton.style.padding = "8px 12px";
    logoutButton.style.border = "1px solid #ff812e";
    logoutButton.style.borderRadius = "6px";
    logoutButton.style.background = "transparent";
    logoutButton.style.color = "#ff812e";
    logoutButton.style.cursor = "pointer";

    logoutButton.addEventListener("click", async () => {
      logoutButton.disabled = true;
      logoutButton.textContent = "Выход...";

      const { error } = await client.auth.signOut();

      if (error) {
        console.error("Logout error:", error);
        logoutButton.disabled = false;
        logoutButton.textContent = "Выйти";
        alert("Не удалось завершить сеанс. Попробуйте ещё раз.");
        return;
      }

      window.location.replace(loginUrl);
    });

    profile.appendChild(logoutButton);
  }

  // Проверка эффективных разрешений
  const permissionPanel = document.createElement("section");

  permissionPanel.style.margin = "20px";
  permissionPanel.style.padding = "20px";
  permissionPanel.style.background = "#242424";
  permissionPanel.style.border = "1px solid #444";
  permissionPanel.style.borderRadius = "10px";
  permissionPanel.style.color = "#fff";

  permissionPanel.innerHTML = `
    <h3 style="margin-top:0">Проверка системы разрешений</h3>
    <p id="permissionStatus">Проверяем разрешения...</p>
    <div id="permissionDetails"></div>
  `;

  const main = document.querySelector("main");

  if (main) {
    main.prepend(permissionPanel);
  } else {
    document.body.prepend(permissionPanel);
  }

  const permissionStatus =
    permissionPanel.querySelector("#permissionStatus");

  const permissionDetails =
    permissionPanel.querySelector("#permissionDetails");

  const { data: permissions, error: permissionError } =
    await client.rpc("get_my_effective_permissions");

  if (permissionError) {
    permissionStatus.textContent =
      "Ошибка проверки разрешений: " + permissionError.message;

    permissionStatus.style.color = "#ff7373";
  } else {
    const list = permissions || [];

    permissionStatus.textContent =
      `Разрешения загружены: ${list.length}`;

    permissionStatus.style.color = "#72d68b";

    const permissionList = document.createElement("ul");

    permissionList.style.paddingLeft = "20px";
    permissionList.style.maxHeight = "250px";
    permissionList.style.overflowY = "auto";

    list.forEach(permission => {
      const item = document.createElement("li");

      item.textContent =
        `${permission.permission_code} — ${permission.scope}`;

      permissionList.appendChild(item);
    });

    permissionDetails.appendChild(permissionList);
  }

  // Текущая дата
  const dateElement = document.getElementById("currentDate");

  if (dateElement) {
    dateElement.textContent = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());
  }

  // Навигация
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach(item => {
    item.addEventListener("click", () => {
      navItems.forEach(link => link.classList.remove("active"));
      item.classList.add("active");
    });
  });

  // Контроль авторизации
  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      window.location.replace(loginUrl);
    }
  });

  console.info("CONSTRUCTION GROUP ADMIN");
  console.info("Authentication: connected");
  console.info("User:", access.user.email);
  console.info("Roles:", access.userRoles);
});
