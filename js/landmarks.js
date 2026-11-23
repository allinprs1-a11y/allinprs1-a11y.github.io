// Landmarks: golden spotlights on monuments that OpenStreetMap already draws in 3D,
// and a hand-built Persepolis (terrace + column halls), which the tiles do not have.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F) return;
  const map = F.map;

  const SPOTS = [
    { fa: "برج آزادی", en: "Azadi Tower", c: [51.338, 35.6997] },
    { fa: "برج میلاد", en: "Milad Tower", c: [51.3753, 35.7448] },
    { fa: "میدان نقش جهان", en: "Naqsh-e Jahan Square", c: [51.6778, 32.6575] },
    { fa: "تخت جمشید", en: "Persepolis", c: [52.8906, 29.9348] },
    { fa: "ارگ بم", en: "Arg-e Bam", c: [58.3685, 29.1197] }
  ];

  // metres → degrees around a latitude
  const dx = (m, lat) => m / (111320 * Math.cos((lat * Math.PI) / 180));
  const dy = (m) => m / 110570;
  function rect(lng, lat, w, h) {
    const x = dx(w / 2, lat), y = dy(h / 2);
    return [[[lng - x, lat - y], [lng + x, lat - y], [lng + x, lat + y], [lng - x, lat + y], [lng - x, lat - y]]];
  }
  function columns(lng, lat, n, spacing, size, base, top, color) {
    const out = [], off = ((n - 1) * spacing) / 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = lng + dx(i * spacing - off, lat), y = lat + dy(j * spacing - off);
      out.push({ type: "Feature", properties: { base, height: top, color }, geometry: { type: "Polygon", coordinates: rect(x, y, size, size) } });
    }
    return out;
  }
  function persepolis() {
    const lat = 29.9348, lng = 52.8906, stone = "#cdb08a", col = "#f1d7a8";
    const at = (mx, my) => [lng + dx(mx, lat), lat + dy(my)];      // offset in metres from the terrace centre
    const box = (mx, my, w, h, base, height, color) => {
      const [x, y] = at(mx, my);
      return { type: "Feature", properties: { base, height, color }, geometry: { type: "Polygon", coordinates: rect(x, y, w, h) } };
    };
    const f = [];
    f.push(box(0, 0, 300, 450, 0, 12, "#7d6449"));                 // great terrace
    f.push(box(-75, 105, 112, 112, 12, 15, stone));                // Apadana platform
    f.push(...columns(...at(-75, 105), 6, 9, 2.2, 15, 35, col));    // 36 columns, 20 m
    f.push(box(65, -20, 72, 72, 12, 13, stone));                   // Hall of a Hundred Columns
    f.push(...columns(...at(65, -20), 10, 6.6, 1.8, 13, 24, col));  // 100 columns, 11 m
    [[-8, -6], [8, -6], [-8, 6], [8, 6]].forEach(([mx, my]) => f.push(box(-95 + mx, 190 + my, 4, 4, 12, 30, col))); // Gate of All Nations
    f.push(box(-70, 0, 30, 40, 12, 22, stone));                    // Tachara palace
    f.push(box(-40, -110, 60, 40, 12, 18, stone));                 // Hadish palace
    return { type: "FeatureCollection", features: f };
  }

  F.ready.then(() => {
    map.addSource("persepolis", { type: "geojson", data: persepolis() });
    map.addLayer({ id: "persepolis", type: "fill-extrusion", source: "persepolis", minzoom: 13,
      paint: { "fill-extrusion-color": ["get", "color"], "fill-extrusion-base": ["get", "base"],
        "fill-extrusion-height": ["get", "height"], "fill-extrusion-opacity": 0.97 } }, "place-footprint");

    map.addSource("spots", { type: "geojson", data: { type: "FeatureCollection", features: SPOTS.map((s) => ({
      type: "Feature", properties: { fa: s.fa, en: s.en }, geometry: { type: "Point", coordinates: s.c } })) } });
    map.addLayer({ id: "spot-light", type: "circle", source: "spots", minzoom: 11,
      paint: { "circle-color": "#ffcf7a", "circle-blur": 1, "circle-pitch-alignment": "map",
        "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 11, 8, 16, 160, 18, 640],
        "circle-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.25, 15, 0.5] } }, "buildings");
    map.addLayer({ id: "spot-label", type: "symbol", source: "spots", minzoom: 12,
      layout: { "text-field": ["get", F.lang], "text-font": ["Noto Sans Bold"], "text-size": 15,
        "text-offset": [0, -2.2], "text-anchor": "bottom", "text-allow-overlap": false },
      paint: { "text-color": "#ffcf7a", "text-halo-color": "#0b1324", "text-halo-width": 2 } });
  });
  F.on("lang", () => map.getLayer("spot-label") && map.setLayoutProperty("spot-label", "text-field", ["get", F.lang]));
})();
