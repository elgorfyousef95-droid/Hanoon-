
/* =====================================================
   HANOON WORLD — SITE DESIGN EDITOR
   File: admin-site.js
   Connected to Supabase RPC
===================================================== */

const SITE_DEFAULTS = {
  brand: "HANOON WORLD",
  title: "عالمك يبدأ من هنا",
  description: "اكتشف مجتمع هَنون وتواصل مع الأصدقاء.",
  buttonText: "اكتشف الموقع",
  accent: "#a982f5",
  background: "#090711",
  backgroundImage: "",
  sections: [
    { id: "members", label: "الأعضاء", visible: true },
    { id: "posts", label: "المنشورات", visible: true },
    { id: "chat", label: "المحادثات", visible: true },
    { id: "gifts", label: "الهدايا", visible: true },
    { id: "games", label: "الألعاب", visible: true },
    { id: "profile", label: "الملفات الشخصية", visible: true }
  ]
};

const SITE_CONTENT_KEY = "homepage";

function siteEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function siteNormalize(input) {
  const source = input && typeof input === "object" ? input : {};

  return {
    ...SITE_DEFAULTS,
    ...source,
    sections: Array.isArray(source.sections)
      ? source.sections.map(section => ({
          id: String(section.id || ""),
          label: String(section.label || ""),
          visible: section.visible !== false
        })).filter(section => section.id && section.label)
      : SITE_DEFAULTS.sections.map(section => ({ ...section }))
  };
}

function siteValidColor(value, fallback) {
  const color = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

function siteSafeImageUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.href;
  } catch {
    return "";
  }
}

/**
 * تشغيل محرر الموقع داخل لوحة الإدارة.
 *
 * الاستخدام من admin.html:
 *
 * import { mountSiteEditor } from "./admin-site.js";
 *
 * mountSiteEditor({
 *   root: document.getElementById("site-editor-root"),
 *   supabase,
 *   sessionToken,
 *   toast
 * });
 */
export function mountSiteEditor(options = {}) {
  const root = options.root;
  const supabase = options.supabase;
  const sessionToken = options.sessionToken;
  const notify = typeof options.toast === "function"
    ? options.toast
    : message => alert(message);

  if (!root) {
    console.error("Site editor: root element not found.");
    return null;
  }

  if (!supabase || typeof supabase.rpc !== "function") {
    root.textContent = "تعذر تشغيل محرر الموقع: اتصال قاعدة البيانات غير متاح.";
    return null;
  }

  if (!sessionToken) {
    root.textContent = "جلسة الإدارة غير متاحة. أعد تسجيل الدخول.";
    return null;
  }

  let settings = siteNormalize({});
  let content = {};
  let loading = false;
  let saving = false;
  let dirty = false;

  root.innerHTML = `
    <section class="hw-module" dir="rtl">

      <header class="page-head">
        <div>
          <div class="eyebrow">HANOON WORLD • DESIGN STUDIO</div>
          <h1>محرر تصميم الموقع</h1>
          <p>تحكم في الهوية البصرية والنصوص والخلفيات وترتيب الأقسام.</p>
        </div>
        <span class="hw-chip success" id="site-editor-status">متصل بالمحرر</span>
      </header>

      <div class="hw-module-grid">

        <section class="hw-col-8 hw-card">
          <div class="hw-card-head">
            <div>
              <h2>الهوية الرئيسية</h2>
              <p>اسم الموقع والعنوان والوصف والزر الرئيسي.</p>
            </div>
            <span class="hw-chip">01</span>
          </div>

          <div class="hw-field">
            <label class="hw-label" for="se-brand">اسم الموقع</label>
            <input class="hw-input" id="se-brand" maxlength="70">
          </div>

          <div class="hw-field">
            <label class="hw-label" for="se-title">العنوان الرئيسي</label>
            <input class="hw-input" id="se-title" maxlength="120">
          </div>

          <div class="hw-field">
            <label class="hw-label" for="se-description">الوصف</label>
            <textarea class="hw-textarea" id="se-description" maxlength="1500"></textarea>
          </div>

          <div class="hw-field">
            <label class="hw-label" for="se-button">نص الزر الرئيسي</label>
            <input class="hw-input" id="se-button" maxlength="60">
          </div>
        </section>

        <section class="hw-col-4 hw-card">
          <div class="hw-card-head">
            <div>
              <h2>معاينة مباشرة</h2>
              <p>تتغير المعاينة أثناء تعديل البيانات.</p>
            </div>
          </div>

          <div class="hw-preview" id="se-preview">
            <div class="hw-chip">HANOON WORLD</div>
            <h2 id="se-preview-title">عالمك يبدأ من هنا</h2>
            <p id="se-preview-description">اكتشف مجتمع هَنون وتواصل مع الأصدقاء.</p>
            <button class="hw-action primary" type="button" id="se-preview-button">
              اكتشف الموقع
            </button>
          </div>
        </section>

        <section class="hw-col-6 hw-card">
          <div class="hw-card-head">
            <div>
              <h2>الألوان والخلفيات</h2>
              <p>اختيار ألوان الهوية وخلفية الصفحة الرئيسية.</p>
            </div>
            <span class="hw-chip">02</span>
          </div>

          <div class="hw-field">
            <label class="hw-label" for="se-accent">اللون الرئيسي</label>
            <div class="hw-toolbar">
              <input class="hw-color-input" id="se-accent-picker" type="color">
              <input class="hw-input" id="se-accent" maxlength="7" placeholder="#a982f5">
            </div>
          </div>

          <div class="hw-field">
            <label class="hw-label" for="se-background">لون الخلفية</label>
            <div class="hw-toolbar">
              <input class="hw-color-input" id="se-background-picker" type="color">
              <input class="hw-input" id="se-background" maxlength="7" placeholder="#090711">
            </div>
          </div>

          <div class="hw-field">
            <label class="hw-label" for="se-background-image">رابط صورة الخلفية</label>
            <input class="hw-input" id="se-background-image"
              type="url" maxlength="1500"
              placeholder="https://example.com/background.jpg">
            <small>يُقبل رابط صورة مباشر يعمل عبر HTTPS أو HTTP.</small>
          </div>
        </section>

        <section class="hw-col-6 hw-card">
          <div class="hw-card-head">
            <div>
              <h2>ترتيب أقسام الموقع</h2>
              <p>غيّر ترتيب الأقسام وحدد الأقسام التي تريد إظهارها.</p>
            </div>
            <span class="hw-chip">03</span>
          </div>

          <div class="hw-order-list" id="se-sections"></div>
          <div class="hw-divider"></div>
          <small>ترتيب الأقسام يُحفظ في إعدادات الموقع، ويحتاج ربط صفحات الموقع به حتى يظهر للزوار.</small>
        </section>

        <section class="hw-col-12 hw-card">
          <div class="hw-card-head">
            <div>
              <h2>إدارة محتوى الصفحة الرئيسية</h2>
              <p>حفظ المحتوى كمسودة أو نشره من خلال قاعدة البيانات.</p>
            </div>
            <span class="hw-chip warning" id="se-publish-state">غير منشور</span>
          </div>

          <div class="hw-field">
            <label class="hw-label" for="se-content-json">بيانات محتوى الصفحة بصيغة JSON</label>
            <textarea class="hw-textarea" id="se-content-json"
              spellcheck="false" style="min-height:190px;direction:ltr;text-align:left"
              placeholder='{"sections":[]}'></textarea>
            <small>يُحفظ المحتوى ككائن JSON داخل سجل الصفحة الرئيسية.</small>
          </div>

          <label class="hw-toolbar" style="font-size:11px">
            <input type="checkbox" id="se-publish">
            نشر المحتوى للزوار
          </label>
        </section>

        <section class="hw-col-12 hw-card">
          <div class="hw-toolbar">
            <button class="hw-action primary" type="button" id="se-save">
              حفظ إعدادات التصميم
            </button>
            <button class="hw-action" type="button" id="se-load">
              إعادة تحميل البيانات
            </button>
            <button class="hw-action" type="button" id="se-reset">
              استعادة القيم الافتراضية
            </button>
            <span class="hw-chip" id="se-dirty">لا توجد تغييرات غير محفوظة</span>
          </div>
        </section>

      </div>
    </section>
  `;

  const $ = selector => root.querySelector(selector);

  function setStatus(message, type = "") {
    const element = $("#site-editor-status");
    if (!element) return;

    element.textContent = message;
    element.className = "hw-chip" + (type ? " " + type : "");
  }

  function markDirty() {
    dirty = true;
    $("#se-dirty").textContent = "توجد تغييرات غير محفوظة";
    $("#se-dirty").className = "hw-chip warning";
  }

  function markClean() {
    dirty = false;
    $("#se-dirty").textContent = "تم حفظ التغييرات";
    $("#se-dirty").className = "hw-chip success";
  }

  function collectSettings() {
    const next = {
      ...settings,
      brand: $("#se-brand").value.trim(),
      title: $("#se-title").value.trim(),
      description: $("#se-description").value.trim(),
      buttonText: $("#se-button").value.trim(),
      accent: siteValidColor($("#se-accent").value, SITE_DEFAULTS.accent),
      background: siteValidColor($("#se-background").value, SITE_DEFAULTS.background),
      backgroundImage: siteSafeImageUrl($("#se-background-image").value),
      sections: settings.sections.map((section, index) => {
        const checkbox = root.querySelector(
          `[data-section-visible="${CSS.escape(section.id)}"]`
        );

        return {
          ...section,
          visible: checkbox ? checkbox.checked : section.visible,
          order: index
        };
      })
    };

    return siteNormalize(next);
  }

  function renderSections() {
    const holder = $("#se-sections");
    holder.replaceChildren();

    settings.sections.forEach((section, index) => {
      const row = document.createElement("div");
      row.className = "hw-order-item";

      const grip = document.createElement("span");
      grip.className = "hw-order-grip";
      grip.textContent = "⠿";

      const label = document.createElement("strong");
      label.textContent = section.label;
      label.style.flex = "1";

      const visibleLabel = document.createElement("label");
      visibleLabel.style.fontSize = "10px";
      visibleLabel.style.display = "flex";
      visibleLabel.style.alignItems = "center";
      visibleLabel.style.gap = "5px";

      const visible = document.createElement("input");
      visible.type = "checkbox";
      visible.checked = section.visible !== false;
      visible.dataset.sectionVisible = section.id;
      visible.addEventListener("change", markDirty);

      visibleLabel.append(visible, document.createTextNode("إظهار"));

      const up = document.createElement("button");
      up.type = "button";
      up.className = "hw-action";
      up.textContent = "↑";
      up.title = "تحريك لأعلى";
      up.disabled = index === 0;
      up.addEventListener("click", () => moveSection(index, -1));

      const down = document.createElement("button");
      down.type = "button";
      down.className = "hw-action";
      down.textContent = "↓";
      down.title = "تحريك لأسفل";
      down.disabled = index === settings.sections.length - 1;
      down.addEventListener("click", () => moveSection(index, 1));

      row.append(grip, label, visibleLabel, up, down);
      holder.append(row);
    });
  }

  function moveSection(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= settings.sections.length) return;

    const sections = [...settings.sections];
    [sections[index], sections[target]] = [sections[target], sections[index]];
    settings.sections = sections;

    renderSections();
    markDirty();
  }

  function updatePreview() {
    const title = $("#se-title").value;
    const description = $("#se-description").value;
    const button = $("#se-button").value;
    const accent = siteValidColor($("#se-accent").value, SITE_DEFAULTS.accent);
    const background = siteValidColor($("#se-background").value, SITE_DEFAULTS.background);
    const image = siteSafeImageUrl($("#se-background-image").value);

    $("#se-preview-title").textContent = title;
    $("#se-preview-description").textContent = description;
    $("#se-preview-button").textContent = button;

    const preview = $("#se-preview");
    preview.style.backgroundColor = background;
    preview.style.borderColor = accent;

    if (image) {
      preview.style.backgroundImage =
        `linear-gradient(90deg,rgba(12,9,22,.88),rgba(12,9,22,.72)),url("${image}")`;
      preview.style.backgroundSize = "cover";
      preview.style.backgroundPosition = "center";
    } else {
      preview.style.backgroundImage =
        `radial-gradient(circle at 10% 10%, ${accent}44, transparent 40%),linear-gradient(135deg,#211737,#111c2b)`;
    }

    $("#se-preview-button").style.background =
      `linear-gradient(115deg,${accent},#8055d9)`;
  }

  function fillForm() {
    $("#se-brand").value = settings.brand;
    $("#se-title").value = settings.title;
    $("#se-description").value = settings.description;
    $("#se-button").value = settings.buttonText;
    $("#se-accent").value = settings.accent;
    $("#se-background").value = settings.background;
    $("#se-accent-picker").value = settings.accent;
    $("#se-background-picker").value = settings.background;
    $("#se-background-image").value = settings.backgroundImage || "";

    renderSections();
    updatePreview();
  }

  async function loadContent() {
    const { data, error } = await supabase.rpc("hanoon_admin_site_content", {
      p_session_token: sessionToken,
      p_action: "get",
      p_content_key: SITE_CONTENT_KEY,
      p_content: null,
      p_is_published: false
    });

    if (error) throw error;
    if (data?.ok === false) throw new Error(data.error || "تعذر تحميل المحتوى.");

    const record = data?.record || {};
    content = record.content && typeof record.content === "object"
      ? record.content
      : {};

    $("#se-content-json").value = JSON.stringify(content, null, 2);
    $("#se-publish").checked = record.is_published === true;
    $("#se-publish-state").textContent =
      record.is_published ? "منشور" : "غير منشور";
    $("#se-publish-state").className =
      "hw-chip " + (record.is_published ? "success" : "warning");
  }

  async function loadSettings() {
    if (loading) return;
    loading = true;
    setStatus("جارٍ تحميل الإعدادات...");

    try {
      const { data, error } = await supabase.rpc(
        "hanoon_admin_get_site_settings",
        { p_session_token: sessionToken }
      );

      if (error) throw error;

      const rows = Array.isArray(data) ? data : [];
      const appearanceRow = rows.find(row => row.setting_key === "site_appearance");

      settings = siteNormalize(appearanceRow?.setting_value || {});
      fillForm();

      await loadContent();
      markClean();
      setStatus("تم تحميل البيانات", "success");
    } catch (error) {
      console.error("Site editor load error:", error);
      setStatus("تعذر تحميل البيانات", "danger");
      notify(error.message || "حدث خطأ أثناء تحميل إعدادات الموقع.");
    } finally {
      loading = false;
    }
  }

  async function saveSettings() {
    if (saving) return;

    const next = collectSettings();

    if (!next.brand || !next.title) {
      notify("اكتب اسم الموقع والعنوان الرئيسي أولاً.");
      return;
    }

    let parsedContent;
    try {
      parsedContent = JSON.parse($("#se-content-json").value || "{}");
    } catch {
      notify("صيغة محتوى الصفحة ليست JSON صحيحة.");
      return;
    }

    if (!parsedContent || Array.isArray(parsedContent) ||
        typeof parsedContent !== "object") {
      notify("محتوى الصفحة يجب أن يكون كائن JSON.");
      return;
    }

    saving = true;
    $("#se-save").disabled = true;
    setStatus("جارٍ حفظ التغييرات...");

    try {
      const { data: appearanceResult, error: appearanceError } =
        await supabase.rpc("hanoon_admin_save_site_appearance", {
          p_session_token: sessionToken,
          p_settings: next
        });

      if (appearanceError) throw appearanceError;
      if (appearanceResult?.ok === false) {
        throw new Error(appearanceResult.error || "تعذر حفظ التصميم.");
      }

      const { data: contentResult, error: contentError } =
        await supabase.rpc("hanoon_admin_site_content", {
          p_session_token: sessionToken,
          p_action: "save",
          p_content_key: SITE_CONTENT_KEY,
          p_content: parsedContent,
          p_is_published: $("#se-publish").checked
        });

      if (contentError) throw contentError;
      if (contentResult?.ok === false) {
        throw new Error(contentResult.error || "تعذر حفظ محتوى الصفحة.");
      }

      settings = next;
      content = parsedContent;
      markClean();
      setStatus("تم الحفظ في قاعدة البيانات", "success");

      $("#se-publish-state").textContent =
        $("#se-publish").checked ? "منشور" : "غير منشور";
      $("#se-publish-state").className =
        "hw-chip " + ($("#se-publish").checked ? "success" : "warning");

      notify("تم حفظ إعدادات التصميم ومحتوى الصفحة.");
    } catch (error) {
      console.error("Site editor save error:", error);
      setStatus("فشل الحفظ", "danger");
      notify(error.message || "تعذر حفظ التغييرات.");
    } finally {
      saving = false;
      $("#se-save").disabled = false;
    }
  }

  function resetDefaults() {
    if (!confirm("هل تريد استعادة القيم الافتراضية للمحرر؟ لن تُحفظ إلا بعد الضغط على حفظ.")) {
      return;
    }

    settings = siteNormalize({});
    fillForm();
    markDirty();
    setStatus("القيم الافتراضية جاهزة للحفظ", "warning");
  }

  const textFields = [
    "#se-brand",
    "#se-title",
    "#se-description",
    "#se-button",
    "#se-background-image"
  ];

  textFields.forEach(selector => {
    $(selector).addEventListener("input", () => {
      updatePreview();
      markDirty();
    });
  });

  function connectColor(textSelector, pickerSelector) {
    const text = $(textSelector);
    const picker = $(pickerSelector);

    text.addEventListener("input", () => {
      const color = siteValidColor(text.value, "");
      if (color) picker.value = color;
      updatePreview();
      markDirty();
    });

    picker.addEventListener("input", () => {
      text.value = picker.value;
      updatePreview();
      markDirty();
    });
  }

  connectColor("#se-accent", "#se-accent-picker");
  connectColor("#se-background", "#se-background-picker");

  $("#se-content-json").addEventListener("input", markDirty);
  $("#se-publish").addEventListener("change", markDirty);
  $("#se-save").addEventListener("click", saveSettings);
  $("#se-load").addEventListener("click", loadSettings);
  $("#se-reset").addEventListener("click", resetDefaults);

  fillForm();
  loadSettings();

  return {
    reload: loadSettings,
    save: saveSettings,
    getSettings: () => ({ ...settings }),
    hasUnsavedChanges: () => dirty
  };
}
