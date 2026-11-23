// Memorial video (?reel=2): "their names must not be forgotten".
// Dark city, glowing Javidnam streets, a call to write the names of the Javidnaman in the comments.
// Frame-exact: window.FARDA.reelSeek(t) is used by the renderer; ▶ plays it live.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F || F.params.get("reel") !== "2") return;
  const map = F.map;
  document.body.classList.add("tour");

  const SCRIPT = {
    fa: [
      "اسمشون نباید فراموش بشه.",
      "۱۸ و ۱۹ دی ۱۴۰۴",
      "هزاران نفر جانشون رو دادن.",
      "در ایرانِ فردا، خیابون‌ها به اسم اونا نام‌گذاری می‌شن.",
      "این خیابون پیش‌تر «شهید عراقی» بود…",
      "حالا «خیابان جاویدنام {name}»",
      "اصفهان… کرمان… مشهد…",
      "تا امروز {n} خیابان",
      "اسم جاویدنامِ شهرت رو زیر همین پست بنویس",
      "تا یه خیابون یا کوچه به اسمش بزنیم.",
      "یادشون جاودان"
    ],
    en: [
      "Their names must not be forgotten.",
      "8 and 9 January 2026",
      "Thousands gave their lives.",
      "In Iran Farda, streets are named after them.",
      "This street used to be “Shahid Araghi”…",
      "Now it is “Javidnam {name} Street”",
      "Isfahan… Kerman… Mashhad…",
      "{n} streets so far",
      "Write the name of a Javidnam from your city below",
      "so we can name a street or an alley after them.",
      "Forever remembered"
    ]
  };
  // caption start times (s), matched to the edited voice-over
  const CUES = [0.36, 3.26, 7.45, 10.29, 15.0, 18.83, 23.92, 27.07, 30.12, 34.71, 38.42];
  const END = 41.5;

  const cap = document.createElement("div");
  cap.className = "tour-cap reel-cap";
  const start = document.createElement("button");
  start.className = "primary big tour-start"; start.type = "button"; start.textContent = "▶";
  const end = document.createElement("div");
  end.className = "reel-end";
  document.body.append(cap, start, end);

  const L = () => F.memorialList || [];
  const byOld = (city, word) => L().find((m) => m.city === city && m.old.includes(word)) || L().find((m) => m.city === city);
  const main = () => L().find((m) => m.id === "jn-15") || L().find((m) => m.city === "tehran") || L()[0];

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
    const IRo = { c: [40, 28], z: 1.6, p: 0, b: 0 };
    const IR = { c: F.IRAN_VIEW.center, z: 4.7, p: 30, b: 0 };
    const TH = { c: [51.39, 35.71], z: 11.2, p: 50, b: -12 };
    const THb = { ...TH, z: 11.9, b: 8 };
    const ST = streetCam(main()), STb = { ...ST, b: ST.b + 10, z: ST.z + 0.15 }, STc = { ...ST, b: ST.b + 22, z: ST.z + 0.3 };
    const cams = [byOld("isfahan", "مطهری"), byOld("kerman", "دستغیب"), byOld("mashhad", "")].map((s) => streetCam(s, 0.6));
    const drift = (C) => ({ ...C, b: C.b + 8, z: C.z + 0.12 });
    const IR2 = { c: F.IRAN_VIEW.center, z: 4.9, p: 34, b: -6 }, IR2b = { ...IR2, b: 6 }, IR2c = { ...IR2, b: 12 };
    return [
      [0, 3.0, IRo, IR, flyCam], [3.0, 3.26, IR, IR, easeCam],
      [3.26, 5.2, IR, TH, flyCam], [5.2, 10.29, TH, THb, easeCam],
      [10.29, 12.1, THb, ST, flyCam], [12.1, 18.83, ST, STb, easeCam], [18.83, 23.92, STb, STc, easeCam],
      [23.92, 24.97, cams[0], drift(cams[0]), easeCam], [24.97, 26.02, cams[1], drift(cams[1]), easeCam], [26.02, 27.07, cams[2], drift(cams[2]), easeCam],
      [27.07, 29.0, drift(cams[2]), IR2, flyCam], [29.0, 34.71, IR2, IR2b, easeCam], [34.71, END, IR2b, IR2c, easeCam]
    ];
  }

  // dark city, bright memorial lines
  const DARK_STOPS = [0, "#1a1a2c", 15, "#232235", 40, "#2e2b3d", 90, "#3a3444", 180, "#4a4050"];
  let styled = false;
  function styleOnce() {
    if (styled || !map.getLayer("memorial-line")) return;
    styled = true;
    map.setPaintProperty("buildings", "fill-extrusion-color-transition", { duration: 0, delay: 0 });
    map.setPaintProperty("buildings", "fill-extrusion-color", ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 8], ...DARK_STOPS]);
    map.setPaintProperty("memorial-line", "line-width", ["interpolate", ["linear"], ["zoom"], 10, 2.2, 13, 4, 16, 8]);
    map.setPaintProperty("memorial-glow", "line-width", ["interpolate", ["linear"], ["zoom"], 10, 8, 13, 16, 16, 34]);
    map.setPaintProperty("memorial-glow", "line-opacity", 0.9);
    ["place-halo", "place-dot", "place-label", "place-label-small", "place-footprint", "rail-flow", "rail-glow"].forEach((l) => map.getLayer(l) && map.setLayoutProperty(l, "visibility", "none"));
  }

  function seek(t) {
    styleOnce();
    if (!plan) plan = buildPlan();
    const s = plan.find((x) => t >= x[0] && t <= x[1]) || plan[plan.length - 1];
    const cam = s[4](s[2], s[3], clamp01((t - s[0]) / (s[1] - s[0])));
    map.jumpTo({ center: cam.c, zoom: cam.z, pitch: cam.p, bearing: cam.b });
    let cue = -1; CUES.forEach((c, i) => { if (t >= c) cue = i; });
    if (cue !== lastCue) { lastCue = cue; if (cue >= 0) say(cue); else cap.classList.remove("show"); }
    end.classList.toggle("show", t >= CUES[10]);
    if (t >= CUES[10]) end.textContent = "@" + (F.CFG.instagram || "") + "  ·  " + (F.CFG.publicHost || location.host);
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
