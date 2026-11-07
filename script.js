
const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand();
}

// ==========================================
// SUPABASE — АВТОРИЗАЦИЯ ЗАКАЗЧИКА
// ==========================================

const SUPABASE_URL =
  "https://yepxskcfxyiyqqhmdpve.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";

let supabaseLibraryPromise = null;
let supabaseClient = null;

async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  if (!window.supabase) {
    if (!supabaseLibraryPromise) {
      supabaseLibraryPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src =
          "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

        script.onload = resolve;
        script.onerror = () => reject(
          new Error("Не удалось загрузить библиотеку Supabase")
        );

        document.head.appendChild(script);
      });
    }

    await supabaseLibraryPromise;
  }

  if (!window.supabase?.createClient) {
    throw new Error("Библиотека Supabase недоступна");
  }

  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return supabaseClient;
}

const translations = {
  pl: {
    heroTag: "DEMONTAŻ • REMONT • PRZYGOTOWANIE",
    heroTitle: 'Twój obiekt.<br><span>Nasza praca.</span>',
    heroText: "Prace demontażowe, remontowe i przygotowanie pomieszczeń w Warszawie.",
    about: "Kim jesteśmy",
    aboutShort: "Poznaj naszą firmę",
    calculator: "Kalkulator cen",
    calculatorShort: "Wstępna wycena prac",
    submitRequest: "Złóż zgłoszenie",
    submitShort: "Opowiedz nam o swoim obiekcie",
    back: "Powrót",
    aboutHeading: "Pracujemy konkretnie.",
    aboutPlaceholder: "Tutaj dodamy opis firmy, doświadczenie i informacje o zespole.",
    calculatorHeading: "Zbuduj swoją wycenę.",
    calculatorIntro: "Wybierz zakres prac, podaj ilości i zobacz wstępny koszt.",
    modeDemo: "Demontaż",
    modeDemoDesc: "Prace rozbiórkowe",
    modeReno: "Remont / Montaż",
    modeRenoDesc: "Prace remontowe i montażowe",
    modeBoth: "Demontaż + Montaż",
    modeBothDesc: "Kompleksowy zakres prac",
    chooseWorks: "WYBIERZ PRACE",
    workList: "Lista usług",
    testPrices: "CENY TESTOWE",
    yourEstimate: "TWOJA WYCENA",
    summary: "Podsumowanie",
    empty: "Nie wybrano jeszcze żadnych prac.",
    estimatedTotal: "Szacunkowa suma",
    delivery: "Dostawa / transport",
    ourDelivery: "Nasza dostawa / transport",
    clientDelivery: "Własna dostawa / transport",
    tools: "Narzędzia",
    ourTools: "Nasz sprzęt",
    clientTools: "Własny sprzęt",
    clientType: "Kto zleca pracę?",
    ownerDirect: "Bezpośrednio od właściciela nieruchomości",
    estimateNote: "To wstępna wycena. Ostateczna cena może zostać ustalona po obejrzeniu obiektu.",
    sendEstimate: "Przejdź do zgłoszenia",
    formHeading: "Złóż zgłoszenie.",
    formIntro: "Wypełnij formularz krok po kroku. Skontaktujemy się z Tobą, aby omówić szczegóły.",
    stepContact: "Kontakt",
    stepWork: "Praca i opis",
    stepExtras: "Dodatkowe usługi",
    contactDetails: "Dane kontaktowe",
    fullName: "Imię i nazwisko *",
    phone: "Numer telefonu *",
    shareContact: "Udostępnij kontakt w Telegramie",
    city: "Miasto *",
    street: "Ulica *",
    building: "Numer budynku *",
    apartment: "Numer mieszkania (opcjonalnie)",
    addressHint: "Podaj miasto, ulicę i numer budynku. Numer mieszkania możemy ustalić później.",
    workDescription: "Zakres prac i opis",
    description: "Opis zlecenia *",
    objectType: "Rodzaj obiektu",
    area: "Powierzchnia (m²)",
    condition: "Stan obiektu",
    startDate: "Kiedy rozpocząć?",
    photos: "Zdjęcia obiektu (opcjonalnie)",
    photosHint: "Dodaj dowolną liczbę zdjęć. Przed wysłaniem zobaczysz podgląd i będziesz mógł usunąć wybrane fotografie.",
    extraServices: "Dodatkowe usługi",
    extrasIntro: "Zaznacz usługi, których potrzebujesz. Duże ilości i nietypowe warunki wyceniamy indywidualnie.",
    wasteTitle: "Wynoszenie i odpady budowlane",
    wasteCarry: "Wynoszenie gruzu i odpadów budowlanych",
    wasteAmount: "Szacunkowa ilość",
    floor: "Piętro",
    elevator: "W budynku jest winda",
    containerLoad: "Załadunek kontenera (1 szt.)",
    bagging: "Zbieranie i pakowanie odpadów do worków",
    cleaningTitle: "Sprzątanie po pracach",
    cleanLight: "Lekkie sprzątanie",
    cleanStandard: "Standardowe sprzątanie",
    cleanDeep: "Generalne sprzątanie",
    transportTitle: "Dostawa i przenoszenie",
    materialDelivery: "Dostawa materiałów budowlanych (według gabarytów i odległości)",
    unload: "Rozładunek materiałów",
    carryUp: "Wniesienie materiałów na piętro",
    furnitureCarry: "Wynoszenie / wywóz starych mebli",
    otherTitle: "Pozostałe",
    protect: "Zabezpieczenie podłóg, ścian, drzwi lub windy — wycena indywidualna",
    carefulFurniture: "Demontaż mebli z zachowaniem elementów",
    floorNumber: "Piętro obiektu",
    elevatorAccess: "Dostęp do windy",
    extraComment: "Dodatkowe informacje",
    individualNote: "W przypadku większych ilości odpadów, materiałów lub gabarytów koszt wynoszenia, wnoszenia, załadunku i transportu może być ustalany indywidualnie po uzgodnieniu szczegółów.",
    previous: "Wstecz",
    next: "Dalej",
    submitNow: "Wyślij zgłoszenie",
    privacyNote: "Wysyłając formularz, wyrażasz zgodę na kontakt w sprawie zgłoszenia. Politykę prywatności dodamy przed uruchomieniem formularza.",
    footerDescription: "Firma zajmująca się pracami demontażowymi, montażowymi i remontowymi.",
    copyright: "© 2026 CONSTRUCTION. Wszelkie prawa zastrzeżone.",
    agreement: "Regulamin",
    deal: "Jak przebiega współpraca",
    guarantees: "Gwarancje",
    noEstimate: "Wartość do ustalenia",
    noWorks: "Nie wybrano prac z kalkulatora.",
    required: "Uzupełnij wymagane pola, aby przejść dalej.",
    demoSubmit: "Formularz jest gotowy.",
    photoLimit: "Nie udało się dodać tego pliku.",
    telegramOnly: "Udostępnianie kontaktu działa po otwarciu aplikacji w Telegramie."
  },

  uk: {
    heroTag: "ДЕМОНТАЖ • РЕМОНТ • ПІДГОТОВКА",
    heroTitle: 'Ваш об’єкт.<br><span>Наша робота.</span>',
    heroText: "Демонтажні, ремонтні роботи та підготовка приміщень у Варшаві.",
    about: "Хто ми",
    aboutShort: "Познайомтеся з нашою компанією",
    calculator: "Калькулятор цін",
    calculatorShort: "Попередній розрахунок робіт",
    submitRequest: "Подати заявку",
    submitShort: "Розкажіть нам про ваш об’єкт",
    back: "Назад",
    aboutHeading: "Працюємо конкретно.",
    aboutPlaceholder: "Тут додамо опис компанії, досвід та інформацію про команду.",
    calculatorHeading: "Сформуйте свій кошторис.",
    calculatorIntro: "Оберіть роботи, вкажіть кількість та побачте попередню вартість.",
    modeDemo: "Демонтаж",
    modeDemoDesc: "Демонтажні роботи",
    modeReno: "Ремонт / Монтаж",
    modeRenoDesc: "Ремонтні та монтажні роботи",
    modeBoth: "Демонтаж + Монтаж",
    modeBothDesc: "Комплекс робіт",
    chooseWorks: "ОБЕРІТЬ РОБОТИ",
    workList: "Список послуг",
    testPrices: "ТЕСТОВІ ЦІНИ",
    yourEstimate: "ВАШ РОЗРАХУНОК",
    summary: "Підсумок",
    empty: "Ви ще не обрали жодної роботи.",
    estimatedTotal: "Попередня сума",
    delivery: "Доставка / транспортування",
    ourDelivery: "Наша доставка / транспорт",
    clientDelivery: "Ваша доставка / транспорт",
    tools: "Інструменти",
    ourTools: "Наш інструмент",
    clientTools: "Ваш інструмент",
    clientType: "Хто замовляє роботу?",
    ownerDirect: "Безпосередньо від власника нерухомості",
    estimateNote: "Це попередній розрахунок. Остаточну ціну можна визначити після огляду об’єкта.",
    sendEstimate: "Перейти до заявки",
    formHeading: "Подати заявку.",
    formIntro: "Заповніть форму крок за кроком. Ми зв’яжемося з вами, щоб обговорити деталі.",
    stepContact: "Контакт",
    stepWork: "Робота й опис",
    stepExtras: "Додаткові послуги",
    contactDetails: "Контактні дані",
    fullName: "Ім’я та прізвище *",
    phone: "Номер телефону *",
    shareContact: "Поділитися контактом у Telegram",
    city: "Місто *",
    street: "Вулиця *",
    building: "Номер будинку *",
    apartment: "Номер квартири (необов’язково)",
    addressHint: "Вкажіть місто, вулицю та номер будинку. Номер квартири можна уточнити пізніше.",
    workDescription: "Обсяг робіт та опис",
    description: "Опис замовлення *",
    objectType: "Тип об’єкта",
    area: "Площа (м²)",
    condition: "Стан об’єкта",
    startDate: "Коли розпочати?",
    photos: "Фотографії об’єкта (необов’язково)",
    photosHint: "Додайте потрібну кількість фотографій. Перед відправленням побачите попередній перегляд і зможете видалити фото.",
    extraServices: "Додаткові послуги",
    extrasIntro: "Позначте потрібні послуги. Великі обсяги та нестандартні умови оцінюємо індивідуально.",
    wasteTitle: "Винесення та будівельні відходи",
    wasteCarry: "Винесення будівельного сміття",
    wasteAmount: "Приблизна кількість",
    floor: "Поверх",
    elevator: "У будинку є ліфт",
    containerLoad: "Завантаження контейнера (1 шт.)",
    bagging: "Збір та пакування сміття в мішки",
    cleaningTitle: "Прибирання після робіт",
    cleanLight: "Легке прибирання",
    cleanStandard: "Стандартне прибирання",
    cleanDeep: "Генеральне прибирання",
    transportTitle: "Доставка та перенесення",
    materialDelivery: "Доставка будівельних матеріалів (за габаритами та відстанню)",
    unload: "Розвантаження матеріалів",
    carryUp: "Підйом матеріалів на поверх",
    furnitureCarry: "Винесення / вивезення старих меблів",
    otherTitle: "Інше",
    protect: "Захист підлоги, стін, дверей або ліфта — індивідуальна оцінка",
    carefulFurniture: "Демонтаж меблів зі збереженням елементів",
    floorNumber: "Поверх об’єкта",
    elevatorAccess: "Доступ до ліфта",
    extraComment: "Додаткова інформація",
    individualNote: "За великих обсягів сміття, матеріалів або великогабаритних речей вартість винесення, занесення, завантаження та транспортування узгоджується індивідуально.",
    previous: "Назад",
    next: "Далі",
    submitNow: "Надіслати заявку",
    privacyNote: "Надсилаючи форму, ви погоджуєтеся на контакт щодо заявки. Політику конфіденційності додамо до запуску форми.",
    footerDescription: "Компанія з демонтажних, монтажних та ремонтних робіт.",
    copyright: "© 2026 CONSTRUCTION. Усі права захищені.",
    agreement: "Угода",
    deal: "Як проходить співпраця",
    guarantees: "Гарантії",
    noEstimate: "Вартість буде визначена",
    noWorks: "У калькуляторі роботи не обрані.",
    required: "Заповніть обов’язкові поля, щоб продовжити.",
    demoSubmit: "Форму надіслано.",
    photoLimit: "Не вдалося додати цей файл.",
    telegramOnly: "Передача контакту працює після відкриття застосунку в Telegram."
  }
};

const services = [
  {id:"d1",group:"demo",name:{pl:"Demontaż podłogi",uk:"Демонтаж підлоги"},price:35,unit:"m2",desc:{pl:"Usunięcie istniejącej okładziny podłogowej.",uk:"Зняття наявного підлогового покриття."}},
  {id:"d2",group:"demo",name:{pl:"Demontaż ścian działowych",uk:"Демонтаж перегородок"},price:45,unit:"m2",desc:{pl:"Demontaż lekkich ścian działowych.",uk:"Демонтаж легких міжкімнатних перегородок."}},
  {id:"d3",group:"demo",name:{pl:"Demontaż płytek",uk:"Демонтаж плитки"},price:40,unit:"m2",desc:{pl:"Skucie płytek ze ścian lub podłogi.",uk:"Збивання плитки зі стін або підлоги."}},
  {id:"d4",group:"demo",name:{pl:"Skucie tynku",uk:"Збивання штукатурки"},price:25,unit:"m2",desc:{pl:"Usunięcie warstwy tynku.",uk:"Зняття шару штукатурки."}},
  {id:"d5",group:"demo",name:{pl:"Demontaż sufitu podwieszanego",uk:"Демонтаж підвісної стелі"},price:35,unit:"m2",desc:{pl:"Demontaż konstrukcji i poszycia.",uk:"Демонтаж каркаса та обшивки."}},
  {id:"d6",group:"demo",name:{pl:"Demontaż drzwi z ościeżnicą",uk:"Демонтаж дверей із коробкою"},price:120,unit:"pc",desc:{pl:"Demontaż jednego kompletu.",uk:"Демонтаж одного комплекту."}},
  {id:"d7",group:"demo",name:{pl:"Demontaż listew przypodłogowych",uk:"Демонтаж плінтусів"},price:8,unit:"lm",desc:{pl:"Usunięcie listew.",uk:"Зняття плінтусів."}},
  {id:"d8",group:"demo",name:{pl:"Zrywanie tapet",uk:"Зняття шпалер"},price:15,unit:"m2",desc:{pl:"Usunięcie tapety ze ścian.",uk:"Зняття шпалер зі стін."}},
  {id:"d9",group:"demo",name:{pl:"Demontaż armatury sanitarnej",uk:"Демонтаж сантехніки"},price:90,unit:"pc",desc:{pl:"Demontaż jednego elementu.",uk:"Демонтаж одного елемента."}},
  {id:"d10",group:"demo",name:{pl:"Demontaż zabudowy meblowej",uk:"Демонтаж меблевої конструкції"},price:100,unit:"service",desc:{pl:"Cena orientacyjna za usługę.",uk:"Орієнтовна ціна за послугу."}},
  {id:"r1",group:"reno",name:{pl:"Gruntowanie ścian",uk:"Ґрунтування стін"},price:5,unit:"m2",desc:{pl:"Jedna warstwa gruntu.",uk:"Один шар ґрунтовки."}},
  {id:"r2",group:"reno",name:{pl:"Szpachlowanie ścian",uk:"Шпаклювання стін"},price:35,unit:"m2",desc:{pl:"Cena za standardowe szpachlowanie.",uk:"Ціна за стандартне шпаклювання."}},
  {id:"r3",group:"reno",name:{pl:"Malowanie ścian",uk:"Фарбування стін"},price:50,unit:"m2",desc:{pl:"W cenie: zabezpieczenie pomieszczenia.",uk:"У ціні: захист приміщення."}},
  {id:"r4",group:"reno",name:{pl:"Malowanie sufitu",uk:"Фарбування стелі"},price:55,unit:"m2",desc:{pl:"W cenie: zabezpieczenie pomieszczenia.",uk:"У ціні: захист приміщення."}},
  {id:"r5",group:"reno",name:{pl:"Montaż płyt G-K",uk:"Монтаж гіпсокартону"},price:100,unit:"m2",desc:{pl:"Montaż płyt na konstrukcji — cena testowa.",uk:"Монтаж листів на каркас — тестова ціна."}},
  {id:"r6",group:"reno",name:{pl:"Układanie płytek",uk:"Укладання плитки"},price:100,unit:"m2",desc:{pl:"Cena orientacyjna, bez materiału.",uk:"Орієнтовна ціна, без матеріалу."}},
  {id:"r7",group:"reno",name:{pl:"Montaż paneli podłogowych",uk:"Монтаж ламінату"},price:35,unit:"m2",desc:{pl:"Układanie paneli.",uk:"Укладання ламінату."}},
  {id:"r8",group:"reno",name:{pl:"Montaż listew przypodłogowych",uk:"Монтаж плінтусів"},price:12,unit:"lm",desc:{pl:"Cena za metr bieżący.",uk:"Ціна за погонний метр."}},
  {id:"r9",group:"reno",name:{pl:"Montaż drzwi wewnętrznych",uk:"Монтаж міжкімнатних дверей"},price:250,unit:"pc",desc:{pl:"Montaż jednego kompletu.",uk:"Монтаж одного комплекту."}},
  {id:"r10",group:"reno",name:{pl:"Montaż listew / wykończeń",uk:"Монтаж декоративних елементів"},price:15,unit:"lm",desc:{pl:"Cena za metr bieżący.",uk:"Ціна за погонний метр."}}
];

let language = "pl";
let currentMode = "demo";
let currentStep = 1;
let requestSource = "direct";

const quantities = {};
const photoFiles = [];

const $ = id => document.getElementById(id);

const t = key => (translations[language] || translations.pl)[key] || key;

const money = value =>
  `${Number(value).toLocaleString(language === "pl" ? "pl-PL" : "uk-UA", {
    maximumFractionDigits: 2
  })} zł`;

const unitLabel = unit => ({
  m2: language === "pl" ? "m²" : "м²",
  lm: language === "pl" ? "mb" : "пог. м",
  pc: language === "pl" ? "szt." : "шт.",
  service: language === "pl" ? "usł." : "посл."
}[unit]);

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => {
    p.classList.toggle("active", p.id === pageId);
  });

  window.scrollTo({top:0,behavior:"smooth"});
}

document.querySelectorAll("[data-page]").forEach(b => {
  b.addEventListener("click", () => showPage(b.dataset.page));
});

$("homeLink").addEventListener("click", e => {
  e.preventDefault();
  showPage("homePage");
});

function visibleGroups() {
  return currentMode === "both" ? ["demo","reno"] : [currentMode];
}

function renderWorkList() {
  const labels = language === "pl"
    ? {demo:"DEMONTAŻ",reno:"REMONT / MONTAŻ"}
    : {demo:"ДЕМОНТАЖ",reno:"РЕМОНТ / МОНТАЖ"};

  $("workList").innerHTML = visibleGroups().map(group => `
    <div class="work-category">
      <div class="category-title">${labels[group]}</div>
      ${services.filter(s => s.group === group).map(s => {
        const q = quantities[s.id] || 0;

        return `
          <div class="work-item">
            <div>
              <div class="work-name">${s.name[language]}</div>
              <div class="work-description">${s.desc[language]}</div>
              <div class="work-price">${money(s.price)} / ${unitLabel(s.unit)}</div>
            </div>
            <div class="quantity-control">
              <button class="qty-button" data-change="-1" data-id="${s.id}">−</button>
              <span class="qty-value">${q}</span>
              <button class="qty-button" data-change="1" data-id="${s.id}">+</button>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `).join("");

  $("workList").querySelectorAll("[data-id]").forEach(b => {
    b.addEventListener("click", () => {
      const id = b.dataset.id;

      quantities[id] = Math.max(
        0,
        (quantities[id] || 0) + Number(b.dataset.change)
      );

      renderWorkList();
      renderSummary();
    });
  });
}

function chosenServices() {
  return services.filter(s => (quantities[s.id] || 0) > 0);
}

function estimateTotal() {
  return chosenServices().reduce(
    (sum, s) => sum + (quantities[s.id] || 0) * s.price,
    0
  );
}

function renderSummary() {
  const chosen = chosenServices();

  $("selectedList").innerHTML = chosen.length
    ? chosen.map(s => `
        <div class="selected-row">
          <span>
            ${s.name[language]}<br>
            <small>${quantities[s.id]} ${unitLabel(s.unit)} × ${money(s.price)}</small>
          </span>
          <span>${money(quantities[s.id] * s.price)}</span>
        </div>
      `).join("")
    : `<p class="empty-state">${t("empty")}</p>`;

  $("totalPrice").textContent = money(estimateTotal());
}

document.querySelectorAll(".mode-card").forEach(b => {
  b.addEventListener("click", () => {
    currentMode = b.dataset.mode;

    document.querySelectorAll(".mode-card").forEach(x => {
      x.classList.toggle("selected", x === b);
    });

    renderWorkList();
  });
});

function selectedCalculatorOptions() {
  const delivery =
    document.querySelector('input[name="delivery"]:checked')?.value || "";

  const tools =
    document.querySelector('input[name="tools"]:checked')?.value || "";

  return {
    delivery,
    tools,
    ownerDirect: $("ownerDirect").checked
  };
}

function openOrder(source) {
  requestSource = source;
  renderEstimateCarry();
  currentStep = 1;
  updateStep();
  showPage("orderPage");
}

$("sendEstimate").addEventListener("click", () => openOrder("calculator"));
$("homeOrderButton").addEventListener("click", () => openOrder("direct"));

function renderEstimateCarry() {
  const chosen = chosenServices();
  const opts = selectedCalculatorOptions();

  if (requestSource !== "calculator") {
    $("estimateCarry").innerHTML =
      `<strong>${t("noEstimate")}</strong><br>${t("noWorks")}`;
    return;
  }

  const rows = chosen.map(s =>
    `${s.name[language]} — ${quantities[s.id]} ${unitLabel(s.unit)}`
  ).join("<br>");

  const optionText = [];

  if (opts.delivery) {
    optionText.push(
      language === "pl"
        ? (opts.delivery === "company" ? "Nasza dostawa" : "Transport klienta")
        : (opts.delivery === "company" ? "Наша доставка" : "Транспорт клієнта")
    );
  }

  if (opts.tools) {
    optionText.push(
      language === "pl"
        ? (opts.tools === "company" ? "Nasz sprzęt" : "Sprzęt klienta")
        : (opts.tools === "company" ? "Наш інструмент" : "Інструмент клієнта")
    );
  }

  if (opts.ownerDirect) optionText.push(t("ownerDirect"));

  $("estimateCarry").innerHTML = `
    <strong>${money(estimateTotal())}</strong><br>
    ${rows || t("noWorks")}
    ${optionText.length ? `<br>${optionText.join(" • ")}` : ""}
  `;
}

function updateStep() {
  document.querySelectorAll(".form-step").forEach(s => {
    s.classList.toggle("active", Number(s.dataset.step) === currentStep);
  });

  document.querySelectorAll(".progress-step").forEach(s => {
    const n = Number(s.dataset.progress);

    s.classList.toggle("active", n === currentStep);
    s.classList.toggle("done", n < currentStep);
  });

  $("prevStep").classList.toggle("hidden", currentStep === 1);
  $("nextStep").classList.toggle("hidden", currentStep === 3);
  $("submitRequest").classList.toggle("hidden", currentStep !== 3);

  window.scrollTo({top:0,behavior:"smooth"});
}

function validStep1() {
  const ids = [
    "customerName",
    "customerPhone",
    "customerCity",
    "customerStreet",
    "customerBuilding"
  ];

  let valid = true;

  ids.forEach(id => {
    const el = $(id);
    const ok = el.value.trim().length > 0;

    el.classList.toggle("invalid", !ok);

    if (!ok) valid = false;
  });

  if (!valid) showToast(t("required"));

  return valid;
}

function validStep2() {
  const el = $("jobDescription");
  const ok = el.value.trim().length > 0;

  el.classList.toggle("invalid", !ok);

  if (!ok) showToast(t("required"));

  return ok;
}

$("nextStep").addEventListener("click", () => {
  if (currentStep === 1 && !validStep1()) return;
  if (currentStep === 2 && !validStep2()) return;

  currentStep = Math.min(3, currentStep + 1);
  updateStep();
});

$("prevStep").addEventListener("click", () => {
  currentStep = Math.max(1, currentStep - 1);
  updateStep();
});

$("jobPhotos").addEventListener("change", e => {
  const incoming = [...e.target.files];

  incoming.forEach(file => {
    if (file.type.startsWith("image/")) {
      photoFiles.push(file);
    }
  });

  e.target.value = "";
  renderPhotoPreview();
});

function renderPhotoPreview() {
  $("photoPreview").innerHTML = "";

  photoFiles.forEach((file, index) => {
    const url = URL.createObjectURL(file);
    const item = document.createElement("div");

    item.className = "photo-item";

    const img = document.createElement("img");
    img.src = url;
    img.alt = file.name;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "photo-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", "Remove photo");

    remove.addEventListener("click", () => {
      URL.revokeObjectURL(url);
      photoFiles.splice(index, 1);
      renderPhotoPreview();
    });

    item.append(img, remove);
    $("photoPreview").append(item);
  });
}

$("shareContact").addEventListener("click", () => {
  if (tg?.requestContact) {
    tg.requestContact(ok => {
      if (ok) {
        showToast(
          language === "pl"
            ? "Prośba o kontakt została wysłana."
            : "Запит на контакт надіслано."
        );
      }
    });
  } else {
    showToast(t("telegramOnly"));
  }
});

function formDataObject() {
  const extras = [
    ...document.querySelectorAll('input[name="extras"]:checked')
  ].map(x => x.value);

  const cleaning =
    document.querySelector('input[name="cleaning"]:checked')?.value || "";

  const chosen = chosenServices().map(s => ({
    name: s.name[language],
    quantity: quantities[s.id],
    unit: unitLabel(s.unit),
    price: s.price,
    lineTotal: quantities[s.id] * s.price
  }));

  const calculatorOptions = selectedCalculatorOptions();

  return {
    requestSource,
    language,

    name: $("customerName").value.trim(),
    phone: $("customerPhone").value.trim(),

    address: {
      city: $("customerCity").value.trim(),
      street: $("customerStreet").value.trim(),
      building: $("customerBuilding").value.trim(),
      apartment: $("customerApartment").value.trim()
    },

    description: $("jobDescription").value.trim(),
    objectType: $("objectType").value,
    area: $("objectArea").value,
    condition: $("objectCondition").value,
    startDate: $("startDate").value,

    calculator: {
      works: chosen,
      total: requestSource === "calculator" ? estimateTotal() : null,
      options: {
        delivery: calculatorOptions.delivery,
        tools: calculatorOptions.tools,
        directOwner: calculatorOptions.ownerDirect
      }
    },

    extras,
    cleaning,
    wasteAmount: $("wasteAmount").value,
    wasteFloor: $("wasteFloor").value,
    hasElevator: $("hasElevator").checked,
    objectFloor: $("objectFloor").value,
    objectElevator: $("objectElevator").value,
    extraComment: $("extraComment").value.trim(),

    photos: photoFiles.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })),

    createdAt: new Date().toISOString()
  };
}

// ==========================================
// ОТПРАВКА ЗАЯВКИ
// ==========================================

$("requestForm").addEventListener("submit", async e => {
  e.preventDefault();

  if (!validStep1() || !validStep2()) return;

  const button = $("submitRequest");
  const originalText = button.textContent;

  button.disabled = true;

  button.textContent = language === "pl"
    ? "Wysyłanie..."
    : "Надсилання...";

  try {
    const payload = formDataObject();

    // Получаем текущую сессию Supabase.
    // Авторизованный заказчик передаёт токен серверу.
    // Гость отправляет заявку без токена.
    const client = await getSupabaseClient();

    const {
      data: sessionData,
      error: sessionError
    } = await client.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const headers = {
      "Content-Type": "application/json"
    };

    const accessToken =
      sessionData.session?.access_token;

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    const response = await fetch("/api/submit", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Submission failed");
    }

    showToast(
      language === "pl"
        ? `Zgłoszenie nr ${result.requestNumber} zostało wysłane!`
        : `Заявку № ${result.requestNumber} успішно надіслано!`
    );

    $("requestForm").reset();

    photoFiles.forEach(file => {
      // File objects are released when the form is reset.
    });

    photoFiles.length = 0;
    $("photoPreview").innerHTML = "";

    Object.keys(quantities).forEach(key => {
      delete quantities[key];
    });

    renderWorkList();
    renderSummary();

    currentStep = 1;
    updateStep();

    setTimeout(() => {
      showPage("homePage");
    }, 1800);

  } catch (error) {
    console.error("CONSTRUCTION submission error:", error);

    showToast(
      language === "pl"
        ? "Nie udało się wysłać zgłoszenia. Spróbuj ponownie."
        : "Не вдалося надіслати заявку. Спробуйте ще раз."
    );

  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
});

$("languageSelect").addEventListener("change", e => {
  language = e.target.value;
  applyLanguage();
});

function applyLanguage() {
  document.documentElement.lang = language;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });

  renderWorkList();
  renderSummary();

  if ($("orderPage").classList.contains("active")) {
    renderEstimateCarry();
  }
}

let toastTimer;

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    $("toast").classList.remove("show");
  }, 3200);
}

applyLanguage();
