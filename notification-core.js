
/* =========================================
   HANOON WORLD
   CENTRAL NOTIFICATION CORE
   Shared notification system for all pages
========================================= */

import { supabase } from "./supabase.js";

/* =========================================
   CONFIGURATION
========================================= */

const CONFIG = {
  table: "notifications",
  maxItems: 100,
  realtimePrefix: "hanoon-notifications"
};

const SELECT_FIELDS = [
  "id",
  "user_id",
  "actor_id",
  "type",
  "title",
  "body",
  "target_route",
  "target_type",
  "target_id",
  "metadata",
  "is_read",
  "created_at",
  "expires_at"
].join(",");

/* =========================================
   SAFE DESTINATIONS
========================================= */

const DESTINATIONS = {
  conversation(id) {
    if (!id) return null;

    return (
      "home.html?conversation_id=" +
      encodeURIComponent(id)
    );
  },

  friend_request(id) {
    if (!id) return null;

    return (
      "members.html?tab=requests&request_id=" +
      encodeURIComponent(id)
    );
  },

  room(id) {
    if (!id) return null;

    return (
      "rooms.html?room_id=" +
      encodeURIComponent(id)
    );
  },

  gift(id) {
    if (!id) return null;

    return (
      "home.html?section=gifts&gift_id=" +
      encodeURIComponent(id)
    );
  },

  wallet(id) {
    return "home.html?section=wallet";
  },

  call(id) {
    return "home.html?section=calls";
  },

  profile(id) {
    if (!id) return null;

    return (
      "profile.html?id=" +
      encodeURIComponent(id)
    );
  },

  game(id) {
    if (!id) return null;

    return (
      "games.html?game_id=" +
      encodeURIComponent(id)
    );
  },

  system() {
    return "notifications.html";
  },

  admin() {
    return "notifications.html";
  }
};

/* =========================================
   APPROVED ADMIN ROUTES
========================================= */

const ADMIN_ALLOWED_PAGES = new Set([
  "home.html",
  "members.html",
  "member.html",
  "profile.html",
  "games.html",
  "rooms.html",
  "notifications.html"
]);

function resolveAdminRoute(route) {
  if (
    typeof route !== "string" ||
    !route.trim()
  ) {
    return null;
  }

  const cleanRoute = route.trim();

  /*
    Reject external URLs, protocol-relative URLs,
    backslashes and directory traversal.
  */

  if (
    cleanRoute.startsWith("//") ||
    cleanRoute.includes("\\") ||
    cleanRoute.includes("..") ||
    cleanRoute.includes(":") ||
    cleanRoute.startsWith("/") ||
    /[\u0000-\u001F\u007F]/.test(cleanRoute)
  ) {
    return null;
  }

  try {
    const currentUrl = new URL(
      window.location.href
    );

    const targetUrl = new URL(
      cleanRoute,
      currentUrl.href
    );

    if (
      targetUrl.origin !== currentUrl.origin
    ) {
      return null;
    }

    if (
      targetUrl.username ||
      targetUrl.password
    ) {
      return null;
    }

    const pageName = targetUrl.pathname
      .split("/")
      .pop()
      .toLowerCase();

    if (!ADMIN_ALLOWED_PAGES.has(pageName)) {
      return null;
    }

    return (
      targetUrl.pathname +
      targetUrl.search
    );

  } catch (error) {
    console.warn(
      "HANOON invalid admin notification route:",
      error
    );

    return null;
  }
}

/* =========================================
   INTERNAL STATE
========================================= */

let currentUser = null;
let realtimeChannel = null;
let realtimeCallbacks = new Set();
let cachedNotifications = [];
let initialized = false;

/* =========================================
   HELPERS
========================================= */

function getValidId(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  return value.trim();
}

function isNotExpired(notification) {
  if (!notification.expires_at) {
    return true;
  }

  return (
    new Date(notification.expires_at).getTime() >
    Date.now()
  );
}

function notifyListeners(event, payload = {}) {
  realtimeCallbacks.forEach(callback => {
    try {
      callback(event, payload);
    } catch (error) {
      console.error(
        "HANOON notification listener:",
        error
      );
    }
  });
}

/* =========================================
   CURRENT USER
========================================= */

export async function getNotificationUser() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  currentUser = data.user || null;

  return currentUser;
}

/* =========================================
   LOAD NOTIFICATIONS
========================================= */

export async function getNotifications(options = {}) {
  const user = currentUser ||
    await getNotificationUser();

  if (!user) {
    cachedNotifications = [];
    return [];
  }

  const limit = Math.min(
    Math.max(
      Number(options.limit) || CONFIG.maxItems,
      1
    ),
    CONFIG.maxItems
  );

  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(CONFIG.table)
    .select(SELECT_FIELDS)
    .eq("user_id", user.id)
    .or(
      `expires_at.is.null,expires_at.gt.${now}`
    )
    .order("created_at", {
      ascending: false
    })
    .limit(limit);

  if (error) {
    console.error(
      "HANOON load notifications:",
      error
    );

    throw error;
  }

  cachedNotifications = (data || [])
    .filter(isNotExpired);

  return [...cachedNotifications];
}

/* =========================================
   UNREAD COUNT
========================================= */

export async function getUnreadCount() {
  const user = currentUser ||
    await getNotificationUser();

  if (!user) return 0;

  const now = new Date().toISOString();

  const { count, error } = await supabase
    .from(CONFIG.table)
    .select("id", {
      count: "exact",
      head: true
    })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .or(
      `expires_at.is.null,expires_at.gt.${now}`
    );

  if (error) {
    console.error(
      "HANOON unread count:",
      error
    );

    throw error;
  }

  return count || 0;
}

/* =========================================
   MARK ONE AS READ
========================================= */

export async function markNotificationRead(id) {
  const user = currentUser ||
    await getNotificationUser();

  const notificationId = getValidId(id);

  if (!user || !notificationId) {
    return false;
  }

  const { error } = await supabase
    .from(CONFIG.table)
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("id", notificationId)
    .eq("user_id", user.id);

  if (error) {
    console.error(
      "HANOON mark notification:",
      error
    );

    throw error;
  }

  cachedNotifications =
    cachedNotifications.map(item =>
      item.id === notificationId
        ? { ...item, is_read: true }
        : item
    );

  notifyListeners("read", {
    id: notificationId
  });

  return true;
}

/* =========================================
   MARK ALL AS READ
========================================= */

export async function markAllNotificationsRead() {
  const user = currentUser ||
    await getNotificationUser();

  if (!user) return false;

  const { error } = await supabase
    .from(CONFIG.table)
    .update({
      is_read: true,
      read_at: new Date().toISOString()
    })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) {
    console.error(
      "HANOON mark all notifications:",
      error
    );

    throw error;
  }

  cachedNotifications =
    cachedNotifications.map(item => ({
      ...item,
      is_read: true
    }));

  notifyListeners("read-all");

  return true;
}

/* =========================================
   RESOLVE NOTIFICATION DESTINATION
========================================= */

export function resolveNotificationTarget(notification) {
  if (!notification) {
    return "notifications.html";
  }

  /*
    Admin notifications:
    Use the approved internal route selected
    by the administrator.
  */

  if (
    notification.target_type === "admin" ||
    notification.type === "admin"
  ) {
    const adminDestination =
      resolveAdminRoute(notification.target_route);

    if (adminDestination) {
      return adminDestination;
    }

    return "notifications.html";
  }

  /*
    Other notification types:
    Keep the original destination behavior.
  */

  const type = notification.target_type;
  const id = getValidId(notification.target_id);

  const resolver = DESTINATIONS[type];

  if (typeof resolver !== "function") {
    return "notifications.html";
  }

  return resolver(id) ||
    "notifications.html";
}

/* =========================================
   OPEN NOTIFICATION
========================================= */

export async function openNotification(notification) {
  if (!notification?.id) {
    return false;
  }

  await markNotificationRead(
    notification.id
  );

  const destination =
    resolveNotificationTarget(notification);

  window.location.assign(destination);

  return true;
}

/* =========================================
   REALTIME SUBSCRIPTION
========================================= */

export function subscribeToNotifications(callback) {
  if (typeof callback === "function") {
    realtimeCallbacks.add(callback);
  }

  if (!currentUser) {
    return () => {};
  }

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabase
    .channel(
      `${CONFIG.realtimePrefix}-${currentUser.id}`
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: CONFIG.table,
        filter: `user_id=eq.${currentUser.id}`
      },
      async payload => {
        try {
          await getNotifications();

          notifyListeners(
            payload.eventType || "change",
            payload
          );

        } catch (error) {
          console.error(
            "HANOON realtime refresh:",
            error
          );
        }
      }
    )
    .subscribe(status => {
      notifyListeners("connection", {
        status
      });
    });

  return () => {
    if (callback) {
      realtimeCallbacks.delete(callback);
    }
  };
}

/* =========================================
   INITIALIZE CORE
========================================= */

export async function initializeNotificationCore(
  callback
) {
  if (initialized && currentUser) {
    if (typeof callback === "function") {
      realtimeCallbacks.add(callback);
    }

    return {
      user: currentUser,
      notifications: [...cachedNotifications]
    };
  }

  const user = await getNotificationUser();

  if (!user) {
    initialized = false;

    return {
      user: null,
      notifications: []
    };
  }

  const notifications =
    await getNotifications();

  if (typeof callback === "function") {
    realtimeCallbacks.add(callback);
  }

  subscribeToNotifications();

  initialized = true;

  return {
    user,
    notifications
  };
}

/* =========================================
   NOTIFICATION BADGE
========================================= */

export async function updateNotificationBadge(
  selector = "[data-notification-count]"
) {
  const elements =
    document.querySelectorAll(selector);

  if (!elements.length) {
    return 0;
  }

  try {
    const count = await getUnreadCount();

    elements.forEach(element => {
      element.textContent =
        count > 99 ? "99+" : String(count);

      element.hidden = count === 0;

      element.setAttribute(
        "aria-label",
        `${count} إشعارات غير مقروءة`
      );
    });

    return count;

  } catch (error) {
    console.error(
      "HANOON badge update:",
      error
    );

    return 0;
  }
}

/* =========================================
   STOP CORE
========================================= */

export function stopNotificationCore() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeCallbacks.clear();
  cachedNotifications = [];
  currentUser = null;
  initialized = false;
}

/* =========================================
   AUTH SESSION CHANGES
========================================= */

supabase.auth.onAuthStateChange(
  (event, session) => {
    if (
      event === "SIGNED_OUT" ||
      !session?.user
    ) {
      stopNotificationCore();
      return;
    }

    if (
      event === "SIGNED_IN" ||
      event === "TOKEN_REFRESHED"
    ) {
      currentUser = session.user;
    }
  }
);

console.info(
  "HANOON WORLD — Notification Core loaded"
);
