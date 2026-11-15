
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[c]));

const num = value => new Intl.NumberFormat("ar-EG").format(Number(value || 0));

const styles = `
.hanoon-catalog{font-family:Cairo,sans-serif;color:#f7efff}
.hanoon-catalog *{box-sizing:border-box}
.hanoon-catalog .catalog-hero{padding:22px;border:1px solid #d5b16d77;border-radius:20px;background:radial-gradient(circle at 90% 0%,#603b81 0,transparent 45%),linear-gradient(130deg,#21132f,#100a19);margin-bottom:16px}
.hanoon-catalog .kicker{font-size:10px;letter-spacing:2px;color:#e6c47e;font-weight:900}
.hanoon-catalog h2{margin:7px 0;color:#f4d995;font-size:24px}
.hanoon-catalog p{color:#c9b8d8;font-size:12px;line-height:1.8}
.hanoon-catalog .tabs{display:flex;gap:8px;flex-wrap:wrap;margin:15px 0}
.hanoon-catalog button{font:inherit;cursor:pointer}
.hanoon-catalog button:disabled{opacity:.5;cursor:wait}
.hanoon-catalog .btn{border:1px solid #bd91dc66;border-radius:11px;padding:10px 15px;background:#251633;color:#e8d9f4;font-weight:800;font-size:12px}
.hanoon-catalog .btn.primary{border-color:#e5c47c;background:linear-gradient(100deg,#64219a,#a84acb);color:#fff}
.hanoon-catalog .btn.active{border-color:#e9c77d;color:#ffe1a0;background:#49305d}
.hanoon-catalog .panel{padding:17px;border:1px solid #a77bc755;border-radius:17px;background:linear-gradient(145deg,#1d1428,#100b17);margin:13px 0}
.hanoon-catalog .form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.hanoon-catalog .field{display:flex;flex-direction:column;gap:6px;min-width:0}
.hanoon-catalog label{font-size:11px;color:#cdbbdb}
.hanoon-catalog input,.hanoon-catalog textarea,.hanoon-catalog select{width:100%;min-width:0;background:#0c0713;border:1px solid #8764a277;border-radius:10px;color:white;padding:11px;outline:none;font:inherit;font-size:12px}
.hanoon-catalog textarea{min-height:76px;resize:vertical}
.hanoon-catalog .wide{grid-column:1/-1}
.hanoon-catalog .checkline{display:flex;align-items:center;gap:8px;color:#e2d6ed;font-size:11px}
.hanoon-catalog .checkline input{width:auto}
.hanoon-catalog .list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
.hanoon-catalog .item{border:1px solid #d4b36e55;border-radius:15px;background:#130d1d;padding:13px;min-width:0}
.hanoon-catalog .item-top{display:flex;gap:11px;align-items:center}
.hanoon-catalog .thumb{width:58px;height:58px;flex:none;object-fit:cover;border-radius:12px;border:1px solid #d6b46f66;background:#30203d}
.hanoon-catalog .item strong{display:block;color:#f4d995;font-size:13px;overflow-wrap:anywhere}
.hanoon-catalog .item small{display:block;color:#c5b3d6;font-size:10px;margin-top:4px;overflow-wrap:anywhere}
.hanoon-catalog .status{display:inline-block;padding:4px 8px;border-radius:20px;font-size:9px;margin-top:8px}
.hanoon-catalog .status.on{background:#13543a;color:#9ef0bf}
.hanoon-catalog .status.off{background:#63253a;color:#ffb9c7}
.hanoon-catalog .item-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:12px}
.hanoon-catalog .message{min-height:20px;color:#f1d18e;font-size:12px;margin-top:10px}
.hanoon-catalog .empty{padding:18px;border:1px dashed #b58ac766;border-radius:12px;color:#cbb9da;font-size:12px;text-align:center}
.hanoon-catalog .upload-box{display:grid;grid-template-columns:100px 1fr;gap:13px;align-items:center;padding:13px;border:1px dashed #d8b56d88;border-radius:15px;background:linear-gradient(145deg,#2a1a35,#120c1b)}
.hanoon-catalog .preview{width:100px;height:100px;object-fit:contain;border-radius:13px;background:#120c1b;border:1px solid #d6b46f77}
.hanoon-catalog .file-pick{display:block;padding:11px;border:1px solid #bd91dc66;border-radius:11px;background:#251633;color:#f5e8ff}
.hanoon-catalog .file-pick input{display:block;width:100%;margin-top:8px;font-size:10px}
.hanoon-catalog .hint{font-size:10px;color:#bba9cb;line-height:1.7;margin-top:7px}
@media(max-width:620px){.hanoon-catalog .upload-box{grid-template-columns:80px 1fr}.hanoon-catalog .preview{width:80px;height:80px}}
@media(max-width:620px){.hanoon-catalog .form,.hanoon-catalog .list{grid-template-columns:1fr}.hanoon-catalog .catalog-hero{padding:18px}}
`;

export async function renderCatalogSection({root,supabase,sessionToken}){
  if(!root||!supabase||!sessionToken) throw new Error("جلسة الإدارة غير مكتملة.");

  if(!document.getElementById("hanoonCatalogStyles")){
    const style=document.createElement("style");
    style.id="hanoonCatalogStyles";
    style.textContent=styles;
    document.head.appendChild(style);
  }

  let catalog="gift";
  let items=[];
  let busy=false;
  let destroyed=false;
  let editingId=null;

  root.innerHTML=`
    <div class="hanoon-catalog">
      <section class="catalog-hero">
        <div class="kicker">HANOON WORLD • CATALOG CONTROL</div>
        <h2>إدارة الهدايا والمتجر</h2>
        <p>إضافة الهدايا وعناصر المتجر وتعديل الأسعار والبيانات والتحكم في ظهور كل عنصر للأعضاء.</p>
      </section>

      <div class="tabs">
        <button class="btn active" id="giftTab" type="button">الهدايا</button>
        <button class="btn" id="storeTab" type="button">عناصر المتجر</button>
        <button class="btn primary" id="newItem" type="button">إضافة عنصر جديد</button>
        <button class="btn" id="reloadItems" type="button">تحديث القائمة</button>
      </div>

      <section class="panel" id="editorPanel" hidden>
        <h3 id="editorTitle" style="margin:0 0 13px;color:#f1d18e">إضافة عنصر</h3>
        <form id="catalogForm">
          <div class="form" id="catalogFields"></div>
          <div class="item-actions">
            <button class="btn primary" id="saveItem" type="submit">حفظ البيانات</button>
            <button class="btn" id="cancelEdit" type="button">إلغاء</button>
          </div>
        </form>
      </section>

      <div class="message" id="catalogMessage" role="status"></div>
      <div class="list" id="catalogList">
        <div class="empty">جارٍ تحميل العناصر...</div>
      </div>
    </div>
  `;

  const $=id=>root.querySelector("#"+id);

  const message=(text,error=false)=>{
    $("catalogMessage").textContent=text;
    $("catalogMessage").style.color=error?"#ff9aaa":"#f1d18e";
  };

  const rpc=async(action,payload={})=>{
    const {data,error}=await supabase.rpc("hanoon_admin_manage_catalog",{
      p_session_token:sessionToken,
      p_action:action,
      p_catalog:catalog,
      p_payload:payload
    });

    if(error) throw error;
    if(data?.ok===false) throw new Error(data.error||"تعذر تنفيذ العملية.");
    return data;
  };

  const publicImage=path=>{
    if(!path)return "";
    if(/^https?:\/\//i.test(path))return path;
    return supabase.storage.from("world-store-assets").getPublicUrl(path).data?.publicUrl||"";
  };

  async function uploadImage(file,folder){
    if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>10*1024*1024)
      throw new Error("اختر PNG أو JPG أو WEBP أو GIF بحجم لا يتجاوز 10 ميجابايت.");
    const form=new FormData();form.append("file",file);form.append("folder",folder);
    const {data,error}=await supabase.functions.invoke("admin-upload-store-asset",{body:form,headers:{"x-admin-session":sessionToken}});
    if(error)throw new Error(error.message||"تعذر رفع الصورة.");
    if(!data?.ok||!data?.path)throw new Error(data?.error||"تعذر استلام مسار الصورة.");
    return data.path;
  }

  function imagePicker(path,label){
    const url=publicImage(path)||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100%25' height='100%25' fill='%231b1228'/%3E%3Cpath d='M20 70l22-25 17 17 11-13 15 21' fill='none' stroke='%23e9c77d' stroke-width='4'/%3E%3Ccircle cx='35' cy='30' r='8' fill='%23a34dff'/%3E%3C/svg%3E";
    return `
      <div class="field wide"><label>${label}</label>
        <div class="upload-box">
          <img class="preview" id="catalogImagePreview" src="${esc(url)}" alt="معاينة الصورة">
          <div>
            <label class="file-pick">اختيار صورة من الجهاز
              <input id="catalogImageFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif">
            </label>
            <div class="hint">PNG / JPG / WEBP / GIF — حتى 10 ميجابايت. ستظهر المعاينة قبل الحفظ.</div>
            <input type="hidden" name="image_path" value="${esc(path||"")}">
          </div>
        </div>
      </div>`;
  }

  function field(name,label,value="",type="text",wide=false){
    return `
      <div class="field ${wide?"wide":""}">
        <label for="cf_${name}">${label}</label>
        <input id="cf_${name}" name="${name}" type="${type}" value="${esc(value)}">
      </div>
    `;
  }

  function area(name,label,value="",wide=true){
    return `
      <div class="field ${wide?"wide":""}">
        <label for="cf_${name}">${label}</label>
        <textarea id="cf_${name}" name="${name}">${esc(value)}</textarea>
      </div>
    `;
  }

  function check(name,label,value){
    return `
      <label class="checkline wide">
        <input name="${name}" type="checkbox" ${value?"checked":""}>
        ${label}
      </label>
    `;
  }

  function showEditor(item=null){
    editingId=item?.id||null;
    $("editorPanel").hidden=false;
    $("editorTitle").textContent=item?"تعديل العنصر":"إضافة عنصر جديد";

    const f=item||{};
    let html=field("slug","المعرّف المختصر (إنجليزي)",f.slug||"");

    if(catalog==="gift"){
      html+=field("name_ar","اسم الهدية بالعربية",f.name_ar||"");
      html+=area("description_ar","وصف الهدية",f.description_ar||"");
      html+=field("price_gems","السعر بالجواهر",f.price_gems??1,"number");
      html+=imagePicker(f.image_path,"صورة الهدية الرئيسية");
      html+=field("animation_path","مسار الحركة أو GIF",f.animation_path||"");
      html+=field("sort_order","ترتيب العرض",f.sort_order??0,"number");
      html+=check("is_active","إظهار الهدية للأعضاء",f.is_active!==false);
    }else{
      html+=field("title_ar","اسم المنتج بالعربية",f.title_ar||"");
      html+=field("title_en","اسم المنتج بالإنجليزية",f.title_en||"");
      html+=area("description_ar","الوصف بالعربية",f.description_ar||"");
      html+=area("description_en","الوصف بالإنجليزية",f.description_en||"");
      html+=field("category","التصنيف",f.category||"general");
      html+=field("item_type","نوع العنصر",f.item_type||"digital");
      html+=field("price_coins","السعر بالعملات",f.price_coins??0,"number");
      html+=field("price_gems","السعر بالجواهر",f.price_gems??0,"number");
      html+=field("stock","المخزون (اتركه فارغًا للمفتوح)",f.stock??"","number");
      html+=imagePicker(f.image_path,"صورة المنتج");
      html+=field("asset_path","مسار الملف الأساسي",f.asset_path||"");
      html+=field("preview_path","مسار المعاينة",f.preview_path||"");
      html+=field("sound_path","مسار الصوت",f.sound_path||"");
      html+=check("is_active","إظهار المنتج للأعضاء",!!f.is_active);
      html+=check("can_gift","السماح بإهداء المنتج",f.can_gift!==false);
      html+=check("is_consumable","عنصر قابل للاستهلاك",!!f.is_consumable);
    }

    $("catalogFields").innerHTML=html;
    $("catalogImageFile").addEventListener("change",()=>{
      const file=$("catalogImageFile").files?.[0];if(!file)return;
      if(!["image/png","image/jpeg","image/webp","image/gif"].includes(file.type)||file.size>10*1024*1024){
        message("صيغة الصورة غير مدعومة أو حجمها أكبر من 10 ميجابايت.",true);$("catalogImageFile").value="";return;
      }
      const preview=$("catalogImagePreview");
      if(preview._objectUrl)URL.revokeObjectURL(preview._objectUrl);
      preview._objectUrl=URL.createObjectURL(file);preview.src=preview._objectUrl;
      message("تم اختيار الصورة. اضغط حفظ لرفعها إلى المنصة.");
    });
    $("editorPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }

  function readForm(){
    const form=$("catalogForm");
    const fd=new FormData(form);
    const payload={};

    for(const [key,value] of fd.entries())payload[key]=value;

    for(const name of ["is_active","can_gift","is_consumable"]){
      const node=form.elements.namedItem(name);
      if(node)payload[name]=node.checked;
    }

    if(catalog==="gift"){
      payload.price_gems=Number(payload.price_gems||0);
      payload.sort_order=Number(payload.sort_order||0);
      payload.is_active=!!payload.is_active;
    }else{
      for(const key of ["price_coins","price_gems"]){
        payload[key]=Number(payload[key]||0);
      }

      payload.stock=payload.stock===""?null:Number(payload.stock);
      payload.is_active=!!payload.is_active;
      payload.can_gift=!!payload.can_gift;
      payload.is_consumable=!!payload.is_consumable;
    }

    if(editingId)payload.id=editingId;
    return payload;
  }

  function renderList(){
    if(!items.length){
      $("catalogList").innerHTML=`
        <div class="empty">
          لا توجد عناصر في هذا القسم حتى الآن. استخدم «إضافة عنصر جديد» للبدء.
        </div>
      `;
      return;
    }

    $("catalogList").innerHTML=items.map(item=>{
      const title=catalog==="gift"?item.name_ar:item.title_ar;

      const price=catalog==="gift"
        ?`${num(item.price_gems)} جوهرة`
        :`${num(item.price_coins)} عملة • ${num(item.price_gems)} جوهرة`;

      const image=publicImage(item.image_path);

      return `
        <article class="item" data-id="${esc(item.id)}">
          <div class="item-top">
            ${
              image
                ? `<img class="thumb" src="${esc(image)}" alt="" loading="lazy" onerror="this.style.display='none'">`
                : `<div class="thumb" aria-hidden="true"></div>`
            }

            <div style="min-width:0;flex:1">
              <strong>${esc(title||"عنصر بلا اسم")}</strong>
              <small>${esc(item.slug)} • ${price}</small>
              <span class="status ${item.is_active?"on":"off"}">
                ${item.is_active?"ظاهر للأعضاء":"مخفي"}
              </span>
            </div>
          </div>

          <div class="item-actions">
            <button class="btn" type="button" data-action="edit">تعديل</button>
            <button class="btn" type="button" data-action="toggle">
              ${item.is_active?"إخفاء":"إظهار"}
            </button>
          </div>
        </article>
      `;
    }).join("");
  }

  async function load(){
    if(busy)return;

    busy=true;
    $("reloadItems").disabled=true;
    $("catalogList").innerHTML=`
      <div class="empty">جارٍ تحميل العناصر من قاعدة البيانات...</div>
    `;

    try{
      const data=await rpc("list");
      if(destroyed)return;

      items=Array.isArray(data?.items)?data.items:[];
      renderList();
      message(`تم تحميل ${num(items.length)} عنصر.`);
    }catch(error){
      $("catalogList").innerHTML=`
        <div class="empty">${esc(error.message||"تعذر تحميل القائمة.")}</div>
      `;
      message(error.message||"تعذر تحميل القائمة.",true);
    }finally{
      busy=false;
      if(!destroyed)$("reloadItems").disabled=false;
    }
  }

  async function switchCatalog(next){
    if(catalog===next)return;

    catalog=next;
    editingId=null;
    $("editorPanel").hidden=true;

    $("giftTab").classList.toggle("active",catalog==="gift");
    $("storeTab").classList.toggle("active",catalog==="item");
    $("newItem").textContent=catalog==="gift"?"إضافة هدية":"إضافة منتج";

    await load();
  }

  $("giftTab").addEventListener("click",()=>switchCatalog("gift"));
  $("storeTab").addEventListener("click",()=>switchCatalog("item"));
  $("newItem").addEventListener("click",()=>showEditor());
  $("reloadItems").addEventListener("click",load);

  $("cancelEdit").addEventListener("click",()=>{
    $("editorPanel").hidden=true;
    editingId=null;
  });

  $("catalogForm").addEventListener("submit",async event=>{
    event.preventDefault();
    if(busy)return;

    const payload=readForm();
    const imageFile=$("catalogImageFile")?.files?.[0];

    if(!payload.slug||!/^[a-z0-9][a-z0-9_-]{1,59}$/.test(payload.slug)){
      message("اكتب معرّفًا إنجليزيًا صحيحًا دون مسافات.",true);
      return;
    }

    if(catalog==="gift"&&(!payload.name_ar||payload.price_gems<1)){
      message("اسم الهدية والسعر بالجواهر مطلوبان.",true);
      return;
    }

    if(catalog==="item"&&(
      !payload.title_ar||
      !payload.title_en||
      payload.price_coins<0||
      payload.price_gems<0||
      payload.price_coins+payload.price_gems<1
    )){
      message("أدخل الاسم بالعربية والإنجليزية وسعرًا صحيحًا.",true);
      return;
    }

    if(catalog==="gift"&&!imageFile&&!payload.image_path){
      message("اختَر صورة للهدية من جهازك قبل الحفظ.",true);
      return;
    }

    busy=true;
    $("saveItem").disabled=true;
    message(imageFile?"جارٍ رفع الصورة ثم حفظ العنصر...":"جارٍ حفظ العنصر...");

    try{
      if(imageFile)payload.image_path=await uploadImage(imageFile,catalog==="gift"?"gifts":"store");
      await rpc("save",payload);
      if(destroyed)return;

      $("editorPanel").hidden=true;
      editingId=null;
      message("تم حفظ العنصر بنجاح.");
      await load();
    }catch(error){
      message(error.message||"تعذر حفظ العنصر.",true);
    }finally{
      busy=false;
      if(!destroyed)$("saveItem").disabled=false;
    }
  });

  $("catalogList").addEventListener("click",async event=>{
    const button=event.target.closest("button[data-action]");
    if(!button||busy)return;

    const card=button.closest(".item");
    const item=items.find(row=>row.id===card?.dataset.id);
    if(!item)return;

    if(button.dataset.action==="edit"){
      showEditor(item);
      return;
    }

    const next=!item.is_active;

    if(!confirm(next
      ?"إظهار هذا العنصر للأعضاء؟"
      :"إخفاء هذا العنصر عن الأعضاء؟"
    ))return;

    busy=true;
    button.disabled=true;
    message("جارٍ تحديث حالة العنصر...");

    try{
      await rpc("toggle",{id:item.id,is_active:next});
      await load();
      message(next?"تم إظهار العنصر.":"تم إخفاء العنصر.");
    }catch(error){
      message(error.message||"تعذر تغيير حالة العنصر.",true);
    }finally{
      busy=false;
      button.disabled=false;
    }
  });

  $("newItem").textContent="إضافة هدية";
  await load();

  return {
    destroy(){
      destroyed=true;
      root.innerHTML="";
    }
  };
}
