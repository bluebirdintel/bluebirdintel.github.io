/* =====================================================================
   intro.js — short opening: the terminal types "> bluebird_intel",
   the logo bird flies across once, then the intro fades into the site.
   Plays once per visit. Tap, click, or press any key to skip.
   Needs: <div id="intro"><canvas id="introCanvas"></canvas></div>
   ===================================================================== */
(() => {
  const intro = document.getElementById('intro');
  if (!intro) return;

  // Only play once per browser session, and never for reduced-motion users
  let seen = false;
  try { seen = sessionStorage.getItem('introSeen') === '1'; } catch (e) {}
  if (seen || matchMedia('(prefers-reduced-motion: reduce)').matches) { intro.remove(); return; }
  try { sessionStorage.setItem('introSeen', '1'); } catch (e) {}

  const cv = document.getElementById('introCanvas');
  const g = cv.getContext('2d');
  const FONT = 'ui-monospace, Menlo, monospace';
  const TITLE = '> bluebird_intel';

  // Bird sprite, drawn from the bluebird_intel logo: tuft, glasses, >_ eyes
  const BODY = [
    '      _,',
    "  .-'` /`-.",
    ' / .---. .---.',
    '-|-|>_ |=|>_ |',
    " | '---' '---'>",
    ' |           |',
    '  \\         /',
    "   '-.___.-'",
    '     ,, ,,'
  ];
  // Color mask: B body blue, W glasses, E green >_ eyes, O orange beak/feet
  const MASK = [
    '      BB',
    '  BBBBBBBBB',
    ' B WWWWW WWWWW',
    'WBWWEE WWWEE W',
    ' B WWWWW WWWWWO',
    ' B           B',
    '  B         B',
    '   BBBBBBBBB',
    '     OO OO'
  ];
  const WING_UP   = { row: 1, rows: ['\\\\', ' \\\\\\', '  \\\\'] };
  const WING_DOWN = { row: 4, rows: ['  //', ' ///', '//'] };
  const INK = { B: '#6ba3d6', W: '#d7dde6', E: '#5fbf3a', O: '#f0b060', D: '#4f86c6', T: '#7fb8ec' };
  const WING_COLS = 4, SPRITE_COLS = WING_COLS + 15;

  let W, H, FS, cw;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    FS = Math.max(12, Math.min(20, W / 34));
    g.font = `bold ${FS}px ${FONT}`;
    g.textBaseline = 'top';
    cw = g.measureText('M').width;
  }
  size(); addEventListener('resize', size);

  function drawBird(x, y, flapUp) {
    const top = y - 4 * FS;
    BODY.forEach((row, r) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === ' ') continue;
        g.fillStyle = INK[MASK[r][i]] || INK.B;
        g.fillText(row[i], x + (WING_COLS + i) * cw, top + r * FS);
      }
    });
    const w = flapUp ? WING_UP : WING_DOWN;
    g.fillStyle = INK.D;
    w.rows.forEach((row, k) => g.fillText(row, x, top + (w.row + k) * FS));
  }

  // Timing (seconds)
  const TYPE_END = 0.8;      // title finishes typing
  const BIRD_START = 0.5;    // bird enters
  const CROSS = 2.6;         // time to fly across the screen
  const END = BIRD_START + CROSS + 0.2;

  let t = 0, prev = null, finished = false;
  const trail = []; // faint dots left behind the bird

  function finish() {
    if (finished) return;
    finished = true;
    intro.classList.add('done');
    setTimeout(() => intro.remove(), 900);
  }
  intro.addEventListener('pointerdown', finish);
  addEventListener('keydown', finish, { once: true });

  // Fading dotted trail behind the bird
  function drawTrail() {
    for (const d of trail) {
      const age = t - d.born;
      if (age > 1.2) continue;
      g.globalAlpha = 0.5 * (1 - age / 1.2);
      g.fillStyle = INK.T;
      g.fillText('.', d.x, d.y);
    }
    g.globalAlpha = 1;
  }

  function step(ms) {
    if (finished) return;
    if (prev === null) prev = ms;
    t += Math.min(0.05, (ms - prev) / 1000); prev = ms;

    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);

    // Title, typed out like a terminal, centered
    g.font = `bold ${Math.max(16, FS * 1.2)}px ${FONT}`;
    const shown = TITLE.slice(0, Math.floor(Math.min(1, t / TYPE_END) * TITLE.length));
    const cursor = Math.floor(t * 3) % 2 ? '_' : ' ';
    const tw = g.measureText(TITLE + '_').width;
    g.fillStyle = INK.T;
    g.fillText(shown + cursor, (W - tw) / 2, H * 0.66);
    g.font = `bold ${FS}px ${FONT}`;

    // Bird glides across on a gentle wave
    const p = (t - BIRD_START) / CROSS;
    if (p > 0 && p < 1) {
      const sw = SPRITE_COLS * cw;
      const x = -sw + p * (W + sw);
      const y = H * 0.38 + Math.sin(p * Math.PI * 2) * H * 0.025;
      if (Math.floor(t * 20) % 2 === 0) trail.push({ x: x + WING_COLS * cw, y: y + FS, born: t });
      drawTrail();
      drawBird(x, y, Math.floor(t / 0.16) % 2 === 1);
    } else {
      drawTrail();
    }

    if (t >= END) finish();
    else requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
})();
