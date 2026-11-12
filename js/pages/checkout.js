(async function () {
  const { store, cart, esc, money, img, totals, findCoupon, placeOrder, toast, LIVE, CFG, ls, waLink } = SS;
  const s = await store.settings();
  const form = document.getElementById("checkout");
  const STATES = ["Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"];
  form.state.innerHTML = '<option value="">Select state</option>' + STATES.map(x => `<option>${x}</option>`).join("");

  // remember details for next time (this browser only)
  const saved = ls.get("ss_customer", {});
  ["name", "phone", "email", "address", "city", "pincode", "state"].forEach(k => { if (saved[k]) form[k].value = saved[k]; });

  let lines = await cart.lines();
  if (!lines.length) { location.href = "cart.html"; return; }
  let coupon = null;

  const onlineOn = LIVE && !!CFG.RAZORPAY_KEY_ID;
  function payOptions(total) {
    const codOk = s.cod_enabled !== false && (!Number(s.cod_max) || total <= Number(s.cod_max));
    const box = document.getElementById("pay-options");
    const current = (form.querySelector("[name=pay]:checked") || {}).value;
    box.innerHTML = `
      ${onlineOn ? `<label class="pay-opt"><input type="radio" name="pay" value="ONLINE"><span><strong>Pay online</strong><br><span class="muted">UPI, debit or credit card, netbanking, wallets (Razorpay, 100% secure)</span></span></label>` : ""}
      ${codOk ? `<label class="pay-opt"><input type="radio" name="pay" value="COD"><span><strong>Cash on Delivery</strong><br><span class="muted">Pay in cash or UPI when the parcel arrives</span></span></label>`
        : `<div class="notice info">Cash on Delivery is available on orders up to ${money(s.cod_max)}.</div>`}
      ${!onlineOn && !codOk ? `<div class="notice bad">Please order on WhatsApp for this amount.</div>` : ""}`;
    const pick = form.querySelector(`[name=pay][value="${current}"]`) || form.querySelector("[name=pay]");
    if (pick) pick.checked = true;
  }

  function renderSummary() {
    const t = totals(lines, s, coupon);
    document.getElementById("summary").innerHTML = `
      <h2>Your order</h2>
      ${lines.map(l => `<div class="cart-line" style="grid-template-columns:56px 1fr auto;padding:10px 0">
        <img src="${esc(img(l.p))}" alt="" style="width:56px;height:56px">
        <div style="font-size:.92rem">${esc(l.p.name)}<div class="muted">Qty ${l.qty}</div></div>
        <span class="num">${money(l.p.price * l.qty)}</span></div>`).join("")}
      <div class="coupon">
        <label for="coupon" class="sr-only">Coupon code</label>
        <input id="coupon" placeholder="Coupon code" value="${esc(coupon ? coupon.code : "")}">
        <button class="btn ghost small" type="button" id="apply">${coupon ? "Remove" : "Apply"}</button>
      </div>
      <div id="coupon-msg"></div>
      <div class="sum-row"><span>Subtotal</span><span>${money(t.subtotal)}</span></div>
      ${t.discount ? `<div class="sum-row" style="color:var(--ok)"><span>Coupon ${esc(coupon.code)}</span><span>−${money(t.discount)}</span></div>` : ""}
      <div class="sum-row"><span>Shipping</span><span>${t.shipping ? money(t.shipping) : "Free"}</span></div>
      <div class="sum-row total"><span>Total</span><span>${money(t.total)}</span></div>
      <div id="form-msg" aria-live="polite"></div>
      <button class="btn block" type="submit" id="place" style="margin-top:12px">Place order · ${money(t.total)}</button>
      <a class="btn wa block" style="margin-top:10px" target="_blank" rel="noopener" href="${waLink(s.whatsapp, "Hello Streesakhi, I want to order:\n" + lines.map(l => `${l.p.name} x ${l.qty} = ${money(l.p.price * l.qty)}`).join("\n") + `\nTotal: ${money(t.total)}`)}">Order on WhatsApp instead</a>
      <p class="muted" style="font-size:.8rem;margin-top:10px">By placing the order you agree to our <a href="page.html?p=terms" style="text-decoration:underline">terms</a> and <a href="page.html?p=refund" style="text-decoration:underline">return policy</a>.</p>`;
    payOptions(t.total);
    document.getElementById("apply").onclick = applyCoupon;
  }

  async function applyCoupon() {
    const msg = document.getElementById("coupon-msg");
    if (coupon) { coupon = null; renderSummary(); return; }
    const code = document.getElementById("coupon").value;
    if (!code.trim()) { msg.innerHTML = '<div class="notice bad">Enter a coupon code first.</div>'; return; }
    const c = await findCoupon(code).catch(() => null);
    const sub = totals(lines, s, null).subtotal;
    if (!c) { msg.innerHTML = '<div class="notice bad">This coupon is not valid or has expired.</div>'; return; }
    if (sub < (c.min_order || 0)) { msg.innerHTML = `<div class="notice bad">This coupon needs a minimum order of ${money(c.min_order)}.</div>`; return; }
    coupon = c; renderSummary();
    document.getElementById("coupon-msg").innerHTML = `<div class="notice ok">${c.discount_percent}% off applied.</div>`;
  }

  /* validation */
  const rules = {
    name: v => v.trim().length >= 2 || "Enter your full name.",
    phone: v => /^[6-9]\d{9}$/.test(v.replace(/\D/g, "").slice(-10)) && v.replace(/\D/g, "").length >= 10 || "Enter a valid 10-digit mobile number.",
    email: v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email or leave it empty.",
    address: v => v.trim().length >= 8 || "Enter your full address with house number and area.",
    city: v => v.trim().length >= 2 || "Enter your city.",
    pincode: v => /^[1-9]\d{5}$/.test(v.trim()) || "Enter a valid 6-digit pincode.",
    state: v => !!v || "Select your state."
  };
  function check(k) {
    const r = rules[k](form[k].value), err = form[k].parentElement.querySelector(".err");
    err.textContent = r === true ? "" : r;
    form[k].setAttribute("aria-invalid", r !== true);
    return r === true;
  }
  Object.keys(rules).forEach(k => form[k].addEventListener("input", () => { if (form[k].getAttribute("aria-invalid") === "true") check(k); }));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const msg = document.getElementById("form-msg");
    const ok = Object.keys(rules).map(check).every(Boolean);
    if (!ok) { msg.innerHTML = '<div class="notice bad">Please fix the highlighted details.</div>'; form.querySelector("[aria-invalid=true]").focus(); return; }
    const pay = (form.querySelector("[name=pay]:checked") || {}).value;
    if (!pay) { msg.innerHTML = '<div class="notice bad">Choose a payment method.</div>'; return; }
    const customer = {
      name: form.name.value.trim(), phone: form.phone.value.replace(/\D/g, "").slice(-10), email: form.email.value.trim(),
      address: form.address.value.trim(), city: form.city.value.trim(), pincode: form.pincode.value.trim(), state: form.state.value
    };
    ls.set("ss_customer", customer);
    const btn = document.getElementById("place");
    btn.disabled = true; btn.textContent = "Placing your order…"; msg.innerHTML = "";
    try {
      const res = await placeOrder({ customer, items: lines.map(l => ({ id: l.p.id, qty: l.qty })), coupon: coupon ? coupon.code : "", payment_method: pay });
      if (pay === "ONLINE" && res.razorpay_order_id) await payOnline(res, customer);
      else finish(res);
    } catch (err) {
      msg.innerHTML = `<div class="notice bad">${esc(err.message)}</div>`;
      btn.disabled = false; btn.textContent = "Try again";
    }
  });

  function finish(res) {
    ls.set("ss_last_order", { id: res.order_id, total: res.total, method: res.payment_method || "COD" });
    cart.clear();
    location.href = "order-success.html?id=" + encodeURIComponent(res.order_id);
  }

  function payOnline(res, customer) {
    return new Promise((resolve, reject) => {
      if (!window.Razorpay) return reject(new Error("Payment window did not load. Check your internet and try again, or choose Cash on Delivery."));
      const rz = new Razorpay({
        key: res.key_id || CFG.RAZORPAY_KEY_ID,
        amount: res.total * 100, currency: "INR",
        name: "Streesakhi", description: "Order " + res.order_id,
        image: location.origin + "/assets/img/logo.jpg",
        order_id: res.razorpay_order_id,
        prefill: { name: customer.name, email: customer.email, contact: "+91" + customer.phone },
        theme: { color: "#5C0F21" },
        handler: async r => {
          try {
            const v = await fetch("/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order_id: res.order_id, ...r }) });
            const j = await v.json().catch(() => ({}));
            if (!v.ok) throw new Error(j.error || "Payment could not be verified. If money was deducted, contact us with your order ID " + res.order_id + ".");
            finish({ ...res, payment_method: "ONLINE" }); resolve();
          } catch (e) { reject(e); }
        },
        modal: { ondismiss: () => reject(new Error("Payment was cancelled. Your order " + res.order_id + " is saved as unpaid; you can try again or choose Cash on Delivery.")) }
      });
      rz.on("payment.failed", r => reject(new Error("Payment failed: " + (r.error && r.error.description || "please try again."))));
      rz.open();
    });
  }

  renderSummary();
  if (!LIVE) document.getElementById("pay-options").insertAdjacentHTML("beforebegin", '<div class="notice info">Demo mode: orders are saved only in this browser until the store database is connected.</div>');
})();
