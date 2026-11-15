
export async function renderSecuritySection({
  root,
  supabase,
  sessionToken
}) {
  if (!root || !supabase || !sessionToken) {
    throw new Error("بيانات سجل الأمان غير مكتملة.");
  }

  let entries = [];
  let loading = false;

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    })[char]);

  const formatDate = value => {
    if (!value) return "غير محدد";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "غير محدد";

    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle:"medium",
      timeStyle:"short"
    }).format(date);
  };

  const actionName = action => {
    const names = {
      member_verified:"توثيق عضو",
      member_unverified:"إلغاء توثيق عضو",
      wallet_adjustment:"تعديل رصيد",
      wallet_transfer:"تحويل رصيد",
      notification_sent:"إرسال إشعار",
      content_updated:"تعديل محتوى",
      site_setting_updated:"تعديل إعدادات الموقع",
      update_published:"نشر تحديث",
      update_withdrawn:"سحب تحديث",
      admin_login:"تسجيل دخول الإدارة",
      admin_logout:"تسجيل خروج الإدارة"
    };

    return names[action] || action || "نشاط إداري";
  };

  function render() {
    root.innerHTML = `
      <style>
        .hs-security{
          direction:rtl;color:#f5efff;
          font-family:Cairo,sans-serif;
        }
        .hs-security *{box-sizing:border-box}
        .hs-panel{
          padding:19px;border:1px solid #40304f;
          border-radius:18px;
          background:linear-gradient(145deg,#21172f,#120e1c);
          margin-bottom:15px;
        }
        .hs-heading{
          font-size:21px;font-weight:900;margin:0 0 7px;
        }
        .hs-muted{color:#b9abc9;font-size:12px;line-height:1.9}
        .hs-toolbar{
          display:flex;justify-content:space-between;
          align-items:center;gap:10px;flex-wrap:wrap;
        }
        .hs-count{
          color:#f1d49a;font-size:12px;
          border:1px solid #c9a35b66;
          border-radius:30px;padding:7px 12px;
        }
        .hs-refresh{
          border:1px solid #a77be8;
          background:#4b2872;color:white;
          padding:9px 15px;border-radius:10px;
          font:inherit;font-size:12px;font-weight:800;
        }
        .hs-list{display:grid;gap:10px}
        .hs-entry{
          border:1px solid #ffffff18;
          border-right:3px solid #b78bdf;
          border-radius:13px;padding:14px;
          background:#100d19;
        }
        .hs-entry-top{
          display:flex;justify-content:space-between;
          align-items:center;gap:10px;flex-wrap:wrap;
        }
        .hs-action{font-weight:900;color:#f1d49a;font-size:13px}
        .hs-date{color:#a99bb8;font-size:10px}
        .hs-details{
          color:#ddd1e9;font-size:12px;
          line-height:1.9;margin-top:9px;
          overflow-wrap:anywhere;
        }
        .hs-target{
          color:#b99bdb;font-size:10px;margin-top:7px;
        }
        .hs-empty{
          padding:30px 15px;text-align:center;
          color:#b9abc9;font-size:13px;
          border:1px dashed #73558e;border-radius:13px;
        }
        .hs-error{
          color:#ffb9c5;background:#411e2b;
          padding:13px;border-radius:12px;
          font-size:12px;line-height:1.8;
        }
      </style>

      <div class="hs-security">
        <div class="hs-panel">
          <h2 class="hs-heading">سجل الأمان والنشاط</h2>
          <div class="hs-muted">
            مراجعة العمليات الإدارية المسجلة في قاعدة البيانات.
            يتم عرض السجلات المتاحة فعليًا فقط.
          </div>
        </div>

        <div class="hs-panel">
          <div class="hs-toolbar">
            <span class="hs-count" id="hsCount">جارٍ التحميل...</span>
            <button class="hs-refresh" id="hsRefresh" type="button">
              تحديث السجل
            </button>
          </div>
        </div>

        <div class="hs-list" id="hsList">
          <div class="hs-empty">جارٍ تحميل سجل النشاط...</div>
        </div>
      </div>
    `;

    root.querySelector("#hsRefresh")
      .addEventListener("click", load);
  }

  function renderEntries() {
    const list = root.querySelector("#hsList");
    const count = root.querySelector("#hsCount");

    count.textContent = entries.length + " سجل";

    if (!entries.length) {
      list.innerHTML = `
        <div class="hs-empty">
          لا توجد سجلات نشاط مسجلة حتى الآن.
        </div>
      `;
      return;
    }

    list.innerHTML = entries.map(entry => {
      const details = entry.details &&
        typeof entry.details === "object"
        ? JSON.stringify(entry.details, null, 2)
        : String(entry.details || "");

      return `
        <article class="hs-entry">
          <div class="hs-entry-top">
            <strong class="hs-action">
              ${escapeHTML(actionName(entry.action))}
            </strong>
            <span class="hs-date">
              ${escapeHTML(formatDate(entry.created_at))}
            </span>
          </div>

          ${
            details
              ? `<div class="hs-details">${escapeHTML(details)}</div>`
              : ""
          }

          ${
            entry.target_type || entry.target_id
              ? `<div class="hs-target">
                  الهدف:
                  ${escapeHTML(entry.target_type || "غير محدد")}
                  ${entry.target_id
                    ? " • " + escapeHTML(entry.target_id)
                    : ""}
                </div>`
              : ""
          }
        </article>
      `;
    }).join("");
  }

  async function load() {
    if (loading) return;
    loading = true;

    const list = root.querySelector("#hsList");
    const refresh = root.querySelector("#hsRefresh");

    refresh.disabled = true;
    refresh.textContent = "جارٍ التحديث...";

    try {
      const {data,error} = await supabase.rpc(
        "hanoon_admin_audit_list",
        {
          p_session_token:sessionToken,
          p_limit:100
        }
      );

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "تعذر تحميل سجل النشاط.");
      }

      entries = Array.isArray(data.entries)
        ? data.entries
        : [];

      renderEntries();

    } catch(error) {
      list.innerHTML = `
        <div class="hs-error">
          ${escapeHTML(error?.message || "حدث خطأ أثناء تحميل السجل.")}
        </div>
      `;
    } finally {
      loading = false;
      refresh.disabled = false;
      refresh.textContent = "تحديث السجل";
    }
  }

  render();
  await load();

  return {
    destroy() {
      entries = [];
      root.innerHTML = "";
    },
    refresh:load
  };
}
