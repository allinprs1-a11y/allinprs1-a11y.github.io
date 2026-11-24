// Project intro video (?reel=intro): "let's rebuild Iran", with the list of things people can do.
// Based on: "their names must not be forgotten".
// Dark city, glowing Javidnam streets, a call to write the names of the Javidnaman in the comments.
// Frame-exact: window.FARDA.reelSeek(t) is used by the renderer; ▶ plays it live.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F || F.params.get("reel") !== "intro") return;
  const map = F.map;
  document.body.classList.add("tour");

  const SCRIPT = {
    fa: [
      "اگه فردا برگردی ایران، چی می‌سازی؟",
      "این ایرانِ فرداست.",
      "ما داریم ایران رو با هم از نو می‌سازیم، روی یه نقشه‌ی سه‌بعدی.",
      "دریاچه‌ی ارومیه، دوباره پر می‌شه.",
      "زاینده‌رود، همیشه جاری.",
      "قطار سریع: تهران تا مشهد، زیر چهار ساعت.",
      "اینترنتِ آزاد، برای همه.",
      "برگشتن مهندس‌ها، به دره‌ی فناوری پردیس.",
      "کیش، قلب مالی خلیج فارس.",
      "تخت جمشید، میزبان میلیون‌ها گردشگر.",
      "برق خورشیدی، از دل کویر.",
      "کنسرت، سینما و موسیقیِ آزاد.",
      "و کافه، برند و کسب‌وکارِ خودت.",
      "تو چی می‌سازی؟ زیر همین پست بنویس، روی نقشه می‌سازیمش."
    ],
    en: [
      "If you went back to Iran tomorrow, what would you build?",
      "This is the Iran of tomorrow.",
      "Together we are rebuilding Iran, on a 3D map.",
      "Lake Urmia fills up again.",
      "The Zayandeh Rud, always flowing.",
      "High-speed rail: Tehran to Mashhad in under four hours.",
      "Free internet, for everyone.",
      "Engineers coming home, to the Pardis tech valley.",
      "Kish, the financial heart of the Persian Gulf.",
      "Persepolis, host to millions of visitors.",
      "Solar power, from the heart of the desert.",
      "Free concerts, cinema and music.",
      "And your own café, brand and business.",
      "What will you build? Comment below and we'll build it on the map."
    ]
  };
  const CUES = [0.42, 3.81, 5.89, 11.27, 14.14, 16.7, 20.75, 23.31, 27.65, 30.79, 34.69, 37.52, 41.11, 45.19];
  const END = 52.0;

  const cap = document.createElement("div");
  cap.className = "tour-cap reel-cap";
  const start = document.createElement("button");
  start.className = "primary big tour-start"; start.type = "button"; start.textContent = "▶";
  const end = document.createElement("div");
  end.className = "reel-end";
  document.body.append(cap, start, end);

  const L = () => F.memorialList || [];
  const byOld = (city, word) => L().find((m) => m.city === city && m.old.includes(word)) || L().find((m) => m.city === city);
  const main = () => L().find((m) => m.id === "jn-mahdavi") || L()[0];

  function line(i) {
    const m = main();
    return (SCRIPT[F.lang] || SCRIPT.fa)[i].replace("{name}", m ? m.name : "").replace("{n}", F.num(L().length));
  }
  function say(i) {
    cap.textContent = "";
    const s = document.createElement("strong");
    s.textContent = line(i);
    cap.appendChild(s);
    cap.classList.add("show");
  }

  // ── camera helpers ───────────────────────────────────────
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const lerp = (a, b, k) => a + (b - a) * k;
  const merc = ([lng, lat]) => [(lng + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2];
  const unmerc = ([x, y]) => [x * 360 - 180, (360 / Math.PI) * Math.atan(Math.exp(Math.PI * (1 - 2 * y))) - 90];
  const bLerp = (a, b, k) => a + ((((b - a + 540) % 360) - 180) * k);
  const span = (za, zb, z) => { const a = Math.pow(2, -za), b = Math.pow(2, -zb); return Math.abs(b - a) < 1e-12 ? 1 : (Math.pow(2, -z) - a) / (b - a); };
  function flyCam(A, B, k) {
    const e = ease(k), ma = merc(A.c), mb = merc(B.c);
    const zfit = Math.log2(0.6 / Math.max(Math.hypot(mb[0] - ma[0], mb[1] - ma[1]), 1e-9));
    const zmid = Math.min(A.z, B.z, zfit);
    let z, w;
    if (zmid < Math.min(A.z, B.z) - 0.05) {
      if (e < 0.5) { z = lerp(A.z, zmid, e * 2); w = 0.5 * span(A.z, zmid, z); }
      else { z = lerp(zmid, B.z, (e - 0.5) * 2); w = 0.5 + 0.5 * span(zmid, B.z, z); }
    } else { z = lerp(A.z, B.z, e); w = Math.abs(A.z - B.z) > 0.05 ? span(A.z, B.z, z) : e; }
    return { c: unmerc([lerp(ma[0], mb[0], w), lerp(ma[1], mb[1], w)]), z, p: lerp(A.p, B.p, e), b: bLerp(A.b, B.b, e) };
  }
  const easeCam = (A, B, k) => ({ c: [lerp(A.c[0], B.c[0], k), lerp(A.c[1], B.c[1], k)], z: lerp(A.z, B.z, k), p: lerp(A.p, B.p, k), b: bLerp(A.b, B.b, k) });
  const cut = (A, B) => (k) => easeCam(A, B, k);
  function streetCam(st, fill) {
    const pts = st.lines.flat(), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const c = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
    const w = (Math.max(...xs) - Math.min(...xs)) * 111320 * Math.cos((c[1] * Math.PI) / 180);
    const h = (Math.max(...ys) - Math.min(...ys)) * 110570;
    const px = (fill || 0.55) * Math.min(window.innerWidth, window.innerHeight);
    const z = Math.min(16.5, Math.log2((156543 * Math.cos((c[1] * Math.PI) / 180) * px) / Math.max(w, h, 300)));
    return { c, z, p: 58, b: h >= w ? 0 : 90 };
  }

  let plan = null, lastCue = -1;
  function buildPlan() {
    const P = (id) => F.byId[id];
    const at = (p, z, pitch, b) => ({ c: [p.lng, p.lat], z, p: pitch, b });
    const IRo = { c: [40, 28], z: 1.6, p: 0, b: 0 };
    const IR = { c: F.IRAN_VIEW.center, z: 4.7, p: 32, b: 0 }, IRb = { ...IR, z: 4.95, b: -8 };
    const UR = { c: [45.55, 37.62], z: 8.3, p: 48, b: -12 }, URb = { ...UR, z: 8.6, b: 10 };
    const RA = { c: [52.4, 34.8], z: 5.7, p: 45, b: -4 }, RAb = { ...RA, z: 5.95, b: 10 };
    const pa = P("dare-fanavari-pardis"), ki = P("markaz-mali-kish"), so = P("kamarband-khorshidi-yazd");
    const PA = at(pa, 14.6, 60, 20), PAb = { ...PA, b: 55 };
    const KI = at(ki, 14.4, 60, -20), KIb = { ...KI, b: 15 };
    const PE = { c: [52.8906, 29.9348], z: 16.1, p: 58, b: -30 }, PEb = { ...PE, b: 10 };
    const SO = at(so, 14.1, 55, 10), SOb = { ...SO, b: 40 };
    const IR3 = { c: F.IRAN_VIEW.center, z: 4.8, p: 34, b: -8 }, IR3b = { ...IR3, b: 10 };
    return [
      [0, 5.89, IRo, IRo, easeCam],
      [5.89, 8.2, IRo, IR, flyCam], [8.2, 11.27, IR, IRb, easeCam],
      [11.27, 12.6, IRb, UR, flyCam], [12.6, 16.7, UR, URb, easeCam],
      [16.7, 23.31, RA, RAb, easeCam],
      [23.31, 27.65, PA, PAb, easeCam],
      [27.65, 28.9, PAb, KI, flyCam], [28.9, 30.79, KI, KIb, easeCam],
      [30.79, 32.0, KIb, PE, flyCam], [32.0, 34.69, PE, PEb, easeCam],
      [34.69, 35.8, PEb, SO, flyCam], [35.8, 45.19, SO, SOb, easeCam],
      [45.19, END, IR3, IR3b, easeCam]
    ];
  }

  let styled = false;
  const DAY_LAYERS = ["place-halo", "place-dot", "place-label", "place-label-small", "place-footprint"];
  const BASE = { "place-label": ["get", "vision"], "place-label-small": ["!", ["get", "vision"]] };
  function styleOnce() {
    if (styled || !map.getLayer("memorial-line")) return;
    styled = true;
    map.setPaintProperty("memorial-line", "line-width", ["interpolate", ["linear"], ["zoom"], 10, 2.2, 13, 4, 16, 8]);
    map.setPaintProperty("memorial-glow", "line-width", ["interpolate", ["linear"], ["zoom"], 10, 8, 13, 16, 16, 34]);
    map.setPaintProperty("memorial-glow", "line-opacity", 0.9);
    // rows of solar panels around the desert solar belt
    const so = F.byId["kamarband-khorshidi-yazd"];
    if (so && !map.getSource("solar-rows")) {
      const feats = [], dx = (m) => m / (111320 * Math.cos((so.lat * Math.PI) / 180)), dy = (m) => m / 110570;
      for (let r = -22; r <= 22; r++) for (let c = -3; c <= 3; c++) {
        const x = so.lng + dx(c * 190), y = so.lat + dy(r * 26), w = dx(80), h = dy(8);
        feats.push({ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[x - w, y - h], [x + w, y - h], [x + w, y + h], [x - w, y + h], [x - w, y - h]]] } });
      }
      map.addSource("solar-rows", { type: "geojson", data: { type: "FeatureCollection", features: feats } });
      map.addLayer({ id: "solar-rows", type: "fill-extrusion", source: "solar-rows", minzoom: 11,
        paint: { "fill-extrusion-color": "#3d6fd1", "fill-extrusion-height": 4, "fill-extrusion-base": 1, "fill-extrusion-opacity": 0.95 } }, "place-footprint");
      map.setLayoutProperty("place-footprint", "visibility", "visible");
    }
  }
  let lastDay = null;
  function dayFilter(d) {
    if (d === lastDay) return; lastDay = d;
    DAY_LAYERS.forEach((l) => {
      if (!map.getLayer(l)) return;
      const f = d == null ? null : ["<=", ["get", "day"], d];
      map.setFilter(l, f == null ? (BASE[l] || null) : (BASE[l] ? ["all", BASE[l], f] : f));
    });
  }

  function seek(t) {
    styleOnce();
    if (!plan) plan = buildPlan();
    const s = plan.find((x) => t >= x[0] && t <= x[1]) || plan[plan.length - 1];
    const cam = s[4](s[2], s[3], clamp01((t - s[0]) / (s[1] - s[0])));
    map.jumpTo({ center: cam.c, zoom: cam.z, pitch: cam.p, bearing: cam.b });
    let cue = -1; CUES.forEach((c, i) => { if (t >= c) cue = i; });
    if (cue !== lastCue) { lastCue = cue; if (cue >= 0) say(cue); else cap.classList.remove("show"); }
    end.classList.toggle("show", t >= 46.4);
    if (t >= 46.4) end.textContent = "@" + (F.CFG.instagram || "");
    if (map.getLayer("place-footprint")) map.setFilter("place-footprint", t >= 34.69 && t < 45.19 ? ["!=", ["get", "id"], "kamarband-khorshidi-yazd"] : null);
    if (t >= 45.19) dayFilter(Math.floor(clamp01((t - 45.4) / 3.0) * 14)); else dayFilter(null);
  }
  F.reelSeek = seek;

  // live playback (for screen recording on a phone)
  function run() {
    start.hidden = true;
    const t0 = performance.now();
    (function tick() {
      const t = (performance.now() - t0) / 1000;
      seek(Math.min(t, END));
      if (t < END) requestAnimationFrame(tick);
    })();
  }
  F.ready.then(() => {
    document.getElementById("intro").hidden = true;
    start.onclick = run;
  });
})();
