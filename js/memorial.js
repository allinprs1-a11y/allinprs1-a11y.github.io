// Memorial streets: streets named after Islamic Republic "martyrs" are renamed in Iran Farda
// after people killed in the protests of 18–19 Dey 1404 (8–9 January 2026).
// Names come from published memorial records; every entry links to its source.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F) return;
  const map = F.map;
  const $ = (id) => document.getElementById(id);
  let list = [], byId = {}, current = null;

  const title = (m) => (F.lang === "en" ? "Javidnam " + m.name + " St." : "خیابان جاویدنام " + m.name);
  const sep = () => (F.lang === "fa" ? "، " : " · ");

  function geo() {
    return { type: "FeatureCollection", features: list.map((m) => ({
      type: "Feature", id: m.id, properties: { id: m.id, label: title(m) },
      geometry: { type: "MultiLineString", coordinates: m.lines } })) };
  }

  function openStreet(id, fly) {
    const m = byId[id];
    if (!m) return;
    F.closeCard();
    if (current) map.setFeatureState({ source: "memorial", id: current }, { sel: false });
    current = id;
    map.setFeatureState({ source: "memorial", id }, { sel: true });
    $("cardCat").textContent = F.t("javidnam");
    $("cardCat").style.background = "#e9e2d0";
    $("cardName").textContent = title(m);
    const facts = [m.age != null ? F.t("ageN", { n: F.num(m.age) }) : "", m.place, m.date].filter(Boolean);
    $("cardSub").textContent = facts.join(sep());
    $("cardText").textContent = F.t("memText", { old: m.old, name: m.name });
    $("cardOwner").textContent = "";
    const a = document.createElement("a");
    a.href = m.source; a.target = "_blank"; a.rel = "noopener"; a.textContent = F.t("memSource");
    $("cardOwner").appendChild(a);
    $("cardIg").hidden = true;
    $("storyBtn").hidden = true;
    $("toast").hidden = true;
    $("card").hidden = false;
    $("card").dataset.memorial = id;
    const u = new URL(location.href);
    u.searchParams.delete("id"); u.searchParams.set("street", id);
    history.replaceState(null, "", u);
    if (fly) {
      const pts = m.lines.flat();
      const b = pts.reduce((bb, p) => [Math.min(bb[0], p[0]), Math.min(bb[1], p[1]), Math.max(bb[2], p[0]), Math.max(bb[3], p[1])], [180, 90, -180, -90]);
      const small = window.innerWidth <= 640;
      map.fitBounds([[b[0], b[1]], [b[2], b[3]]], { padding: small ? { top: 140, bottom: window.innerHeight * 0.45, left: 30, right: 30 } : 120,
        maxZoom: 16, pitch: 55, bearing: map.getBearing(), duration: 2600, essential: true });
    }
  }
  F.openStreet = openStreet;

  function renderList() {
    const box = $("memList");
    box.innerHTML = "";
    const order = F.TOP_CITIES.concat(F.cities.map((c) => c.id));
    const sorted = list.slice().sort((a, b) => order.indexOf(a.city) - order.indexOf(b.city));
    for (const m of sorted) {
      const li = document.createElement("li");
      const s = document.createElement("strong"); s.textContent = m.name;
      const small = document.createElement("small");
      small.textContent = [F.cName(F.cityById[m.city]), m.age != null ? F.t("ageN", { n: F.num(m.age) }) : "", m.date].filter(Boolean).join(sep());
      li.append(s, small);
      li.onclick = () => { $("memModal").hidden = true; openStreet(m.id, true); };
      box.appendChild(li);
    }
    $("memCount").textContent = F.t("memCount", { n: F.num(list.length) });
  }

  Promise.all([F.ready, fetch("data/memorial.json").then((r) => r.json())]).then(([, data]) => {
    list = data;
    list.forEach((m) => (byId[m.id] = m));
    F.memorialList = list;
    map.addSource("memorial", { type: "geojson", data: geo(), promoteId: "id" });
    map.addLayer({ id: "memorial-glow", type: "line", source: "memorial", minzoom: 10,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#fff3d6", "line-blur": 6, "line-opacity": ["case", ["boolean", ["feature-state", "sel"], false], 0.9, 0.45],
        "line-width": ["interpolate", ["linear"], ["zoom"], 10, 4, 16, 18] } }, "buildings");
    map.addLayer({ id: "memorial-line", type: "line", source: "memorial", minzoom: 10,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.2, 16, 4] } }, "buildings");
    map.addLayer({ id: "memorial-label", type: "symbol", source: "memorial", minzoom: 13,
      layout: { "symbol-placement": "line", "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 13, 12, 17, 16], "symbol-spacing": 420, "text-max-angle": 30 },
      paint: { "text-color": "#ffffff", "text-halo-color": "#3a2a12", "text-halo-width": 2 } });
    ["memorial-line", "memorial-glow", "memorial-label"].forEach((l) => {
      map.on("click", l, (e) => e.features[0] && openStreet(e.features[0].properties.id, false));
      map.on("mouseenter", l, () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", l, () => (map.getCanvas().style.cursor = ""));
    });
    renderList();
    $("memBtn").onclick = () => { $("memModal").hidden = false; };
    $("memClose").onclick = () => ($("memModal").hidden = true);
    $("memModal").addEventListener("click", (e) => { if (e.target.id === "memModal") $("memModal").hidden = true; });
    const sid = F.params.get("street");
    if (sid && byId[sid]) {
      const go = () => setTimeout(() => openStreet(sid, true), 300);
      const intro = $("intro");
      if (intro.hidden) go(); else $("enterBtn").addEventListener("click", () => map.once("moveend", go), { once: true });
    }
  });

  // close: clear selection
  F.on("open", () => { if (current) { map.setFeatureState({ source: "memorial", id: current }, { sel: false }); current = null; } });
  F.on("lang", () => {
    if (!map.getSource("memorial")) return;
    map.getSource("memorial").setData(geo());
    renderList();
    if (current && !$("card").hidden) openStreet(current, false);
  });
})();
