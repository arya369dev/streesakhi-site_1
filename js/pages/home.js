(async function () {
  const { store, card, esc, placeholder, waLink } = SS;
  const [s, cats, prods, banners] = await Promise.all([store.settings(), store.categories(), store.products(), store.banners()]);
  const catName = slug => (cats.find(c => c.slug === slug) || {}).name || slug;

  if (s.hero_eyebrow) document.getElementById("hero-eyebrow").textContent = s.hero_eyebrow;
  if (s.hero_title) document.getElementById("hero-title").textContent = s.hero_title;
  if (s.hero_subtitle) document.getElementById("hero-sub").textContent = s.hero_subtitle;
  document.getElementById("wa-cta").href = waLink(s.whatsapp, "Hello Streesakhi, please help me choose jewellery.");

  document.getElementById("cats").innerHTML = cats.map(c => `
    <a class="cat-tile" href="shop.html?category=${encodeURIComponent(c.slug)}">
      <div class="img"><img src="${esc(c.image || placeholder(c.slug))}" alt="" loading="lazy"></div>
      <span>${esc(c.name)}</span>
    </a>`).join("");

  if (banners.length) {
    document.getElementById("promos-wrap").hidden = false;
    document.getElementById("promos").innerHTML = banners.slice(0, 4).map(b => `
      <a class="promo" href="${esc(b.link || "shop.html")}" ${b.image ? `style="background-image:url('${esc(b.image)}')"` : ""}>
        <span class="promo-text"><strong>${esc(b.title)}</strong>${b.subtitle ? `<span>${esc(b.subtitle)}</span>` : ""}<em>Shop now</em></span>
      </a>`).join("");
  }

  const fresh = prods.filter(p => p.stock > 0).slice(0, 8);
  document.getElementById("new").innerHTML = fresh.map(p => card(p, catName(p.category))).join("") || '<p class="empty">New designs are on the way.</p>';
  let best = prods.filter(p => p.is_featured);
  if (best.length < 4) best = best.concat(prods.filter(p => !p.is_featured)).slice(0, 4);
  document.getElementById("best").innerHTML = best.slice(0, 8).map(p => card(p, catName(p.category))).join("");
})();
