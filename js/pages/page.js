(async function () {
  const { store, esc, qs, waLink, DEFAULT_PAGES } = SS;
  const slug = qs("p") || "about";
  const [s, pg] = await Promise.all([store.settings(), store.page(slug).catch(() => null)]);
  const page = pg || DEFAULT_PAGES.find(p => p.slug === slug) || { title: "Page not found", content: "This page does not exist." };
  document.title = `${page.title} | Streesakhi`;
  document.getElementById("pg-title").textContent = page.title;
  const paras = String(page.content || "").split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
  const contact = slug === "contact" ? `
    <h2>Reach us</h2>
    <ul>
      ${s.phone ? `<li>Phone / WhatsApp: <strong>${esc(s.phone)}</strong></li>` : ""}
      ${s.email ? `<li>Email: <strong>${esc(s.email)}</strong></li>` : ""}
      ${s.address ? `<li>Address: ${esc(s.address)}</li>` : ""}
    </ul>
    <a class="btn wa" target="_blank" rel="noopener" href="${waLink(s.whatsapp, "Hello Streesakhi")}">Chat on WhatsApp</a>` : "";
  document.getElementById("pg-body").innerHTML = paras + contact;
})();
