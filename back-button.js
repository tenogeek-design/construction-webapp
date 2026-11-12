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
 function goBack(){
  const ref=safeRef();
  if(workspace){location.assign(destination);return}
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
  if(!auth){
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
