(async function () {
  const { store, cart, esc, money, img, totals } = SS;
  const s = await store.settings();
  const el = document.getElementById("cart");

  async function render() {
    const lines = await cart.lines();
    if (!lines.length) {
      el.innerHTML = `<div class="empty" style="grid-column:1/-1"><h2>Your cart is empty</h2><p>Find something beautiful for yourself or someone special.</p><a class="btn" href="shop.html">Start shopping</a></div>`;
      return;
    }
    const t = totals(lines, s, null);
    const gap = Number(s.free_shipping_above || 0) - t.subtotal;
    el.innerHTML = `
      <div class="panel">
        ${lines.map(l => `
          <div class="cart-line">
            <a href="product.html?id=${encodeURIComponent(l.p.id)}"><img src="${esc(img(l.p))}" alt=""></a>
            <div>
              <a href="product.html?id=${encodeURIComponent(l.p.id)}" style="font-weight:500">${esc(l.p.name)}</a>
              <div class="price-row" style="padding-top:2px"><span class="price">${money(l.p.price)}</span>${l.p.mrp > l.p.price ? `<span class="mrp">${money(l.p.mrp)}</span>` : ""}</div>
              ${l.qty > l.p.stock ? `<p class="stock-note none" style="margin:4px 0 0">Only ${l.p.stock} in stock. Please reduce the quantity.</p>` : ""}
              <div style="display:flex;gap:14px;align-items:center;margin-top:8px">
                <div class="qty"><button type="button" data-dec="${esc(l.p.id)}" aria-label="Less">−</button><input value="${l.qty}" readonly aria-label="Quantity"><button type="button" data-inc="${esc(l.p.id)}" aria-label="More">+</button></div>
                <button class="remove" data-rm="${esc(l.p.id)}">Remove</button>
              </div>
            </div>
            <strong class="num">${money(l.p.price * l.qty)}</strong>
          </div>`).join("")}
      </div>
      <div class="panel" style="align-self:start">
        <h2>Order summary</h2>
        <div class="sum-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
        <div class="sum-row"><span>Shipping</span><span>${t.shipping ? money(t.shipping) : "Free"}</span></div>
        <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
        ${gap > 0 ? `<div class="notice info">Add ${money(gap)} more for free shipping.</div>` : `<div class="notice ok">You get free shipping.</div>`}
        <p class="muted" style="font-size:.85rem">Have a coupon? Apply it at checkout.</p>
        <a class="btn block" href="checkout.html" ${lines.some(l => l.qty > l.p.stock) ? 'aria-disabled="true" style="pointer-events:none;opacity:.5"' : ""}>Proceed to checkout</a>
        <a class="btn ghost block" style="margin-top:10px" href="shop.html">Continue shopping</a>
      </div>`;
  }
  el.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const c = cart.get();
    if (b.dataset.inc) { const l = c.find(x => x.id === b.dataset.inc); cart.set(l.id, l.qty + 1); }
    else if (b.dataset.dec) { const l = c.find(x => x.id === b.dataset.dec); cart.set(l.id, l.qty - 1); }
    else if (b.dataset.rm) cart.remove(b.dataset.rm);
    else return;
    render();
  });
  render();
})();
