
"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.pathname;

  // На главной странице кнопка не нужна
  if (path === "/" || path.endsWith("/index.html")) return;

  // Не создаём дубликаты
  if (document.querySelector(".cg-back-button")) return;

  const style = document.createElement("style");

  style.textContent = `
    .cg-back-button {
      position: fixed !important;
      inset: auto auto 18px 18px !important;
      z-index: 99999 !important;

      box-sizing: border-box !important;
      display: inline-flex !important;
      flex: 0 0 auto !important;
      align-items: center !important;
      justify-content: center !important;
      gap: 8px !important;

      width: fit-content !important;
      min-width: 0 !important;
      max-width: 150px !important;
      height: auto !important;
      min-height: 0 !important;

      margin: 0 !important;
      padding: 10px 14px !important;

      border: 1px solid rgba(165,180,200,.35) !important;
      border-radius: 10px !important;

      background: rgba(22,27,35,.92) !important;
      color: #edf1f6 !important;

      font: 500 13px/1.2 Arial, sans-serif !important;
      letter-spacing: 0 !important;
      text-transform: none !important;
      white-space: nowrap !important;

      box-shadow: 0 8px 24px rgba(0,0,0,.28) !important;

      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);

      cursor: pointer !important;
      transform: none !important;
    }

    .cg-back-button:hover {
      border-color: rgba(238,161,108,.75) !important;
      background: rgba(37,45,56,.98) !important;
    }

    .cg-back-button:focus-visible {
      outline: 2px solid #eea16c !important;
      outline-offset: 3px;
    }

    .cg-back-button svg {
      display: block !important;
      flex: 0 0 16px !important;
      width: 16px !important;
      height: 16px !important;
      stroke: #eea16c;
    }

    @media (max-width: 600px) {
      .cg-back-button {
        inset: auto auto 14px 14px !important;
        padding: 9px 12px !important;
      }
    }
  `;

  document.head.appendChild(style);

  const button = document.createElement("button");

  button.type = "button";
  button.className = "cg-back-button";

  button.setAttribute(
    "aria-label",
    "Вернуться на предыдущую страницу"
  );

  button.innerHTML = `
    <svg viewBox="0 0 24 24"
         fill="none"
         stroke-width="2"
         stroke-linecap="round"
         stroke-linejoin="round"
         aria-hidden="true">
      <path d="M19 12H5"></path>
      <path d="m12 19-7-7 7-7"></path>
    </svg>
    <span>Назад</span>
  `;

  button.addEventListener("click", () => {
    let fromThisSite = false;

    try {
      fromThisSite =
        new URL(document.referrer).origin ===
        window.location.origin;
    } catch (_) {
      fromThisSite = false;
    }

    if (fromThisSite && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign("/");
    }
  });

  document.body.appendChild(button);
});
