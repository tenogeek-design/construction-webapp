
document.addEventListener("DOMContentLoaded", () => {
  // На главной странице кнопка не нужна
  const path = window.location.pathname;

  if (path === "/" || path.endsWith("/index.html")) {
    return;
  }

  if (document.querySelector(".cg-back-button")) {
    return;
  }

  const style = document.createElement("style");

  style.textContent = `
    .cg-back-button {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 99999;

      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;

      padding: 10px 15px;
      border: 1px solid rgba(160, 175, 195, 0.3);
      border-radius: 10px;

      background: rgba(24, 29, 38, 0.78);
      color: #e8edf4;

      font-family: inherit;
      font-size: 13px;
      font-weight: 500;

      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);

      cursor: pointer;
      transition: background 0.2s, border-color 0.2s;
    }

    .cg-back-button svg {
      width: 16px;
      height: 16px;
      stroke: #eea16c;
    }

    .cg-back-button:hover {
      background: rgba(43, 51, 63, 0.96);
      border-color: rgba(238, 161, 108, 0.6);
    }

    .cg-back-button:focus-visible {
      outline: 2px solid #eea16c;
      outline-offset: 3px;
    }

    @media (max-width: 600px) {
      .cg-back-button {
        bottom: 14px;
        left: 14px;
        padding: 9px 13px;
        font-size: 12px;
      }
    }
  `;

  document.head.appendChild(style);

  const button = document.createElement("button");

  button.type = "button";
  button.className = "cg-back-button";
  button.setAttribute("aria-label", "Назад");

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
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  });

  document.body.appendChild(button);
});
