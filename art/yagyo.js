/* =====================================================================
   yagyo.js — 百鬼夜行 Hyakki Yagyō, the Night Parade of One Hundred Demons.
   A procession of yōkai marches right-to-left (the way the old scrolls read)
   under a full moon, past a torii gate, through drifting mist, with fox fires
   floating overhead. Every figure is drawn in text characters.
   Registered as ART.yagyo for art.html.
   ===================================================================== */
(() => {
  /* ===== Settings — tweak these ===== */
  const MARCH_SPEED = 3.2;  // how fast the parade moves (character columns per second)
  const GAP = 6;            // empty columns between marchers
  const FOX_FIRES = 7;      // floating blue flames
  /* ================================== */

  // ---------------------------------------------------------------------
  // THE YŌKAI
  // Each has 2 frames (for walking/wagging), a main color, and "accent"
  // characters that get their own color (eyes, tongues, weapons...).
  // All face left, because the parade moves left.
  // float: hovers above the ground.  hop: bounces instead of walking.
  // ---------------------------------------------------------------------
  const YOKAI = {
    lantern: { // chōchin-obake: a paper lantern with an eye and a lolling tongue
      color: '#f0a040', float: 3,
      accents: { '@': '#ffe066', 'U': '#ff5a5a' },
      frames: [[
        '   .-----.',
        '  (=======)',
        '  | @   @ |',
        '  |=======|',
        '  |  ___  |',
        '  |=(_U_)=|',
        '  (=======)',
        "   '-----'",
        '      |'
      ], [
        '   .-----.',
        '  (=======)',
        '  | @   - |',
        '  |=======|',
        '  | .___. |',
        '  |=( U )=|',
        '  (===U===)',
        "   '-----'",
        '      |'
      ]]
    },
    kasa: { // kasa-obake: an old umbrella with one eye, a tongue, and one leg
      color: '#b784e0', hop: true,
      accents: { '@': '#ffe066', 'U': '#ff5a5a', '_': '#8a6a4a' },
      frames: [[
        '      ,',
        '     /|\\',
        '    / | \\',
        '   /  @  \\',
        '  /   U   \\',
        " /'-.-|-.-'\\",
        '      |',
        '      |',
        '     _/'
      ], [
        '      ,',
        '     /|\\',
        '    / | \\',
        '   /  @  \\',
        '  /  (U)  \\',
        " /'-.-|-.-'\\",
        '      |',
        '      |',
        '      \\_'
      ]]
    },
    oni: { // oni: horned ogre carrying a spiked club
      color: '#e05a4a',
      accents: { '@': '#ffe066', 'v': '#ffffff', '#': '#a0784a', '=': '#a0784a', '^': '#f0e6d0', 'o': '#a0784a' },
      frames: [[
        '     ^     ^',
        '    .-------.',
        '    | @   @ |',
        '    |   <   |',
        '    | vvvvv |',
        "    '-------'",
        ' o#==/|     |\\',
        ' ##   |_____|',
        '       |   |',
        '      _|   |_'
      ], [
        '     ^     ^',
        '    .-------.',
        '    | @   @ |',
        '    |   <   |',
        '    | vvvvv |',
        "    '-------'",
        ' o#==/|     |\\',
        ' ##   |_____|',
        '       /   \\',
        '      /_   _\\'
      ]]
    },
    kappa: { // kappa: river imp with a water-filled dish on its head and a shell
      color: '#5fbf6a',
      accents: { '~': '#7fd0ff', '@': '#ffe066', '<': '#f0c040', '#': '#3f8f4a' },
      frames: [[
        '    .~~~.',
        '   ( ~~~ )',
        '  /  @  @ \\',
        ' <<        |',
        '  \\  ___  /',
        '  /|/###\\|\\',
        '   |#####|',
        '   |_____|',
        '    |   |',
        '   _|   |_'
      ], [
        '    .~~~.',
        '   ( ~~~ )',
        '  /  @  @ \\',
        ' <<        |',
        '  \\  ___  /',
        '  /|/###\\|\\',
        '   |#####|',
        '   |_____|',
        '    /   \\',
        '   /_   _\\'
      ]]
    },
    rokuro: { // rokurokubi: kimono body; the neck and head are drawn separately (see drawNeck)
      color: '#e07aa8', neck: true,
      accents: { '~': '#ffd0e0' },
      frames: [[
        '    .-.',
        '   /===\\',
        '  /|~~~|\\',
        '   |~~~|',
        '   |~~~|',
        '  /_____\\'
      ], [
        '    .-.',
        '   /===\\',
        '  /|~~~|\\',
        '   |~~~|',
        '   |~~~|',
        '  _\\___/_'
      ]]
    },
    kozo: { // hitotsume-kozō: a small monk boy with a single huge eye
      color: '#d8c8a8',
      accents: { '@': '#9fe0ff', 'o': '#ff8a8a', '~': '#8a7a9a' },
      frames: [[
        '   .---.',
        '  ( (@) )',
        '   \\ o /',
        '  /|~~~|\\',
        ' / |   | \\',
        '   |___|',
        '   /   \\'
      ], [
        '   .---.',
        '  ( (@) )',
        '   \\ o /',
        '  /|~~~|\\',
        ' / |   | \\',
        '   |___|',
        '    | |'
      ]]
    }
  };
  // The rokurokubi's floating head
  const HEAD = ['  _###_', ' ( @ @ )', '  \\ ~ /'];
  const HEAD_ACC = { '#': '#6a6a90', '@': '#ffe066' };
  const SKIN = '#f0dcc8';

  // Marching order (it loops)
  const ORDER = ['lantern', 'oni', 'kasa', 'kappa', 'rokuro', 'kozo', 'kasa', 'oni', 'lantern', 'kozo'];

  // Torii gate: taller than the marchers so they pass "through" it
  const TORII = [
    '_______________________________',
    '\\_____________________________/',
    '     ||                 ||',
    '  ===||=================||===',
    '     ||      .---.      ||',
    '     ||      |###|      ||',
    "     ||      '---'      ||",
    ...Array(8).fill('     ||                 ||'),
    '    _||_               _||_'
  ];

  // Small value-noise helper for the mist
  const PERM = new Uint8Array(512);
  { const p = [...Array(256).keys()];
    for (let i = 255; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; }
    for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
  const hash = (x, y) => PERM[(PERM[x & 255] + y) & 511] / 255;
  function noise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  window.ART = window.ART || {};
  window.ART.yagyo = (canvas) => {
    const g = canvas.getContext('2d');
    const FONT = 'ui-monospace, Menlo, monospace';
    let W, H, FS, cw, cols, rows, groundRow;
    let stars = [], fires = [], slots = [], loopCols = 0;

    function resize(w, h) {
      W = w; H = h;
      FS = Math.max(7, Math.min(16, H / 38));
      g.font = `bold ${FS}px ${FONT}`;
      g.textBaseline = 'top';
      cw = g.measureText('M').width;
      cols = Math.ceil(W / cw); rows = Math.ceil(H / FS);
      groundRow = Math.floor(rows * 0.8);

      // Lay out the parade: each marcher gets a starting column in one long loop
      slots = []; let c = 0;
      for (const name of ORDER) {
        const width = Math.max(...YOKAI[name].frames[0].map(r => r.length));
        slots.push({ name, col: c, phase: Math.random() * 6 });
        c += width + GAP;
      }
      loopCols = Math.max(c, cols + 20); // loop is always wider than the screen, so they re-enter smoothly

      // Stars scattered in the sky
      stars = Array.from({ length: Math.floor(cols * rows * 0.012) }, () => ({
        x: Math.random() * cols | 0, y: Math.random() * groundRow * 0.75 | 0,
        ch: '.·*+'[(Math.random() * 4) | 0], ph: Math.random() * 6, sp: 0.5 + Math.random() * 1.5
      }));
      fires = Array.from({ length: FOX_FIRES }, (_, i) => ({ off: (i / FOX_FIRES) * loopCols, ph: Math.random() * 6 }));
    }

    const put = (ch, col, row, color) => { g.fillStyle = color; g.fillText(ch, col * cw, row * FS); };

    // Draw a sprite with its top-left at (col, row) in character cells
    function drawSprite(lines, col, row, color, accents) {
      for (let r = 0; r < lines.length; r++) {
        const line = lines[r];
        for (let i = 0; i < line.length; i++) {
          const ch = line[i];
          if (ch === ' ') continue;
          put(ch, col + i, row + r, accents[ch] || color);
        }
      }
    }

    // The rokurokubi's neck: a swaying line of ( ) rising from the collar, head on top
    function drawNeck(col, row, t, phase) {
      const len = 7 + Math.round(3 * (0.5 + 0.5 * Math.sin(t * 0.7 + phase))); // it stretches and shrinks
      let x = col + 4, prevX = x;
      for (let k = 1; k <= len; k++) {
        x = col + 4 + Math.sin(t * 1.4 + phase + k * 0.45) * k * 0.28;
        const ch = x > prevX + 0.15 ? '/' : x < prevX - 0.15 ? '\\' : '|';
        put(ch, Math.round(x), row - k, SKIN);
        prevX = x;
      }
      drawSprite(HEAD, Math.round(x) - 4, row - len - HEAD.length, SKIN, HEAD_ACC);
    }

    function draw(t) {
      g.globalAlpha = 1;
      g.fillStyle = '#02030a'; g.fillRect(0, 0, W, H);
      g.font = `bold ${FS}px ${FONT}`;

      // --- stars (twinkling) ---
      for (const s of stars) {
        g.globalAlpha = 0.25 + 0.75 * Math.max(0, Math.sin(t * s.sp + s.ph));
        put(s.ch, s.x, s.y, '#cfd8ff');
      }
      g.globalAlpha = 1;

      // --- full moon, textured with craters ---
      const mx = cols * 0.8, my = rows * 0.22, mr = Math.min(rows * 0.15, cols * 0.08);
      for (let y = Math.floor(my - mr * 1.5); y <= my + mr * 1.5; y++) {
        for (let x = Math.floor(mx - mr * 3); x <= mx + mr * 3; x++) {
          const dx = (x - mx) * cw / FS, dy = y - my, d = Math.hypot(dx, dy); // correct for tall characters
          if (d < mr) {
            const n = noise(x * 0.35, y * 0.5);
            put(n > 0.62 ? '%' : n > 0.45 ? '@' : '#', x, y, n > 0.62 ? '#cfc592' : '#f3eac2');
          } else if (d < mr * 1.35 && hash(x + 50, y + 50) > 0.9) {
            g.globalAlpha = 0.35; put('.', x, y, '#f3eac2'); g.globalAlpha = 1; // soft glow
          }
        }
      }

      // --- torii gate behind the parade ---
      drawSprite(TORII, Math.floor(cols * 0.26), groundRow - TORII.length + 1, '#9a3232', { '#': '#c9a04a' });

      // --- ground ---
      g.fillStyle = '#23304a';
      g.fillText('_'.repeat(cols + 1), 0, groundRow * FS);

      // --- the procession ---
      const scroll = t * MARCH_SPEED;
      for (const s of slots) {
        const y = YOKAI[s.name];
        // position in the loop, moving left; wraps back around to the right edge
        let col = ((s.col - scroll) % loopCols + loopCols) % loopCols - 12;
        if (col > cols + 2) continue;
        const frame = y.frames[Math.floor(t * 3 + s.phase) % 2];
        let row = groundRow - frame.length + 1;
        if (y.float) row -= y.float + Math.round(Math.sin(t * 1.5 + s.phase) * 0.8);
        if (y.hop) row -= Math.round(Math.abs(Math.sin(t * 3 + s.phase)) * 2);
        else if (!y.float) row -= Math.round(Math.abs(Math.sin(t * 6 + s.phase)) * 0.4); // walking bob
        const c = Math.round(col);
        if (y.neck) drawNeck(c, row, t, s.phase);
        drawSprite(frame, c, row, y.color, y.accents);
      }

      // --- fox fires (kitsune-bi) floating above the parade ---
      for (const f of fires) {
        let col = ((f.off - scroll * 0.8) % loopCols + loopCols) % loopCols - 6;
        if (col > cols) continue;
        const row = rows * 0.42 + Math.sin(t * 1.1 + f.ph) * rows * 0.06;
        const flick = 0.55 + 0.45 * Math.sin(t * 9 + f.ph * 3);
        g.globalAlpha = 0.35 * flick;
        put('(', col - 1, row, '#4fb0ff'); put(')', col + 1, row, '#4fb0ff');
        g.globalAlpha = flick;
        put(Math.sin(t * 7 + f.ph) > 0 ? '*' : '+', col, row, '#8fffe0');
        g.globalAlpha = 0.5 * flick;
        put("'", col, row - 1, '#8fffe0');
      }
      g.globalAlpha = 1;

      // --- mist drifting through the bottom, in front of the marchers' feet ---
      for (let y = groundRow - 2; y < rows; y++) {
        const depth = (y - (groundRow - 2)) / (rows - groundRow + 2);
        for (let x = 0; x < cols; x++) {
          const n = noise(x * 0.08 + t * 0.35, y * 0.35 + t * 0.05);
          const v = n - 0.55 + depth * 0.25;
          if (v <= 0) continue;
          g.globalAlpha = Math.min(0.55, v * 1.6);
          put(v > 0.2 ? '~' : v > 0.1 ? '-' : '.', x, y, '#7f93b8');
        }
      }
      g.globalAlpha = 1;

      // --- title ---
      g.globalAlpha = 0.55;
      g.fillStyle = '#c9b8e8';
      g.fillText('百鬼夜行  night parade of one hundred demons', cw, FS * 0.6);
      g.globalAlpha = 1;
    }

    return { resize, draw };
  };
})();
