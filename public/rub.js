/* =============================================================
   ขูดหาเลข — Rub to reveal
   A digital echo of the practice at places like Kham Chanod, where
   people rub tree bark (or candle wax, or powder) and watch for a
   number to emerge.

   Honest framing, carried into the UI: the numbers here are randomly
   generated afresh each time. This is a moment of ritual and a bit of
   fun, not a claim that anything is being divined.

   Implementation notes:
   - two stacked canvases: numbers underneath, "bark" covering on top
   - rubbing erases the cover with destination-out compositing
   - reveal progress is sampled (not per-pixel) to stay smooth on phones
   - gold embers puff from the rub point, tying it to the site background
   ============================================================= */
(function () {
  const wrap = document.getElementById('rub-panel');
  if (!wrap) return;

  const base = document.getElementById('rub-base');
  const cover = document.getElementById('rub-cover');
  if (!base || !cover) return;

  const bctx = base.getContext('2d');
  const cctx = cover.getContext('2d', { willReadFrequently: true });

  let W = 0, H = 0, dpr = 1;
  let numbers = [];
  let revealed = false;
  let rubbing = false;
  let lastPt = null;
  let sparks = [];
  let rafId = null;
  let progress = 0;

  const GOLD = '228,193,88';
  const MARIGOLD = '232,135,58';

  function rand(a, b) { return Math.random() * (b - a) + a; }

  // Fresh numbers, fresh positions, every single time.
  function makeNumbers() {
    const out = [];
    const count = 3;
    const pad = 0.18;
    for (let i = 0; i < count; i++) {
      const two = String(Math.floor(Math.random() * 100)).padStart(2, '0');
      out.push({
        text: two,
        // spread across the panel, jittered so it never looks like a grid
        x: W * (pad + (i + 0.5) * ((1 - pad * 2) / count)) + rand(-W * 0.045, W * 0.045),
        y: H * rand(0.34, 0.66),
        rot: rand(-0.22, 0.22),
        size: Math.min(W, H) * rand(0.20, 0.26),
      });
    }
    return out;
  }

  function drawBase() {
    bctx.clearRect(0, 0, W, H);

    // Warm depth behind the numbers
    const g = bctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
    g.addColorStop(0, 'rgba(110,20,35,0.5)');
    g.addColorStop(1, 'rgba(22,15,10,0.95)');
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, W, H);

    numbers.forEach((n) => {
      bctx.save();
      bctx.translate(n.x, n.y);
      bctx.rotate(n.rot);
      bctx.textAlign = 'center';
      bctx.textBaseline = 'middle';
      bctx.font = `700 ${n.size}px Fraunces, Georgia, serif`;

      bctx.shadowColor = `rgba(${GOLD},0.85)`;
      bctx.shadowBlur = n.size * 0.45;
      bctx.fillStyle = `rgb(${GOLD})`;
      bctx.fillText(n.text, 0, 0);

      bctx.shadowBlur = 0;
      bctx.lineWidth = Math.max(1, n.size * 0.03);
      bctx.strokeStyle = 'rgba(244,233,208,0.55)';
      bctx.strokeText(n.text, 0, 0);
      bctx.restore();
    });
  }

  // Procedural "bark" - vertical grain, knots and speckle. Drawn rather
  // than loaded so there's no image to download.
  function drawCover() {
    cctx.globalCompositeOperation = 'source-over';
    cctx.clearRect(0, 0, W, H);

    const g = cctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#2b1d13');
    g.addColorStop(0.5, '#1d1409');
    g.addColorStop(1, '#2a1c12');
    cctx.fillStyle = g;
    cctx.fillRect(0, 0, W, H);

    // grain
    cctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < Math.round(W / 7); i++) {
      const x = rand(0, W);
      cctx.lineWidth = rand(0.4, 2.1);
      cctx.beginPath();
      cctx.moveTo(x, -10);
      let cx = x;
      for (let y = -10; y < H + 10; y += 26) {
        cx += rand(-3.5, 3.5);
        cctx.lineTo(cx, y);
      }
      cctx.stroke();
    }

    // knots
    for (let i = 0; i < 4; i++) {
      const kx = rand(W * 0.1, W * 0.9);
      const ky = rand(H * 0.1, H * 0.9);
      for (let r = rand(9, 22); r > 1; r -= 2.6) {
        cctx.strokeStyle = `rgba(0,0,0,${rand(0.18, 0.4)})`;
        cctx.lineWidth = 1.3;
        cctx.beginPath();
        cctx.ellipse(kx, ky, r, r * rand(0.5, 0.8), rand(0, 3.14), 0, Math.PI * 2);
        cctx.stroke();
      }
    }

    // speckle + faint gold dust so it hints at treasure beneath
    for (let i = 0; i < Math.round((W * H) / 900); i++) {
      const a = Math.random();
      cctx.fillStyle = a < 0.82
        ? `rgba(0,0,0,${rand(0.05, 0.22)})`
        : `rgba(${GOLD},${rand(0.03, 0.12)})`;
      const s = rand(0.6, 2.4);
      cctx.fillRect(rand(0, W), rand(0, H), s, s);
    }
  }

  function resize() {
    const rect = wrap.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    [base, cover].forEach((c) => {
      c.width = W * dpr;
      c.height = H * dpr;
      c.style.width = W + 'px';
      c.style.height = H + 'px';
    });
    bctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    reset(true);
  }

  function reset(silent) {
    numbers = makeNumbers();
    revealed = false;
    progress = 0;
    sparks = [];
    drawBase();
    drawCover();
    wrap.classList.remove('is-revealed');
    if (!silent) wrap.dispatchEvent(new CustomEvent('rub:reset'));
    updateHint();
  }

  function updateHint() {
    const hint = document.getElementById('rub-hint');
    if (!hint) return;
    hint.style.opacity = progress > 0.04 ? '0' : '1';
  }

  function pointFrom(e) {
    const rect = cover.getBoundingClientRect();
    const src = e.touches && e.touches[0] ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function rubAt(pt) {
    const radius = Math.max(20, Math.min(W, H) * 0.11);

    cctx.globalCompositeOperation = 'destination-out';
    // Soft-edged brush so the reveal looks worn away, not cut out.
    const g = cctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cctx.fillStyle = g;
    cctx.beginPath();
    cctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    cctx.fill();

    // join to the previous point so a fast swipe doesn't leave gaps
    if (lastPt) {
      const dist = Math.hypot(pt.x - lastPt.x, pt.y - lastPt.y);
      const steps = Math.ceil(dist / (radius * 0.4));
      for (let i = 1; i < steps; i++) {
        const ix = lastPt.x + ((pt.x - lastPt.x) * i) / steps;
        const iy = lastPt.y + ((pt.y - lastPt.y) * i) / steps;
        const gg = cctx.createRadialGradient(ix, iy, 0, ix, iy, radius);
        gg.addColorStop(0, 'rgba(0,0,0,1)');
        gg.addColorStop(0.55, 'rgba(0,0,0,0.75)');
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        cctx.fillStyle = gg;
        cctx.beginPath();
        cctx.arc(ix, iy, radius, 0, Math.PI * 2);
        cctx.fill();
      }
    }
    cctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < 3; i++) {
      sparks.push({
        x: pt.x + rand(-14, 14),
        y: pt.y + rand(-14, 14),
        vx: rand(-0.7, 0.7),
        vy: rand(-1.5, -0.3),
        life: 1,
        r: rand(1, 2.6),
        c: Math.random() < 0.75 ? GOLD : MARIGOLD,
      });
    }

    lastPt = pt;
  }

  // Sampled coverage check - reading every pixel each frame would stutter
  // on a mid-range phone.
  function measureProgress() {
    const step = 14;
    let clear = 0;
    let total = 0;
    try {
      const data = cctx.getImageData(0, 0, cover.width, cover.height).data;
      const rowBytes = cover.width * 4;
      for (let y = 0; y < cover.height; y += step) {
        for (let x = 0; x < cover.width; x += step) {
          const alpha = data[y * rowBytes + x * 4 + 3];
          if (alpha < 60) clear++;
          total++;
        }
      }
    } catch (e) {
      return progress;
    }
    return total ? clear / total : 0;
  }

  function drawSparks() {
    if (!sparks.length) return;
    sparks = sparks.filter((s) => s.life > 0);
    sparks.forEach((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.vy -= 0.012;
      s.life -= 0.028;
      cctx.globalCompositeOperation = 'source-over';
      const a = Math.max(0, s.life);
      const g = cctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      g.addColorStop(0, `rgba(${s.c},${a * 0.8})`);
      g.addColorStop(1, `rgba(${s.c},0)`);
      cctx.fillStyle = g;
      cctx.beginPath();
      cctx.arc(s.x, s.y, s.r * 4, 0, Math.PI * 2);
      cctx.fill();
    });
  }

  function loop() {
    drawSparks();
    rafId = requestAnimationFrame(loop);
  }

  function finish() {
    if (revealed) return;
    revealed = true;
    wrap.classList.add('is-revealed');
    // Clear the rest of the cover in one sweep so the numbers land cleanly.
    cctx.globalCompositeOperation = 'destination-out';
    cctx.fillStyle = 'rgba(0,0,0,1)';
    cctx.fillRect(0, 0, W, H);
    cctx.globalCompositeOperation = 'source-over';
    wrap.dispatchEvent(new CustomEvent('rub:revealed', { detail: { numbers: numbers.map((n) => n.text) } }));
  }

  let checkTick = 0;
  function onMove(e) {
    if (!rubbing || revealed) return;
    if (e.cancelable) e.preventDefault();
    rubAt(pointFrom(e));

    if (++checkTick % 8 === 0) {
      progress = measureProgress();
      updateHint();
      if (progress > 0.52) finish();
    }
  }

  function start(e) {
    if (revealed) return;
    rubbing = true;
    lastPt = null;
    onMove(e);
  }
  function end() {
    rubbing = false;
    lastPt = null;
  }

  cover.addEventListener('pointerdown', start);
  cover.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', end);
  cover.addEventListener('touchstart', start, { passive: false });
  cover.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('touchend', end);

  window.addEventListener('resize', () => {
    clearTimeout(window.__rubResize);
    window.__rubResize = setTimeout(resize, 220);
  });

  // Expose a reset so the "rub again" button can call it.
  wrap.rubReset = () => reset(false);

  resize();
  loop();
})();
