/* Streesakhi — shared data layer, cart, wishlist and helpers.
   Works in two modes:
   - LIVE: Supabase configured in js/config.js -> real database
   - DEMO: no config -> sample data saved in this browser (localStorage) */
(function () {
  const CFG = window.STREESAKHI_CONFIG || {};
  const DEMO = window.STREESAKHI_DEMO;
  const LIVE = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY);
  let sb = null;
  if (LIVE && window.supabase) sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);

  /* ---------- safe storage ---------- */
  const ls = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };

  /* ---------- default policy pages ---------- */
  const DEFAULT_PAGES = [
    { slug: "about", title: "About Streesakhi", content: "Streesakhi (Sejal Prathistha) brings you handpicked imitation jewellery inspired by India's royal heritage: kundan, temple, oxidised, meenakari and pearl designs at prices every woman can enjoy.\n\nEvery piece is checked by hand before it is packed, and shipped across India with Cash on Delivery available." },
    { slug: "contact", title: "Contact us", content: "We are happy to help with orders, sizes and styling.\n\nWhatsApp and phone: see below.\nEmail: see below.\nHours: Monday to Saturday, 10 am to 7 pm." },
    { slug: "shipping", title: "Shipping policy", content: "Orders are packed within 1 to 2 working days and delivered in 3 to 7 working days across India.\n\nShipping is free on orders above the free-shipping amount shown at checkout; a flat shipping charge applies below it.\n\nYou will receive a tracking ID once your order is shipped. Cash on Delivery orders may be confirmed on WhatsApp before dispatch." },
    { slug: "refund", title: "Return and refund policy", content: "If your product arrives damaged or different from what you ordered, contact us within 7 days of delivery with an unboxing video and photos.\n\nFor hygiene reasons, earrings are not returnable unless damaged.\n\nApproved refunds for online payments are made to the original payment method within 7 working days. For COD orders, refunds are made by UPI or bank transfer." },
    { slug: "privacy", title: "Privacy policy", content: "We collect only the details needed to deliver your order: name, phone, email and address.\n\nWe never store your card or UPI details; online payments are processed securely by Razorpay.\n\nWe do not sell or share your personal details with anyone except our courier partner for delivery." },
    { slug: "terms", title: "Terms and conditions", content: "All products are imitation (fashion) jewellery and not real gold, silver or precious stones.\n\nColours may vary slightly because of lighting and screen settings.\n\nPrices are in Indian rupees. We may cancel an order if a product is out of stock, and any payment made will be refunded in full." }
  ];
  const DEFAULT_BANNERS = [
    { id: "b1", title: "Festive Collection", subtitle: "Kundan and temple jewellery for the wedding season", link: "shop.html?occasion=Festive", image: "", sort: 1, active: true }
  ];

  /* ---------- demo database (localStorage) ---------- */
  const DB_KEY = "ss_demo_db_v1";
  function demoDb() {
    let db = ls.get(DB_KEY, null);
    if (!db) {
      db = {
        settings: DEMO.settings,
        categories: DEMO.categories,
        products: DEMO.products.map((p, i) => ({ images: [], is_active: true, is_featured: false, sort: i, created_at: new Date(Date.now() - i * 864e5).toISOString(), ...p })),
        coupons: DEMO.coupons,
        banners: DEFAULT_BANNERS,
        pages: DEFAULT_PAGES,
        orders: []
      };
      ls.set(DB_KEY, db);
    }
    return db;
  }
  function saveDemo(db) {
    if (!ls.set(DB_KEY, db)) throw new Error("This browser's storage is full. In demo mode, use smaller photos.");
  }
  const keyOf = t => (t === "categories" ? "slug" : t === "coupons" ? "code" : t === "pages" ? "slug" : "id");

  /* ---------- generic table access (used by store + admin) ---------- */
  const db = {
    async list(table, opts = {}) {
      if (!LIVE) {
        let rows = demoDb()[table] || [];
        return JSON.parse(JSON.stringify(rows));
      }
      let q = sb.from(table).select(opts.select || "*");
      if (opts.order) q = q.order(opts.order, { ascending: opts.asc !== false });
      if (opts.eq) for (const [k, v] of Object.entries(opts.eq)) q = q.eq(k, v);
      if (opts.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    async upsert(table, row) {
      if (!LIVE) {
        const d = demoDb(); const k = keyOf(table);
        if (!row[k]) row[k] = (table === "products" ? "p" : table === "banners" ? "b" : "x") + Date.now().toString(36);
        const i = d[table].findIndex(r => r[k] === row[k]);
        if (i >= 0) d[table][i] = { ...d[table][i], ...row }; else d[table].push({ created_at: new Date().toISOString(), ...row });
        saveDemo(d); return row;
      }
      const { data, error } = await sb.from(table).upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    async update(table, keyVal, patch) {
      if (!LIVE) {
        const d = demoDb(); const k = keyOf(table);
        const r = d[table].find(x => x[k] === keyVal); if (r) Object.assign(r, patch); saveDemo(d); return r;
      }
      const { data, error } = await sb.from(table).update(patch).eq(keyOf(table), keyVal).select();
      if (error) throw error;
      return data && data[0];
    },
    async remove(table, keyVal) {
      if (!LIVE) {
        const d = demoDb(); const k = keyOf(table);
        d[table] = d[table].filter(r => r[k] !== keyVal); saveDemo(d); return;
      }
      const { error } = await sb.from(table).delete().eq(keyOf(table), keyVal);
      if (error) throw error;
    },
    async getSettings() {
      if (!LIVE) return demoDb().settings;
      const { data } = await sb.from("settings").select("data").eq("id", 1).maybeSingle();
      return { ...DEMO.settings, ...(data ? data.data : {}) };
    },
    async saveSettings(s) {
      if (!LIVE) { const d = demoDb(); d.settings = s; saveDemo(d); return; }
      const { error } = await sb.from("settings").upsert({ id: 1, data: s });
      if (error) throw error;
    },
    async uploadImage(file) {
      const small = await shrinkImage(file, LIVE ? 1200 : 700, LIVE ? 0.85 : 0.72);
      if (!LIVE) return small.dataUrl;
      const path = "products/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + ".jpg";
      const { error } = await sb.storage.from("product-images").upload(path, small.blob, { contentType: "image/jpeg", upsert: false });
      if (error) throw error;
      return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
    }
  };

  /* Resize photos in the browser before upload: phone photos are often 4-8 MB */
  function shrinkImage(file, max, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(blob => resolve({ blob, dataUrl: c.toDataURL("image/jpeg", quality) }), "image/jpeg", quality);
      };
      img.onerror = () => reject(new Error("Could not read that image. Use a JPG or PNG photo."));
      img.src = url;
    });
  }

  /* ---------- catalogue helpers ---------- */
  let _cache = {};
  async function cached(key, fn) { if (!_cache[key]) _cache[key] = fn(); return _cache[key]; }
  const store = {
    settings: () => cached("settings", () => db.getSettings()),
    categories: () => cached("categories", async () => (await db.list("categories", { order: "sort" })).sort((a, b) => (a.sort || 0) - (b.sort || 0))),
    products: () => cached("products", async () => (await db.list("products", { order: "created_at", asc: false }))
      .filter(p => p.is_active !== false)
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))),
    banners: () => cached("banners", async () => (await db.list("banners", { order: "sort" })).filter(b => b.active !== false).sort((a, b) => (a.sort || 0) - (b.sort || 0))),
    page: async slug => (await db.list("pages")).find(p => p.slug === slug),
    async product(id) { return (await store.products()).find(p => String(p.id) === String(id)); }
  };

  /* ---------- cart & wishlist ---------- */
  const cart = {
    get: () => ls.get("ss_cart", []),
    save(c) { ls.set("ss_cart", c); updateBadges(); },
    add(id, qty = 1) { const c = cart.get(); const l = c.find(x => x.id === id); if (l) l.qty += qty; else c.push({ id, qty }); cart.save(c); },
    set(id, qty) { let c = cart.get(); const l = c.find(x => x.id === id); if (l) l.qty = qty; c = c.filter(x => x.qty > 0); cart.save(c); },
    remove(id) { cart.save(cart.get().filter(x => x.id !== id)); },
    clear() { cart.save([]); },
    count: () => cart.get().reduce((n, l) => n + l.qty, 0),
    async lines() {
      const prods = await store.products();
      return cart.get().map(l => ({ ...l, p: prods.find(p => String(p.id) === String(l.id)) })).filter(l => l.p);
    }
  };
  const wish = {
    get: () => ls.get("ss_wish", []),
    has: id => wish.get().includes(id),
    toggle(id) { let w = wish.get(); w = w.includes(id) ? w.filter(x => x !== id) : [...w, id]; ls.set("ss_wish", w); updateBadges(); return w.includes(id); }
  };

  /* ---------- totals (same rules as the server) ---------- */
  function totals(lines, settings, coupon) {
    const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
    let discount = 0;
    if (coupon && subtotal >= (coupon.min_order || 0)) discount = Math.round(subtotal * coupon.discount_percent / 100);
    const after = subtotal - discount;
    const shipping = lines.length === 0 || after >= Number(settings.free_shipping_above || 0) ? 0 : Number(settings.shipping_fee || 0);
    return { subtotal, discount, shipping, total: after + shipping };
  }
  async function findCoupon(code) {
    code = (code || "").trim().toUpperCase();
    if (!code) return null;
    let list;
    if (LIVE) { const { data } = await sb.rpc("check_coupon", { c: code }); list = data || []; }
    else list = demoDb().coupons.filter(c => c.code === code);
    const c = list[0];
    if (!c || c.active === false) return null;
    if (c.expiry && new Date(c.expiry + "T23:59:59") < new Date()) return null;
    return c;
  }

  /* ---------- orders ---------- */
  async function placeOrder(payload) {
    if (LIVE) {
      const r = await fetch("/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Could not place the order. Please try again.");
      return j;
    }
    // demo: compute and save locally
    const d = demoDb(); const s = d.settings;
    const lines = payload.items.map(i => ({ qty: i.qty, p: d.products.find(p => p.id === i.id) })).filter(l => l.p);
    for (const l of lines) if (l.p.stock < l.qty) throw new Error(`Only ${l.p.stock} left of ${l.p.name}.`);
    const coupon = payload.coupon ? d.coupons.find(c => c.code === payload.coupon.toUpperCase()) : null;
    const t = totals(lines, s, coupon);
    const id = makeOrderId();
    const order = { id, ...payload.customer, items: lines.map(l => ({ product_id: l.p.id, name: l.p.name, price: l.p.price, qty: l.qty })), ...t, coupon: coupon ? coupon.code : null, payment_method: "COD", payment_status: "COD", order_status: "New", created_at: new Date().toISOString() };
    lines.forEach(l => { l.p.stock -= l.qty; });
    d.orders.unshift(order); saveDemo(d);
    return { order_id: id, total: t.total };
  }
  async function trackOrder(id, phone) {
    if (LIVE) {
      const r = await fetch(`/api/track-order?id=${encodeURIComponent(id)}&phone=${encodeURIComponent(phone)}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Order not found.");
      return j;
    }
    const o = demoDb().orders.find(o => o.id.toUpperCase() === id.trim().toUpperCase() && o.phone.slice(-10) === phone.replace(/\D/g, "").slice(-10));
    if (!o) throw new Error("No order found with that order ID and phone number.");
    return o;
  }
  function makeOrderId() {
    const d = new Date();
    return "SS" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  /* ---------- UI helpers ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
  const PH = { necklaces: "necklace", earrings: "earrings", bangles: "bangles", rings: "rings", anklets: "anklets", sets: "sets" };
  const base = location.pathname.includes("/admin/") ? "../" : "";
  const placeholder = cat => base + "assets/img/ph/" + (PH[cat] || "necklace") + ".svg";
  const img = p => (p.images && p.images.length ? p.images[0] : placeholder(p.category));
  const off = p => (p.mrp && p.mrp > p.price ? Math.round((1 - p.price / p.mrp) * 100) : 0);
  const icons = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.2 3.2 4.5 6.9 4.5c2.1 0 3.6 1.1 5.1 3 1.5-1.9 3-3 5.1-3 3.7 0 6 3.7 4.5 7.2C19.5 16.4 12 21 12 21z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.4-.2z"/></svg>'
  };
  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 2400);
  }
  function card(p, catName) {
    const o = off(p), out = p.stock <= 0;
    return `<article class="card">
      ${out ? '<span class="tag out">Sold out</span>' : o >= 30 ? `<span class="tag">${o}% off</span>` : p.is_featured ? '<span class="tag">Bestseller</span>' : ""}
      <button class="wish ${wish.has(p.id) ? "on" : ""}" data-wish="${esc(p.id)}" aria-label="Save ${esc(p.name)} to wishlist">${icons.heart}</button>
      <a class="thumb" href="product.html?id=${encodeURIComponent(p.id)}"><img src="${esc(img(p))}" alt="${esc(p.name)}" loading="lazy"></a>
      <div class="body">
        <span class="cat">${esc(catName || p.category)}</span>
        <a class="name" href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a>
        <div class="price-row"><span class="price">${money(p.price)}</span>${p.mrp > p.price ? `<span class="mrp">${money(p.mrp)}</span><span class="off">${o}% off</span>` : ""}</div>
        <button class="btn small block add" data-add="${esc(p.id)}" ${out ? "disabled" : ""}>${out ? "Sold out" : "Add to cart"}</button>
      </div></article>`;
  }
  // delegated card buttons
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-add]");
    if (a) { cart.add(a.dataset.add, 1); toast("Added to cart"); return; }
    const w = e.target.closest("[data-wish]");
    if (w) { const on = wish.toggle(w.dataset.wish); w.classList.toggle("on", on); toast(on ? "Saved to wishlist" : "Removed from wishlist"); }
  });
  function updateBadges() {
    document.querySelectorAll("[data-badge=cart]").forEach(b => { const n = cart.count(); b.textContent = n || ""; b.dataset.n = n; });
    document.querySelectorAll("[data-badge=wish]").forEach(b => { const n = wish.get().length; b.textContent = n || ""; b.dataset.n = n; });
  }
  const waLink = (num, text) => `https://wa.me/${String(num || "").replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
  const qs = k => new URLSearchParams(location.search).get(k);

  window.SS = { LIVE, CFG, sb, db, store, cart, wish, totals, findCoupon, placeOrder, trackOrder, esc, money, img, off, placeholder, icons, toast, card, updateBadges, waLink, qs, ls, DEFAULT_PAGES };
})();
