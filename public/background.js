/* =============================================================
   Fortuna — living background
   Original generative artwork (no stock footage or third-party
   imagery). Draws drifting temple embers and incense smoke on a
   canvas, plus slow-moving light pools behind them.

   Mobile-first constraints this respects:
   - particle count scales down on small screens
   - pauses entirely when the tab is hidden (saves battery)
   - honours prefers-reduced-motion by rendering one static frame
   - pointer-events:none so it never blocks taps
   ============================================================= */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let embers = [];
  let smoke = [];
  let rafId = null;
  let running = true;

  // Touch/mouse attractor - embers drift gently toward the pointer.
  const pointer = { x: -9999, y: -9999, active: false };

  const GOLD = [201, 162, 39];
  const BRIGHT = [228, 193, 88];
  const MARIGOLD = [232, 135, 58];

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2 - beyond that costs battery for no visible gain
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
  }

  function buildParticles() {
    // Scale density to screen area so phones don't render desktop counts.
    const area = width * height;
    const emberCount = Math.round(Math.min(70, Math.max(22, area / 26000)));
    const smokeCount = Math.round(Math.min(9, Math.max(4, area / 190000)));

    embers = [];
    for (let i = 0; i < emberCount; i++) {
      embers.push(makeEmber(true));
    }

    smoke = [];
    for (let i = 0; i < smokeCount; i++) {
      smoke.push({
        x: rand(0, width),
        y: rand(0, height),
        r: rand(140, 300),
        vx: rand(-0.09, 0.09),
        vy: rand(-0.06, 0.02),
        hue: Math.random() < 0.5 ? GOLD : MARIGOLD,
        alpha: rand(0.025, 0.06),
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  function makeEmber(seeded) {
    return {
      x: rand(0, width),
      y: seeded ? rand(0, height) : height + rand(10, 80),
      r: rand(0.7, 2.3),
      vy: rand(-0.42, -0.10),      // embers rise
      vx: rand(-0.16, 0.16),
      alpha: rand(0.25, 0.85),
      twinkle: rand(0, Math.PI * 2),
      twinkleSpeed: rand(0.008, 0.03),
      color: Math.random() < 0.72 ? BRIGHT : MARIGOLD,
    };
  }

  function drawSmoke() {
    smoke.forEach((s) => {
      s.x += s.vx;
      s.y += s.vy;
      s.phase += 0.0035;

      // Wrap softly around the edges.
      if (s.x < -s.r) s.x = width + s.r;
      if (s.x > width + s.r) s.x = -s.r;
      if (s.y < -s.r) s.y = height + s.r;
      if (s.y > height + s.r) s.y = -s.r;

      const breathe = 1 + Math.sin(s.phase) * 0.12;
      const radius = s.r * breathe;

      const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius);
      grad.addColorStop(0, `rgba(${s.hue[0]},${s.hue[1]},${s.hue[2]},${s.alpha})`);
      grad.addColorStop(1, `rgba(${s.hue[0]},${s.hue[1]},${s.hue[2]},0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.x, s.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawEmbers() {
    embers.forEach((e, i) => {
      e.x += e.vx;
      e.y += e.vy;
      e.twinkle += e.twinkleSpeed;

      // Gentle attraction toward the pointer - this is what makes the
      // background feel alive and responsive rather than a looping video.
      if (pointer.active) {
        const dx = pointer.x - e.x;
        const dy = pointer.y - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 190 && dist > 1) {
          const pull = (1 - dist / 190) * 0.045;
          e.x += dx * pull;
          e.y += dy * pull;
        }
      }

      // Recycle once it drifts off the top or sides.
      if (e.y < -12 || e.x < -30 || e.x > width + 30) {
        embers[i] = makeEmber(false);
        return;
      }

      const flicker = 0.62 + Math.sin(e.twinkle) * 0.38;
      const a = e.alpha * flicker;

      const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
      glow.addColorStop(0, `rgba(${e.color[0]},${e.color[1]},${e.color[2]},${a * 0.55})`);
      glow.addColorStop(1, `rgba(${e.color[0]},${e.color[1]},${e.color[2]},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${e.color[0]},${e.color[1]},${e.color[2]},${a})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function frame() {
    ctx.clearRect(0, 0, width, height);
    drawSmoke();
    drawEmbers();
    if (running) rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    running = true;
    frame();
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  // Pause when the tab isn't visible - no point burning phone battery
  // animating something nobody is looking at.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!reduceMotion) start();
  });

  window.addEventListener('resize', () => {
    resize();
    if (reduceMotion) {
      ctx.clearRect(0, 0, width, height);
      drawSmoke();
      drawEmbers();
    }
  });

  window.addEventListener('pointermove', (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = true;
  });
  window.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.x = -9999;
    pointer.y = -9999;
  });
  // Touch: follow the finger, then release shortly after lifting.
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      pointer.x = e.touches[0].clientX;
      pointer.y = e.touches[0].clientY;
      pointer.active = true;
    }
  }, { passive: true });
  window.addEventListener('touchend', () => {
    setTimeout(() => { pointer.active = false; }, 600);
  }, { passive: true });

  resize();
  if (reduceMotion) {
    // Single static frame - still looks composed, just doesn't move.
    drawSmoke();
    drawEmbers();
  } else {
    start();
  }
})();
