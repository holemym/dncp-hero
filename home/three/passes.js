// Four passes · dncp hero signature.
// A sheet feeds right to left (Hebrew reading and feed direction) under four roller stations.
// Each station lays down one plate in print order: yellow, magenta, cyan, black. At p = 1 the
// sheet lies flat with the logo printed and the camera is still.
//
// mountPasses(container, { base }) -> { setProgress(p), destroy() }; base = plates folder, e.g. 'img/plates/'
// The page owns p (0..1, lerped from scroll). Rendering is on demand: only when p or size changes.
// No WebGL -> throws an Error with name 'WebGLUnavailable'; the page shows img/plates/logo-print.png.

import * as THREE from '../vendor/three.module.min.js';

const PAPER = '#F6F4EF';
const INKS = { y: '#F5EA38', m: '#EF2D8E', c: '#379CC6', k: '#141414' };
const ORDER = ['y', 'm', 'c', 'k']; // print order, first station on the right

// Sheet: the logo artwork aspect (plates are 1144 x 1454).
const SHEET_W = 1.0;                  // along the feed (x)
const SHEET_H = 1454 / 1144;          // across the feed (z)
const R = 0.075;                      // roller radius
const ROLLER_L = SHEET_H * 1.3;       // press rollers run past the sheet on both sides
const SPACING = 1.2;                  // one sheet length plus a gap: one plate prints at a time
const STATION_K = 3.0;                // last (black) station: past the edge of the rest frame on a 3.5:1 cell
const STATIONS = ORDER.map((_, i) => STATION_K + (3 - i) * SPACING); // y, m, c, k, evenly spaced along the feed
const X_K_DONE = STATION_K - SHEET_W / 2;      // sheet centre when the black plate is complete
const X0 = X_K_DONE + 4 * SPACING;             // start: one spacing upstream of the yellow pass completing at 0.2
const X_REST = 0;
const GROUND_Y = -2 * R - 0.012;            // delivery table, just under the lower rollers
const PASS_SPEED = SPACING / 0.2;              // world units of feed per unit p during the passes

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// Sheet centre x for p. Constant feed through the four passes (plates complete at p 0.2, 0.4, 0.6, 0.8),
// then one Hermite segment that leaves the press at feed speed and comes to rest with zero velocity.
function sheetX(p) {
  if (p <= 0.8) return X0 - PASS_SPEED * p;
  const t = (p - 0.8) / 0.2, d = X_K_DONE - X_REST;
  const h10 = t * t * t - 2 * t * t + t, h01 = -2 * t * t * t + 3 * t * t;
  return X_K_DONE - (h10 * PASS_SPEED * 0.2 + h01 * d);
}

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

function noWebGL(msg) {
  const err = new Error(msg || 'WebGL unavailable');
  err.name = 'WebGLUnavailable';
  return err;
}

// Procedural paper tooth: tiled value noise turned into a normal map (no external texture).
function paperNormalTexture(size = 256) {
  const h = new Float32Array(size * size);
  const rnd = (x, y, s) => { const n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return n - Math.floor(n); };
  const octave = (cell, seed, amp) => {
    const g = size / cell;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy);
      const fx = gx - ix, fy = gy - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const v = (a, b) => rnd(((a % g) + g) % g, ((b % g) + g) % g, seed);
      const top = mix(v(ix, iy), v(ix + 1, iy), sx), bot = mix(v(ix, iy + 1), v(ix + 1, iy + 1), sx);
      h[y * size + x] += mix(top, bot, sy) * amp;
    }
  };
  octave(16, 1, 0.5); octave(8, 2, 0.3); octave(4, 3, 0.2); octave(2, 4, 0.12);
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (a, b) => h[((b + size) % size) * size + ((a + size) % size)];
    const dx = (at(x + 1, y) - at(x - 1, y)) * 2.0, dy = (at(x, y + 1) - at(x, y - 1)) * 2.0;
    const l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
    data[i] = (-dx / l * 0.5 + 0.5) * 255; data[i + 1] = (-dy / l * 0.5 + 0.5) * 255;
    data[i + 2] = (1 / l * 0.5 + 0.5) * 255; data[i + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

// Tileable value noise on a size x size grid, cell in texels (must divide size).
function tileNoise(size, cell, seed) {
  const out = new Float32Array(size * size), g = size / cell;
  const rnd = (x, y) => { const n = Math.sin((((x % g) + g) % g) * 127.1 + (((y % g) + g) % g) * 311.7 + seed * 74.7) * 43758.5453; return n - Math.floor(n); };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = gx - ix, fy = gy - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const top = mix(rnd(ix, iy), rnd(ix + 1, iy), sx), bot = mix(rnd(ix, iy + 1), rnd(ix + 1, iy + 1), sx);
    out[y * size + x] = mix(top, bot, sy);
  }
  return out;
}
function dataTex(data, size, srgb = false) {
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// Bead-blasted steel: a fine, very low contrast speckle (about 1-2 px on screen at 1920) in albedo and roughness.
// Albedo in the colour channels, roughness (0.56-0.64, plus faint rings along the length) in green of a second texture.
function steelTextures() {
  const n = 128, speck = tileNoise(n, 1, 3), soft = tileNoise(n, 4, 5);
  const alb = new Uint8Array(n * n * 4), rough = new Uint8Array(n * n * 4);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const k = y * n + x, i = k * 4, v = speck[k] * 0.7 + soft[k] * 0.3;
    const a = Math.round((0.955 + 0.045 * v) * 255);
    alb[i] = alb[i + 1] = alb[i + 2] = a; alb[i + 3] = 255;
    const ring = 0.012 * Math.sin(y * 0.9 + 1.3) * Math.sin(y * 0.23);
    rough[i] = rough[i + 1] = rough[i + 2] = Math.round((0.56 + 0.08 * v + ring) * 255); rough[i + 3] = 255;
  }
  return { albedo: dataTex(alb, n, true), roughness: dataTex(rough, n) };
}

// Uncoated stock. Red: tooth and short fibres (fine, centred on 0.5). Green: a slow mottle for ink density.
function paperTexture() {
  const n = 256, f1 = tileNoise(n, 1, 11), f2 = tileNoise(n, 2, 12), f3 = tileNoise(n, 4, 13);
  const m1 = tileNoise(n, 16, 21), m2 = tileNoise(n, 8, 22), m3 = tileNoise(n, 4, 23); // mottle: small cloudy grain, never a gradient
  const tooth = new Float32Array(n * n);
  for (let k = 0; k < n * n; k++) tooth[k] = 0.45 * f1[k] + 0.35 * f2[k] + 0.2 * f3[k];
  // fibres: short random strokes, slightly lighter or darker than the stock
  let seed = 7; const r = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let f = 0; f < 420; f++) {
    const x0 = r() * n, y0 = r() * n, ang = r() * Math.PI, len = 4 + r() * 9, val = (r() - 0.5) * 0.5;
    for (let s = 0; s < len; s += 0.5) {
      const x = Math.floor(x0 + Math.cos(ang) * s + n) % n, y = Math.floor(y0 + Math.sin(ang) * s + n) % n;
      tooth[y * n + x] = Math.min(1, Math.max(0, tooth[y * n + x] + val * 0.5));
    }
  }
  const d = new Uint8Array(n * n * 4);
  for (let k = 0; k < n * n; k++) {
    const i = k * 4;
    d[i] = Math.round(tooth[k] * 255);
    d[i + 1] = Math.round((0.5 * m1[k] + 0.3 * m2[k] + 0.2 * m3[k]) * 255);
    d[i + 2] = 128; d[i + 3] = 255;
  }
  return dataTex(d, n);
}

// Soft rectangle alpha (in the green channel, for alphaMap): solid inside fx x fy of the plane, smooth falloff to the edge.
function softRectTexture(fx, fy, size = 128) {
  const data = new Uint8Array(size * size * 4);
  const g = (u, f) => { const d = Math.max(0, Math.abs(u - 0.5) - f / 2) / Math.max(1e-4, (1 - f) / 2); const t = Math.min(1, d); return 1 - t * t * (3 - 2 * t); };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const a = g((x + 0.5) / size, fx) * g((y + 0.5) / size, fy), i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.round(a * a * 255); data[i + 3] = 255;
  }
  const t = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  t.colorSpace = THREE.NoColorSpace; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

// A small studio built in code and prefiltered once: a long softbox overhead along the roller axis (the brushed
// streak), a dimmer one at the left, a warm low bounce. Used only by the steel and the ink bands.
function studioEnvironment(renderer) {
  const room = new THREE.Scene();
  const geos = [], mats = [];
  const box = new THREE.BoxGeometry(1, 1, 1); geos.push(box);
  const wallMat = new THREE.MeshBasicMaterial({ color: 0x9a968f, side: THREE.BackSide }); mats.push(wallMat);
  const walls = new THREE.Mesh(box, wallMat); walls.scale.set(14, 7, 14); walls.position.y = 2; room.add(walls);
  const panel = (sx, sy, sz, x, y, z, k, tint = 0xffffff) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(k) }); mats.push(m);
    const o = new THREE.Mesh(box, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); room.add(o);
  };
  panel(2.4, 0.05, 9, -0.6, 5.2, 0, 4.5);        // overhead strip, broad along z: the highlight that runs along each roller
  panel(0.05, 2.4, 6, -6.8, 2.2, 0.5, 3.2);      // key side, upper left
  panel(6, 0.05, 6, 0, -1.4, 3, 0.9, 0xf2ebdd);  // paper bounce from the table in front
  panel(4, 2.2, 0.05, 1, 2.2, 6.8, 1.6);         // front fill, behind the camera
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(room, 0.035);
  pm.dispose();
  geos.forEach((g) => g.dispose()); mats.forEach((m) => m.dispose());
  return rt;
}

const SHEET_VERT_HEAD = /* glsl */`
uniform float uSheetX;
uniform vec4 uRoll;
uniform float uMotion;
varying float vWX;
varying vec2 vSheetUv;
// Height of the sheet at local x: a slight lift just past each nip it is running through,
// and a free leading edge that lifts while the sheet moves. Zero at rest.
float nipLift(float wx, float rx, float lx0, float lx1) {
  float inContact = step(lx0, rx) * step(rx, lx1);
  float d = wx - rx + 0.13;
  return inContact * 0.014 * exp(-d * d / 0.005);
}
float sheetH(float lx) {
  float wx = lx + uSheetX;
  float lx0 = uSheetX - ${(SHEET_W / 2).toFixed(4)}, lx1 = uSheetX + ${(SHEET_W / 2).toFixed(4)};
  float h = nipLift(wx, uRoll.x, lx0, lx1) + nipLift(wx, uRoll.y, lx0, lx1)
          + nipLift(wx, uRoll.z, lx0, lx1) + nipLift(wx, uRoll.w, lx0, lx1);
  float lead = 1.0 - smoothstep(0.0, 0.16, lx + ${(SHEET_W / 2).toFixed(4)});
  h += 0.018 * lead * lead;
  return h * uMotion;
}
`;

const SHEET_FRAG_HEAD = /* glsl */`
uniform sampler2D tY; uniform sampler2D tM; uniform sampler2D tC; uniform sampler2D tK;
uniform vec3 inkY; uniform vec3 inkM; uniform vec3 inkC; uniform vec3 inkK;
uniform vec4 uRoll;
uniform float uReady;
uniform float uMotion;
uniform sampler2D tPaper;
varying float vWX;
varying vec2 vSheetUv;
// A plate is on the sheet wherever that part of the sheet has already run under its roller.
// The wipe edge is soft over about 2.5 screen pixels at any zoom.
float laid(float rx) { float e = max(0.0025, 1.25 * fwidth(vWX)); return smoothstep(rx + e, rx - e, vWX); }
// Fresh ink is wet for the first ${(0.05 * 6).toFixed(2)} of feed after its nip (0.05 p at press speed), then dries matte.
float wetness(float rx) { float d = rx - vWX; return step(0.0, d) * (1.0 - smoothstep(0.0, ${(0.05 * 6).toFixed(2)}, d)); }
vec3 ink(vec3 col, float a) { return mix(vec3(1.0), col, a); } // multiply: ink on uncoated stock
`;

export function mountPasses(container, { base } = {}) {
  if (!container) throw new Error('mountPasses: container missing');
  if (!supportsWebGL()) throw noWebGL();
  // base: the plates folder (relative to the page URL or absolute), trailing slash optional.
  const root = base ?? new URL('../img/plates/', import.meta.url).href;
  const dir = root.endsWith('/') ? root : root + '/';

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    throw noWebGL(e && e.message);
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = false; // shadows are baked soft planes, no shadow maps
  const canvas = renderer.domElement;
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.setAttribute('aria-hidden', 'true');
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  // Orthographic: the four stations stay strictly parallel on screen; the only angle is the camera's elevation.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 60);
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  // Light: one soft key from upper left, plus a warm ambient. Calibrated so a flat sheet reads as paper.
  const hemi = new THREE.HemisphereLight(0xfffdf8, 0xe9e4da, 1.27);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 2.42);
  scene.add(key, key.target);
  const env = track(studioEnvironment(renderer));

  // Contact shadows on the paper ground (the canvas is transparent; the page's paper shows through):
  // baked soft planes, offset away from the key. One tight and one wide under the sheet, crossfaded by its height.
  const SHADOW_INK = 0x2f3032;
  const shadowPlane = (wid, dep, fx, fy) => {
    const tex = track(softRectTexture(fx, fy));
    const mat = track(new THREE.MeshBasicMaterial({ color: SHADOW_INK, alphaMap: tex, transparent: true, depthWrite: false, opacity: 0 }));
    const geo = track(new THREE.PlaneGeometry(wid, dep));
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, mat);
    m.renderOrder = -1;
    scene.add(m);
    return m;
  };
  const sheetShadowNear = shadowPlane(SHEET_W + 0.1, SHEET_H + 0.1, (SHEET_W - 0.04) / (SHEET_W + 0.1), (SHEET_H - 0.04) / (SHEET_H + 0.1));
  const sheetShadowFar = shadowPlane(SHEET_W + 0.42, SHEET_H + 0.42, 0.55, 0.62);
  sheetShadowNear.position.y = GROUND_Y + 0.0006;
  sheetShadowFar.position.y = GROUND_Y + 0.0004;

  // Sheet.
  const loader = new THREE.TextureLoader();
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  let loaded = 0;
  const plateTex = {};
  for (const n of ORDER) {
    const t = loader.load(`${dir}${n}.png`, () => { loaded++; if (loaded === 4) { uniforms.uReady.value = 1; requestRender(); } },
      undefined, () => { /* missing plate: the sheet stays blank paper */ });
    t.colorSpace = THREE.NoColorSpace;
    t.anisotropy = Math.min(8, maxAniso);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    plateTex[n] = track(t);
  }
  const lin = (hex) => new THREE.Color(hex); // THREE.Color converts sRGB hex to the working (linear) space
  const uniforms = {
    uSheetX: { value: X0 }, uRoll: { value: new THREE.Vector4(...STATIONS) }, uMotion: { value: 1 }, uReady: { value: 0 },
    tY: { value: plateTex.y }, tM: { value: plateTex.m }, tC: { value: plateTex.c }, tK: { value: plateTex.k },
    tPaper: { value: null },
    inkY: { value: lin(INKS.y) }, inkM: { value: lin(INKS.m) }, inkC: { value: lin(INKS.c) }, inkK: { value: lin(INKS.k) },
  };
  uniforms.tPaper.value = track(paperTexture());
  const paperNormal = track(paperNormalTexture());
  paperNormal.repeat.set(7, 7 * SHEET_H);
  const sheetMat = track(new THREE.MeshStandardMaterial({
    color: PAPER, roughness: 0.93, metalness: 0, normalMap: paperNormal, normalScale: new THREE.Vector2(0.2, 0.2),
    side: THREE.DoubleSide,
  }));
  sheetMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.fragmentShader = 'float vWet;\n' + sh.fragmentShader;
    sh.vertexShader = SHEET_VERT_HEAD + sh.vertexShader
      .replace('#include <beginnormal_vertex>', `
        float hE = 0.004;
        float dh = (sheetH(position.x + hE) - sheetH(position.x - hE)) / (2.0 * hE);
        vec3 objectNormal = normalize(vec3(-dh, 1.0, 0.0));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif`)
      .replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        transformed.y += sheetH(position.x);
        vWX = position.x + uSheetX;
        vSheetUv = uv;`);
    sh.fragmentShader = SHEET_FRAG_HEAD + sh.fragmentShader
      .replace('#include <map_fragment>', `
        #include <map_fragment>
        {
          vec2 puv = vSheetUv;
          // Paper tooth and fibre in the stock's albedo (+-3%); the ink multiplies over it, so it shows through the print.
          float tooth = texture2D(tPaper, puv * vec2(2.0, ${(2 * SHEET_H).toFixed(4)})).r;
          diffuseColor.rgb *= 1.0 + 0.06 * (tooth - 0.5);
          // Ink density mottle, +-3%: the print reads as ink laid on stock, not a vector fill.
          float mottle = 1.0 + 0.04 * (texture2D(tPaper, puv * vec2(1.5, ${(1.5 * SHEET_H).toFixed(4)}) + 0.37).g - 0.5);
          float aY = texture2D(tY, puv).r * laid(uRoll.x), aM = texture2D(tM, puv).r * laid(uRoll.y);
          float aC = texture2D(tC, puv).r * laid(uRoll.z), aK = texture2D(tK, puv).r * laid(uRoll.w);
          aY *= mottle; aM *= mottle; aC *= mottle; aK *= mottle;
          vec3 printed = ink(inkY, aY) * ink(inkM, aM) * ink(inkC, aC) * ink(inkK, aK);
          diffuseColor.rgb *= mix(vec3(1.0), printed, uReady);
          vWet = uReady * uMotion * max(max(aY * wetness(uRoll.x), aM * wetness(uRoll.y)), max(aC * wetness(uRoll.z), aK * wetness(uRoll.w)));
          diffuseColor.rgb *= 1.0 - 0.05 * vWet; // wet ink sits a touch denser
        }`)
      .replace('#include <roughnessmap_fragment>', `
        #include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.5, vWet * 0.7);`)
      .replace('#include <dithering_fragment>', `
        {
          // Hairline of light on the two edges that face the key (far edge, left edge), about 1 px wide.
          vec2 fw = max(fwidth(vSheetUv), vec2(1e-5));
          float far = 1.0 - smoothstep(0.0, 1.4, (1.0 - vSheetUv.y) / fw.y);
          float lft = 1.0 - smoothstep(0.0, 1.4, vSheetUv.x / fw.x);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1.0), max(far, lft) * 0.6 * float(gl_FrontFacing));
          gl_FragColor.rgb += vWet * 0.022; // the barely visible sheen of wet ink
        }
        #include <dithering_fragment>`);
  };
  // Geometry: segments only along the feed, where the curl bends it.
  const sheetGeo = track(new THREE.PlaneGeometry(SHEET_W, SHEET_H, 72, 1));
  sheetGeo.rotateX(-Math.PI / 2);
  const sheet = new THREE.Mesh(sheetGeo, sheetMat);
  scene.add(sheet);

  // Rollers: four nip pairs of satin steel. The upper (plate) roller carries a thin band of its ink at the
  // near end; the lower (impression) roller is plain. A clamp gap on each so the turn reads.
  const st = steelTextures();
  track(st.albedo); track(st.roughness);
  st.albedo.repeat.set(1.1, 3.4); st.roughness.repeat.set(1.1, 3.4); // ~1-2 px speckle at desktop scale
  const steel = track(new THREE.MeshPhysicalMaterial({
    color: 0x8a8d91, map: st.albedo, metalness: 0.7, roughness: 1, roughnessMap: st.roughness, envMap: env.texture, envMapIntensity: 1.0,
    anisotropy: 0.3, anisotropyRotation: Math.PI / 2, // satin, bead-blasted: a broad soft highlight along the axis, no streak
  }));
  const capMat = track(new THREE.MeshStandardMaterial({ color: 0x55585d, map: st.albedo, metalness: 0.4, roughness: 0.72, envMap: env.texture, envMapIntensity: 0.6 }));
  const gapMat = track(new THREE.MeshStandardMaterial({ color: 0x2e3033, roughness: 0.7, metalness: 0.3, envMap: env.texture, envMapIntensity: 0.4 }));
  const rollerGeo = track(new THREE.CylinderGeometry(R, R, ROLLER_L, 48, 1));
  rollerGeo.rotateX(Math.PI / 2);
  rollerGeo.computeTangents();
  const bandW = 0.05;
  const bandGeo = track(new THREE.CylinderGeometry(R * 1.006, R * 1.006, bandW, 48, 1, true));
  bandGeo.rotateX(Math.PI / 2);
  const gapGeo = track(new THREE.BoxGeometry(0.008, 0.003, ROLLER_L * 0.985));
  const rollerMats = [steel, capMat, capMat]; // side, then the two end caps
  const makeRoller = (inkHex) => {
    const g = new THREE.Group();
    const body = new THREE.Mesh(rollerGeo, rollerMats);
    const gap = new THREE.Mesh(gapGeo, gapMat);
    gap.position.y = R - 0.0015;
    g.add(body, gap);
    if (inkHex) {
      // Ink band: matte rubber.
      const band = new THREE.Mesh(bandGeo, track(new THREE.MeshStandardMaterial({ color: inkHex, roughness: 0.8, metalness: 0, envMap: env.texture, envMapIntensity: 0.4 })));
      band.position.z = ROLLER_L / 2 - bandW / 2 - 0.03;
      g.add(band);
    }
    return g;
  };
  const uppers = [], lowers = [];
  ORDER.forEach((n, i) => {
    const up = makeRoller(INKS[n]);
    up.position.set(STATIONS[i], R + 0.003, 0);
    const lo = makeRoller(null);
    lo.position.set(STATIONS[i], -R - 0.003, 0);
    scene.add(up, lo);
    uppers.push(up); lowers.push(lo);
    // Contact shadow of the nip pair on the ground: a soft bar under the lower roller, slightly away from the key.
    const sh = shadowPlane(2 * R + 0.22, ROLLER_L + 0.2, (2 * R) / (2 * R + 0.22) * 0.7, ROLLER_L / (ROLLER_L + 0.2));
    sh.position.set(STATIONS[i] + 0.025, GROUND_Y + 0.0005, -0.02);
    sh.material.opacity = 0.2;
  });

  // State and layout.
  let p = 0, w = 0, h = 0, raf = 0, dead = false;
  const target = new THREE.Vector3();

  // Camera x during the passes: the whole line on a wide cell, following the sheet on a narrow one.
  function passFrame(prog, aspect) {
    const azim = THREE.MathUtils.degToRad(-22);
    const cosA = Math.cos(azim);
    const lineW = (STATIONS[0] - STATIONS[3] + 2 * R) * cosA + ROLLER_L * Math.abs(Math.sin(azim));
    const passH = Math.min(2.2, Math.max(1.7, (lineW / 0.84) / aspect)); // line spans most of a wide cell, roller ends in frame
    const halfX = (passH * aspect) / 2 / cosA;                           // half the frame, measured along the feed
    const lineL = X_K_DONE - SHEET_W / 2 - 0.1, lineR = X0 + SHEET_W / 2;
    const lo = lineL + halfX, hi = lineR - halfX;
    const x = lo > hi ? (lineL + lineR) / 2 : Math.min(hi, Math.max(lo, sheetX(prog) - 0.15));
    return { x, passH };
  }

  function layout(prog) {
    const sx = sheetX(prog);
    uniforms.uSheetX.value = sx;
    sheet.position.x = sx; // the mesh moves rigidly; the shader adds the curl on top
    // Out of the last nip the sheet drops onto the delivery table (the ground), so it rests flat with a contact shadow.
    const drop = smooth(0.84, 0.95, prog);
    // Landing: the sheet rides its air cushion once, a 1-2 px rebound that damps to zero by p 0.995.
    const u = clamp01((prog - 0.95) / 0.045);
    const settleBounce = 0.01 * Math.sin(Math.PI * u) * (1 - u) * (1 - u);
    sheet.position.y = mix(0, GROUND_Y + 0.003, drop) + settleBounce;
    // Sheet curl only while the sheet is moving; flat at rest.
    uniforms.uMotion.value = 1 - smooth(0.82, 0.95, prog);
    // Rollers turn at the press's surface speed (the sheet's speed through every nip); each pair counter-rotates.
    const turn = (PASS_SPEED * prog) / R;
    for (const r of uppers) r.rotation.z = -turn;
    for (const r of lowers) r.rotation.z = turn;

    // Contact shadow under the sheet: wide and faint while it is up in the press, tight once it lies on the table.
    const lift = sheet.position.y - (GROUND_Y + 0.003);
    const air = clamp01(lift / (-GROUND_Y));
    sheetShadowNear.position.x = sx + 0.008; sheetShadowNear.position.z = -0.006;
    sheetShadowFar.position.x = sx + 0.03 + 0.08 * air; sheetShadowFar.position.z = -0.03 - 0.05 * air;
    sheetShadowNear.material.opacity = 0.17 * (1 - air);
    sheetShadowFar.material.opacity = 0.05 + 0.07 * air;

    // Camera. Square to the feed, so the stations stand parallel and the sheet crosses the frame right to left.
    // Rest (after the black pass): rises and closes in until the printed sheet fills 75% of the frame height.
    const aspect = w / Math.max(1, h);
    const settle = smooth(0.8, 1.0, prog);
    const elev = THREE.MathUtils.degToRad(mix(24, 64, settle));
    const azim = THREE.MathUtils.degToRad(mix(-22, 0, settle)); // from the front left: the rollers show their length and the nip pairs
    const cosA = Math.cos(azim);
    const { x: passX, passH } = passFrame(Math.min(prog, 0.8), aspect);
    const restH = Math.max((SHEET_H * Math.sin(elev)) / 0.75, (SHEET_W / 0.8) / aspect);
    const frameH = mix(passH, restH, settle);
    const halfW = (frameH * aspect) / 2;
    // Frame centre: the line during the passes. Leaving the last nip, the camera takes the sheet over: the sheet's
    // place in frame eases from where it was to the centre (C1 with the passes), so its world speed-up never shows.
    let tx = passX;
    if (prog > 0.8) {
      const e = 1e-3;
      const s0 = sheetX(0.8) - passFrame(0.8, aspect).x;
      const v0 = (s0 - (sheetX(0.8 - e) - passFrame(0.8 - e, aspect).x)) / e * 0.2; // screen slope, per unit t
      const t = (prog - 0.8) / 0.2;
      const h00 = 2 * t * t * t - 3 * t * t + 1, h10 = t * t * t - 2 * t * t + t;
      tx = sx - (h00 * s0 + h10 * v0);
    }
    target.set(tx, 0, mix(0.1, 0.03, settle)); // passes: nudged toward the near roller ends so the ink bands stay in frame
    camera.left = -halfW; camera.right = halfW; camera.top = frameH / 2; camera.bottom = -frameH / 2;
    camera.updateProjectionMatrix();
    const dist = 12;
    camera.position.set(
      target.x + dist * Math.cos(elev) * Math.sin(azim),
      target.y + dist * Math.sin(elev),
      target.z + dist * Math.cos(elev) * cosA,
    );
    camera.lookAt(target);
    // Key light rides with the frame so the sheet is lit the same wherever it is.
    key.position.set(target.x - 2.2, 4.2, target.z + 2.4);
    key.target.position.copy(target);
  }

  function render() {
    raf = 0;
    if (dead || !w || !h) return;
    layout(p);
    renderer.render(scene, camera);
  }
  function requestRender() {
    if (dead || raf) return;
    raf = requestAnimationFrame(render);
  }
  function resize() {
    const r = container.getBoundingClientRect();
    const nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height));
    if (nw === w && nh === h) return;
    w = nw; h = nh;
    renderer.setSize(w, h, false);
    requestRender();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  const onLost = (e) => { e.preventDefault(); };
  const onRestored = () => { requestRender(); };
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);

  return {
    setProgress(v) {
      const n = clamp01(Number(v) || 0);
      if (Math.abs(n - p) < 1e-5) return;
      p = n;
      requestRender();
    },
    destroy() {
      if (dead) return;
      dead = true;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      for (const d of disposables) d.dispose();
      key.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
