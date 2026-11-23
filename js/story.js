// Story card: a 1080×1920 image of the open building, ready for Instagram Stories.
(function () {
  "use strict";
  const F = window.FARDA;
  if (!F) return;
  const map = F.map;
  const $ = (id) => document.getElementById(id);
  const W = 1080, H = 1920;

  function snapshot() {
    return new Promise((resolve) => {
      map.once("render", () => {
        try { resolve(map.getCanvas().toDataURL("image/jpeg", 0.92)); } catch (e) { resolve(null); }
      });
      map.triggerRepaint();
    });
  }
  const loadImg = (src) => new Promise((res) => {
    if (!src) return res(null);
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  function wrap(ctx, text, maxW) {
    const words = String(text || "").split(/\s+/), lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line);
    return lines;
  }

  async function makeCard(p) {
    const rtl = F.lang === "fa";
    const font = (wt, px) => `${wt} ${px}px Vazirmatn, system-ui, sans-serif`;
    await Promise.all([document.fonts.load(font(800, 80)), document.fonts.load(font(400, 40))]).catch(() => {});
    const [shot, logo] = await Promise.all([snapshot().then(loadImg), loadImg("favicon.svg")]);

    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#141a3a"); bg.addColorStop(0.55, "#2b2142"); bg.addColorStop(1, "#0b1324");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // map snapshot, cover-cropped into a rounded frame
    const fx = 60, fy = 170, fw = W - 120, fh = 1080;
    ctx.save(); roundRect(ctx, fx, fy, fw, fh, 48); ctx.clip();
    if (shot) {
      const s = Math.max(fw / shot.width, fh / shot.height);
      const sw = fw / s, sh = fh / s;
      ctx.drawImage(shot, (shot.width - sw) / 2, (shot.height - sh) / 2, sw, sh, fx, fy, fw, fh);
    } else { ctx.fillStyle = "#1d2440"; ctx.fillRect(fx, fy, fw, fh); }
    const fade = ctx.createLinearGradient(0, fy + fh * 0.55, 0, fy + fh);
    fade.addColorStop(0, "rgba(11,19,36,0)"); fade.addColorStop(1, "rgba(11,19,36,.85)");
    ctx.fillStyle = fade; ctx.fillRect(fx, fy, fw, fh);
    ctx.restore();
    ctx.strokeStyle = "rgba(244,185,66,.55)"; ctx.lineWidth = 4; roundRect(ctx, fx, fy, fw, fh, 48); ctx.stroke();

    // header: logo + site name
    ctx.direction = rtl ? "rtl" : "ltr";
    const edge = rtl ? W - 70 : 70;
    ctx.textAlign = rtl ? "right" : "left";
    if (logo) ctx.drawImage(logo, rtl ? W - 70 - 84 : 70, 50, 84, 84);
    ctx.fillStyle = "#f4b942"; ctx.font = font(800, 56);
    ctx.fillText(F.CFG.name[F.lang], rtl ? W - 70 - 110 : 180, 112);

    // body text
    const cat = F.catOf(p);
    let y = fy + fh + 110;
    ctx.font = font(700, 36);
    const pill = rtl ? cat.fa : cat.en, pw = ctx.measureText(pill).width + 56;
    ctx.fillStyle = cat.color; roundRect(ctx, rtl ? edge - pw : edge, y - 50, pw, 70, 35); ctx.fill();
    ctx.fillStyle = "#10151f"; ctx.fillText(pill, rtl ? edge - 28 : edge + 28, y - 3);
    y += 110;
    ctx.fillStyle = "#f3efe6"; ctx.font = font(800, 84);
    for (const line of wrap(ctx, F.pName(p), W - 140).slice(0, 2)) { ctx.fillText(line, edge, y); y += 100; }
    ctx.fillStyle = "#a9b3c7"; ctx.font = font(400, 42);
    const sub = [F.cName(F.cityById[p.city]), p.day != null ? F.t("dayN", { n: F.num(p.day) }) : ""].filter(Boolean).join(F.lang === "fa" ? "، " : " · ");
    ctx.fillText(sub, edge, y); y += 90;
    ctx.fillStyle = "#2ec4b6"; ctx.font = font(700, 50);
    ctx.fillText(F.t("storyLine"), edge, y);

    // footer: the address people can type
    const host = location.host + (location.pathname.length > 1 ? location.pathname.replace(/\/$/, "") : "");
    ctx.textAlign = "center"; ctx.direction = "ltr";
    ctx.fillStyle = "rgba(244,185,66,.15)"; roundRect(ctx, 140, H - 170, W - 280, 96, 48); ctx.fill();
    ctx.fillStyle = "#f4b942"; ctx.font = font(700, 44);
    ctx.fillText(host, W / 2, H - 107);
    return c;
  }

  async function share() {
    const p = F.byId[F.current];
    if (!p) return;
    const btn = $("storyBtn");
    btn.disabled = true; btn.textContent = "…";
    try {
      const canvas = await makeCard(p);
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], "iran-farda-" + p.id + ".png", { type: "image/png" });
      const url = new URL(location.href); url.search = "?id=" + encodeURIComponent(p.id);
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: F.pName(p) + " · " + url }); return; }
        catch (e) { if (e && e.name === "AbortError") return; }
      }
      showFallback(canvas.toDataURL("image/png"), file.name);
    } finally {
      btn.disabled = false; btn.textContent = F.t("story");
    }
  }

  // Instagram's in-app browser often blocks file sharing and downloads:
  // show the image so it can be saved with a long press.
  function showFallback(dataUrl, name) {
    $("storyImg").src = dataUrl;
    const a = $("storyDl"); a.href = dataUrl; a.download = name;
    $("storyModal").hidden = false;
  }

  F.ready.then(() => {
    $("storyBtn").onclick = share;
    $("storyClose").onclick = () => ($("storyModal").hidden = true);
    $("storyModal").addEventListener("click", (e) => { if (e.target.id === "storyModal") $("storyModal").hidden = true; });
  });
  F.makeStoryCard = makeCard;
})();
