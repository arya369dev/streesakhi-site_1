/* POST /api/create-order
   Checks stock and prices on the server, saves the order, and either
   - COD: reduces stock and emails the confirmation, or
   - ONLINE: creates a Razorpay order for the customer to pay (stock is reduced after payment is verified). */
const L = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return L.send(res, 405, { error: "Use POST" });
  try {
    const body = await L.readBody(req);
    const c = body.customer || {};
    const phone = String(c.phone || "").replace(/\D/g, "").slice(-10);
    const bad = [];
    if (!c.name || String(c.name).trim().length < 2) bad.push("name");
    if (!/^[6-9]\d{9}$/.test(phone)) bad.push("mobile number");
    if (!c.address || String(c.address).trim().length < 8) bad.push("address");
    if (!c.city) bad.push("city");
    if (!/^[1-9]\d{5}$/.test(String(c.pincode || ""))) bad.push("pincode");
    if (!c.state) bad.push("state");
    if (bad.length) throw L.httpError(400, "Please check your " + bad.join(", ") + ".");
    const method = body.payment_method === "ONLINE" ? "ONLINE" : "COD";

    const want = (Array.isArray(body.items) ? body.items : []).map(i => ({ id: String(i.id), qty: Math.max(1, Math.min(20, parseInt(i.qty, 10) || 1)) })).slice(0, 50);
    if (!want.length) throw L.httpError(400, "Your cart is empty.");
    const ids = want.map(i => `"${i.id.replace(/"/g, "")}"`).join(",");
    const products = await L.sb(`products?id=in.(${encodeURIComponent(ids)})&select=id,name,price,stock,is_active`);
    const lines = want.map(w => {
      const p = products.find(x => String(x.id) === w.id);
      if (!p || p.is_active === false) throw L.httpError(409, "An item in your cart is no longer available. Please review your cart.");
      if (p.stock < w.qty) throw L.httpError(409, p.stock > 0 ? `Only ${p.stock} left of ${p.name}. Please reduce the quantity.` : `${p.name} just sold out. Please remove it from your cart.`);
      return { product_id: p.id, name: p.name, price: p.price, qty: w.qty };
    });

    const settings = await L.getSettings();
    let coupon = null;
    if (body.coupon) {
      const rows = await L.rpc("check_coupon", { c: String(body.coupon).toUpperCase().trim() });
      coupon = rows && rows[0];
      if (coupon && coupon.expiry && new Date(coupon.expiry + "T23:59:59+05:30") < new Date()) coupon = null;
    }
    const t = L.computeTotals(lines, settings, coupon);
    if (method === "COD") {
      if (settings.cod_enabled === false) throw L.httpError(400, "Cash on Delivery is not available right now. Please pay online.");
      if (Number(settings.cod_max) && t.total > Number(settings.cod_max)) throw L.httpError(400, `Cash on Delivery is available up to ₹${settings.cod_max}. Please pay online.`);
    }

    const order = {
      id: L.makeOrderId(), name: String(c.name).trim().slice(0, 100), phone, email: String(c.email || "").trim().slice(0, 150),
      address: String(c.address).trim().slice(0, 400), city: String(c.city).trim().slice(0, 80), state: String(c.state).slice(0, 60), pincode: String(c.pincode),
      ...t, coupon: coupon ? coupon.code : null, payment_method: method, payment_status: method === "COD" ? "COD" : "Pending", order_status: "New"
    };
    await L.sb("orders", { method: "POST", body: order, prefer: "return=minimal" });
    await L.sb("order_items", { method: "POST", body: lines.map(l => ({ ...l, order_id: order.id })), prefer: "return=minimal" });

    if (method === "COD") {
      for (const l of lines) await L.rpc("decrement_stock", { pid: l.product_id, q: l.qty });
      await L.sendOrderEmails(order, lines, settings);
      return L.send(res, 200, { order_id: order.id, total: order.total, payment_method: "COD" });
    }
    const rz = await L.razorpayCreateOrder(order.total, order.id);
    await L.sb(`orders?id=eq.${encodeURIComponent(order.id)}`, { method: "PATCH", body: { razorpay_order_id: rz.id }, prefer: "return=minimal" });
    return L.send(res, 200, { order_id: order.id, total: order.total, payment_method: "ONLINE", razorpay_order_id: rz.id, key_id: L.env("RAZORPAY_KEY_ID") });
  } catch (e) { L.fail(res, e); }
};
