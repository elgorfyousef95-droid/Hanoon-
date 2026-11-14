
/* =========================================
   HANOON WORLD
   SUPABASE DATABASE CONNECTION
========================================= */

import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL =
  "https://gjtgvczvclfwvlvcquxh.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_4DVTUZ-xTlqU2GpFvpb7lw_g-Kxomd4";

// الاتصال بقاعدة بيانات HANOON
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// تسجيل حساب أو الدخول باسم المستخدم وكلمة المرور
async function usernameAuth(action, username, password) {
  const { data, error } = await supabase.functions.invoke(
    "hanoon-username-auth",
    {
      body: {
        action,
        username: String(username).trim().toLowerCase(),
        password: String(password)
      }
    }
  );

  if (error) {
    throw new Error(
      data?.error || error.message || "تعذر الاتصال بخدمة تسجيل الدخول."
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  if (!data?.session) {
    throw new Error("لم يتم استلام جلسة تسجيل الدخول.");
  }

  const { error: sessionError } =
    await supabase.auth.setSession(data.session);

  if (sessionError) {
    throw sessionError;
  }

  return data;
}

// إنشاء حساب جديد
export async function registerWithUsername(username, password) {
  return usernameAuth("signup", username, password);
}

// تسجيل الدخول
export async function loginWithUsername(username, password) {
  return usernameAuth("signin", username, password);
}

// تسجيل الخروج
export async function logoutUser() {
  const { error } = await supabase.auth.signOut();

  if (error) throw error;

  return true;
}

// جلب جلسة المستخدم الحالية
export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  return data.session;
}

// الاستماع لتغييرات حالة تسجيل الدخول
export function watchAuthChanges(callback) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

export { SUPABASE_URL };
