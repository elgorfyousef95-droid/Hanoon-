
/* =========================================
   HANOON WORLD
   AUTHENTICATION SYSTEM
========================================= */

import {
  supabase,
  getCurrentUser,
  getCurrentSession,
  listenToAuthChanges
} from "./supabase.js";

/* -----------------------------------------
   CONFIGURATION
----------------------------------------- */

const SUPABASE_URL =
  "https://gjtgvczvclfwvlvcquxh.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_4DVTUZ-xTlqU2GpFvpb7lw_g-Kxomd4";

const AUTH_ENDPOINT =
  `${SUPABASE_URL}/functions/v1/hanoon-username-auth`;

/* -----------------------------------------
   VALIDATION
----------------------------------------- */

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .toLowerCase();
}

function validateCredentials(username, password) {
  const cleanUsername = normalizeUsername(username);

  if (!/^[a-z0-9_]{3,24}$/.test(cleanUsername)) {
    throw new Error(
      "اسم المستخدم يجب أن يكون من 3 إلى 24 حرفًا إنجليزيًا أو رقمًا أو _"
    );
  }

  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 72
  ) {
    throw new Error(
      "كلمة المرور يجب أن تكون من 8 إلى 72 حرفًا"
    );
  }

  return cleanUsername;
}

/* -----------------------------------------
   EDGE FUNCTION REQUEST
----------------------------------------- */

async function requestAuthentication(action, username, password) {
  const cleanUsername = validateCredentials(
    username,
    password
  );

  let response;

  try {
    response = await fetch(AUTH_ENDPOINT, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      },

      body: JSON.stringify({
        action,
        username: cleanUsername,
        password
      })
    });

  } catch {
    throw new Error(
      "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      "استجابة الخادم غير صالحة."
    );
  }

  if (!response.ok) {
    throw new Error(
      result?.error ||
      result?.message ||
      "تعذر إتمام العملية. حاول مرة أخرى."
    );
  }

  if (!result?.session?.access_token ||
      !result?.session?.refresh_token) {
    throw new Error(
      "لم يتم استلام جلسة دخول صالحة من الخادم."
    );
  }

  return result;
}

/* -----------------------------------------
   SAVE AUTH SESSION
----------------------------------------- */

async function saveSession(session) {
  const { data, error } =
    await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });

  if (error) {
    throw new Error(
      "تمت المصادقة ولكن تعذر حفظ جلسة الدخول: " +
      error.message
    );
  }

  return {
    session: data.session,
    user: data.user
  };
}

/* -----------------------------------------
   SIGN IN
----------------------------------------- */

export async function signIn(username, password) {
  const result = await requestAuthentication(
    "signin",
    username,
    password
  );

  const authenticated = await saveSession(
    result.session
  );

  return {
    success: true,
    user: authenticated.user,
    session: authenticated.session,
    message: "تم تسجيل الدخول بنجاح"
  };
}

/* -----------------------------------------
   SIGN UP
----------------------------------------- */

export async function signUp(username, password) {
  const result = await requestAuthentication(
    "signup",
    username,
    password
  );

  const authenticated = await saveSession(
    result.session
  );

  return {
    success: true,
    user: authenticated.user,
    session: authenticated.session,
    message: "تم إنشاء الحساب بنجاح"
  };
}

/* -----------------------------------------
   SIGN OUT
----------------------------------------- */

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(
      "تعذر تسجيل الخروج: " + error.message
    );
  }

  return {
    success: true,
    message: "تم تسجيل الخروج بنجاح"
  };
}

/* -----------------------------------------
   RESTORE SESSION
----------------------------------------- */

export async function restoreSession() {
  const session = await getCurrentSession();

  if (!session) {
    return null;
  }

  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return {
    user,
    session
  };
}

/* -----------------------------------------
   AUTH STATE CHANGES
----------------------------------------- */

export function onAuthStateChanged(callback) {
  return listenToAuthChanges(
    (event, session) => {
      callback({
        event,
        session,
        user: session?.user || null,
        authenticated: Boolean(session?.user)
      });
    }
  );
}

/* -----------------------------------------
   CURRENT ACCOUNT
----------------------------------------- */

export async function getAuthenticatedAccount() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    username:
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      "",
    user
  };
}
