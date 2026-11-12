(async function () {
  const { store, card, esc, qs } = SS;
  const [cats, prods] = await Promise.all([store.categories(), store.products()]);
  const catName = slug => (cats.find(c => c.slug === slug) || {}).name || slug;
  const uniq = k => [...new Set(prods.map(p => p[k]).filter(Boolean))].sort();
  const PRICES = [["", "Any price"], ["0-499", "Under ₹500"], ["500-999", "₹500 to ₹999"], ["1000-1999", "₹1,000 to ₹1,999"], ["2000-999999", "₹2,000 and above"]];

  const state = {
    category: qs("category") || "",
    q: (qs("q") || "").trim(),
    price: "",
    material: new Set(qs("material") ? [qs("material")] : []),
    color: new Set(qs("color") ? [qs("color")] : []),
    occasion: new Set(qs("occasion") ? [qs("occasion")] : []),
    instock: false,
    sort: "new"
  };

  const group = (title, key, values) => values.length ? `<h3>${title}</h3>${values.map(v => `<label><input type="checkbox" data-k="${key}" value="${esc(v)}" ${state[key].has(v) ? "checked" : ""}> ${esc(v)}</label>`).join("")}` : "";
  const f = document.getElementById("filters");
  f.innerHTML = `
    <h3>Category</h3>
    <label><input type="radio" name="cat" value="" ${!state.category ? "checked" : ""}> All</label>
    ${cats.map(c => `<label><input type="radio" name="cat" value="${esc(c.slug)}" ${state.category === c.slug ? "checked" : ""}> ${esc(c.name)}</label>`).join("")}
    <h3>Price</h3>
    ${PRICES.map(([v, l]) => `<label><input type="radio" name="price" value="${v}" ${state.price === v ? "checked" : ""}> ${l}</label>`).join("")}
    ${group("Occasion", "occasion", uniq("occasion"))}
    ${group("Material", "material", uniq("material"))}
    ${group("Colour", "color", uniq("color"))}
    <h3>Availability</h3>
    <label><input type="checkbox" id="instock"> In stock only</label>
    <button class="btn ghost small block" type="button" id="clear" style="margin-top:14px">Clear filters</button>`;

  f.addEventListener("change", e => {
    const t = e.target;
    if (t.name === "cat") state.category = t.value;
    else if (t.name === "price") state.price = t.value;
    else if (t.id === "instock") state.instock = t.checked;
    else if (t.dataset.k) t.checked ? state[t.dataset.k].add(t.value) : state[t.dataset.k].delete(t.value);
    render();
  });
  document.getElementById("clear").onclick = () => {
    Object.assign(state, { category: "", q: "", price: "", instock: false });
    ["material", "color", "occasion"].forEach(k => state[k].clear());
    f.querySelectorAll("input").forEach(i => { i.checked = i.type === "radio" && i.value === ""; });
    const box = document.getElementById("q"); if (box) box.value = "";
    render();
  };
  document.getElementById("sort").onchange = e => { state.sort = e.target.value; render(); };
  const tog = document.getElementById("filter-toggle");
  tog.onclick = () => { const open = f.classList.toggle("open"); tog.setAttribute("aria-expanded", open); };

  function render() {
    const words = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    let list = prods.filter(p => {
      if (state.category && p.category !== state.category) return false;
      if (state.price) { const [lo, hi] = state.price.split("-").map(Number); if (p.price < lo || p.price > hi) return false; }
      for (const k of ["material", "color", "occasion"]) if (state[k].size && !state[k].has(p[k])) return false;
      if (state.instock && p.stock <= 0) return false;
      if (words.length) {
        const hay = [p.name, p.description, p.material, p.color, p.occasion, catName(p.category)].join(" ").toLowerCase();
        if (!words.every(w => hay.includes(w))) return false;
      }
      return true;
    });
    const sorters = { new: () => 0, low: (a, b) => a.price - b.price, high: (a, b) => b.price - a.price, off: (a, b) => SS.off(b) - SS.off(a) };
    list = list.slice().sort(sorters[state.sort]);
    list.sort((a, b) => (b.stock > 0) - (a.stock > 0));

    const title = state.q ? `Results for “${state.q}”` : state.category ? catName(state.category) : "All jewellery";
    document.getElementById("shop-title").textContent = title;
    document.getElementById("crumb").textContent = title;
    document.title = `${title} | Streesakhi`;
    document.getElementById("count").textContent = `${list.length} ${list.length === 1 ? "design" : "designs"}`;
    document.getElementById("grid").innerHTML = list.length
      ? list.map(p => card(p, catName(p.category))).join("")
      : `<div class="empty" style="grid-column:1/-1"><p>No jewellery matches these filters.</p><button class="btn ghost small" onclick="document.getElementById('clear').click()">Clear filters</button></div>`;
  }
  render();
})();
