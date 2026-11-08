
"use strict";

/*
 CONSTRUCTION GROUP — PREMIUM LANDING
 Подключать после script.js.
 Существующие заявки, калькулятор и авторизация
 продолжают работать.
*/

window.addEventListener("DOMContentLoaded", () => {
 // Подключаем стили напрямую
const premiumCSS = document.createElement("link");
premiumCSS.rel = "stylesheet";
premiumCSS.href = "/landing-premium.css?v=5";
document.head.appendChild(premiumCSS);
  const home = document.getElementById("homePage");

  if (!home || document.getElementById("cgLanding")) return;

  const logo = `
    <svg class="lg-logo" viewBox="0 0 120 120"
         role="img" aria-label="CONSTRUCTION GROUP">
      <defs>
        <linearGradient id="lgSilver"
          x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffffff"/>
          <stop offset=".32" stop-color="#a9bacb"/>
          <stop offset=".60" stop-color="#f2f7ff"/>
          <stop offset="1" stop-color="#677b90"/>
        </linearGradient>
        <linearGradient id="lgBlue"
          x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#b2eaff"/>
          <stop offset=".54" stop-color="#258bdb"/>
          <stop offset="1" stop-color="#0a3d73"/>
        </linearGradient>
      </defs>
      <path d="M60 7 112 105H8Z"
        fill="none" stroke="url(#lgBlue)"
        stroke-width="4.5"/>
      <path
        d="M86 32H49L29 53V76L49 96H86V78H56L47 69V59L56 50H86Z"
        fill="url(#lgSilver)"
        stroke="#c9d4df"
        stroke-width=".7"/>
      <path d="M86 78H65L77 96H94Z"
        fill="url(#lgBlue)"/>
    </svg>
  `;

  const icons = {
    helmet: `
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.7">
        <path d="M3 17h18M5 17v-4a7 7 0 0 1 14 0v4
          M9 6v7m6-7v7M7 20h10"/>
      </svg>
    `,
    tools: `
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.7">
        <path d="m4 20 7-7m2-2 7-7-3-1-3 3-2-2
          3-3a6 6 0 0 0-6 8L3 15l6 6 6-6-2-2Z"/>
      </svg>
    `,
    hand: `
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.7">
        <path d="m2 10 4-4 5 2 4-2 7 5-4 5
          -3 3-3-2-2 1-2-3-2 1-4-6Z"/>
        <path d="m10 10 3 3 4-1M6 6l2 2"/>
      </svg>
    `,
    calc: `
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.7">
        <rect x="5" y="2" width="14" height="20" rx="1"/>
        <path d="M8 6h8M8 11h2m4 0h2M8 15h2m4 0h2
          M8 19h2m4 0h2"/>
      </svg>
    `,
    list: `
      <svg viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.7">
        <path d="M6 2h9l4 4v16H6zM15 2v5h4
          M9 11h7m-7 4h7m-7 4h5"/>
      </svg>
    `
  };

  home.insertAdjacentHTML("afterbegin", `
    <div id="cgLanding">
      <div class="lg-stage">
        <div class="lg-container">

          <header class="lg-header">
            <a class="lg-brand" href="/">
              ${logo}
              <span class="lg-brand-name">
                <strong>CONSTRUCTION</strong>
                <b>GROUP</b>
              </span>
            </a>

            <nav class="lg-nav" id="lgNav"
                 aria-label="Навигация">
              <button class="lg-nav-link"
                data-lg-action="top">Главная</button>
              <button class="lg-nav-link"
                data-lg-action="calculator">Услуги</button>
              <button class="lg-nav-link"
                data-lg-action="price">Прайс-лист</button>
              <button class="lg-nav-link"
                data-lg-action="about">О компании</button>
              <button class="lg-nav-link"
                data-lg-action="contact">Контакты</button>
            </nav>

            <div class="lg-header-right">
              <a class="lg-header-login" href="/login.html">
                Вход <span>↗</span>
              </a>
              <a class="lg-header-register"
                 href="/register.html">
                Регистрация <span>↗</span>
              </a>
              <button class="lg-menu-toggle"
                id="lgMenuToggle"
                aria-label="Открыть меню"
                aria-expanded="false"
                aria-controls="lgNav">☰</button>
            </div>
          </header>

          <main class="lg-main">
            <div class="lg-kicker">
              <span class="lg-slash"></span>
              СТРОИТЕЛЬНАЯ ПЛАТФОРМА · WARSZAWA
            </div>

            <h1 class="lg-headline">
              ПРОСТРАНСТВО<br>
              НАЧИНАЕТСЯ <em>С НАС.</em>
            </h1>

            <div class="lg-rule"></div>

            <section class="lg-intro">
              <h2>
                ПОСТРОЕННАЯ СИСТЕМА<br>
                ДЛЯ СТРОИТЕЛЬНОГО БИЗНЕСА
              </h2>
              <p>
                Помогаем организовать работу компании
                и бригады, контролировать расходы,
                доходы и результаты.
                Вся динамика бизнеса — в одной системе,
                где видно, на что уходят деньги
                и как движется каждый объект.
              </p>
            </section>

            <h2 class="lg-role-heading">
              ЕСЛИ ТЫ ОДИН ИЗ ИСПОЛНИТЕЛЕЙ —
              <span>ТЕБЯ ЖДЁТ:</span>
            </h2>

            <div class="lg-roles">
              <a class="lg-role" href="/register.html">
                <span class="lg-role-icon">
                  ${icons.helmet}
                </span>
                <span>
                  <strong>БРИГАДИР</strong>
                  <small>
                    Сбор команды, поиск помощников,
                    задачи, табели и контроль выплат.
                  </small>
                </span>
                <span class="lg-arrow">↗</span>
              </a>

              <a class="lg-role" href="/register.html">
                <span class="lg-role-icon">
                  ${icons.tools}
                </span>
                <span>
                  <strong>ИСПОЛНИТЕЛЬ</strong>
                  <small>
                    Поиск бригады, рабочие задания,
                    учёт часов и история заработка.
                  </small>
                </span>
                <span class="lg-arrow">↗</span>
              </a>

              <a class="lg-role" href="/register.html">
                <span class="lg-role-icon">
                  ${icons.hand}
                </span>
                <span>
                  <strong>ЗАКАЗЧИК</strong>
                  <small>
                    Поиск исполнителя, предварительная
                    смета и контроль выполнения.
                  </small>
                </span>
                <span class="lg-arrow">↗</span>
              </a>
            </div>

            <div class="lg-benefits">
              <span>◆ УЧЁТ ФИНАНСОВ</span>
              <span>◆ РАСХОДЫ И ДОХОДЫ</span>
              <span>◆ ПЛАНИРОВАНИЕ РАБОТ</span>
              <span>◆ ПРОЗРАЧНАЯ ОТЧЁТНОСТЬ</span>
            </div>

            <div class="lg-cta-group">
              <button class="lg-cta lg-cta-main"
                data-lg-action="calculator">
                <span class="lg-cta-icon">
                  ${icons.calc}
                </span>
                <span>
                  <strong>ЗАКАЗАТЬ УСЛУГУ</strong>
                  <small>
                    Калькулятор стоимости + заявка
                  </small>
                </span>
                <span class="lg-cta-arrow">↗</span>
              </button>

              <button class="lg-cta lg-cta-outline"
                data-lg-action="price">
                <span class="lg-cta-icon">
                  ${icons.list}
                </span>
                <span>
                  <strong>ПРАЙС-ЛИСТ</strong>
                  <small>
                    Перечень услуг и ориентировочные цены
                  </small>
                </span>
                <span class="lg-cta-arrow">↗</span>
              </button>
            </div>
          </main>

          <footer class="lg-footer" id="lgContacts">
            <span>
              © <span id="lgYear">2026</span>
              CONSTRUCTION GROUP.
              Все права защищены.
            </span>
            <span>WARSZAWA, POLSKA</span>
            <a href="/login.html">
              Личный кабинет ↗
            </a>
          </footer>

        </div>
      </div>

      <section class="lg-about" id="lgAbout">
        <div class="lg-about-inner">
          <div>
            <span class="lg-overline">
              01 / О КОМПАНИИ
            </span>
            <h2>
              СТРОИТЕЛЬСТВО.<br>
              <span>ПОД КОНТРОЛЕМ.</span>
            </h2>
          </div>

          <div>
            <p>
              CONSTRUCTION GROUP объединяет заказчиков,
              бригадиров и исполнителей.
              От первого расчёта до завершения работы —
              задачи, часы, фотографии и финансовая
              динамика в одном цифровом пространстве.
            </p>
            <button class="lg-text-action"
              data-lg-action="calculator">
              Рассчитать проект ↗
            </button>
          </div>
        </div>
      </section>
    </div>

    <dialog class="lg-price-dialog"
            id="lgPriceDialog"
            aria-labelledby="lgPriceTitle">
      <div class="lg-price-head">
        <div>
          <span class="lg-overline">
            CONSTRUCTION GROUP / CATALOG
          </span>
          <h2 id="lgPriceTitle">ПРАЙС-ЛИСТ</h2>
          <p>
            Цены из действующего калькулятора.
            Предварительный расчёт, не окончательная
            стоимость договора.
          </p>
        </div>
        <button class="lg-close" id="lgPriceClose"
          aria-label="Закрыть">×</button>
      </div>

      <div id="lgPriceContent"
           class="lg-price-content"></div>

      <button class="lg-price-order" id="lgPriceOrder">
        Рассчитать и заказать услугу ↗
      </button>
    </dialog>
  `);

  document.getElementById("lgYear").textContent =
    String(new Date().getFullYear());

  const nav = document.getElementById("lgNav");
  const toggle = document.getElementById("lgMenuToggle");
  const dialog = document.getElementById("lgPriceDialog");

  function setNavOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute(
      "aria-expanded", String(open)
    );
  }

  toggle.addEventListener("click", () => {
    setNavOpen(!nav.classList.contains("is-open"));
  });

  // Открывает СУЩЕСТВУЮЩИЙ калькулятор.
  // Расчёт потом переходит в существующую заявку.
  function showCalculator() {
    const original = home.querySelector(
      '.home-card[data-page="calculatorPage"]'
    );

    if (original) {
      original.click();
    } else {
      console.error("Калькулятор не найден");
    }
  }

  // Берём реальные позиции из script.js.
  // Вторую независимую базу цен не создаём.
  function renderPriceList() {
    const root = document.getElementById(
      "lgPriceContent"
    );
    root.replaceChildren();

    const catalog =
      typeof services !== "undefined" &&
      Array.isArray(services)
        ? services
        : [];

    if (!catalog.length) {
      root.textContent =
        "Каталог цен не загрузился. " +
        "Откройте калькулятор услуг.";
      return;
    }

    const siteLang =
      document.getElementById("languageSelect")
        ?.value === "uk"
        ? "uk"
        : "pl";

    for (const group of ["demo", "reno"]) {
      const title = document.createElement("h3");

      title.textContent = group === "demo"
        ? "Демонтаж"
        : "Ремонт и монтаж";

      root.append(title);

      for (const service of catalog.filter(
        item => item.group === group
      )) {
        const line = document.createElement("div");
        line.className = "lg-price-row";

        const name = document.createElement("span");
        name.textContent =
          service.name?.[siteLang] || "Услуга";

        const price = document.createElement("strong");

        const unit = {
          m2: "м²",
          lm: "пог. м",
          pc: "шт.",
          service: "усл."
        }[service.unit] || service.unit || "ед.";

        price.textContent =
          new Intl.NumberFormat("pl-PL")
            .format(service.price) +
          " zł / " + unit;

        line.append(name, price);
        root.append(line);
      }
    }
  }

  function openPriceList() {
    renderPriceList();
    if (!dialog.open) dialog.showModal();
  }

  function action(name) {
    setNavOpen(false);

    if (name === "calculator") {
      showCalculator();
      return;
    }

    if (name === "price") {
      openPriceList();
      return;
    }

    if (name === "top") {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
      return;
    }

    const target = name === "about"
      ? document.getElementById("lgAbout")
      : document.getElementById("lgContacts");

    target?.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }

  document.querySelectorAll(
    "#cgLanding [data-lg-action]"
  ).forEach(button => {
    button.addEventListener("click", () => {
      action(button.dataset.lgAction);
    });
  });

  document.getElementById("lgPriceClose")
    .addEventListener("click", () => dialog.close());

  document.getElementById("lgPriceOrder")
    .addEventListener("click", () => {
      dialog.close();
      showCalculator();
    });

  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  // Скрываем старую шапку только на главной.
  // В калькуляторе и заявке она остаётся доступной.
  function syncPage() {
    document.body.classList.toggle(
      "cg-home-view",
      home.classList.contains("active")
    );
  }

  syncPage();

  new MutationObserver(syncPage).observe(home, {
    attributes: true,
    attributeFilter: ["class"]
  });
});
