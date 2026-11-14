
/* =========================================
   HANOON WORLD
   CENTRAL DATABASE CONNECTION
   Supabase JavaScript Client
========================================= */

import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

/* -----------------------------------------
   DATABASE CONFIGURATION
----------------------------------------- */

const SUPABASE_URL =
  "https://gjtgvczvclfwvlvcquxh.supabase.co";

const SUPABASE_ANON_KEY =
  "sb_publishable_4DVTUZ-xTlqU2GpFvpb7lw_g-Kxomd4";

/* -----------------------------------------
   CREATE DATABASE CLIENT
----------------------------------------- */

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: window.localStorage
    },

    global: {
      headers: {
        "X-Client-Info": "hanoon-world-web"
      }
    },

    db: {
      schema: "public"
    }
  }
);

/* -----------------------------------------
   CONNECTION HELPERS
----------------------------------------- */

export async function checkDatabaseConnection() {
  try {
    const { error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1);

    if (error) throw error;

    return {
      connected: true,
      message: "Database connection successful"
    };

  } catch (error) {
    console.error(
      "HANOON DATABASE ERROR:",
      error
    );

    return {
      connected: false,
      message: error.message
    };
  }
}

/* -----------------------------------------
   CURRENT USER
----------------------------------------- */

export async function getCurrentUser() {
  const { data, error } =
    await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return data.user || null;
}

/* -----------------------------------------
   CURRENT SESSION
----------------------------------------- */

export async function getCurrentSession() {
  const { data, error } =
    await supabase.auth.getSession();

  if (error) {
    console.error(error);
    return null;
  }

  return data.session || null;
}

/* -----------------------------------------
   AUTH STATE LISTENER
----------------------------------------- */

export function listenToAuthChanges(callback) {
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(
    (event, session) => {
      callback(event, session);
    }
  );

  return subscription;
}

/* -----------------------------------------
   DATABASE STATUS
----------------------------------------- */

console.info(
  "HANOON WORLD DATABASE CLIENT INITIALIZED"
);
