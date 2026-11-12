"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const SUPABASE_URL="https://yepxskcfxyiyqqhmdpve.supabase.co";
  const PUBLISHABLE_KEY="sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH";
  const BUCKET="cg-daily-reports";
  const db=window.supabase?.createClient(SUPABASE_URL,PUBLISHABLE_KEY);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN"}).format(Number(n||0));
  const num=n=>new Intl.NumberFormat("pl-PL",{maximumFractionDigits:2}).format(Number(n||0));
  const statusNames={draft:"Черновик",submitted:"На проверке",approved:"Утверждён",
    rejected:"Отклонён",changes_requested:"Вернуть на исправление"};
  const cashNames={none:"Без запроса",pending:"Ожидает решения",approved:"Согласовано",
    rejected:"Не согласовано"};
  const historyNames={draft_saved:"Черновик сохранён",submitted:"Отправлен на проверку",
    work_approved:"Работы утверждены",work_returned:"Возвращён на исправление",
    work_rejected:"Работы отклонены",cash_authorized:"Сумма согласована",
    cash_rejected:"Запрос денег отклонён"};
  const localToday=()=>new Date().toLocaleDateString("sv-SE",{timeZone:"Europe/Warsaw"});
  let context=null,reports=[],current=null,files=[],busy=false;

  async function api(method,payload,params="") {
    if(!db)throw Error("Система авторизации не загружена");
    const {data:{session},error}=await db.auth.getSession();
    if(error||!session?.access_token)throw Error("Войди в свой кабинет ещё раз");
    const response=await fetch("/api/daily-work-reports"+params,{
      method,
      headers:{"Authorization":"Bearer "+session.access_token,
        ...(payload?{"Content-Type":"application/json"}:{})},
      ...(payload?{body:JSON.stringify(payload)}:{})
    });
    const answer=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(answer.error||"Ошибка сохранения на сервере");
    return answer;
  }
  function positionInfo(positionId){
    for(const s of context?.stages||[]){
      const p=(s.items||[]).find(x=>x.id===positionId);
      if(p)return {stage:s,position:p};
    }
    return null;
  }
  function selectOptions(stageId,selected){
    const stage=(context?.stages||[]).find(x=>x.id===stageId);
    return '<option value="">Выбери позицию</option>'+
      (stage?.items||[]).map(p=>'<option value="'+esc(p.id)+'"'+
      (p.id===selected?' selected':'')+'>'+esc(p.name)+' · '+
      num(p.quantity)+' '+esc(p.unit)+'</option>').join("");
  }
  function emptyForm(){
    return {reportId:null,workDate:localToday(),stageId:"",positionId:"",
      quantity:"",description:"",cashRequested:false,cashAmount:"",
      cashPurpose:"",existingPhotos:0};
  }
  function feedback(message,error=false){
    const el=$("cgDailyFeedback");
    if(el){el.textContent=message;el.classList.toggle("error",Boolean(error));}
  }
  function formHTML(){
    if(context.isOwner)return "";
    if(!["active","paused"].includes(context.projectStatus)){
      return '<div class="cg-alert">Создание отчётов доступно, когда OWNER запустит объект. Сейчас объект ещё не в работе.</div>';
    }
    const data=current||emptyForm();
    const stages=context.stages||[];
    return '<section class="cg-editor"><div class="cg-toolbar"><div><h3>'+
      (data.reportId?"Редактирование отчёта":"Новый отчёт по работам")+
      '</h3><div class="cg-muted">Объект → этап → позиция → объём → фотографии. Денежный запрос необязателен.</div></div>'+
      (data.reportId?'<button type="button" id="cgNewReport">+ Новый отчёт</button>':"")+
      '</div><div class="cg-fields" style="margin-top:17px">'+
      '<label>Дата выполнения<input type="date" id="cgWorkDate" value="'+esc(data.workDate)+'" required></label>'+
      '<label>Этап<select id="cgStage"><option value="">Выбери этап</option>'+
      stages.map(s=>'<option value="'+esc(s.id)+'"'+(data.stageId===s.id?' selected':'')+'>'+
      esc(s.name)+'</option>').join("")+'</select></label>'+
      '<label class="cg-wide">Позиция работ<select id="cgPosition">'+
      selectOptions(data.stageId,data.positionId)+'</select></label>'+
      '<label>Выполненный объём<input type="number" step="0.01" min="0.01" max="1000000" id="cgQuantity" value="'+esc(data.quantity)+'" placeholder="Например, 20"></label>'+
      '<label>Фото выполненных работ<input type="file" id="cgPhotos" accept="image/jpeg,image/png,image/webp" multiple></label>'+
      '<label class="cg-wide">Описание и примечания<textarea id="cgDescription" maxlength="2000" placeholder="Что сделали, особенности, замечания...">'+esc(data.description)+'</textarea></label></div>'+
      '<div class="cg-files" id="cgFiles">'+
        (data.existingPhotos?'Уже прикреплено: '+data.existingPhotos+' фото. ':'')+
        'Можно добавить до 50 фото, каждое до 5 МБ (JPG, PNG, WEBP).'+
      '</div>'+
      '<section class="cg-cash"><label class="cg-checkline"><input type="checkbox" id="cgCashChecked"'+
       (data.cashRequested?' checked':'')+'>Отправить OWNER отдельный запрос денег</label>'+
       '<p class="cg-muted">Необязательный запрос. Его согласование не является выплатой и не создаёт расход.</p>'+
       '<div class="cg-fields" id="cgCashFields"'+(!data.cashRequested?' hidden':'')+'>'+
       '<label>Запрашиваемая сумма, zł<input id="cgCashAmount" type="number" min="0.01" step="0.01" value="'+esc(data.cashAmount)+'" placeholder="Например, 500"></label>'+
       '<label>Назначение суммы<input id="cgCashPurpose" maxlength="500" value="'+esc(data.cashPurpose)+'" placeholder="На что нужны деньги"></label></div></section>'+
       '<div class="cg-actions"><button type="button" id="cgSaveDraft">Сохранить черновик</button>'+
       '<button type="button" id="cgSendReport" class="cg-primary"'+
       (context.projectStatus!=="active"?' disabled title="Объект пока не активен"':'')+
       '>Отправить OWNER</button></div>'+
       '<div class="cg-feedback" id="cgDailyFeedback" role="status"></div></section>';
  }
  function cardHTML(r){
    const work=r.items||[];
    const first=work[0]?positionInfo(work[0].position_id):null;
    const lineNames=work.map(i=>{
      const p=positionInfo(i.position_id)?.position;
      return '<div class="cg-line"><span>'+esc(p?.name||"Позиция")+
         '</span><b>'+num(i.quantity)+' '+esc(p?.unit||"")+'</b></div>';
    }).join("");
    const editAllowed=!context.isOwner&&["draft","rejected","changes_requested"].includes(r.status);
    const sent=r.status==="submitted"&&context.isOwner;
    const cashPending=context.isOwner&&r.status==="approved"&&r.cash_status==="pending";
    return '<article class="cg-report" id="cgCard-'+esc(r.id)+'">'+
      '<div class="cg-report-top"><div><strong>'+
      esc(first?.stage?.name||"Отчёт по объекту")+'</strong>'+
      '<div class="cg-muted">'+esc(r.work_date)+' · '+(r.photoCount||0)+' фото</div>'+
      '</div><span class="cg-status '+esc(r.status)+'">'+esc(statusNames[r.status]||r.status)+'</span></div>'+
      '<div class="cg-lines">'+lineNames+'</div>'+
      (r.description?'<div class="cg-description">'+esc(r.description)+'</div>':"")+
      (r.review_note?'<div class="cg-alert">Комментарий OWNER: '+esc(r.review_note)+'</div>':"")+
      (r.cash_requested?'<div class="cg-cash"><div class="cg-line"><span>Запрос денег: '+esc(r.cash_purpose||"")+
        '</span><b>'+money(r.cash_requested_amount)+'</b></div>'+
        '<div class="cg-muted">Статус: '+esc(cashNames[r.cash_status]||r.cash_status)+
        (r.cash_status==="approved"?' · Одобрено: '+money(r.cash_approved_amount):"")+
        (r.cash_note?' · '+esc(r.cash_note):"")+'</div></div>':"")+
      '<div class="cg-actions">'+
      '<button data-details="'+esc(r.id)+'" type="button">Фотографии и история</button>'+
      (editAllowed?'<button data-edit="'+esc(r.id)+'" type="button" class="cg-primary">Продолжить / исправить</button>':"")+
      (sent?'<button class="cg-primary" data-review="approve" data-report="'+esc(r.id)+'">Утвердить работы</button>'+
          '<button data-review="return" data-report="'+esc(r.id)+'">Вернуть на исправление</button>'+
          '<button class="cg-danger" data-review="reject" data-report="'+esc(r.id)+'">Отклонить</button>':"")+
      (cashPending?'<button class="cg-primary" data-cash="approve" data-report="'+esc(r.id)+'">Согласовать сумму</button>'+
          '<button class="cg-danger" data-cash="reject" data-report="'+esc(r.id)+'">Отклонить запрос</button>':"")+
      '</div><div class="cg-detail" id="cgDetail-'+esc(r.id)+'" hidden></div></article>';
  }
  function render(){
    if(!context||!$("cgDaily"))return;
    const pending=reports.filter(x=>x.status==="submitted").length;
    const cashPending=reports.filter(x=>x.cash_status==="pending"&&x.status==="approved").length;
    const sorted=reports.slice().sort((a,b)=>{
      const priority=x=>(x.status==="submitted"?3:x.status==="approved"&&x.cash_status==="pending"?2:0);
      return priority(b)-priority(a)||String(b.created_at).localeCompare(String(a.created_at));
    });
    const root=$("cgDaily");
    root.innerHTML='<div class="panel">'+
       '<div class="cg-toolbar"><div><h2>Рабочий день · отчёты</h2>'+
       '<div class="cg-muted">'+(context.isOwner?
       'Проверка выполненных работ и запросов денег по объекту. Утверждение отчёта не изменяет автоматически учётный объём.':
       'Отмечай фактический объём, прикладывай фото и отправляй отчёт OWNER.')+
       '</div></div><button id="cgRefresh" type="button">↻ Обновить</button></div>'+
       '<div class="cg-counts"><div class="cg-counter"><strong>'+reports.length+'</strong><span>Всего отчётов</span></div>'+
       '<div class="cg-counter"><strong>'+pending+'</strong><span>На проверке</span></div>'+
       '<div class="cg-counter"><strong>'+cashPending+'</strong><span>Денежные запросы на решении</span></div></div>'+
       formHTML()+
       '<h3 style="margin-top:22px">История по объекту</h3>'+
       (sorted.length?sorted.map(cardHTML).join(""):'<div class="cg-empty">Отчётов по этому объекту пока нет.</div>')+
       '</div>';
    $("cgRefresh")?.addEventListener("click",load);
    bindForm();
    root.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>edit(b.dataset.edit)));
    root.querySelectorAll("[data-details]").forEach(b=>b.addEventListener("click",()=>details(b.dataset.details)));
    root.querySelectorAll("[data-review]").forEach(b=>b.addEventListener("click",()=>reviewWork(b.dataset.report,b.dataset.review)));
    root.querySelectorAll("[data-cash]").forEach(b=>b.addEventListener("click",()=>reviewCash(b.dataset.report,b.dataset.cash)));
  }
  function bindForm(){
    $("cgNewReport")?.addEventListener("click",()=>{current=emptyForm();files=[];render();});
    $("cgStage")?.addEventListener("change",event=>{
      $("cgPosition").innerHTML=selectOptions(event.target.value,"");
    });
    $("cgCashChecked")?.addEventListener("change",event=>{
      $("cgCashFields").hidden=!event.target.checked;
    });
    $("cgPhotos")?.addEventListener("change",event=>{
      const newFiles=Array.from(event.target.files||[]);
      const existing=current?.existingPhotos||0;
      if(newFiles.length+existing>50){feedback("Максимум 50 фотографий на отчёт",true);files=[];return;}
      if(newFiles.some(f=>!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size<1||f.size>5242880)){
        feedback("Каждое фото: JPG/PNG/WEBP, до 5 МБ",true);files=[];return;
      }
      files=newFiles;
      const el=$("cgFiles");
      if(el)el.textContent="Выбрано новых фото: "+files.length+
        ", уже прикреплено: "+existing+".";
      feedback("");
    });
    $("cgSaveDraft")?.addEventListener("click",()=>persist(false));
    $("cgSendReport")?.addEventListener("click",()=>persist(true));
  }
  function readForm(){
    const q=Number($("cgQuantity")?.value);
    if(!$("cgStage")?.value||!$("cgPosition")?.value||!Number.isFinite(q)||q<=0)
      throw Error("Выбери этап, позицию и укажи объём больше нуля.");
    const cash=$("cgCashChecked")?.checked===true;
    if(cash&&(!($("cgCashAmount")?.value>0)||!$("cgCashPurpose")?.value.trim()))
      throw Error("Заполни сумму и назначение денежного запроса");
    return {projectId:context.projectId,reportId:current?.reportId||null,
      workDate:$("cgWorkDate").value,positionId:$("cgPosition").value,
      quantity:q,description:$("cgDescription").value,
      cashRequested:cash,cashAmount:cash?Number($("cgCashAmount").value):null,
      cashPurpose:cash?$("cgCashPurpose").value.trim():null};
  }
  async function persist(submit){
    if(busy)return;
    busy=true;
    const buttons=[$("cgSaveDraft"),$("cgSendReport")].filter(Boolean);
    buttons.forEach(x=>x.disabled=true);
    try{
      const fields=readForm();
      feedback("Сохраняем черновик...");
      const saved=await api("POST",{action:"save",...fields});
      fields.reportId=saved.reportId;
      if(!current)current=emptyForm();
      current.reportId=fields.reportId;
      for(let i=0;i<files.length;i++){
        const file=files[i];
        feedback("Загрузка фотографии "+(i+1)+" из "+files.length+"...");
        const signed=await api("POST",{action:"photo_url",reportId:fields.reportId,
          mimeType:file.type,size:file.size});
        const {error:uploadError}=await db.storage.from(BUCKET)
          .uploadToSignedUrl(signed.path,signed.token,file,{contentType:file.type});
        if(uploadError)throw Error("Фотография "+file.name+": "+uploadError.message);
        await api("POST",{action:"photo_complete",reportId:fields.reportId,
          path:signed.path,fileName:file.name});
        current.existingPhotos=(current.existingPhotos||0)+1;
        files.splice(i,1);i--;
      }
      if(submit){
        feedback("Отправляем отчёт на проверку...");
        await api("POST",{action:"submit",...fields});
      }
      current=null;files=[];
      await load();
      const msg=$("cgDailyFeedback");
      if(msg)feedback(submit?"Отчёт отправлен OWNER.":"Черновик сохранён.");
      else{
        const root=$("cgDaily");
        const note=document.createElement("p");note.className="cg-alert";
        note.textContent=submit?"Отчёт отправлен OWNER.":"Черновик сохранён.";
        root?.prepend(note);
      }
    }catch(e){feedback("Ошибка: "+(e.message||e),true);}
    finally{busy=false;buttons.forEach(x=>x.disabled=false);}
  }
  async function load(){
    if(!context)return;
    const id=context.projectId;
    try{
      const data=await api("GET",null,"?projectId="+encodeURIComponent(id));
      if(!context||context.projectId!==id)return;
      reports=data.items||[];
      render();
    }catch(e){
      const root=$("cgDaily");
      if(root)root.innerHTML='<div class="panel"><h2>Рабочий день</h2><div class="cg-alert">'+esc(e.message||e)+'</div>'+
        '<button type="button" id="cgRetry">Повторить</button></div>';
      $("cgRetry")?.addEventListener("click",load);
    }
  }
  async function edit(id){
    const r=reports.find(x=>x.id===id);if(!r)return;
    const item=r.items?.[0];const loc=positionInfo(item?.position_id);
    current={reportId:r.id,workDate:r.work_date,
      stageId:loc?.stage.id||"",positionId:item?.position_id||"",
      quantity:item?.quantity||"",description:r.description||"",
      cashRequested:r.cash_requested,cashAmount:r.cash_requested_amount||"",
      cashPurpose:r.cash_purpose||"",existingPhotos:r.photoCount||0};
    files=[];render();
    $("cgWorkDate")?.scrollIntoView({behavior:"smooth",block:"center"});
  }
  async function details(id){
    const wrap=$("cgDetail-"+id);if(!wrap||busy)return;
    if(!wrap.hidden){wrap.hidden=true;return;}
    wrap.hidden=false;wrap.textContent="Загружаем фотографии и историю...";
    try{
      const data=await api("GET",null,"?projectId="+encodeURIComponent(context.projectId)+
        "&reportId="+encodeURIComponent(id));
      wrap.innerHTML='<h3>Фотоотчёт ('+data.photos.length+' фото)</h3>'+
        (data.photos.length?'<div class="cg-photo-grid">'+data.photos.map(p=>
         p.url?'<a href="'+esc(p.url)+'" target="_blank" rel="noopener noreferrer" title="'+esc(p.original_name)+'">'+
          '<img src="'+esc(p.url)+'" alt="'+esc(p.original_name)+'" loading="lazy"></a>':
          '<span class="cg-muted">Фото временно недоступно</span>').join("")+'</div>':
          '<div class="cg-muted">Фотографий нет.</div>')+
        '<h3>История действий</h3><div class="cg-history">'+
        (data.history||[]).map(h=>'<div>'+esc(new Date(h.created_at).toLocaleString("ru-RU"))+
          ' · '+esc(historyNames[h.event]||h.event)+
          (h.details?.note?' — '+esc(h.details.note):"")+'</div>').join("")+
        '</div>';
    }catch(e){wrap.innerHTML='<div class="cg-alert">'+esc(e.message||e)+'</div>';}
  }
  async function reviewWork(id,action){
    if(busy)return;
    let note="";
    if(action!=="approve"){
      const entered=prompt(action==="return"?
        "Что бригадиру нужно исправить?":"Причина отклонения отчёта:");
      if(entered===null||!entered.trim())return;
      note=entered.trim();
    }else if(!confirm("Утвердить отчёт? Учётный объём и деньги этим действием не меняются."))return;
    busy=true;
    try{
      await api("POST",{action:"review_work",reportId:id,decision:action,note});
      await load();
    }catch(e){alert("Ошибка: "+(e.message||e));}
    finally{busy=false;}
  }
  async function reviewCash(id,decision){
    if(busy)return;
    const report=reports.find(x=>x.id===id);if(!report)return;
    let note="",amount=null;
    if(decision==="approve"){
      const answer=prompt("Какую сумму согласовать, zł?",String(report.cash_requested_amount||""));
      if(answer===null)return;
      amount=Number(answer.replace(",","."));
      if(!Number.isFinite(amount)||amount<=0){alert("Укажи сумму больше нуля");return;}
      if(Math.abs(amount-Number(report.cash_requested_amount))>0.009){
        const why=prompt("Почему меняешь сумму?");
        if(why===null||!why.trim())return;
        note=why.trim();
      }
      if(!confirm("Согласовать "+money(amount)+"? Это НЕ фактическая выплата и не списание из кассы."))return;
    }else{
      const why=prompt("Причина отказа в денежном запросе:");
      if(why===null||!why.trim())return;
      note=why.trim();
    }
    busy=true;
    try{
      await api("POST",{action:"review_cash",reportId:id,decision,amount,note});
      await load();
    }catch(e){alert("Ошибка: "+(e.message||e));}
    finally{busy=false;}
  }

  window.addEventListener("cg:project-workspace-ready",event=>{
    const detail=event.detail||{};
    if(!detail.projectId||!$("cgDaily"))return;
    if(!context||context.projectId!==detail.projectId){
      current=null;files=[];
    }
    context=detail;load();
  });
});