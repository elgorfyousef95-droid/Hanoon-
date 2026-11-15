
const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[c]));

const numberFormat = value =>
  new Intl.NumberFormat("ar-EG").format(Number(value || 0));

const walletStyles = `
.wallet-admin{font-family:Cairo,sans-serif;color:#f7efff}
.wallet-admin *{box-sizing:border-box}
.wallet-admin .hero{padding:22px;border:1px solid #d5b16d77;border-radius:20px;background:radial-gradient(circle at 90% 0%,#603b81 0,transparent 45%),linear-gradient(130deg,#21132f,#100a19);margin-bottom:18px}
.wallet-admin .kicker{font-size:10px;letter-spacing:2px;color:#e6c47e;font-weight:900}
.wallet-admin h2{margin:7px 0;color:#f4d995;font-size:24px}
.wallet-admin p{color:#c9b8d8;font-size:12px;line-height:1.8}
.wallet-admin .balances{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}
.wallet-admin .balance{padding:17px;border-radius:16px;border:1px solid #d4b36e66;background:linear-gradient(145deg,#28183a,#130d1d)}
.wallet-admin .balance span{display:block;color:#c8b8d9;font-size:11px}
.wallet-admin .balance b{display:block;font-size:26px;color:#f5d68f;margin-top:7px}
.wallet-admin .panel{padding:18px;border:1px solid #a77bc755;border-radius:17px;background:linear-gradient(145deg,#1d1428,#100b17);margin:14px 0}
.wallet-admin .panel h3{margin:0 0 13px;color:#f1d18e;font-size:16px}
.wallet-admin input,.wallet-admin select{width:100%;background:#0c0713;border:1px solid #8764a277;border-radius:11px;color:white;padding:11px;min-width:0;outline:none;font:inherit;font-size:12px}
.wallet-admin .search{display:flex;gap:9px;flex-wrap:wrap}
.wallet-admin .search input{flex:1;min-width:180px}
.wallet-admin button{cursor:pointer;font:inherit}
.wallet-admin .primary{border:1px solid #e5c47c;border-radius:11px;padding:10px 17px;background:linear-gradient(100deg,#64219a,#a84acb);color:white;font-weight:900;font-size:12px}
.wallet-admin .secondary{border:1px solid #bd91dc66;border-radius:11px;padding:10px 15px;background:#251633;color:#e8d9f4;font-weight:800;font-size:12px}
.wallet-admin button:disabled{opacity:.55;cursor:wait}
.wallet-admin .member{display:flex;align-items:center;gap:13px;padding:14px;border:1px solid #d4b36e55;border-radius:15px;background:#130d1d;margin-top:15px;flex-wrap:wrap}
.wallet-admin .avatar{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;border:2px solid #d6b46f;background:#30203d;color:#f4d995;font-weight:900;font-size:20px}
.wallet-admin .member strong{color:#f4d995;font-size:15px}
.wallet-admin .member small{display:block;color:#c5b3d6;font-size:11px;margin-top:4px}
.wallet-admin .chips{display:flex;gap:8px;flex-wrap:wrap;margin-right:auto}
.wallet-admin .chip{padding:7px 10px;border:1px solid #c39b5d66;border-radius:10px;color:#f2d38e;font-size:11px}
.wallet-admin .form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.wallet-admin .field{display:flex;flex-direction:column;gap:6px}
.wallet-admin .field label{color:#cdbbdb;font-size:11px}
.wallet-admin .actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}
.wallet-admin .note{padding:13px;border:1px dashed #b58ac766;border-radius:12px;color:#cbb9da;font-size:11px;line-height:1.8}
.wallet-admin .message{font-size:12px;margin-top:10px;color:#f1d18e;min-height:18px}
.wallet-admin .table-wrap{overflow:auto}
.wallet-admin table{width:100%;border-collapse:collapse;min-width:490px;font-size:11px}
.wallet-admin th,.wallet-admin td{padding:11px 9px;border-bottom:1px solid #8c6aa344;text-align:right}
.wallet-admin th{color:#f1d18e}
.wallet-admin td{color:#e2d6ed}
.wallet-admin .plus{color:#61d6a2}
.wallet-admin .minus{color:#ff879a}
.wallet-admin .balance-icon{width:44px;height:44px;object-fit:contain;float:left;border-radius:11px;background:#ffffff0b;padding:4px}
.wallet-admin .currency-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.wallet-admin .currency-card{border:1px solid #d5b16d66;border-radius:16px;padding:13px;background:linear-gradient(145deg,#261832,#100b18);display:grid;grid-template-columns:68px 1fr;gap:11px;align-items:center}
.wallet-admin .currency-preview{width:68px;height:68px;object-fit:contain;border-radius:13px;background:#ffffff0a;border:1px solid #d5b16d55;padding:5px}
.wallet-admin .currency-card strong{display:block;color:#f4d995;font-size:13px}
.wallet-admin .currency-card small{display:block;color:#c7b8d5;font-size:10px;line-height:1.7;margin-top:4px}
.wallet-admin .currency-card input{margin-top:7px;font-size:10px;padding:8px}
@media(max-width:580px){
 .wallet-admin .balances{gap:8px}
 .wallet-admin .balance{padding:13px}
 .wallet-admin .balance b{font-size:21px}
 .wallet-admin .form{grid-template-columns:1fr}
 .wallet-admin .chips{margin-right:0;width:100%}
 .wallet-admin .currency-grid{grid-template-columns:1fr}
}
`;

export async function renderWalletSection({root,supabase,sessionToken}){
  if(!document.getElementById("hanoonWalletStyles")){
    const style=document.createElement("style");
    style.id="hanoonWalletStyles";
    style.textContent=walletStyles;
    document.head.appendChild(style);
  }

  let member=null;
  let busy=false;
  let destroyed=false;
  let currencyAssets=[];

  root.innerHTML=`
    <div class="wallet-admin">
      <section class="hero">
        <div class="kicker">HANOON WORLD • TREASURY</div>
        <h2>المحفظة والأرصدة</h2>
        <p>إدارة العملات والجواهر، متابعة أرصدة الأعضاء، وتنفيذ التحويلات مع سجل واضح للمعاملات.</p>
      </section>

      <section class="panel">
        <h3>صور العملات والجواهر</h3>
        <div class="currency-grid" id="currencyAssets"><div class="note">جارٍ تحميل إعدادات الصور...</div></div>
        <div class="actions"><button class="primary" id="saveCurrencies">حفظ الصور والأسماء</button></div>
        <div class="message" id="currencyMessage" role="status"></div>
      </section>
      <div class="balances" id="adminBalances">
        <div class="balance"><span>رصيد الإدارة من العملات</span><b>—</b></div>
        <div class="balance"><span>رصيد الإدارة من الجواهر</span><b>—</b></div>
      </div>

      <section class="panel">
        <h3>البحث عن عضو</h3>
        <div class="search">
          <input id="memberSearch" placeholder="كود العضوية أو اسم المستخدم">
          <button class="primary" id="findMember">بحث عن العضو</button>
        </div>
        <div id="memberResult"></div>
        <div class="message" id="walletMessage" role="status"></div>
      </section>

      <section class="panel">
        <h3>تنفيذ عملية مالية</h3>
        <div class="form">
          <div class="field">
            <label>نوع العملية</label>
            <select id="walletAction">
              <option value="transfer">تحويل من محفظة الإدارة</option>
              <option value="credit">إضافة رصيد إداري</option>
            </select>
          </div>
          <div class="field">
            <label>نوع الرصيد</label>
            <select id="walletCurrency">
              <option value="coins">عملات</option>
              <option value="gems">جواهر</option>
            </select>
          </div>
          <div class="field">
            <label>الكمية</label>
            <input id="walletAmount" type="number" min="1" max="1000000000" step="1" placeholder="أدخل الكمية">
          </div>
          <div class="field">
            <label>سبب العملية</label>
            <input id="walletReason" maxlength="160" placeholder="مثال: مكافأة أو دعم عضو">
          </div>
        </div>
        <div class="actions">
          <button class="primary" id="submitWallet">مراجعة وتنفيذ العملية</button>
        </div>
        <div class="note" style="margin-top:12px">
          التحويل يخصم من محفظة الإدارة ويضيف للعضو، أما الإضافة الإدارية فتمنح العضو رصيدًا دون خصم من محفظة الإدارة. هذه أرصدة افتراضية داخل المنصة وليست أموالًا بنكية.
        </div>
      </section>

      <section class="panel">
        <h3>سجل معاملات العضو</h3>
        <div id="walletTransactions" class="note">ابحث عن عضو لعرض آخر معاملاته.</div>
      </section>
    </div>
  `;

  const $=id=>root.querySelector("#"+id);

  function setMessage(text,error=false){
    $("walletMessage").textContent=text;
    $("walletMessage").style.color=error?"#ff9aaa":"#f1d18e";
  }

  async function callWallet(action,extra={}){
    const {data,error}=await supabase.rpc("hanoon_admin_wallet_console",{
      p_session_token:sessionToken,
      p_action:action,
      p_member_code:extra.memberCode ?? null,
      p_currency:extra.currency ?? "coins",
      p_amount:extra.amount ?? null,
      p_reason:extra.reason ?? "إجراء من إدارة HANOON WORLD"
    });
    if(error) throw error;
    return data;
  }

  function setCurrencyMessage(text,error=false){
    $("currencyMessage").textContent=text;
    $("currencyMessage").style.color=error?"#ff9aaa":"#f1d18e";
  }

  async function callCurrency(action,payload={}){
    const body=action==="list"
      ?{action:"currency_list"}
      :{action:"currency_save",item:payload};

    const {data,error}=await supabase.functions.invoke("admin-upload-store-asset",{
      body,
      headers:{"x-admin-session":sessionToken}
    });

    if(error)throw new Error(error.message||"تعذر الاتصال بخدمة العملات.");
    if(!data?.ok)throw new Error(data?.error||"تعذر تنفيذ عملية العملات.");
    return data.result;
  }

  const currencyImage=path=>path
    ?supabase.storage.from("world-store-assets").getPublicUrl(path).data?.publicUrl||""
    :"";

  async function uploadCurrencyImage(file){
    if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>10*1024*1024)
      throw new Error("اختر PNG أو JPG أو WEBP أو GIF بحجم لا يتجاوز 10 ميجابايت.");

    const form=new FormData();
    form.append("file",file);
    form.append("folder","currencies");

    const {data,error}=await supabase.functions.invoke("admin-upload-store-asset",{
      body:form,
      headers:{"x-admin-session":sessionToken}
    });

    if(error)throw new Error(error.message||"تعذر رفع صورة العملة.");
    if(!data?.ok||!data?.path)throw new Error(data?.error||"تعذر استلام مسار الصورة.");
    return data.path;
  }

  function renderCurrencyAssets(){
    const defs=[
      {key:"coins",title:"العملات",desc:"صورة العملة الافتراضية داخل المنصة"},
      {key:"gems",title:"الجواهر",desc:"صورة الجوهرة المميزة داخل المنصة"}
    ];

    $("currencyAssets").innerHTML=defs.map(def=>{
      const row=currencyAssets.find(x=>x.currency_key===def.key)||{};
      const src=currencyImage(row.image_path)||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%231b1228'/%3E%3Ccircle cx='40' cy='40' r='22' fill='none' stroke='%23e9c77d' stroke-width='4'/%3E%3C/svg%3E";

      return `<div class="currency-card" data-currency="${def.key}">
        <img class="currency-preview" data-preview="${def.key}" src="${escapeHTML(src)}" alt="${def.title}">
        <div>
          <strong>${def.title}</strong>
          <small>${def.desc}</small>
          <input type="text" data-name="${def.key}" value="${escapeHTML(row.name_ar||def.title)}" aria-label="اسم ${def.title}">
          <input type="file" data-file="${def.key}" accept="image/png,image/jpeg,image/webp,image/gif">
        </div>
      </div>`;
    }).join("");

    $("currencyAssets").querySelectorAll('input[type="file"]').forEach(input=>{
      input.addEventListener("change",()=>{
        const file=input.files?.[0];
        if(!file)return;

        if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>10*1024*1024){
          setCurrencyMessage("صيغة الصورة أو حجمها غير مقبول.",true);
          input.value="";
          return;
        }

        const preview=$(`[data-preview="${input.dataset.file}"]`);
        if(preview._objectUrl)URL.revokeObjectURL(preview._objectUrl);
        preview._objectUrl=URL.createObjectURL(file);
        preview.src=preview._objectUrl;
        setCurrencyMessage("تم اختيار الصورة. اضغط حفظ لرفعها.");
      });
    });
  }

  async function loadCurrencyAssets(){
    const data=await callCurrency("list");
    currencyAssets=Array.isArray(data?.items)?data.items:[];
    renderCurrencyAssets();
  }

  async function saveCurrencyAssets(){
    if(busy)return;

    busy=true;
    $("saveCurrencies").disabled=true;
    setCurrencyMessage("جارٍ حفظ صور العملات...");

    try{
      for(const key of ["coins","gems"]){
        const card=$(`.currency-card[data-currency="${key}"]`);
        const file=card.querySelector(`[data-file="${key}"]`).files?.[0];
        const old=currencyAssets.find(x=>x.currency_key===key)||{};
        const name=card.querySelector(`[data-name="${key}"]`).value.trim();

        if(!name)throw new Error("اكتب اسم العملة والجوهرة.");

        const image_path=file
          ?await uploadCurrencyImage(file)
          :old.image_path||null;

        await callCurrency("save",{
          currency_key:key,
          name_ar:name,
          description_ar:key==="coins"?"عملة المنصة الافتراضية":"الجوهرة المميزة داخل المنصة",
          image_path,
          is_active:true,
          sort_order:key==="coins"?1:2
        });
      }

      await loadCurrencyAssets();
      setCurrencyMessage("تم حفظ صور وأسماء العملات والجواهر بنجاح.");
      await loadOverview();

    }catch(error){
      setCurrencyMessage(error.message||"تعذر حفظ صور العملات.",true);
    }finally{
      busy=false;
      $("saveCurrencies").disabled=false;
    }
  }

  async function loadOverview(){
    const data=await callWallet("overview");
    if(destroyed)return;

    const coins=currencyAssets.find(x=>x.currency_key==="coins");
    const gems=currencyAssets.find(x=>x.currency_key==="gems");

    $("adminBalances").innerHTML=`
      <div class="balance">
        ${coins?.image_path?`<img class="balance-icon" src="${escapeHTML(currencyImage(coins.image_path))}" alt="">`:""}
        <span>رصيد الإدارة من العملات</span>
        <b>${numberFormat(data?.coins)}</b>
      </div>
      <div class="balance">
        ${gems?.image_path?`<img class="balance-icon" src="${escapeHTML(currencyImage(gems.image_path))}" alt="">`:""}
        <span>رصيد الإدارة من الجواهر</span>
        <b>${numberFormat(data?.gems)}</b>
      </div>
    `;
  }

  function renderTransactions(rows){
    if(!rows?.length){
      $("walletTransactions").textContent="لا توجد معاملات مسجلة لهذا العضو حتى الآن.";
      return;
    }

    $("walletTransactions").innerHTML=`
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>التاريخ</th><th>النوع</th><th>الكمية</th><th>السبب</th></tr>
          </thead>
          <tbody>
            ${rows.map(item=>`
              <tr>
                <td>${escapeHTML(new Date(item.created_at).toLocaleString("ar-EG"))}</td>
                <td>${item.currency==="gems"?"جواهر":"عملات"}</td>
                <td class="${Number(item.amount)>=0?"plus":"minus"}">
                  ${Number(item.amount)>0?"+":""}${numberFormat(item.amount)}
                </td>
                <td>${escapeHTML(item.reason||"—")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderMember(data){
    member=data;
    const displayName=data.full_name||data.nickname||data.username||"عضو";
    const initial=displayName.trim().charAt(0)||"ع";

    $("memberResult").innerHTML=`
      <div class="member">
        <div class="avatar">${escapeHTML(initial)}</div>
        <div>
          <strong>${escapeHTML(displayName)} ${data.is_verified?"✓":""}</strong>
          <small>${escapeHTML(data.member_code||"")} • @${escapeHTML(data.username||"—")}</small>
        </div>
        <div class="chips">
          <span class="chip">${numberFormat(data.coins)} عملة</span>
          <span class="chip">${numberFormat(data.gems)} جوهرة</span>
        </div>
      </div>
    `;

    renderTransactions(data.transactions||[]);
  }

  async function findMember(){
    const code=$("memberSearch").value.trim();

    if(!code){
      setMessage("اكتب كود العضوية أو اسم المستخدم أولاً.",true);
      return;
    }

    $("findMember").disabled=true;
    setMessage("جارٍ البحث عن العضو...");

    try{
      const data=await callWallet("search",{memberCode:code});
      if(destroyed)return;
      if(!data?.user_id)throw new Error("لم يتم العثور على العضو.");

      renderMember(data);
      setMessage("تم العثور على العضو وتحميل رصيده.");

    }catch(error){
      member=null;
      $("memberResult").innerHTML="";
      $("walletTransactions").textContent="تعذر تحميل سجل العضو.";
      setMessage(error.message||"تعذر البحث عن العضو.",true);

    }finally{
      $("findMember").disabled=false;
    }
  }

  async function submitOperation(){
    if(busy)return;

    if(!member){
      setMessage("ابحث عن العضو أولاً.",true);
      return;
    }

    const action=$("walletAction").value;
    const currency=$("walletCurrency").value;
    const amount=Number($("walletAmount").value);
    const reason=$("walletReason").value.trim();

    if(!Number.isSafeInteger(amount)||amount<1||amount>1000000000){
      setMessage("أدخل كمية صحيحة من 1 إلى مليار.",true);
      return;
    }

    const operationName=action==="transfer"?"تحويل من محفظة الإدارة":"إضافة رصيد إداري";
    const currencyName=currency==="gems"?"جوهرة":"عملة";
    const explanation=action==="transfer"
      ?"سيتم خصم الكمية من رصيد الإدارة وإضافتها إلى العضو."
      :"سيتم إضافة الرصيد للعضو دون خصمه من رصيد الإدارة.";

    const confirmed=confirm(
      `تأكيد ${operationName}؟\n`+
      `العضو: ${member.full_name||member.username||member.member_code}\n`+
      `الكمية: ${numberFormat(amount)} ${currencyName}\n`+
      explanation
    );

    if(!confirmed)return;

    busy=true;
    $("submitWallet").disabled=true;
    setMessage("جارٍ تنفيذ العملية...");

    try{
      const data=await callWallet(action,{
        memberCode:member.member_code||$("memberSearch").value.trim(),
        currency,
        amount,
        reason:reason||undefined
      });

      if(!data?.ok)throw new Error(data?.error||"لم يتم تأكيد تنفيذ العملية.");

      setMessage("تم تنفيذ العملية وتسجيلها بنجاح.");
      $("walletAmount").value="";
      await findMember();
      await loadOverview();

    }catch(error){
      setMessage(error.message||"فشلت العملية. لم يتم تأكيد تنفيذها.",true);

    }finally{
      busy=false;
      $("submitWallet").disabled=false;
    }
  }

  $("findMember").addEventListener("click",findMember);
  $("memberSearch").addEventListener("keydown",event=>{
    if(event.key==="Enter")findMember();
  });
  $("submitWallet").addEventListener("click",submitOperation);

  $("walletAction").addEventListener("change",()=>{
    $("submitWallet").textContent=$("walletAction").value==="transfer"
      ?"مراجعة وتنفيذ التحويل"
      :"مراجعة وإضافة الرصيد";
  });

  $("saveCurrencies").addEventListener("click",saveCurrencyAssets);

  try{
    await loadCurrencyAssets();
    await loadOverview();
  }catch(error){
    setCurrencyMessage(error.message||"تعذر تحميل صور العملات.",true);
    setMessage(error.message||"تعذر تحميل رصيد الإدارة.",true);
  }

  return {
    destroy(){
      destroyed=true;
      root.innerHTML="";
    }
  };
}
