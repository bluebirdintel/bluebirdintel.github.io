/* =====================================================================
   bombrun.js — the bluebird flies back and forth across the screen,
   dropping ASCII bombs. Each pass ends with one big bomb and an explosion,
   then the bird turns around and comes back the other way. Loops forever.
   Registered as ART.bombrun for art.html.
   ===================================================================== */
(() => {
  /* ===== Settings — tweak these ===== */
  const CROSS = 3.6;        // seconds to fly across the screen once
  const TURN_PAUSE = 0.9;   // seconds offscreen before flying back
  const DROP_EVERY = 0.4;   // seconds between small bombs
  const BIG_AT = 0.5;       // where along the pass the big bomb drops (0 = start, 1 = end)
  /* ================================== */

  const BLUE = '#3fa9f5', DEEP = '#1b4f8a', LAV = '#c8a2e8', WHITE = '#eaf4ff';
  const INK = { B: '#6ba3d6', W: '#d7dde6', E: '#5fbf3a', O: '#f0b060', D: '#4f86c6' };

  // The logo bird, body only. The wing is added per frame below.
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
  const WING_COLS = 4, WIDTH = WING_COLS + 15;

  // Build a full sprite frame (characters + color mask) facing right.
  function buildFrame(wing) {
    const chars = [], mask = [];
    for (let r = 0; r < BODY.length; r++) {
      let c = ' '.repeat(WING_COLS) + BODY[r].padEnd(15);
      let m = ' '.repeat(WING_COLS) + MASK[r].padEnd(15);
      const k = r - wing.row;
      if (k >= 0 && k < wing.rows.length) {
        const w = wing.rows[k].padEnd(WING_COLS);
        c = w + c.slice(WING_COLS);
        m = w.replace(/\S/g, 'D') + m.slice(WING_COLS);
      }
      chars.push(c); mask.push(m);
    }
    return { chars, mask };
  }

  // Flip a frame to face left: reverse each row and swap direction-sensitive characters.
  const SWAP = { '/': '\\', '\\': '/', '(': ')', ')': '(', '<': '>', '>': '<', '`': "'", "'": '`' };
  function mirror(f) {
    return {
      chars: f.chars.map(row => [...row].reverse().map(ch => SWAP[ch] || ch).join('')
        .replace(/_</g, '>_')),  // keep the >_ terminal eyes reading correctly
      mask: f.mask.map(row => [...row].reverse().join(''))
    };
  }

  const RIGHT = [buildFrame(WING_UP), buildFrame(WING_DOWN)];
  const LEFT = RIGHT.map(mirror);

  window.ART = window.ART || {};
  window.ART.bombrun = (canvas) => {
    const g = canvas.getContext('2d');
    let W, H, FS, cw;
    const FONT = 'ui-monospace, Menlo, monospace';

    function resize(w, h) {
      W = w; H = h;
      FS = Math.max(9, Math.min(20, W / 40));
      g.font = `bold ${FS}px ${FONT}`;
      g.textBaseline = 'top';
      cw = g.measureText('M').width;
    }

    // Everything that happens during the loop
    let dir = 1;               // 1 = flying right, -1 = flying left
    let passStart = 0;         // time the current pass began
    let lastDrop = 0, bigDropped = false;
    let boom = null;           // { x, y, at } for the current explosion
    const bombs = [], parts = [];
    let prevT = null;

    const groundY = () => H * 0.84;

    function burst(x, y, n, speed, chars, cols, upOnly) {
      for (let i = 0; i < n; i++) {
        const a = upOnly ? -Math.PI * (0.1 + Math.random() * 0.8) : Math.random() * Math.PI * 2;
        const s = speed * (0.3 + Math.random() * 0.7), life = 0.5 + Math.random() * 0.9;
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life, max: life,
          ch: chars[(Math.random() * chars.length) | 0], col: cols[(Math.random() * cols.length) | 0] });
      }
    }

    function draw(t) {
      if (prevT === null) { prevT = t; passStart = t; }
      const dt = Math.min(0.05, t - prevT); prevT = t;
      const sw = WIDTH * cw;

      // --- where is the bird on this pass? ---
      const p = (t - passStart) / CROSS; // 0..1 while crossing
      if (p > 1 + TURN_PAUSE / CROSS) { // pass finished: turn around
        dir = -dir; passStart = t; lastDrop = t; bigDropped = false;
      }
      const prog = Math.min(1, Math.max(0, p));
      const bx = dir === 1 ? -sw + prog * (W + sw) : W - prog * (W + sw);
      const by = H * 0.18 + Math.sin(prog * Math.PI * 3) * H * 0.03;
      const flying = p > 0 && p < 1;
      const belly = { x: bx + WIDTH * cw / 2, y: by + 5 * FS };

      // --- drop bombs ---
      if (flying && p > 0.05 && p < 0.95 && t - lastDrop > DROP_EVERY) {
        lastDrop = t;
        bombs.push({ x: belly.x, y: belly.y, vx: 60 * dir, vy: 0, big: false });
      }
      if (flying && !bigDropped && p >= BIG_AT) {
        bigDropped = true;
        bombs.push({ x: belly.x, y: belly.y, vx: 30 * dir, vy: 0, big: true });
      }

      // --- move bombs; small ones pop on the ground, the big one explodes midair ---
      for (let i = bombs.length - 1; i >= 0; i--) {
        const m = bombs[i];
        m.vy += H * 1.4 * dt; m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.big && m.y >= H * 0.58) {
          bombs.splice(i, 1);
          boom = { x: m.x, y: m.y, at: t };
          burst(m.x, m.y, 320, Math.max(W, H) * 0.9, '@#%*+=-:.', [BLUE, LAV, WHITE, LAV], false);
        } else if (!m.big && m.y >= groundY()) {
          bombs.splice(i, 1);
          burst(m.x, groundY(), 18, H * 0.5, "*+x.'", [BLUE, LAV, WHITE], true);
        }
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const q = parts[i];
        q.x += q.vx * dt; q.y += q.vy * dt; q.vy += H * 0.6 * dt; q.vx *= 0.985; q.life -= dt;
        if (q.life <= 0) parts.splice(i, 1);
      }

      // --- draw ---
      g.globalAlpha = 1;
      g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      g.font = `bold ${FS}px ${FONT}`;

      g.fillStyle = DEEP; // ground
      g.fillText('_'.repeat(Math.ceil(W / cw)), 0, groundY());

      for (const m of bombs) {
        g.fillStyle = m.big ? WHITE : LAV;
        g.fillText(m.big ? '(@)' : '@', m.x - (m.big ? cw * 1.5 : cw / 2), m.y);
      }

      if (flying) {
        const frames = dir === 1 ? RIGHT : LEFT;
        const f = frames[Math.floor(t / 0.14) % 2];
        const top = by - 4 * FS;
        for (let r = 0; r < f.chars.length; r++) {
          const row = f.chars[r], mrow = f.mask[r];
          for (let i = 0; i < row.length; i++) {
            if (row[i] === ' ') continue;
            g.fillStyle = INK[mrow[i]] || INK.B;
            g.fillText(row[i], bx + i * cw, top + r * FS);
          }
        }
      }

      for (const q of parts) {
        g.globalAlpha = Math.max(0, q.life / q.max);
        g.fillStyle = q.col;
        g.fillText(q.ch, q.x, q.y);
      }

      if (boom) { // shockwave ring + soft flash
        const age = t - boom.at;
        if (age < 0.9) {
          const ringR = age * Math.max(W, H) * 1.3;
          const n = Math.max(12, Math.floor((2 * Math.PI * ringR) / cw));
          g.globalAlpha = 1 - age / 0.9;
          g.fillStyle = LAV;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            g.fillText('#', boom.x + Math.cos(a) * ringR, boom.y + Math.sin(a) * ringR);
          }
          if (age < 0.3) { g.globalAlpha = 0.5 * (1 - age / 0.3); g.fillStyle = WHITE; g.fillRect(0, 0, W, H); }
        } else boom = null;
      }
      g.globalAlpha = 1;
    }

    return { resize, draw };
  };
})();
