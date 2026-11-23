// Weekly chapter banner and seasonal themes (Nowruz, Yalda).
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F) return;
  const $ = (id) => document.getElementById(id);

  // ── chapter ─────────────────────────────────────────────
  function chapterFor(day) {
    return (F.CFG.chapters || []).find((c) => day >= c.from && day <= c.to) || null;
  }
  function renderChapter() {
    const day = F.places.reduce((m, p) => Math.max(m, p.day || 0), 0);
    const ch = chapterFor(F.CFG.dayOverride != null ? F.CFG.dayOverride : day);
    const el = $("chapter");
    if (!ch) { el.hidden = true; return; }
    el.textContent = "📖 " + (F.lang === "en" ? ch.en : ch.fa);
    el.hidden = false;
    el.onclick = () => ch.city && F.flyCity(ch.city);
  }

  // ── seasonal theme ──────────────────────────────────────
  function pickTheme() {
    const q = F.params.get("theme");
    if (q === "nowruz" || q === "yalda") return q;
    if (F.CFG.theme !== "auto") return F.CFG.theme || null;
    const d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    if ((m === 3 && day >= 14) || (m === 4 && day <= 2)) return "nowruz";
    if (m === 12 && day >= 18 && day <= 22) return "yalda";
    return null;
  }
  const THEMES = {
    nowruz: { cls: "theme-nowruz", fa: "نوروز مبارک 🌸", en: "Happy Nowruz 🌸", glyphs: ["🌸", "🌱", "🌷"] },
    yalda: { cls: "theme-yalda", fa: "شب یلدا مبارک 🍉", en: "Happy Yalda Night 🍉", glyphs: ["🍉", "🔴", "✨"] }
  };
  function applyTheme(name) {
    const th = THEMES[name];
    if (!th) return;
    document.body.classList.add(th.cls);
    const k = document.querySelector(".kicker");
    if (k) k.dataset.season = F.lang === "en" ? th.en : th.fa;
    if (F.reduceMotion) return;
    const box = document.createElement("div");
    box.className = "petals";
    box.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 14; i++) {
      const s = document.createElement("span");
      s.textContent = th.glyphs[i % th.glyphs.length];
      s.style.left = (i * 7.3 + Math.random() * 5) % 100 + "%";
      s.style.animationDelay = (-Math.random() * 14).toFixed(1) + "s";
      s.style.animationDuration = (10 + Math.random() * 8).toFixed(1) + "s";
      s.style.fontSize = (14 + Math.random() * 12).toFixed(0) + "px";
      box.appendChild(s);
    }
    document.body.appendChild(box);
  }

  const theme = pickTheme();
  applyTheme(theme);
  F.ready.then(renderChapter);
  F.on("lang", () => {
    renderChapter();
    const th = THEMES[theme], k = document.querySelector(".kicker");
    if (th && k) k.dataset.season = F.lang === "en" ? th.en : th.fa;
  });
})();
