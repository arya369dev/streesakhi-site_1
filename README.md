# Streesakhi — online jewellery store

Mobile-friendly e-commerce website for **Streesakhi (Sejal Prathistha)**, built from the PRD and technical stack.

- **Storefront:** intro logo video, home, categories, shop with search, filters and sorting, product pages with zoom, wishlist, cart, checkout (COD + Razorpay), order tracking, policy pages, WhatsApp ordering.
- **Admin panel** at `/admin`: the owner manages products and photos, stock, orders (status, tracking, packing slip, invoice), categories, homepage banners, coupons, policy pages and store settings. The owner never needs GitHub, Vercel or Supabase.
- **Backend:** Vercel serverless functions in `/api`, Supabase database in `/supabase/schema.sql`.

The site works straight away in **demo mode** (sample products, data saved in your own browser). Follow the steps below to make it live.

---

## Folder guide

| Path | What it is |
| --- | --- |
| `index.html`, `shop.html`, `product.html`, `cart.html`, `checkout.html`, `order-success.html`, `track.html`, `wishlist.html`, `page.html` | Store pages |
| `css/style.css` | Design (maroon and gold theme, mobile first) |
| `js/config.js` | **The only file you edit:** Supabase URL, anon key, Razorpay Key ID (all public) |
| `js/store.js` | Data, cart, wishlist, shared helpers |
| `js/layout.js` | Header, menu, footer, WhatsApp button, intro video |
| `js/pages/*.js` | Code for each page |
| `js/analytics.js` | Google Analytics (paste your G- ID) |
| `admin/` | Admin panel |
| `api/` | Server code: create order, verify payment, track order, emails |
| `supabase/schema.sql` | Database tables, security rules, sample products |
| `assets/` | Logo, intro video, placeholder jewellery images |

---

## Step 1 · Put the code on GitHub (5 minutes, no software needed)

1. Sign in at [github.com](https://github.com) and click **New repository**. Name it `streesakhi`, keep it **Private**, and click **Create repository**.
2. On the new repository page, click **uploading an existing file**.
3. Unzip `streesakhi-website.zip` on your computer, open the `streesakhi-web` folder, select **everything inside it** (not the folder itself) and drag it into the GitHub page.
4. Click **Commit changes**.

> Tip: hidden files like `.gitignore` may not drag on some computers; that's fine.

## Step 2 · Host on Vercel (5 minutes)

1. Sign in at [vercel.com](https://vercel.com) with your GitHub account.
2. Click **Add New → Project**, choose the `streesakhi` repository and click **Import**.
3. Leave every setting as it is (Framework: **Other**) and click **Deploy**.
4. In about a minute you get a link like `streesakhi.vercel.app`. The store now runs in demo mode.

> **Plan note:** Vercel's free Hobby plan is for non-commercial use only. Switch the project to the **Pro** plan before taking real orders.

From now on, every change you commit on GitHub goes live on Vercel automatically.

## Step 3 · Connect the database (Supabase, 15 minutes)

1. Sign in at [supabase.com](https://supabase.com), click **New project**, name it `streesakhi`, choose region **Mumbai (ap-south-1)**, set a strong database password and create it.
2. Open `supabase/schema.sql`, find the line marked `>>> ADMIN <<<` and replace `owner@streesakhi.in` with the **owner's email**.
3. In Supabase go to **SQL Editor → New query**, paste the whole file and click **Run**. You should see "Success".
4. Create the owner's login: **Authentication → Users → Add user → Create new user**, enter the same owner email and a password, and tick **Auto Confirm User**.
5. Turn off public sign-ups (only the owner logs in): **Authentication → Sign In / Providers → Email**, switch off **Allow new users to sign up**.
6. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **anon public** key
   - **service_role** key (secret, used only in Vercel in step 4)
7. In GitHub, open `js/config.js`, click the pencil icon and fill in:

   ```js
   SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
   SUPABASE_ANON_KEY: "eyJ...your anon key...",
   RAZORPAY_KEY_ID: ""   // fill in step 5
   ```

   Click **Commit changes**. Vercel redeploys by itself.
8. Set the password-reset address: **Authentication → URL Configuration → Site URL** = your store address (e.g. `https://streesakhi.vercel.app`).

## Step 4 · Add the secret keys in Vercel

Vercel → your project → **Settings → Environment Variables**. Add each of these, then go to **Deployments → ⋯ → Redeploy**.

| Name | Value | Needed for |
| --- | --- | --- |
| `SUPABASE_URL` | Project URL from Supabase | Orders |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key from Supabase | Orders (keep secret) |
| `RAZORPAY_KEY_ID` | From Razorpay dashboard | Online payments |
| `RAZORPAY_KEY_SECRET` | From Razorpay dashboard | Online payments (keep secret) |
| `RESEND_API_KEY` | From resend.com (optional) | Order confirmation emails |
| `EMAIL_FROM` | e.g. `Streesakhi <orders@streesakhi.in>` (optional) | Order emails |

> Never put the service_role key or Razorpay secret in `js/config.js` or anywhere in GitHub.

## Step 5 · Turn on online payments (Razorpay)

1. Sign up at [razorpay.com](https://razorpay.com) and complete KYC (PAN, bank account). The policy pages it asks for are already on the site (`/page.html?p=refund` etc.).
2. **Test first:** in Razorpay switch to **Test mode**, generate keys, put the test Key ID in `js/config.js` and both test keys in Vercel. Place an order with a test UPI ID or card.
3. When approved, generate **Live** keys and replace the test keys in both places.

Until `RAZORPAY_KEY_ID` is filled in, checkout shows Cash on Delivery only.

## Step 6 · Your domain (e.g. streesakhi.in)

Vercel → project → **Settings → Domains → Add**, type your domain and follow the DNS instructions shown (add the records at your domain registrar). HTTPS is automatic.

## Step 7 · Google Analytics and Search Console (optional)

- Create a GA4 property at [analytics.google.com](https://analytics.google.com), copy the Measurement ID (`G-XXXXXXX`) and paste it in `js/analytics.js`.
- Add your domain in [Google Search Console](https://search.google.com/search-console).

---

## For the owner: running the store

Open **`yourdomain/admin`** on your phone or laptop and log in.

| To do this | Go to |
| --- | --- |
| See today's orders, sales, low stock | **Dashboard** |
| Pack an order, mark shipped, add tracking ID, print slip or invoice, WhatsApp the customer | **Orders** → tap the order |
| Add a new design with photos from your phone | **Products → + Add product** |
| Hide a product without deleting it | Product → untick **Visible in the store** |
| Update many stock counts at once | **Stock** |
| Change the top text or add a sale banner | **Homepage** |
| Create a festival coupon | **Coupons** |
| Change shipping charge, COD limit, WhatsApp number | **Store settings** |
| Edit return or shipping policy | **Policy pages** |

Stock goes down automatically for every order and comes back if you cancel the order. Changes appear on the website instantly.

**Forgot password?** Use **Forgot password?** on the admin login page.

**Add a helper as admin:** create their user in Supabase (step 3.4) and run `insert into admins (email) values ('helper@email.com');` in the SQL Editor.

---

## Before launch checklist

- [ ] Replace sample products with real ones (or delete them) in **Admin → Products**
- [ ] Set WhatsApp number, phone, email and address in **Admin → Store settings**
- [ ] Review all **Policy pages** (return days, shipping times)
- [ ] Place one COD test order and one Razorpay test order
- [ ] Vercel project on the **Pro** plan
- [ ] Domain connected and showing the padlock (HTTPS)
