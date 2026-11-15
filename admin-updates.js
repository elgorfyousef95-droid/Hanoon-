/* =========================================================
   HANOON WORLD — UPDATE CENTER
   File: admin-updates.js

   Secure database RPCs:
   - hanoon_admin_create_update_release
   - hanoon_admin_list_update_releases
   - hanoon_admin_add_update_asset
   - hanoon_admin_publish_update_release
   - hanoon_admin_withdraw_update_release

   Storage bucket:
   - hanoon-site-assets
========================================================= */

export function mountUpdateCenter({
  root,
  supabase,
  sessionToken,
  toast = () => {}
}) {
  if (!root || !supabase || !sessionToken) {
    throw new Error("Update center configuration is incomplete.");
  }

  const BUCKET = "hanoon-site-assets";
  const MAX_FILE_SIZE = 50 * 1024 * 1024;

  let releases = [];
  let selectedRelease = null;
  let selectedFile = null;
  let loading = false;
  let saving = false;

  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  const formatDate = value => {
    if (!value) return "غير محدد";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "غير محدد";

    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };

  const formatSize = bytes => {
    const size = Number(bytes || 0);

    if (size < 1024) return `${size} بايت`;
    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} كيلوبايت`;
    }

    return `${(size / (1024 * 1024)).toFixed(2)} ميجابايت`;
  };

  function notify(message, type = "info") {
    toast(message, type);
  }

  function statusLabel(status) {
    const labels = {
      draft: "مسودة",
      published: "منشور",
      withdrawn: "مسحوب"
    };

    return labels[status] || status;
  }

  function statusClass(status) {
    return {
      draft: "draft",
      published: "published",
      withdrawn: "withdrawn"
    }[status] || "draft";
  }

  function render() {
    root.innerHTML = `
      <section class="hw-module hw-update-center" dir="rtl">

        <header class="hw-module-header">
          <div>
            <span class="hw-eyebrow">HANOON WORLD / RELEASES</span>
            <h2>مركز التحديثات والإصدارات</h2>
            <p>
              أنشئ إصدارات جديدة، وأضف ملفات التحديث، وتحكم في نشرها.
            </p>
          </div>

          <button
            class="hw-action"
            type="button"
            data-action="reload"
            ${loading ? "disabled" : ""}
          >
            تحديث القائمة
          </button>
        </header>

        <div class="hw-update-stats">

          <div class="hw-card">
            <span>كل الإصدارات</span>
            <strong>${releases.length}</strong>
          </div>

          <div class="hw-card">
            <span>الإصدارات المنشورة</span>
            <strong>
              ${releases.filter(r => r.status === "published").length}
            </strong>
          </div>

          <div class="hw-card">
            <span>المسودات</span>
            <strong>
              ${releases.filter(r => r.status === "draft").length}
            </strong>
          </div>

        </div>

        <div class="hw-card hw-release-create">

          <div class="hw-content-heading">
            <div>
              <h3>إنشاء إصدار جديد</h3>
              <p>أدخل بيانات الإصدار وسجل التغييرات.</p>
            </div>
          </div>

          <form id="hwReleaseForm">

            <div class="hw-form-grid">

              <div class="hw-field">
                <label for="hwVersion">رقم الإصدار</label>
                <input
                  class="hw-input"
                  id="hwVersion"
                  name="version"
                  placeholder="مثال: 1.0.1"
                  maxlength="40"
                  required
                >
              </div>

              <div class="hw-field">
                <label for="hwReleaseTitle">عنوان الإصدار</label>
                <input
                  class="hw-input"
                  id="hwReleaseTitle"
                  name="title"
                  placeholder="تحديث جديد للموقع"
                  maxlength="160"
                  required
                >
              </div>

            </div>

            <div class="hw-field">
              <label for="hwReleaseDescription">وصف الإصدار</label>
              <textarea
                class="hw-input"
                id="hwReleaseDescription"
                name="description"
                rows="3"
                maxlength="3000"
                placeholder="اكتب وصفًا مختصرًا للتحديث..."
              ></textarea>
            </div>

            <div class="hw-field">
              <label for="hwChangelog">سجل التغييرات</label>
              <textarea
                class="hw-input"
                id="hwChangelog"
                name="changelog"
                rows="5"
                placeholder="كل تغيير في سطر مستقل..."
              ></textarea>
              <small>سيتم حفظ كل سطر كبند مستقل في سجل الإصدار.</small>
            </div>

            <button
              class="hw-action primary"
              type="submit"
              ${saving ? "disabled" : ""}
            >
              إنشاء الإصدار
            </button>

          </form>
        </div>

        <div class="hw-card hw-release-assets">

          <div class="hw-content-heading">
            <div>
              <h3>إضافة ملفات إلى إصدار</h3>
              <p>
                اختر إصدارًا في حالة المسودة، ثم أضف ملفات التحديث.
              </p>
            </div>
          </div>

          <div class="hw-field">
            <label for="hwAssetRelease">الإصدار المستهدف</label>

            <select class="hw-input" id="hwAssetRelease">
              <option value="">اختر إصدارًا...</option>

              ${releases
                .filter(r => r.status === "draft")
                .map(r => `
                  <option
                    value="${escapeHTML(r.id)}"
                    ${selectedRelease === r.id ? "selected" : ""}
                  >
                    ${escapeHTML(r.version)} — ${escapeHTML(r.title)}
                  </option>
                `).join("")}
            </select>
          </div>

          <div class="hw-form-grid">

            <div class="hw-field">
              <label for="hwAssetAction">نوع العملية</label>
              <select class="hw-input" id="hwAssetAction">
                <option value="add">إضافة ملف</option>
                <option value="replace">استبدال ملف</option>
                <option value="delete">حذف ملف عند تطبيق التحديث</option>
              </select>
            </div>

            <div class="hw-field">
              <label for="hwAssetType">نوع الملف</label>
              <select class="hw-input" id="hwAssetType">
                <option value="other">ملف آخر</option>
                <option value="image">صورة</option>
                <option value="video">فيديو</option>
                <option value="audio">صوت</option>
                <option value="font">خط</option>
                <option value="style">ملف CSS</option>
                <option value="script">ملف JavaScript</option>
                <option value="page">صفحة HTML</option>
                <option value="data">بيانات</option>
              </select>
            </div>

          </div>

          <div class="hw-field">
            <label for="hwTargetPath">مسار الملف داخل الموقع</label>
            <input
              class="hw-input"
              id="hwTargetPath"
              placeholder="مثال: assets/css/style.css"
              maxlength="500"
            >
            <small>
              هذا هو المسار الذي سيستهدفه محرك التحديث عند تطبيق الإصدار.
            </small>
          </div>

          <div class="hw-field" id="hwFileField">
            <label for="hwAssetFile">ملف التحديث</label>
            <input
              class="hw-input"
              id="hwAssetFile"
              type="file"
            >
            <small>
              الحد الأقصى للرفع من لوحة الإدارة: 50 ميجابايت للملف الواحد.
            </small>
          </div>

          <div class="hw-field">
            <label for="hwAssetOrder">ترتيب الملف</label>
            <input
              class="hw-input"
              id="hwAssetOrder"
              type="number"
              min="0"
              max="100000"
              value="0"
            >
          </div>

          <button
            class="hw-action primary"
            type="button"
            data-action="upload"
          >
            إضافة الملف إلى الإصدار
          </button>

          <div id="hwAssetFeedback" class="hw-content-feedback"></div>

        </div>

        <div class="hw-card hw-release-list">

          <div class="hw-content-heading">
            <div>
              <h3>سجل الإصدارات</h3>
              <p>جميع الإصدارات المحفوظة في قاعدة البيانات.</p>
            </div>
          </div>

          <div class="hw-release-list-items">

            ${
              loading
                ? `<p>جارٍ تحميل الإصدارات...</p>`
                : releases.length
                  ? releases.map(release => `
                    <article class="hw-release-card">

                      <div class="hw-release-top">
                        <div>
                          <span class="hw-release-version">
                            v${escapeHTML(release.version)}
                          </span>

                          <h4>${escapeHTML(release.title)}</h4>
                        </div>

                        <span class="hw-status ${statusClass(release.status)}">
                          ${statusLabel(release.status)}
                        </span>
                      </div>

                      <p>
                        ${escapeHTML(release.description || "لا يوجد وصف.")}
                      </p>

                      <div class="hw-release-meta">
                        <span>
                          الحجم: ${formatSize(release.total_size_bytes)}
                        </span>

                        <span>
                          الإنشاء: ${formatDate(release.created_at)}
                        </span>

                        ${
                          release.published_at
                            ? `<span>النشر: ${formatDate(release.published_at)}</span>`
                            : ""
                        }
                      </div>

                      <div class="hw-release-actions">

                        ${
                          release.status === "draft"
                            ? `
                              <button
                                class="hw-action primary"
                                type="button"
                                data-publish="${escapeHTML(release.id)}"
                              >
                                نشر الإصدار
                              </button>
                            `
                            : ""
                        }

                        ${
                          release.status === "published"
                            ? `
                              <button
                                class="hw-action danger"
                                type="button"
                                data-withdraw="${escapeHTML(release.id)}"
                              >
                                سحب الإصدار
                              </button>
                            `
                            : ""
                        }

                        ${
                          release.status === "draft"
                            ? `
                              <button
                                class="hw-action"
                                type="button"
                                data-select-release="${escapeHTML(release.id)}"
                              >
                                إضافة ملفات
                              </button>
                            `
                            : ""
                        }

                      </div>

                    </article>
                  `).join("")
                  : `<p>لا توجد إصدارات حتى الآن.</p>`
            }

          </div>
        </div>

        <div class="hw-card hw-update-warning">
          <h3>تنبيه بخصوص تطبيق التحديثات</h3>
          <p>
            هذه اللوحة تحفظ إصدارات التحديث وملفاتها وتنشر سجل الإصدار
            في قاعدة البيانات. تطبيق الملفات تلقائيًا على صفحات الموقع
            يحتاج إلى محرك تحديث في الواجهة العامة؛ لا تعتبر عملية النشر
            وحدها تحديثًا تلقائيًا لملفات GitHub Pages.
          </p>
        </div>

      </section>
    `;

    bindEvents();
  }

  function bindEvents() {
    root.querySelector('[data-action="reload"]')
      ?.addEventListener("click", loadReleases);

    root.querySelector("#hwReleaseForm")
      ?.addEventListener("submit", createRelease);

    root.querySelector('[data-action="upload"]')
      ?.addEventListener("click", addAsset);

    root.querySelector("#hwAssetRelease")
      ?.addEventListener("change", event => {
        selectedRelease = event.target.value || null;
      });

    root.querySelector("#hwAssetAction")
      ?.addEventListener("change", updateFileRequirement);

    root.querySelector("#hwAssetFile")
      ?.addEventListener("change", event => {
        selectedFile = event.target.files?.[0] || null;
      });

    root.querySelectorAll("[data-publish]").forEach(button => {
      button.addEventListener("click", () => {
        publishRelease(button.dataset.publish);
      });
    });

    root.querySelectorAll("[data-withdraw]").forEach(button => {
      button.addEventListener("click", () => {
        withdrawRelease(button.dataset.withdraw);
      });
    });

    root.querySelectorAll("[data-select-release]").forEach(button => {
      button.addEventListener("click", () => {
        selectedRelease = button.dataset.selectRelease;

        const select = root.querySelector("#hwAssetRelease");
        if (select) select.value = selectedRelease;

        root.querySelector(".hw-release-assets")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    updateFileRequirement();
  }

  function updateFileRequirement() {
    const action = root.querySelector("#hwAssetAction")?.value;
    const field = root.querySelector("#hwFileField");

    if (field) {
      field.style.display = action === "delete" ? "none" : "";
    }
  }

  async function loadReleases() {
    if (loading) return;

    loading = true;
    render();

    try {
      const { data, error } = await supabase.rpc(
        "hanoon_admin_list_update_releases",
        {
          p_session_token: sessionToken
        }
      );

      if (error) throw error;

      releases = Array.isArray(data) ? data : [];

      if (
        selectedRelease &&
        !releases.some(r =>
          r.id === selectedRelease && r.status === "draft"
        )
      ) {
        selectedRelease = null;
      }

      loading = false;
      render();

    } catch (error) {
      loading = false;
      render();

      notify(
        error?.message || "تعذر تحميل قائمة الإصدارات.",
        "error"
      );
    }
  }

  async function createRelease(event) {
    event.preventDefault();

    if (saving) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const version = String(formData.get("version") || "").trim();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();

    const changelogText = String(
      formData.get("changelog") || ""
    ).trim();

    if (!version || !title) {
      notify("اكتب رقم الإصدار والعنوان أولًا.", "error");
      return;
    }

    const changelog = changelogText
      ? changelogText
          .split("\n")
          .map(line => line.trim())
          .filter(Boolean)
          .map(text => ({ text }))
      : [];

    saving = true;
    render();

    try {
      const { data, error } = await supabase.rpc(
        "hanoon_admin_create_update_release",
        {
          p_session_token: sessionToken,
          p_version: version,
          p_title: title,
          p_description: description,
          p_changelog: changelog
        }
      );

      if (error) throw error;

      selectedRelease = data || null;

      notify("تم إنشاء الإصدار بنجاح.", "success");

      saving = false;
      await loadReleases();

    } catch (error) {
      saving = false;
      render();

      notify(
        error?.message || "تعذر إنشاء الإصدار.",
        "error"
      );
    }
  }

  async function sha256(file) {
    if (!globalThis.crypto?.subtle) return null;

    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);

    return Array.from(new Uint8Array(digest))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function addAsset() {
    if (saving) return;

    const releaseId =
      root.querySelector("#hwAssetRelease")?.value;

    const action =
      root.querySelector("#hwAssetAction")?.value;

    const assetType =
      root.querySelector("#hwAssetType")?.value;

    const targetPath =
      root.querySelector("#hwTargetPath")?.value.trim();

    const sortOrder = Number(
      root.querySelector("#hwAssetOrder")?.value || 0
    );

    const file = root.querySelector("#hwAssetFile")
      ?.files?.[0] || null;

    if (!releaseId) {
      notify("اختر إصدارًا في حالة المسودة.", "error");
      return;
    }

    if (!targetPath) {
      notify("اكتب مسار الملف المستهدف.", "error");
      return;
    }

    if (action !== "delete" && !file) {
      notify("اختر الملف الذي تريد رفعه.", "error");
      return;
    }

    if (file && file.size > MAX_FILE_SIZE) {
      notify("حجم الملف أكبر من 50 ميجابايت.", "error");
      return;
    }

    const release = releases.find(r => r.id === releaseId);

    if (!release || release.status !== "draft") {
      notify("لا يمكن تعديل ملفات إصدار غير مسودة.", "error");
      return;
    }

    saving = true;

    const button = root.querySelector('[data-action="upload"]');
    if (button) {
      button.disabled = true;
      button.textContent = "جارٍ إضافة الملف...";
    }

    let storagePath = null;
    let mimeType = null;
    let fileSize = 0;
    let fileHash = null;

    try {
      if (action !== "delete") {
        const safeName = file.name
          .normalize("NFKD")
          .replace(/[^\w.-]+/g, "_")
          .slice(-120);

        storagePath =
          `${releaseId}/${Date.now()}-${safeName}`;

        mimeType = file.type || "application/octet-stream";
        fileSize = file.size;
        fileHash = await sha256(file);

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: mimeType
          });

        if (uploadError) throw uploadError;
      }

      const { error: rpcError } = await supabase.rpc(
        "hanoon_admin_add_update_asset",
        {
          p_session_token: sessionToken,
          p_release_id: releaseId,
          p_action: action,
          p_asset_type: assetType,
          p_target_path: targetPath,
          p_storage_path: storagePath,
          p_mime_type: mimeType,
          p_size_bytes: fileSize,
          p_sha256: fileHash,
          p_sort_order: sortOrder,
          p_metadata: {
            original_name: file?.name || null
          }
        }
      );

      if (rpcError) {
        /*
         * If database registration fails after upload,
         * remove the orphaned storage object.
         */
        if (storagePath) {
          await supabase.storage
            .from(BUCKET)
            .remove([storagePath]);
        }

        throw rpcError;
      }

      notify("تمت إضافة ملف التحديث إلى الإصدار.", "success");

      selectedFile = null;

      await loadReleases();

    } catch (error) {
      notify(
        error?.message || "تعذرت إضافة ملف التحديث.",
        "error"
      );

      saving = false;

      const uploadButton = root.querySelector('[data-action="upload"]');
      if (uploadButton) {
        uploadButton.disabled = false;
        uploadButton.textContent = "إضافة الملف إلى الإصدار";
      }
    }
  }

  async function publishRelease(releaseId) {
    const release = releases.find(r => r.id === releaseId);

    if (!release || release.status !== "draft") {
      notify("هذا الإصدار ليس مسودة قابلة للنشر.", "error");
      return;
    }

    const confirmed = window.confirm(
      `هل تريد نشر الإصدار ${release.version}؟ سيتم تسجيله كتحديث منشور وإرسال إشعار للأعضاء.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.rpc(
        "hanoon_admin_publish_update_release",
        {
          p_session_token: sessionToken,
          p_release_id: releaseId
        }
      );

      if (error) throw error;

      notify("تم نشر الإصدار بنجاح.", "success");
      await loadReleases();

    } catch (error) {
      notify(
        error?.message || "تعذر نشر الإصدار.",
        "error"
      );
    }
  }

  async function withdrawRelease(releaseId) {
    const release = releases.find(r => r.id === releaseId);

    if (!release || release.status !== "published") {
      notify("هذا الإصدار غير منشور.", "error");
      return;
    }

    const confirmed = window.confirm(
      `هل تريد سحب الإصدار ${release.version}؟`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase.rpc(
        "hanoon_admin_withdraw_update_release",
        {
          p_session_token: sessionToken,
          p_release_id: releaseId
        }
      );

      if (error) throw error;

      notify("تم سحب الإصدار.", "success");
      await loadReleases();

    } catch (error) {
      notify(
        error?.message || "تعذر سحب الإصدار.",
        "error"
      );
    }
  }

  render();
  loadReleases();

  return {
    reload: loadReleases,

    destroy() {
      root.innerHTML = "";
    }
  };
}
