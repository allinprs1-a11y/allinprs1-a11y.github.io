(function () {
  "use strict";

  const CFG = window.FARDA_CONFIG;
  const I18N = window.FARDA_I18N;
  const TILES = "https://tiles.openfreemap.org";
  const DEM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
  const IRAN_VIEW = { center: [53.6, 32.4], zoom: 4.6, pitch: 35, bearing: 0 };
  const TOP_CITIES = ["tehran", "isfahan", "shiraz", "tabriz", "mashhad", "kish", "yazd"];

  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  let lang = params.get("lang") === "en" ? "en" : (localStorage.getItem("farda-lang") || "fa");
  let places = [], cities = [], byId = {}, cityById = {};
  let current = null;
  let use3d = !(navigator.deviceMemory && navigator.deviceMemory <= 3);

  // ── helpers ──────────────────────────────────────────
  const t = (k, vars) => {
    let s = (I18N[lang] && I18N[lang][k]) || I18N.fa[k] || k;
    if (vars) for (const v in vars) s = s.replace("{" + v + "}", vars[v]);
    return s;
  };
  const faDigits = (n) => String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[d]);
  const num = (n) => (lang === "fa" ? faDigits(n) : String(n));
  const pName = (p) => (lang === "en" && p.name_en) || p.name;
  const pText = (p) => (lang === "en" && p.text_en) || p.text;
  const cName = (c) => (c ? (lang === "en" ? c.en : c.fa) : "");
  const catOf = (p) => CFG.categories[p.category] || CFG.categories.brand;
  const norm = (s) => (s || "").toLowerCase().replace(/[ً-ْ‌]/g, "").replace(/ي/g, "ی").replace(/ك/g, "ک");

  function square(lng, lat, meters) {
    const dLat = meters / 2 / 111320;
    const dLng = meters / 2 / (111320 * Math.cos((lat * Math.PI) / 180));
    return [[
      [lng - dLng, lat - dLat], [lng + dLng, lat - dLat],
      [lng + dLng, lat + dLat], [lng - dLng, lat + dLat], [lng - dLng, lat - dLat]
    ]];
  }

  // ── map style ─────────────────────────────────────────
  const labelField = () =>
    lang === "en"
      ? ["coalesce", ["get", "name:en"], ["get", "name:latin"], ["get", "name"]]
      : ["coalesce", ["get", "name:fa"], ["get", "name"]];

  function buildStyle() {
    return {
      version: 8,
      projection: { type: "globe" },
      glyphs: TILES + "/fonts/{fontstack}/{range}.pbf",
      sky: {
        "sky-color": "#0b1324", "horizon-color": "#26406b", "fog-color": "#0b1324",
        "sky-horizon-blend": 0.6, "horizon-fog-blend": 0.6, "fog-ground-blend": 0.75, "atmosphere-blend": 0.8
      },
      sources: {
        omt: { type: "vector", url: TILES + "/planet",
          attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> © <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>' },
        hill: { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 13,
          attribution: "Terrain: Mapzen / AWS Terrain Tiles" },
        dem: { type: "raster-dem", tiles: [DEM], encoding: "terrarium", tileSize: 256, maxzoom: 13 },
        iran: { type: "geojson", data: "data/iran.geojson", attribution: "Natural Earth" },
        mask: { type: "geojson", data: "data/mask.geojson" },
        seas: { type: "geojson", data: seasGeo() },
        country: { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [54.3, 32.9] } } },
        places: { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" },
        capitals: { type: "geojson", data: { type: "FeatureCollection", features: [] } },
        footprints: { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "id" }
      },
      layers: [
        { id: "bg", type: "background", paint: { "background-color": "#222a3a" } },
        { id: "landcover", type: "fill", source: "omt", "source-layer": "landcover",
          filter: ["in", ["get", "class"], ["literal", ["wood", "grass", "farmland"]]],
          paint: { "fill-color": "#1d3a33", "fill-opacity": 0.45 } },
        { id: "sand", type: "fill", source: "omt", "source-layer": "landcover",
          filter: ["==", ["get", "class"], "sand"], paint: { "fill-color": "#2b2a2a", "fill-opacity": 0.35 } },
        { id: "landuse", type: "fill", source: "omt", "source-layer": "landuse", minzoom: 9,
          filter: ["in", ["get", "class"], ["literal", ["residential", "commercial", "industrial", "retail"]]],
          paint: { "fill-color": "#22304d", "fill-opacity": 0.6 } },
        { id: "park", type: "fill", source: "omt", "source-layer": "park", paint: { "fill-color": "#1f4034", "fill-opacity": 0.7 } },
        { id: "hillshade", type: "hillshade", source: "hill",
          paint: { "hillshade-shadow-color": "#060b16", "hillshade-highlight-color": "#4a5d82",
            "hillshade-accent-color": "#101a30", "hillshade-exaggeration": 0.55 } },
        { id: "water", type: "fill", source: "omt", "source-layer": "water", paint: { "fill-color": "#0b3456" } },
        { id: "waterway", type: "line", source: "omt", "source-layer": "waterway", minzoom: 8,
          paint: { "line-color": "#16406b", "line-width": 1 } },
        { id: "aeroway", type: "line", source: "omt", "source-layer": "aeroway", minzoom: 11,
          filter: ["==", ["geometry-type"], "LineString"],
          paint: { "line-color": "#3c4a69", "line-width": ["interpolate", ["linear"], ["zoom"], 11, 1, 15, 12] } },
        { id: "roads-minor", type: "line", source: "omt", "source-layer": "transportation", minzoom: 12,
          filter: ["in", ["get", "class"], ["literal", ["minor", "service", "tertiary"]]],
          paint: { "line-color": "#34436a", "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.5, 16, 5] } },
        { id: "roads-major", type: "line", source: "omt", "source-layer": "transportation", minzoom: 6,
          filter: ["in", ["get", "class"], ["literal", ["motorway", "trunk", "primary", "secondary"]]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["match", ["get", "class"], ["motorway", "trunk"], "#c99a3e", "#8a7448"],
            "line-opacity": 0.85,
            "line-width": ["interpolate", ["linear"], ["zoom"], 6, 0.4, 10, 1.2, 14, 4, 17, 14] } },
        { id: "rail", type: "line", source: "omt", "source-layer": "transportation", minzoom: 8,
          filter: ["==", ["get", "class"], "rail"],
          paint: { "line-color": "#6d7ea8", "line-width": 1, "line-dasharray": [3, 2] } },
        { id: "mask", type: "fill", source: "mask", paint: { "fill-color": "#070c18", "fill-opacity": 0.6 } },
        { id: "provinces", type: "line", source: "omt", "source-layer": "boundary",
          filter: ["==", ["get", "admin_level"], 4], minzoom: 4,
          paint: { "line-color": "#f4b942", "line-opacity": 0.18, "line-width": 0.8, "line-dasharray": [2, 2] } },
        { id: "borders", type: "line", source: "omt", "source-layer": "boundary",
          filter: ["all", ["==", ["get", "admin_level"], 2], ["!=", ["get", "maritime"], 1]],
          paint: { "line-color": "#6b7896", "line-width": 0.8 } },
        { id: "iran-glow", type: "line", source: "iran",
          paint: { "line-color": "#f4b942", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 6, 8, 14], "line-blur": 8, "line-opacity": 0.35 } },
        { id: "iran-line", type: "line", source: "iran",
          paint: { "line-color": "#f4b942", "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.2, 8, 2.2] } },
        { id: "buildings", type: "fill-extrusion", source: "omt", "source-layer": "building", minzoom: 13,
          paint: {
            "fill-extrusion-color": ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 8],
              0, "#2f3b5a", 20, "#46557a", 60, "#6f7ea3", 150, "#c9b48a"],
            "fill-extrusion-height": ["interpolate", ["linear"], ["zoom"], 13, 0, 14.5, ["coalesce", ["get", "render_height"], 8]],
            "fill-extrusion-base": ["coalesce", ["get", "render_min_height"], 0],
            "fill-extrusion-opacity": 0.92
          } },
        { id: "place-footprint", type: "fill-extrusion", source: "footprints", minzoom: 11,
          paint: {
            "fill-extrusion-color": ["get", "color"],
            "fill-extrusion-height": ["case", ["boolean", ["feature-state", "sel"], false], ["*", ["get", "height"], 1.25], ["get", "height"]],
            "fill-extrusion-base": 0,
            "fill-extrusion-opacity": 0.95
          } },
        { id: "place-halo", type: "circle", source: "places",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["case", ["get", "vision"], 9, 5], 10, ["case", ["get", "vision"], 22, 12], 16, 26],
            "circle-blur": 0.9,
            "circle-opacity": ["case", ["boolean", ["feature-state", "sel"], false], 0.9, 0.55],
            "circle-pitch-alignment": "map"
          } },
        { id: "place-dot", type: "circle", source: "places",
          paint: {
            "circle-color": ["get", "color"],
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, ["case", ["get", "vision"], 3.5, 2], 12, 5],
            "circle-stroke-color": "#0b1324", "circle-stroke-width": 1
          } },
        { id: "capitals", type: "symbol", source: "capitals", maxzoom: 9,
          layout: { "text-field": ["get", lang], "text-font": ["Noto Sans Regular"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 4, ["case", ["get", "big"], 12, 10], 8, ["case", ["get", "big"], 17, 14]],
            "icon-allow-overlap": false },
          paint: { "text-color": "#f3efe6", "text-halo-color": "#0b1324", "text-halo-width": 1.6,
            "text-opacity": ["interpolate", ["linear"], ["zoom"], 4, ["case", ["get", "big"], 1, 0], 5.3, 1] } },
        cityLayer("place-city", ["==", ["get", "class"], "city"], 9, ["interpolate", ["linear"], ["zoom"], 9, 15, 12, 18], "#f3efe6"),
        cityLayer("place-town", ["==", ["get", "class"], "town"], 8, 13, "#c9d1e2"),
        cityLayer("place-small", ["in", ["get", "class"], ["literal", ["village", "suburb", "neighbourhood", "quarter"]]], 11.5, 11, "#9fa9bf"),
        { id: "water-name", type: "symbol", source: "omt", "source-layer": "water_name", minzoom: 6,
          filter: ["==", ["get", "class"], "lake"],
          layout: { "text-field": labelField(), "text-font": ["Noto Sans Italic"], "text-size": 12 },
          paint: { "text-color": "#7fb3e6", "text-halo-color": "#0b1324", "text-halo-width": 1.2 } },
        { id: "seas", type: "symbol", source: "seas",
          layout: { "text-field": ["get", lang], "text-font": ["Noto Sans Italic"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 3, 12, 7, 18], "text-letter-spacing": 0.05, "text-max-width": 10 },
          paint: { "text-color": "#86c5ff", "text-halo-color": "#0b1324", "text-halo-width": 1.4 } },
        { id: "country-name", type: "symbol", source: "country", maxzoom: 5.6,
          layout: { "text-field": lang === "en" ? "IRAN" : "ایران", "text-font": ["Noto Sans Bold"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 2, 18, 5, 34], "text-letter-spacing": 0.2, "text-allow-overlap": true },
          paint: { "text-color": "#f4b942", "text-opacity": 0.85, "text-halo-color": "#0b1324", "text-halo-width": 2 } },
        { id: "place-label", type: "symbol", source: "places",
          filter: ["get", "vision"],
          layout: {
            "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 14, 14],
            "text-offset": [0, 1.4], "text-anchor": "top", "text-max-width": 10
          },
          paint: { "text-color": ["get", "color"], "text-halo-color": "#0b1324", "text-halo-width": 1.8 } },
        { id: "place-label-small", type: "symbol", source: "places",
          filter: ["!", ["get", "vision"]], minzoom: 11,
          layout: {
            "text-field": ["get", "label"], "text-font": ["Noto Sans Bold"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 5, 11, 14, 14],
            "text-offset": [0, 1.4], "text-anchor": "top", "text-max-width": 10
          },
          paint: { "text-color": ["get", "color"], "text-halo-color": "#0b1324", "text-halo-width": 1.8 } }
      ]
    };
  }

  function cityLayer(id, filter, minzoom, size, color) {
    return { id, type: "symbol", source: "omt", "source-layer": "place", filter, minzoom,
      layout: { "text-field": labelField(), "text-font": ["Noto Sans Regular"], "text-size": size,
        "text-max-width": 8, "symbol-sort-key": ["coalesce", ["get", "rank"], 99] },
      paint: { "text-color": color, "text-halo-color": "#0b1324", "text-halo-width": 1.6 } };
  }

  function seasGeo() {
    const s = [
      ["خلیج فارس", "Persian Gulf", 51.6, 27.1],
      ["دریای خزر", "Caspian Sea", 51.0, 40.6],
      ["دریای عمان", "Gulf of Oman", 58.6, 24.6],
      ["تنگه هرمز", "Strait of Hormuz", 56.45, 26.45]
    ];
    return { type: "FeatureCollection", features: s.map(([fa, en, x, y]) => ({
      type: "Feature", properties: { fa, en }, geometry: { type: "Point", coordinates: [x, y] } })) };
  }

  // ── map ───────────────────────────────────────────────
  maplibregl.setRTLTextPlugin("vendor/mapbox-gl-rtl-text.js", true);
  const map = new maplibregl.Map({
    container: "map",
    style: buildStyle(),
    center: [53.6, 30], zoom: 1.6, pitch: 0,
    maxPitch: 75,
    attributionControl: { compact: true },
    canvasContextAttributes: { antialias: true }
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-left");
  window.__fardaMap = map;

  // Terrain only at country/region zoom; at street level the camera can end up
  // inside the terrain, so buildings are shown on flat ground there.
  const TERRAIN_MAX_ZOOM = 10.5;
  let ready = false, terrainOn = false;
  function syncTerrain() {
    if (!ready) return;
    const want = use3d && map.getZoom() < (terrainOn ? TERRAIN_MAX_ZOOM + 0.5 : TERRAIN_MAX_ZOOM);
    if (want === terrainOn) return;
    terrainOn = want;
    map.setTerrain(want ? { source: "dem", exaggeration: 1.4 } : null);
  }
  function applyTerrain() {
    if (!ready) return;
    syncTerrain();
    $("mode3d").textContent = use3d ? t("mode3d") + " ✓" : t("mode2d");
  }
  map.on("zoom", syncTerrain);

  const dataReady = Promise.all([
    fetch("data/places.json", { cache: "no-cache" }).then((r) => r.json()),
    fetch("data/cities.json").then((r) => r.json())
  ]).then(([p, c]) => {
    places = p; cities = c;
    places.forEach((x) => (byId[x.id] = x));
    cities.forEach((x) => (cityById[x.id] = x));
    renderChips();
    renderTexts();
    const id = params.get("id");
    if (id && byId[id]) $("enterBtn").dataset.target = id;
    else if (params.get("city") && cityById[params.get("city")]) $("enterBtn").dataset.city = params.get("city");
  });
  const styleReady = new Promise((res) => (map.style && map.style._loaded ? res() : map.once("style.load", res)));
  styleReady.then(() => {
    ready = true;
    applyTerrain();
    return dataReady;
  }).then(pushData);

  function pushData() {
    map.getSource("capitals").setData({ type: "FeatureCollection", features: cities.map((c) => ({
      type: "Feature", properties: { fa: c.fa, en: c.en, big: TOP_CITIES.includes(c.id) },
      geometry: { type: "Point", coordinates: [c.lng, c.lat] } })) });
    const pts = [], polys = [];
    for (const p of places) {
      const color = catOf(p).color;
      const props = { id: p.id, color, label: pName(p), vision: p.category === "vision",
        height: p.height || 30 };
      pts.push({ type: "Feature", id: p.id, properties: props, geometry: { type: "Point", coordinates: [p.lng, p.lat] } });
      polys.push({ type: "Feature", id: p.id, properties: props, geometry: { type: "Polygon", coordinates: square(p.lng, p.lat, p.size || 40) } });
    }
    map.getSource("places").setData({ type: "FeatureCollection", features: pts });
    map.getSource("footprints").setData({ type: "FeatureCollection", features: polys });
  }

  ["place-footprint", "place-halo", "place-dot", "place-label", "place-label-small"].forEach((layer) => {
    map.on("click", layer, (e) => {
      const f = e.features && e.features[0];
      if (f) openPlace(f.properties.id, true);
    });
    map.on("mouseenter", layer, () => (map.getCanvas().style.cursor = "pointer"));
    map.on("mouseleave", layer, () => (map.getCanvas().style.cursor = ""));
  });

  // ── card ─────────────────────────────────────────────────
  function setSel(id, on) {
    if (!id) return;
    map.setFeatureState({ source: "places", id }, { sel: on });
    map.setFeatureState({ source: "footprints", id }, { sel: on });
  }

  function openPlace(id, fly) {
    const p = byId[id];
    if (!p) return;
    setSel(current, false);
    current = id;
    setSel(id, true);
    const cat = catOf(p);
    $("cardCat").textContent = lang === "en" ? cat.en : cat.fa;
    $("cardCat").style.background = cat.color;
    $("cardName").textContent = pName(p);
    $("cardSub").textContent = [cName(cityById[p.city]), p.day != null ? t("dayN", { n: num(p.day) }) : ""].filter(Boolean).join(" · ");
    $("cardText").textContent = pText(p) || "";
    $("cardOwner").textContent = p.owner ? t("by", { o: p.example && lang === "en" ? t("example") : p.owner }) : "";
    const ig = $("cardIg");
    if (p.instagram) { ig.href = "https://instagram.com/" + encodeURIComponent(p.instagram); ig.textContent = "@" + p.instagram; ig.hidden = false; }
    else ig.hidden = true;
    $("toast").hidden = true;
    $("card").hidden = false;
    const u = new URL(location.href);
    u.searchParams.set("id", id);
    u.searchParams.delete("city");
    history.replaceState(null, "", u);
    if (fly) {
      // Pick a zoom where the footprint fills roughly an eighth of the screen.
      const size = p.size || 40;
      const px = 0.12 * Math.min(window.innerWidth, window.innerHeight);
      const zoom = Math.max(12, Math.min(15.8, Math.log2((156543 * Math.cos((p.lat * Math.PI) / 180) * px) / size)));
      map.flyTo({ center: [p.lng, p.lat], zoom,
        pitch: size >= 200 ? 55 : 62, bearing: (map.getBearing() + 25) % 360, speed: 0.9, curve: 1.5, essential: true,
        padding: window.innerWidth <= 640 ? { bottom: window.innerHeight * 0.35 } : { right: 0 } });
    }
  }

  function closeCard() {
    $("card").hidden = true;
    setSel(current, false);
    current = null;
    const u = new URL(location.href);
    u.searchParams.delete("id");
    history.replaceState(null, "", u);
  }
  $("cardClose").onclick = closeCard;

  function toast(msg) { const el = $("toast"); el.textContent = msg; el.hidden = false; }

  $("shareBtn").onclick = async () => {
    const p = byId[current];
    if (!p) return;
    const u = new URL(location.href);
    u.search = "?id=" + encodeURIComponent(p.id);
    const data = { title: pName(p) + " · " + CFG.name[lang], text: pName(p), url: u.toString() };
    try {
      if (navigator.share) { await navigator.share(data); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(u.toString()); } catch (e) { /* ignore */ }
    toast(t("copied"));
  };

  // ── cities ─────────────────────────────────────────────
  function renderChips() {
    const box = $("cityChips");
    box.innerHTML = "";
    const order = [...TOP_CITIES, ...cities.map((c) => c.id).filter((id) => !TOP_CITIES.includes(id))];
    for (const id of order) {
      const c = cityById[id];
      if (!c) continue;
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = cName(c);
      b.onclick = () => flyCity(id);
      b.dataset.id = id;
      box.appendChild(b);
    }
  }
  function flyCity(id) {
    const c = cityById[id];
    if (!c) return;
    closeCard();
    document.querySelectorAll(".chips button").forEach((b) => b.classList.toggle("on", b.dataset.id === id));
    map.flyTo({ center: [c.lng, c.lat], zoom: c.zoom + 1, pitch: 60, bearing: -20, speed: 0.9, curve: 1.5, essential: true });
  }
  $("homeBtn").onclick = () => {
    closeCard();
    document.querySelectorAll(".chips button").forEach((b) => b.classList.remove("on"));
    map.flyTo({ ...IRAN_VIEW, speed: 0.8, essential: true });
  };
  $("mode3d").onclick = () => {
    use3d = !use3d;
    applyTerrain();
    if (!use3d) map.easeTo({ pitch: 0 });
  };

  // ── search ────────────────────────────────────────────────
  const input = $("search"), results = $("results");
  let hits = [], active = -1;
  input.addEventListener("input", () => {
    const q = norm(input.value.trim());
    if (!q) { results.hidden = true; return; }
    const ps = places.filter((p) =>
      [p.name, p.name_en, p.owner, p.instagram, p.id, cName(cityById[p.city]), cityById[p.city] && cityById[p.city].en]
        .some((s) => norm(s).includes(q))).slice(0, 8).map((p) => ({ kind: "p", p }));
    const cs = cities.filter((c) => norm(c.fa).includes(q) || norm(c.en).includes(q)).slice(0, 4).map((c) => ({ kind: "c", c }));
    hits = [...ps, ...cs];
    active = -1;
    results.innerHTML = "";
    if (!hits.length) {
      const li = document.createElement("li"); li.textContent = t("noResult"); results.appendChild(li);
    }
    hits.forEach((h, i) => {
      const li = document.createElement("li");
      const strong = document.createElement("span");
      const small = document.createElement("small");
      if (h.kind === "p") {
        strong.textContent = pName(h.p);
        small.textContent = [cName(cityById[h.p.city]), lang === "en" ? catOf(h.p).en : catOf(h.p).fa].join(" · ");
      } else {
        strong.textContent = cName(h.c);
        small.textContent = "📍";
      }
      li.append(strong, small);
      li.onclick = () => choose(i);
      results.appendChild(li);
    });
    results.hidden = false;
  });
  input.addEventListener("keydown", (e) => {
    if (results.hidden || !hits.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length;
      [...results.children].forEach((li, i) => li.classList.toggle("active", i === active));
    } else if (e.key === "Enter") {
      choose(active < 0 ? 0 : active);
    } else if (e.key === "Escape") { results.hidden = true; }
  });
  function choose(i) {
    const h = hits[i];
    if (!h) return;
    results.hidden = true;
    input.value = "";
    input.blur();
    if (h.kind === "p") openPlace(h.p.id, true); else flyCity(h.c.id);
  }
  document.addEventListener("click", (e) => { if (!e.target.closest(".search")) results.hidden = true; });

  // ── intro ───────────────────────────────────────────────
  $("enterBtn").onclick = async () => {
    $("intro").hidden = true;
    await dataReady.catch(() => {});
    const target = $("enterBtn").dataset.target, city = $("enterBtn").dataset.city;
    map.flyTo({ ...IRAN_VIEW, duration: 3200, essential: true });
    if (target) map.once("moveend", () => setTimeout(() => openPlace(target, true), 300));
    else if (city) map.once("moveend", () => setTimeout(() => flyCity(city), 300));
  };

  // ── add dialog ───────────────────────────────────────
  $("addBtn").onclick = () => {
    $("template").textContent = t("template", { name: CFG.name[lang] });
    const ig = $("igLink");
    if (CFG.instagram) { ig.href = "https://instagram.com/" + encodeURIComponent(CFG.instagram); ig.textContent = "@" + CFG.instagram; ig.hidden = false; }
    $("addModal").hidden = false;
  };
  $("addClose").onclick = () => ($("addModal").hidden = true);
  $("addModal").addEventListener("click", (e) => { if (e.target.id === "addModal") $("addModal").hidden = true; });
  $("copyTpl").onclick = async () => {
    try { await navigator.clipboard.writeText(t("template", { name: CFG.name[lang] })); } catch (e) { /* ignore */ }
    $("copyTpl").textContent = "✓ " + t("copy");
    setTimeout(() => ($("copyTpl").textContent = t("copy")), 2000);
  };

  // ── admin: ?pick=1 → tap the map to get a ready-made entry ──
  if (params.has("pick")) {
    map.on("click", (e) => {
      const lng = +e.lngLat.lng.toFixed(5), lat = +e.lngLat.lat.toFixed(5);
      const near = cities.reduce((b, c) => {
        const d = (c.lng - lng) ** 2 + (c.lat - lat) ** 2;
        return !b || d < b.d ? { id: c.id, d } : b;
      }, null);
      const entry = {
        id: "new-" + Date.now().toString(36), day: 0, category: "brand", city: near ? near.id : "tehran",
        lng, lat, size: 40, height: 40, name: "", name_en: "", owner: "ناشناس", instagram: "", text: "", text_en: ""
      };
      const json = JSON.stringify(entry, null, 2).replace(/\n/g, "\n  ");
      closeCard();
      $("template").textContent = "  " + json + ",";
      $("addModal").hidden = false;
      $("copyTpl").onclick = async () => { try { await navigator.clipboard.writeText("  " + json + ","); } catch (err) {} $("copyTpl").textContent = "✓"; };
    });
  }

  // ── language ──────────────────────────────────────────────────
  function renderTexts() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const k = el.dataset.i18n;
      el.textContent = k === "name" ? CFG.name[lang] : t(k);
    });
    document.querySelectorAll("[data-i18n-ph]").forEach((el) => (el.placeholder = t(el.dataset.i18nPh)));
    $("langBtn").textContent = lang === "fa" ? "EN" : "فا";
    const day = CFG.dayOverride != null ? CFG.dayOverride : places.reduce((m, p) => Math.max(m, p.day || 0), 0);
    $("dayLabel").textContent = t("day", { n: num(day) }) + " · " + t("places", { n: num(places.length) });
    applyTerrain();
    if (ready && map.getLayer("place-city")) {
      ["place-city", "place-town", "place-small"].forEach((l) => map.setLayoutProperty(l, "text-field", labelField()));
      map.setLayoutProperty("water-name", "text-field", labelField());
      map.setLayoutProperty("seas", "text-field", ["get", lang]);
      map.setLayoutProperty("capitals", "text-field", ["get", lang]);
      map.setLayoutProperty("country-name", "text-field", lang === "en" ? "IRAN" : "ایران");
      if (places.length && map.getSource("places")) pushData();
    }
    if (current) openPlace(current, false);
    if (cities.length) renderChips();
  }
  $("langBtn").onclick = () => {
    lang = lang === "fa" ? "en" : "fa";
    localStorage.setItem("farda-lang", lang);
    renderTexts();
  };
  renderTexts();
})();
