/* Sample catalogue used in DEMO MODE (before Supabase is connected).
   Once Supabase is connected, the same data is loaded by supabase/schema.sql
   and the owner edits it from the admin panel. */
window.STREESAKHI_DEMO = {
  settings: {
    store_name: "Streesakhi",
    tagline: "Sejal Prathistha",
    announcement: "Free shipping on orders above ₹999  |  Cash on Delivery available",
    hero_eyebrow: "Royal heritage, everyday elegance",
    hero_title: "Jewellery that feels like a celebration",
    hero_subtitle: "Handpicked kundan, temple, oxidised and pearl jewellery for weddings, festivals and every day. Affordable, beautiful, delivered across India.",
    whatsapp: "919999999999",
    phone: "+91 99999 99999",
    email: "hello@streesakhi.in",
    address: "Add your business address from the admin panel",
    instagram: "https://instagram.com/",
    shipping_fee: 60,
    free_shipping_above: 999,
    cod_enabled: true,
    cod_max: 5000,
    return_days: 7
  },
  categories: [
    { slug: "necklaces", name: "Necklaces", image: "", sort: 1 },
    { slug: "earrings", name: "Earrings", image: "", sort: 2 },
    { slug: "bangles", name: "Bangles", image: "", sort: 3 },
    { slug: "rings", name: "Rings", image: "", sort: 4 },
    { slug: "anklets", name: "Anklets", image: "", sort: 5 },
    { slug: "sets", name: "Bridal Sets", image: "", sort: 6 }
  ],
  products: [
    { id: "p01", name: "Rani Kundan Choker Necklace", category: "necklaces", price: 1299, mrp: 2199, material: "Kundan", color: "Gold", occasion: "Bridal", stock: 12, is_featured: true, description: "A regal kundan choker with ruby-red stones and a row of pearl drops. Adjustable dori at the back for a perfect fit." },
    { id: "p02", name: "Temple Lakshmi Long Haram", category: "necklaces", price: 1599, mrp: 2499, material: "Temple", color: "Gold", occasion: "Festive", stock: 8, is_featured: true, description: "Traditional temple-style long haram with Goddess Lakshmi motifs, finished in antique gold plating." },
    { id: "p03", name: "Pearl Layered Mala", category: "necklaces", price: 749, mrp: 1199, material: "Pearl", color: "White", occasion: "Party", stock: 20, description: "Three-layer faux pearl mala with a gold-tone clasp. Light, elegant and easy to style with sarees or western wear." },
    { id: "p04", name: "Oxidised Coin Necklace", category: "necklaces", price: 499, mrp: 899, material: "Oxidised", color: "Silver", occasion: "Daily wear", stock: 25, description: "Boho oxidised silver-tone necklace with hanging coins. Perfect with kurtis and cotton sarees." },
    { id: "p05", name: "Classic Gold Jhumka", category: "earrings", price: 449, mrp: 799, material: "Gold-plated", color: "Gold", occasion: "Festive", stock: 40, is_featured: true, description: "Bell-shaped gold-plated jhumkas with pearl hangings. Lightweight for all-day comfort." },
    { id: "p06", name: "Oxidised Peacock Jhumka", category: "earrings", price: 349, mrp: 599, material: "Oxidised", color: "Silver", occasion: "Daily wear", stock: 35, description: "Oxidised jhumkas with a detailed peacock top and tiny ghungroo beads." },
    { id: "p07", name: "Kundan Chandbali Earrings", category: "earrings", price: 699, mrp: 1099, material: "Kundan", color: "Red", occasion: "Bridal", stock: 3, description: "Crescent chandbalis with kundan work, red stones and pearl fringe." },
    { id: "p08", name: "American Diamond Studs", category: "earrings", price: 399, mrp: 699, material: "American Diamond", color: "White", occasion: "Party", stock: 30, description: "Sparkling AD stone studs with secure push-back closure." },
    { id: "p09", name: "Ruby Kada Pair (2.6)", category: "bangles", price: 899, mrp: 1499, material: "Gold-plated", color: "Red", occasion: "Bridal", stock: 10, is_featured: true, description: "Pair of broad gold-plated kadas with ruby-red stones. Size 2.6 with screw opening." },
    { id: "p10", name: "Green Meenakari Bangle Set", category: "bangles", price: 649, mrp: 999, material: "Meenakari", color: "Green", occasion: "Festive", stock: 15, description: "Set of 6 bangles with hand-painted green meenakari and gold-tone borders." },
    { id: "p11", name: "Pearl Bracelet Bangles", category: "bangles", price: 549, mrp: 899, material: "Pearl", color: "White", occasion: "Party", stock: 0, description: "Two bangles wrapped in faux pearls with a gold-tone frame." },
    { id: "p12", name: "Adjustable Kundan Cocktail Ring", category: "rings", price: 299, mrp: 499, material: "Kundan", color: "Pink", occasion: "Party", stock: 22, description: "Statement cocktail ring with a pink kundan centre stone. Adjustable to fit most fingers." },
    { id: "p13", name: "Oxidised Floral Ring", category: "rings", price: 199, mrp: 349, material: "Oxidised", color: "Silver", occasion: "Daily wear", stock: 50, description: "Oxidised flower ring, adjustable band." },
    { id: "p14", name: "Ghungroo Payal Pair", category: "anklets", price: 399, mrp: 699, material: "Oxidised", color: "Silver", occasion: "Daily wear", stock: 28, description: "Pair of silver-tone payals with tinkling ghungroo bells." },
    { id: "p15", name: "Pearl Drop Anklets", category: "anklets", price: 349, mrp: 599, material: "Pearl", color: "Gold", occasion: "Festive", stock: 18, description: "Delicate gold-tone anklets with pearl drops." },
    { id: "p16", name: "Royal Bridal Set (Necklace + Earrings + Tikka)", category: "sets", price: 2499, mrp: 3999, material: "Kundan", color: "Red", occasion: "Bridal", stock: 5, is_featured: true, description: "Complete bridal set: kundan necklace, matching chandbali earrings and maang tikka, with emerald-green and ruby stones." },
    { id: "p17", name: "Temple Choker Set", category: "sets", price: 1899, mrp: 2999, material: "Temple", color: "Gold", occasion: "Festive", stock: 7, description: "Temple choker with matching jhumkas, antique gold finish." },
    { id: "p18", name: "AD Party Necklace Set", category: "sets", price: 1499, mrp: 2399, material: "American Diamond", color: "White", occasion: "Party", stock: 9, description: "American diamond necklace with matching earrings. Brilliant sparkle for receptions and parties." }
  ],
  coupons: [
    { code: "WELCOME10", discount_percent: 10, min_order: 499, expiry: "2027-12-31", active: true }
  ]
};
