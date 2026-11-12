(function () {
  const { trackOrder, esc, money, qs } = SS;
  const f = document.getElementById("track-form"), out = document.getElementById("track-result");
  const oid = document.getElementById("oid"), ph = document.getElementById("tphone");
  if (qs("id")) oid.value = qs("id");
  const STEPS = ["New", "Packed", "Shipped", "Delivered"];
  const LABEL = { New: "Order placed", Packed: "Packed", Shipped: "Shipped", Delivered: "Delivered" };
  f.addEventListener("submit", async e => {
    e.preventDefault();
    const e1 = oid.parentElement.querySelector(".err"), e2 = ph.parentElement.querySelector(".err");
    e1.textContent = oid.value.trim() ? "" : "Enter your order ID.";
    e2.textContent = /\d{10}/.test(ph.value.replace(/\D/g, "")) ? "" : "Enter the 10-digit mobile number.";
    if (e1.textContent || e2.textContent) return;
    out.innerHTML = '<div class="spinner"></div>';
    try {
      const o = await trackOrder(oid.value.trim(), ph.value);
      const idx = STEPS.indexOf(o.order_status);
      const items = o.items || o.order_items || [];
      out.innerHTML = `<div class="panel" style="margin-top:18px">
        <div class="sum-row"><strong>Order ${esc(o.id)}</strong><span class="status-pill ${esc(o.order_status)}">${esc(o.order_status)}</span></div>
        ${o.order_status === "Cancelled" ? '<div class="notice bad">This order was cancelled. Contact us on WhatsApp for help.</div>'
          : `<ol class="steps">${STEPS.map((s, i) => `<li class="${i <= idx ? "done" : ""}">${LABEL[s]}</li>`).join("")}</ol>`}
        ${o.tracking_id ? `<p>Courier: <strong>${esc(o.courier || "Courier")}</strong> · Tracking ID: <strong>${esc(o.tracking_id)}</strong>${o.tracking_url ? ` · <a href="${esc(o.tracking_url)}" target="_blank" rel="noopener" style="text-decoration:underline">Track parcel</a>` : ""}</p>` : ""}
        ${items.map(i => `<div class="sum-row"><span>${esc(i.name)} × ${i.qty}</span><span>${money(i.price * i.qty)}</span></div>`).join("")}
        <div class="sum-row total"><span>Total</span><span>${money(o.total)}</span></div>
        <p class="muted" style="font-size:.85rem">Placed on ${new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} · ${o.payment_method === "ONLINE" ? "Paid online" : "Cash on Delivery"}</p>
      </div>`;
    } catch (err) { out.innerHTML = `<div class="notice bad" style="margin-top:18px">${esc(err.message)}</div>`; }
  });
  if (qs("id")) ph.focus();
})();
