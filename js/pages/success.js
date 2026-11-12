(async function () {
  const { store, esc, money, ls, waLink, qs } = SS;
  const s = await store.settings();
  const id = qs("id") || "";
  const last = ls.get("ss_last_order", {});
  const total = last.id === id ? last.total : null;
  const method = last.id === id ? last.method : "";
  document.getElementById("success").innerHTML = `
    <img src="assets/img/logo.webp" alt="" width="120" height="120" style="margin:0 auto 12px;border-radius:50%">
    <h1 style="color:var(--maroon)">Thank you for your order</h1>
    <p class="accent">Your jewellery is being prepared with love.</p>
    <div class="panel" style="text-align:left;margin:20px auto;max-width:440px">
      <div class="sum-row"><span>Order ID</span><strong>${esc(id)}</strong></div>
      ${total != null ? `<div class="sum-row"><span>Amount</span><strong>${money(total)}</strong></div>` : ""}
      <div class="sum-row"><span>Payment</span><strong>${method === "ONLINE" ? "Paid online" : "Cash on Delivery"}</strong></div>
    </div>
    <p>Save your order ID to track your parcel. ${method === "ONLINE" ? "" : "We may message you on WhatsApp to confirm your Cash on Delivery order."}</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:16px">
      <a class="btn" href="track.html?id=${encodeURIComponent(id)}">Track order</a>
      <a class="btn wa" target="_blank" rel="noopener" href="${waLink(s.whatsapp, `Hello Streesakhi, I just placed order ${id}.`)}">Confirm on WhatsApp</a>
      <a class="btn ghost" href="shop.html">Continue shopping</a>
    </div>`;
})();
