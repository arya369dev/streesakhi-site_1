/* GET /api/track-order?id=SS...&phone=9876543210
   Customers see their own order only when both the order ID and phone number match. */
const L = require("./_lib");

module.exports = async (req, res) => {
  try {
    const id = String(req.query.id || "").trim().toUpperCase();
    const phone = String(req.query.phone || "").replace(/\D/g, "").slice(-10);
    if (!/^SS\d{6}-[A-Z0-9]{4}$/.test(id) || phone.length !== 10) throw L.httpError(400, "Enter a valid order ID and 10-digit mobile number.");
    const rows = await L.sb(`orders?id=eq.${encodeURIComponent(id)}&phone=eq.${phone}&select=id,order_status,payment_method,payment_status,total,courier,tracking_id,tracking_url,created_at,order_items(name,qty,price)`);
    if (!rows.length) throw L.httpError(404, "No order found with that order ID and phone number.");
    L.send(res, 200, rows[0]);
  } catch (e) { L.fail(res, e); }
};
