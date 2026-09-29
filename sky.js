/* =====================================================================
   sky.js — drifting ASCII clouds in blue, drawn on <canvas id="sky">.
   Shared by every page: add <canvas id="sky"></canvas> and
   <script src="sky.js"></script> to a page and it gets the clouds.
   ===================================================================== */
(() => {
  /* ===== Settings — tweak these ===== */
  const CHARS    = ' .,:;~=+*#'; // thin -> thick cloud
  const FONT_PX  = 14;    // character size
  const SCALE    = 0.032; // cloud size (smaller = bigger, puffier clouds)
  const SPEED    = 1.6;   // drift speed (cells per second, left to right)
  const COVER    = 0.53;  // how much sky is cloud (lower = more cloud)
  const FPS      = 20;
  /* ================================== */

  const canvas = document.getElementById('sky');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // Color for each character: deep navy -> sky blue -> almost white
  function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  const NAVY = [16, 34, 64], SKY = [96, 160, 225], WHITE = [226, 240, 252];
  const PALETTE = [...CHARS].map((_, i) => {
    const t = i / (CHARS.length - 1);
    const c = t < 0.6 ? mix(NAVY, SKY, t / 0.6) : mix(SKY, WHITE, (t - 0.6) / 0.4);
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });

  // --- Value noise: smooth random "hills" used to shape the clouds ---
  const PERM = new Uint8Array(512);
  {
    const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
  }
  const hash = (x, y) => PERM[(PERM[x & 255] + y) & 511] / 255;
  const fade = t => t * t * (3 - 2 * t);
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = fade(x - xi), yf = fade(y - yi);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  }
  // Layer a few noise sizes together so clouds have big shapes AND wispy edges
  function clouds(x, y) {
    return noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.17;
  }

  let W, H, cols, rows, cw, ch;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = `${FONT_PX}px ui-monospace, Menlo, monospace`;
    ctx.textBaseline = 'top';
    cw = ctx.measureText('M').width; ch = FONT_PX;
    cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
  }

  function draw(t) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const last = CHARS.length - 1;
    const drift = t * SPEED; // how far the sky has moved
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Subtract drift so the pattern slides to the right; aspect fix keeps clouds round
        const v = clouds((x - drift) * SCALE, y * SCALE * 1.9 + t * 0.01);
        let b = (v - COVER) / (1 - COVER); // only the tops of the "hills" become cloud
        if (b <= 0) continue;
        b = Math.min(1, b * 1.3);
        const idx = Math.max(1, Math.round(b * last));
        ctx.fillStyle = PALETTE[idx];
        ctx.fillText(CHARS[idx], x * cw, y * ch);
      }
    }
  }

  let lastFrame = 0;
  function loop(ms) {
    if (ms - lastFrame >= 1000 / FPS) { lastFrame = ms; draw(ms / 1000); }
    requestAnimationFrame(loop);
  }

  addEventListener('resize', () => { resize(); draw(performance.now() / 1000); });
  resize();
  // Visitors who turn off motion in their device settings get a still sky
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) draw(0);
  else requestAnimationFrame(loop);
})();
