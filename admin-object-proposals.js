
"use strict";
document.addEventListener("DOMContentLoaded",()=>{
  const host=document.getElementById("projects");
  if(!host||!window.supabase)return;
  const db=window.supabase.createClient("https://yepxskcfxyiyqqhmdpve.supabase.co",
    "sb_publishable_2C4bPGasaBUDx-GJ_8ibDA_ct7LUZTH");
  const box=document.createElement("section");
  box.id="cg-owner-proposals";
  box.style.cssText="background:#182635;border:1px solid #4f6a83;border-radius:16px;padding:20px;margin:20px 0;color:#eff5fc";
  box.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center"><div><h3 style="margin:0">Новые объекты от бригадиров</h3><p style="color:#b4c7d8;font-size:12px">Проверка этапов, объёмов и цены перед активацией объекта</p></div><button id="cg-review-refresh" type="button">Обновить заявки</button></div><div id="cg-review-message" style="font-size:12px;color:#b2c7da;margin:8px 0"></div><div id="cg-review-list"></div>';
  const welcome=host.querySelector(".welcome");
  if(welcome)welcome.after(box);else host.prepend(box);
  const message=box.querySelector("#cg-review-message"),list=box.querySelector("#cg-review-list");
  const money=n=>new Intl.NumberFormat("pl-PL",{style:"currency",currency:"PLN"}).format(Number(n||0));
  const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  async function api(method,body){
    const {data:{session}}=await db.auth.getSession();
    if(!session?.access_token)throw Error("Войдите как OWNER");
    const r=await fetch("/api/foreman-objects?scope=all",{
      method,headers:{"Authorization":"Bearer "+session.access_token,...(body?{"Content-Type":"application/json"}:{})},
      ...(body?{body:JSON.stringify(body)}:{})
    });
    const data=await r.json().catch(()=>({}));
    if(!r.ok)throw Error(data.error||"Server error");
    return data;
  }
  async function load(){
    message.textContent="Загрузка...";
    try{
      const data=await api("GET");
      const items=data.items||[];
      const pending=items.filter(p=>p.status==="pending");
      message.textContent="Ожидают решения: "+pending.length+" · всего заявок: "+items.length;
      list.innerHTML=pending.length?pending.map(p=>{
        const stages=Array.isArray(p.stages)?p.stages:[];
        return '<article style="background:#23374a;border:1px solid #476380;border-radius:12px;padding:16px;margin-top:12px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><div><strong>'+esc(p.name)+'</strong><p style="color:#adc4d9;font-size:12px">'+esc(p.city)+' · '+esc(p.address)+'</p></div><strong style="color:#f3ab75;font-size:21px">'+money(p.estimated_total)+'</strong></div><details><summary style="cursor:pointer;padding:8px 0">Этапы и позиции ('+stages.length+')</summary>'+stages.map(s=>'<div style="margin:9px 0;padding:9px;background:#192b3b;border-radius:9px"><b>'+esc(s.name)+'</b>'+s.items.map(x=>'<div style="font-size:12px;padding:6px 0;color:#c6d8e9">'+esc(x.name)+' · '+esc(x.qty)+' '+esc(x.unit)+' × '+money(x.rate)+'</div>').join("")+'</div>').join("")+'</details><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:13px"><button type="button" data-review="'+esc(p.id)+'" data-decision="approved">Утвердить объект</button><button type="button" data-review="'+esc(p.id)+'" data-decision="rejected" style="background:#513240">Отклонить</button></div></article>';
      }).join(""):'<p style="color:#aabbcc">Новых заявок пока нет.</p>';
      list.querySelectorAll("[data-review]").forEach(button=>button.onclick=async()=>{
        const decision=button.dataset.decision;
        let comment="";
        if(decision==="rejected"){comment=prompt("Укажи причину отклонения:")||"";if(!comment.trim())return;}
        if(decision==="approved"&&!confirm("Утвердить объект? Он будет создан как запланированный в базе."))return;
        for(const b of list.querySelectorAll("button"))b.disabled=true;
        try{
          await api("POST",{action:"review",proposalId:button.dataset.review,decision,comment});
          await load();
          if(decision==="approved")document.getElementById("projectsRefreshBtn")?.click();
        }catch(e){message.textContent="Ошибка: "+e.message;for(const b of list.querySelectorAll("button"))b.disabled=false;}
      });
    }catch(e){message.textContent="Не удалось загрузить заявки: "+e.message;list.replaceChildren();}
  }
  box.querySelector("#cg-review-refresh").onclick=load;
  // Do not query until user opens the relevant OWNER section.
  let opened=false;
  const observer=new MutationObserver(()=>{
    if(getComputedStyle(host).display!=="none"&&!opened){opened=true;load();}
  });
  observer.observe(host,{attributes:true,attributeFilter:["style"]});
  if(getComputedStyle(host).display!=="none"){opened=true;load();}
});
