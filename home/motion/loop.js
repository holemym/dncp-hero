// loop.js: the one rAF loop shared by every scroll-linked and pointer-follow mechanism. It drives Lenis, reads
// scrollY once per frame, runs the registered updaters and sleeps as soon as nothing moved and no follower is unsettled.
export const state = { y: 0, vh: innerHeight, vw: innerWidth, dt: 16.7, changed: true };
const fns = new Set();
let raf = 0, lastT = 0, lastY = -1, lenis = null, tops = new WeakMap(), measureFns = new Set();

export function setLenis(l) { lenis = l; }
// onFrame(fn): fn(state) runs every awake frame; return true to ask for another frame (an unsettled lerp).
export function onFrame(fn) { fns.add(fn); wake(); return () => fns.delete(fn); }
export function wake() { if (!raf) raf = requestAnimationFrame(tick); }

function tick(t) {
  raf = 0;
  state.dt = lastT ? Math.min(64, t - lastT) : 16.7;
  lastT = t;
  if (lenis) lenis.raf(t);
  const y = window.scrollY;
  state.changed = y !== lastY;
  lastY = y;
  state.y = y;
  let more = state.changed || (lenis && lenis.isScrolling === 'smooth');
  for (const fn of fns) if (fn(state)) more = true;
  if (more) raf = requestAnimationFrame(tick);
  else lastT = 0;
}

// Layout cache: document-space top/height per tracked element, so the loop never reads layout per frame.
export function track(el) { const r = { top: 0, height: 0, width: 0 }; tops.set(el, r); measureOne(el, r); return r; }
function measureOne(el, r) {
  const b = el.getBoundingClientRect();
  r.top = b.top + window.scrollY; r.height = b.height; r.width = b.width;
}
const tracked = new Set();
export function trackAll(el) { const r = track(el); tracked.add(el); return r; }
export function onMeasure(fn) { measureFns.add(fn); }
let pending = 0;
// measure(): re-read every tracked element (resize, fonts, image loads, body size changes).
export function measure() {
  if (pending) return;
  pending = requestAnimationFrame(() => {
    pending = 0;
    state.vh = innerHeight; state.vw = innerWidth;
    for (const el of tracked) measureOne(el, tops.get(el));
    for (const fn of measureFns) fn();
    lastY = -1; wake();
  });
}

let ro = null;
const wakeEvents = ['wheel', 'scroll', 'touchmove', 'keydown', 'pointerdown'];
export function start() {
  wakeEvents.forEach((e) => addEventListener(e, wake, { passive: true }));
  addEventListener('resize', measure, { passive: true });
  addEventListener('load', measure);
  ro = new ResizeObserver(measure);
  ro.observe(document.body);
  measure();
}
export function stop() {
  wakeEvents.forEach((e) => removeEventListener(e, wake));
  removeEventListener('resize', measure);
  removeEventListener('load', measure);
  if (ro) ro.disconnect();
  if (raf) cancelAnimationFrame(raf);
  raf = 0; fns.clear(); measureFns.clear(); tracked.clear(); lenis = null;
}
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, k) => a + (b - a) * k;
