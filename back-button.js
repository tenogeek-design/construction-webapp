"use strict";
/* CONSTRUCTION GROUP — unified in-app navigation.
   No auth changes, no browser history hijacking, no cross-role access. */
(() => {
 const path=location.pathname;
 const publicHome=path==="/"||path==="/index.html";
 const auth=/\/(login|register)\.html$/.test(path);
 const workspace=/\/project-workspace\.html$/.test(path);
 const owner=/\/admin\.html$/.test(path);
 const foreman=/\/foreman\.html$/.test(path);
 const client=/\/client\.html$/.test(path);
 if(publicHome)return;
 const home=owner?"/admin.html#dashboard":foreman?"/foreman.html#home":client?"/client.html":auth?"/":workspace?"/foreman.html#projects":"/";
 const isInternal=url=>{try{const u=new URL(url,location.href);return u.origin===location.origin&&u.pathname!==location.pathname||u.origin===location.origin&&u.hash!==location.hash}catch{return false}};
 const safeRef=()=>{try{const u=new URL(document.referrer);return u.origin===location.origin?u:null}catch{return null}};
 function workspaceHome(){
  const from=new URLSearchParams(location.search).get("from");
  if(from==="owner")return "/admin.html#projects";
  if(from==="foreman")return "/foreman.html#projects";
  const ref=safeRef();
  if(ref?.pathname==="/admin.html")return "/admin.html#projects";
  if(ref?.pathname==="/foreman.html")return "/foreman.html#projects";
  return "/foreman.html#projects";
 }
 const destination=workspace?workspaceHome():home;
 // Remember OWNER sections, so Back returns to the previous in-app tab.
 const ownerSections=new Set(["dashboard","requests","projects","tasks","employees","time","payroll","finance"]);
 let ownerCurrent=ownerSections.has(location.hash.slice(1))?location.hash.slice(1):"dashboard";
 const ownerHistory=[];
 if(owner){
  window.addEventListener("hashchange",()=>{
   const next=location.hash.slice(1);
   if(!ownerSections.has(next)||next===ownerCurrent)return;
   ownerHistory.push(ownerCurrent);
   if(ownerHistory.length>25)ownerHistory.shift();
   ownerCurrent=next;
  });
 }
 function goBack(){
  const ref=safeRef();
  if(workspace){location.assign(destination);return}
  if(owner){
   const previous=ownerHistory.pop();
   if(previous){
    // hashchange will fire; avoid adding the current tab again.
    ownerCurrent=previous;
    location.hash=previous;
    return;
   }
   if(location.hash!=="#dashboard"){ownerCurrent="dashboard";location.hash="dashboard";return}
   location.assign("/");
   return;
  }
  if(ref&&isInternal(ref.href)&&history.length>1){history.back();return}
  if(owner&&location.hash&&location.hash!=="#dashboard"){location.hash="dashboard";return}
  if(foreman&&location.hash&&location.hash!=="#home"){location.hash="home";return}
  if(client&&location.hash&&location.hash!=="#requests"){location.hash="requests";return}
  location.assign(destination);
 }
 function setup(){
  if(document.getElementById("cgNav2026"))return;
  const bar=document.createElement("nav");bar.id="cgNav2026";bar.setAttribute("aria-label","Навигация CONSTRUCTION GROUP");
  const back=document.createElement("button");back.type="button";back.className="cg-nav-back";back.innerHTML='<span aria-hidden="true">←</span> Назад';back.addEventListener("click",goBack);
  bar.append(back);
  if(!auth&&!owner){
   const homeLink=document.createElement("a");homeLink.className="cg-nav-home";homeLink.href=destination;
   homeLink.textContent=workspace?"Все объекты":"Главная";bar.append(homeLink);
  }
  const brand=document.createElement("span");brand.className="cg-nav-identity";brand.textContent="CONSTRUCTION GROUP";bar.append(brand);
  document.body.prepend(bar);
  if(workspace){
   const existing=document.getElementById("back");
   if(existing){existing.href=destination;existing.hidden=true}
  }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();
