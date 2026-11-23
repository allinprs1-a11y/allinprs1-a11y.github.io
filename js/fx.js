// Visual effects: pulsing lights, growing buildings, animated rail lines and Lake Urmia.
// Everything animated stops when the tab is hidden, in lite mode, or with reduced motion.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F) return;
  const map = F.map;

  // ── one shared animation loop (~30 fps) ─────────────────
  const tasks = new Set();
  let raf = 0, last = 0;
  const canAnimate = () => !F.reduceMotion && !F.lite && !document.hidden;
  function loop(ts) {
    raf = 0;
    if (!tasks.size || !canAnimate()) return;
    if (ts - last > 33) {
      last = ts;
      tasks.forEach((fn) => { if (fn(ts) === false) tasks.delete(fn); });
    }
    raf = requestAnimationFrame(loop);
  }
  function kick() { if (!raf && tasks.size && canAnimate()) raf = requestAnimationFrame(loop); }
  function addTask(fn) { tasks.add(fn); kick(); }
  document.addEventListener("visibilitychange", kick);
  F.on("lite", kick);
  F.anim = addTask;

  // ── data for national projects ──────────────────────────
  const C = (id) => { const c = F.cityById[id]; return [c.lng, c.lat]; };
  function railLines() {
    const routes = [
      [C("tehran"), C("qom"), C("isfahan"), C("shiraz")],
      [C("tehran"), C("semnan"), [54.97, 36.42], [57.68, 36.21], [58.8, 36.21], C("mashhad")],
      [C("tehran"), C("qazvin"), C("zanjan"), C("tabriz")]
    ];
    return { type: "FeatureCollection", features: routes.map((r) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: r } })) };
  }
  // Approximate outline of Lake Urmia at full level.
  const URMIA = [[45.36, 38.18], [45.62, 38.27], [45.78, 38.12], [45.86, 37.92], [45.98, 37.74], [46.05, 37.55],
    [45.95, 37.33], [45.78, 37.12], [45.55, 37.05], [45.37, 37.18], [45.3, 37.4], [45.27, 37.62], [45.3, 37.88],
    [45.33, 38.05], [45.36, 38.18]];

  F.ready.then(() => {
    map.addSource("rail", { type: "geojson", data: railLines() });
    map.addSource("urmia", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [URMIA] } } });

    map.addLayer({ id: "urmia-water", type: "fill", source: "urmia", maxzoom: 12,
      paint: { "fill-color": "#2ec4b6", "fill-opacity": 0.4, "fill-outline-color": "#7ff5e8" } }, "provinces");
    map.addLayer({ id: "rail-glow", type: "line", source: "rail", maxzoom: 10,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": "#2ec4b6", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 3, 9, 8], "line-blur": 4, "line-opacity": 0.35 } }, "place-halo");
    map.addLayer({ id: "rail-flow", type: "line", source: "rail", maxzoom: 10,
      layout: { "line-cap": "butt", "line-join": "round" },
      paint: { "line-color": "#c8fff8", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.2, 9, 3], "line-dasharray": [0, 4, 3] } }, "place-halo");

    // Moving dashes along the rail lines (technique from the MapLibre "animate a line" example).
    const dashes = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0],
      [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];
    let step = -1;
    addTask((ts) => {
      if (map.getZoom() > 10) return;
      const s = Math.floor(ts / 70) % dashes.length;
      if (s !== step) { step = s; map.setPaintProperty("rail-flow", "line-dasharray", dashes[s]); }
    });

    // Breathing lights on every building + living water in Lake Urmia.
    addTask((ts) => {
      const k = (Math.sin(ts / 650) + 1) / 2;
      map.setPaintProperty("place-halo", "circle-opacity",
        ["case", ["boolean", ["feature-state", "sel"], false], 0.95, 0.3 + 0.45 * k]);
      if (map.getZoom() < 12) map.setPaintProperty("urmia-water", "fill-opacity", 0.3 + 0.2 * k);
    });
  });

  // ── satellite mode (EOxCloudless 2016, CC BY 4.0) ───────
  const SAT_ATTR = 'EOxCloudless <a href="https://cloudless.eox.at" target="_blank">https://cloudless.eox.at</a> by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016 &amp; 2017)';
  const HIDE_IN_SAT = ["bg-dim", "landcover", "sand", "landuse", "park", "water", "hillshade", "mask"];
  let sat = false;
  function setSat(on) {
    sat = on;
    if (!map.getSource("sat")) {
      map.addSource("sat", { type: "raster", tileSize: 256, maxzoom: 15, attribution: SAT_ATTR,
        tiles: ["https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless_3857/default/g/{z}/{y}/{x}.jpg"] });
      map.addLayer({ id: "satellite", type: "raster", source: "sat",
        paint: { "raster-saturation": 0.15, "raster-contrast": 0.1, "raster-brightness-max": 0.92 } }, "landcover");
      map.addLayer({ id: "sat-mask", type: "fill", source: "mask", paint: { "fill-color": "#070c18", "fill-opacity": 0.45 } }, "provinces");
    }
    map.setLayoutProperty("satellite", "visibility", on ? "visible" : "none");
    map.setLayoutProperty("sat-mask", "visibility", on ? "visible" : "none");
    HIDE_IN_SAT.forEach((l) => map.getLayer(l) && map.setLayoutProperty(l, "visibility", on ? "none" : "visible"));
    const b = document.getElementById("satBtn");
    b.textContent = F.t("sat") + (on ? " ✓" : "");
    b.classList.toggle("on", on);
    const u = new URL(location.href);
    if (on) u.searchParams.set("sat", "1"); else u.searchParams.delete("sat");
    history.replaceState(null, "", u);
  }
  F.ready.then(() => {
    document.getElementById("satBtn").onclick = () => setSat(!sat);
    if (F.params.get("sat") === "1") setSat(true);
  });
  F.on("lang", () => { document.getElementById("satBtn").textContent = F.t("sat") + (sat ? " ✓" : ""); });

  // ── growing building ────────────────────────────────────
  function grow(id) {
    if (!canAnimate()) return;
    const start = performance.now(), dur = 1800;
    map.setFeatureState({ source: "footprints", id }, { grow: 0.02 });
    addTask((ts) => {
      const x = Math.min(1, (ts - start) / dur);
      const e = 1 - Math.pow(1 - x, 3);
      map.setFeatureState({ source: "footprints", id }, { grow: Math.max(0.02, e) });
      return x < 1;
    });
  }
  F.grow = grow;
  F.on("open", ({ id, fly }) => {
    if (!fly) return;
    map.once("moveend", () => grow(id));
  });
})();
