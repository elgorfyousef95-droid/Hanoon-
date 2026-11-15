/* =========================================================
   HANOON WORLD — VISUAL UPDATE & RELEASE CENTER
   File: admin-updates.js
   إدارة التصميم والخلفيات والإصدارات بدون كتابة أكواد.
========================================================= */

export function mountUpdateCenter({ root, supabase, sessionToken, toast = () => {} }) {
  if (!root || !supabase || !sessionToken) throw new Error("بيانات تشغيل مركز التحديثات غير مكتملة.");

  const BUCKET = "hanoon-site-assets";
  const MAX_IMAGE = 10 * 1024 * 1024;
  const MAX_FILE = 50 * 1024 * 1024;
  let releases = [];
  let selectedRelease = null;
  let backgroundFile = null;
  let announcementFile = null;
  let assetFile = null;
  let appearance = { accent: "#a982f5", background: "#090711", backgroundImage: "" };
  let busy = false;

  const $ = selector => root.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c]);
  const notify = (message, type = "info") => toast(message, type);
  const publicUrl = path => !path ? "" : /^https?:\/\//i.test(path) ? path : supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const dateText = value => value ? new Intl.DateTimeFormat("ar-EG", { dateStyle:"medium", timeStyle:"short" }).format(new Date(value)) : "غير محدد";
  const sizeText = bytes => { const n = Number(bytes || 0); return n < 1048576 ? `${(n/1024).toFixed(1)} كيلوبايت` : `${(n/1048576).toFixed(2)} ميجابايت`; };
  const typeNames = { general:"تحديث عام", design:"تغيير التصميم والخلفيات", content:"محتوى جديد", features:"مميزات جديدة", fixes:"إصلاحات وتحسينات" };

  root.innerHTML = `
    <section class="hw-module hw-update-center" dir="rtl">
      <style>
        .hw-update-center{--u-purple:#9b7bff;--u-gold:#e8c77a;color:#f5f0ff}
        .hw-update-center .hw-card{background:linear-gradient(145deg,rgba(31,24,49,.97),rgba(13,12,24,.98));border:1px solid rgba(185,151,255,.2);box-shadow:0 18px 55px rgba(0,0,0,.24);border-radius:20px;padding:20px;margin:16px 0}
        .hw-update-center .hw-content-heading{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px}
        .hw-update-center .hw-content-heading h3{margin:0 0 6px;font-size:18px}
        .hw-update-center .hw-content-heading p,.hw-update-center small{color:#bdb2d2;font-size:12px}
        .hw-update-center .hw-field{display:flex;flex-direction:column;gap:8px;margin:12px 0;min-width:0}
        .hw-update-center .hw-field label,.hw-update-center .hw-field>span{font-size:12px;color:#e9defa}
        .hw-update-center .hw-input,.hw-update-center input:not([type=checkbox]):not([type=color]):not([type=file]),.hw-update-center textarea,.hw-update-center select{width:100%;box-sizing:border-box;background:#171322;color:#fff;border:1px solid #514568;border-radius:11px;padding:12px;font:inherit;min-height:44px}
        .hw-update-center input[type=file]{max-width:100%;padding:12px;background:#171322;border:1px dashed #705d91;border-radius:12px;color:#eee}
        .hw-update-center input[type=color]{width:100%;height:45px;border:1px solid #514568;border-radius:10px;background:#171322;padding:4px}
        .hw-update-center .hw-form-grid,.hw-update-center .hw-appearance-grid,.hw-update-center .hw-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
        .hw-update-center .hw-stats{grid-template-columns:repeat(3,minmax(0,1fr));margin:14px 0}
        .hw-update-center .hw-stats .hw-card{margin:0}
        .hw-update-center .hw-stats strong{display:block;font-size:25px;color:#e8c77a;margin-top:7px}
        .hw-update-center .hw-action{border:1px solid rgba(210,190,255,.22);border-radius:11px;background:#211a31;color:#fff;padding:10px 15px;cursor:pointer;font:inherit;font-size:12px}
        .hw-update-center .hw-action.primary{background:linear-gradient(120deg,#8d69ed,#bd8cda);border:0}
        .hw-update-center .hw-action.danger{background:#572338}
        .hw-update-center .hw-action:disabled{opacity:.5;cursor:not-allowed}
        .hw-update-center .hw-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
        .hw-update-center .hw-status{font-size:11px;border-radius:30px;padding:6px 10px;background:#34294b;color:#e5d5ff}
        .hw-update-center .hw-status.published{background:#173c36;color:#8ce2c6}
        .hw-update-center .hw-status.withdrawn{background:#49222d;color:#ff9cad}
        .hw-update-center .hw-appearance-preview{min-height:260px;border-radius:18px;overflow:hidden;display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 20% 15%,#7852b955,transparent 45%),linear-gradient(135deg,#211737,#0e1724);background-size:cover;background-position:center;border:1px solid rgba(255,255,255,.14)}
        .hw-update-center .hw-preview-glass{width:min(100%,360px);padding:24px;border-radius:18px;background:rgba(15,12,27,.72);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(14px);text-align:center}
        .hw-update-center .hw-preview-glass span{font-size:10px;letter-spacing:2px;color:#d8c3ff}
        .hw-update-center .hw-preview-glass h3{font-size:24px;margin:12px 0}
        .hw-update-center .hw-preview-glass p{font-size:12px;color:#d4cce3}
        .hw-update-center .hw-preview-glass button{border:0;border-radius:30px;padding:10px 22px;color:#fff;background:linear-gradient(120deg,#9b7bff,#c99a67)}
        .hw-update-center .hw-release-card{padding:16px;border:1px solid rgba(190,160,230,.17);border-radius:16px;background:rgba(9,8,18,.45);margin:12px 0}
        .hw-update-center .hw-release-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
        .hw-update-center .hw-release-version{color:#e8c77a;font-size:12px}
        .hw-update-center .hw-release-card h4{margin:7px 0;font-size:16px}
        .hw-update-center .hw-release-card p{color:#c7bdd7;font-size:12px;white-space:pre-wrap}
        .hw-update-center .hw-release-meta{display:flex;gap:12px;flex-wrap:wrap;color:#b7aaca;font-size:11px;margin:10px 0}
        .hw-update-center .hw-release-banner img{width:min(100%,380px);max-height:190px;object-fit:cover;border-radius:13px;border:1px solid #55436d}
        .hw-update-center .hw-feedback{font-size:12px;color:#d8c3ff;margin-top:10px;min-height:18px}
        @media(max-width:700px){
          .hw-update-center .hw-form-grid,.hw-update-center .hw-appearance-grid{grid-template-columns:1fr}
          .hw-update-center .hw-stats{grid-template-columns:1fr}
          .hw-update-center .hw-appearance-preview{min-height:210px}
          .hw-update-center .hw-card{padding:14px}
        }
      </style>

      <header class="hw-module-header">
        <div>
          <span class="hw-eyebrow">HANOON WORLD / CONTROL STUDIO</span>
          <h2>مركز التحديثات والتحكم في الموقع</h2>
          <p>غيّر الخلفيات والألوان، جهّز الإصدارات، واعرض التحديث للأعضاء من غير كتابة أكواد.</p>
        </div>
        <button class="hw-action" type="button" data-action="reload">تحديث البيانات</button>
      </header>

      <div class="hw-stats">
        <div class="hw-card"><span>كل الإصدارات</span><strong id="uCountAll">0</strong></div>
        <div class="hw-card"><span>منشورة</span><strong id="uCountPublished">0</strong></div>
        <div class="hw-card"><span>مسودات</span><strong id="uCountDraft">0</strong></div>
      </div>

      <section class="hw-card">
        <div class="hw-content-heading">
          <div><h3>استوديو الخلفيات والألوان</h3><p>اختر صورة من موبايلك أو جهازك، وغيّر ألوان الموقع مع معاينة فورية.</p></div>
          <span class="hw-status published">تحكم بصري</span>
        </div>
        <div class="hw-appearance-grid">
          <div>
            <label class="hw-field"><span>لون الهوية الرئيسي</span><input id="uAccent" type="color" value="#a982f5"></label>
            <label class="hw-field"><span>لون خلفية الموقع</span><input id="uBackground" type="color" value="#090711"></label>
            <label class="hw-field"><span>اختيار خلفية من الجهاز</span><input id="uBackgroundFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
            <div class="hw-actions">
              <button class="hw-action primary" type="button" data-action="save-appearance">حفظ ونشر شكل الموقع</button>
              <button class="hw-action" type="button" data-action="remove-background">إزالة الخلفية</button>
            </div>
            <div class="hw-feedback" id="uAppearanceFeedback"></div>
            <small>صور PNG وJPG وWEBP وGIF حتى 10 ميجابايت. الحفظ يحدّث إعدادات التصميم المشتركة؛ ظهورها في صفحات الموقع يتطلب أن تقرأ الصفحات إعدادات المظهر المحفوظة.</small>
          </div>
          <div class="hw-appearance-preview" id="uAppearancePreview">
            <div class="hw-preview-glass">
              <span>HANOON WORLD</span>
              <h3>عالمك يبدأ من هنا</h3>
              <p>معاينة الخلفية والألوان قبل الحفظ</p>
              <button type="button">اكتشف الموقع</button>
            </div>
          </div>
        </div>
      </section>

      <section class="hw-card">
        <div class="hw-content-heading">
          <div><h3>إنشاء إصدار جديد</h3><p>حدد رقم الإصدار ونوعه وصورة الإعلان وطريقة ظهوره للأعضاء.</p></div>
        </div>
        <form id="uReleaseForm">
          <div class="hw-form-grid">
            <label class="hw-field"><span>رقم الإصدار</span><input id="uVersion" name="version" placeholder="مثال: 2.0.0" maxlength="40" required></label>
            <label class="hw-field"><span>عنوان التحديث</span><input id="uTitle" name="title" placeholder="تحديث هَنون الجديد" maxlength="160" required></label>
            <label class="hw-field">
              <span>نوع التحديث</span>
              <select id="uType">
                <option value="general">تحديث عام</option>
                <option value="design">تغيير التصميم والخلفيات</option>
                <option value="content">محتوى جديد</option>
                <option value="features">مميزات جديدة</option>
                <option value="fixes">إصلاحات وتحسينات</option>
              </select>
            </label>
            <label class="hw-field">
              <span>طريقة التحديث</span>
              <select id="uMandatory">
                <option value="false">اختياري — يمكن التأجيل</option>
                <option value="true">إجباري — يتطلب متابعة التحديث</option>
              </select>
            </label>
          </div>
          <label class="hw-field"><span>وصف التحديث</span><textarea id="uDescription" name="description" rows="3" maxlength="3000" placeholder="اكتب رسالة التحديث التي ستظهر للأعضاء..."></textarea></label>
          <label class="hw-field"><span>صورة إعلان التحديث من جهازك (اختياري)</span><input id="uAnnouncementImage" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label>
          <label class="hw-field"><span>إيه الجديد؟ (كل نقطة في سطر)</span><textarea id="uChangelog" name="changelog" rows="5" placeholder="خلفية جديدة للموقع&#10;تحسين شكل الصفحات&#10;إضافة مميزات جديدة"></textarea></label>
          <button class="hw-action primary" type="submit">إنشاء الإصدار وحفظه كمسودة</button>
        </form>
      </section>

      <section class="hw-card">
        <div class="hw-content-heading">
          <div><h3>إضافة صورة أو ملف للمسودة</h3><p>لإرفاق صورة أو ملف مرتبط بإصدار معين، من غير تعديل الأكواد.</p></div>
        </div>
        <div class="hw-form-grid">
          <label class="hw-field"><span>الإصدار</span><select id="uAssetRelease"><option value="">اختر إصدارًا مسودة</option></select></label>
          <label class="hw-field">
            <span>نوع الملف</span>
            <select id="uAssetType">
              <option value="image">صورة</option>
              <option value="video">فيديو</option>
              <option value="audio">صوت</option>
              <option value="font">خط</option>
              <option value="other">ملف آخر</option>
            </select>
          </label>
        </div>
        <label class="hw-field"><span>اسم العنصر أو وصفه</span><input id="uAssetPath" placeholder="مثال: خلفية الصفحة الرئيسية"></label>
        <label class="hw-field"><span>اختيار الملف من الجهاز</span><input id="uAssetFile" type="file"></label>
        <button class="hw-action primary" type="button" data-action="add-asset">إضافة الملف للإصدار</button>
        <div class="hw-feedback" id="uAssetFeedback"></div>
      </section>

      <section class="hw-card">
        <div class="hw-content-heading">
          <div><h3>سجل الإصدارات</h3><p>راجع المسودات والمنشور واسحب أي إصدار عند الحاجة.</p></div>
        </div>
        <div id="uReleaseList">جارٍ تحميل الإصدارات...</div>
      </section>

      <section class="hw-card">
        <h3>معلومة مهمة عن ظهور التحديث</h3>
        <p style="color:#c7bdd7;font-size:12px;line-height:1.9">
          نشر الإصدار ينشئ إشعارات للأعضاء ويخزن بيانات التحديث في قاعدة البيانات.
          التحديث الإجباري/الاختياري وصورة الإعلان تُحفظ مع الإصدار.
          أما تغيير الخلفية فيحفظ إعدادات المظهر المشتركة؛ يجب أن تكون صفحات الموقع
          مربوطة بقراءة هذه الإعدادات حتى يظهر التغيير عليها كلها.
          هذا المركز لا يستبدل ملفات الموقع البرمجية.
        </p>
      </section>
    </section>`;  function paintAppearance() {
    const preview = $("#uAppearancePreview");
    if (!preview) return;

    const accent = $("#uAccent")?.value || appearance.accent;
    const bg = $("#uBackground")?.value || appearance.background;

    preview.style.backgroundColor = bg;
    preview.style.borderColor = accent;

    preview.style.backgroundImage = appearance.backgroundImage
      ? `linear-gradient(90deg,rgba(12,9,22,.72),rgba(12,9,22,.58)),url("${appearance.backgroundImage}")`
      : `radial-gradient(circle at 20% 15%,${accent}66,transparent 45%),linear-gradient(135deg,#211737,#0e1724)`;
  }

  async function upload(file, folder, max = MAX_IMAGE) {
    if (!file) return null;

    if (file.size > max) {
      throw new Error(`حجم الملف أكبر من الحد المسموح (${sizeText(max)}).`);
    }

    const ext = (file.name.split(".").pop() || "bin")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin";

    const path = `${folder}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, {
        cacheControl:"3600",
        upsert:false,
        contentType:file.type || "application/octet-stream"
      });

    if (error) throw error;

    return path;
  }

  async function loadAppearance() {
    const { data, error } = await supabase.rpc(
      "hanoon_admin_get_site_settings",
      { p_session_token:sessionToken }
    );

    if (error) throw error;

    const row = (Array.isArray(data) ? data : [])
      .find(item => item.setting_key === "site_appearance");

    const value = row?.setting_value || {};

    appearance = {
      accent:value.accent || "#a982f5",
      background:value.background || "#090711",
      backgroundImage:value.backgroundImage || ""
    };

    $("#uAccent").value = appearance.accent;
    $("#uBackground").value = appearance.background;

    paintAppearance();
  }

  async function saveAppearance() {
    const button = $('[data-action="save-appearance"]');

    button.disabled = true;

    try {
      let imagePath = appearance.backgroundImage;

      if (backgroundFile) {
        imagePath = await upload(
          backgroundFile,
          "site-backgrounds"
        );
      }

      const next = {
        brand:"HANOON WORLD",
        accent:$("#uAccent").value,
        background:$("#uBackground").value,
        backgroundImage:imagePath || ""
      };

      const { data, error } = await supabase.rpc(
        "hanoon_admin_save_site_appearance",
        {
          p_session_token:sessionToken,
          p_settings:next
        }
      );

      if (error) throw error;

      if (data?.ok === false) {
        throw new Error(data.error || "تعذر حفظ المظهر.");
      }

      appearance = next;
      backgroundFile = null;

      $("#uAppearanceFeedback").textContent =
        "تم حفظ إعدادات المظهر والخلفية في قاعدة البيانات.";

      paintAppearance();

      notify(
        "تم حفظ إعدادات الخلفية والألوان.",
        "success"
      );

    } catch (error) {
      notify(error.message || "تعذر حفظ المظهر.", "error");

    } finally {
      button.disabled = false;
    }
  }

  async function loadReleases() {
    const { data, error } = await supabase.rpc(
      "hanoon_admin_list_update_releases",
      { p_session_token:sessionToken }
    );

    if (error) throw error;

    releases = Array.isArray(data) ? data : [];

    $("#uCountAll").textContent = releases.length;

    $("#uCountPublished").textContent =
      releases.filter(r => r.status === "published").length;

    $("#uCountDraft").textContent =
      releases.filter(r => r.status === "draft").length;

    const drafts = releases.filter(r => r.status === "draft");

    $("#uAssetRelease").innerHTML =
      `<option value="">اختر إصدارًا مسودة</option>` +
      drafts.map(r =>
        `<option value="${esc(r.id)}">${esc(r.version)} — ${esc(r.title)}</option>`
      ).join("");

    $("#uReleaseList").innerHTML = releases.length
      ? releases.map(r => `
        <article class="hw-release-card">
          <div class="hw-release-top">
            <div>
              <span class="hw-release-version">الإصدار ${esc(r.version)}</span>
              <h4>${esc(r.title)}</h4>
            </div>

            <span class="hw-status ${
              r.status === "published"
                ? "published"
                : r.status === "withdrawn"
                  ? "withdrawn"
                  : ""
            }">
              ${
                r.status === "published"
                  ? "منشور"
                  : r.status === "withdrawn"
                    ? "مسحوب"
                    : "مسودة"
              }
            </span>
          </div>

          <p>${esc(r.description || "لا يوجد وصف.")}</p>

          ${
            Array.isArray(r.changelog) && r.changelog.length
              ? `<ul style="color:#d8cce8;font-size:12px;line-height:1.9;padding-right:20px">
                  ${r.changelog.map(item =>
                    `<li>${esc(typeof item === "string" ? item : item?.text || item?.title || "")}</li>`
                  ).join("")}
                </ul>`
              : ""
          }

          <div class="hw-release-meta">
            <span>${esc(typeNames[r.release_type] || "تحديث عام")}</span>
            <span>${r.is_mandatory ? "إجباري" : "اختياري"}</span>
            <span>الحجم: ${sizeText(r.total_size_bytes)}</span>
            <span>تاريخ الإنشاء: ${dateText(r.created_at)}</span>
          </div>

          ${
            r.announcement_image_path
              ? `<div class="hw-release-banner">
                  <img src="${esc(publicUrl(r.announcement_image_path))}" alt="إعلان التحديث">
                </div>`
              : ""
          }

          <div class="hw-actions">
            ${
              r.status === "draft"
                ? `<button class="hw-action primary" type="button" data-publish="${esc(r.id)}">نشر الإصدار</button>`
                : ""
            }

            ${
              r.status === "published"
                ? `<button class="hw-action danger" type="button" data-withdraw="${esc(r.id)}">سحب الإصدار</button>`
                : ""
            }

            ${
              r.status === "draft"
                ? `<button class="hw-action" type="button" data-pick-release="${esc(r.id)}">إضافة ملفات</button>`
                : ""
            }
          </div>
        </article>
      `).join("")
      : "<p>لا توجد إصدارات حتى الآن.</p>";

    root.querySelectorAll("[data-publish]").forEach(button => {
      button.addEventListener("click", () =>
        publish(button.dataset.publish)
      );
    });

    root.querySelectorAll("[data-withdraw]").forEach(button => {
      button.addEventListener("click", () =>
        withdraw(button.dataset.withdraw)
      );
    });

    root.querySelectorAll("[data-pick-release]").forEach(button => {
      button.addEventListener("click", () => {
        $("#uAssetRelease").value = button.dataset.pickRelease;

        $("#uAssetRelease").scrollIntoView({
          behavior:"smooth",
          block:"center"
        });
      });
    });
                        }  async function createRelease(event) {
    event.preventDefault();

    if (busy) return;

    const version = $("#uVersion").value.trim();
    const title = $("#uTitle").value.trim();
    const description = $("#uDescription").value.trim();
    const type = $("#uType").value;
    const mandatory = $("#uMandatory").value === "true";

    const changelog = $("#uChangelog").value
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(text => ({text}));

    if (!version || !title) {
      return notify("اكتب رقم الإصدار والعنوان.", "error");
    }

    busy = true;

    try {
      const {
        data:releaseId,
        error
      } = await supabase.rpc(
        "hanoon_admin_create_update_release",
        {
          p_session_token:sessionToken,
          p_version:version,
          p_title:title,
          p_description:description,
          p_changelog:changelog
        }
      );

      if (error) throw error;

      let imagePath = null;

      if (announcementFile) {
        imagePath = await upload(
          announcementFile,
          "update-announcements"
        );
      }

      const { error:optionsError } = await supabase.rpc(
        "hanoon_admin_update_release_options",
        {
          p_session_token:sessionToken,
          p_release_id:releaseId,
          p_release_type:type,
          p_is_mandatory:mandatory,
          p_announcement_image_path:imagePath
        }
      );

      if (optionsError) throw optionsError;

      $("#uReleaseForm").reset();
      announcementFile = null;

      notify("تم إنشاء الإصدار وحفظه كمسودة.", "success");

      await loadReleases();

    } catch (error) {
      notify(error.message || "تعذر إنشاء الإصدار.", "error");

    } finally {
      busy = false;
    }
  }

  async function addAsset() {
    const releaseId = $("#uAssetRelease").value;
    const file = assetFile;
    const target = $("#uAssetPath").value.trim();

    if (!releaseId) {
      return notify("اختر إصدارًا مسودة أولًا.", "error");
    }

    if (!file || !target) {
      return notify("اختر الملف واكتب وصفه.", "error");
    }

    if (file.size > MAX_FILE) {
      return notify("حجم الملف أكبر من 50 ميجابايت.", "error");
    }

    const release = releases.find(r => r.id === releaseId);

    if (!release || release.status !== "draft") {
      return notify("يمكن إضافة الملفات للمسودات فقط.", "error");
    }

    const button = $('[data-action="add-asset"]');
    button.disabled = true;

    let storagePath = null;

    try {
      storagePath = await upload(
        file,
        `release-assets/${releaseId}`,
        MAX_FILE
      );

      const type = $("#uAssetType").value;
      const mime = file.type || "application/octet-stream";

      const { error } = await supabase.rpc(
        "hanoon_admin_add_update_asset",
        {
          p_session_token:sessionToken,
          p_release_id:releaseId,
          p_action:"add",
          p_asset_type:type,
          p_target_path:target,
          p_storage_path:storagePath,
          p_mime_type:mime,
          p_size_bytes:file.size,
          p_sha256:null,
          p_sort_order:0,
          p_metadata:{original_name:file.name}
        }
      );

      if (error) {
        await supabase.storage
          .from(BUCKET)
          .remove([storagePath]);

        throw error;
      }

      $("#uAssetFeedback").textContent =
        "تم رفع الملف وربطه بالإصدار.";

      $("#uAssetFile").value = "";
      $("#uAssetPath").value = "";
      assetFile = null;

      await loadReleases();

      notify("تمت إضافة الملف للإصدار.", "success");

    } catch (error) {
      notify(error.message || "تعذر إضافة الملف.", "error");

    } finally {
      button.disabled = false;
    }
  }

  async function publish(id) {
    const release = releases.find(r => r.id === id);

    if (!release || release.status !== "draft") return;

    const mode = release.is_mandatory ? "إجباري" : "اختياري";

    if (!confirm(
      `نشر الإصدار ${release.version} كتحديث ${mode} وإرسال إشعار للأعضاء؟`
    )) return;

    try {
      const { error } = await supabase.rpc(
        "hanoon_admin_publish_update_release",
        {
          p_session_token:sessionToken,
          p_release_id:id
        }
      );

      if (error) throw error;

      notify("تم نشر الإصدار وإرسال إشعارات التحديث.", "success");

      await loadReleases();

    } catch (error) {
      notify(error.message || "تعذر نشر الإصدار.", "error");
    }
  }

  async function withdraw(id) {
    const release = releases.find(r => r.id === id);

    if (!release || release.status !== "published") return;

    if (!confirm(`هل تريد سحب الإصدار ${release.version}؟`)) return;

    try {
      const { error } = await supabase.rpc(
        "hanoon_admin_withdraw_update_release",
        {
          p_session_token:sessionToken,
          p_release_id:id
        }
      );

      if (error) throw error;

      notify("تم سحب الإصدار.", "success");

      await loadReleases();

    } catch (error) {
      notify(error.message || "تعذر سحب الإصدار.", "error");
    }
  }

  // معاينة الألوان مباشرة عند تغييرها
  $("#uAccent").addEventListener("input", paintAppearance);
  $("#uBackground").addEventListener("input", paintAppearance);

  // اختيار خلفية من الموبايل أو الجهاز
  $("#uBackgroundFile").addEventListener("change", event => {
    backgroundFile = event.target.files?.[0] || null;

    if (backgroundFile) {
      if (!backgroundFile.type.startsWith("image/")) {
        notify("اختر ملف صورة صحيح.", "error");
        backgroundFile = null;
        event.target.value = "";
        return;
      }

      const local = URL.createObjectURL(backgroundFile);

      $("#uAppearancePreview").style.backgroundImage =
        `linear-gradient(90deg,rgba(12,9,22,.5),rgba(12,9,22,.4)),url("${local}")`;
    }
  });

  // صورة إعلان الإصدار
  $("#uAnnouncementImage").addEventListener("change", event => {
    announcementFile = event.target.files?.[0] || null;
  });

  // ملف إضافي للإصدار
  $("#uAssetFile").addEventListener("change", event => {
    assetFile = event.target.files?.[0] || null;
  });

  // إنشاء الإصدار
  $("#uReleaseForm").addEventListener("submit", createRelease);

  // إعادة تحميل البيانات
  $('[data-action="reload"]').addEventListener("click", async () => {
    try {
      await loadReleases();
      await loadAppearance();

      notify("تم تحديث البيانات.", "success");

    } catch (error) {
      notify(error.message, "error");
    }
  });

  // حفظ شكل الموقع
  $('[data-action="save-appearance"]').addEventListener(
    "click",
    saveAppearance
  );

  // إزالة الخلفية
  $('[data-action="remove-background"]').addEventListener("click", () => {
    appearance.backgroundImage = "";
    backgroundFile = null;

    $("#uBackgroundFile").value = "";

    paintAppearance();
  });

  // إضافة ملف للإصدار
  $('[data-action="add-asset"]').addEventListener(
    "click",
    addAsset
  );

  // التحميل الأول عند فتح مركز الإدارة
  (async () => {
    try {
      await Promise.all([
        loadAppearance(),
        loadReleases()
      ]);

    } catch (error) {
      console.error("Update center load:", error);

      notify(
        error.message || "تعذر تحميل مركز التحديثات.",
        "error"
      );
    }
  })();

  return {
    reload:loadReleases,

    destroy() {
      root.innerHTML = "";
    }
  };
}
