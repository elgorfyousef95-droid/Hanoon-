/* =========================================================
   HANOON WORLD — CONTENT CONTROL CENTER
   File: admin-content.js
   Uses secure RPC: hanoon_admin_site_content
========================================================= */

const CONTENT_SECTIONS = [
  {
    key: "editorial_posts",
    title: "منشورات الموقع",
    description: "إدارة المنشورات والمحتوى التحريري الذي يظهر على صفحات الموقع.",
    placeholder: `{
  "posts": [
    {
      "title": "عنوان المنشور",
      "body": "محتوى المنشور",
      "image": "",
      "published": true
    }
  ]
}`
  },
  {
    key: "announcement_messages",
    title: "الرسائل والإعلانات",
    description: "إدارة رسائل وإعلانات الموقع التي تريد عرضها للزوار والأعضاء.",
    placeholder: `{
  "messages": [
    {
      "title": "عنوان الإعلان",
      "body": "نص الإعلان",
      "target": "all",
      "published": true
    }
  ]
}`
  },
  {
    key: "promotional_gifts",
    title: "الهدايا والعروض",
    description: "إدارة محتوى الهدايا والعروض الترويجية المعروضة على الموقع.",
    placeholder: `{
  "gifts": [
    {
      "name": "اسم الهدية",
      "description": "وصف الهدية",
      "image": "",
      "published": true
    }
  ]
}`
  }
];

export function mountContentManager({
  root,
  supabase,
  sessionToken,
  toast = () => {}
}) {
  if (!root || !supabase || !sessionToken) {
    throw new Error("Content manager: missing required configuration.");
  }

  let activeSection = CONTENT_SECTIONS[0];
  let currentContent = {};
  let isPublished = false;
  let loading = false;
  let saving = false;

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  const prettyJSON = value =>
    JSON.stringify(value ?? {}, null, 2);

  function notify(message, type = "info") {
    toast(message, type);
  }

  function render() {
    root.innerHTML = `
      <section class="hw-module hw-content-manager" dir="rtl">

        <header class="hw-module-header">
          <div>
            <span class="hw-eyebrow">HANOON WORLD / CONTENT</span>
            <h2>مركز إدارة المحتوى</h2>
            <p>تحكم في المحتوى التحريري والإعلانات والعروض الترويجية.</p>
          </div>

          <button class="hw-action" type="button" data-action="reload">
            <span>تحديث البيانات</span>
          </button>
        </header>

        <div class="hw-content-tabs">
          ${CONTENT_SECTIONS.map(section => `
            <button
              type="button"
              class="hw-content-tab ${
                activeSection.key === section.key ? "active" : ""
              }"
              data-section="${escapeHTML(section.key)}"
            >
              ${escapeHTML(section.title)}
            </button>
          `).join("")}
        </div>

        <div class="hw-card hw-content-editor">

          <div class="hw-content-heading">
            <div>
              <h3>${escapeHTML(activeSection.title)}</h3>
              <p>${escapeHTML(activeSection.description)}</p>
            </div>

            <span class="hw-status ${
              isPublished ? "published" : "draft"
            }">
              ${isPublished ? "منشور" : "مسودة"}
            </span>
          </div>

          <div class="hw-field">
            <label for="hwContentJSON">بيانات المحتوى</label>

            <textarea
              id="hwContentJSON"
              class="hw-input hw-content-json"
              spellcheck="false"
              rows="18"
              placeholder="${escapeHTML(activeSection.placeholder)}"
            >${escapeHTML(prettyJSON(currentContent))}</textarea>

            <small>
              احفظ البيانات بصيغة JSON صحيحة. يمكنك إضافة العناصر
              وتعديلها وحذفها من هنا.
            </small>
          </div>

          <div class="hw-publish-control">
            <label class="hw-publish-label">
              <input
                type="checkbox"
                id="hwContentPublished"
                ${isPublished ? "checked" : ""}
              >
              <span>نشر هذا المحتوى على الموقع</span>
            </label>
          </div>

          <div class="hw-content-actions">
            <button
              class="hw-action"
              type="button"
              data-action="format"
            >
              تنسيق JSON
            </button>

            <button
              class="hw-action primary"
              type="button"
              data-action="save"
              ${saving ? "disabled" : ""}
            >
              ${saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}
            </button>
          </div>

          <div class="hw-content-feedback" id="hwContentFeedback"></div>
        </div>

        <div class="hw-card hw-content-note">
          <h3>معلومات مهمة</h3>
          <p>
            هذا القسم يدير محتوى الموقع الترويجي والتحريري المحفوظ
            في قاعدة بيانات المحتوى.
          </p>
          <p>
            منشورات الأعضاء الفعلية ورسائل المحادثات وسجل إرسال الهدايا
            بيانات مستقلة، ولا يتم تعديلها من هذا المحرر.
          </p>
        </div>

      </section>
    `;

    bindEvents();
  }

  function feedback(message, success = false) {
    const element = root.querySelector("#hwContentFeedback");
    if (!element) return;

    element.textContent = message;
    element.dataset.state = success ? "success" : "error";
  }

  async function loadSection(section = activeSection) {
    if (loading) return;

    loading = true;
    activeSection = section;

    currentContent = {};
    isPublished = false;
    render();

    try {
      const { data, error } = await supabase.rpc(
        "hanoon_admin_site_content",
        {
          p_session_token: sessionToken,
          p_action: "get",
          p_content_key: activeSection.key,
          p_content: null,
          p_is_published: false
        }
      );

      if (error) throw error;

      /*
       * The RPC may return a JSON object directly,
       * or a row containing content and is_published.
       */
      let result = data;

      if (Array.isArray(result)) {
        result = result[0] || {};
      }

      if (result && typeof result === "object") {
        currentContent = result.content &&
          typeof result.content === "object"
          ? result.content
          : result;

        isPublished = Boolean(result.is_published);
      }

      loading = false;
      render();

    } catch (error) {
      loading = false;
      render();

      feedback(
        error?.message || "تعذر تحميل المحتوى."
      );

      notify("حدث خطأ أثناء تحميل المحتوى.", "error");
    }
  }

  function bindEvents() {
    root.querySelectorAll("[data-section]").forEach(button => {
      button.addEventListener("click", () => {
        const section = CONTENT_SECTIONS.find(
          item => item.key === button.dataset.section
        );

        if (section) loadSection(section);
      });
    });

    root.querySelector('[data-action="reload"]')
      ?.addEventListener("click", () => loadSection());

    root.querySelector('[data-action="format"]')
      ?.addEventListener("click", () => {
        const editor = root.querySelector("#hwContentJSON");

        try {
          const parsed = JSON.parse(editor.value || "{}");
          editor.value = prettyJSON(parsed);
          feedback("تم تنسيق البيانات بنجاح.", true);
        } catch {
          feedback("صيغة JSON غير صحيحة. راجع الأقواس والفواصل.");
        }
      });

    root.querySelector('[data-action="save"]')
      ?.addEventListener("click", saveContent);
  }

  async function saveContent() {
    if (saving) return;

    const editor = root.querySelector("#hwContentJSON");
    const publishInput = root.querySelector("#hwContentPublished");

    if (!editor || !publishInput) return;

    let parsed;

    try {
      parsed = JSON.parse(editor.value || "{}");
    } catch {
      feedback("لا يمكن الحفظ: صيغة JSON غير صحيحة.");
      notify("راجع صيغة البيانات قبل الحفظ.", "error");
      return;
    }

    if (
      !parsed ||
      typeof parsed !== "object" ||
      Array.isArray(parsed)
    ) {
      feedback("يجب أن تكون البيانات كائن JSON.");
      return;
    }

    saving = true;

    const saveButton = root.querySelector('[data-action="save"]');
    if (saveButton) {
      saveButton.disabled = true;
      saveButton.textContent = "جارٍ الحفظ...";
    }

    try {
      const { data, error } = await supabase.rpc(
        "hanoon_admin_site_content",
        {
          p_session_token: sessionToken,
          p_action: "save",
          p_content_key: activeSection.key,
          p_content: parsed,
          p_is_published: publishInput.checked
        }
      );

      if (error) throw error;

      currentContent = parsed;
      isPublished = publishInput.checked;

      feedback("تم حفظ المحتوى بنجاح.", true);
      notify("تم حفظ التغييرات بنجاح.", "success");

      saving = false;
      render();

    } catch (error) {
      saving = false;

      if (saveButton) {
        saveButton.disabled = false;
        saveButton.textContent = "حفظ التغييرات";
      }

      feedback(
        error?.message || "تعذر حفظ المحتوى."
      );

      notify("فشل حفظ المحتوى. تحقق من صلاحية جلسة الإدارة.", "error");
    }
  }

  render();
  loadSection();

  return {
    reload: () => loadSection(),

    destroy() {
      root.innerHTML = "";
    }
  };
}
