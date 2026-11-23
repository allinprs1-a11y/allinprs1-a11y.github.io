// First-video mode (?reel=1): a fixed ~32-second script with large Persian captions,
// timed to be recorded on a phone and voiced over. Tap ▶ after you start recording.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F || !F.params.has("reel")) return;
  const map = F.map;
  document.body.classList.add("tour");
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Caption script. Each line is shown for its beat; keep it in sync with the voice-over text.
  const SCRIPT = {
    fa: [
      "اگه فردا برگردی ایران…",
      "کجا زندگی می‌کنی؟ چی می‌سازی؟",
      "روز اول. چراغ‌های تهران دوباره روشن شد.",
      "ما داریم ایران رو از نو می‌سازیم، روی این نقشه.",
      "کافه‌ی تو، برند تو، مدرسه‌ی تو…",
      "و خیابان‌ها به نام جاویدنامان.",
      "زیر همین پست بنویس: کدوم شهر؟ چی می‌سازی؟",
      "اینو بفرست برای کسی که می‌دونی برمی‌گرده."
    ],
    en: [
      "If you went back to Iran tomorrow…",
      "Where would you live? What would you build?",
      "Day one. Tehran's lights are back on.",
      "We're rebuilding Iran, on this map.",
      "Your café, your brand, your school…",
      "And streets named after the Javidnaman.",
      "Comment below: which city? what will you build?",
      "Send this to someone you know will go back."
    ]
  };

  const cap = document.createElement("div");
  cap.className = "tour-cap reel-cap";
  const start = document.createElement("button");
  start.className = "primary big tour-start"; start.type = "button"; start.textContent = "▶";
  const end = document.createElement("div");
  end.className = "reel-end";
  document.body.append(cap, start, end);

  function say(i) {
    if (document.body.classList.contains("render")) {
      cap.textContent = "";
      const s0 = document.createElement("strong");
      s0.textContent = (SCRIPT[F.lang] || SCRIPT.fa)[i];
      cap.appendChild(s0); cap.classList.add("show");
      return;
    }
    cap.classList.remove("show");
    setTimeout(() => {
      cap.textContent = "";
      const s = document.createElement("strong");
      s.textContent = (SCRIPT[F.lang] || SCRIPT.fa)[i];
      cap.appendChild(s);
      cap.classList.add("show");
    }, 250);
  }

  // Caption start times (seconds), matched to the recorded voice-over.
  const CUES = [0, 2.2, 5.8, 10.7, 15.2, 18.8, 22.7, 27.5];
  const END = 32;

  async function run() {
    start.hidden = true;
    const t0 = performance.now();
    const until = (sec) => sleep(Math.max(0, t0 + sec * 1000 - performance.now()));
    const lit = map.getPaintProperty("buildings", "fill-extrusion-color");
    const cafe = F.places.find((p) => p.id === "kafe-ketab-enghelab") || F.places.find((p) => p.category === "food") || F.places[0];
    const street = (F.memorialList || [])[0];

    // A · 0–2.2 s: hook — globe dives to Iran
    map.jumpTo({ center: [40, 28], zoom: 1.6, pitch: 0, bearing: 0 });
    say(0);
    map.flyTo({ ...F.IRAN_VIEW, zoom: 4.6, pitch: 30, duration: 2100, essential: true });
    await until(CUES[1]);
    // B · 2.2–5.8 s: the question
    say(1);
    map.easeTo({ zoom: 5.0, bearing: -12, pitch: 36, duration: 3500, easing: (x) => x, essential: true });
    await until(CUES[2]);
    // C · 5.8–10.7 s: Tehran at night, lights come on
    map.setPaintProperty("buildings", "fill-extrusion-color-transition", { duration: 0, delay: 0 });
    map.setPaintProperty("buildings", "fill-extrusion-color", "#12142a");
    say(2);
    map.flyTo({ center: [51.338, 35.7], zoom: 14.6, pitch: 62, bearing: 20, duration: 1900, essential: true });
    await until(7.9);
    map.setPaintProperty("buildings", "fill-extrusion-color-transition", { duration: 1800, delay: 0 });
    map.setPaintProperty("buildings", "fill-extrusion-color", lit);
    map.easeTo({ bearing: 48, duration: 2700, easing: (x) => x, essential: true });
    await until(CUES[3]);
    // D · 10.7–15.2 s: rebuilding — rail lines from above
    say(3);
    map.flyTo({ center: [49.8, 35.6], zoom: 5.9, pitch: 45, bearing: 0, duration: 1700, essential: true });
    await until(12.5);
    map.easeTo({ zoom: 6.2, bearing: 8, duration: 2600, easing: (x) => x, essential: true });
    await until(CUES[4]);
    // E · 15.2–18.8 s: your café rises
    say(4);
    if (cafe) {
      map.flyTo({ center: [cafe.lng, cafe.lat], zoom: F.zoomFor(cafe) - 0.2, pitch: 64, bearing: 35, duration: 1300, essential: true });
      await until(16.5);
      F.grow && F.grow(cafe.id);
      map.easeTo({ bearing: 62, duration: 2200, easing: (x) => x, essential: true });
    }
    await until(CUES[5]);
    // F · 18.8–22.7 s: a memorial street
    say(5);
    if (street) {
      const pts = street.lines.flat();
      const mid = pts[Math.floor(pts.length / 2)];
      map.flyTo({ center: mid, zoom: 15.2, pitch: 60, bearing: 0, duration: 1300, essential: true });
      await until(20.2);
      map.easeTo({ bearing: 20, duration: 2400, easing: (x) => x, essential: true });
    }
    await until(CUES[6]);
    // G · 22.7–27.5 s: the call to action
    say(6);
    map.flyTo({ ...F.IRAN_VIEW, zoom: 4.9, pitch: 38, bearing: -8, duration: 1600, essential: true });
    await until(24.4);
    map.easeTo({ bearing: 4, duration: 3000, easing: (x) => x, essential: true });
    await until(CUES[7]);
    // H · 27.5–32 s: share prompt + handle
    say(7);
    end.textContent = "@" + (F.CFG.instagram || "") + "  ·  " + (F.CFG.publicHost || location.host);
    end.classList.add("show");
    map.easeTo({ bearing: 14, duration: 4400, easing: (x) => x, essential: true });
    await until(END);
    window.__reelDone = true;
  }
  F.reelRun = run;

  // ── frame-exact renderer: reelSeek(t) puts the map exactly where the script is at t seconds ──
  const LIT_STOPS = [0, "#363249", 15, "#4c4459", 40, "#6c5d66", 90, "#8f7668", 180, "#b39073"];
  const DARK = "#12142a";
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, k) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k).toString(16).padStart(2, "0")).join("");
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const merc = ([lng, lat]) => [(lng + 180) / 360, (1 - Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / Math.PI) / 2];
  const unmerc = ([x, y]) => [x * 360 - 180, (360 / Math.PI) * Math.atan(Math.exp(Math.PI * (1 - 2 * y))) - 90];
  const lerp = (a, b, k) => a + (b - a) * k;
  const bearingLerp = (a, b, k) => { let d = ((b - a + 540) % 360) - 180; return a + d * k; };

  // Zoom-aware move between two cameras: the screen moves at an even pace and the camera
  // pulls back when the two points do not fit on screen at the lower zoom.
  function flyCam(A, B, k) {
    const e = ease(k);
    const ma = merc(A.c), mb = merc(B.c);
    const dist = Math.hypot(mb[0] - ma[0], mb[1] - ma[1]);           // in world units (0..1)
    const zfit = Math.log2(0.6 / Math.max(dist, 1e-9));                // zoom where both fit in ~60% of 512px tiles
    const zmid = Math.min(A.z, B.z, zfit);
    let z, w;
    if (zmid < Math.min(A.z, B.z) - 0.05) {
      if (e < 0.5) { const u = e * 2; z = lerp(A.z, zmid, u); w = 0.5 * span(A.z, zmid, z); }
      else { const u = (e - 0.5) * 2; z = lerp(zmid, B.z, u); w = 0.5 + 0.5 * span(zmid, B.z, z); }
    } else { z = lerp(A.z, B.z, e); w = Math.abs(A.z - B.z) > 0.05 ? span(A.z, B.z, z) : e; }
    const c = unmerc([lerp(ma[0], mb[0], w), lerp(ma[1], mb[1], w)]);
    return { c, z, p: lerp(A.p, B.p, e), b: bearingLerp(A.b, B.b, e) };
  }
  // fraction of the way from za to zb in screen-scale terms
  function span(za, zb, z) { const a = Math.pow(2, -za), b = Math.pow(2, -zb); return Math.abs(b - a) < 1e-12 ? 1 : (Math.pow(2, -z) - a) / (b - a); }
  function easeCam(A, B, k) { return { c: [lerp(A.c[0], B.c[0], k), lerp(A.c[1], B.c[1], k)], z: lerp(A.z, B.z, k), p: lerp(A.p, B.p, k), b: bearingLerp(A.b, B.b, k) }; }

  let plan = null, lastCue = -1;
  function buildPlan() {
    const cafe = F.places.find((p) => p.id === "kafe-ketab-enghelab") || F.places.find((p) => p.category === "food") || F.places[0];
    const street = (F.memorialList || [])[0];
    const pts = street ? street.lines.flat() : [[51.4, 35.7]];
    const mid = pts[Math.floor(pts.length / 2)];
    const G = { c: [40, 28], z: 1.6, p: 0, b: 0 };
    const IR = { c: F.IRAN_VIEW.center, z: 4.6, p: 30, b: 0 };
    const IRb = { ...IR, z: 5.0, p: 36, b: -12 };
    const TEH = { c: [51.338, 35.7], z: 14.6, p: 62, b: 20 };
    const TEHb = { ...TEH, b: 48 };
    const NO = { c: [49.8, 35.6], z: 5.9, p: 45, b: 0 };
    const NOb = { ...NO, z: 6.2, b: 8 };
    const CA = { c: [cafe.lng, cafe.lat], z: F.zoomFor(cafe) - 0.2, p: 64, b: 35 };
    const CAb = { ...CA, b: 62 };
    const ST = { c: mid, z: 15.2, p: 60, b: 0 };
    const STb = { ...ST, b: 20 };
    const I2 = { c: F.IRAN_VIEW.center, z: 4.9, p: 38, b: -8 };
    const I2b = { ...I2, b: 4 }, I2c = { ...I2, b: 14 };
    const seg = [
      [0, 2.1, G, IR, flyCam], [2.1, 5.8, IR, IRb, easeCam], [5.8, 7.7, IRb, TEH, flyCam], [7.7, 10.7, TEH, TEHb, easeCam],
      [10.7, 12.4, TEHb, NO, flyCam], [12.4, 15.2, NO, NOb, easeCam], [15.2, 16.5, NOb, CA, flyCam], [16.5, 18.8, CA, CAb, easeCam],
      [18.8, 20.1, CAb, ST, flyCam], [20.1, 22.7, ST, STb, easeCam], [22.7, 24.3, STb, I2, flyCam], [24.3, 27.5, I2, I2b, easeCam],
      [27.5, END, I2b, I2c, easeCam]
    ];
    return { seg, cafe };
  }
  function seek(t) {
    if (!plan) plan = buildPlan();
    const s = plan.seg.find((x) => t >= x[0] && t <= x[1]) || plan.seg[plan.seg.length - 1];
    const k = clamp01((t - s[0]) / (s[1] - s[0]));
    const cam = s[4](s[2], s[3], k);
    map.jumpTo({ center: cam.c, zoom: cam.z, pitch: cam.p, bearing: cam.b });
    // captions
    let cue = 0; CUES.forEach((c, i) => { if (t >= c) cue = i; });
    if (cue !== lastCue) { lastCue = cue; say(cue); }
    end.classList.toggle("show", t >= CUES[7]);
    if (t >= CUES[7]) end.textContent = "@" + (F.CFG.instagram || "") + "  ·  " + (F.CFG.publicHost || location.host);
    // lights: dark from 5.8 s, back on between 7.9 and 9.7 s
    const lk = t < 5.8 ? 1 : clamp01((t - 7.9) / 1.8);
    const stops = LIT_STOPS.map((v, i) => (i % 2 ? mix(DARK, v, lk) : v));
    map.setPaintProperty("buildings", "fill-extrusion-color-transition", { duration: 0, delay: 0 });
    map.setPaintProperty("buildings", "fill-extrusion-color", ["interpolate", ["linear"], ["coalesce", ["get", "render_height"], 8], ...stops]);
    // the café grows between 16.5 and 18.1 s
    const g = t < 16.5 ? 0.02 : Math.max(0.02, 1 - Math.pow(1 - clamp01((t - 16.5) / 1.6), 3));
    map.setFeatureState({ source: "footprints", id: plan.cafe.id }, { grow: t < 15.2 ? 1 : g });
  }
  F.reelSeek = seek;

  F.ready.then(() => {
    document.getElementById("intro").hidden = true;
    start.onclick = run;
  });
})();
