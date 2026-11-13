
const HANOON_AUTH = {
  mode: "login",
  initialized: false
};

const authElement = (selector) => document.querySelector(selector);

function setAuthMessage(message, type = "error") {
  const element = authElement("#authMessage");
  if (!element) return;

  element.textContent = message;
  element.dataset.type = type;
}

function switchAuthMode(mode) {
  if (!["login", "register"].includes(mode)) return;

  HANOON_AUTH.mode = mode;

  const loginForm = authElement("#loginForm");
  const registerForm = authElement("#registerForm");

  if (loginForm) loginForm.hidden = mode !== "login";
  if (registerForm) registerForm.hidden = mode !== "register";

  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.authTab === mode
    );
  });

  setAuthMessage("");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password) {
  return password.length >= 8;
}

function setupAuth() {
  if (HANOON_AUTH.initialized) return;
  HANOON_AUTH.initialized = true;

  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.addEventListener("click", () => {
      switchAuthMode(button.dataset.authTab);
    });
  });

  const loginForm = authElement("#loginForm");
  const registerForm = authElement("#registerForm");

  if (loginForm) {
    loginForm.addEventListener("submit", event => {
      event.preventDefault();

      const email = authElement("#loginEmail")?.value.trim() || "";
      const password = authElement("#loginPassword")?.value || "";

      if (!isValidEmail(email)) {
        setAuthMessage("اكتب بريدًا إلكترونيًا صحيحًا");
        return;
      }

      if (!password) {
        setAuthMessage("اكتب كلمة المرور");
        return;
      }

      setAuthMessage(
        "واجهة الدخول جاهزة، وسيتم تفعيل تسجيل الدخول الحقيقي بعد ربط قاعدة البيانات.",
        "info"
      );
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", event => {
      event.preventDefault();

      const name = authElement("#registerName")?.value.trim() || "";
      const email = authElement("#registerEmail")?.value.trim() || "";
      const password = authElement("#registerPassword")?.value || "";

      if (name.length < 2) {
        setAuthMessage("اكتب اسمًا مكوّنًا من حرفين على الأقل");
        return;
      }

      if (!isValidEmail(email)) {
        setAuthMessage("اكتب بريدًا إلكترونيًا صحيحًا");
        return;
      }

      if (!validatePassword(password)) {
        setAuthMessage("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
        return;
      }

      setAuthMessage(
        "بيانات التسجيل سليمة، وسيتم إنشاء الحساب الحقيقي بعد ربط قاعدة البيانات.",
        "info"
      );
    });
  }

  switchAuthMode("login");
}

setupAuth();
