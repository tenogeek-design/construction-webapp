"use strict";

document.addEventListener("DOMContentLoaded", () => {
  // Current date
  const dateElement = document.getElementById("currentDate");

  if (dateElement) {
    dateElement.textContent = new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());
  }

  // Sidebar navigation
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      navItems.forEach((link) => {
        link.classList.remove("active");
      });

      item.classList.add("active");
    });
  });

  // Demo mode notice
  console.info("CONSTRUCTION GROUP ADMIN");
  console.info("Version 1.0 — Interface demo");
  console.info("Database connection: not configured");
});
