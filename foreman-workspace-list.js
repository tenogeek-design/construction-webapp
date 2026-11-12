"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const root=document.getElementById("cgForemanProjects");
  if(!root||document.getElementById("cgAssignedProjects"))return;
  const host=document.createElement("section");host.id="cgAssignedProjects";
  const style=document.createElement("style");
  style.textContent=
  "#cgAssignedProjects{font-family:Manrope,Arial,sans-serif;padding:0;margin:0 0 23px;color:#f1f6fb}"+
  "#cgAssignedProjects *{box-sizing:border-box}"+
  "#cgAssignedProjects .cap{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}"+
  "#cgAssignedProjects .cap h3{font-size:21px;margin:0}"+
  "#cgAssignedProjects .small{font-size:12px;color:#b4c9dc;line-height:1.7}"+
  "#cgAssignedProjects .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:13px}"+
  "#cgAssignedProjects .project{display:block;text-decoration:none;background:linear-gradient(125deg,#253d53,#203044);border:1px solid #54728c;border-radius:15px;padding:19px;color:#f8fbff;box-shadow:0 13px 28px #0003}"+
  "#cgAssignedProjects .project:hover{border-color:#f0a671;background:linear-gradient(125deg,#31526c,#24374e)}"+
  "#cgAssignedProjects .project h4{font-size:16px;margin:3px 0 9px;color:#fff}"+
  "#cgAssignedProjects .project .name{font-size:10px;letter-spacing:1.3px;color:#f1aa7b}"+
  "#cgAssignedProjects .project .foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:17px;font-weight:800;font-size:12px;color:#92c4ed}"+
  "#cgAssignedProjects button{background:#315779;border:1px solid #698bb0;border-radius:10px;color:white;padding:10px 13px;cursor:pointer;font:700 12px Manrope,Arial}"+
  "#cgAssignedProjects .empty{border:1px dashed #688199;background:#25374a;border-radius:12px;padding:18px;color:#c3d1df;font-size:13px;line-height:1.7}"+
  "#cgAssignedProjects .project-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}"+
  "#cgAssignedProjects .project-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:40px;padding:9px 13px;border-radius:10px;border:1px solid #789ab7;background:#345c7d;color:#fff;text-decoration:none;font-weight:800;font-size:12px}"+
  "#cgAssignedProjects .project-actions a.report{background:#b85c28;border-color:#f2a46f;color:#fff}"+
  "#cgAssignedProjects .project-actions a:hover{filter:brightness(1.12)}";
  document.head.append(style);
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const status={planned:"Запланирован",active:"В работе",paused:"Приостановлен",completed:"Завершён",cancelled:"Отменён"};
  function draw(items,error){
    host.innerHTML='<div class="cap"><div><h3>Мои назначенные объекты</h3><div class="small">Открой объект, чтобы увидеть утверждённые этапы, позиции и выполнение.</div></div><button type="button" id="cgWorkRefresh">↻ Обновить</button></div>'+
    (error?'<div class="empty">'+esc(error)+'</div>':items.length?
      '<div class="grid">'+items.map(p=>'<article class="project"><span class="name">CONSTRUCTION GROUP · OBIEKT</span><h4>'+esc(p.name)+'</h4><div class="small">'+esc([p.city,p.street].filter(Boolean).join(", "))+'</div><div class="foot"><span>'+esc(status[p.status]||p.status)+'</span></div><div class="project-actions"><a href="/project-workspace.html?from=foreman&id='+encodeURIComponent(p.id)+'">Карточка объекта</a><a class="report" href="/project-workspace.html?from=foreman&id='+encodeURIComponent(p.id)+'#reports">+ Рабочий день</a></div></article>').join("")+'</div>':
      '<div class="empty">У тебя пока нет назначенных объектов. После утверждения OWNER должен назначить бригадира и бригаду. Затем объект появится здесь.</div>');
    host.querySelector("#cgWorkRefresh").onclick=load;
  }
  async function load(){
    draw([],"Загружаем объекты...");
    try{
      if(!window.supabase)throw Error("Ошибка системы авторизации");
      const db=window.supabase.createClient("https://yepxskcfxyiyqqhmdpve.supabase.co",
        "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH");
      const {data:{session}}=await db.auth.getSession();
      if(!session?.access_token)throw Error("Войди в кабинет бригадира.");
      const response=await fetch("/api/project-workspace",{headers:{"Authorization":"Bearer "+session.access_token}});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(result.error||"Не удалось загрузить объекты.");
      draw(result.items||[],null);
    }catch(e){draw([],e.message||"Ошибка загрузки");}
  }
  function mount(){if(!root.contains(host))root.prepend(host)}
  mount();
  new MutationObserver(mount).observe(root,{childList:true});
  load();
});