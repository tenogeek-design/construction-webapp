"use strict";

// Visual navigation only. Does not change permissions or database records.
document.addEventListener("DOMContentLoaded", () => {
  const backButton = document.getElementById("ownerBackBtn");
  const sections = new Set(
    [...document.querySelectorAll(".dashboard-section")].map(el => el.id)
  );
  const navLinks = [...document.querySelectorAll('a.nav-item[href^="#"]')];
  const historyStack = [];
  let currentSection = sections.has(location.hash.slice(1))
    ? location.hash.slice(1)
    : "dashboard";
  let goingBack = false;

  function navTo(section) {
    const link = navLinks.find(a => a.getAttribute("href") === "#" + section);
    if (link) link.click();
  }

  document.addEventListener("click", event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    const target = link.getAttribute("href").slice(1);
    if (!sections.has(target)) return;

    if (link.classList.contains("owner-quick") || link.classList.contains("brand")) {
      event.preventDefault();
      navTo(target);
      return;
    }

    if (target !== currentSection) {
      if (!goingBack) historyStack.push(currentSection);
      currentSection = target;
    }

    if (link.dataset.focus === "brigadesTable") {
      setTimeout(() => {
        document.getElementById("brigadesTable")?.scrollIntoView({
          behavior: "smooth", block: "center"
        });
      }, 250);
    }
  }, true);

  backButton?.addEventListener("click", () => {
    const previous = historyStack.pop();
    if (previous) {
      goingBack = true;
      navTo(previous);
      goingBack = false;
    } else if (currentSection !== "dashboard") {
      navTo("dashboard");
    } else {
      location.href = "/";
    }
  });
});
