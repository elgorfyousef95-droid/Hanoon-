
/* =========================================================
   HANOON WORLD — VISUAL PAGE STUDIO
   محرر الصفحات المرئي
   ========================================================= */

const DEFAULT_BLOCKS = [
  {
    id: "intro",
    type: "intro",
    name: "مقدمة الصفحة",
    visible: true,
    title: "مرحباً بك في عالم هنون",
    text: "مساحة تجمع الأصدقاء والمجتمع في مكان واحد."
  },
  {
    id: "hero",
    type: "hero",
    name: "القسم الرئيسي",
    visible: true,
    eyebrow: "HANOON WORLD",
    title: "عالمك يبدأ من هنا",
    text: "اكتشف مجتمع هنون وتواصل مع الأصدقاء.",
    buttonText: "اكتشف الموقع",
    buttonUrl: "#games"
  },
  {
    id: "categories",
    type: "cards",
    name: "التصنيفات",
    visible: true,
    title: "اكتشف عالم هنون",
    items: [
      { title: "الأصدقاء", text: "تواصل مع مجتمعك" },
      { title: "الألعاب", text: "العب واستمتع" },
      { title: "الغرف", text: "انضم إلى أصدقائك" }
    ]
  },
  {
    id: "games",
    type: "system",
    name: "الألعاب",
    visible: true,
    title: "الألعاب",
    locked: true
  },
  {
    id: "promo",
    type: "banner",
    name: "البانر الترويجي",
    visible: true,
    title: "عِش التجربة",
    text: "هناك دائماً شيء جديد لاكتشافه.",
    buttonText: "ابدأ الآن",
    buttonUrl: "#rooms"
  },
  {
    id: "rooms",
    type: "system",
    name: "الغرف",
    visible: true,
    title: "الغرف النشطة",
    locked: true
  },
  {
    id: "live",
    type: "cards",
    name: "المحتوى المباشر",
    visible: true,
    title: "من عالم هنون",
    items: [
      { title: "مجتمع نابض", text: "كن جزءاً من التجربة." }
    ]
  }
];

const escapeHTML = value =>
  String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

const makeId = () =>
  "block_" + Math.random().toString(36).slice(2, 11);

const clone = value => JSON.parse(JSON.stringify(value));

function normalizeDocument(value) {
  const source =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  const blocks = Array.isArray(source.blocks)
    ? source.blocks
    : clone(DEFAULT_BLOCKS);

  return {
    version: 1,
    page: source.page || "homepage",
    title: source.title || "الصفحة الرئيسية",
    theme: {
      accent: "#a982f5",
      background: "#090711",
      text: "#f5f0ff",
      ...(source.theme || {})
    },
    blocks: blocks.slice(0, 100).map(block => ({
      ...block,
      id: String(block.id || makeId()),
      type: [
        "intro",
        "hero",
        "cards",
        "system",
        "banner",
        "text",
        "image"
      ].includes(block.type)
        ? block.type
        : "text",
      name: String(block.name || "قسم جديد"),
      visible: block.visible !== false
    }))
  };
}

export function mountPageStudio({
  root,
  supabase,
  sessionToken,
  toast
} = {}) {

  if (!root || !supabase || !sessionToken) {
    if (root) {
      root.textContent =
        "تعذر تشغيل الاستوديو. تحقق من جلسة الإدارة والاتصال.";
    }
    return null;
  }

  const notify = typeof toast === "function"
    ? toast
    : message => alert(message);

  let doc = normalizeDocument({});
  let selectedId = null;
  let dirty = false;
  let busy = false;
  let device = "desktop";
  let destroyed = false;

  const style = document.createElement("style");

  style.textContent = `
    .hps {
      direction: rtl;
      color: #f5f0ff;
      font-family: inherit;
    }

    .hps * { box-sizing: border-box; }

    .hps-head {
      display:flex;
      justify-content:space-between;
      align-items:center;
      flex-wrap:wrap;
      gap:12px;
      margin-bottom:16px;
    }

    .hps-head h1 {
      font-size:24px;
      margin:5px 0;
    }

    .hps-muted {
      color:#a99fba;
      font-size:12px;
    }

    .hps-actions {
      display:flex;
      align-items:center;
      flex-wrap:wrap;
      gap:7px;
    }

    .hps-btn {
      border:1px solid #51436d;
      background:#211a31;
      color:#fff;
      border-radius:9px;
      padding:9px 12px;
      cursor:pointer;
      font:inherit;
      font-size:12px;
    }

    .hps-btn.primary {
      background:linear-gradient(120deg,#a982f5,#7049c5);
      border:0;
    }

    .hps-btn:disabled {
      opacity:.4;
      cursor:not-allowed;
    }

    .hps-grid {
      display:grid;
      grid-template-columns:minmax(220px,270px) minmax(0,1fr) minmax(220px,270px);
      gap:12px;
      align-items:start;
    }

    .hps-panel {
      background:#171321;
      border:1px solid #342943;
      border-radius:14px;
      padding:13px;
      min-width:0;
    }

    .hps-panel h3 {
      font-size:14px;
      margin:0 0 12px;
    }

    .hps-stage {
      background:#0d0a14;
      border:1px solid #382b4b;
      border-radius:14px;
      padding:13px;
      min-height:520px;
      overflow:hidden;
    }

    .hps-canvas {
      margin:auto;
      min-height:470px;
      max-width:100%;
      padding:22px;
      overflow:hidden;
      border-radius:12px;
      border:1px solid #4a3a60;
      background:var(--hps-bg);
      color:var(--hps-text);
    }

    .hps-canvas.mobile { width:375px; }
    .hps-canvas.tablet { width:768px; }
    .hps-canvas.desktop { width:100%; }

    .hps-block {
      background:linear-gradient(140deg,#211832,#12101d);
      border:1px solid #ffffff20;
      border-radius:12px;
      padding:17px;
      margin:10px 0;
      cursor:pointer;
      overflow-wrap:anywhere;
      white-space:pre-wrap;
    }

    .hps-block.selected {
      outline:2px solid #b99aff;
      outline-offset:2px;
    }

    .hps-block h2 {
      font-size:24px;
      margin:7px 0;
    }

    .hps-block p {
      color:#c6bdd5;
      line-height:1.8;
    }

    .hps-kicker {
      color:#c5aaff;
      font-size:10px;
      letter-spacing:2px;
    }

    .hps-item {
      padding:10px;
      margin:7px 0;
      border:1px solid #3b304d;
      border-radius:9px;
      background:#211a2c;
      cursor:pointer;
    }

    .hps-item.active {
      border-color:#b99aff;
      box-shadow:0 0 0 1px #b99aff inset;
    }

    .hps-item strong {
      display:block;
      font-size:12px;
    }

    .hps-item small {
      color:#aaa0b8;
      font-size:10px;
    }

    .hps-field { margin:10px 0; }

    .hps-field label {
      display:block;
      color:#c5bbd4;
      font-size:11px;
      margin-bottom:5px;
    }

    .hps-field input,
    .hps-field textarea {
      width:100%;
      border:1px solid #40344f;
      background:#0f0c17;
      color:white;
      border-radius:8px;
      padding:9px;
      font:inherit;
      font-size:12px;
    }

    .hps-field textarea {
      min-height:75px;
      resize:vertical;
    }

    .hps-field input[type="color"] {
      height:38px;
      padding:3px;
    }

    .hps-pill {
      display:inline-block;
      padding:5px 9px;
      border-radius:20px;
      background:#302444;
      color:#d8c7ff;
      font-size:10px;
    }

    .hps-separator {
      border:0;
      border-top:1px solid #392e49;
      margin:14px 0;
    }

    .hps-add {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:6px;
    }

    .hps-history {
      max-height:220px;
      overflow:auto;
    }

    .hps-history button {
      display:block;
      width:100%;
      text-align:right;
      margin:5px 0;
    }

    .hps-empty {
      padding:20px;
      text-align:center;
      color:#aaa0b8;
      font-size:12px;
    }

    @media(max-width:950px) {
      .hps-grid { grid-template-columns:1fr; }
      .hps-stage { order:-1; }
    }
  `;

  root.appendChild(style);

  const app = document.createElement("div");
  app.className = "hps";

  app.innerHTML = `
    <header class="hps-head">
      <div>
        <div class="hps-muted">HANOON WORLD · VISUAL STUDIO</div>
        <h1>استوديو تصميم الموقع</h1>
        <div class="hps-muted">
          تحكم في أقسام الصفحة وشاهد التعديلات مباشرة.
        </div>
      </div>

      <div class="hps-actions">
        <span class="hps-pill" id="hps-state">جارٍ التحميل</span>
        <button class="hps-btn" id="hps-reload">إعادة تحميل</button>
        <button class="hps-btn" id="hps-save">حفظ المسودة</button>
        <button class="hps-btn primary" id="hps-publish">نشر التغييرات</button>
      </div>
    </header>

    <div class="hps-grid">

      <aside class="hps-panel">
        <h3>أقسام الصفحة</h3>
        <div id="hps-list"></div>

        <hr class="hps-separator">

        <h3>إضافة قسم جديد</h3>

        <div class="hps-add">
          <button class="hps-btn" data-add="hero">قسم رئيسي</button>
          <button class="hps-btn" data-add="text">نص</button>
          <button class="hps-btn" data-add="cards">بطاقات</button>
          <button class="hps-btn" data-add="banner">بانر</button>
          <button class="hps-btn" data-add="image">صورة</button>
        </div>

        <hr class="hps-separator">

        <div class="hps-muted">
          اسحب الأقسام لتغيير ترتيبها.
          أقسام الألعاب والغرف محمية من الحذف حتى لا تتعطل بيانات الموقع.
        </div>
      </aside>

      <main class="hps-stage">
        <div class="hps-actions" style="justify-content:space-between;margin-bottom:12px">
          <strong style="font-size:12px">معاينة التصميم</strong>

          <div class="hps-actions">
            <button class="hps-btn" data-device="mobile">هاتف</button>
            <button class="hps-btn" data-device="tablet">تابلت</button>
            <button class="hps-btn" data-device="desktop">كمبيوتر</button>
          </div>
        </div>

        <div id="hps-canvas" class="hps-canvas desktop"></div>
      </main>

      <aside class="hps-panel">
        <h3>خصائص القسم</h3>
        <div id="hps-properties" class="hps-empty">
          اختر قسماً للتعديل.
        </div>

        <hr class="hps-separator">

        <h3>ألوان الصفحة</h3>

        <div class="hps-field">
          <label>اللون الرئيسي</label>
          <input type="color" id="hps-accent">
        </div>

        <div class="hps-field">
          <label>خلفية الصفحة</label>
          <input type="color" id="hps-background">
        </div>

        <hr class="hps-separator">

        <h3>سجل الإصدارات</h3>
        <div id="hps-history" class="hps-history">
          <div class="hps-muted">جارٍ تحميل الإصدارات...</div>
        </div>
      </aside>

    </div>
  `;

  root.appendChild(app);

  const $ = selector => app.querySelector(selector);

  function setState(message, color) {
    const state = $("#hps-state");
    state.textContent = message;
    state.style.background = color || "#302444";
  }

  function markChanged() {
    dirty = true;
    setState("تغييرات غير محفوظة", "#68451e");
  }

  function getLabel(block) {
    return block.name || "قسم جديد";
  }

  async function contentRPC(action, content = null, publish = false) {
    const { data, error } = await supabase.rpc(
      "hanoon_admin_site_content",
      {
        p_session_token: sessionToken,
        p_action: action,
        p_content_key: doc.page,
        p_content: content,
        p_is_published: publish
      }
    );

    if (error) throw error;

    if (data?.ok === false) {
      throw new Error(data.error || "تعذر تنفيذ العملية.");
    }

    return data;
  }

  async function revisionsRPC(action, extra = {}) {
    const { data, error } = await supabase.rpc(
      "hanoon_admin_site_revisions",
      {
        p_session_token: sessionToken,
        p_action: action,
        p_content_key: doc.page,
        p_revision_id: extra.revisionId || null,
        p_content: extra.content || null,
        p_is_published: extra.published || false
      }
    );

    if (error) throw error;

    if (data?.ok === false) {
      throw new Error(data.error || "تعذر تنفيذ العملية.");
    }

    return data;
  }

  function renderList() {
    const list = $("#hps-list");
    list.replaceChildren();

    doc.blocks.forEach((block, index) => {
      const item = document.createElement("div");

      item.className =
        "hps-item" +
        (block.id === selectedId ? " active" : "");

      item.draggable = !block.locked;
      item.dataset.id = block.id;

      const title = document.createElement("strong");
      title.textContent = `${index + 1}. ${getLabel(block)}`;

      const info = document.createElement("small");
      info.textContent = block.locked
        ? "قسم نظام محمي"
        : block.visible
          ? "ظاهر"
          : "مخفي";

      item.append(title, info);

      item.addEventListener("click", () => selectBlock(block.id));

      item.addEventListener("dragstart", event => {
        if (block.locked) {
          event.preventDefault();
          return;
        }

        event.dataTransfer.setData("text/plain", block.id);
      });

      item.addEventListener("dragover", event => {
        event.preventDefault();
      });

      item.addEventListener("drop", event => {
        event.preventDefault();

        const from = event.dataTransfer.getData("text/plain");

        if (from && from !== block.id) {
          moveBlock(from, block.id);
        }
      });

      list.appendChild(item);
    });
  }

  function renderCanvas() {
    const canvas = $("#hps-canvas");

    canvas.className = `hps-canvas ${device}`;

    canvas.style.setProperty(
      "--hps-bg",
      doc.theme.background
    );

    canvas.style.setProperty(
      "--hps-text",
      doc.theme.text
    );

    canvas.replaceChildren();

    doc.blocks.forEach(block => {
      if (!block.visible) return;

      const section = document.createElement("section");

      section.className =
        "hps-block" +
        (block.id === selectedId ? " selected" : "");

      const kicker = document.createElement("div");
      kicker.className = "hps-kicker";
      kicker.textContent = block.eyebrow || "HANOON WORLD";

      const heading = document.createElement("h2");
      heading.textContent = block.title || getLabel(block);

      const paragraph = document.createElement("p");
      paragraph.textContent =
        block.text ||
        (block.locked
          ? "قسم يعرض بيانات الموقع الديناميكية."
          : "اكتب وصف هذا القسم.");

      if (block.type === "hero") {
        section.appendChild(kicker);
      }

      section.append(heading, paragraph);

      if (block.type === "image" && block.imageUrl) {
        const image = document.createElement("img");

        image.src = block.imageUrl;
        image.alt = block.title || "";
        image.loading = "lazy";

        image.style.cssText =
          "width:100%;max-height:220px;object-fit:cover;border-radius:10px";

        section.appendChild(image);
      }

      if (block.type === "cards" && Array.isArray(block.items)) {
        const grid = document.createElement("div");

        grid.style.cssText =
          "display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:9px";

        block.items.forEach(cardData => {
          const card = document.createElement("div");

          card.style.cssText =
            "padding:12px;border-radius:9px;background:#ffffff12";

          const title = document.createElement("strong");
          title.textContent = cardData.title || "بطاقة";

          const description = document.createElement("p");
          description.textContent = cardData.text || "";

          card.append(title, description);
          grid.appendChild(card);
        });

        section.appendChild(grid);
      }

      if (block.buttonText) {
        const button = document.createElement("span");

        button.className = "hps-pill";
        button.textContent = block.buttonText;

        section.appendChild(button);
      }

      if (block.locked) {
        const badge = document.createElement("span");

        badge.className = "hps-pill";
        badge.textContent = "قسم نظام محمي";

        section.appendChild(badge);
      }

      section.addEventListener("click", () => {
        selectBlock(block.id);
      });

      canvas.appendChild(section);
    });

    if (!canvas.children.length) {
      const empty = document.createElement("div");
      empty.className = "hps-empty";
      empty.textContent = "لا توجد أقسام ظاهرة.";
      canvas.appendChild(empty);
    }
  }

  function addField(container, label, key, value, type = "text") {
    const wrapper = document.createElement("div");
    wrapper.className = "hps-field";

    const title = document.createElement("label");
    title.textContent = label;

    const input = type === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");

    if (type !== "textarea") {
      input.type = type;
    }

    input.value = value || "";

    input.addEventListener("input", () => {
      const block = doc.blocks.find(
        item => item.id === selectedId
      );

      if (!block) return;

      block[key] = input.value;

      markChanged();
      renderCanvas();
    });

    wrapper.append(title, input);
    container.appendChild(wrapper);
  }

  function renderProperties() {
    const box = $("#hps-properties");

    const block = doc.blocks.find(
      item => item.id === selectedId
    );

    box.replaceChildren();

    if (!block) {
      box.className = "hps-empty";
      box.textContent = "اختر قسماً للتعديل.";
      return;
    }

    box.className = "";

    addField(box, "اسم القسم", "name", block.name);
    addField(box, "العنوان", "title", block.title);
    addField(box, "الوصف", "text", block.text, "textarea");

    if (block.type === "hero") {
      addField(
        box,
        "النص العلوي",
        "eyebrow",
        block.eyebrow
      );
    }

    if (block.type === "image") {
      addField(
        box,
        "رابط الصورة",
        "imageUrl",
        block.imageUrl,
        "url"
      );
    }

    if (
      block.buttonText !== undefined ||
      block.type === "hero" ||
      block.type === "banner"
    ) {
      addField(
        box,
        "نص الزر",
        "buttonText",
        block.buttonText
      );

      addField(
        box,
        "رابط الزر",
        "buttonUrl",
        block.buttonUrl
      );
    }

    const visibility = document.createElement("div");
    visibility.className = "hps-field";

    const label = document.createElement("label");
    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";
    checkbox.checked = block.visible;

    checkbox.addEventListener("change", () => {
      block.visible = checkbox.checked;
      markChanged();
      renderList();
      renderCanvas();
    });

    label.append(checkbox, document.createTextNode(" إظهار القسم"));
    visibility.appendChild(label);
    box.appendChild(visibility);

    const actions = document.createElement("div");
    actions.className = "hps-actions";

    const up = makeButton("للأعلى");
    const down = makeButton("للأسفل");
    const duplicate = makeButton("نسخ");
    const remove = makeButton("حذف");

    duplicate.disabled = !!block.locked;
    remove.disabled = !!block.locked;

    up.addEventListener("click", () => shiftBlock(block.id, -1));
    down.addEventListener("click", () => shiftBlock(block.id, 1));

    duplicate.addEventListener("click", () => {
      if (block.locked) return;

      const copy = clone(block);

      copy.id = makeId();
      copy.name = block.name + " — نسخة";

      const index = doc.blocks.findIndex(
        item => item.id === block.id
      );

      doc.blocks.splice(index + 1, 0, copy);

      selectedId = copy.id;

      markChanged();
      renderAll();
    });

    remove.addEventListener("click", () => {
      if (block.locked) return;

      if (!confirm("هل تريد حذف هذا القسم؟")) return;

      doc.blocks = doc.blocks.filter(
        item => item.id !== block.id
      );

      selectedId = null;

      markChanged();
      renderAll();
    });

    actions.append(up, down, duplicate, remove);
    box.appendChild(actions);
  }

  function makeButton(label) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "hps-btn";
    button.textContent = label;

    return button;
  }

  function selectBlock(id) {
    selectedId = id;

    renderList();
    renderCanvas();
    renderProperties();
  }

  function renderAll() {
    renderList();
    renderCanvas();
    renderProperties();

    $("#hps-accent").value = doc.theme.accent;
    $("#hps-background").value = doc.theme.background;
  }

  function moveBlock(fromId, toId) {
    const from = doc.blocks.findIndex(
      item => item.id === fromId
    );

    const to = doc.blocks.findIndex(
      item => item.id === toId
    );

    if (from < 0 || to < 0) return;
    if (doc.blocks[from].locked) return;

    const [item] = doc.blocks.splice(from, 1);

    doc.blocks.splice(to, 0, item);

    markChanged();
    renderAll();
  }

  function shiftBlock(id, direction) {
    const index = doc.blocks.findIndex(
      item => item.id === id
    );

    const next = index + direction;

    if (
      index < 0 ||
      next < 0 ||
      next >= doc.blocks.length
    ) return;

    if (
      doc.blocks[index].locked ||
      doc.blocks[next].locked
    ) return;

    [
      doc.blocks[index],
      doc.blocks[next]
    ] = [
      doc.blocks[next],
      doc.blocks[index]
    ];

    markChanged();
    renderAll();
  }

  function addBlock(type) {
    const names = {
      hero: "قسم رئيسي جديد",
      text: "نص جديد",
      cards: "بطاقات جديدة",
      banner: "بانر جديد",
      image: "صورة جديدة"
    };

    const block = {
      id: makeId(),
      type,
      name: names[type] || "قسم جديد",
      visible: true,
      title: "عنوان جديد",
      text: "أضف وصف القسم هنا."
    };

    if (type === "hero" || type === "banner") {
      block.buttonText = "اعرف المزيد";
      block.buttonUrl = "#";
    }

    if (type === "cards") {
      block.items = [
        {
          title: "بطاقة جديدة",
          text: "وصف البطاقة"
        }
      ];
    }

    doc.blocks.push(block);

    selectedId = block.id;

    markChanged();
    renderAll();
  }

  async function loadHistory() {
    const data = await revisionsRPC("history");

    const history = $("#hps-history");
    history.replaceChildren();

    (data.revisions || []).forEach(revision => {
      const button = makeButton(
        new Date(revision.created_at).toLocaleString("ar-EG") +
        " · " +
        (revision.is_published ? "منشور" : "مسودة")
      );

      button.addEventListener("click", () => {
        restoreRevision(revision.id);
      });

      history.appendChild(button);
    });

    if (!history.children.length) {
      history.textContent = "لا توجد إصدارات محفوظة بعد.";
    }
  }

  async function load() {
    if (busy || destroyed) return;

    busy = true;

    try {
      const data = await contentRPC("get");

      const record = data.record || data;

      doc = normalizeDocument(
        record.content || {}
      );

      dirty = false;

      setState(
        record.is_published ? "منشور" : "مسودة"
      );

      renderAll();

      await loadHistory();

    } catch (error) {
      notify(error.message || "تعذر تحميل الصفحة.");
    } finally {
      busy = false;
    }
  }

  async function save(publish = false) {
    if (busy || destroyed) return;

    busy = true;

    try {
      const payload = clone(doc);

      const result = await contentRPC(
        "save",
        payload,
        publish
      );

      const snapshot = await revisionsRPC(
        "snapshot",
        {
          content: payload,
          published: publish
        }
      );

      dirty = false;

      setState(
        publish ? "تم النشر" : "تم حفظ المسودة",
        "#24533c"
      );

      await loadHistory();

      notify(
        publish
          ? "تم حفظ الصفحة كمنشورة. ظهورها للزوار يتطلب تفعيل محرك العرض العام."
          : "تم حفظ المسودة وسجل الإصدار."
      );

      return result;

    } catch (error) {
      notify(error.message || "تعذر حفظ الصفحة.");
    } finally {
      busy = false;
    }
  }

  async function restoreRevision(id) {
    if (!confirm("استعادة هذا الإصدار السابق؟")) return;

    try {
      const data = await revisionsRPC(
        "restore",
        { revisionId: id }
      );

      doc = normalizeDocument(data.content || {});

      dirty = false;

      renderAll();
      await loadHistory();

      setState("تمت الاستعادة", "#24533c");

      notify("تمت استعادة الإصدار السابق.");

    } catch (error) {
      notify(error.message || "تعذرت الاستعادة.");
    }
  }

  app.querySelectorAll("[data-add]").forEach(button => {
    button.addEventListener("click", () => {
      addBlock(button.dataset.add);
    });
  });

  app.querySelectorAll("[data-device]").forEach(button => {
    button.addEventListener("click", () => {
      device = button.dataset.device;
      renderCanvas();
    });
  });

  $("#hps-accent").addEventListener("input", event => {
    doc.theme.accent = event.target.value;
    markChanged();
    renderCanvas();
  });

  $("#hps-background").addEventListener("input", event => {
    doc.theme.background = event.target.value;
    markChanged();
    renderCanvas();
  });

  $("#hps-save").addEventListener("click", () => {
    save(false);
  });

  $("#hps-publish").addEventListener("click", () => {
    save(true);
  });

  $("#hps-reload").addEventListener("click", () => {
    if (
      dirty &&
      !confirm("ستفقد التغييرات غير المحفوظة. هل تريد المتابعة؟")
    ) return;

    load();
  });

  load();

  return {
    reload: load,
    save: () => save(false),

    hasUnsavedChanges() {
      return dirty;
    },

    destroy() {
      destroyed = true;
      style.remove();
      app.remove();
    }
  };
}
