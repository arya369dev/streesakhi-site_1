/* Shared helpers for Vercel serverless functions (files starting with _ are not public routes).
   Secret keys come from Vercel > Project > Settings > Environment Variables, never from the code. */
const crypto = require("crypto");

const env = k => process.env[k] || "";
const SB_URL = () => env("SUPABASE_URL").replace(/\/$/, "");
const SB_KEY = () => env("SUPABASE_SERVICE_ROLE_KEY");

/* Supabase REST call with the service key (bypasses Row Level Security: server only!) */
async function sb(path, { method = "GET", body, prefer } = {}) {
  if (!SB_URL() || !SB_KEY()) throw httpError(500, "Store database is not configured on the server.");
  const r = await fetch(`${SB_URL()}/rest/v1/${path}`, {
    method,
    headers: { apikey: SB_KEY(), Authorization: `Bearer ${SB_KEY()}`, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : null;
  if (!r.ok) { console.error("Supabase error", r.status, text); throw httpError(500, "Database error. Please try again."); }
  return data;
}
const rpc = (fn, args) => sb(`rpc/${fn}`, { method: "POST", body: args });

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
function send(res, status, obj) { res.status(status).setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(obj)); }
function fail(res, e) { console.error(e); send(res, e.status || 500, { error: e.status ? e.message : "Something went wrong. Please try again." }); }

async function getSettings() {
  const rows = await sb("settings?id=eq.1&select=data");
  return (rows[0] && rows[0].data) || {};
}

/* Same pricing rules as the website (js/store.js totals) — the server's numbers are the ones that count */
function computeTotals(lines, settings, coupon) {
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  let discount = 0;
  if (coupon && subtotal >= (coupon.min_order || 0)) discount = Math.round(subtotal * coupon.discount_percent / 100);
  const after = subtotal - discount;
  const shipping = after >= Number(settings.free_shipping_above || 0) ? 0 : Number(settings.shipping_fee || 0);
  return { subtotal, discount, shipping, total: after + shipping };
}

function makeOrderId() {
  const d = new Date(Date.now() + 5.5 * 3600e3); // IST date
  const ymd = d.toISOString().slice(2, 10).replace(/-/g, "");
  return "SS" + ymd + "-" + crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 4);
}

/* Razorpay REST (no SDK needed) */
async function razorpayCreateOrder(amountRupees, receipt) {
  const id = env("RAZORPAY_KEY_ID"), secret = env("RAZORPAY_KEY_SECRET");
  if (!id || !secret) throw httpError(400, "Online payment is not available right now. Please choose Cash on Delivery.");
  const r = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64") },
    body: JSON.stringify({ amount: Math.round(amountRupees * 100), currency: "INR", receipt })
  });
  const j = await r.json();
  if (!r.ok) { console.error("Razorpay error", j); throw httpError(502, "Could not start the payment. Please try again or choose Cash on Delivery."); }
  return j;
}
function razorpaySignatureOk(orderId, paymentId, signature) {
  const expected = crypto.createHmac("sha256", env("RAZORPAY_KEY_SECRET")).update(orderId + "|" + paymentId).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(String(signature || ""));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* Order confirmation email through Resend (optional: skipped if not configured) */
async function sendOrderEmails(order, items, settings) {
  const key = env("RESEND_API_KEY"), from = env("EMAIL_FROM");
  if (!key || !from) return;
  const rows = items.map(i => `<tr><td style="padding:6px 0">${esc(i.name)} × ${i.qty}</td><td style="text-align:right">₹${(i.price * i.qty).toLocaleString("en-IN")}</td></tr>`).join("");
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2A1A1D">
    <h2 style="color:#5C0F21">Thank you for your order, ${esc(order.name)}!</h2>
    <p>Order <b>${esc(order.id)}</b> · ${order.payment_method === "ONLINE" ? "Paid online" : "Cash on Delivery"}</p>
    <table style="width:100%;border-collapse:collapse">${rows}
      <tr><td style="padding-top:8px">Shipping</td><td style="text-align:right">${order.shipping ? "₹" + order.shipping : "Free"}</td></tr>
      ${order.discount ? `<tr><td>Discount</td><td style="text-align:right">−₹${order.discount}</td></tr>` : ""}
      <tr><td style="padding-top:8px"><b>Total</b></td><td style="text-align:right"><b>₹${order.total.toLocaleString("en-IN")}</b></td></tr></table>
    <p>Delivering to: ${esc(order.address)}, ${esc(order.city)}, ${esc(order.state)} ${esc(order.pincode)}</p>
    <p>You can track your order any time on our website using your order ID and phone number.</p>
    <p style="color:#8E6A22">With love, Streesakhi · Sejal Prathistha</p></div>`;
  const post = (to, subject, body) => fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html: body })
  }).catch(e => console.error("email failed", e));
  const jobs = [];
  if (order.email) jobs.push(post(order.email, `Order confirmed: ${order.id}`, html));
  if (settings.email) jobs.push(post(settings.email, `New order ${order.id}: ₹${order.total} (${order.payment_method})`, html));
  await Promise.all(jobs);
}
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  const chunks = []; for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString() || "{}");
}

module.exports = { env, sb, rpc, send, fail, httpError, getSettings, computeTotals, makeOrderId, razorpayCreateOrder, razorpaySignatureOk, sendOrderEmails, readBody };
