(async function () {
  const { store, card, esc, money, off, img, placeholder, cart, wish, toast, waLink, qs, icons } = SS;
  const [s, cats, p] = await Promise.all([store.settings(), store.categories(), store.product(qs("id"))]);
  const box = document.getElementById("pdp");
  if (!p) {
    box.innerHTML = `<div class="empty" style="grid-column:1/-1"><h1>Product not found</h1><p>It may have been removed or sold out.</p><a class="btn" href="shop.html">Back to shop</a></div>`;
    return;
  }
  const cat = cats.find(c => c.slug === p.category) || { name: p.category, slug: p.category };
  document.title = `${p.name} | Streesakhi`;
  document.querySelector('meta[name="description"]').content = (p.description || p.name).slice(0, 155);
  document.getElementById("crumbs").innerHTML = `<a href="index.html">Home</a> / <a href="shop.html?category=${encodeURIComponent(cat.slug)}">${esc(cat.name)}</a> / ${esc(p.name)}`;

  const photos = p.images && p.images.length ? p.images : [placeholder(p.category)];
  const o = off(p), stock = Number(p.stock || 0);
  const stockNote = stock <= 0 ? '<p class="stock-note none">Sold out. Message us on WhatsApp to be told when it is back.</p>'
    : stock <= 3 ? `<p class="stock-note low">Hurry, only ${stock} left</p>` : '<p class="stock-note" style="color:var(--ok)">In stock, ready to ship</p>';
  const url = location.href;

  box.innerHTML = `
    <div class="gallery">
      <div class="main" id="main-img" title="Tap to zoom"><img src="${esc(photos[0])}" alt="${esc(p.name)}"></div>
      ${photos.length > 1 ? `<div class="thumbs">${photos.map((u, i) => `<button type="button" class="${i ? "" : "on"}" data-i="${i}" aria-label="Photo ${i + 1}"><img src="${esc(u)}" alt=""></button>`).join("")}</div>` : ""}
    </div>
    <div>
      <span style="color:var(--gold-deep);text-transform:uppercase;letter-spacing:.1em;font-size:.8rem">${esc(cat.name)}</span>
      <h1>${esc(p.name)}</h1>
      <div class="price-row"><span class="price">${money(p.price)}</span>${p.mrp > p.price ? `<span class="mrp">MRP ${money(p.mrp)}</span><span class="off">${o}% off</span>` : ""}</div>
      <p class="muted" style="font-size:.85rem;margin-top:4px">Inclusive of all taxes. ${Number(s.free_shipping_above) ? `Free shipping above ${money(s.free_shipping_above)}.` : ""}</p>
      ${stockNote}
      <p>${esc(p.description || "").replace(/\n/g, "<br>")}</p>
      <dl class="specs">
        ${p.material ? `<dt>Material</dt><dd>${esc(p.material)}</dd>` : ""}
        ${p.color ? `<dt>Colour</dt><dd>${esc(p.color)}</dd>` : ""}
        ${p.occasion ? `<dt>Occasion</dt><dd>${esc(p.occasion)}</dd>` : ""}
        <dt>Type</dt><dd>Imitation jewellery</dd>
      </dl>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <div class="qty"><button type="button" id="minus" aria-label="Less">−</button><input id="qty" value="1" inputmode="numeric" aria-label="Quantity"><button type="button" id="plus" aria-label="More">+</button></div>
        <button class="btn ghost small" type="button" id="wish">${icons.heart.replace('aria-hidden="true"', 'aria-hidden="true" width="18" height="18"')} <span>${wish.has(p.id) ? "Saved" : "Save"}</span></button>
      </div>
      <div class="buy-row">
        <button class="btn" id="add" ${stock <= 0 ? "disabled" : ""}>Add to cart</button>
        <button class="btn gold" id="buy" ${stock <= 0 ? "disabled" : ""}>Buy now</button>
      </div>
      <a class="btn wa block" target="_blank" rel="noopener" href="${waLink(s.whatsapp, `Hello Streesakhi, I want to order:\n${p.name}\nPrice: ${money(p.price)}\n${url}`)}">${icons.wa.replace('aria-hidden="true"', 'aria-hidden="true" width="20" height="20"')} Order on WhatsApp</a>
      <div class="trust">
        <div><strong>COD</strong>Cash on Delivery</div>
        <div><strong>${esc(s.return_days || 7)} days</strong>Damage support</div>
        <div><strong>Secure</strong>UPI and cards</div>
      </div>
    </div>`;

  const main = document.getElementById("main-img"), mainImg = main.querySelector("img");
  box.querySelectorAll(".thumbs button").forEach(b => b.onclick = () => {
    mainImg.src = photos[b.dataset.i];
    box.querySelectorAll(".thumbs button").forEach(x => x.classList.toggle("on", x === b));
  });
  main.addEventListener("click", () => main.classList.toggle("zoom"));
  main.addEventListener("mousemove", e => {
    if (!main.classList.contains("zoom")) return;
    const r = main.getBoundingClientRect();
    mainImg.style.transformOrigin = `${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`;
  });
  main.addEventListener("mouseleave", () => main.classList.remove("zoom"));

  const q = document.getElementById("qty");
  const clamp = () => { let v = parseInt(q.value, 10) || 1; v = Math.max(1, Math.min(v, Math.max(stock, 1), 10)); q.value = v; return v; };
  document.getElementById("minus").onclick = () => { q.value = clamp() - 1; clamp(); };
  document.getElementById("plus").onclick = () => { q.value = clamp() + 1; clamp(); };
  q.onchange = clamp;
  const inCart = () => (cart.get().find(l => l.id === p.id) || { qty: 0 }).qty;
  const addIt = () => {
    const want = clamp();
    if (inCart() + want > stock) { toast(`Only ${stock} available`); return false; }
    cart.add(p.id, want); return true;
  };
  document.getElementById("add").onclick = () => { if (addIt()) toast("Added to cart"); };
  document.getElementById("buy").onclick = () => { if (inCart() || addIt()) location.href = "checkout.html"; };
  document.getElementById("wish").onclick = e => { const on = wish.toggle(p.id); e.currentTarget.querySelector("span").textContent = on ? "Saved" : "Save"; toast(on ? "Saved to wishlist" : "Removed from wishlist"); };

  const all = await store.products();
  const rel = all.filter(x => x.category === p.category && x.id !== p.id).slice(0, 4);
  if (rel.length) {
    document.getElementById("related-wrap").hidden = false;
    document.getElementById("related").innerHTML = rel.map(x => card(x, cat.name)).join("");
  }
})();
