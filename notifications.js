
import { supabase } from "./supabase.js";

const list = document.getElementById("noticeList");
const empty = document.getElementById("emptyState");
const allCount = document.getElementById("allCount");
const unreadCount = document.getElementById("unreadCount");
const readCount = document.getElementById("readCount");
const connection = document.getElementById("connection");
const readAllButton = document.getElementById("readAll");

let notifications = [];
let currentFilter = "all";
let currentUser = null;
let realtimeChannel = null;

const SELECT_FIELDS = [
  "id", "type", "title", "body",
  "target_route", "target_type", "target_id",
  "is_read", "created_at", "expires_at"
].join(",");

const icons = {
  message: '<svg viewBox="0 0 24 24"><path d="M4 5h16v12H8l-4 3V5Z"/><path d="M8 10h8M8 13h5"/></svg>',
  friend: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.5-3.8 2.8-5.7 6.5-5.7 2 0 3.5.6 4.6 1.7"/><path d="M18 11v7M14.5 14.5h7"/></svg>',
  room: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 10h8M8 14h5"/></svg>',
  gift: '<svg viewBox="0 0 24 24"><path d="M3 10h18v11H3zM2 6h20v4H2zM12 6v15"/><path d="M12 6H8a2 2 0 1 1 2-2c0 1.1 2 2 2 2Zm0 0h4a2 2 0 1 0-2-2c0 1.1-2 2-2 2Z"/></svg>',
  wallet: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 14h2"/></svg>',
  system: '<svg viewBox="0 0 24 24"><path d="M12 3 14 5.5l3.2-.2.8 3 2.7 1.7-1 3 1 3-2.7 1.7-.8 3-3.2-.2L12 21l-2-2.5-3.2.2-.8-3-2.7-1.7 1-3-1-3 2.7-1.7.8-3 3.2.2L12 3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  call: '<svg viewBox="0 0 24 24"><path d="M5 3h4l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v4c0 1-1 2-2 2C10 21 3 14 3 5c0-1 1-2 2-2Z"/></svg>',
  follow: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5"/><path d="M2 20c1-4 3-6 7-6s6 2 7 6M19 8v6M16 11h6"/></svg>',
  profile_visit: '<svg viewBox="0 0 24 24"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>',
  admin: '<svg viewBox="0 0 24 24"><path d="M12 3 20 6v5c0 5-3 8-8 10-5-2-8-5-8-10V6l8-3Z"/><path d="m9 12 2 2 4-4"/></svg>',
  game: '<svg viewBox="0 0 24 24"><path d="M6 8h12a4 4 0 0 1 4 4v4a2 2 0 0 1-3 2l-3-3H8l-3 3a2 2 0 0 1-3-2v-4a4 4 0 0 1 4-4Z"/><path d="M8 11v4M6 13h4M16 12h.01M19 14h.01"/></svg>',
  comment: '<svg viewBox="0 0 24 24"><path d="M4 5h16v12H8l-4 3V5Z"/><path d="M8 10h8M8 13h5"/></svg>',
  like: '<svg viewBox="0 0 24 24"><path d="M20.5 8.5c0 5-8.5 11-8.5 11s-8.5-6-8.5-11a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z"/></svg>'
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function formatTime(value) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ar-EG", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function setStatus(message, title = "حالة مركز الإشعارات:") {
  connection.replaceChildren();

  const strong = document.createElement("strong");
  strong.textContent = title;

  connection.append(strong, document.createTextNode(" " + message));
}

function updateCounters() {
  const unread = notifications.filter(item => !item.is_read).length;

  allCount.textContent = notifications.length;
  unreadCount.textContent = unread;
  readCount.textContent = notifications.length - unread;

  readAllButton.disabled = unread === 0;
  readAllButton.style.opacity = unread === 0 ? ".55" : "1";
}

function render() {
  updateCounters();

  const filtered = notifications.filter(item =>
    currentFilter === "all" ||
    item.type === currentFilter ||
    (currentFilter === "system" &&
      ["system", "admin", "call", "follow", "profile_visit",
       "game", "comment", "like"].includes(item.type))
  );

  list.innerHTML = filtered.map(item => {
    const type = icons[item.type] ? item.type : "system";
    const title = escapeHTML(item.title || "إشعار جديد");
    const body = escapeHTML(item.body || "");
    const time = formatTime(item.created_at);

    return `
      <article class="notice ${item.is_read ? "" : "unread"}"
        data-id="${escapeHTML(item.id)}"
        data-type="${escapeHTML(type)}"
        tabindex="0"
        role="button"
        aria-label="${title}">
        <div class="notice-icon">${icons[type]}</div>
        <div class="notice-content">
          <div class="notice-heading">
            <strong>${title}</strong>
            ${item.is_read ? "" : '<span class="new-label">جديد</span>'}
          </div>
          <p>${body}</p>
        </div>
        <time class="notice-time">${escapeHTML(time)}</time>
        <span class="notice-arrow">
          <svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>
        </span>
      </article>
    `;
  }).join("");

  empty.classList.toggle("show", filtered.length === 0);
  list.style.display = filtered.length ? "grid" : "none";
}

async function loadNotifications() {
  if (!currentUser) return;

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("notifications")
    .select(SELECT_FIELDS)
    .eq("user_id", currentUser.id)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Notifications load:", error);
    setStatus("تعذر تحميل الإشعارات. حاول تحديث الصفحة.");
    return;
  }

  notifications = data || [];
  render();

  setStatus(
    notifications.length
      ? "متصل بقاعدة البيانات ويتم عرض إشعارات حسابك."
      : "لا توجد إشعارات جديدة في حسابك."
  );
}

async function markAsRead(notificationId) {
  if (!currentUser || !notificationId) return false;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .eq("user_id", currentUser.id);

  if (error) {
    console.error("Mark notification read:", error);
    setStatus("لم نتمكن من تحديث حالة القراءة.");
    return false;
  }

  const item = notifications.find(note => note.id === notificationId);
  if (item) item.is_read = true;

  render();
  return true;
}

async function markAllAsRead() {
  if (!currentUser) return;

  const unread = notifications.filter(item => !item.is_read);
  if (!unread.length) return;

  readAllButton.disabled = true;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("user_id", currentUser.id)
    .eq("is_read", false);

  if (error) {
    console.error("Mark all read:", error);
    setStatus("تعذر تحديد الإشعارات كمقروءة.");
    updateCounters();
    return;
  }

  notifications = notifications.map(item => ({
    ...item,
    is_read: true
  }));

  render();
  setStatus("تم تحديد جميع الإشعارات كمقروءة.");
}

function getSafeDestination(item) {
  const id = item.target_id;

  if (item.target_type === "conversation" && id) {
    return `home.html?conversation_id=${encodeURIComponent(id)}`;
  }

  if (item.target_type === "friend_request" && id) {
    return `members.html?tab=requests&request_id=${encodeURIComponent(id)}`;
  }

  /*
    لا نفتح روابط خارجية أو مسارات غير معروفة.
    نضيف أنواع الوجهات الجديدة هنا بعد ربط صفحاتها الفعلية.
  */
  return "notifications.html";
}

async function openNotification(item) {
  await markAsRead(item.id);

  const destination = getSafeDestination(item);
  window.location.assign(destination);
}

function subscribeToRealtime() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase
    .channel(`hanoon-notifications-${currentUser.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${currentUser.id}`
      },
      () => loadNotifications()
    )
    .subscribe(status => {
      if (status === "CHANNEL_ERROR") {
        console.warn("Notifications realtime channel error");
      }
    });
}

async function startNotifications() {
  try {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      notifications = [];
      render();
      setStatus("سجّل دخولك أولًا لعرض إشعارات حسابك.", "يلزم تسجيل الدخول:");
      return;
    }

    currentUser = data.user;

    await loadNotifications();
    subscribeToRealtime();

  } catch (error) {
    console.error("HANOON notifications:", error);
    setStatus("تعذر الاتصال. تحقق من الإنترنت وحاول مرة أخرى.");
  }
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item => {
      item.classList.toggle("active", item === button);
    });

    currentFilter = button.dataset.filter;
    render();
  });
});

readAllButton.addEventListener("click", markAllAsRead);

list.addEventListener("click", async event => {
  const card = event.target.closest(".notice");
  if (!card) return;

  const item = notifications.find(note => note.id === card.dataset.id);
  if (item) await openNotification(item);
});

list.addEventListener("keydown", async event => {
  if (event.key !== "Enter" && event.key !== " ") return;

  const card = event.target.closest(".notice");
  if (!card) return;

  event.preventDefault();

  const item = notifications.find(note => note.id === card.dataset.id);
  if (item) await openNotification(item);
});

window.addEventListener("beforeunload", () => {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }
});

startNotifications();
