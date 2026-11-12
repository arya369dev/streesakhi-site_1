/* POST /api/verify-payment
   Confirms a Razorpay payment is genuine (signature check with the secret key),
   then marks the order Paid, reduces stock and sends the confirmation email. */
const L = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return L.send(res, 405, { error: "Use POST" });
  try {
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await L.readBody(req);
    if (!order_id || !razorpay_order_id || !razorpay_payment_id) throw L.httpError(400, "Missing payment details.");
    const rows = await L.sb(`orders?id=eq.${encodeURIComponent(order_id)}&select=*,order_items(*)`);
    const order = rows[0];
    if (!order) throw L.httpError(404, "Order not found.");
    if (order.razorpay_order_id !== razorpay_order_id) throw L.httpError(400, "Payment does not match this order.");
    if (!L.razorpaySignatureOk(razorpay_order_id, razorpay_payment_id, razorpay_signature)) throw L.httpError(400, "Payment could not be verified. If money was deducted, contact us with order ID " + order_id + ".");
    if (order.payment_status === "Paid") return L.send(res, 200, { ok: true, order_id }); // already processed

    await L.sb(`orders?id=eq.${encodeURIComponent(order_id)}`, { method: "PATCH", body: { payment_status: "Paid", razorpay_payment_id }, prefer: "return=minimal" });
    for (const i of order.order_items) await L.rpc("decrement_stock", { pid: i.product_id, q: i.qty });
    const settings = await L.getSettings();
    await L.sendOrderEmails({ ...order, payment_status: "Paid" }, order.order_items, settings);
    L.send(res, 200, { ok: true, order_id });
  } catch (e) { L.fail(res, e); }
};
