const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); }

const translations = {
  pl: {
    heroTag:"DEMONTAŻ • REMONT • PRZYGOTOWANIE", heroTitle:'Twój obiekt.<br><span>Nasza praca.</span>',
    heroText:"Prace demontażowe, remontowe i przygotowanie pomieszczeń w Warszawie.", calculate:"Oblicz koszt",
    about:"Kim jesteśmy",aboutShort:"Poznaj naszą firmę",calculator:"Kalkulator cen",calculatorShort:"Wstępna wycena prac",
    contact:"Kontakt",contactShort:"Skontaktuj się z nami",back:"Powrót",aboutHeading:"Pracujemy konkretnie.",
    aboutPlaceholder:"Tutaj dodamy opis firmy, doświadczenie, zdjęcia realizacji i informacje o zespole.",
    contactHeading:"Porozmawiajmy o Twoim obiekcie.",contactPlaceholder:"Dane kontaktowe dodamy przed uruchomieniem przyjmowania zamówień.",
    calculatorHeading:"Zbuduj swoją wycenę.",calculatorIntro:"Wybierz zakres prac, podaj ilości i zobacz wstępny koszt.",
    modeDemo:"Demontaż",modeDemoDesc:"Prace rozbiórkowe",modeReno:"Remont / Montaż",modeRenoDesc:"Prace remontowe i montażowe",
    modeBoth:"Demontaż + Montaż",modeBothDesc:"Kompleksowy zakres prac",chooseWorks:"WYBIERZ PRACE",workList:"Lista usług",
    testPrices:"CENY TESTOWE",yourEstimate:"TWOJA WYCENA",summary:"Podsumowanie",empty:"Nie wybrano jeszcze żadnych prac.",
    estimatedTotal:"Szacunkowa suma",delivery:"Dostawa / transport",ourDelivery:"Nasza dostawa / transport",
    clientDelivery:"Własna dostawa / transport",tools:"Narzędzia",ourTools:"Nasz sprzęt",clientTools:"Własny sprzęt",
    clientType:"Kto zleca pracę?",ownerDirect:"Bezpośrednio od właściciela nieruchomości",
    estimateNote:"To wstępna wycena. Ostateczna cena może zostać ustalona po obejrzeniu obiektu.",
    copyEstimate:"Kopiuj wycenę",copyright:"© 2026 CONSTRUCTION. Wszelkie prawa zastrzeżone.",
    unitM2:"m²",unitLm:"mb",unitPc:"szt.",unitService:"usł.",copied:"Wycena skopiowana.",
    chooseAtLeast:"Najpierw wybierz przynajmniej jedną usługę."
  },
  uk: {
    heroTag:"ДЕМОНТАЖ • РЕМОНТ • ПІДГОТОВКА",heroTitle:'Ваш об’єкт.<br><span>Наша робота.</span>',
    heroText:"Демонтажні, ремонтні роботи та підготовка приміщень у Варшаві.",calculate:"Розрахувати вартість",
    about:"Хто ми",aboutShort:"Познайомтеся з нашою компанією",calculator:"Калькулятор цін",calculatorShort:"Попередній розрахунок робіт",
    contact:"Контакти",contactShort:"Зв’яжіться з нами",back:"Назад",aboutHeading:"Працюємо конкретно.",
    aboutPlaceholder:"Тут додамо опис компанії, досвід, фотографії робіт та інформацію про команду.",
    contactHeading:"Обговорімо ваш об’єкт.",contactPlaceholder:"Контактні дані додамо перед запуском прийому замовлень.",
    calculatorHeading:"Сформуйте свій кошторис.",calculatorIntro:"Оберіть роботи, вкажіть кількість та побачте попередню вартість.",
    modeDemo:"Демонтаж",modeDemoDesc:"Демонтажні роботи",modeReno:"Ремонт / Монтаж",modeRenoDesc:"Ремонтні та монтажні роботи",
    modeBoth:"Демонтаж + Монтаж",modeBothDesc:"Комплекс робіт",chooseWorks:"ОБЕРІТЬ РОБОТИ",workList:"Список послуг",
    testPrices:"ТЕСТОВІ ЦІНИ",yourEstimate:"ВАШ РОЗРАХУНОК",summary:"Підсумок",empty:"Ви ще не обрали жодної роботи.",
    estimatedTotal:"Попередня сума",delivery:"Доставка / транспортування",ourDelivery:"Наша доставка / транспорт",
    clientDelivery:"Ваша доставка / транспорт",tools:"Інструменти",ourTools:"Наш інструмент",clientTools:"Ваш інструмент",
    clientType:"Хто замовляє роботу?",ownerDirect:"Безпосередньо від власника нерухомості",
    estimateNote:"Це попередній розрахунок. Остаточну ціну можна визначити після огляду об’єкта.",
    copyEstimate:"Скопіювати розрахунок",copyright:"© 2026 CONSTRUCTION. Усі права захищені.",
    unitM2:"м²",unitLm:"пог. м",unitPc:"шт.",unitService:"посл.",copied:"Розрахунок скопійовано.",
    chooseAtLeast:"Спочатку оберіть хоча б одну послугу."
  }
};

// Test prices only — replace with the company's approved price list before publishing.
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
const quantities = {};

const $ = (id) => document.getElementById(id);
const t = (key) => translations[language][key] || key;
const money = (value) => `${value.toLocaleString(language === "pl" ? "pl-PL" : "uk-UA",{maximumFractionDigits:2})} zł`;
const unitLabel = (unit) => ({m2:t("unitM2"),lm:t("unitLm"),pc:t("unitPc"),service:t("unitService")}[unit]);

function showPage(pageId) {
  document.querySelectorAll(".page").forEach(page => page.classList.toggle("active", page.id === pageId));
  window.scrollTo({top:0,behavior:"smooth"});
}
document.querySelectorAll("[data-page]").forEach(button => button.addEventListener("click", () => showPage(button.dataset.page)));
$("homeLink").addEventListener("click", e => {e.preventDefault();showPage("homePage");});
$("heroCalculator").addEventListener("click", () => showPage("calculatorPage"));

function visibleGroups() {
  return currentMode === "both" ? ["demo","reno"] : [currentMode];
}
function renderWorkList() {
  const groups = visibleGroups();
  const labels = language === "pl" ? {demo:"DEMONTAŻ",reno:"REMONT / MONTAŻ"} : {demo:"ДЕМОНТАЖ",reno:"РЕМОНТ / МОНТАЖ"};
  $("workList").innerHTML = groups.map(group => `
    <div class="work-category">
      <div class="category-title">${labels[group]}</div>
      ${services.filter(s=>s.group===group).map(s => {
        const q = quantities[s.id] || 0;
        return `<div class="work-item">
          <div><div class="work-name">${s.name[language]}</div>
          <div class="work-description">${s.desc[language]}</div>
          <div class="work-price">${money(s.price)} / ${unitLabel(s.unit)}</div></div>
          <div class="quantity-control">
            <button class="qty-button" data-change="-1" data-id="${s.id}" aria-label="Minus">−</button>
            <span class="qty-value">${q}</span>
            <button class="qty-button" data-change="1" data-id="${s.id}" aria-label="Plus">+</button>
          </div>
        </div>`;
      }).join("")}
    </div>`).join("");
  $("workList").querySelectorAll("[data-id]").forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.id;
    quantities[id] = Math.max(0,(quantities[id] || 0) + Number(button.dataset.change));
    renderWorkList(); renderSummary();
  }));
}
function renderSummary() {
  const chosen = services.filter(s => (quantities[s.id] || 0) > 0);
  if (!chosen.length) $("selectedList").innerHTML = `<p class="empty-state">${t("empty")}</p>`;
  else $("selectedList").innerHTML = chosen.map(s => {
    const q = quantities[s.id], line = q*s.price;
    return `<div class="selected-row"><span>${s.name[language]}<br><small>${q} ${unitLabel(s.unit)} × ${money(s.price)}</small></span><span>${money(line)}</span></div>`;
  }).join("");
  const total = chosen.reduce((sum,s)=>sum+(quantities[s.id]||0)*s.price,0);
  $("totalPrice").textContent = money(total);
}
document.querySelectorAll(".mode-card").forEach(button => button.addEventListener("click", () => {
  currentMode = button.dataset.mode;
  document.querySelectorAll(".mode-card").forEach(b=>b.classList.toggle("selected",b===button));
  renderWorkList();
}));
function applyLanguage() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach(el => {el.textContent=t(el.dataset.i18n);});
  document.querySelectorAll("[data-i18n-html]").forEach(el => {el.innerHTML=t(el.dataset.i18nHtml);});
  renderWorkList();renderSummary();
}
$("languageSelect").addEventListener("change", e => {language=e.target.value;applyLanguage();});

function selectedOption(id, label) { return $(id).checked ? `• ${label}` : null; }
$("copyEstimate").addEventListener("click", async () => {
  const chosen = services.filter(s => (quantities[s.id] || 0) > 0);
  if (!chosen.length) { showToast(t("chooseAtLeast")); return; }
  const lines = chosen.map(s => `${s.name[language]} — ${quantities[s.id]} ${unitLabel(s.unit)} × ${money(s.price)} = ${money(quantities[s.id]*s.price)}`);
  const options = [
    selectedOption("ourDelivery",t("ourDelivery")),selectedOption("clientDelivery",t("clientDelivery")),
    selectedOption("ourTools",t("ourTools")),selectedOption("clientTools",t("clientTools")),
    selectedOption("ownerDirect",t("ownerDirect"))
  ].filter(Boolean);
  const total = chosen.reduce((sum,s)=>sum+quantities[s.id]*s.price,0);
  const text = `CONSTRUCTION — ${t("summary")}\n${lines.join("\n")}\n\n${t("estimatedTotal")}: ${money(total)}\n${options.length?options.join("\n"):""}\n\n${t("estimateNote")}`;
  try {
    await navigator.clipboard.writeText(text);
    showToast(t("copied"));
  } catch {
    const area=document.createElement("textarea");area.value=text;document.body.appendChild(area);area.select();document.execCommand("copy");area.remove();showToast(t("copied"));
  }
});
let toastTimer;
function showToast(message) {
  $("toast").textContent=message;$("toast").classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").classList.remove("show"),2200);
}
applyLanguage();
