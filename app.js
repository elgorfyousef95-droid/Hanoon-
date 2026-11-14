
import { supabase } from "./supabase.js";

/* =========================================
   HANOON WORLD — APPLICATION CORE
   Startup / Authentication / Profile / Pages
========================================= */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const state = {
  user: null,
  session: null,
  profile: null,
  language: localStorage.getItem("hanoon_language") || "ar",
  authMode: "login",
  registerStep: 1,
  selectedAvatar: null,
  loading: false,
  currentPage: "home",
  games: [],
  wallet: null
};

const REGISTER_STEPS = [
  "بيانات الحساب",
  "البيانات الشخصية",
  "الصورة الشخصية",
  "مراجعة الحساب"
];

const TEXT = {
  ar: {
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    loading: "جارٍ التحميل...",
    invalidUsername: "اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو شرطة سفلية.",
    invalidPassword: "كلمة المرور يجب ألا تقل عن 8 أحرف.",
    passwordMismatch: "كلمتا المرور غير متطابقتين.",
    fullNameRequired: "اكتب الاسم الظاهر.",
    avatarRequired: "اختر صورة شخصية للمتابعة.",
    loginSuccess: "تم تسجيل الدخول بنجاح.",
    registerSuccess: "تم إنشاء الحساب بنجاح.",
    authError: "تعذر إتمام العملية. راجع البيانات وحاول مرة أخرى.",
    profileError: "تعذر حفظ بيانات الملف الشخصي.",
    noRooms: "لا توجد غرف متاحة حاليًا.",
    noGames: "لا توجد ألعاب نشطة حاليًا.",
    noStore: "لا توجد منتجات متاحة حاليًا.",
    noData: "لا توجد بيانات لعرضها حاليًا.",
    noWallet: "لم يتم العثور على محفظة لهذا الحساب.",
    comingSoon: "هذا القسم قيد التجهيز.",
    points: "النقاط",
    coins: "العملات",
    gems: "الجواهر",
    previous: "السابق",
    next: "التالي",
    createAccount: "إنشاء الحساب",
    uploadError: "تعذر رفع الصورة. حاول اختيار صورة أخرى.",
    logout: "تم تسجيل الخروج."
  },

  en: {
    login: "Sign in",
    register: "Create account",
    loading: "Loading...",
    invalidUsername: "Username must be 3–24 English letters, numbers or underscores.",
    invalidPassword: "Password must contain at least 8 characters.",
    passwordMismatch: "Passwords do not match.",
    fullNameRequired: "Please enter your display name.",
    avatarRequired: "Please choose a profile picture.",
    loginSuccess: "Signed in successfully.",
    registerSuccess: "Account created successfully.",
    authError: "Unable to complete the request. Check your details.",
    profileError: "Unable to save profile information.",
    noRooms: "No rooms are available yet.",
    noGames: "No active games are available yet.",
    noStore: "No products are available yet.",
    noData: "Nothing to display yet.",
    noWallet: "No wallet was found for this account.",
    comingSoon: "This section is being prepared.",
    points: "Points",
    coins: "Coins",
    gems: "Gems",
    previous: "Previous",
    next: "Next",
    createAccount: "Create account",
    uploadError: "Unable to upload the picture.",
    logout: "Signed out."
  }
};

const t = key => TEXT[state.language]?.[key] || key;

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

/* =========================================
   TOAST
========================================= */

function toast(message, type = "info") {
  const root = $("#toast-root");
  if (!root) return;

  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;

  if (type === "error") {
    item.style.borderColor = "rgba(255,100,127,.55)";
  }

  if (type === "success") {
    item.style.borderColor = "rgba(69,214,160,.55)";
  }

  root.appendChild(item);

  window.setTimeout(() => item.remove(), 3500);
}

/* =========================================
   LOADING OVERLAY
========================================= */

function setLoading(active, message = "") {
  const overlay = $("#loading-overlay");
  const label = $("#loading-message");

  if (!overlay) return;

  overlay.classList.toggle("hidden", !active);

  if (label && message) {
    label.textContent = message;
  }
}

/* =========================================
   SPLASH SCREEN
   Minimum visible duration = 5000ms
========================================= */

const splashStartedAt = performance.now();

function waitForSplashMinimum() {
  const elapsed = performance.now() - splashStartedAt;
  const remaining = Math.max(0, 5000 - elapsed);

  return new Promise(resolve => {
    window.setTimeout(resolve, remaining);
  });
}

function hideSplash() {
  const splash = $("#splash");

  if (!splash) return;

  splash.classList.add("hidden");
}

function showAuthentication() {
  hideSplash();

  $("#app")?.classList.add("hidden");
  $("#auth-screen")?.classList.remove("hidden");
}

function showApplication() {
  hideSplash();

  $("#auth-screen")?.classList.add("hidden");
  $("#app")?.classList.remove("hidden");
}

/* =========================================
   AUTHENTICATION SERVICE
========================================= */

function validUsername(username) {
  return /^[a-zA-Z0-9_]{3,24}$/.test(username);
}

function getReturnedSession(data) {
  if (data?.session?.access_token && data?.session?.refresh_token) {
    return data.session;
  }

  if (data?.access_token && data?.refresh_token) {
    return data;
  }

  return null;
}

async function authenticate(username, password, action) {
  const { data, error } = await supabase.functions.invoke(
    "hanoon-username-auth",
    {
      body: {
        action,
        username: username.trim().toLowerCase(),
        password
      }
    }
  );

  if (error) {
    throw new Error(data?.error || error.message || t("authError"));
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const session = getReturnedSession(data);

  if (!session) {
    throw new Error("لم يتم استلام جلسة تسجيل الدخول.");
  }

  const { data: result, error: sessionError } =
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

  if (sessionError) throw sessionError;

  return result.session;
}

/* =========================================
   AUTH TABS
========================================= */

function setAuthMode(mode) {
  state.authMode = mode;
  state.registerStep = 1;

  $$(".auth-tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.auth === mode);
  });

  $("#login-fields")?.classList.toggle("hidden", mode !== "login");
  $("#register-fields")?.classList.toggle("hidden", mode !== "register");

  $("#auth-title").textContent =
    mode === "login" ? "مرحبًا بعودتك" : "انضم إلى HANOON WORLD";

  $("#auth-subtitle").textContent =
    mode === "login"
      ? "سجّل دخولك لمتابعة عالمك"
      : "أنشئ حسابك وابدأ رحلتك";

  $("#auth-submit")?.classList.toggle("hidden", mode === "register");

  $("#auth-message").textContent = "";

  updateRegisterStep();
  updateAuthButton();
}

function updateAuthButton() {
  const button = $("#auth-submit");
  if (!button) return;

  button.textContent = t(
    state.authMode === "register" ? "register" : "login"
  );
}

$$(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    setAuthMode(tab.dataset.auth);
  });
});

/* =========================================
   PASSWORD VISIBILITY
========================================= */

document.addEventListener("click", event => {
  const button = event.target.closest("[data-password-toggle]");
  if (!button) return;

  const input = $("#" + button.dataset.passwordToggle);
  if (!input) return;

  input.type = input.type === "password" ? "text" : "password";
});

/* =========================================
   LOGIN
========================================= */

$("#auth-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (state.authMode !== "login" || state.loading) return;

  const username = $("#username")?.value.trim().toLowerCase();
  const password = $("#password")?.value;
  const message = $("#auth-message");
  const button = $("#auth-submit");

  if (!validUsername(username)) {
    message.textContent = t("invalidUsername");
    return;
  }

  if (!password || password.length < 8) {
    message.textContent = t("invalidPassword");
    return;
  }

  state.loading = true;
  message.textContent = "";
  button.disabled = true;
  button.textContent = t("loading");

  try {
    const session = await authenticate(username, password, "signin");

    await openApplication(session);

    toast(t("loginSuccess"), "success");

  } catch (error) {
    console.error("HANOON login:", error);
    message.textContent = error.message || t("authError");

  } finally {
    state.loading = false;
    button.disabled = false;
    updateAuthButton();
  }
});

/* =========================================
   REGISTRATION — FOUR STEPS
========================================= */

function getRegisterValues() {
  return {
    username: $("#register-username")?.value.trim().toLowerCase() || "",
    password: $("#register-password")?.value || "",
    confirmation: $("#register-password-confirm")?.value || "",
    fullName: $("#register-fullname")?.value.trim() || "",
    bio: $("#register-bio")?.value.trim() || "",
    avatar: state.selectedAvatar
  };
}

function showAuthMessage(message, isError = true) {
  const target = $("#auth-message");
  if (!target) return;

  target.textContent = message;
  target.style.color = isError ? "#ff8295" : "#42d6a4";
}

function validateRegisterStep(step) {
  const data = getRegisterValues();

  if (step === 1) {
    if (!validUsername(data.username)) {
      showAuthMessage(t("invalidUsername"));
      return false;
    }

    if (data.password.length < 8) {
      showAuthMessage(t("invalidPassword"));
      return false;
    }

    if (data.password !== data.confirmation) {
      showAuthMessage(t("passwordMismatch"));
      return false;
    }
  }

  if (step === 2 && !data.fullName) {
    showAuthMessage(t("fullNameRequired"));
    return false;
  }

  if (step === 3 && !data.avatar) {
    showAuthMessage(t("avatarRequired"));
    return false;
  }

  showAuthMessage("", false);
  return true;
}

function updateRegisterStep() {
  const step = state.registerStep;

  $$(".register-step").forEach(element => {
    const active = Number(element.dataset.registerStep) === step;

    element.classList.toggle("active", active);
    element.classList.toggle("hidden", !active);
  });

  const progress = $("#register-progress-fill");

  if (progress) {
    progress.style.width = `${step * 25}%`;
  }

  const label = $("#register-step-label");
  const name = $("#register-step-name");

  if (label) {
    label.textContent = `الخطوة ${step} من 4`;
  }

  if (name) {
    name.textContent = REGISTER_STEPS[step - 1];
  }

  $("#register-back")?.classList.toggle("hidden", step === 1);
  $("#register-next")?.classList.toggle("hidden", step === 4);
  $("#register-finish")?.classList.toggle("hidden", step !== 4);

  if (step === 4) {
    const data = getRegisterValues();

    $("#review-username").textContent = data.username;
    $("#review-fullname").textContent = data.fullName;
    $("#review-avatar").textContent = "تم اختيار الصورة الشخصية";
  }
}

$("#register-next")?.addEventListener("click", () => {
  if (!validateRegisterStep(state.registerStep)) return;

  if (state.registerStep < 4) {
    state.registerStep++;
    updateRegisterStep();
  }
});

$("#register-back")?.addEventListener("click", () => {
  if (state.registerStep > 1) {
    state.registerStep--;
    updateRegisterStep();
    showAuthMessage("", false);
  }
});

/* =========================================
   AVATAR PREVIEW
========================================= */

$("#register-avatar")?.addEventListener("change", event => {
  const file = event.target.files?.[0];

  if (!file) return;

  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(file.type)) {
    showAuthMessage("اختر صورة بصيغة JPG أو PNG أو WEBP.");
    event.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showAuthMessage("حجم الصورة يجب ألا يتجاوز 5 ميجابايت.");
    event.target.value = "";
    return;
  }

  state.selectedAvatar = file;

  const preview = $("#register-avatar-preview");
  const filename = $("#avatar-file-name");

  if (preview) {
    const localURL = URL.createObjectURL(file);
    preview.src = localURL;
  }

  if (filename) {
    filename.textContent = file.name;
  }

  showAuthMessage("", false);
});

/* =========================================
   AVATAR STORAGE
========================================= */

async function uploadAvatar(userId, file) {
  if (!file) return null;

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type
    });

  if (error) throw error;

  return path;
}

/* =========================================
   SAVE PROFILE
========================================= */

async function saveNewProfile(userId, values) {
  const avatarPath = await uploadAvatar(userId, values.avatar);

  const profileData = {
    username: values.username,
    full_name: values.fullName,
    bio: values.bio || "",
    avatar_path: avatarPath,
    profile_completed: true
  };

  const { error } = await supabase
    .from("profiles")
    .update(profileData)
    .eq("id", userId);

  if (error) throw error;

  return avatarPath;
}

/* =========================================
   FINISH REGISTRATION
========================================= */

$("#register-finish")?.addEventListener("click", async () => {
  if (state.loading) return;
  if (!validateRegisterStep(4)) return;

  const values = getRegisterValues();

  state.loading = true;

  const button = $("#register-finish");
  button.disabled = true;
  button.textContent = t("loading");

  try {
    const session = await authenticate(
      values.username,
      values.password,
      "signup"
    );

    if (!session?.user?.id) {
      throw new Error("لم يتم إنشاء هوية المستخدم.");
    }

    await saveNewProfile(session.user.id, values);

    await openApplication(session);

    toast(t("registerSuccess"), "success");

  } catch (error) {
    console.error("HANOON registration:", error);

    showAuthMessage(
      error.message || t("authError")
    );

    /*
      لو الحساب اتعمل بالفعل لكن رفع الصورة أو حفظ
      الملف الشخصي فشل، نحاول إظهار الحساب بدل
      تكرار إنشاء نفس اسم المستخدم.
    */

    const { data } = await supabase.auth.getSession();

    if (data?.session) {
      await openApplication(data.session);
    }

  } finally {
    state.loading = false;
    button.disabled = false;
    button.textContent = t("createAccount");
  }
});

/* =========================================
   PROFILE LOADING
========================================= */

function getAvatarURL(profile) {
  if (!profile?.avatar_path) {
    return null;
  }

  const { data } = supabase.storage
    .from("avatars")
    .getPublicUrl(profile.avatar_path);

  return data?.publicUrl || null;
}

async function loadProfile() {
  if (!state.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .maybeSingle();

  if (error) throw error;

  state.profile = data;

  if (!data) return null;

  const displayName =
    data.full_name ||
    data.username ||
    "HANOON Member";

  const memberCode = data.member_code || "—";
  const avatarURL = getAvatarURL(data);

  if ($("#sidebar-username")) {
    $("#sidebar-username").textContent = displayName;
  }

  if ($("#sidebar-member-id")) {
    $("#sidebar-member-id").textContent = memberCode;
  }

  if (avatarURL) {
    if ($("#sidebar-avatar")) $("#sidebar-avatar").src = avatarURL;
    if ($("#topbar-avatar")) $("#topbar-avatar").src = avatarURL;
  }

  renderProfile(data, avatarURL);

  return data;
}

/* =========================================
   PROFILE PAGE + MEMBER QR
========================================= */

function renderProfile(profile, avatarURL) {
  const root = $("#profile-content");
  if (!root) return;

  root.replaceChildren();

  if (!profile) {
    renderEmpty(root, t("noData"));
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "content-panel profile-card";

  const heading = document.createElement("h2");
  heading.textContent = profile.full_name || profile.username || "HANOON";

  const username = document.createElement("p");
  username.textContent = profile.username ? `@${profile.username}` : "";

  const member = document.createElement("p");
  member.textContent = `رقم العضوية: ${profile.member_code || "—"}`;

  const bio = document.createElement("p");
  bio.textContent = profile.bio || "";

  if (avatarURL) {
    const image = document.createElement("img");
    image.className = "profile-avatar";
    image.src = avatarURL;
    image.alt = "الصورة الشخصية";
    wrapper.appendChild(image);
  }

  wrapper.append(heading, username, member, bio);

  if (profile.member_code) {
    const qrTitle = document.createElement("h3");
    qrTitle.textContent = "رمز QR الخاص بعضويتك";

    const qr = document.createElement("img");
    qr.className = "member-qr";
    qr.alt = "QR Code";
    qr.width = 180;
    qr.height = 180;

    qr.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=" +
      encodeURIComponent(profile.member_code);

    wrapper.append(qrTitle, qr);
  }

  root.appendChild(wrapper);
}

/* =========================================
   WALLET
========================================= */

async function loadWallet() {
  if (!state.user) return;

  try {
    const { data, error } = await supabase
      .from("world_wallets")
      .select("*")
      .eq("user_id", state.user.id)
      .maybeSingle();

    if (error) throw error;

    state.wallet = data;
    renderWallet(data);

  } catch (error) {
    console.error("Wallet:", error);
    renderWallet(null);
  }
}

function renderWallet(wallet) {
  const points = wallet?.points ?? wallet?.points_balance ?? "—";
  const coins = wallet?.coins ?? wallet?.coin_balance ?? "—";
  const gems = wallet?.gems ?? wallet?.gem_balance ?? "—";

  if ($("#home-points")) $("#home-points").textContent = points;
  if ($("#home-coins")) $("#home-coins").textContent = coins;
  if ($("#home-gems")) $("#home-gems").textContent = gems;

  const root = $("#wallet-content");
  if (!root) return;

  root.replaceChildren();

  if (!wallet) {
    renderEmpty(root, t("noWallet"));
    return;
  }

  const panel = document.createElement("div");
  panel.className = "wallet-summary";

  [
    [t("points"), points],
    [t("coins"), coins],
    [t("gems"), gems]
  ].forEach(([label, value]) => {
    const card = document.createElement("article");
    card.className = "summary-card";

    const title = document.createElement("span");
    title.textContent = label;

    const amount = document.createElement("strong");
    amount.textContent = value;

    card.append(title, amount);
    panel.appendChild(card);
  });

  root.appendChild(panel);
}

/* =========================================
   GAMES CATALOG
========================================= */

async function loadGames(homeOnly = false) {
  const root = homeOnly ? $("#home-games") : $("#games-list");

  if (!root) return;

  root.replaceChildren();

  try {
    const { data, error } = await supabase
      .from("world_games_catalog")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    if (error) throw error;

    state.games = data || [];

    if (!state.games.length) {
      renderEmpty(root, t("noGames"));
      return;
    }

    state.games.forEach(game => {
      const card = document.createElement("article");
      card.className = "game-card";

      const title = document.createElement("h3");
      title.textContent = game.name || game.title || "Game";

      const description = document.createElement("p");
      description.textContent = game.description || "";

      card.append(title, description);
      root.appendChild(card);
    });

  } catch (error) {
    console.error("Games:", error);
    renderEmpty(root, t("noData"));
  }
}

/* =========================================
   ROOMS
========================================= */

function renderRoomsUnavailable(root) {
  if (!root) return;

  root.replaceChildren();
  renderEmpty(root, t("noRooms"));
}

async function loadRooms(homeOnly = false) {
  const root = homeOnly ? $("#home-rooms") : $("#rooms-list");
  renderRoomsUnavailable(root);
}

/* =========================================
   STORE
========================================= */

async function loadStore() {
  const root = $("#store-items");
  if (!root) return;

  root.replaceChildren();

  try {
    const { data, error } = await supabase
      .from("world_store_items")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!data?.length) {
      renderEmpty(root, t("noStore"));
      return;
    }

    data.forEach(item => {
      const card = document.createElement("article");
      card.className = "store-card";

      const title = document.createElement("h3");
      title.textContent = item.name || item.title || "Item";

      const description = document.createElement("p");
      description.textContent = item.description || "";

      card.append(title, description);
      root.appendChild(card);
    });

  } catch (error) {
    console.error("Store:", error);
    renderEmpty(root, t("noData"));
  }
}

/* =========================================
   HOME
========================================= */

async function loadHome() {
  if (!state.user) return;

  await Promise.allSettled([
    loadGames(true),
    loadRooms(true),
    loadWallet()
  ]);
}

/* =========================================
   EMPTY STATES
========================================= */

function renderEmpty(root, message) {
  if (!root) return;

  const box = document.createElement("div");
  box.className = "empty-state";

  const text = document.createElement("p");
  text.textContent = message;

  box.appendChild(text);
  root.appendChild(box);
}

/* =========================================
   PAGE NAVIGATION
========================================= */

const PAGE_LOADERS = {
  home: loadHome,
  rooms: loadRooms,
  games: loadGames,
  store: loadStore,
  wallet: loadWallet,
  profile: loadProfile
};

function showPage(pageName) {
  const target = $(`#page-${pageName}`);

  if (!target) {
    console.warn("HANOON page not found:", pageName);
    return;
  }

  $$(".page").forEach(page => {
    page.classList.remove("active");
  });

  target.classList.add("active");
  state.currentPage = pageName;

  $$("[data-page]").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  const main = $("#main-content");

  if (main) {
    main.scrollTop = 0;
  }

  const loader = PAGE_LOADERS[pageName];

  if (loader && state.user) {
    Promise.resolve(loader()).catch(error => {
      console.error(`Page ${pageName}:`, error);
    });
  }

  if (!loader) {
    const content = target.querySelector(
      ".content-panel, .content-grid, [id$='-list']"
    );

    if (content && !content.children.length) {
      renderEmpty(content, t("comingSoon"));
    }
  }
}

function navigate(pageName) {
  if (!state.user) return;
  showPage(pageName);
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-page]");

  if (nav) {
    navigate(nav.dataset.page);
    return;
  }

  const link = event.target.closest("[data-page-link]");

  if (link) {
    navigate(link.dataset.pageLink);
    return;
  }

  const action = event.target.closest("[data-action]");

  if (action) {
    handleAction(action.dataset.action);
  }
});

function handleAction(action) {
  if (action === "create-room") {
    navigate("create-room");
  }
}

/* =========================================
   CREATE ROOM
========================================= */

$("#create-room-form")?.addEventListener("submit", event => {
  event.preventDefault();

  const message = $("#create-room-message");

  if (message) {
    message.textContent =
      "إنشاء الغرف العامة سيتم تفعيله بعد توصيل نظام الغرف والأعضاء.";
  }
});

/* =========================================
   GLOBAL SEARCH
========================================= */

async function performSearch() {
  const input = $("#global-search-input");
  const query = input?.value.trim();

  if (!query) return;

  toast("البحث الشامل قيد التجهيز.");
}

$("#global-search-button")?.addEventListener("click", performSearch);

$("#global-search-input")?.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    performSearch();
  }
});

/* =========================================
   FRIEND SEARCH
========================================= */

$("#friend-search-button")?.addEventListener("click", () => {
  const query = $("#friend-search")?.value.trim();

  if (!query) {
    toast("اكتب اسم المستخدم أو رقم العضوية أولًا.");
    return;
  }

  toast("البحث عن الأصدقاء سيتم توصيله في مرحلة نظام العلاقات.");
});

/* =========================================
   LANGUAGE
========================================= */

function applyLanguage() {
  const language = state.language;

  document.documentElement.lang = language;
  document.documentElement.dir =
    language === "ar" ? "rtl" : "ltr";

  const toggle = $("#language-toggle");

  if (toggle) {
    toggle.textContent = language === "ar" ? "EN" : "AR";
  }

  $$("[data-ar][data-en]").forEach(element => {
    element.textContent =
      language === "ar"
        ? element.dataset.ar
        : element.dataset.en;
  });

  updateAuthButton();
}

$("#language-toggle")?.addEventListener("click", () => {
  state.language = state.language === "ar" ? "en" : "ar";

  localStorage.setItem("hanoon_language", state.language);

  applyLanguage();

  if (state.user) {
    showPage(state.currentPage);
  }
});

/* =========================================
   PROFILE SHORTCUTS
========================================= */

$("#profile-shortcut")?.addEventListener("click", () => {
  navigate("profile");
});

$("#notifications-button")?.addEventListener("click", () => {
  navigate("notifications");
});

/* =========================================
   LOGOUT
========================================= */

$("#logout-button")?.addEventListener("click", async () => {
  if (state.loading) return;

  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    state.user = null;
    state.session = null;
    state.profile = null;
    state.wallet = null;

    $("#auth-form")?.reset();

    showAuthentication();

    toast(t("logout"), "success");

  } catch (error) {
    console.error("Logout:", error);
    toast(t("authError"), "error");
  }
});

/* =========================================
   OPEN APPLICATION
========================================= */

async function openApplication(sessionOverride) {
  let session = sessionOverride;

  if (session === undefined) {
    const { data, error } = await supabase.auth.getSession();

    if (error) throw error;

    session = data.session;
  }

  state.session = session;
  state.user = session?.user || null;

  if (!state.user) {
    showAuthentication();
    return;
  }

  showApplication();

  try {
    await loadProfile();
  } catch (error) {
    console.error("Initial profile:", error);
    toast(t("profileError"), "error");
  }

  showPage("home");

  /*
    بيانات الصفحة تُحمّل بعد إظهار التطبيق.
    هذا يحافظ على سرعة الانتقال دون تعطيل الشاشة.
  */
  Promise.allSettled([
    loadWallet(),
    loadHome()
  ]);
}

/* =========================================
   AUTH STATE CHANGES
========================================= */

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "SIGNED_OUT") {
    state.user = null;
    state.session = null;
    state.profile = null;

    showAuthentication();
  }
});

/* =========================================
   APPLICATION INITIALIZATION
========================================= */

async function initializeHanoon() {
  applyLanguage();

  /*
    نبدأ فحص الجلسة بالتوازي مع مدة شاشة البداية.
    لن تختفي شاشة البداية قبل مرور 5 ثوانٍ.
  */

  const sessionPromise = supabase.auth.getSession();

  await waitForSplashMinimum();

  try {
    const { data, error } = await sessionPromise;

    if (error) throw error;

    if (data?.session) {
      await openApplication(data.session);
    } else {
      showAuthentication();
    }

  } catch (error) {
    console.error("HANOON initialization:", error);
    showAuthentication();
  }
}

/* =========================================
   START
========================================= */

initializeHanoon();
