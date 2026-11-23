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
    cap.classList.remove("show");
    setTimeout(() => {
      cap.textContent = "";
      const s = document.createElement("strong");
      s.textContent = (SCRIPT[F.lang] || SCRIPT.fa)[i];
      cap.appendChild(s);
      cap.classList.add("show");
    }, 250);
  }

  async function run() {
    start.hidden = true;
    const lit = map.getPaintProperty("buildings", "fill-extrusion-color");
    const cafe = F.places.find((p) => p.id === "nemone-kafe-tajrish") || F.places.find((p) => p.category === "food") || F.places[0];
    const street = (window.FARDA.memorialList || [])[0];

    // 0–3 s: hook — globe dives to Iran
    map.jumpTo({ center: [40, 28], zoom: 1.6, pitch: 0, bearing: 0 });
    say(0);
    map.flyTo({ ...F.IRAN_VIEW, zoom: 4.8, pitch: 35, duration: 2600, essential: true });
    await sleep(2700);
    // 3–6 s: the question
    say(1);
    map.easeTo({ bearing: -12, zoom: 5.1, duration: 3000, essential: true });
    await sleep(3000);
    // 6–11 s: Tehran at night, lights come on
    map.setPaintProperty("buildings", "fill-extrusion-color-transition", { duration: 0, delay: 0 });
    map.setPaintProperty("buildings", "fill-extrusion-color", "#12142a");
    say(2);
    map.flyTo({ center: [51.338, 35.7], zoom: 14.6, pitch: 62, bearing: 20, duration: 2600, essential: true });
    await sleep(2400);
    map.setPaintProperty("buildings", "fill-extrusion-color-transition", { duration: 2400, delay: 0 });
    map.setPaintProperty("buildings", "fill-extrusion-color", lit);
    map.easeTo({ bearing: 50, duration: 2600, easing: (x) => x, essential: true });
    await sleep(2600);
    // 11–15 s: rebuilding — rail lines and Urmia from above
    say(3);
    map.flyTo({ center: [49.8, 35.6], zoom: 5.9, pitch: 45, bearing: 0, duration: 2200, essential: true });
    await sleep(4000);
    // 15–20 s: your café rises
    say(4);
    if (cafe) {
      map.flyTo({ center: [cafe.lng, cafe.lat], zoom: F.zoomFor(cafe) - 0.2, pitch: 64, bearing: 35, duration: 2300, essential: true });
      await sleep(2300);
      F.grow && F.grow(cafe.id);
      map.easeTo({ bearing: 70, duration: 2700, easing: (x) => x, essential: true });
      await sleep(2700);
    }
    // 20–24 s: a memorial street
    say(5);
    if (street) {
      const pts = street.lines.flat();
      const mid = pts[Math.floor(pts.length / 2)];
      map.flyTo({ center: mid, zoom: 15.2, pitch: 60, bearing: 0, duration: 2000, essential: true });
      await sleep(4000);
    } else await sleep(4000);
    // 24–29 s: the call to action
    say(6);
    map.flyTo({ ...F.IRAN_VIEW, zoom: 4.9, pitch: 38, bearing: -8, duration: 2800, essential: true });
    await sleep(5000);
    // 29–33 s: share prompt + handle
    say(7);
    end.textContent = "@" + (F.CFG.instagram || "") + "  ·  " + location.host;
    end.classList.add("show");
    await sleep(4000);
  }

  F.ready.then(() => {
    document.getElementById("intro").hidden = true;
    start.onclick = run;
  });
})();
