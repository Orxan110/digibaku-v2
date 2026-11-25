/* DigiBaku — bayram effektləri: qar, tonqal, konfeti, ürəklər, fişənglər, çiçək ləçəkləri.
   Admin paneldən idarə olunur. Kliklərə mane olmur (pointer-events: none). */
(function () {
  var cv = null, cx = null, raf = 0, W = 0, H = 0, dpr = 1, kind = "", level = 2, last = 0, time = 0, E = null, rt = 0;
  var reduce = false;
  try { reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function small() { return W < 700; }
  function count(base) { return Math.max(4, Math.round(base * ([0.5, 1, 1.7][level - 1] || 1) * (small() ? 0.55 : 1))); }
  function navH() { var n = document.getElementById("bottom-nav"); return (n && n.offsetHeight) ? n.offsetHeight : 0; }

  /* ---------- Qar ---------- */
  var snow = {
    init: function () {
      this.p = []; var n = count(95);
      for (var i = 0; i < n; i++) this.p.push(this.mk(true));
    },
    mk: function (any) {
      var r = rnd(1.2, 3.8);
      return { x: rnd(0, W), y: any ? rnd(0, H) : -6, r: r, vy: 22 + r * 12 + rnd(0, 14), sw: rnd(0.6, 1.6), ph: rnd(0, 6.28), a: rnd(0.55, 0.95) };
    },
    step: function (dt) {
      cx.clearRect(0, 0, W, H);
      for (var i = 0; i < this.p.length; i++) {
        var f = this.p[i];
        f.y += f.vy * dt;
        f.x += Math.sin(time * f.sw + f.ph) * 14 * dt;
        if (f.y > H + 6) { this.p[i] = this.mk(false); continue; }
        cx.globalAlpha = f.a;
        cx.fillStyle = "#fff";
        cx.beginPath(); cx.arc(f.x, f.y, f.r, 0, 6.2832); cx.fill();
      }
      cx.globalAlpha = 1;
    }
  };

  /* ---------- Çiçək ləçəkləri (yaz / Novruz / 8 Mart) ---------- */
  var petals = {
    init: function () { this.p = []; var n = count(45); for (var i = 0; i < n; i++) this.p.push(this.mk(true)); },
    mk: function (any) {
      return { x: rnd(0, W), y: any ? rnd(0, H) : -12, s: rnd(5, 10), vy: rnd(28, 60), sw: rnd(0.6, 1.5), ph: rnd(0, 6.28),
        rot: rnd(0, 6.28), vr: rnd(-2, 2), c: pick(["#ffd1e0", "#ffb3cf", "#fff0f5", "#ffe08a", "#c8f0b4"]) };
    },
    step: function (dt) {
      cx.clearRect(0, 0, W, H);
      for (var i = 0; i < this.p.length; i++) {
        var f = this.p[i];
        f.y += f.vy * dt; f.x += Math.sin(time * f.sw + f.ph) * 26 * dt; f.rot += f.vr * dt;
        if (f.y > H + 14) { this.p[i] = this.mk(false); continue; }
        cx.save(); cx.translate(f.x, f.y); cx.rotate(f.rot);
        cx.fillStyle = f.c; cx.globalAlpha = 0.9;
        cx.beginPath(); cx.ellipse(0, 0, f.s, f.s * 0.55, 0, 0, 6.2832); cx.fill();
        cx.restore();
      }
      cx.globalAlpha = 1;
    }
  };

  /* ---------- Konfeti ---------- */
  var confetti = {
    init: function () { this.p = []; var n = count(110); for (var i = 0; i < n; i++) this.p.push(this.mk(true)); },
    mk: function (any) {
      return { x: rnd(0, W), y: any ? rnd(0, H) : rnd(-20, -4), w: rnd(5, 10), h: rnd(3, 6), vy: rnd(60, 130), sw: rnd(0.8, 2), ph: rnd(0, 6.28),
        rot: rnd(0, 6.28), vr: rnd(-6, 6), c: pick(["#ff4d6d", "#ffd23f", "#3bceac", "#4d9de0", "#b370ff", "#ff9f1c", "#ffffff"]) };
    },
    step: function (dt) {
      cx.clearRect(0, 0, W, H);
      for (var i = 0; i < this.p.length; i++) {
        var f = this.p[i];
        f.y += f.vy * dt; f.x += Math.sin(time * f.sw + f.ph) * 30 * dt; f.rot += f.vr * dt;
        if (f.y > H + 12) { this.p[i] = this.mk(false); continue; }
        cx.save(); cx.translate(f.x, f.y); cx.rotate(f.rot);
        cx.scale(1, Math.abs(Math.cos(f.rot * 1.3)) * 0.8 + 0.2);
        cx.fillStyle = f.c; cx.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
        cx.restore();
      }
    }
  };

  /* ---------- Ürəklər ---------- */
  function heart(x, y, s) {
    cx.beginPath();
    cx.moveTo(x, y + s * 0.35);
    cx.bezierCurveTo(x - s, y - s * 0.4, x - s * 0.55, y - s * 1.05, x, y - s * 0.5);
    cx.bezierCurveTo(x + s * 0.55, y - s * 1.05, x + s, y - s * 0.4, x, y + s * 0.35);
    cx.closePath(); cx.fill();
  }
  var hearts = {
    init: function () { this.p = []; var n = count(26); for (var i = 0; i < n; i++) this.p.push(this.mk(true)); },
    mk: function (any) {
      return { x: rnd(0, W), y: any ? rnd(0, H) : H + 20, s: rnd(7, 16), vy: rnd(28, 60), sw: rnd(0.6, 1.4), ph: rnd(0, 6.28),
        a: rnd(0.5, 0.9), c: pick(["#ff4d79", "#ff7aa2", "#ff2e63", "#ffb3c6", "#e83e8c"]) };
    },
    step: function (dt) {
      cx.clearRect(0, 0, W, H);
      for (var i = 0; i < this.p.length; i++) {
        var f = this.p[i];
        f.y -= f.vy * dt; f.x += Math.sin(time * f.sw + f.ph) * 22 * dt;
        if (f.y < -24) { this.p[i] = this.mk(false); continue; }
        cx.globalAlpha = f.a; cx.fillStyle = f.c; heart(f.x, f.y, f.s);
      }
      cx.globalAlpha = 1;
    }
  };

  /* ---------- Fişənglər ---------- */
  var fireworks = {
    init: function () { this.r = []; this.s = []; this.t = 0.3; },
    boom: function (x, y) {
      var hue = Math.floor(rnd(0, 360)), n = small() ? 34 : 54, two = Math.random() < 0.4;
      for (var i = 0; i < n; i++) {
        var a = (i / n) * 6.2832 + rnd(-0.08, 0.08), sp = rnd(50, 170);
        this.s.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rnd(0.9, 1.5), age: 0, h: two && i % 2 ? (hue + 60) % 360 : hue });
      }
    },
    step: function (dt) {
      cx.globalCompositeOperation = "destination-out";
      cx.fillStyle = "rgba(0,0,0,0.22)"; cx.fillRect(0, 0, W, H);
      cx.globalCompositeOperation = "lighter";
      this.t -= dt;
      if (this.t <= 0) {
        this.t = rnd(0.7, 1.7) / ([0.7, 1, 1.6][level - 1] || 1);
        this.r.push({ x: rnd(W * 0.12, W * 0.88), y: H - navH(), vy: -rnd(330, 470), ty: rnd(H * 0.12, H * 0.5) });
      }
      var i, f;
      for (i = this.r.length - 1; i >= 0; i--) {
        f = this.r[i]; f.y += f.vy * dt;
        cx.fillStyle = "rgba(255,235,180,0.95)"; cx.beginPath(); cx.arc(f.x, f.y, 2, 0, 6.2832); cx.fill();
        if (f.y <= f.ty) { this.boom(f.x, f.y); this.r.splice(i, 1); }
      }
      for (i = this.s.length - 1; i >= 0; i--) {
        f = this.s[i]; f.age += dt;
        if (f.age >= f.life) { this.s.splice(i, 1); continue; }
        f.vy += 90 * dt; f.vx *= 0.985; f.vy *= 0.985; f.x += f.vx * dt; f.y += f.vy * dt;
        var k = 1 - f.age / f.life;
        cx.fillStyle = "hsla(" + f.h + ",100%," + (55 + k * 20) + "%," + k.toFixed(2) + ")";
        cx.beginPath(); cx.arc(f.x, f.y, 1.6 + k * 1.2, 0, 6.2832); cx.fill();
      }
      cx.globalCompositeOperation = "source-over";
      if (!this.r.length && !this.s.length) cx.clearRect(0, 0, W, H);
    }
  };

  /* ---------- Tonqal (Novruz) ---------- */
  function sprite(inner, mid, outer) {
    var c = document.createElement("canvas"); c.width = c.height = 64;
    var g = c.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, inner); gr.addColorStop(0.35, mid); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return c;
  }
  var bonfire = {
    init: function () {
      this.p = []; this.k = []; this.acc = 0;
      this.sp = [sprite("rgba(255,250,210,1)", "rgba(255,200,60,.55)", "rgba(255,140,0,0)"),
        sprite("rgba(255,190,60,.95)", "rgba(255,110,10,.5)", "rgba(255,60,0,0)"),
        sprite("rgba(255,100,20,.8)", "rgba(220,40,0,.4)", "rgba(120,0,0,0)"),
        sprite("rgba(90,70,60,.35)", "rgba(60,50,45,.2)", "rgba(40,40,40,0)")];
      var by = H - navH() - 10;
      this.src = small() ? [{ x: 46, y: by, s: 0.8 }] : [{ x: 80, y: by, s: 1.15 }, { x: W - 140, y: by, s: 1.15 }];
    },
    emit: function (s) {
      var sc = s.s;
      this.p.push({ x: s.x + rnd(-16, 16) * sc, y: s.y - 6, vx: rnd(-9, 9), vy: -rnd(70, 150) * sc, life: rnd(0.6, 1.2), age: 0, sz: rnd(22, 40) * sc });
      if (Math.random() < 0.22) this.k.push({ x: s.x + rnd(-14, 14) * sc, y: s.y - 14, vx: rnd(-22, 22), vy: -rnd(90, 210), life: rnd(1, 2.2), age: 0 });
    },
    step: function (dt) {
      cx.clearRect(0, 0, W, H);
      var i, f, s, rate = 95 * ([0.6, 1, 1.5][level - 1] || 1);
      this.acc += rate * dt;
      while (this.acc >= 1) { this.acc -= 1; for (i = 0; i < this.src.length; i++) this.emit(this.src[i]); }
      for (i = 0; i < this.src.length; i++) {
        s = this.src[i];
        cx.globalCompositeOperation = "source-over";
        cx.lineCap = "round"; cx.strokeStyle = "#4a2d14"; cx.lineWidth = 9 * s.s;
        cx.beginPath(); cx.moveTo(s.x - 28 * s.s, s.y + 4); cx.lineTo(s.x + 24 * s.s, s.y - 6); cx.stroke();
        cx.beginPath(); cx.moveTo(s.x + 28 * s.s, s.y + 4); cx.lineTo(s.x - 24 * s.s, s.y - 6); cx.stroke();
        cx.globalCompositeOperation = "lighter";
        var g = cx.createRadialGradient(s.x, s.y - 10, 4, s.x, s.y - 10, 90 * s.s);
        g.addColorStop(0, "rgba(255,150,40,.28)"); g.addColorStop(1, "rgba(255,100,0,0)");
        cx.fillStyle = g; cx.fillRect(s.x - 100 * s.s, s.y - 110 * s.s, 200 * s.s, 200 * s.s);
      }
      cx.globalCompositeOperation = "lighter";
      for (i = this.p.length - 1; i >= 0; i--) {
        f = this.p[i]; f.age += dt;
        if (f.age >= f.life) { this.p.splice(i, 1); continue; }
        var u = f.age / f.life;
        f.x += (f.vx + Math.sin(time * 6 + i) * 10) * dt; f.y += f.vy * dt; f.vy *= 0.992;
        var idx = u < 0.25 ? 0 : (u < 0.55 ? 1 : (u < 0.85 ? 2 : 3));
        var d = f.sz * (1 - u * 0.55);
        cx.globalAlpha = Math.max(0, (1 - u) * (idx === 3 ? 0.5 : 0.95));
        cx.drawImage(this.sp[idx], f.x - d, f.y - d, d * 2, d * 2);
      }
      cx.globalAlpha = 1;
      for (i = this.k.length - 1; i >= 0; i--) {
        f = this.k[i]; f.age += dt;
        if (f.age >= f.life) { this.k.splice(i, 1); continue; }
        f.x += (f.vx + Math.sin(time * 5 + i * 3) * 14) * dt; f.y += f.vy * dt; f.vy *= 0.994;
        var a = 1 - f.age / f.life;
        cx.fillStyle = "rgba(255," + Math.floor(150 + a * 90) + ",60," + a.toFixed(2) + ")";
        cx.beginPath(); cx.arc(f.x, f.y, 1.3 + a * 0.9, 0, 6.2832); cx.fill();
      }
      cx.globalCompositeOperation = "source-over";
    }
  };

  var KINDS = { snow: snow, petals: petals, confetti: confetti, hearts: hearts, fireworks: fireworks, bonfire: bonfire };

  function size() {
    W = window.innerWidth || document.documentElement.clientWidth || 360;
    H = window.innerHeight || document.documentElement.clientHeight || 640;
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + "px"; cv.style.height = H + "px";
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function onResize() {
    clearTimeout(rt);
    rt = setTimeout(function () { if (cv && E) { size(); E.init(); } }, 200);
  }
  function frame(ts) {
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, ((ts - last) / 1000) || 0.016);
    last = ts; time += dt;
    try { E.step(dt); } catch (e) { stop(); }
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; E = null; kind = "";
    window.removeEventListener("resize", onResize);
    if (cv && cv.parentNode) cv.parentNode.removeChild(cv);
    cv = cx = null;
  }
  function set(type, lvl) {
    lvl = parseInt(lvl, 10); if (!(lvl >= 1 && lvl <= 3)) lvl = 2;
    if (!type || !KINDS[type] || reduce) { stop(); return; }
    if (cv && kind === type && level === lvl) return;
    stop();
    kind = type; level = lvl;
    cv = document.createElement("canvas");
    cv.id = "dbFx";
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:58";
    document.body.appendChild(cv);
    cx = cv.getContext("2d");
    if (!cx) { stop(); return; }
    size();
    E = KINDS[type]; E.init();
    window.addEventListener("resize", onResize);
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  window.DBFx = { set: set, stop: stop };
})();
