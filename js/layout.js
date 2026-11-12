/* Shared header, navigation, footer, WhatsApp button and intro video */
(async function () {
  const { esc, icons, store, updateBadges, waLink } = SS;

  /* Intro logo-reveal video: plays once per browser session on the home page */
  const intro = document.getElementById("intro");
  if (intro) {
    let seen = false;
    try { seen = sessionStorage.getItem("ss_intro") === "1"; } catch (e) {}
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduce) intro.remove();
    else {
      const v = intro.querySelector("video");
      let closed = false;
      const done = () => {
        if (closed) return; closed = true;
        try { sessionStorage.setItem("ss_intro", "1"); } catch (e) {}
        intro.classList.add("hide"); document.body.style.overflow = "";
        setTimeout(() => intro.remove(), 800);
      };
      document.body.style.overflow = "hidden";
      v.addEventListener("ended", done);
      v.addEventListener("error", done);
      intro.querySelector(".skip").addEventListener("click", done);
      const snd = intro.querySelector(".sound");
      snd.addEventListener("click", () => { v.muted = !v.muted; snd.textContent = v.muted ? "Sound on" : "Sound off"; if (v.paused) v.play().catch(() => {}); });
      const p = v.play(); if (p && p.catch) p.catch(() => { /* autoplay blocked: show poster, user can skip */ });
      setTimeout(done, 12000);
    }
  }

  const s = await store.settings().catch(() => window.STREESAKHI_DEMO.settings);
  const cats = await store.categories().catch(() => []);
  const here = location.pathname.split("/").pop() || "index.html";
  const curCat = SS.qs("category");

  const header = document.getElementById("site-header");
  if (header) {
    header.outerHTML = `
    ${s.announcement ? `<div class="announce">${esc(s.announcement)}</div>` : ""}
    <header class="site-header">
      <div class="header-row">
        <a class="brand" href="index.html" aria-label="Streesakhi home">
          <img src="assets/img/logo.webp" alt="" width="52" height="52">
          <span class="brand-name">STREESAKHI<small>${esc(s.tagline || "Sejal Prathistha")}</small></span>
        </a>
        <form class="search" action="shop.html" role="search">
          <label for="q" class="sr-only">Search jewellery</label>
          <input id="q" name="q" type="search" placeholder="Search jhumka, kundan, bangles…" value="${esc(SS.qs("q") || "")}">
          <button type="submit" aria-label="Search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button>
        </form>
        <nav class="icons" aria-label="Your account">
          <a class="icon-btn" href="track.html" aria-label="Track order">${icons.truck}</a>
          <a class="icon-btn" href="wishlist.html" aria-label="Wishlist">${icons.heart}<span class="badge" data-badge="wish"></span></a>
          <a class="icon-btn" href="cart.html" aria-label="Cart">${icons.bag}<span class="badge" data-badge="cart"></span></a>
        </nav>
      </div>
      <nav class="nav" aria-label="Categories"><ul>
        <li><a href="shop.html" class="${here === "shop.html" && !curCat ? "active" : ""}">All jewellery</a></li>
        ${cats.map(c => `<li><a href="shop.html?category=${encodeURIComponent(c.slug)}" class="${curCat === c.slug ? "active" : ""}">${esc(c.name)}</a></li>`).join("")}
      </ul></nav>
    </header>`;
  }

  const footer = document.getElementById("site-footer");
  if (footer) {
    footer.outerHTML = `
    <footer class="site-footer">
      <div class="wrap footer-grid">
        <div class="footer-brand">
          <img src="assets/img/logo.webp" alt="Streesakhi logo" width="84" height="84" loading="lazy">
          <p>Royal heritage imitation jewellery, delivered across India. Cash on Delivery available.</p>
        </div>
        <div><h4>Shop</h4><ul>${cats.slice(0, 6).map(c => `<li><a href="shop.html?category=${encodeURIComponent(c.slug)}">${esc(c.name)}</a></li>`).join("")}</ul></div>
        <div><h4>Help</h4><ul>
          <li><a href="track.html">Track your order</a></li>
          <li><a href="page.html?p=shipping">Shipping policy</a></li>
          <li><a href="page.html?p=refund">Returns and refunds</a></li>
          <li><a href="page.html?p=privacy">Privacy policy</a></li>
          <li><a href="page.html?p=terms">Terms and conditions</a></li>
        </ul></div>
        <div><h4>Contact</h4><ul>
          <li><a href="page.html?p=about">About us</a></li>
          <li><a href="page.html?p=contact">Contact us</a></li>
          ${s.phone ? `<li>Phone / WhatsApp: ${esc(s.phone)}</li>` : ""}
          ${s.email ? `<li>${esc(s.email)}</li>` : ""}
          ${s.instagram ? `<li><a href="${esc(s.instagram)}" rel="noopener">Instagram</a></li>` : ""}
        </ul></div>
      </div>
      <div class="copyright">© ${new Date().getFullYear()} Streesakhi · Sejal Prathistha. All prices in INR. Imitation jewellery.</div>
    </footer>
    ${s.whatsapp ? `<a class="wa-float" href="${waLink(s.whatsapp, "Hello Streesakhi, I have a question.")}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp">${icons.wa}</a>` : ""}`;
  }
  updateBadges();
})();
