
"use strict";

/* CONSTRUCTION GROUP — PREMIUM LANDING v6
   Подключать ПОСЛЕ script.js. Не меняет калькулятор и заявки. */

window.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector('link[href*="landing-premium.css?v=6"]')) {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/landing-premium.css?v=6";
    document.head.appendChild(css);
  }

  const home = document.getElementById("homePage");
  if (!home || document.getElementById("cgLanding")) return;

  const logo = `
    <svg class="lg-logo" viewBox="0 0 120 120" role="img" aria-label="Логотип CONSTRUCTION GROUP">
      <defs>
        <linearGradient id="lgSilver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff"/>
          <stop offset=".32" stop-color="#a9bacb"/>
          <stop offset=".60" stop-color="#f2f7ff"/>
          <stop offset="1" stop-color="#677b90"/>
        </linearGradient>
        <linearGradient id="lgBlue" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#b2eaff"/>
          <stop offset=".54" stop-color="#258bdb"/>
          <stop offset="1" stop-color="#0a3d73"/>
        </linearGradient>
      </defs>
      <path d="M60 7 112 105H8Z" fill="none" stroke="url(#lgBlue)" stroke-width="4.5"/>
      <path d="M86 32H49L29 53V76L49 96H86V78H56L47 69V59L56 50H86Z"
            fill="url(#lgSilver)" stroke="#c9d4df" stroke-width=".7"/>
      <path d="M86 78H65L77 96H94Z" fill="url(#lgBlue)"/>
    </svg>`;

  const icons = {
    customer: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></svg>`,
    foreman: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17h18M5 17v-4a7 7 0 0 1 14 0v4M9 6v7m6-7v7M7 20h10"/></svg>`,
    worker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 6a5 5 0 0 0-6 6l-5 5 4 4 5-5a5 5 0 0 0 6-6l-3 3-4-4 3-3Z"/></svg>`
  };

  // Добавь реальные адреса соцсетей сюда, когда они будут готовы.
  const socialLinks = {
    telegram: "",
    instagram: "",
    facebook: ""
  };
  const socialNames = { telegram: "Telegram", instagram: "Instagram", facebook: "Facebook" };
  const socialMarkup = Object.entries(socialLinks)
    .filter(([, url]) => /^https:\/\//i.test(url))
    .map(([key, url]) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${socialNames[key]} ↗</a>`)
    .join("");

  home.insertAdjacentHTML("afterbegin", `
    <div id="cgLanding">
      <div class="lg-stage" id="lgTop">
        <div class="lg-container">
          <header class="lg-header">
            <a class="lg-brand" href="/" aria-label="CONSTRUCTION GROUP — главная">
              ${logo}
              <span class="lg-brand-name"><strong>CONSTRUCTION</strong><b>GROUP</b></span>
            </a>
            <nav class="lg-nav" id="lgNav" aria-label="Основная навигация">
              <button type="button" class="lg-nav-link" data-lg-action="top">Главная</button>
              <button type="button" class="lg-nav-link" data-lg-action="calculator">Услуги</button>
              <button type="button" class="lg-nav-link" data-lg-action="price">Прайс-лист</button>
              <button type="button" class="lg-nav-link" data-lg-action="about">О компании</button>
              <button type="button" class="lg-nav-link" data-lg-action="contact">Контакты</button>
            </nav>
            <button type="button" class="lg-menu-toggle" id="lgMenuToggle"
                    aria-label="Открыть меню" aria-expanded="false" aria-controls="lgNav">☰</button>
          </header>

          <main class="lg-main">
            <div class="lg-hero-layout">
              <section class="lg-intro" aria-labelledby="lgIntroTitle">
                <span class="lg-eyebrow"><span class="lg-dot"></span> ЦИФРОВАЯ СТРОИТЕЛЬНАЯ ПЛАТФОРМА · WARSZAWA</span>
                <h1 id="lgIntroTitle">Строительные проекты.<br><em>Под контролем.</em></h1>
                <p class="lg-lead">CONSTRUCTION GROUP объединяет заказчиков, бригадиров и работников в одной системе.</p>
                <p>Заказчику помогаем найти исполнителей, оформить заявку и следить за ходом работ.</p>
                <p>Бригадиру — управлять командой и объектами, вести учёт времени, расходов и выплат.</p>
                <p>Работнику — присоединиться к бригаде, получать задания, сдавать отчёты и видеть свой заработок.</p>
              </section>

              <section class="lg-centerpiece" aria-label="Вход в платформу">
                <div class="lg-logo-halo">${logo}</div>
                <div class="lg-center-name">CONSTRUCTION <span>GROUP</span></div>
                <p>СТРОИТЕЛЬСТВО · КОМАНДА · КОНТРОЛЬ</p>
                <div class="lg-auth">
                  <a class="lg-btn lg-btn-secondary" href="/login.html">Войти <span aria-hidden="true">↗</span></a>
                  <a class="lg-btn lg-btn-primary" href="/register.html">Регистрация <span aria-hidden="true">↗</span></a>
                </div>
              </section>
            </div>

            <section class="lg-start" aria-labelledby="lgStartTitle">
              <div class="lg-start-heading">
                <div>
                  <span class="lg-eyebrow">ТВОЙ ПЕРВЫЙ ШАГ</span>
                  <h2 id="lgStartTitle">Начни с выбора <em>своей роли</em></h2>
                </div>
                <span class="lg-start-hint">Выбери, как хочешь работать с платформой</span>
              </div>
              <div class="lg-roles">
                <a class="lg-role" href="/register.html?role=client">
                  <span class="lg-role-icon">${icons.customer}</span>
                  <span class="lg-role-copy"><strong>ЗАКАЗЧИК</strong><small>Заявки, сметы, этапы работ и фотоотчёты</small></span>
                  <span class="lg-role-arrow" aria-hidden="true">↗</span>
                </a>
                <a class="lg-role" href="/register.html?role=foreman">
                  <span class="lg-role-icon">${icons.foreman}</span>
                  <span class="lg-role-copy"><strong>БРИГАДИР</strong><small>Команда, объекты, табели, расходы и выплаты</small></span>
                  <span class="lg-role-arrow" aria-hidden="true">↗</span>
                </a>
                <a class="lg-role" href="/register.html?role=worker">
                  <span class="lg-role-icon">${icons.worker}</span>
                  <span class="lg-role-copy"><strong>РАБОТНИК</strong><small>Задания, отчёты, рабочие часы и заработок</small></span>
                  <span class="lg-role-arrow" aria-hidden="true">↗</span>
                </a>
              </div>
            </section>
          </main>

          <footer class="lg-footer" id="lgContacts">
            <div class="lg-footer-social">
              <span>МЫ В СОЦСЕТЯХ</span>
              ${socialMarkup || `<span class="lg-social-pending">Telegram · Instagram · Facebook</span>`}
            </div>
            <span>© <span id="lgYear"></span> CONSTRUCTION GROUP · Все права защищены</span>
            <span>WARSZAWA, POLSKA</span>
          </footer>
        </div>
      </div>

      <section class="lg-about" id="lgAbout">
        <div class="lg-about-inner">
          <div><span class="lg-eyebrow">О ПЛАТФОРМЕ</span><h2>Одна система.<br><em>Все этапы работы.</em></h2></div>
          <div><p>От первой заявки до закрытия объекта: задачи, рабочие часы, отчёты и финансовая информация — в удобных кабинетах участников.</p>
            <button type="button" class="lg-about-action" data-lg-action="calculator">Посмотреть услуги ↗</button>
          </div>
        </div>
      </section>
    </div>

    <dialog class="lg-price-dialog" id="lgPriceDialog" aria-labelledby="lgPriceTitle">
      <div class="lg-price-head">
        <div><span class="lg-eyebrow">CONSTRUCTION GROUP / CATALOG</span><h2 id="lgPriceTitle">Прайс-лист</h2>
          <p>Ориентировочные цены из действующего калькулятора. Итоговая стоимость уточняется после осмотра объекта.</p></div>
        <button type="button" class="lg-close" id="lgPriceClose" aria-label="Закрыть">×</button>
      </div>
      <div id="lgPriceContent" class="lg-price-content"></div>
      <button type="button" class="lg-price-order" id="lgPriceOrder">Рассчитать и заказать услугу ↗</button>
    </dialog>
  `);

  document.getElementById("lgYear").textContent = String(new Date().getFullYear());
  const nav = document.getElementById("lgNav");
  const toggle = document.getElementById("lgMenuToggle");
  const dialog = document.getElementById("lgPriceDialog");

  function setNavOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  }
  toggle.addEventListener("click", () => setNavOpen(!nav.classList.contains("is-open")));

  function showCalculator() {
    const original = home.querySelector('.home-card[data-page="calculatorPage"]')
      || document.querySelector('[data-page="calculatorPage"]');
    if (original) original.click();
    else if (typeof showPage === "function") showPage("calculatorPage");
    else console.error("CONSTRUCTION: переход к калькулятору не найден");
  }

  function renderPriceList() {
    const root = document.getElementById("lgPriceContent");
    root.replaceChildren();
    const catalog = typeof services !== "undefined" && Array.isArray(services) ? services : [];
    if (!catalog.length) {
      root.textContent = "Каталог пока недоступен. Откройте калькулятор услуг.";
      return;
    }
    const lang = document.getElementById("languageSelect")?.value === "uk" ? "uk" : "pl";
    for (const [group, title] of [["demo", "Демонтаж"], ["reno", "Ремонт и монтаж"]]) {
      const heading = document.createElement("h3");
      heading.textContent = title;
      root.append(heading);
      for (const service of catalog.filter(item => item.group === group)) {
        const line = document.createElement("div");
        line.className = "lg-price-row";
        const name = document.createElement("span");
        name.textContent = service.name?.[lang] || "Услуга";
        const price = document.createElement("strong");
        const unit = { m2: "м²", lm: "пог. м", pc: "шт.", service: "усл." }[service.unit] || "ед.";
        price.textContent = `${new Intl.NumberFormat("pl-PL").format(service.price)} zł / ${unit}`;
        line.append(name, price);
        root.append(line);
      }
    }
  }

  function action(name) {
    setNavOpen(false);
    if (name === "calculator") return showCalculator();
    if (name === "price") {
      renderPriceList();
      if (!dialog.open) dialog.showModal();
      return;
    }
    const target = name === "top" ? document.getElementById("lgTop")
      : name === "about" ? document.getElementById("lgAbout")
      : document.getElementById("lgContacts");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  document.querySelectorAll("#cgLanding [data-lg-action]").forEach(button => {
    button.addEventListener("click", () => action(button.dataset.lgAction));
  });
  document.getElementById("lgPriceClose").addEventListener("click", () => dialog.close());
  document.getElementById("lgPriceOrder").addEventListener("click", () => {
    dialog.close();
    showCalculator();
  });
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  function syncPage() {
    document.body.classList.toggle("cg-home-view", home.classList.contains("active"));
  }
  syncPage();
  new MutationObserver(syncPage).observe(home, { attributes: true, attributeFilter: ["class"] });
});
