// Country counter (buildings · jobs · cities · day) and the timeline slider with "play",
// which rebuilds the country day by day.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F) return;
  const map = F.map;
  const $ = (id) => document.getElementById(id);
  const LAYERS = ["place-footprint", "place-halo", "place-dot", "place-label", "place-label-small"];
  const BASE_FILTER = { "place-label": ["get", "vision"], "place-label-small": ["!", ["get", "vision"]] };

  let maxDay = 0, shownDay = null, playing = false;

  // ── counter ─────────────────────────────────────────────
  function totals(day) {
    const list = F.places.filter((p) => day == null || (p.day || 0) <= day);
    const jobs = list.reduce((s, p) => s + (Number(p.jobs) || 0), 0);
    const cities = new Set(list.map((p) => p.city)).size;
    return { n: list.length, jobs, cities };
  }
  const fmt = (n) => { const s = F.num(Number(n).toLocaleString("en-US")); return F.lang === "fa" ? s.replace(/,/g, "٬") : s; };
  function renderStats() {
    const d = shownDay == null ? maxDay : shownDay;
    const s = totals(d);
    const parts = [F.t("dayN", { n: F.num(d) }), F.t("places", { n: fmt(s.n) })];
    if (s.jobs) parts.push(F.t("jobs", { n: fmt(s.jobs) }));
    parts.push(F.t("citiesN", { n: F.num(s.cities) }));
    $("stats").textContent = parts.join(F.lang === "fa" ? "، " : " · ");
  }

  // ── day filter ──────────────────────────────────────────
  function setDay(d) {
    shownDay = d >= maxDay ? null : d;
    const dayF = ["<=", ["get", "day"], d];
    LAYERS.forEach((l) => {
      if (!map.getLayer(l)) return;
      const base = BASE_FILTER[l];
      map.setFilter(l, shownDay == null ? (base || null) : (base ? ["all", base, dayF] : dayF));
    });
    $("tlRange").value = d;
    $("tlDay").textContent = F.t("dayN", { n: F.num(d) });
    renderStats();
  }

  async function play() {
    if (playing) { playing = false; return; }
    playing = true;
    $("tlPlay").textContent = "❚❚";
    F.closeCard();
    map.flyTo({ ...F.IRAN_VIEW, duration: 1500, essential: true });
    await new Promise((r) => setTimeout(r, 1600));
    for (let d = 0; d <= maxDay && playing; d++) {
      setDay(d);
      F.places.filter((p) => (p.day || 0) === d).forEach((p) => F.grow && F.grow(p.id));
      await new Promise((r) => setTimeout(r, Math.max(350, 9000 / (maxDay + 1))));
    }
    playing = false;
    $("tlPlay").textContent = "▶";
    setDay(maxDay);
  }

  function refresh() {
    maxDay = F.places.reduce((m, p) => Math.max(m, p.day || 0), 0);
    $("tlRange").max = maxDay;
    setDay(shownDay == null ? maxDay : Math.min(shownDay, maxDay));
  }

  F.ready.then(() => {
    $("tlRange").addEventListener("input", (e) => { playing = false; setDay(+e.target.value); });
    $("tlPlay").onclick = play;
    $("tlBtn").onclick = () => {
      const box = $("timeline");
      box.hidden = !box.hidden;
      $("tlBtn").classList.toggle("on", !box.hidden);
      if (box.hidden) { playing = false; setDay(maxDay); }
    };
    refresh();
    if (F.params.get("play") === "1") { $("timeline").hidden = false; }
  });
  F.on("data", () => maxDay !== undefined && F.places.length && refresh());
  F.on("lang", () => { renderStats(); $("tlDay").textContent = F.t("dayN", { n: F.num(shownDay == null ? maxDay : shownDay) }); $("tlBtn").textContent = F.t("timeline"); });
  F.stats = renderStats;
})();
