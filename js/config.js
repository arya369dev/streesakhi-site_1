/*
  STREESAKHI — website connection settings (filled in ONCE by the developer).

  Leave these empty and the website runs in DEMO MODE: sample products, and
  orders/admin changes are saved only in the visitor's own browser.

  Fill them in (see README.md, step 3) and the website uses your real Supabase
  database: the owner manages everything from /admin, nothing else needed.

  These keys are PUBLIC keys and are safe to keep here.
  NEVER put secret keys (service_role key, Razorpay key secret) in this file.
*/
window.STREESAKHI_CONFIG = {
  SUPABASE_URL: "",          // e.g. "https://abcdxyz.supabase.co"
  SUPABASE_ANON_KEY: "",     // Supabase > Project Settings > API > anon public key
  RAZORPAY_KEY_ID: ""        // e.g. "rzp_live_xxxxx" (public Key ID only). Empty = online payment hidden
};
