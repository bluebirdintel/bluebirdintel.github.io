/* =====================================================================
   hypno.js — Graham's portrait in colored ASCII, floating in a swirl.
     - the swirl turns COUNTERCLOCKWISE
     - the head turns CLOCKWISE
     - the eyes spin COUNTERCLOCKWISE (with a hypnotic spiral in each iris)
   Uses window.FACE from face-data.js. Registered as ART.hypno for art.html.
   ===================================================================== */
(() => {
  /* ===== Settings — tweak these ===== */
  const SWIRL_SPEED = 0.6;   // swirl rotation (radians/sec, counterclockwise)
  const FACE_SPEED  = 0.35;  // head rotation (radians/sec, clockwise)
  const EYE_SPEED   = 2.2;   // eye rotation (radians/sec, counterclockwise)
  const ARMS = 4, TWIST = 22;         // swirl shape
  const FACE_SIZE = 0.46;             // head radius as a fraction of the smaller screen side
  const FACE_CHARS  = ' .:-=+*#%@';   // dark -> bright
  const SWIRL_CHARS = ' .,:;-~=+*o#%@';
  /* ================================== */

  // Unpack the portrait: hex string -> separate red/green/blue arrays
  const F = window.FACE, N = F.size;
  const R8 = new Uint8Array(N * N), G8 = new Uint8Array(N * N), B8 = new Uint8Array(N * N);
  const IS_BG = new Uint8Array(N * N); // 1 where the pixel is the lavender wall/couch behind the head
  for (let i = 0; i < N * N; i++) {
    const r = parseInt(F.rgb.substr(i * 6, 2), 16), g = parseInt(F.rgb.substr(i * 6 + 2, 2), 16), b = parseInt(F.rgb.substr(i * 6 + 4, 2), 16);
    R8[i] = r; G8[i] = g; B8[i] = b;
    IS_BG[i] = (b - r > 12 && b > g) ? 1 : 0; // purple-ish = background, let the swirl show through
  }

  // Spread the face's brightness across the full character range ("histogram equalization").
  // Without this, skin is uniformly bright and everything turns into the same dense character.
  const LUMQ = new Float32Array(N * N);
  {
    const hist = new Uint32Array(256); let count = 0;
    const lum = i => Math.round(0.3 * R8[i] + 0.59 * G8[i] + 0.11 * B8[i]);
    for (let i = 0; i < N * N; i++) if (!IS_BG[i]) { hist[lum(i)]++; count++; }
    const cdf = new Float32Array(256); let run = 0;
    for (let v = 0; v < 256; v++) { run += hist[v]; cdf[v] = run / count; }
    for (let i = 0; i < N * N; i++) LUMQ[i] = cdf[lum(i)];
  }

  // Swirl colors: black-purple -> lavender -> pale lavender
  function mix(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
  const SW_PAL = [...SWIRL_CHARS].map((_, i) => {
    const t = i / (SWIRL_CHARS.length - 1);
    const c = t < 0.7 ? mix([40, 18, 60], [200, 162, 232], t / 0.7) : mix([200, 162, 232], [240, 228, 252], (t - 0.7) / 0.3);
    return `rgb(${c[0]},${c[1]},${c[2]})`;
  });

  window.ART = window.ART || {};
  window.ART.hypno = (canvas) => {
    const ctx = canvas.getContext('2d');
    let W, H, cw, ch, cols, rows, fontPx;

    function resize(w, h) {
      W = w; H = h;
      fontPx = Math.max(6, Math.min(11, Math.min(W, H) / 72));
      ctx.font = `bold ${fontPx}px ui-monospace, Menlo, monospace`;
      ctx.textBaseline = 'top';
      cw = ctx.measureText('M').width; ch = fontPx;
      cols = Math.ceil(W / cw); rows = Math.ceil(H / ch);
    }

    function draw(t) {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);

      const faceR = Math.min(W, H) * FACE_SIZE;      // head radius in screen pixels
      const gridR = N / 2;                            // same radius in portrait-grid units
      const toGrid = gridR / faceR;
      const th = FACE_SPEED * t;                      // head angle (clockwise)
      const cT = Math.cos(th), sT = Math.sin(th);
      const eyeAng = EYE_SPEED * t + th;              // undo the head spin, then spin the other way
      const cE = Math.cos(eyeAng), sE = Math.sin(eyeAng);
      const eyeZone = F.eyeR * 1.7;
      const lastF = FACE_CHARS.length - 1, lastS = SWIRL_CHARS.length - 1;

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          // Cell center relative to the middle of the canvas (screen y points down)
          const sx = (x + 0.5) * cw - W / 2, sy = (y + 0.5) * ch - H / 2;
          const d = Math.hypot(sx, sy);

          if (d < faceR) {
            // --- HEAD: rotate the screen point backwards to find which portrait pixel lands here.
            // On screen (y down), rotating by +angle looks clockwise.
            let gx = gridR + (cT * sx + sT * sy) * toGrid;
            let gy = gridR + (-sT * sx + cT * sy) * toGrid;

            // --- EYES: inside an iris, rotate again the opposite way
            let spiral = 0;
            for (const [ex, ey] of F.eyes) {
              const vx = gx - ex, vy = gy - ey, vd = Math.hypot(vx, vy);
              if (vd < eyeZone) {
                const rx = cE * vx - sE * vy, ry = sE * vx + cE * vy;
                gx = ex + rx; gy = ey + ry;
                // hypnotic spiral inside the iris, strongest in the middle
                const a = Math.atan2(ry, rx);
                spiral = (Math.sin(3 * a + vd * 1.6) > 0.15 ? 0.95 : 0) * Math.min(1, 2.2 * (1 - vd / eyeZone));
                break;
              }
            }

            const ix = gx | 0, iy = gy | 0;
            if (ix >= 0 && iy >= 0 && ix < N && iy < N) {
              const i = iy * N + ix;
              if (!IS_BG[i]) {
                let r = R8[i], g = G8[i], b = B8[i];
                if (spiral > 0) { // blend the spiral in as lavender
                  r += (210 - r) * spiral; g += (170 - g) * spiral; b += (255 - b) * spiral;
                }
                const lum = spiral > 0 ? Math.max(LUMQ[i], spiral) : LUMQ[i];
                const idx = Math.round(lum * lastF);
                if (idx > 0) {
                  ctx.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
                  ctx.fillText(FACE_CHARS[idx], x * cw, y * ch);
                }
                continue; // this cell belongs to the head
              }
            }
          }

          // --- SWIRL (everywhere the head isn't). Angles use y-up so it turns counterclockwise.
          const ang = Math.atan2(-sy, sx);
          const rad = d / Math.min(W, H);
          const v = Math.sin(ARMS * (ang - SWIRL_SPEED * t) + TWIST * rad);
          let br = (v + 1) / 2;
          br = br * br * Math.min(1, rad * 6 + 0.2);
          br *= d < faceR * 1.1 ? 0.35 : 0.7; // keep the swirl dimmer than the face, darkest right around the head
          const si = Math.round(br * lastS);
          if (si === 0) continue;
          ctx.fillStyle = SW_PAL[si];
          ctx.fillText(SWIRL_CHARS[si], x * cw, y * ch);
        }
      }
    }

    return { resize, draw };
  };
})();
