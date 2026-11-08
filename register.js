
"use strict";

document.addEventListener("DOMContentLoaded", async () => {
  const $ = id => document.getElementById(id);

  const form = $("registerForm");
  const message = $("registerMessage");
  const button = $("registerButton");
  const buttonText = $("registerButtonText");

  if (!form || !message || !button) return;

  const SUPABASE_URL =
    "https://yepxskcfxyiyqqhmdpve.supabase.co";
  const SUPABASE_KEY =
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

  let selectedRole = "client";
  let activeSession = null;
  let busy = false;

  function showMessage(text, error = false) {
    message.textContent = text;
    message.className = "message visible";
    message.classList.toggle("error", error);
  }

  if (!window.supabase) {
    showMessage("Ошибка загрузки Supabase.", true);
    return;
  }

  const client = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );

  const { data: initialAuth } =
    await client.auth.getSession();

  activeSession = initialAuth?.session || null;

  function isApplicant() {
    return selectedRole === "worker" ||
      selectedRole === "foreman";
  }

  function setBusy(value) {
    busy = value;
    button.disabled = value;

    if (buttonText) {
      buttonText.textContent = value
        ? "ОБРАБАТЫВАЕМ..."
        : activeSession && isApplicant()
          ? "ОТПРАВИТЬ АНКЕТУ"
          : "СОЗДАТЬ АККАУНТ";
    }
  }

  function updateRole() {
    document.querySelectorAll(".account-type")
      .forEach(element => {
        element.classList.toggle(
          "active",
          element.dataset.role === selectedRole
        );
      });

    const titles = {
      client: "Регистрация заказчика",
      worker: "Регистрация работника",
      foreman: "Регистрация бригадира"
    };

    $("registrationTitle").textContent =
      titles[selectedRole];

    $("joinFields").hidden = !isApplicant();
    $("brigadeFields").hidden =
      selectedRole !== "foreman";

    const alreadySignedIn =
      Boolean(activeSession) && isApplicant();

    $("passwordFields").hidden = alreadySignedIn;
    $("password").required = !alreadySignedIn;
    $("passwordConfirm").required = !alreadySignedIn;

    $("brigadeName").required =
      selectedRole === "foreman";

    $("brigadeSize").required =
      selectedRole === "foreman";

    if (alreadySignedIn) {
      $("email").value =
        activeSession.user.email || "";
      $("email").readOnly = true;
    } else {
      $("email").readOnly = false;
    }

    setBusy(false);
  }

  document.querySelectorAll(".account-type")
    .forEach(element => {
      element.addEventListener("click", () => {
        if (busy) return;
        selectedRole = element.dataset.role;
        message.className = "message";
        updateRole();
      });
    });

  function splitSpecializations(value) {
    return value.split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 30);
  }

  function optionalBoolean(value) {
    if (value === "yes") return true;
    if (value === "no") return false;
    return null;
  }

  function createApplication(firstName, lastName, phone) {
    const brigade = selectedRole === "foreman";
    const experience = $("experienceYears").value;

    const membersText = $("brigadeMembers").value.trim();

    // В анкете каждый участник вводится
    // с новой строки: Имя - специализация.
    const members = brigade && membersText
      ? membersText.split("\n")
        .map(line => line.trim())
        .filter(Boolean)
        .slice(0, 200)
        .map(line => {
          const parts = line.split(/\s+-\s+/);
          return {
            fullName: (parts[0] || "").trim(),
            specialization: (parts.slice(1).join(" - ") || "").trim(),
            phone: ""
          };
        })
      : [];

    return {
      fullName: `${firstName} ${lastName}`,
      phone,
      requestedRole: selectedRole,
      cooperationType: brigade
        ? "own_brigade"
        : "individual",

      experienceYears: experience === ""
        ? null
        : Number(experience),

      specialization: splitSpecializations(
        $("specialization").value
      ),

      brigadeName: brigade
        ? $("brigadeName").value.trim()
        : "",

      brigadeSize: brigade
        ? Number($("brigadeSize").value)
        : null,

      brigadeSpecializations: brigade
        ? splitSpecializations(
            $("brigadeSpecializations").value
          )
        : [],

      brigadeHasTools: brigade
        ? optionalBoolean($("brigadeHasTools").value)
        : null,

      brigadeHasTransport: brigade
        ? optionalBoolean($("brigadeHasTransport").value)
        : null,

      brigadeMembers: members,
      additionalInfo: $("additionalInfo").value.trim()
    };
  }

  async function submitApplication(session, application) {
    const response = await fetch(
      "/api/company-join-request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify(application)
      }
    );

    const raw = await response.text();
    let result;

    try {
      result = JSON.parse(raw);
    } catch {
      throw new Error(
        "API анкеты недоступен. Проверьте папку api."
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.error ||
        "Не удалось отправить анкету."
      );
    }

    return result;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;

    const firstName = $("firstName").value.trim();
    const lastName = $("lastName").value.trim();
    const phone = $("phone").value.trim();
    const email = $("email").value.trim();
    const password = $("password").value;
    const confirmation = $("passwordConfirm").value;
    const agreement = $("agreement").checked;

    if (!firstName || !lastName || !phone || !email) {
      showMessage("Заполните обязательные поля.", true);
      return;
    }

    if (!agreement) {
      showMessage("Примите условия регистрации.", true);
      return;
    }

    if (selectedRole === "foreman") {
      const size = Number($("brigadeSize").value);

      if (!$("brigadeName").value.trim() ||
          !Number.isInteger(size) ||
          size < 1 || size > 200) {
        showMessage(
          "Введите название бригады и количество работников.",
          true
        );
        return;
      }
    }

    const useExistingSession =
      activeSession && isApplicant();

    if (!useExistingSession) {
      if (password.length < 8) {
        showMessage("Пароль: минимум 8 символов.", true);
        return;
      }

      if (password !== confirmation) {
        showMessage("Пароли не совпадают.", true);
        return;
      }
    }

    setBusy(true);

    try {
      const application = isApplicant()
        ? createApplication(firstName, lastName, phone)
        : null;

      let session = useExistingSession
        ? activeSession
        : null;

      if (!session) {
        if (activeSession) {
          throw new Error(
            "Вы уже вошли в аккаунт. Выйдите из него для новой регистрации."
          );
        }

        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              window.location.origin + "/login.html",
            data: {
              first_name: firstName,
              last_name: lastName,
              full_name: `${firstName} ${lastName}`,
              phone
            }
          }
        });

        if (error) throw error;
        if (!data.user) {
          throw new Error("Аккаунт не создан.");
        }

        session = data.session || null;
      }

      if (!isApplicant()) {
        if (session) await client.auth.signOut();

        form.reset();

        showMessage(session
          ? "Аккаунт заказчика создан! Теперь войдите."
          : "Аккаунт создан! Подтвердите email, затем войдите."
        );

        activeSession = null;
        updateRole();
        return;
      }

      if (!session) {
        showMessage(
          "Аккаунт создан. Сначала подтвердите email и войдите. " +
          "Затем вернитесь на страницу регистрации, выберите " +
          "«Работник» или «Бригадир» и отправьте анкету."
        );
        return;
      }

      // Кандидат получает только заявку.
      // Назначения рабочих ролей здесь нет.
      await submitApplication(session, application);

      showMessage(
        "Анкета отправлена владельцу CONSTRUCTION GROUP! " +
        "Ожидайте рассмотрения заявки."
      );

      activeSession = session;
      updateRole();

    } catch (error) {
      console.error("Registration error:", error);

      const details = error.message ||
        "Ошибка регистрации или отправки анкеты.";

      if (/already registered|already exists/i.test(details)) {
        showMessage(
          "Этот email уже зарегистрирован. Войдите в аккаунт.",
          true
        );
      } else {
        showMessage(details, true);
      }
    } finally {
      setBusy(false);
    }
  });

  updateRole();
});
