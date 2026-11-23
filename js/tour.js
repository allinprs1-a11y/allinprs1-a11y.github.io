// Reels mode (?tour=1): hides the interface and flies a cinematic tour with captions,
// so the screen can be recorded and posted as a Reel. Tap "start" after you begin recording.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F || !F.params.has("tour")) return;
  const map = F.map;
  const loop = F.params.get("tour") === "loop";
  document.body.classList.add("tour");

  const C = (id) => { const c = F.cityById[id]; return [c.lng, c.lat]; };
  const P = (id) => F.byId[id];

  // Each step: caption (fa/en), a camera move, how long to hold, optional building to grow.
  function steps() {
    const s = [
      { fa: "روز ۰ · بازگشت", en: "Day 0 · The Return", cam: { ...F.IRAN_VIEW, zoom: 4.4, pitch: 30 }, dur: 5200 },
      { fa: "تهران دوباره زنده می‌شود", en: "Tehran comes back to life", cam: { center: C("tehran"), zoom: 12.6, pitch: 62, bearing: -25 }, dur: 6500 },
      { fa: "قطار سریع‌السیر، چهار شهر در چهار ساعت", en: "High-speed rail: four cities, four hours", cam: { center: [52.4, 34.6], zoom: 5.6, pitch: 45, bearing: 10 }, dur: 6000 },
      { fa: "دریاچه ارومیه دوباره پر می‌شود", en: "Lake Urmia fills again", cam: { center: [45.62, 37.62], zoom: 8.6, pitch: 50, bearing: 20 }, dur: 6000 },
      { fa: "اصفهان، نصف جهان", en: "Isfahan, half the world", cam: { center: C("isfahan"), zoom: 14.3, pitch: 64, bearing: 35 }, dur: 6500 },
      { fa: "کیش، قلب خلیج فارس", en: "Kish, heart of the Persian Gulf", cam: { center: C("kish"), zoom: 12.2, pitch: 58, bearing: -15 }, dur: 6000 }
    ];
    // Show up to three of the newest real (non-example) buildings, or examples if none yet.
    const real = F.places.filter((p) => !p.example && p.category !== "vision" && (p.size || 40) < 200);
    const pick = (real.length ? real : F.places.filter((p) => p.example)).slice().sort((a, b) => (b.day || 0) - (a.day || 0)).slice(0, 3);
    pick.forEach((p, i) => s.splice(2 + i * 2, 0, {
      fa: F.pName(p), en: p.name_en || p.name, sub: true, grow: p.id,
      cam: { center: [p.lng, p.lat], zoom: F.zoomFor(p) - 0.3, pitch: 62, bearing: 40 * (i + 1) }, dur: 6500 }));
    s.push({ fa: "جای تو روی این نقشه کجاست؟", en: "Where is your place on this map?", end: true,
      cam: { ...F.IRAN_VIEW, zoom: 4.7, pitch: 38, bearing: -10 }, dur: 7000 });
    return s;
  }

  const cap = document.createElement("div");
  cap.className = "tour-cap";
  const start = document.createElement("button");
  start.className = "primary big tour-start";
  start.type = "button";
  start.textContent = "▶";
  document.body.append(cap, start);

  function caption(step) {
    cap.classList.remove("show");
    setTimeout(() => {
      const main = F.lang === "en" ? step.en : step.fa;
      const p = step.grow && P(step.grow);
      cap.innerHTML = "";
      const h = document.createElement("strong"); h.textContent = main; cap.appendChild(h);
      if (p) {
        const small = document.createElement("span");
        small.textContent = [F.cName(F.cityById[p.city]), p.day != null ? F.t("dayN", { n: F.num(p.day) }) : ""].filter(Boolean).join(F.lang === "fa" ? "، " : " · ");
        cap.appendChild(small);
      }
      if (step.end) {
        const small = document.createElement("span");
        small.className = "url"; small.textContent = F.CFG.publicHost || location.host;
        cap.appendChild(small);
      }
      cap.classList.add("show");
    }, 350);
  }

  async function run() {
    start.hidden = true;
    const list = steps();
    do {
      if (F.params.get("day0") === "1" && F.day0) await F.day0();
      map.jumpTo({ center: [53.6, 30], zoom: 1.7, pitch: 0, bearing: 0 });
      for (const step of list) {
        caption(step);
        const flyDur = 3200;
        map.flyTo({ ...step.cam, duration: flyDur, essential: true, curve: 1.4 });
        await new Promise((r) => setTimeout(r, flyDur));
        if (step.grow && F.grow) F.grow(step.grow);
        // slow drift while holding, so the frame never looks frozen
        map.easeTo({ bearing: map.getBearing() + 18, duration: step.dur, easing: (x) => x, essential: true });
        await new Promise((r) => setTimeout(r, step.dur));
      }
    } while (loop);
  }

  F.ready.then(() => {
    document.getElementById("intro").hidden = true;
    start.onclick = run;
  });
})();
