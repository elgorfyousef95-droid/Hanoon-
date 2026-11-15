
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
@media(max-width:580px){
 .wallet-admin .balances{gap:8px}
 .wallet-admin .balance{padding:13px}
 .wallet-admin .balance b{font-size:21px}
 .wallet-admin .form{grid-template-columns:1fr}
 .wallet-admin .chips{margin-right:0;width:100%}
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

  root.innerHTML=`
    <div class="wallet-admin">
      <section class="hero">
        <div class="kicker">HANOON WORLD • TREASURY</div>
        <h2>المحفظة والأرصدة</h2>
        <p>إدارة العملات والجواهر، متابعة أرصدة الأعضاء، وتنفيذ التحويلات مع سجل واضح للمعاملات.</p>
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

  async function loadOverview(){
    const data=await callWallet("overview");
    if(destroyed)return;
    $("adminBalances").innerHTML=`
      <div class="balance">
        <span>رصيد الإدارة من العملات</span>
        <b>${numberFormat(data?.coins)}</b>
      </div>
      <div class="balance">
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
      if(!data?.user_id) throw new Error("لم يتم العثور على العضو.");
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

      if(!data?.ok) throw new Error(data?.error||"لم يتم تأكيد تنفيذ العملية.");

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

  try{
    await loadOverview();
  }catch(error){
    setMessage(error.message||"تعذر تحميل رصيد الإدارة.",true);
  }

  return {
    destroy(){
      destroyed=true;
      root.innerHTML="";
    }
  };
}
