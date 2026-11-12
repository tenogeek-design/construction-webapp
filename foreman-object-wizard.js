
"use strict";
document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("cgForemanProjects");
  if (!root || document.getElementById("cg-object-wizard")) return;
  const key = "cg_object_draft_v1";
  const fresh = () => ({name:"",address:"",start:"",finish:"",note:"",stages:[]});
  let state=fresh(),step=0,visible=false,lang="pl",message="";
  try { const saved=JSON.parse(localStorage.getItem(key)); if(saved&&typeof saved.name==="string"&&Array.isArray(saved.stages))state=saved; }catch(e){}
  const tr={
    pl:{title:"Rejestracja obiektu",subtitle:"Obiekt · etapy · pozycje robót",open:"Utwórz obiekt",close:"Zamknij",name:"Nazwa obiektu",address:"Adres obiektu",start:"Data rozpoczęcia",finish:"Planowany koniec",note:"Opis",stages:"Etapy i pozycje",summary:"Podsumowanie",addstage:"Dodaj etap",stage:"Nazwa etapu",position:"Pozycja robót",qty:"Ilość",unit:"Jedn.",rate:"Stawka zł",addposition:"Dodaj pozycję",remove:"Usuń",save:"Zapisz szkic",next:"Dalej",back:"Wstecz",total:"Wartość szacunkowa",approval:"Oczekuje na zatwierdzenie OWNER",blocked:"Wysłanie do OWNER zostanie włączone po podłączeniu bezpiecznej operacji w bazie.",noteDraft:"Szkic przechowywany wyłącznie w tej przeglądarce. Obiekt nie został jeszcze utworzony w bazie.",required:"Podaj nazwę i adres obiektu.",wrong:"Wpisz poprawną nazwę, ilość i stawkę.",saved:"Szkic zapisano.",empty:"Brak etapów / pozycji."},
    ua:{title:"Реєстрація об’єкта",subtitle:"Об’єкт · етапи · позиції робіт",open:"Створити об’єкт",close:"Закрити",name:"Назва об’єкта",address:"Адреса об’єкта",start:"Дата початку",finish:"Планове завершення",note:"Опис",stages:"Етапи та позиції",summary:"Підсумок",addstage:"Додати етап",stage:"Назва етапу",position:"Позиція робіт",qty:"Кількість",unit:"Од.",rate:"Ставка zł",addposition:"Додати позицію",remove:"Видалити",save:"Зберегти чернетку",next:"Далі",back:"Назад",total:"Попередня вартість",approval:"Очікує підтвердження OWNER",blocked:"Надсилання OWNER запрацює після підключення захищеної операції в базі.",noteDraft:"Чернетка зберігається лише в цьому браузері. Об’єкт ще не створено в базі.",required:"Вкажіть назву й адресу об’єкта.",wrong:"Вкажіть правильну назву, кількість і ставку.",saved:"Чернетку збережено.",empty:"Етапів / позицій немає."}
  };
  const t=k=>tr[lang][k];
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>new Intl.NumberFormat(lang==="pl"?"pl-PL":"uk-UA",{maximumFractionDigits:2}).format(n)+" zł";
  const sum=()=>state.stages.reduce((x,s)=>x+s.items.reduce((v,p)=>v+p.qty*p.rate,0),0);
  const section=document.createElement("div");
  section.id="cg-object-wizard";
  const css=document.createElement("style");
  css.textContent=`
  @import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap');
  #cg-object-wizard{font-family:Manrope,Arial,sans-serif;color:#edf4fc;margin-bottom:23px}
  #cg-object-wizard *{box-sizing:border-box}
  #cg-object-wizard .ow-head{background:linear-gradient(105deg,rgba(13,25,38,.97),rgba(23,45,68,.88)),url('/owner-facade.jpg') center/cover;border:1px solid #55728b;border-radius:18px;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:23px;box-shadow:0 14px 38px #0005}
  #cg-object-wizard .ow-head h3{color:#fff;font-size:23px;margin:8px 0}
  #cg-object-wizard .ow-head p{color:#b9c9d9;font-size:12px;margin:0}
  #cg-object-wizard .ow-tag{color:#efa36c;font-size:10px;letter-spacing:2px;font-weight:800}
  #cg-object-wizard button{border:1px solid #56718d;background:#2a435d;color:#fff;border-radius:10px;padding:10px 14px;font:700 12px Manrope,Arial,sans-serif;cursor:pointer}
  #cg-object-wizard button:hover{border-color:#f3a875}
  #cg-object-wizard .ow-primary{background:linear-gradient(135deg,#f2b079,#dc8951);border-color:#fac297;color:#17212b}
  #cg-object-wizard .ow-panel{background:#17283a;border:1px solid #526b83;border-radius:17px;margin-top:14px;padding:23px}
  #cg-object-wizard .ow-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
  #cg-object-wizard .ow-step{border-top:4px solid #354b63;padding-top:9px;font-size:12px;color:#9aafc3}
  #cg-object-wizard .ow-step.active{border-color:#eea36d;color:#f4c69e}
  #cg-object-wizard .ow-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  #cg-object-wizard label{display:block;font-size:12px;font-weight:700;color:#c5d5e4;margin-bottom:5px}
  #cg-object-wizard input,#cg-object-wizard textarea,#cg-object-wizard select{width:100%;background:#101d2b;color:#fff;border:1px solid #59728b;padding:10px;border-radius:9px;font:13px Manrope,Arial,sans-serif}
  #cg-object-wizard .ow-field{margin-bottom:13px;min-width:0}
  #cg-object-wizard textarea{min-height:85px}
  #cg-object-wizard .ow-stage{background:#23364b;border:1px solid #465f7b;border-radius:13px;padding:15px;margin-bottom:12px}
  #cg-object-wizard .ow-stage-title{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:12px}
  #cg-object-wizard .ow-position{display:flex;justify-content:space-between;gap:10px;align-items:center;border-top:1px solid #445a6f;padding:10px 0}
  #cg-object-wizard .ow-position small{display:block;color:#adbed0;margin-top:4px}
  #cg-object-wizard .ow-pos-form{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:8px}

  #cg-object-wizard .ow-catalog{margin:12px 0;padding:13px;background:#152839;border:1px solid #54718c;border-radius:12px}
  #cg-object-wizard .ow-catalog-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
  #cg-object-wizard .ow-picked{color:#f5c49c;font-size:12px;padding:10px;background:#253c50;border-radius:8px}
  #cg-object-wizard .ow-result-count{color:#a9c6de;font-size:12px;padding:7px 2px}
  #cg-object-wizard .ow-results{max-height:215px;overflow-y:auto;margin:8px 0;display:grid;gap:5px}
  #cg-object-wizard button.ow-result{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#293f56;text-align:left}
  #cg-object-wizard .ow-result small{font-size:11px;color:#a6c7df}

  #cg-object-wizard .ow-progress{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:9px}
  #cg-object-wizard .ow-progress input{width:108px}
  #cg-object-wizard .ow-meter{height:6px;border-radius:8px;background:#4d5e70;margin-top:9px;max-width:350px;overflow:hidden}
  #cg-object-wizard .ow-meter>div{height:100%;background:#f0a570}
  #cg-object-wizard .ow-calc{display:flex;align-items:center;justify-content:space-between;gap:14px;background:#152b40;border:1px solid #5d7891;border-radius:12px;padding:13px 16px;margin:13px 0}
  #cg-object-wizard .ow-calc span{font-size:13px;color:#d2e0ed}
  #cg-object-wizard .ow-calc strong{font-size:24px;color:#f1ac78}
  #cg-object-wizard .ow-grand{position:sticky;bottom:8px;background:linear-gradient(120deg,#132f48,#25425b);z-index:2;box-shadow:0 10px 25px #0007}
  #cg-object-wizard .ow-actions{display:flex;justify-content:space-between;flex-wrap:wrap;gap:9px;border-top:1px solid #41576e;margin-top:16px;padding-top:17px}
  #cg-object-wizard .ow-notice{font-size:12px;color:#b9c9d9;line-height:1.6;margin:15px 0}
  #cg-object-wizard .ow-summary{background:#20364c;border:1px solid #4d6b87;border-radius:13px;padding:18px;margin:14px 0}
  #cg-object-wizard .ow-summary strong{font-size:24px;color:#efa974}
  #cg-object-wizard .ow-language{display:flex;gap:6px;margin-top:11px}
  #cg-object-wizard .ow-language button.selected{background:#22527c;border-color:#80baf0}
  @media(max-width:650px){#cg-object-wizard .ow-head{display:block;padding:16px}#cg-object-wizard .ow-head>button{margin-top:13px}#cg-object-wizard .ow-panel{padding:14px}#cg-object-wizard .ow-grid{grid-template-columns:1fr}#cg-object-wizard .ow-pos-form{grid-template-columns:1fr 1fr}}
  `;
  document.head.append(css);
  function store(){try{localStorage.setItem(key,JSON.stringify(state));message=t("saved")}catch(e){message="Local storage unavailable"}}
  function field(id,type="text"){return '<div class="ow-field"><label for="ow-'+id+'">'+t(id)+'</label><input id="ow-'+id+'" type="'+type+'" value="'+esc(state[id])+'"></div>'}
  function sync(){if(!visible||step!==0)return;for(const id of ["name","address","start","finish"]){const el=section.querySelector("#ow-"+id);if(el)state[id]=el.value}const n=section.querySelector("#ow-note");if(n)state.note=n.value}

  const catalog = window.CG_WORK_CATALOG || {};
  const categories = {
    demo:["Rozbiórki","Демонтаж"],gk:["Zabudowy GK","Монтаж ГК"],
    prep:["Przygotowanie","Підготовка"],floors:["Posadzki","Підлоги"],
    finish:["Wykończenie","Оздоблення"],install:["Instalacje","Комунікації"],
    other:["Inne","Інше"]
  };
  function catalogSearch(i) {
    return '<div class="ow-catalog" data-catalog="'+i+'"><label>'+(lang==="pl"?"Dodaj pracę z cennika":"Додати роботу з прайсу")+'</label><div class="ow-catalog-grid"><input type="search" data-work-search placeholder="'+(lang==="pl"?"Szukaj pracy...":"Пошук роботи...")+'"><select data-work-cat><option value="">'+(lang==="pl"?"Wszystkie":"Усі")+'</option>'+Object.entries(categories).map(([k,v])=>'<option value="'+k+'">'+esc(v[lang==="pl"?0:1])+'</option>').join("")+'</select></div><div data-work-results class="ow-results"></div></div>';
  }

  const searchAliases = {
    demoTile:"skuwanie kafelki plytki плитка кафель отбивка сбить",
    demoFloor:"rozbiorka posadzki пола покрытие",
    demoScreed:"wylewka beton jastrych стяжка бетон",
    demoWalls:"scianki sciany partition перегородки стены",
    demoPlaster:"tynk штукатурка",
    demoCeiling:"sufit потолок стеля",
    demoDoors:"drzwi двери дверей",
    demoGK:"karton gips plyta гипсокартон",
    gkFrame:"gk kg rigips drywall plyty karton gips stelaż profil profile каркас профиль гкл гипсокартон",
    gkCeiling:"sufit podsufitka потолок гк",
    gkPartition:"ścianki działowe перегородка каркас",
    gkGlue:"klejenie gk klej клей поклейка",
    primer:"grunt грунтовка грунт",
    plaster:"tynk штукатурка",
    screed:"beton wylewka стяжка",
    level:"wyrównanie poziom samopoziom poziomujaca выравнивание наливной",
    tile:"glazura gres kafelki plytki укладка плитка кафель",
    laminate:"panele podloga ламинат",
    vinyl:"winyl podloga винил",
    paint:"malowanie farba покраска краска",
    skim:"szpachlowanie gładź шпаклевка шпаклювання",
    electric:"elektryka przewody провода электрика",
    plumbing:"hydraulika wod kan сантехника водопровод",
    rubble:"gruz wywoz мусор вынос",
    cleanup:"sprzatanie уборка"
  };
  function normalizeSearch(value) {
    return String(value||"").toLocaleLowerCase().normalize("NFD")
      .replace(/[\u0300-\u036f]/g,"").replace(/ł/g,"l")
      .replace(/[’'_-]/g," ").replace(/\s+/g," ").trim();
  }
  function drawCatalog(i) {
    const box=section.querySelector('[data-catalog="'+i+'"]');
    if(!box)return;
    const raw=box.querySelector("[data-work-search]").value;
    const query=normalizeSearch(raw),parts=query.split(" ").filter(Boolean);
    const cat=box.querySelector("[data-work-cat]").value;
    const all=Object.entries(catalog).filter(([id,job])=>{
      if(cat&&job.cat!==cat)return false;
      if(!parts.length)return true;
      const stack=normalizeSearch([id,job.pl,job.ua,searchAliases[id]||""].join(" "));
      return parts.every(part=>stack.includes(part));
    });
    const output=box.querySelector("[data-work-results]");
    const label=lang==="pl"?"Znaleziono":"Знайдено";
    const nothing=lang==="pl"
      ?"Nie ma tej pracy w cenniku. Możesz wpisać własną pozycję poniżej."
      :"Цієї роботи немає в прайсі. Можна вписати власну позицію нижче.";
    output.innerHTML='<div class="ow-result-count" role="status">'+label+": "+all.length+"</div>"+
      (all.length?all.map(([id,job])=>
        '<button class="ow-result" type="button" data-select-work="'+esc(id)+'">'+
        '<span>'+esc(job[lang])+'</span><small>'+esc(job.unit)+' · '+
        (job.price===null?(lang==="pl"?"Do wyceny":"За домовленістю"):money(job.price))+
        '</small></button>').join(""):'<div class="ow-notice">'+nothing+'</div>');
    output.querySelectorAll("[data-select-work]").forEach(button=>button.onclick=()=>{
      const job=catalog[button.dataset.selectWork];
      const row=section.querySelector('[data-stage="'+i+'"]');
      if(!job||!row)return;
      row.querySelector("[data-pname]").value=job[lang];
      const unit=row.querySelector("[data-punit]");
      if([...unit.options].some(x=>x.value===job.unit))unit.value=job.unit;
      row.querySelector("[data-prate]").value=job.price===null?"":job.price;
      box.querySelector("[data-work-search]").value=job[lang];
      output.innerHTML='<div class="ow-picked">'+
        (lang==="pl"?"Wybrano: ":"Обрано: ")+esc(job[lang])+
        ' · '+(lang==="pl"?"wpisz ilość i dodaj pozycję":"вкажіть кількість та додайте позицію")+'</div>';
      updatePreview(i);
      row.querySelector("[data-pqty]").focus();
    });
  }

function stageSummary(st){return '<div class="ow-calc"><span>'+(lang==="pl"?"Razem etap":"Разом етап")+'</span><strong>'+money(st.items.reduce((a,p)=>a+p.qty*p.rate,0))+'</strong></div>';}
function wholeSummary(){return '<div class="ow-calc ow-grand"><span>'+(lang==="pl"?"Razem cały obiekt":"Всього по об’єкту")+'</span><strong>'+money(sum())+'</strong></div>';}
function livePreview(i){return '<div class="ow-calc" data-preview="'+i+'"><span>'+(lang==="pl"?"Koszt nowej pozycji":"Вартість нової позиції")+'</span><strong>—</strong></div>';}
function updatePreview(i){
  const row=section.querySelector('[data-stage="'+i+'"]'),box=section.querySelector('[data-preview="'+i+'"]');
  if(!row||!box)return;
  const q=row.querySelector("[data-pqty]"),r=row.querySelector("[data-prate]");
  const quantity=Number(q.value),rate=Number(r.value);
  box.querySelector("strong").textContent=q.value!==""&&r.value!==""&&quantity>0&&rate>=0&&Number.isFinite(quantity)&&Number.isFinite(rate)?money(quantity*rate):"—";
}

  function page(){
    if(step===0)return '<div class="ow-grid">'+field("name")+field("address")+field("start","date")+field("finish","date")+'</div><div class="ow-field"><label for="ow-note">'+t("note")+'</label><textarea id="ow-note">'+esc(state.note)+'</textarea></div>';
    if(step===1)return state.stages.map((s,i)=>'<div class="ow-stage"><div class="ow-stage-title"><b>'+(i+1)+'. '+esc(s.name)+'</b><button data-remove-stage="'+i+'">'+t("remove")+'</button></div>'+s.items.map((p,j)=>{
      const done=Number(p.done||0),planned=Number(p.qty);
      const percent=planned>0?Math.max(0,Math.min(100,done/planned*100)):0;
      return '<div class="ow-position"><div style="flex:1"><b>'+esc(p.name)+'</b><small>'+esc(p.qty)+' '+esc(p.unit)+' × '+money(p.rate)+'</small><small>'+(lang==="pl"?"Wykonano":"Виконано")+': '+done+' / '+planned+' '+esc(p.unit)+'</small><div class="ow-meter"><div style="width:'+percent+'%"></div></div><div class="ow-progress"><input data-progress-qty="'+i+':'+j+'" type="number" min=".01" step=".01" placeholder="+ '+esc(p.unit)+'"><button type="button" data-progress-add="'+i+':'+j+'">'+(lang==="pl"?"Dodaj wykonanie":"Додати виконання")+'</button></div><small>'+(p.logs||[]).slice(-3).map(x=>esc(x.date)+': +'+esc(x.qty)).join(" · ")+'</small></div><button data-remove-position="'+i+':'+j+'">'+t("remove")+'</button></div>';
    }).join("")+stageSummary(s)+catalogSearch(i)+'<div class="ow-pos-form" data-stage="'+i+'"><input data-pname placeholder="'+t("position")+'"><input data-pqty type="number" min=".01" step=".01" placeholder="'+t("qty")+'"><select data-punit><option>m²</option><option>mb</option><option>szt.</option><option>m³</option><option>kpl.</option><option>godz.</option><option>pkt.</option></select><input data-prate type="number" min="0" step=".01" placeholder="'+t("rate")+'"></div>'+livePreview(i)+'<button style="margin-top:10px" data-add-position="'+i+'">'+t("addposition")+'</button></div>').join("")+'<div class="ow-stage"><label for="ow-new-stage">'+t("stage")+'</label><input id="ow-new-stage" maxlength="120"><button style="margin-top:10px" id="ow-add-stage">'+t("addstage")+'</button></div>'+wholeSummary();
    return '<div class="ow-summary"><h3>'+esc(state.name)+'</h3><p>'+esc(state.address)+'</p><p>'+esc(state.start)+' — '+esc(state.finish)+'</p><p>'+esc(state.note)+'</p></div>'+state.stages.map(s=>'<div class="ow-stage"><b>'+esc(s.name)+'</b><div class="ow-notice">'+s.items.length+' · '+money(s.items.reduce((v,p)=>v+p.qty*p.rate,0))+'</div></div>').join("")+'<div class="ow-summary"><p>'+t("total")+'</p><strong>'+money(sum())+'</strong></div><div class="ow-notice"><b>'+t("approval")+'</b><p>'+t("blocked")+'</p></div>';
  }
  function render(){
    section.innerHTML='<div class="ow-head"><div><div class="ow-tag">CONSTRUCTION GROUP · FOREMAN</div><h3>'+t("title")+'</h3><p>'+t("subtitle")+'</p><div class="ow-language"><button class="'+(lang==="pl"?"selected":"")+'" data-lang="pl">PL</button><button class="'+(lang==="ua"?"selected":"")+'" data-lang="ua">UA</button></div></div><button id="ow-toggle" class="ow-primary">'+(visible?t("close"):t("open"))+'</button></div>'+(visible?'<div class="ow-panel"><div class="ow-steps">'+["name","stages","summary"].map((x,i)=>'<div class="ow-step '+(i===step?"active":"")+'">'+(i+1)+'. '+t(x)+'</div>').join("")+'</div>'+page()+'<div class="ow-actions"><div style="display:flex;gap:8px"><button id="ow-back">'+(step===0?t("close"):t("back"))+'</button><button id="ow-save">'+t("save")+'</button></div><button class="ow-primary" id="ow-next" '+(step===2?"disabled":"")+'>'+(step===2?t("approval"):t("next"))+'</button></div><div class="ow-notice">'+t("noteDraft")+'</div><p class="ow-notice" role="status">'+esc(message)+'</p></div>':"");
    section.querySelectorAll("[data-lang]").forEach(b=>b.onclick=()=>{sync();lang=b.dataset.lang;render()});
    section.querySelector("#ow-toggle").onclick=()=>{sync();visible=!visible;render()};
    if(!visible)return;
    section.querySelector("#ow-save").onclick=()=>{sync();store();render()};
    section.querySelector("#ow-back").onclick=()=>{sync();if(step===0)visible=false;else step--;render()};
    section.querySelector("#ow-next").onclick=()=>{sync();if(step===0&&(!state.name.trim()||!state.address.trim())){message=t("required");render();return}if(step<2){step++;message="";render()}};
    if(step===1){

      section.querySelectorAll("[data-stage]").forEach(row=>{
        const i=Number(row.dataset.stage);
        for(const input of row.querySelectorAll("[data-pqty],[data-prate]"))input.addEventListener("input",()=>updatePreview(i));
        updatePreview(i);
      });
      section.querySelectorAll("[data-catalog]").forEach(el=>{
        const i=Number(el.dataset.catalog);
        el.querySelector("[data-work-search]").addEventListener("input",()=>drawCatalog(i));
        el.querySelector("[data-work-cat]").addEventListener("change",()=>drawCatalog(i));
        drawCatalog(i);
      });

      section.querySelectorAll("[data-progress-add]").forEach(b=>b.onclick=()=>{
        const [i,j]=b.dataset.progressAdd.split(":").map(Number),p=state.stages[i].items[j];
        const field=section.querySelector('[data-progress-qty="'+i+':'+j+'"]');
        const increment=Number(field.value),prev=Number(p.done||0);
        if(!field.value||!Number.isFinite(increment)||increment<=0||prev+increment>Number(p.qty)+0.00001){
          message=lang==="pl"?"Wpisz ilość dodatnią, nie większą niż pozostały zakres.":"Вкажіть додатну кількість, що не перевищує залишок.";
          render();return;
        }
        p.done=Math.round((prev+increment)*100)/100;
        if(!Array.isArray(p.logs))p.logs=[];
        p.logs.push({date:new Date().toLocaleDateString("sv-SE"),qty:increment});
        store();render();
      });
      section.querySelector("#ow-add-stage").onclick=()=>{const name=section.querySelector("#ow-new-stage").value.trim();if(!name){message=t("wrong");render();return}state.stages.push({name,items:[]});store();render()};
      section.querySelectorAll("[data-remove-stage]").forEach(b=>b.onclick=()=>{state.stages.splice(Number(b.dataset.removeStage),1);store();render()});
      section.querySelectorAll("[data-remove-position]").forEach(b=>b.onclick=()=>{const [i,j]=b.dataset.removePosition.split(":").map(Number);state.stages[i].items.splice(j,1);store();render()});
      section.querySelectorAll("[data-add-position]").forEach(b=>b.onclick=()=>{const i=Number(b.dataset.addPosition),row=section.querySelector('[data-stage="'+i+'"]'),name=row.querySelector("[data-pname]").value.trim(),qty=Number(row.querySelector("[data-pqty]").value),rateValue=row.querySelector("[data-prate]").value,rate=Number(rateValue);if(!name||!(qty>0)||!Number.isFinite(qty)||rateValue===""||!Number.isFinite(rate)||rate<0){message=t("wrong");render();return}state.stages[i].items.push({name,qty,unit:row.querySelector("[data-punit]").value,rate});store();render()});
    }
  }
  render();root.prepend(section);
  new MutationObserver(()=>{if(!root.contains(section))root.prepend(section)}).observe(root,{childList:true});
});
