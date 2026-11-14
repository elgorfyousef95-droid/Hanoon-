
import { supabase } from "./supabase.js";

/* =========================================
   HANOON WORLD — APPLICATION CORE
   Fixed startup + session restoration
========================================= */

const $ = (selector, parent = document) =>
  parent.querySelector(selector);

const $$ = (selector, parent = document) =>
  [...parent.querySelectorAll(selector)];

const state = {
  user: null,
  profile: null,
  session: null,
  language: localStorage.getItem("hanoon_language") || "ar",
  authMode: "login",
  currentPage: "home",
  games: [],
  rooms: [],
  wallet: null,
  loading: false,
  initialized: false
};

const TEXT = {
  ar: {
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "تسجيل الخروج",
    home: "الرئيسية",
    rooms: "الغرف",
    games: "الألعاب",
    tournaments: "البطولات",
    chats: "المحادثات",
    friends: "الأصدقاء",
    store: "المتجر والهدايا",
    wallet: "المحفظة",
    profile: "ملفي الشخصي",
    notifications: "الإشعارات",
    settings: "الإعدادات",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    welcome: "عالمك يبدأ من هنا",
    availableRooms: "الغرف المتاحة الآن",
    discoverGames: "اكتشف الألعاب",
    onlineFriends: "الأصدقاء المتصلون",
    createRoom: "إنشاء غرفة جديدة",
    noRooms: "لا توجد غرف متاحة حاليًا",
    noGames: "لا توجد ألعاب نشطة حاليًا",
    noStore: "المتجر لا يحتوي على منتجات متاحة حاليًا",
    noData: "لا توجد بيانات لعرضها حاليًا",
    loading: "جارٍ تحميل البيانات...",
    error: "حدث خطأ. حاول مرة أخرى.",
    comingSoon: "قيد التجهيز",
    loginSuccess: "تم تسجيل الدخول بنجاح",
    registerSuccess: "تم إنشاء الحساب وتسجيل الدخول",
    logoutSuccess: "تم تسجيل الخروج",
    invalidUsername: "اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو شرطة سفلية",
    invalidPassword: "كلمة المرور يجب ألا تقل عن 8 أحرف",
    authError: "تعذر إتمام العملية. راجع بيانات الدخول وحاول مرة أخرى.",
    roomSystemPending: "نظام الغرف العامة يحتاج إلى جداول الغرف والأعضاء في قاعدة البيانات قبل تفعيل الإنشاء.",
    gamePending: "هذه اللعبة لم تصبح قابلة للعب بعد.",
    retry: "إعادة المحاولة",
    points: "النقاط",
    coins: "العملات",
    gems: "الجواهر"
  },

  en: {
    login: "Sign in",
    register: "Create account",
    logout: "Log out",
    home: "Home",
    rooms: "Rooms",
    games: "Games",
    tournaments: "Tournaments",
    chats: "Chats",
    friends: "Friends",
    store: "Store & Gifts",
    wallet: "Wallet",
    profile: "My Profile",
    notifications: "Notifications",
    settings: "Settings",
    username: "Username",
    password: "Password",
    welcome: "Your world starts here",
    availableRooms: "Available rooms",
    discoverGames: "Discover games",
    onlineFriends: "Online friends",
    createRoom: "Create a room",
    noRooms: "No rooms are available yet",
    noGames: "No active games are available yet",
    noStore: "No store products are currently available",
    noData: "Nothing to display yet",
    loading: "Loading...",
    error: "Something went wrong. Try again.",
    comingSoon: "Coming soon",
    loginSuccess: "Signed in successfully",
    registerSuccess: "Account created and signed in",
    logoutSuccess: "Signed out",
    invalidUsername: "Username must be 3–24 English letters, numbers or underscores",
    invalidPassword: "Password must be at least 8 characters",
    authError: "Unable to complete the request. Check your details and try again.",
    roomSystemPending: "Public room creation requires the rooms and room-members database tables.",
    gamePending: "This game is not playable yet.",
    retry: "Retry",
    points: "Points",
    coins: "Coins",
    gems: "Gems"
  }
};

const t = key => TEXT[state.language][key] || key;

/* =========================================
   TOAST NOTIFICATIONS
========================================= */

function toast(message, type = "info") {
  const root = $("#toast-root");
  if (!root) return;

  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;

  if (type === "error") {
    item.style.borderColor = "rgba(255,100,127,.5)";
  } else if (type === "success") {
    item.style.borderColor = "rgba(69,214,160,.5)";
  }

  root.appendChild(item);

  window.setTimeout(() => item.remove(), 3500);
}

/* =========================================
   PAGE NAVIGATION
========================================= */

function showPage(pageName) {
  const target = $(`#page-${pageName}`);

  if (!target) {
    console.warn("HANOON page not found:", pageName);
    toast(t("error"), "error");
    return;
  }

  $$(".page").forEach(page => {
    page.classList.remove("active");
  });

  target.classList.add("active");
  state.currentPage = pageName;

  $$(".nav-item").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.page === pageName
    );
  });

  const content = $(".page-content", target);
  if (content) content.scrollTop = 0;

  if (pageName === "home") loadHome();
  if (pageName === "rooms") loadRooms();
  if (pageName === "games") loadGames();
  if (pageName === "store") loadStore();
  if (pageName === "wallet") loadWallet();
  if (pageName === "profile") loadProfile();
}

function navigate(page) {
  if (!state.user) return;
  showPage(page);
}

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-page]");

  if (nav && nav.classList.contains("nav-item")) {
    navigate(nav.dataset.page);
    return;
  }

  const pageLink = event.target.closest("[data-page-link]");

  if (pageLink) {
    navigate(pageLink.dataset.pageLink);
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
    toast(t("roomSystemPending"));
  }
}

/* =========================================
   LANGUAGE
========================================= */

function applyLanguage() {
  const lang = state.language;

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

  const toggle = $("#language-toggle");

  if (toggle) {
    toggle.textContent = lang === "ar" ? "EN" : "AR";
  }

  $$("[data-ar][data-en]").forEach(element => {
    element.textContent =
      lang === "ar"
        ? element.dataset.ar
        : element.dataset.en;
  });

  const usernameLabel = $("#auth-form label[for='username']");
  const passwordLabel = $("#auth-form label[for='password']");

  if (usernameLabel) usernameLabel.textContent = t("username");
  if (passwordLabel) passwordLabel.textContent = t("password");

  const usernameInput = $("#username");
  const passwordInput = $("#password");

  if (usernameInput) usernameInput.placeholder = t("username");
  if (passwordInput) passwordInput.placeholder = t("password");

  updateAuthButton();
}

$("#language-toggle")?.addEventListener("click", () => {
  state.language = state.language === "ar" ? "en" : "ar";

  localStorage.setItem("hanoon_language", state.language);

  applyLanguage();
  refreshVisiblePage();
});

function refreshVisiblePage() {
  if (!state.user) return;

  if (state.currentPage === "home") loadHome();
  if (state.currentPage === "rooms") loadRooms();
  if (state.currentPage === "games") loadGames();
  if (state.currentPage === "store") loadStore();
  if (state.currentPage === "wallet") loadWallet();
  if (state.currentPage === "profile") loadProfile();
}

/* =========================================
   AUTH TABS
========================================= */

function setAuthMode(mode) {
  state.authMode = mode;

  $$(".auth-tab").forEach(tab => {
    tab.classList.toggle(
      "active",
      tab.dataset.auth === mode
    );
  });

  const password = $("#password");

  if (password) {
    password.autocomplete =
      mode === "register" ? "new-password" : "current-password";
  }

  updateAuthButton();
}

function updateAuthButton() {
  const submit = $("#auth-submit");

  if (submit) {
    submit.textContent = t(
      state.authMode === "register" ? "register" : "login"
    );
  }
}

$$(".auth-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    setAuthMode(tab.dataset.auth);
  });
});

/* =========================================
   USERNAME AUTHENTICATION
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
        username,
        password
      }
    }
  );

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const session = getReturnedSession(data);

  if (!session) {
    throw new Error("AUTH_SESSION_MISSING");
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

  if (sessionError) throw sessionError;

  return sessionData;
}

$("#auth-form")?.addEventListener("submit", async event => {
  event.preventDefault();

  if (state.loading) return;

  const username = $("#username")?.value.trim().toLowerCase();
  const password = $("#password")?.value;

  const message = $("#auth-message");
  const submit = $("#auth-submit");

  if (!validUsername(username)) {
    if (message) message.textContent = t("invalidUsername");
    return;
  }

  if (!password || password.length < 8) {
    if (message) message.textContent = t("invalidPassword");
    return;
  }

  state.loading = true;

  if (submit) {
    submit.disabled = true;
    submit.textContent = t("loading");
  }

  if (message) message.textContent = "";

  try {
    await authenticate(
      username,
      password,
      state.authMode === "register" ? "signup" : "signin"
    );

    toast(
      state.authMode === "register"
        ? t("registerSuccess")
        : t("loginSuccess"),
      "success"
    );

    await openApplication();

  } catch (error) {
    console.error("HANOON authentication:", error);

    if (message) {
      message.textContent =
        error.message === "AUTH_SESSION_MISSING"
          ? t("authError")
          : (error.message || t("authError"));
    }

  } finally {
    state.loading = false;

    if (submit) {
      submit.disabled = false;
      updateAuthButton();
    }
  }
});

/* =========================================
   APPLICATION VISIBILITY
========================================= */

function showAuthentication() {
  $("#splash")?.classList.add("hidden");
  $("#app")?.classList.add("hidden");
  $("#auth-screen")?.classList.remove("hidden");
}

function showApplication() {
  $("#splash")?.classList.add("hidden");
  $("#auth-screen")?.classList.add("hidden");
  $("#app")?.classList.remove("hidden");
}

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

  // إظهار التطبيق أولًا
  showApplication();
  showPage("home");

  // تحميل البيانات دون تعطيل ظهور الشاشة
  Promise.allSettled([
    loadProfile(),
    loadWallet(),
    loadHome()
  ]);
}

/* =========================================
   PROFILE DATA
========================================= */

async function loadProfile() {
  if (!state.user) return;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", state.user.id)
      .maybeSingle();

    if (error) throw error;

    state.profile = data;

    const username =
      data?.username ||
      data?.full_name ||
      state.user.user_metadata?.username ||
      "HANOON Member";

    const sidebarName = $("#sidebar-username");

    if (sidebarName) sidebarName.textContent = username;

    const memberId = $("#sidebar-member-id");

    if (memberId) {
      memberId.textContent =
        data?.member_code || data?.member_id || "HANOON";
    }

    const avatar =
      data?.avatar_url ||
      data?.photo_url ||
      data?.profile_image;

    if (avatar) {
      if ($("#sidebar-avatar")) $("#sidebar-avatar").src = avatar;
      if ($("#topbar-avatar")) $("#topbar-avatar").src = avatar;
    }

    renderProfile(data);

  } catch (error) {
    console.error("Profile loading:", error);
    toast(t("error"), "error");
  }
}

function renderProfile(profile) {
  const root = $("#profile-content");

  if (!root) return;

  if (!profile) {
    root.innerHTML =
      `<div class="empty-state">${escapeHTML(t("noData"))}</div>`;
    return;
  }

  const name =
    profile.full_name ||
    profile.username ||
    "HANOON Member";

  const username = profile.username || "";

  const memberCode =
    profile.member_code ||
    profile.member_id ||
    "";

  const avatar =
    profile.avatar_url ||
    profile.photo_url ||
    profile.profile_image ||
    "";

  root.replaceChildren();

  const container = document.createElement("div");
  container.className = "content-panel";

  const heading = document.createElement("h2");
  heading.textContent = name;

  const usernameText = document.createElement("p");
  usernameText.textContent = username ? `@${username}` : "";

  const codeText = document.createElement("p");
  codeText.textContent = memberCode;

  if (avatar) {
    const image = document.createElement("img");

    image.className = "profile-avatar";
    image.src = avatar;
    image.alt = name;

    container.appendChild(image);
  }

  container.append(heading, usernameText, codeText);
  root.appendChild(container);
}

/* =========================================
   WALLET DATA
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
    console.error("Wallet loading:", error);
    renderWallet(null);
  }
}

function renderWallet(wallet) {
  const coins =
    wallet?.coins ??
    wallet?.coin_balance ??
    "--";

  const gems =
    wallet?.gems ??
    wallet?.gem_balance ??
    "--";

  const points =
    wallet?.points ??
    wallet?.points_balance ??
    "--";

  if ($("#home-coins")) {
    $("#home-coins").textContent = coins;
  }

  if ($("#home-gems")) {
    $("#home-gems").textContent = gems;
  }

  if ($("#home-points")) {
    $("#home-points").textContent = points;
  }

  const root = $("#wallet-content");

  if (!root) return;

  root.replaceChildren();

  if (!wallet) {
    root.innerHTML =
      `<div class="empty-state">${escapeHTML(t("noData"))}</div>`;
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
   HOME PAGE
========================================= */

async function loadHome() {
  if (!state.user) return;

  await Promise.allSettled([
    loadGames(true),
    loadRooms(true)
  ]);
}

/* =========================================
   ROOMS
========================================= */

async function loadRooms(homeOnly = false) {
  const root = homeOnly
    ? $("#home-rooms")
    : $("#rooms-list");

  if (!root) return;

  root.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "empty-state";

  const heading = document.createElement("h3");
  heading.textContent = t("noRooms");

  const description = document.createElement("p");
  description.textContent = t("roomSystemPending");

  empty.append(heading, description);
  root.appendChild(empty);
}

/* =========================================
   CREATE ROOM
========================================= */

$("#create-room-form")?.addEventListener("submit", event => {
  event.preventDefault();

  const message = $("#create-room-message");

  if (message) {
    message.textContent = t("roomSystemPending");
  }

  toast(t("roomSystemPending"));
});

/* =========================================
   GAMES CATALOG
========================================= */

const GAME_IMAGES = [
  "https://images.unsplash.com/photo-1611996575749-79a3a250f948?w=700&q=80",
  "https://images.unsplash.com/photo-1606503153255-59d8b8b8216b?w=700&q=80",
  "https://images.unsplash.com/photo-1614294149010-950b698f72c0?w=700&q=80",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?w=700&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=700&q=80",
  "https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=700&q=80"
];

async function loadGames(homeOnly = false) {
  if (!state.user) return;

  const root = homeOnly
    ? $("#home-games")
    : $("#games-list");

  if (!root) return;

  root.replaceChildren();

  try {
    const { data, error } = await supabase
      .from("world_games_catalog")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) throw error;

    state.games = data || [];

    const visibleGames = homeOnly
      ? state.games.slice(0, 4)
      : state.games;

    if (!visibleGames.length) {
      root.innerHTML =
        `<div class="empty-state">${escapeHTML(t("noGames"))}</div>`;
      return;
    }

    visibleGames.forEach((game, index) => {
      const title =
        game.title ||
        game.name ||
        game.game_name ||
        "HANOON Game";

      const description =
        game.description ||
        t("comingSoon");

      const active = game.is_active === true;

      const card = document.createElement("article");
      card.className = "game-card";

      const cover = document.createElement("div");
      cover.className = "card-cover";

      const image = document.createElement("img");

      image.src =
        game.image_url ||
        GAME_IMAGES[index % GAME_IMAGES.length];

      image.alt = title;
      image.loading = "lazy";

      image.onerror = () => {
        image.onerror = null;
        image.src = GAME_IMAGES[index % GAME_IMAGES.length];
      };

      cover.appendChild(image);

      const body = document.createElement("div");
      body.className = "card-body";

      const heading = document.createElement("h3");
      heading.textContent = title;

      const text = document.createElement("p");
      text.textContent = description;

      const actions = document.createElement("div");
      actions.className = "card-actions";

      const button = document.createElement("button");
      button.type = "button";

      button.textContent =
        active ? "فتح اللعبة" : t("comingSoon");

      button.disabled = !active;

      if (!active) {
        button.style.opacity = ".55";
        button.style.cursor = "not-allowed";
      } else {
        button.addEventListener("click", () => openGame(game));
      }

      actions.appendChild(button);

      body.append(heading, text, actions);
      card.append(cover, body);

      root.appendChild(card);
    });

  } catch (error) {
    console.error("Games loading:", error);

    root.innerHTML =
      `<div class="empty-state">${escapeHTML(t("error"))}</div>`;
  }
}

function openGame(game) {
  if (!game?.is_active) {
    toast(t("gamePending"));
    return;
  }

  const root = $("#game-details-content");

  if (root) {
    root.replaceChildren();

    const panel = document.createElement("div");
    panel.className = "content-panel";

    const heading = document.createElement("h2");
    heading.textContent =
      game.title || game.name || "HANOON Game";

    const message = document.createElement("p");
    message.textContent = t("comingSoon");

    panel.append(heading, message);
    root.appendChild(panel);
  }

  navigate("game-details");
}

/* =========================================
   STORE
========================================= */

async function loadStore() {
  if (!state.user) return;

  const root = $("#store-items");

  if (!root) return;

  root.replaceChildren();

  try {
    const { data, error } = await supabase
      .from("world_store_items")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;

    if (!data?.length) {
      root.innerHTML =
        `<div class="empty-state">${escapeHTML(t("noStore"))}</div>`;
      return;
    }

    data.forEach(item => {
      const card = document.createElement("article");
      card.className = "store-card card-body";

      const heading = document.createElement("h3");
      heading.textContent =
        item.title || item.name || "HANOON Item";

      const description = document.createElement("p");
      description.textContent = item.description || "";

      card.append(heading, description);
      root.appendChild(card);
    });

  } catch (error) {
    console.error("Store loading:", error);

    root.innerHTML =
      `<div class="empty-state">${escapeHTML(t("error"))}</div>`;
  }
}

/* =========================================
   FRIENDS / CHATS / NOTIFICATIONS
========================================= */

function showPendingContent(elementId) {
  const root = $(`#${elementId}`);

  if (!root) return;

  root.replaceChildren();

  const empty = document.createElement("div");
  empty.className = "empty-state";
  empty.textContent = t("noData");

  root.appendChild(empty);
}

showPendingContent("conversations-list");
showPendingContent("friends-content");
showPendingContent("notifications-list");
showPendingContent("tournaments-list");
showPendingContent("settings-content");
showPendingContent("home-online-friends");

/* =========================================
   LOGOUT
========================================= */

$("#logout-button")?.addEventListener("click", async () => {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) throw error;

    state.user = null;
    state.profile = null;
    state.session = null;
    state.wallet = null;

    showAuthentication();

    toast(t("logoutSuccess"), "success");

  } catch (error) {
    console.error("Logout:", error);
    toast(t("error"), "error");
  }
});

/* =========================================
   TOPBAR PROFILE
========================================= */

$("#profile-shortcut")?.addEventListener("click", () => {
  navigate("profile");
});

$("#notifications-button")?.addEventListener("click", () => {
  navigate("notifications");
});

/* =========================================
   SAFE TEXT
========================================= */

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

/* =========================================
   SESSION RESTORE + SPLASH
========================================= */

async function initializeApp() {
  if (state.initialized) return;

  state.initialized = true;

  applyLanguage();
  setAuthMode("login");

  // يبدأ مؤقت شاشة البداية فور تشغيل التطبيق
  const splashTimer = new Promise(resolve => {
    window.setTimeout(resolve, 5000);
  });

  let sessionResolved = false;
  let restoredSession = null;

  // استعادة الجلسة بالتوازي مع المؤقت
  const sessionPromise = supabase.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;

      restoredSession = data.session || null;

      state.session = restoredSession;
      state.user = restoredSession?.user || null;

      sessionResolved = true;

      return restoredSession;
    })
    .catch(error => {
      console.error("Session restore:", error);

      restoredSession = null;
      state.session = null;
      state.user = null;

      sessionResolved = true;

      return null;
    });

  // لا ننتظر تحميل الجلسة قبل انتهاء الخمس ثواني
  await splashTimer;

  if (sessionResolved) {
    await openApplication(restoredSession);
    return;
  }

  // إذا تأخرت الجلسة، نعرض تسجيل الدخول بدل تعليق شاشة البداية
  showAuthentication();

  // نستمر في انتظار الجلسة في الخلفية
  const session = await sessionPromise;

  if (session) {
    await openApplication(session);
  }
}

/* =========================================
   AUTH SESSION CHANGES
========================================= */

supabase.auth.onAuthStateChange((event, session) => {
  state.session = session;
  state.user = session?.user || null;

  if (event === "SIGNED_OUT") {
    state.profile = null;
    state.wallet = null;

    showAuthentication();
  }
});

/* =========================================
   START
========================================= */

initializeApp();
