/* Streesakhi admin panel: the owner runs the whole store from here.
   Products, photos, stock, orders, categories, homepage, coupons, policy pages, settings. */
(function () {
  const { LIVE, sb, db, esc, money, img, placeholder, toast } = SS;
  const app = document.getElementById("app");
  const STATUSES = ["New", "Packed", "Shipped", "Delivered", "Cancelled"];
  const LOW = 3;
  let D = {}; // loaded data

  /* ---------------- login ---------------- */
  async function start() {
    if (!LIVE) return boot(true);
    sb.auth.onAuthStateChange((ev) => { if (ev === "PASSWORD_RECOVERY") showNewPassword(); });
    const { data } = await sb.auth.getSession();
    if (data.session && await isAdmin()) boot(false); else showLogin();
  }
  async function isAdmin() {
    const { data, error } = await sb.rpc("is_admin");
    return !error && data === true;
  }
  function showLogin(msg) {
    app.innerHTML = `<form class="login panel" id="login" novalidate>
      <img src="/assets/img/logo.webp" alt="Streesakhi">
      <h1 style="color:var(--maroon);font-size:1.4rem">Admin login</h1>
      ${msg ? `<div class="notice bad">${esc(msg)}</div>` : ""}
      <div class="field" style="text-align:left"><label for="em">Email</label><input id="em" type="email" autocomplete="username" required></div>
      <div class="field" style="text-align:left"><label for="pw">Password</label><input id="pw" type="password" autocomplete="current-password" required></div>
      <button class="btn block" type="submit">Log in</button>
      <button class="btn ghost block small" type="button" id="forgot" style="margin-top:10px">Forgot password?</button>
      <div id="lmsg" aria-live="polite"></div>
    </form>`;
    const f = document.getElementById("login"), out = document.getElementById("lmsg");
    f.onsubmit = async e => {
      e.preventDefault();
      const email = f.em.value.trim(), password = f.pw.value;
      if (!email || !password) { out.innerHTML = '<div class="notice bad">Enter your email and password.</div>'; return; }
      out.innerHTML = '<div class="spinner"></div>';
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) { out.innerHTML = `<div class="notice bad">Wrong email or password.</div>`; return; }
      if (!(await isAdmin())) { await sb.auth.signOut(); out.innerHTML = '<div class="notice bad">This account is not an admin of the store.</div>'; return; }
      boot(false);
    };
    document.getElementById("forgot").onclick = async () => {
      const email = f.em.value.trim();
      if (!email) { out.innerHTML = '<div class="notice bad">Type your email above first.</div>'; return; }
      await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/admin/" });
      out.innerHTML = '<div class="notice ok">If this email is an admin, a reset link has been sent. Check your inbox.</div>';
    };
  }
  function showNewPassword() {
    app.innerHTML = `<form class="login panel" id="np"><img src="/assets/img/logo.webp" alt=""><h1 style="color:var(--maroon);font-size:1.3rem">Set a new password</h1>
      <div class="field" style="text-align:left"><label for="np1">New password (8+ characters)</label><input id="np1" type="password" autocomplete="new-password"></div>
      <button class="btn block">Save password</button><div id="npm"></div></form>`;
    const f = document.getElementById("np");
    f.onsubmit = async e => {
      e.preventDefault();
      if (f.np1.value.length < 8) { document.getElementById("npm").innerHTML = '<div class="notice bad">Use at least 8 characters.</div>'; return; }
      const { error } = await sb.auth.updateUser({ password: f.np1.value });
      if (error) { document.getElementById("npm").innerHTML = `<div class="notice bad">${esc(error.message)}</div>`; return; }
      location.hash = ""; start();
    };
  }

  /* ---------------- shell ---------------- */
  const VIEWS = [
    ["dashboard", "Dashboard"], ["orders", "Orders"], ["products", "Products"], ["stock", "Stock"],
    ["categories", "Categories"], ["homepage", "Homepage"], ["coupons", "Coupons"], ["pages", "Policy pages"], ["settings", "Store settings"]
  ];
  async function boot(demo) {
    app.innerHTML = `
      <div class="a-top"><img src="/assets/img/logo.webp" alt=""><strong>STREESAKHI ADMIN</strong><span class="sp"></span>
        <a href="/" target="_blank" rel="noopener">View store</a>${demo ? "" : '<button type="button" id="logout">Log out</button>'}</div>
      ${demo ? '<div class="notice info" style="margin:0;border-radius:0;text-align:center">Demo mode: changes are saved only in this browser. Connect Supabase (see README) to go live.</div>' : ""}
      <div class="a-shell"><nav class="a-nav" id="nav">${VIEWS.map(([k, l]) => `<a href="#${k}" data-v="${k}">${l}${k === "orders" ? '<span class="n" id="n-new" hidden></span>' : ""}</a>`).join("")}</nav>
      <section class="a-main" id="view"><div class="spinner"></div></section></div>`;
    const lo = document.getElementById("logout");
    if (lo) lo.onclick = async () => { await sb.auth.signOut(); location.hash = ""; showLogin(); };
    await loadAll();
    window.addEventListener("hashchange", route);
    route();
  }
  async function loadAll() {
    const [settings, products, categories, orders, coupons, banners, pages] = await Promise.all([
      db.getSettings(), db.list("products", { order: "created_at", asc: false }), db.list("categories", { order: "sort" }),
      db.list("orders", { select: "*, order_items(*)", order: "created_at", asc: false }), db.list("coupons"),
      db.list("banners", { order: "sort" }), db.list("pages")
    ]);
    orders.forEach(o => { o.items = o.items || o.order_items || []; });
    categories.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    D = { settings, products, categories, orders, coupons, banners, pages };
    const n = orders.filter(o => o.order_status === "New").length, el = document.getElementById("n-new");
    if (el) { el.hidden = !n; el.textContent = n; }
  }
  function route() {
    const v = (location.hash.slice(1) || "dashboard");
    const view = VIEWS.find(x => x[0] === v) ? v : "dashboard";
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("on", a.dataset.v === view));
    closeDrawer();
    ({ dashboard, orders, products, stock, categories, homepage, coupons, pages, settings })[view]();
    window.scrollTo(0, 0);
  }
  const V = () => document.getElementById("view");
  const catName = slug => (D.categories.find(c => c.slug === slug) || {}).name || slug || "-";
  const fmtDate = d => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const pill = s => `<span class="status-pill ${esc(s)}">${esc(s)}</span>`;
  const payChip = o => o.payment_status === "Paid" ? '<span class="chip ok">Paid</span>' : o.payment_method === "ONLINE" ? '<span class="chip bad">Unpaid</span>' : '<span class="chip warn">COD</span>';
  async function guard(fn, okMsg) {
    try { await fn(); if (okMsg) toast(okMsg); return true; }
    catch (e) { console.error(e); toast("Could not save: " + (e.message || "please try again")); return false; }
  }

  /* ---------------- drawer ---------------- */
  const drawer = document.getElementById("drawer"), bg = document.getElementById("drawer-bg");
  function openDrawer(title, body, foot) {
    document.getElementById("drawer-title").textContent = title;
    document.getElementById("drawer-body").innerHTML = body;
    document.getElementById("drawer-foot").innerHTML = foot;
    drawer.classList.add("open"); bg.classList.add("open");
    setTimeout(() => { const f = drawer.querySelector("input,select,textarea"); if (f) f.focus(); }, 260);
  }
  function closeDrawer() { drawer.classList.remove("open"); bg.classList.remove("open"); }
  document.getElementById("drawer-x").onclick = closeDrawer;
  bg.onclick = closeDrawer;
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });
  const val = id => (document.getElementById(id) || {}).value;

  /* ---------------- dashboard ---------------- */
  function dashboard() {
    const now = new Date(), today = now.toDateString();
    const live = D.orders.filter(o => o.order_status !== "Cancelled");
    const todays = live.filter(o => new Date(o.created_at).toDateString() === today);
    const month = live.filter(o => { const d = new Date(o.created_at); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const pending = D.orders.filter(o => o.order_status === "New" || o.order_status === "Packed");
    const low = D.products.filter(p => p.is_active !== false && p.stock <= LOW).sort((a, b) => a.stock - b.stock);
    V().innerHTML = `
      <div class="a-head"><div><h1>Namaste!</h1><p class="muted" style="margin:0">Here is how Streesakhi is doing today.</p></div>
        <button class="btn small" onclick="location.hash='products';setTimeout(()=>document.getElementById('add-p').click(),50)">+ Add product</button></div>
      <div class="tiles">
        <div class="tile"><span>Today's orders</span><strong>${todays.length}</strong></div>
        <div class="tile ${pending.length ? "warn" : ""}"><span>To pack and ship</span><strong>${pending.length}</strong></div>
        <div class="tile"><span>Sales this month</span><strong>${money(month.reduce((s, o) => s + Number(o.total || 0), 0))}</strong></div>
        <div class="tile ${low.length ? "warn" : ""}"><span>Low or out of stock</span><strong>${low.length}</strong></div>
      </div>
      <div class="two-col" style="padding:0;grid-template-columns:1.4fr 1fr">
        <div><h2 style="font-size:1.1rem;color:var(--maroon)">Orders to handle</h2>${orderTable(pending.slice(0, 8), true)}</div>
        <div><h2 style="font-size:1.1rem;color:var(--maroon)">Low stock</h2>
          ${low.length ? `<table class="a-table">${low.slice(0, 10).map(p => `<tr class="click" data-p="${esc(p.id)}"><td>${esc(p.name)}</td><td class="num">${p.stock <= 0 ? '<span class="chip bad">Sold out</span>' : `<span class="chip warn">${p.stock} left</span>`}</td></tr>`).join("")}</table>`
            : '<p class="muted">All products are well stocked.</p>'}
        </div>
      </div>`;
    bindOrderRows(); V().querySelectorAll("[data-p]").forEach(r => r.onclick = () => editProduct(r.dataset.p));
  }

  /* ---------------- orders ---------------- */
  let oFilter = { q: "", status: "" };
  function orderTable(list, compact) {
    if (!list.length) return '<p class="muted">No orders here.</p>';
    return `<div class="scroll-x"><table class="a-table"><thead><tr><th>Order</th><th>Customer</th>${compact ? "" : '<th class="hide-sm">Date</th>'}<th class="num">Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>
      ${list.map(o => `<tr class="click" data-o="${esc(o.id)}"><td><strong>${esc(o.id)}</strong></td><td>${esc(o.name)}<div class="muted" style="font-size:.8rem">${esc(o.city || "")}</div></td>${compact ? "" : `<td class="hide-sm">${fmtDate(o.created_at)}</td>`}<td class="num">${money(o.total)}</td><td>${payChip(o)}</td><td>${pill(o.order_status)}</td></tr>`).join("")}
    </tbody></table></div>`;
  }
  function bindOrderRows() { V().querySelectorAll("[data-o]").forEach(r => r.onclick = () => viewOrder(r.dataset.o)); }
  function orders() {
    V().innerHTML = `<div class="a-head"><h1>Orders</h1><button class="btn ghost small" id="reload">Refresh</button></div>
      <div class="a-bar"><input id="oq" placeholder="Search order ID, name or phone" value="${esc(oFilter.q)}">
      <select id="os"><option value="">All statuses</option>${STATUSES.map(s => `<option ${oFilter.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div id="olist"></div>`;
    const draw = () => {
      const q = oFilter.q.toLowerCase();
      const list = D.orders.filter(o => (!oFilter.status || o.order_status === oFilter.status) && (!q || [o.id, o.name, o.phone].join(" ").toLowerCase().includes(q)));
      document.getElementById("olist").innerHTML = orderTable(list); bindOrderRows();
    };
    document.getElementById("oq").oninput = e => { oFilter.q = e.target.value; draw(); };
    document.getElementById("os").onchange = e => { oFilter.status = e.target.value; draw(); };
    document.getElementById("reload").onclick = async () => { await loadAll(); orders(); toast("Orders refreshed"); };
    draw();
  }
  function viewOrder(id) {
    const o = D.orders.find(x => x.id === id); if (!o) return;
    const wa = SS.waLink("91" + o.phone, `Namaste ${o.name}, this is Streesakhi about your order ${o.id} (${money(o.total)}).`);
    openDrawer("Order " + o.id, `
      <p>${pill(o.order_status)} ${payChip(o)} <span class="muted" style="font-size:.85rem">· ${fmtDate(o.created_at)}</span></p>
      <div class="panel" style="padding:14px;margin-bottom:12px">
        <strong>${esc(o.name)}</strong><br>${esc(o.address)}<br>${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}<br>
        Phone: <a href="tel:+91${esc(o.phone)}">${esc(o.phone)}</a>${o.email ? `<br>${esc(o.email)}` : ""}
        <div style="margin-top:10px"><a class="btn wa small" target="_blank" rel="noopener" href="${wa}">WhatsApp customer</a></div>
      </div>
      <div class="panel items-list" style="padding:14px;margin-bottom:12px">
        ${o.items.map(i => `<div class="sum-row"><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join("")}
        <div class="sum-row"><span>Subtotal</span><span>${money(o.subtotal)}</span></div>
        ${o.discount ? `<div class="sum-row"><span>Coupon ${esc(o.coupon || "")}</span><span>−${money(o.discount)}</span></div>` : ""}
        <div class="sum-row"><span>Shipping</span><span>${o.shipping ? money(o.shipping) : "Free"}</span></div>
        <div class="sum-row total"><span>Total</span><span>${money(o.total)}</span></div>
        <p class="muted" style="font-size:.85rem;margin:6px 0 0">${o.payment_method === "ONLINE" ? `Online payment ${o.razorpay_payment_id ? "· " + esc(o.razorpay_payment_id) : "(not completed)"}` : "Cash on Delivery: collect " + money(o.total)}</p>
      </div>
      <div class="field"><label for="o-status">Order status</label><select id="o-status">${STATUSES.map(s => `<option ${o.order_status === s ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div class="row2"><div class="field"><label for="o-courier">Courier</label><input id="o-courier" value="${esc(o.courier || "")}" placeholder="e.g. Delhivery"></div>
      <div class="field"><label for="o-track">Tracking ID</label><input id="o-track" value="${esc(o.tracking_id || "")}"></div></div>
      <div class="field"><label for="o-turl">Tracking link (optional)</label><input id="o-turl" value="${esc(o.tracking_url || "")}" placeholder="https://"></div>
      ${o.payment_method !== "ONLINE" ? `<label class="check"><input type="checkbox" id="o-paid" ${o.payment_status === "Paid" ? "checked" : ""}> COD money received</label>` : ""}
      <div class="field"><label for="o-notes">Private notes</label><textarea id="o-notes" rows="2">${esc(o.notes || "")}</textarea></div>
      <p class="help">Cancelling an order adds its items back to stock.</p>`,
      `<button class="btn" id="o-save">Save changes</button><button class="btn ghost" id="o-slip">Print packing slip</button><button class="btn ghost" id="o-inv">Print invoice</button>`);
    document.getElementById("o-save").onclick = async () => {
      const status = val("o-status");
      const patch = { order_status: status, courier: val("o-courier").trim(), tracking_id: val("o-track").trim(), tracking_url: val("o-turl").trim(), notes: val("o-notes") };
      const paidBox = document.getElementById("o-paid");
      if (paidBox) patch.payment_status = paidBox.checked ? "Paid" : "COD";
      const wasCancelled = o.order_status === "Cancelled", nowCancelled = status === "Cancelled";
      const ok = await guard(async () => {
        await db.update("orders", o.id, patch);
        if (wasCancelled !== nowCancelled) {
          const sign = nowCancelled ? 1 : -1; // cancel = put stock back; un-cancel = take it again
          for (const i of o.items) {
            const p = D.products.find(x => x.id === i.product_id);
            if (p) { p.stock = Math.max(0, Number(p.stock) + sign * i.qty); await db.update("products", p.id, { stock: p.stock }); }
          }
        }
        Object.assign(o, patch);
      }, "Order updated");
      if (ok) { closeDrawer(); route(); }
    };
    document.getElementById("o-slip").onclick = () => printDoc(o, false);
    document.getElementById("o-inv").onclick = () => printDoc(o, true);
  }
  function printDoc(o, invoice) {
    const s = D.settings;
    document.getElementById("print-area").innerHTML = `<div class="slip">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div><h1>${invoice ? "Invoice" : "Packing slip"}</h1><div>Order ${esc(o.id)} · ${new Date(o.created_at).toLocaleDateString("en-IN")}</div></div>
        <div style="text-align:right"><strong>Streesakhi</strong><br>${esc(s.address || "")}<br>${esc(s.phone || "")}<br>${esc(s.email || "")}</div>
      </div>
      <h3 style="margin-top:18px">Ship to</h3>
      <div><strong>${esc(o.name)}</strong><br>${esc(o.address)}<br>${esc(o.city)}, ${esc(o.state)} ${esc(o.pincode)}<br>Phone: ${esc(o.phone)}</div>
      <table><thead><tr><th>Item</th><th>Qty</th>${invoice ? "<th>Price</th><th>Amount</th>" : "<th>Packed</th>"}</tr></thead><tbody>
      ${o.items.map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td>${invoice ? `<td>${money(i.price)}</td><td>${money(i.price * i.qty)}</td>` : "<td>☐</td>"}</tr>`).join("")}
      </tbody></table>
      ${invoice ? `<table style="width:auto;margin-left:auto"><tr><td>Subtotal</td><td>${money(o.subtotal)}</td></tr>${o.discount ? `<tr><td>Discount</td><td>−${money(o.discount)}</td></tr>` : ""}<tr><td>Shipping</td><td>${money(o.shipping)}</td></tr><tr><th>Total</th><th>${money(o.total)}</th></tr></table>
        <p>Payment: ${o.payment_method === "ONLINE" ? "Paid online" : "Cash on Delivery"}. Prices inclusive of applicable taxes. Imitation jewellery.</p>`
        : `<p style="margin-top:16px;font-size:18px"><strong>${o.payment_method === "ONLINE" ? "PREPAID" : "COD: collect " + money(o.total)}</strong></p>`}
      <p style="margin-top:24px">Thank you for shopping with Streesakhi.</p></div>`;
    window.print();
  }

  /* ---------------- products ---------------- */
  let pFilter = { q: "", cat: "" };
  function products() {
    V().innerHTML = `<div class="a-head"><h1>Products</h1><button class="btn small" id="add-p">+ Add product</button></div>
      <div class="a-bar"><input id="pq" placeholder="Search products" value="${esc(pFilter.q)}">
      <select id="pc"><option value="">All categories</option>${D.categories.map(c => `<option value="${esc(c.slug)}" ${pFilter.cat === c.slug ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div id="plist"></div>`;
    const draw = () => {
      const q = pFilter.q.toLowerCase();
      const list = D.products.filter(p => (!pFilter.cat || p.category === pFilter.cat) && (!q || p.name.toLowerCase().includes(q)));
      document.getElementById("plist").innerHTML = list.length ? `<div class="scroll-x"><table class="a-table"><thead><tr><th></th><th>Product</th><th class="hide-sm">Category</th><th class="num">Price</th><th class="num">Stock</th><th>Status</th></tr></thead><tbody>
        ${list.map(p => `<tr class="click" data-p="${esc(p.id)}"><td><img src="${esc(img(p))}" alt=""></td><td>${esc(p.name)}${p.is_featured ? ' <span class="chip warn">Bestseller</span>' : ""}</td><td class="hide-sm">${esc(catName(p.category))}</td><td class="num">${money(p.price)}</td>
        <td class="num">${p.stock <= 0 ? '<span class="chip bad">0</span>' : p.stock <= LOW ? `<span class="chip warn">${p.stock}</span>` : p.stock}</td><td>${p.is_active === false ? '<span class="chip">Hidden</span>' : '<span class="chip ok">Live</span>'}</td></tr>`).join("")}
        </tbody></table></div>` : '<p class="muted">No products found.</p>';
      document.querySelectorAll("#plist [data-p]").forEach(r => r.onclick = () => editProduct(r.dataset.p));
    };
    document.getElementById("pq").oninput = e => { pFilter.q = e.target.value; draw(); };
    document.getElementById("pc").onchange = e => { pFilter.cat = e.target.value; draw(); };
    document.getElementById("add-p").onclick = () => editProduct(null);
    draw();
  }
  function editProduct(id) {
    const p = id ? { ...D.products.find(x => x.id === id) } : { name: "", category: (D.categories[0] || {}).slug, price: "", mrp: "", stock: 1, material: "", color: "", occasion: "", description: "", images: [], is_active: true, is_featured: false };
    let photos = [...(p.images || [])];
    const opts = k => [...new Set(D.products.map(x => x[k]).filter(Boolean))].map(v => `<option value="${esc(v)}">`).join("");
    openDrawer(id ? "Edit product" : "Add product", `
      <div class="field"><label>Photos (first photo is the main one)</label><div class="photos" id="photos"></div>
        <label class="upload"><input type="file" id="pf" accept="image/*" multiple>+ Add photos from phone or computer</label></div>
      <div class="field"><label for="p-name">Product name</label><input id="p-name" value="${esc(p.name)}" placeholder="e.g. Rani Kundan Choker Necklace"></div>
      <div class="field"><label for="p-cat">Category</label><select id="p-cat">${D.categories.map(c => `<option value="${esc(c.slug)}" ${c.slug === p.category ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="row2"><div class="field"><label for="p-price">Selling price (₹)</label><input id="p-price" inputmode="numeric" value="${esc(p.price)}"></div>
        <div class="field"><label for="p-mrp">MRP (₹, shown crossed out)</label><input id="p-mrp" inputmode="numeric" value="${esc(p.mrp || "")}"></div></div>
      <div class="row2"><div class="field"><label for="p-stock">Stock (pieces available)</label><input id="p-stock" inputmode="numeric" value="${esc(p.stock)}"></div>
        <div class="field"><label for="p-mat">Material</label><input id="p-mat" list="dl-mat" value="${esc(p.material || "")}" placeholder="Kundan, Oxidised…"><datalist id="dl-mat">${opts("material")}</datalist></div></div>
      <div class="row2"><div class="field"><label for="p-color">Colour</label><input id="p-color" list="dl-col" value="${esc(p.color || "")}"><datalist id="dl-col">${opts("color")}</datalist></div>
        <div class="field"><label for="p-occ">Occasion</label><input id="p-occ" list="dl-occ" value="${esc(p.occasion || "")}" placeholder="Bridal, Festive…"><datalist id="dl-occ">${opts("occasion")}</datalist></div></div>
      <div class="field"><label for="p-desc">Description</label><textarea id="p-desc" rows="4">${esc(p.description || "")}</textarea></div>
      <label class="check"><input type="checkbox" id="p-feat" ${p.is_featured ? "checked" : ""}> Show in Bestsellers on the homepage</label>
      <label class="check"><input type="checkbox" id="p-act" ${p.is_active !== false ? "checked" : ""}> Visible in the store</label>
      <div id="p-err"></div>`,
      `<button class="btn" id="p-save">${id ? "Save changes" : "Add product"}</button>${id ? '<button class="btn ghost" id="p-del" style="margin-left:auto;color:var(--bad);border-color:var(--bad)">Delete</button>' : ""}`);

    const drawPhotos = () => {
      document.getElementById("photos").innerHTML = photos.map((u, i) => `<div class="photo">${i === 0 ? '<span class="first">Main</span>' : ""}<img src="${esc(u)}" alt="">
        <div class="ctl"><button type="button" data-l="${i}" aria-label="Move left">◀</button><button type="button" data-r="${i}" aria-label="Remove">✕</button><button type="button" data-m="${i}" aria-label="Move right">▶</button></div></div>`).join("")
        || `<div class="photo"><img src="${esc(placeholder(val("p-cat")))}" alt=""></div>`;
    };
    drawPhotos();
    document.getElementById("photos").onclick = e => {
      const b = e.target.closest("button"); if (!b) return;
      const i = +(b.dataset.l ?? b.dataset.r ?? b.dataset.m);
      if (b.dataset.r != null) photos.splice(i, 1);
      else { const j = b.dataset.l != null ? i - 1 : i + 1; if (j < 0 || j >= photos.length) return; [photos[i], photos[j]] = [photos[j], photos[i]]; }
      drawPhotos();
    };
    document.getElementById("pf").onchange = async e => {
      const files = [...e.target.files]; e.target.value = "";
      for (const f of files) {
        toast("Uploading photo…");
        try { photos.push(await db.uploadImage(f)); drawPhotos(); } catch (err) { toast("Upload failed: " + err.message); }
      }
      toast("Photos added. Remember to save.");
    };
    document.getElementById("p-save").onclick = async () => {
      const err = document.getElementById("p-err");
      const price = parseInt(val("p-price"), 10), mrp = parseInt(val("p-mrp"), 10) || null, stock = parseInt(val("p-stock"), 10);
      const problems = [];
      if (val("p-name").trim().length < 3) problems.push("Enter a product name.");
      if (!(price > 0)) problems.push("Enter a selling price in rupees.");
      if (mrp && mrp < price) problems.push("MRP should be more than the selling price (or leave it empty).");
      if (!(stock >= 0)) problems.push("Enter stock as a number (0 or more).");
      if (problems.length) { err.innerHTML = `<div class="notice bad">${problems.join("<br>")}</div>`; return; }
      const row = { name: val("p-name").trim(), category: val("p-cat"), price, mrp, stock, material: val("p-mat").trim(), color: val("p-color").trim(), occasion: val("p-occ").trim(), description: val("p-desc").trim(), images: photos, is_featured: document.getElementById("p-feat").checked, is_active: document.getElementById("p-act").checked };
      if (id) row.id = id;
      const ok = await guard(async () => {
        const saved = await db.upsert("products", row);
        const i = D.products.findIndex(x => x.id === (saved.id || row.id));
        if (i >= 0) D.products[i] = { ...D.products[i], ...row, ...saved }; else D.products.unshift({ ...row, ...saved, created_at: new Date().toISOString() });
      }, id ? "Product saved" : "Product added to the store");
      if (ok) { closeDrawer(); route(); }
    };
    const del = document.getElementById("p-del");
    if (del) del.onclick = async () => {
      if (!confirm(`Delete "${p.name}"? To keep it but stop selling, untick "Visible in the store" instead.`)) return;
      const ok = await guard(async () => { await db.remove("products", id); D.products = D.products.filter(x => x.id !== id); }, "Product deleted");
      if (ok) { closeDrawer(); route(); }
    };
  }

  /* ---------------- stock ---------------- */
  function stock() {
    const list = D.products.slice().sort((a, b) => a.stock - b.stock);
    V().innerHTML = `<div class="a-head"><div><h1>Stock</h1><p class="muted" style="margin:0">Change the numbers and press Save. Lowest stock is shown first.</p></div><button class="btn small" id="st-save">Save stock</button></div>
      <div class="scroll-x"><table class="a-table"><thead><tr><th></th><th>Product</th><th>Status</th><th class="num">Stock</th></tr></thead><tbody>
      ${list.map(p => `<tr><td><img src="${esc(img(p))}" alt=""></td><td>${esc(p.name)}</td><td>${p.stock <= 0 ? '<span class="chip bad">Sold out</span>' : p.stock <= LOW ? '<span class="chip warn">Low</span>' : '<span class="chip ok">OK</span>'}</td>
      <td class="num"><input type="number" min="0" data-id="${esc(p.id)}" value="${p.stock}" style="width:84px;padding:6px 8px;border:1px solid var(--line);border-radius:6px;text-align:right" aria-label="Stock for ${esc(p.name)}"></td></tr>`).join("")}
      </tbody></table></div>`;
    document.getElementById("st-save").onclick = async () => {
      const changes = [...V().querySelectorAll("input[data-id]")].map(i => ({ p: D.products.find(x => x.id === i.dataset.id), n: Math.max(0, parseInt(i.value, 10) || 0) })).filter(c => c.p && c.p.stock !== c.n);
      if (!changes.length) { toast("No changes to save"); return; }
      const ok = await guard(async () => { for (const c of changes) { await db.update("products", c.p.id, { stock: c.n }); c.p.stock = c.n; } }, `Stock updated for ${changes.length} product${changes.length > 1 ? "s" : ""}`);
      if (ok) stock();
    };
  }

  /* ---------------- categories ---------------- */
  function categories() {
    V().innerHTML = `<div class="a-head"><h1>Categories</h1><button class="btn small" id="add-c">+ Add category</button></div>
      <div class="scroll-x"><table class="a-table"><thead><tr><th></th><th>Name</th><th class="num">Products</th><th class="num">Order</th></tr></thead><tbody>
      ${D.categories.map(c => `<tr class="click" data-c="${esc(c.slug)}"><td><img src="${esc(c.image || placeholder(c.slug))}" alt=""></td><td>${esc(c.name)}</td><td class="num">${D.products.filter(p => p.category === c.slug).length}</td><td class="num">${c.sort || 0}</td></tr>`).join("")}
      </tbody></table></div>`;
    V().querySelectorAll("[data-c]").forEach(r => r.onclick = () => editCategory(r.dataset.c));
    document.getElementById("add-c").onclick = () => editCategory(null);
  }
  function editCategory(slug) {
    const c = slug ? { ...D.categories.find(x => x.slug === slug) } : { name: "", image: "", sort: D.categories.length + 1 };
    let image = c.image || "";
    openDrawer(slug ? "Edit category" : "Add category", `
      <div class="field"><label for="c-name">Name</label><input id="c-name" value="${esc(c.name)}" placeholder="e.g. Maang Tikka"></div>
      <div class="field"><label for="c-sort">Position in menu (1 = first)</label><input id="c-sort" inputmode="numeric" value="${esc(c.sort || 0)}"></div>
      <div class="field"><label>Round image on the homepage</label><div class="photos"><div class="photo"><img id="c-img" src="${esc(image || placeholder(slug))}" alt=""></div></div>
        <label class="upload"><input type="file" id="cf" accept="image/*">Upload image</label></div><div id="c-err"></div>`,
      `<button class="btn" id="c-save">Save</button>${slug ? '<button class="btn ghost" id="c-del" style="margin-left:auto;color:var(--bad);border-color:var(--bad)">Delete</button>' : ""}`);
    document.getElementById("cf").onchange = async e => { const f = e.target.files[0]; if (!f) return; toast("Uploading…"); try { image = await db.uploadImage(f); document.getElementById("c-img").src = image; } catch (err) { toast(err.message); } };
    document.getElementById("c-save").onclick = async () => {
      const name = val("c-name").trim();
      if (name.length < 2) { document.getElementById("c-err").innerHTML = '<div class="notice bad">Enter a category name.</div>'; return; }
      const newSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!slug && D.categories.some(x => x.slug === newSlug)) { document.getElementById("c-err").innerHTML = '<div class="notice bad">A category with this name already exists.</div>'; return; }
      const row = { slug: newSlug, name, image, sort: parseInt(val("c-sort"), 10) || 0 };
      const ok = await guard(async () => { await db.upsert("categories", row); const i = D.categories.findIndex(x => x.slug === newSlug); if (i >= 0) D.categories[i] = row; else D.categories.push(row); D.categories.sort((a, b) => a.sort - b.sort); }, "Category saved");
      if (ok) { closeDrawer(); route(); }
    };
    const del = document.getElementById("c-del");
    if (del) del.onclick = async () => {
      if (D.products.some(p => p.category === slug)) { toast("Move or delete the products in this category first."); return; }
      if (!confirm(`Delete category "${c.name}"?`)) return;
      const ok = await guard(async () => { await db.remove("categories", slug); D.categories = D.categories.filter(x => x.slug !== slug); }, "Category deleted");
      if (ok) { closeDrawer(); route(); }
    };
  }

  /* ---------------- homepage ---------------- */
  function homepage() {
    const s = D.settings;
    V().innerHTML = `<div class="a-head"><h1>Homepage</h1></div>
      <div class="panel" style="margin-bottom:16px">
        <h2>Top banner text</h2>
        <div class="field"><label for="h-ann">Announcement bar (thin strip at the very top)</label><input id="h-ann" value="${esc(s.announcement || "")}"></div>
        <div class="field"><label for="h-eye">Small line above the heading</label><input id="h-eye" value="${esc(s.hero_eyebrow || "")}"></div>
        <div class="field"><label for="h-title">Main heading</label><input id="h-title" value="${esc(s.hero_title || "")}"></div>
        <div class="field"><label for="h-sub">Text under the heading</label><textarea id="h-sub" rows="2">${esc(s.hero_subtitle || "")}</textarea></div>
        <button class="btn small" id="h-save">Save banner text</button>
      </div>
      <div class="a-head"><div><h2 style="color:var(--maroon);margin:0">Promotion banners</h2><p class="muted" style="margin:0">Shown under the categories. Up to 4 active banners.</p></div><button class="btn small" id="add-b">+ Add banner</button></div>
      ${D.banners.length ? `<table class="a-table">${D.banners.map(b => `<tr class="click" data-b="${esc(b.id)}"><td>${b.image ? `<img src="${esc(b.image)}" alt="">` : ""}</td><td><strong>${esc(b.title)}</strong><div class="muted" style="font-size:.85rem">${esc(b.subtitle || "")}</div></td><td>${b.active === false ? '<span class="chip">Off</span>' : '<span class="chip ok">On</span>'}</td></tr>`).join("")}</table>` : '<p class="muted">No promotion banners yet.</p>'}
      <p class="help" style="margin-top:14px">To choose Bestsellers, open a product and tick "Show in Bestsellers". New arrivals show your latest products automatically.</p>`;
    document.getElementById("h-save").onclick = () => saveSettings({ announcement: val("h-ann").trim(), hero_eyebrow: val("h-eye").trim(), hero_title: val("h-title").trim(), hero_subtitle: val("h-sub").trim() });
    V().querySelectorAll("[data-b]").forEach(r => r.onclick = () => editBanner(r.dataset.b));
    document.getElementById("add-b").onclick = () => editBanner(null);
  }
  function editBanner(id) {
    const b = id ? { ...D.banners.find(x => x.id === id) } : { title: "", subtitle: "", link: "shop.html", image: "", sort: D.banners.length + 1, active: true };
    let image = b.image || "";
    const links = [["shop.html", "All jewellery"], ...D.categories.map(c => ["shop.html?category=" + c.slug, c.name]), ["shop.html?occasion=Bridal", "Bridal occasion"], ["shop.html?occasion=Festive", "Festive occasion"]];
    openDrawer(id ? "Edit banner" : "Add banner", `
      <div class="field"><label for="b-title">Heading</label><input id="b-title" value="${esc(b.title)}" placeholder="e.g. Diwali Sale: 20% off"></div>
      <div class="field"><label for="b-sub">Short text</label><input id="b-sub" value="${esc(b.subtitle || "")}"></div>
      <div class="field"><label for="b-link">Opens</label><select id="b-link">${links.map(([v, l]) => `<option value="${esc(v)}" ${b.link === v ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      <div class="field"><label>Background photo (wide photos look best)</label><div class="photos"><div class="photo" style="aspect-ratio:16/9;grid-column:span 2">${image ? `<img id="b-img" src="${esc(image)}" alt="">` : '<img id="b-img" src="/assets/img/intro-poster.jpg" alt="">'}</div></div>
        <label class="upload"><input type="file" id="bf" accept="image/*">Upload photo</label></div>
      <div class="field"><label for="b-sort">Position (1 = first)</label><input id="b-sort" inputmode="numeric" value="${esc(b.sort || 1)}"></div>
      <label class="check"><input type="checkbox" id="b-act" ${b.active !== false ? "checked" : ""}> Show on the homepage</label><div id="b-err"></div>`,
      `<button class="btn" id="b-save">Save</button>${id ? '<button class="btn ghost" id="b-del" style="margin-left:auto;color:var(--bad);border-color:var(--bad)">Delete</button>' : ""}`);
    document.getElementById("bf").onchange = async e => { const f = e.target.files[0]; if (!f) return; toast("Uploading…"); try { image = await db.uploadImage(f); document.getElementById("b-img").src = image; } catch (err) { toast(err.message); } };
    document.getElementById("b-save").onclick = async () => {
      if (!val("b-title").trim()) { document.getElementById("b-err").innerHTML = '<div class="notice bad">Enter a heading.</div>'; return; }
      const row = { title: val("b-title").trim(), subtitle: val("b-sub").trim(), link: val("b-link"), image, sort: parseInt(val("b-sort"), 10) || 1, active: document.getElementById("b-act").checked };
      if (id) row.id = id;
      const ok = await guard(async () => { const saved = await db.upsert("banners", row); D.banners = D.banners.filter(x => x.id !== (saved.id || row.id)); D.banners.push({ ...row, ...saved }); D.banners.sort((a, b) => a.sort - b.sort); }, "Banner saved");
      if (ok) { closeDrawer(); route(); }
    };
    const del = document.getElementById("b-del");
    if (del) del.onclick = async () => { if (!confirm("Delete this banner?")) return; if (await guard(async () => { await db.remove("banners", id); D.banners = D.banners.filter(x => x.id !== id); }, "Banner deleted")) { closeDrawer(); route(); } };
  }

  /* ---------------- coupons ---------------- */
  function coupons() {
    V().innerHTML = `<div class="a-head"><h1>Coupons</h1><button class="btn small" id="add-k">+ Add coupon</button></div>
      ${D.coupons.length ? `<div class="scroll-x"><table class="a-table"><thead><tr><th>Code</th><th class="num">Discount</th><th class="num">Min. order</th><th>Expires</th><th>Status</th></tr></thead><tbody>
      ${D.coupons.map(k => { const expired = k.expiry && new Date(k.expiry + "T23:59:59") < new Date(); return `<tr class="click" data-k="${esc(k.code)}"><td><strong>${esc(k.code)}</strong></td><td class="num">${k.discount_percent}%</td><td class="num">${money(k.min_order || 0)}</td><td>${esc(k.expiry || "Never")}</td><td>${expired ? '<span class="chip bad">Expired</span>' : k.active === false ? '<span class="chip">Paused</span>' : '<span class="chip ok">Active</span>'}</td></tr>`; }).join("")}
      </tbody></table></div>` : '<p class="muted">No coupons yet.</p>'}`;
    V().querySelectorAll("[data-k]").forEach(r => r.onclick = () => editCoupon(r.dataset.k));
    document.getElementById("add-k").onclick = () => editCoupon(null);
  }
  function editCoupon(code) {
    const k = code ? { ...D.coupons.find(x => x.code === code) } : { code: "", discount_percent: 10, min_order: 0, expiry: "", active: true };
    openDrawer(code ? "Edit coupon" : "Add coupon", `
      <div class="field"><label for="k-code">Code customers type</label><input id="k-code" value="${esc(k.code)}" ${code ? "readonly" : ""} style="text-transform:uppercase" placeholder="e.g. DIWALI20"></div>
      <div class="row2"><div class="field"><label for="k-pct">Discount (%)</label><input id="k-pct" inputmode="numeric" value="${esc(k.discount_percent)}"></div>
      <div class="field"><label for="k-min">Minimum order (₹)</label><input id="k-min" inputmode="numeric" value="${esc(k.min_order || 0)}"></div></div>
      <div class="field"><label for="k-exp">Last valid date (leave empty for no end)</label><input id="k-exp" type="date" value="${esc(k.expiry || "")}"></div>
      <label class="check"><input type="checkbox" id="k-act" ${k.active !== false ? "checked" : ""}> Active</label><div id="k-err"></div>`,
      `<button class="btn" id="k-save">Save</button>${code ? '<button class="btn ghost" id="k-del" style="margin-left:auto;color:var(--bad);border-color:var(--bad)">Delete</button>' : ""}`);
    document.getElementById("k-save").onclick = async () => {
      const c = val("k-code").trim().toUpperCase().replace(/\s+/g, ""), pct = parseInt(val("k-pct"), 10);
      const err = document.getElementById("k-err");
      if (!/^[A-Z0-9]{3,20}$/.test(c)) { err.innerHTML = '<div class="notice bad">Use 3 to 20 letters or numbers for the code.</div>'; return; }
      if (!(pct >= 1 && pct <= 90)) { err.innerHTML = '<div class="notice bad">Discount must be between 1 and 90 percent.</div>'; return; }
      if (!code && D.coupons.some(x => x.code === c)) { err.innerHTML = '<div class="notice bad">This code already exists.</div>'; return; }
      const row = { code: c, discount_percent: pct, min_order: parseInt(val("k-min"), 10) || 0, expiry: val("k-exp") || null, active: document.getElementById("k-act").checked };
      if (await guard(async () => { await db.upsert("coupons", row); D.coupons = D.coupons.filter(x => x.code !== c); D.coupons.push(row); }, "Coupon saved")) { closeDrawer(); route(); }
    };
    const del = document.getElementById("k-del");
    if (del) del.onclick = async () => { if (!confirm("Delete coupon " + code + "?")) return; if (await guard(async () => { await db.remove("coupons", code); D.coupons = D.coupons.filter(x => x.code !== code); }, "Coupon deleted")) { closeDrawer(); route(); } };
  }

  /* ---------------- policy pages ---------------- */
  function pages() {
    const all = SS.DEFAULT_PAGES.map(dp => D.pages.find(p => p.slug === dp.slug) || dp);
    V().innerHTML = `<div class="a-head"><div><h1>Policy pages</h1><p class="muted" style="margin:0">Leave an empty line between paragraphs.</p></div></div>
      <table class="a-table">${all.map(p => `<tr class="click" data-g="${esc(p.slug)}"><td><strong>${esc(p.title)}</strong></td><td class="muted hide-sm">${esc(String(p.content).slice(0, 80))}…</td><td><a href="/page.html?p=${esc(p.slug)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="text-decoration:underline">View</a></td></tr>`).join("")}</table>`;
    V().querySelectorAll("[data-g]").forEach(r => r.onclick = () => {
      const p = all.find(x => x.slug === r.dataset.g);
      openDrawer("Edit page", `<div class="field"><label for="g-title">Page title</label><input id="g-title" value="${esc(p.title)}"></div>
        <div class="field"><label for="g-body">Page text</label><textarea id="g-body" class="big">${esc(p.content)}</textarea></div>`, '<button class="btn" id="g-save">Save page</button>');
      document.getElementById("g-save").onclick = async () => {
        const row = { slug: p.slug, title: val("g-title").trim() || p.title, content: val("g-body") };
        if (await guard(async () => { await db.upsert("pages", row); D.pages = D.pages.filter(x => x.slug !== p.slug); D.pages.push(row); }, "Page saved")) { closeDrawer(); route(); }
      };
    });
  }

  /* ---------------- settings ---------------- */
  async function saveSettings(patch) {
    const next = { ...D.settings, ...patch };
    if (await guard(() => db.saveSettings(next), "Settings saved")) D.settings = next;
  }
  function settings() {
    const s = D.settings;
    const f = (id, label, v, extra = "") => `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${esc(v == null ? "" : v)}" ${extra}></div>`;
    V().innerHTML = `<div class="a-head"><h1>Store settings</h1><button class="btn small" id="s-save">Save settings</button></div>
      <div class="two-col" style="padding:0;grid-template-columns:1fr 1fr">
        <div class="panel"><h2>Shipping and payment</h2>
          <div class="row2">${f("s-ship", "Shipping charge (₹)", s.shipping_fee, 'inputmode="numeric"')}${f("s-free", "Free shipping above (₹)", s.free_shipping_above, 'inputmode="numeric"')}</div>
          <label class="check"><input type="checkbox" id="s-cod" ${s.cod_enabled !== false ? "checked" : ""}> Offer Cash on Delivery</label>
          ${f("s-codmax", "Maximum order value for COD (₹, 0 = no limit)", s.cod_max, 'inputmode="numeric"')}
          ${f("s-ret", "Return / damage support days", s.return_days, 'inputmode="numeric"')}
          <p class="help">Online payments (UPI, cards) turn on once the developer adds the Razorpay keys.</p></div>
        <div class="panel"><h2>Contact details</h2>
          ${f("s-wa", "WhatsApp number with country code (e.g. 919876543210)", s.whatsapp, 'inputmode="numeric"')}
          ${f("s-phone", "Phone shown on the website", s.phone)}
          ${f("s-email", "Store email (new order emails go here)", s.email, 'type="email"')}
          <div class="field"><label for="s-addr">Business address</label><textarea id="s-addr" rows="2">${esc(s.address || "")}</textarea></div>
          ${f("s-ig", "Instagram link", s.instagram)}
          ${f("s-tag", "Tagline under the logo", s.tagline)}</div>
      </div>
      ${LIVE ? `<div class="panel" style="margin-top:16px"><h2>Your password</h2><div class="field"><label for="s-pw">New password (8+ characters)</label><input id="s-pw" type="password" autocomplete="new-password"></div><button class="btn ghost small" id="s-pwb">Change password</button></div>` : ""}`;
    document.getElementById("s-save").onclick = () => {
      const wa = val("s-wa").replace(/\D/g, "");
      if (wa && wa.length < 11) { toast("Add the country code to the WhatsApp number, e.g. 91 before the 10 digits."); return; }
      saveSettings({
        shipping_fee: parseInt(val("s-ship"), 10) || 0, free_shipping_above: parseInt(val("s-free"), 10) || 0, cod_enabled: document.getElementById("s-cod").checked,
        cod_max: parseInt(val("s-codmax"), 10) || 0, return_days: parseInt(val("s-ret"), 10) || 7, whatsapp: wa, phone: val("s-phone").trim(), email: val("s-email").trim(),
        address: val("s-addr").trim(), instagram: val("s-ig").trim(), tagline: val("s-tag").trim()
      });
    };
    const pwb = document.getElementById("s-pwb");
    if (pwb) pwb.onclick = async () => {
      const pw = val("s-pw"); if (pw.length < 8) { toast("Use at least 8 characters."); return; }
      const { error } = await sb.auth.updateUser({ password: pw }); toast(error ? error.message : "Password changed");
    };
  }

  start().catch(e => { console.error(e); app.innerHTML = `<div class="login"><div class="notice bad">Could not load the admin panel: ${esc(e.message)}</div></div>`; });
})();
