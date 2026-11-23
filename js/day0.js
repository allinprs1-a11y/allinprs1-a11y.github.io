// Day 0 cinematic: a plane lands at Mehrabad, Tehran's lights come on, fireworks over Azadi.
// Symbolic only: no people. Start with ?day0=1, the intro button, or inside the Reels tour.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F) return;
  const map = F.map;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const MEHRABAD = [51.3134, 35.6892], AZADI = [51.338, 35.6997], FROM = [50.85, 35.615];
  const TEXT = {
    a: { fa: "روز ۰", en: "Day 0" },
    b: { fa: "بازگشت", en: "The Return" },
    c: { fa: "فرودگاه مهرآباد، تهران", en: "Mehrabad Airport, Tehran" },
    d: { fa: "چراغ‌های تهران دوباره روشن می‌شوند", en: "Tehran's lights come back on" },
    e: { fa: "جشن آزادی در میدان آزادی", en: "Celebration at Azadi Square" }
  };

  let cap;
  function say(k) {
    cap.classList.remove("show");
    setTimeout(() => { cap.textContent = ""; const s = document.createElement("strong");
      s.textContent = TEXT[k][F.lang] || TEXT[k].fa; cap.appendChild(s); cap.classList.add("show"); }, 300);
  }

  function planeMarker() {
    const el = document.createElement("div");
    el.className = "d0-plane";
    el.innerHTML = '<svg viewBox="0 0 64 64" width="46" height="46"><path fill="#fff" stroke="#f4b942" stroke-width="2" d="M32 3c2.5 0 4 2.5 4 5.5V24l22 13v6l-22-6v13l7 5v4l-11-3-11 3v-4l7-5V37L6 43v-6l22-13V8.5C28 5.5 29.5 3 32 3z"/></svg>';
    return new maplibregl.Marker({ element: el, rotationAlignment: "map", pitchAlignment: "map" });
  }
  const bearingOf = (a, b) => {
    const y = Math.sin((b[0] - a[0]) * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180);
    const x = Math.cos(a[1] * Math.PI / 180) * Math.sin(b[1] * Math.PI / 180) -
      Math.sin(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.cos((b[0] - a[0]) * Math.PI / 180);
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  function fireworks(ms) {
    if (F.reduceMotion) return sleep(ms);
    const cv = document.createElement("canvas");
    cv.className = "d0-fx";
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    ctx.scale(dpr, dpr);
    const colors = ["#239f40", "#ffffff", "#da0000", "#f4b942", "#2ec4b6"];
    let parts = [];
    const end = performance.now() + ms;
    let nextBurst = 0;
    return new Promise((resolve) => {
      function frame(now) {
        if (now > nextBurst && now < end - 1200) {
          const base = map.project(AZADI);
          const x = base.x + (Math.random() - 0.5) * innerWidth * 0.6;
          const y = Math.max(60, base.y - 140 - Math.random() * innerHeight * 0.3);
          const c = colors[(Math.random() * colors.length) | 0];
          for (let i = 0; i < 70; i++) {
            const a = Math.random() * Math.PI * 2, v = 1.5 + Math.random() * 3.2;
            parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c });
          }
          nextBurst = now + 380 + Math.random() * 420;
        }
        ctx.globalCompositeOperation = "destination-out";
        ctx.fillStyle = "rgba(0,0,0,.38)"; ctx.fillRect(0, 0, innerWidth, innerHeight);
        ctx.globalCompositeOperation = "lighter";
        parts = parts.filter((p) => p.life > 0);
        for (const p of parts) {
          p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.vx *= 0.985; p.life -= 0.017;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.fillStyle = p.c;
          ctx.beginPath(); ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
        if (now < end || parts.length) requestAnimationFrame(frame);
        else { cv.remove(); resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  let running = false;
  async function day0() {
    if (running) return;
    running = true;
    const wasTour = document.body.classList.contains("tour");
    document.body.classList.add("tour");
    document.getElementById("intro").hidden = true;
    F.closeCard();
    cap = document.querySelector(".tour-cap") || Object.assign(document.createElement("div"), { className: "tour-cap" });
    if (!cap.isConnected) document.body.appendChild(cap);

    // the city starts dark
    const lit = map.getPaintProperty("buildings", "fill-extrusion-color");
    map.setPaintProperty("buildings", "fill-extrusion-color-transition", { duration: 0, delay: 0 });
    map.setPaintProperty("buildings", "fill-extrusion-color", "#12142a");

    map.jumpTo({ center: [38, 30], zoom: 1.8, pitch: 0, bearing: 0 });
    say("a");
    await sleep(900);
    map.flyTo({ ...F.IRAN_VIEW, zoom: 4.6, pitch: 30, duration: 4200, essential: true });
    await sleep(3000); say("b"); await sleep(1800);

    // approach and landing
    map.flyTo({ center: FROM, zoom: 11.4, pitch: 62, bearing: bearingOf(FROM, MEHRABAD), duration: 3800, essential: true });
    await sleep(3900);
    say("c");
    const plane = planeMarker().setLngLat(FROM).setRotation(bearingOf(FROM, MEHRABAD)).addTo(map);
    const t0 = performance.now(), dur = 7000;
    await new Promise((resolve) => {
      function step(now) {
        const x = Math.min(1, (now - t0) / dur), e = x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
        const pos = [FROM[0] + (MEHRABAD[0] - FROM[0]) * e, FROM[1] + (MEHRABAD[1] - FROM[1]) * e];
        plane.setLngLat(pos);
        plane.getElement().style.setProperty("--s", String(1.25 - 0.45 * e));
        map.jumpTo({ center: pos, zoom: 11.4 + 2.4 * e, pitch: 62, bearing: bearingOf(FROM, MEHRABAD) });
        if (x < 1) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
    await sleep(600);
    plane.remove();

    // lights on, fly to Azadi, fireworks
    say("d");
    map.setPaintProperty("buildings", "fill-extrusion-color-transition", { duration: 3500, delay: 0 });
    map.setPaintProperty("buildings", "fill-extrusion-color", lit);
    map.flyTo({ center: AZADI, zoom: 15.4, pitch: 64, bearing: 30, duration: 4500, essential: true });
    await sleep(4600);
    say("e");
    map.easeTo({ bearing: 75, duration: 9000, easing: (x) => x, essential: true });
    await fireworks(8500);

    cap.classList.remove("show");
    if (!wasTour) document.body.classList.remove("tour");
    running = false;
  }
  F.day0 = day0;

  F.ready.then(() => {
    const b = document.getElementById("day0Btn");
    if (b) b.onclick = day0;
    if (F.params.get("day0") === "1" && !F.params.has("tour")) day0();
  });
})();
