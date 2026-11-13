
const HANOON = {
  history: [],
  currentPage: "chats",
  splashDuration: 5000
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const splash = $("#splashScreen");
const appRoot = $("#appRoot");
const authScreen = $("#authScreen");
const mainScreen = $("#mainScreen");

function showScreen(screen) {
  [authScreen, mainScreen].forEach(item => {
    if (item) item.hidden = item !== screen;
  });
}

function showToast(message) {
  const root = $("#toastRoot");
  if (!root) return;

  root.replaceChildren();

  const toast = document.createElement("div");
  toast.className = "custom-toast";
  toast.textContent = message;
  root.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode === root) toast.remove();
  }, 3000);
}

function showPage(page, saveHistory = true) {
  const target = $(`[data-page-content="${page}"]`);
  if (!target) return;

  if (saveHistory && HANOON.currentPage !== page) {
    HANOON.history.push(HANOON.currentPage);
  }

  HANOON.currentPage = page;

  $$("[data-page-content]").forEach(section => {
    const active = section.dataset.pageContent === page;
    section.hidden = !active;
    section.classList.toggle("active", active);
  });

  $$("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === page
    );
  });

  const pageContainer = $("#pageContainer");
  const settingsPage = $("#settingsPage");

  if (pageContainer) pageContainer.hidden = page === "settings";
  if (settingsPage) settingsPage.hidden = page !== "settings";
}

function goBack() {
  if (HANOON.history.length) {
    const previous = HANOON.history.pop();
    showPage(previous, false);
  } else {
    showToast("أنت في الصفحة الرئيسية");
  }
}

function setupNavigation() {
  $$("[data-page]").forEach(button => {
    button.addEventListener("click", () => {
      showPage(button.dataset.page);
    });
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") goBack();
  });

  history.replaceState({ hanoon: true }, "");
  history.pushState({ hanoon: true }, "");

  window.addEventListener("popstate", () => {
    goBack();
    history.pushState({ hanoon: true }, "");
  });
}

function setupAuthTabs() {
  $$("[data-auth-tab]").forEach(button => {
    button.addEventListener("click", () => {
      const mode = button.dataset.authTab;

      $("#loginForm").hidden = mode !== "login";
      $("#registerForm").hidden = mode !== "register";

      $$("[data-auth-tab]").forEach(tab => {
        tab.classList.toggle("active", tab === button);
      });

      $("#authMessage").textContent = "";
    });
  });
}

function startApp() {
  if (splash) splash.hidden = true;
  if (appRoot) appRoot.hidden = false;

  showScreen(authScreen);
}

function initializeHanoon() {
  setupAuthTabs();
  setupNavigation();

  setTimeout(startApp, HANOON.splashDuration);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeHanoon);
} else {
  initializeHanoon();
}

window.HANOON_APP = {
  showPage,
  goBack,
  showToast
};
