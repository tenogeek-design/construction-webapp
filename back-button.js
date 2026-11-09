
document.addEventListener("DOMContentLoaded", () => {
  // На главной странице кнопка не нужна
  const path = window.location.pathname;

  if (path === "/" || path.endsWith("/index.html")) {
    return;
  }

  const style = document.createElement("style");

  style.textContent = `
    .cg-back-button {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 22px;
      border: 1px solid rgba(238, 153, 84, 0.65);
      border-radius: 12px;
      background: rgba(22, 27, 35, 0.92);
      color: #f5f5f5;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      backdrop-filter: blur(14px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.3);
      transition: 0.2s;
    }

    .cg-back-button:hover {
      background: rgba(55, 65, 80, 0.96);
      border-color: #f4a15f;
      transform: translateX(-3px);
    }

    .cg-back-button span {
      color: #f4a15f;
      font-size: 20px;
    }

    @media (max-width: 600px) {
      .cg-back-button {
        bottom: 16px;
        left: 16px;
        padding: 11px 17px;
      }
    }
  `;

  document.head.appendChild(style);

  const button = document.createElement("button");

  button.type = "button";
  button.className = "cg-back-button";
  button.innerHTML = "<span>←</span> Назад";

  button.addEventListener("click", () => {
    let sameSite = false;

    try {
      sameSite =
        new URL(document.referrer).origin ===
        window.location.origin;
    } catch (error) {
      sameSite = false;
    }

    if (sameSite && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "/";
    }
  });

  document.body.appendChild(button);
});
