
export async function renderNotificationsSection({
  root,
  supabase,
  sessionToken
}) {
  if (!root || !supabase || !sessionToken) {
    throw new Error("بيانات قسم الإشعارات غير مكتملة");
  }

  let busy = false;

  root.innerHTML = `
    <style>
      .hn-notify {
        direction:rtl;
        color:#f5f1ff;
        font-family:Cairo, sans-serif;
      }
      .hn-notify * { box-sizing:border-box; }
      .hn-card {
        background:linear-gradient(145deg,#1d1930,#141321);
        border:1px solid #39304f;
        border-radius:20px;
        padding:20px;
        margin-bottom:18px;
      }
      .hn-title {
        font-size:22px;
        font-weight:900;
        margin:0 0 8px;
      }
      .hn-muted { color:#aaa3bd; font-size:13px; }
      .hn-field { margin-top:16px; }
      .hn-field label {
        display:block;
        margin-bottom:8px;
        font-size:13px;
        color:#d8cffa;
      }
      .hn-field input,.hn-field textarea,.hn-field select {
        width:100%;
        border:1px solid #39334d;
        background:#100f1a;
        color:white;
        border-radius:12px;
        padding:13px;
        outline:none;
        font:inherit;
      }
      .hn-field input:focus,.hn-field textarea:focus {
        border-color:#a18dff;
      }
      .hn-field textarea {
        min-height:125px;
        resize:vertical;
      }
      .hn-preview {
        border:1px solid #6650a0;
        background:linear-gradient(130deg,#292044,#171426);
        border-radius:18px;
        padding:18px;
      }
      .hn-sender {
        display:flex;
        align-items:center;
        gap:12px;
        margin-bottom:15px;
      }
      .hn-logo {
        width:48px;height:48px;
        display:grid;place-items:center;
        border-radius:15px;
        background:linear-gradient(135deg,#9c7cff,#6345c7);
        font-size:22px;font-weight:900;
        box-shadow:0 5px 22px #8060d455;
      }
      .hn-verified {
        display:inline-flex;
        align-items:center;
        justify-content:center;
        width:17px;height:17px;
        border-radius:50%;
        background:#329be9;
        color:white;
        font-size:11px;
        margin-right:5px;
      }
      .hn-official {
        color:#c6b4ff;
        font-size:11px;
        margin-top:3px;
      }
      .hn-send {
        width:100%;
        border:0;
        border-radius:13px;
        padding:15px;
        margin-top:18px;
        color:white;
        font:inherit;
        font-weight:900;
        background:linear-gradient(100deg,#7958d8,#a17cff);
        cursor:pointer;
      }
      .hn-send:disabled { opacity:.55; cursor:wait; }
      .hn-result {
        display:none;
        padding:13px;
        border-radius:12px;
        margin-top:14px;
        white-space:pre-wrap;
        font-size:13px;
      }
      .hn-result.ok { display:block;background:#15372d;color:#9af0c7; }
      .hn-result.err { display:block;background:#3b2029;color:#ffb4c1; }
    </style>

    <div class="hn-notify">
      <div class="hn-card">
        <h2 class="hn-title">مركز الإشعارات</h2>
        <div class="hn-muted">
          إرسال إشعارات رسمية إلى أعضاء HANOON WORLD
        </div>
      </div>

      <div class="hn-card">
        <h3 class="hn-title" style="font-size:17px">إنشاء إشعار جديد</h3>

        <div class="hn-field">
          <label>المستلمون</label>
          <select id="hnAudience">
            <option value="all">جميع الأعضاء</option>
            <option value="completed">الأعضاء المكتملون لملفاتهم</option>
            <option value="member">عضو محدد بكود العضوية</option>
          </select>
        </div>

        <div class="hn-field" id="hnMemberWrap" style="display:none">
          <label>كود العضوية</label>
          <input id="hnMemberCode" placeholder="اكتب كود العضو">
        </div>

        <div class="hn-field">
          <label>عنوان الإشعار</label>
          <input id="hnTitle" maxlength="180"
            placeholder="اكتب عنوان الإشعار">
        </div>

        <div class="hn-field">
          <label>نص الإشعار</label>
          <textarea id="hnBody" maxlength="2000"
            placeholder="اكتب رسالة الإدارة هنا..."></textarea>
        </div>

        <div class="hn-field">
          <label>الصفحة التي يفتحها الإشعار (اختياري)</label>
          <select id="hnRoute">
            <option value="">بدون انتقال</option>
            <option value="home.html">الرئيسية</option>
            <option value="members.html">الأعضاء</option>
            <option value="notifications.html">الإشعارات</option>
            <option value="games.html">الألعاب</option>
            <option value="rooms.html">الغرف</option>
          </select>
        </div>
      </div>

      <div class="hn-card">
        <h3 class="hn-title" style="font-size:17px">معاينة الإشعار</h3>

        <div class="hn-preview">
          <div class="hn-sender">
            <div class="hn-logo">H</div>
            <div>
              <div style="font-weight:900">
                إدارة HANOON WORLD
                <span class="hn-verified">✓</span>
              </div>
              <div class="hn-official">المرسل الرسمي الموثّق</div>
            </div>
          </div>
          <div id="hnPreviewTitle" style="font-weight:900;margin-bottom:8px">
            عنوان الإشعار
          </div>
          <div id="hnPreviewBody" class="hn-muted"
            style="font-size:14px;line-height:1.9">
            سيظهر نص الإشعار هنا
          </div>
        </div>

        <button class="hn-send" id="hnSend">
          إرسال الإشعار الآن
        </button>

        <div class="hn-result" id="hnResult"></div>
      </div>
    </div>
  `;

  const $ = id => root.querySelector("#" + id);

  const audience = $("hnAudience");
  const memberWrap = $("hnMemberWrap");
  const title = $("hnTitle");
  const body = $("hnBody");
  const send = $("hnSend");
  const result = $("hnResult");

  audience.addEventListener("change", () => {
    memberWrap.style.display =
      audience.value === "member" ? "block" : "none";
  });

  title.addEventListener("input", () => {
    $("hnPreviewTitle").textContent =
      title.value.trim() || "عنوان الإشعار";
  });

  body.addEventListener("input", () => {
    $("hnPreviewBody").textContent =
      body.value.trim() || "سيظهر نص الإشعار هنا";
  });

  function showResult(message, success) {
    result.className = "hn-result " + (success ? "ok" : "err");
    result.textContent = message;
  }

  send.addEventListener("click", async () => {
    if (busy) return;

    const notificationTitle = title.value.trim();
    const notificationBody = body.value.trim();
    const selectedAudience = audience.value;
    const memberCode = $("hnMemberCode").value.trim();
    const targetRoute = $("hnRoute").value;

    if (!notificationTitle || !notificationBody) {
      showResult("اكتب عنوان الإشعار ونص الرسالة أولاً.", false);
      return;
    }

    if (selectedAudience === "member" && !memberCode) {
      showResult("اكتب كود العضوية المستهدف.", false);
      return;
    }

    const audienceNames = {
      all: "جميع الأعضاء",
      completed: "الأعضاء المكتملون",
      member: "العضو المحدد"
    };

    if (!confirm(
      "هل تريد إرسال هذا الإشعار إلى " +
      audienceNames[selectedAudience] + "؟"
    )) return;

    busy = true;
    send.disabled = true;
    send.textContent = "جارٍ الإرسال...";

    try {
      const { data, error } =
        await supabase.functions.invoke(
          "admin-send-notification",
          {
            body: {
              action: "send",
              title: notificationTitle,
              body: notificationBody,
              audience: selectedAudience,
              memberCode,
              targetRoute
            },
            headers: {
              "x-admin-session": sessionToken
            }
          }
        );

      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || "تعذر إرسال الإشعار");
      }

      showResult(
        "تم إرسال الإشعار بنجاح إلى " +
        data.sent + " عضو.",
        true
      );

      title.value = "";
      body.value = "";
      $("hnMemberCode").value = "";
      $("hnPreviewTitle").textContent = "عنوان الإشعار";
      $("hnPreviewBody").textContent = "سيظهر نص الإشعار هنا";

    } catch (error) {
      showResult(
        error?.message || "حدث خطأ أثناء إرسال الإشعار.",
        false
      );
    } finally {
      busy = false;
      send.disabled = false;
      send.textContent = "إرسال الإشعار الآن";
    }
  });
}
