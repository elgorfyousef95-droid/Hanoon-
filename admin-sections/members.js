
const escapeHTML = (value = "") =>
  String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  }[char]));

const dateText = value => {
  if (!value) return "غير متاح";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "غير متاح"
    : date.toLocaleDateString("ar-EG", {
        year: "numeric", month: "long", day: "numeric"
      });
};

export async function renderMembersSection({
  root,
  supabase,
  sessionToken
}) {
  if (!root || !supabase || !sessionToken) {
    throw new Error("تعذر تشغيل قسم الأعضاء: بيانات جلسة الإدارة غير مكتملة.");
  }

  let search = "";
  let offset = 0;
  const pageSize = 20;
  let total = 0;
  let loading = false;

  root.innerHTML = `
    <style>
      .mem-wrap{color:#fff;font-family:Cairo,sans-serif}
      .mem-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:20px}
      .mem-title{font-size:24px;font-weight:900;color:#ffe1a0;margin:0}
      .mem-sub{font-size:12px;color:#c5b4d5;margin-top:6px}
      .mem-tools{display:flex;gap:9px;flex-wrap:wrap;width:100%;margin:16px 0}
      .mem-search{flex:1;min-width:190px;height:46px;padding:0 14px;border-radius:12px;border:1px solid #a34dff66;background:#100a1b;color:#fff;outline:none}
      .mem-btn{border:1px solid #d9b77b66;border-radius:11px;padding:10px 15px;background:#281638;color:#ffe5b0;font:700 12px Cairo;cursor:pointer}
      .mem-btn:disabled{opacity:.5;cursor:wait}
      .mem-stats{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0 18px}
      .mem-stat{flex:1;min-width:120px;padding:15px;border:1px solid #ffffff20;border-radius:14px;background:#160e22}
      .mem-stat small{display:block;color:#bba9cc;font-size:10px}
      .mem-stat strong{display:block;color:#ffe1a0;font-size:22px;margin-top:5px}
      .mem-list{display:grid;gap:12px}
      .mem-card{padding:15px;border:1px solid #ffffff20;border-radius:17px;background:linear-gradient(135deg,#1c1129ee,#0d0915ee);display:grid;grid-template-columns:58px minmax(0,1fr);gap:13px;align-items:start}
      .mem-avatar{width:58px;height:58px;border-radius:16px;object-fit:cover;background:#39234c;border:1px solid #d9b77b66}
      .mem-name{font-weight:900;font-size:14px;overflow-wrap:anywhere}
      .mem-code{color:#d9bd83;font-size:11px;margin-top:3px;direction:ltr;text-align:right}
      .mem-meta{color:#bbaacb;font-size:10px;line-height:2;margin-top:6px;overflow-wrap:anywhere}
      .mem-badges{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
      .mem-badge{font-size:9px;padding:4px 8px;border-radius:20px;background:#ffffff12;color:#ddd}
      .mem-badge.verified{background:#12649a55;color:#9bd9ff;border:1px solid #39aaff66}
      .mem-badge.admin{background:#7d4c1e55;color:#ffdf9b;border:1px solid #e9c77d66}
      .mem-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .mem-detail{grid-column:1/-1;border-top:1px solid #ffffff18;padding-top:12px;margin-top:4px;display:none}
      .mem-detail.open{display:block}
      .mem-detail p{margin:5px 0;color:#d5c8e2;font-size:11px;line-height:1.9;overflow-wrap:anywhere}
      .mem-status{padding:13px;border-radius:12px;background:#170f22;color:#cbbbd9;font-size:12px;text-align:center}
      .mem-error{color:#ffc1ca;border:1px solid #ff718655;background:#721c3444}
      .mem-pager{display:flex;align-items:center;justify-content:center;gap:12px;margin:18px 0}
      .mem-pager span{font-size:11px;color:#cdbbdc}
      @media(min-width:700px){.mem-list{grid-template-columns:repeat(2,minmax(0,1fr))}}
    </style>

    <section class="mem-wrap">
      <header class="mem-head">
        <div>
          <h1 class="mem-title">إدارة الأعضاء</h1>
          <div class="mem-sub">عرض حسابات الأعضاء والبحث عنها وإدارة التوثيق.</div>
        </div>
        <button class="mem-btn" id="memRefresh" type="button">تحديث القائمة</button>
      </header>

      <div class="mem-stats">
        <div class="mem-stat">
          <small>إجمالي نتائج البحث</small>
          <strong id="memTotal">—</strong>
        </div>
        <div class="mem-stat">
          <small>عدد الأعضاء في الصفحة</small>
          <strong id="memShown">—</strong>
        </div>
      </div>

      <div class="mem-tools">
        <input class="mem-search" id="memSearch"
          type="search" placeholder="ابحث بالاسم أو اسم المستخدم أو كود العضو">
        <button class="mem-btn" id="memSearchBtn" type="button">بحث</button>
      </div>

      <div class="mem-list" id="memList">
        <div class="mem-status">جارٍ تحميل بيانات الأعضاء...</div>
      </div>

      <div class="mem-pager">
        <button class="mem-btn" id="memPrev" type="button">السابق</button>
        <span id="memPage">الصفحة 1</span>
        <button class="mem-btn" id="memNext" type="button">التالي</button>
      </div>
    </section>
  `;

  const list = root.querySelector("#memList");
  const searchInput = root.querySelector("#memSearch");
  const totalEl = root.querySelector("#memTotal");
  const shownEl = root.querySelector("#memShown");
  const pageEl = root.querySelector("#memPage");
  const prevBtn = root.querySelector("#memPrev");
  const nextBtn = root.querySelector("#memNext");

  async function loadMembers() {
    if (loading) return;
    loading = true;
    list.innerHTML = `<div class="mem-status">جارٍ تحميل الأعضاء من قاعدة البيانات...</div>`;
    root.querySelector("#memRefresh").disabled = true;
    root.querySelector("#memSearchBtn").disabled = true;

    try {
      const { data, error } = await supabase.rpc(
        "hanoon_admin_list_members",
        {
          p_session_token: sessionToken,
          p_search: search,
          p_limit: pageSize,
          p_offset: offset
        }
      );

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || "تعذر تحميل قائمة الأعضاء.");

      total = Number(data.total || 0);
      const members = Array.isArray(data.members) ? data.members : [];

      totalEl.textContent = total.toLocaleString("ar-EG");
      shownEl.textContent = members.length.toLocaleString("ar-EG");
      pageEl.textContent =
        `الصفحة ${Math.floor(offset / pageSize) + 1}`;

      prevBtn.disabled = offset <= 0;
      nextBtn.disabled = offset + pageSize >= total;

      if (!members.length) {
        list.innerHTML = `<div class="mem-status">لا توجد نتائج مطابقة لبحثك.</div>`;
        return;
      }

      list.innerHTML = members.map(member => {
        let avatarUrl = "";
        if (member.avatar_path) {
          const result = supabase.storage
            .from("avatars")
            .getPublicUrl(member.avatar_path);
          avatarUrl = result?.data?.publicUrl || "";
        }

        const name = member.full_name || member.nickname ||
          member.username || "عضو بدون اسم";

        const badges = [
          member.is_verified
            ? `<span class="mem-badge verified">✓ حساب موثق</span>`
            : `<span class="mem-badge">غير موثق</span>`,
          member.role === "admin"
            ? `<span class="mem-badge admin">إدارة</span>`
            : `<span class="mem-badge">عضو</span>`,
          member.is_private
            ? `<span class="mem-badge">حساب خاص</span>`
            : `<span class="mem-badge">حساب عام</span>`
        ].join("");

        const hobbies = Array.isArray(member.hobbies)
          ? member.hobbies.join("، ") : "";
        const interests = Array.isArray(member.interests)
          ? member.interests.join("، ") : "";
        const reading = Array.isArray(member.reading_interests)
          ? member.reading_interests.join("، ") : "";

        return `
          <article class="mem-card" data-member="${escapeHTML(member.member_code)}">
            <img class="mem-avatar"
              src="${escapeHTML(avatarUrl)}"
              alt="صورة العضو"
              onerror="this.style.visibility='hidden'">

            <div>
              <div class="mem-name">${escapeHTML(name)}</div>
              <div class="mem-code">${escapeHTML(member.member_code)}</div>
              <div class="mem-meta">
                ${member.username ? "@" + escapeHTML(member.username) + " · " : ""}
                انضم: ${dateText(member.created_at)}
              </div>
              <div class="mem-badges">${badges}</div>

              <div class="mem-actions">
                <button class="mem-btn" data-action="details" type="button">عرض التفاصيل</button>
                <button class="mem-btn" data-action="verify"
                  type="button" ${member.role === "admin" ? "disabled" : ""}>
                  ${member.is_verified ? "إلغاء التوثيق" : "توثيق العضو"}
                </button>
              </div>
            </div>

            <div class="mem-detail">
              <p><b>الاسم:</b> ${escapeHTML(member.full_name || "غير متاح")}</p>
              <p><b>الاسم المستعار:</b> ${escapeHTML(member.nickname || "غير متاح")}</p>
              <p><b>كود العضو:</b> ${escapeHTML(member.member_code)}</p>
              <p><b>نبذة:</b> ${escapeHTML(member.bio || "لا توجد نبذة")}</p>
              <p><b>الهوايات:</b> ${escapeHTML(hobbies || "غير مضافة")}</p>
              <p><b>الاهتمامات:</b> ${escapeHTML(interests || "غير مضافة")}</p>
              <p><b>اهتمامات القراءة:</b> ${escapeHTML(reading || "غير مضافة")}</p>
              <p><b>اكتمال الملف:</b> ${member.profile_completed ? "مكتمل" : "غير مكتمل"}</p>
              <p><b>تاريخ الانضمام:</b> ${dateText(member.created_at)}</p>
            </div>
          </article>
        `;
      }).join("");

    } catch (error) {
      console.error("Members section:", error);
      list.innerHTML = `
        <div class="mem-status mem-error">
          ${escapeHTML(error.message || "حدث خطأ أثناء تحميل الأعضاء.")}
        </div>`;
      totalEl.textContent = "—";
      shownEl.textContent = "—";
    } finally {
      loading = false;
      root.querySelector("#memRefresh").disabled = false;
      root.querySelector("#memSearchBtn").disabled = false;
    }
  }

  async function runSearch() {
    search = searchInput.value.trim();
    offset = 0;
    await loadMembers();
  }

  root.querySelector("#memSearchBtn").addEventListener("click", runSearch);
  searchInput.addEventListener("keydown", event => {
    if (event.key === "Enter") runSearch();
  });

  root.querySelector("#memRefresh").addEventListener("click", loadMembers);

  prevBtn.addEventListener("click", async () => {
    if (offset <= 0) return;
    offset = Math.max(0, offset - pageSize);
    await loadMembers();
  });

  nextBtn.addEventListener("click", async () => {
    if (offset + pageSize >= total) return;
    offset += pageSize;
    await loadMembers();
  });

  list.addEventListener("click", async event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const card = button.closest(".mem-card");
    if (!card) return;

    const memberCode = card.dataset.member;

    if (button.dataset.action === "details") {
      card.querySelector(".mem-detail").classList.toggle("open");
      button.textContent =
        card.querySelector(".mem-detail").classList.contains("open")
          ? "إخفاء التفاصيل" : "عرض التفاصيل";
      return;
    }

    if (button.dataset.action === "verify") {
      const isCurrentlyVerified =
        card.querySelector(".mem-badge.verified") !== null;
      const nextValue = !isCurrentlyVerified;

      const confirmed = window.confirm(
        nextValue
          ? `هل تريد توثيق العضو ${memberCode}؟`
          : `هل تريد إلغاء توثيق العضو ${memberCode}؟`
      );
      if (!confirmed) return;

      button.disabled = true;
      button.textContent = "جارٍ الحفظ...";

      try {
        const { data, error } = await supabase.rpc(
          "admin_set_member_verified",
          {
            p_session_token: sessionToken,
            p_member_code: memberCode,
            p_verified: nextValue
          }
        );

        if (error) throw error;
        if (!data?.ok) throw new Error(data?.error || "تعذر تحديث التوثيق.");

        await loadMembers();
      } catch (error) {
        window.alert(error.message || "حدث خطأ أثناء تحديث التوثيق.");
        button.disabled = false;
        button.textContent = isCurrentlyVerified
          ? "إلغاء التوثيق" : "توثيق العضو";
      }
    }
  });

  await loadMembers();
}
