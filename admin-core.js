
/* =========================================================
   HANOON WORLD — ADMIN EXTENSIONS CORE
   File: admin-core.js

   Connects:
   - admin-site.js
   - admin-content.js
   - admin-updates.js
========================================================= */

import { mountSiteEditor } from "./admin-site.js";
import { mountContentManager } from "./admin-content.js";
import { mountUpdateCenter } from "./admin-updates.js";

export function createAdminExtensions({
  supabase,
  sessionToken,
  toast = () => {}
}) {
  if (!supabase || !sessionToken) {
    throw new Error("جلسة الإدارة أو اتصال قاعدة البيانات غير متاح.");
  }

  const modules = {
    site: {
      rootId: "adminSiteRoot",
      mount: mountSiteEditor,
      instance: null
    },

    content: {
      rootId: "adminContentRoot",
      mount: mountContentManager,
      instance: null
    },

    updates: {
      rootId: "adminUpdatesRoot",
      mount: mountUpdateCenter,
      instance: null
    }
  };

  let activeModule = null;
  let destroyed = false;

  function stopModule(name) {
    const module = modules[name];

    if (!module || !module.instance) return;

    try {
      module.instance.destroy?.();
    } catch (error) {
      console.error("Admin module cleanup:", error);
    }

    module.instance = null;
  }

  function open(name) {
    if (destroyed) return false;

    const module = modules[name];

    if (!module) {
      console.warn("Unknown admin module:", name);
      return false;
    }

    if (activeModule && activeModule !== name) {
      stopModule(activeModule);
    }

    const root = document.getElementById(module.rootId);

    if (!root) {
      console.error(
        "Admin module root was not found:",
        module.rootId
      );
      return false;
    }

    activeModule = name;

    if (!module.instance) {
      try {
        module.instance = module.mount({
          root,
          supabase,
          sessionToken,
          toast
        });
      } catch (error) {
        console.error("Admin module failed:", error);
        toast(
          error?.message || "تعذر تشغيل قسم الإدارة.",
          true
        );
        return false;
      }
    }

    return true;
  }

  function close() {
    if (!activeModule) return;

    stopModule(activeModule);
    activeModule = null;
  }

  function destroy() {
    Object.keys(modules).forEach(stopModule);
    activeModule = null;
    destroyed = true;
  }

  return {
    open,
    close,
    destroy,

    get active() {
      return activeModule;
    }
  };
}
