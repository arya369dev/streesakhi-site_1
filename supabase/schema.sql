-- =====================================================================
-- STREESAKHI — database setup for Supabase
-- How to use: Supabase dashboard > SQL Editor > New query > paste this
-- whole file > Run. Safe to run more than once.
-- BEFORE running: change the admin email on the line marked  >>> ADMIN <<<
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- tables ----------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);

create table if not exists categories (
  slug text primary key,
  name text not null,
  image text default '',
  sort int default 0
);

create table if not exists products (
  id text primary key default ('p' || substr(md5(gen_random_uuid()::text), 1, 10)),
  name text not null,
  category text references categories(slug) on update cascade on delete set null,
  price int not null check (price >= 0),
  mrp int,
  description text default '',
  material text default '',
  color text default '',
  occasion text default '',
  stock int not null default 0 check (stock >= 0),
  images text[] not null default '{}',
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort int default 0,
  created_at timestamptz not null default now()
);

create table if not exists coupons (
  code text primary key,
  discount_percent int not null check (discount_percent between 1 and 90),
  min_order int not null default 0,
  expiry date,
  active boolean not null default true
);

create table if not exists banners (
  id text primary key default ('b' || substr(md5(gen_random_uuid()::text), 1, 10)),
  title text not null,
  subtitle text default '',
  link text default 'shop.html',
  image text default '',
  sort int default 1,
  active boolean not null default true
);

create table if not exists pages (
  slug text primary key,
  title text not null,
  content text not null default ''
);

create table if not exists orders (
  id text primary key,
  name text not null,
  phone text not null,
  email text default '',
  address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  subtotal int not null,
  discount int not null default 0,
  shipping int not null default 0,
  total int not null,
  coupon text,
  payment_method text not null check (payment_method in ('COD', 'ONLINE')),
  payment_status text not null default 'Pending',   -- Pending | Paid | COD
  order_status text not null default 'New',          -- New | Packed | Shipped | Delivered | Cancelled
  razorpay_order_id text,
  razorpay_payment_id text,
  courier text default '',
  tracking_id text default '',
  tracking_url text default '',
  notes text default '',
  created_at timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);

create table if not exists order_items (
  id bigserial primary key,
  order_id text not null references orders(id) on delete cascade,
  product_id text,
  name text not null,
  price int not null,
  qty int not null check (qty > 0)
);

create table if not exists admins (
  email text primary key
);

-- ---------- functions ----------
-- true when the logged-in user's email is in the admins table
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
$$;

-- lets the checkout check ONE coupon code without exposing the coupon list
create or replace function check_coupon(c text) returns setof coupons
language sql stable security definer set search_path = public as $$
  select * from coupons where code = upper(trim(c)) and active = true;
$$;

-- stock reduction, used only by the server (service key)
create or replace function decrement_stock(pid text, q int) returns void
language sql security definer set search_path = public as $$
  update products set stock = greatest(stock - q, 0) where id = pid;
$$;
revoke all on function decrement_stock(text, int) from public, anon, authenticated;

-- ---------- security: Row Level Security ----------
alter table settings    enable row level security;
alter table categories  enable row level security;
alter table products    enable row level security;
alter table coupons     enable row level security;
alter table banners     enable row level security;
alter table pages       enable row level security;
alter table orders      enable row level security;
alter table order_items enable row level security;
alter table admins      enable row level security;

do $$ begin
  -- public can READ the catalogue and store content
  drop policy if exists "public read" on settings;    create policy "public read" on settings    for select using (true);
  drop policy if exists "public read" on categories;  create policy "public read" on categories  for select using (true);
  drop policy if exists "public read" on products;    create policy "public read" on products    for select using (is_active or is_admin());
  drop policy if exists "public read" on banners;     create policy "public read" on banners     for select using (active or is_admin());
  drop policy if exists "public read" on pages;       create policy "public read" on pages       for select using (true);
  -- only admins can change anything (orders are created by the server with the service key)
  drop policy if exists "admin all" on settings;      create policy "admin all" on settings      for all using (is_admin()) with check (is_admin());
  drop policy if exists "admin all" on categories;    create policy "admin all" on categories    for all using (is_admin()) with check (is_admin());
  drop policy if exists "admin all" on products;      create policy "admin all" on products      for all using (is_admin()) with check (is_admin());
  drop policy if exists "admin all" on coupons;       create policy "admin all" on coupons       for all using (is_admin()) with check (is_admin());
  drop policy if exists "admin all" on banners;       create policy "admin all" on banners       for all using (is_admin()) with check (is_admin());
  drop policy if exists "admin all" on pages;         create policy "admin all" on pages         for all using (is_admin()) with check (is_admin());
  drop policy if exists "admin all" on orders;        create policy "admin all" on orders        for all using (is_admin()) with check (is_admin());
  drop policy if exists "admin all" on order_items;   create policy "admin all" on order_items   for all using (is_admin()) with check (is_admin());
  drop policy if exists "admin read" on admins;       create policy "admin read" on admins       for select using (is_admin());
end $$;

-- ---------- photo storage ----------
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

do $$ begin
  drop policy if exists "public read images" on storage.objects;
  create policy "public read images" on storage.objects for select using (bucket_id = 'product-images');
  drop policy if exists "admin upload images" on storage.objects;
  create policy "admin upload images" on storage.objects for insert with check (bucket_id = 'product-images' and is_admin());
  drop policy if exists "admin change images" on storage.objects;
  create policy "admin change images" on storage.objects for update using (bucket_id = 'product-images' and is_admin());
  drop policy if exists "admin delete images" on storage.objects;
  create policy "admin delete images" on storage.objects for delete using (bucket_id = 'product-images' and is_admin());
end $$;

-- ---------- >>> ADMIN <<< : put the store owner's email here ----------
insert into admins (email) values ('owner@streesakhi.in') on conflict do nothing;

-- ---------- starting content (sample products the owner can edit or delete) ----------
insert into settings (id, data) values (1, '{"store_name": "Streesakhi", "tagline": "Sejal Prathistha", "announcement": "Free shipping on orders above ₹999  |  Cash on Delivery available", "hero_eyebrow": "Royal heritage, everyday elegance", "hero_title": "Jewellery that feels like a celebration", "hero_subtitle": "Handpicked kundan, temple, oxidised and pearl jewellery for weddings, festivals and every day. Affordable, beautiful, delivered across India.", "whatsapp": "919999999999", "phone": "+91 99999 99999", "email": "hello@streesakhi.in", "address": "Add your business address from the admin panel", "instagram": "https://instagram.com/", "shipping_fee": 60, "free_shipping_above": 999, "cod_enabled": true, "cod_max": 5000, "return_days": 7}'::jsonb) on conflict (id) do nothing;
insert into categories (slug, name, image, sort) values ('necklaces', 'Necklaces', '', 1) on conflict do nothing;
insert into categories (slug, name, image, sort) values ('earrings', 'Earrings', '', 2) on conflict do nothing;
insert into categories (slug, name, image, sort) values ('bangles', 'Bangles', '', 3) on conflict do nothing;
insert into categories (slug, name, image, sort) values ('rings', 'Rings', '', 4) on conflict do nothing;
insert into categories (slug, name, image, sort) values ('anklets', 'Anklets', '', 5) on conflict do nothing;
insert into categories (slug, name, image, sort) values ('sets', 'Bridal Sets', '', 6) on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p01', 'Rani Kundan Choker Necklace', 'necklaces', 1299, 2199, 'A regal kundan choker with ruby-red stones and a row of pearl drops. Adjustable dori at the back for a perfect fit.', 'Kundan', 'Gold', 'Bridal', 12, true, now() - interval '0 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p02', 'Temple Lakshmi Long Haram', 'necklaces', 1599, 2499, 'Traditional temple-style long haram with Goddess Lakshmi motifs, finished in antique gold plating.', 'Temple', 'Gold', 'Festive', 8, true, now() - interval '1 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p03', 'Pearl Layered Mala', 'necklaces', 749, 1199, 'Three-layer faux pearl mala with a gold-tone clasp. Light, elegant and easy to style with sarees or western wear.', 'Pearl', 'White', 'Party', 20, false, now() - interval '2 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p04', 'Oxidised Coin Necklace', 'necklaces', 499, 899, 'Boho oxidised silver-tone necklace with hanging coins. Perfect with kurtis and cotton sarees.', 'Oxidised', 'Silver', 'Daily wear', 25, false, now() - interval '3 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p05', 'Classic Gold Jhumka', 'earrings', 449, 799, 'Bell-shaped gold-plated jhumkas with pearl hangings. Lightweight for all-day comfort.', 'Gold-plated', 'Gold', 'Festive', 40, true, now() - interval '4 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p06', 'Oxidised Peacock Jhumka', 'earrings', 349, 599, 'Oxidised jhumkas with a detailed peacock top and tiny ghungroo beads.', 'Oxidised', 'Silver', 'Daily wear', 35, false, now() - interval '5 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p07', 'Kundan Chandbali Earrings', 'earrings', 699, 1099, 'Crescent chandbalis with kundan work, red stones and pearl fringe.', 'Kundan', 'Red', 'Bridal', 3, false, now() - interval '6 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p08', 'American Diamond Studs', 'earrings', 399, 699, 'Sparkling AD stone studs with secure push-back closure.', 'American Diamond', 'White', 'Party', 30, false, now() - interval '7 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p09', 'Ruby Kada Pair (2.6)', 'bangles', 899, 1499, 'Pair of broad gold-plated kadas with ruby-red stones. Size 2.6 with screw opening.', 'Gold-plated', 'Red', 'Bridal', 10, true, now() - interval '8 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p10', 'Green Meenakari Bangle Set', 'bangles', 649, 999, 'Set of 6 bangles with hand-painted green meenakari and gold-tone borders.', 'Meenakari', 'Green', 'Festive', 15, false, now() - interval '9 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p11', 'Pearl Bracelet Bangles', 'bangles', 549, 899, 'Two bangles wrapped in faux pearls with a gold-tone frame.', 'Pearl', 'White', 'Party', 0, false, now() - interval '10 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p12', 'Adjustable Kundan Cocktail Ring', 'rings', 299, 499, 'Statement cocktail ring with a pink kundan centre stone. Adjustable to fit most fingers.', 'Kundan', 'Pink', 'Party', 22, false, now() - interval '11 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p13', 'Oxidised Floral Ring', 'rings', 199, 349, 'Oxidised flower ring, adjustable band.', 'Oxidised', 'Silver', 'Daily wear', 50, false, now() - interval '12 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p14', 'Ghungroo Payal Pair', 'anklets', 399, 699, 'Pair of silver-tone payals with tinkling ghungroo bells.', 'Oxidised', 'Silver', 'Daily wear', 28, false, now() - interval '13 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p15', 'Pearl Drop Anklets', 'anklets', 349, 599, 'Delicate gold-tone anklets with pearl drops.', 'Pearl', 'Gold', 'Festive', 18, false, now() - interval '14 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p16', 'Royal Bridal Set (Necklace + Earrings + Tikka)', 'sets', 2499, 3999, 'Complete bridal set: kundan necklace, matching chandbali earrings and maang tikka, with emerald-green and ruby stones.', 'Kundan', 'Red', 'Bridal', 5, true, now() - interval '15 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p17', 'Temple Choker Set', 'sets', 1899, 2999, 'Temple choker with matching jhumkas, antique gold finish.', 'Temple', 'Gold', 'Festive', 7, false, now() - interval '16 days') on conflict do nothing;
insert into products (id, name, category, price, mrp, description, material, color, occasion, stock, is_featured, created_at) values ('p18', 'AD Party Necklace Set', 'sets', 1499, 2399, 'American diamond necklace with matching earrings. Brilliant sparkle for receptions and parties.', 'American Diamond', 'White', 'Party', 9, false, now() - interval '17 days') on conflict do nothing;
insert into coupons (code, discount_percent, min_order, expiry, active) values ('WELCOME10', 10, 499, '2027-12-31', true) on conflict do nothing;
insert into pages (slug, title, content) values ('about', 'About Streesakhi', 'Streesakhi (Sejal Prathistha) brings you handpicked imitation jewellery inspired by India''s royal heritage: kundan, temple, oxidised, meenakari and pearl designs at prices every woman can enjoy.

Every piece is checked by hand before it is packed, and shipped across India with Cash on Delivery available.') on conflict do nothing;
insert into pages (slug, title, content) values ('contact', 'Contact us', 'We are happy to help with orders, sizes and styling.

WhatsApp and phone: see below.
Email: see below.
Hours: Monday to Saturday, 10 am to 7 pm.') on conflict do nothing;
insert into pages (slug, title, content) values ('shipping', 'Shipping policy', 'Orders are packed within 1 to 2 working days and delivered in 3 to 7 working days across India.

Shipping is free on orders above the free-shipping amount shown at checkout; a flat shipping charge applies below it.

You will receive a tracking ID once your order is shipped. Cash on Delivery orders may be confirmed on WhatsApp before dispatch.') on conflict do nothing;
insert into pages (slug, title, content) values ('refund', 'Return and refund policy', 'If your product arrives damaged or different from what you ordered, contact us within 7 days of delivery with an unboxing video and photos.

For hygiene reasons, earrings are not returnable unless damaged.

Approved refunds for online payments are made to the original payment method within 7 working days. For COD orders, refunds are made by UPI or bank transfer.') on conflict do nothing;
insert into pages (slug, title, content) values ('privacy', 'Privacy policy', 'We collect only the details needed to deliver your order: name, phone, email and address.

We never store your card or UPI details; online payments are processed securely by Razorpay.

We do not sell or share your personal details with anyone except our courier partner for delivery.') on conflict do nothing;
insert into pages (slug, title, content) values ('terms', 'Terms and conditions', 'All products are imitation (fashion) jewellery and not real gold, silver or precious stones.

Colours may vary slightly because of lighting and screen settings.

Prices are in Indian rupees. We may cancel an order if a product is out of stock, and any payment made will be refunded in full.') on conflict do nothing;
insert into banners (id, title, subtitle, link, image, sort, active) values ('b1', 'Festive Collection', 'Kundan and temple jewellery for the wedding season', 'shop.html?occasion=Festive', '', 1, true) on conflict do nothing;