(async function () {
  const { store, wish, card } = SS;
  const [cats, prods] = await Promise.all([store.categories(), store.products()]);
  const name = slug => (cats.find(c => c.slug === slug) || {}).name || slug;
  const grid = document.getElementById("grid");
  function render() {
    const list = prods.filter(p => wish.has(p.id));
    grid.innerHTML = list.length ? list.map(p => card(p, name(p.category))).join("")
      : `<div class="empty" style="grid-column:1/-1"><h2>No saved jewellery yet</h2><p>Tap the heart on any design to save it here.</p><a class="btn" href="shop.html">Browse jewellery</a></div>`;
  }
  grid.addEventListener("click", e => { if (e.target.closest("[data-wish]")) setTimeout(render, 0); });
  render();
})();
