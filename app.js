// dncp homepage v2 · motion: press feed. Primitives: feed reveal, scroll-linked lerp, pointer follow (engine in motion/),
// plus the signature (four passes) and the foil glint. Reduced motion: every final state, nothing scroll-linked, no smooth scroll.
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const root = document.documentElement;
const head = document.querySelector('.head');
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// Header height feeds the sticky stage so the hero fills exactly one viewport.
const setHead = () => root.style.setProperty('--head', head.offsetHeight + 'px');
setHead();
addEventListener('resize', setHead);

// Fonts first: nothing animates until the final faces have laid out (no reflow during motion).
await document.fonts.ready;

// Motion engine (smooth scroll, word/line reveals, light-up, windows, parallax, preview, accordion, menu).
let lenis = null;
try {
  const { initMotion } = await import('./motion/index.js');
  ({ lenis } = initMotion({ reduce }) || {});
} catch (err) {
  console.warn('motion engine unavailable', err);
}

// Reveal: rows and photos arrive in the feed direction, once (children are clipped; see styles.css).
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
document.querySelectorAll('[data-reveal]').forEach((el) => (reduce ? el.classList.add('in') : io.observe(el)));

// Press room: the number rolls and the name swaps to the line under the pointer; every line stays readable without it.
const big = document.querySelector('[data-press-big]');
const odo = document.querySelector('[data-odometer]');
const lines = [...document.querySelectorAll('.press__list li')];
let onIdx = -1;
const setOn = (k) => {
  if (k === onIdx) return;
  const first = onIdx < 0;
  onIdx = k;
  lines.forEach((l, j) => l.classList.toggle('is-on', j === k));
  if (odo) odo.dataset.value = String(k + 1);
  if (!big) return;
  const name = lines[k].querySelector('.press__name').textContent;
  if (first || reduce) { big.textContent = name; return; }
  // swap: the old name leaves upward through its mask, the new one rises into place
  big.getAnimations().forEach((a) => a.cancel());
  big.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-105%)' }], { duration: 180, easing: 'cubic-bezier(.6,0,.4,1)' })
    .finished.then(() => {
      big.textContent = name;
      big.animate([{ transform: 'translateY(105%)' }, { transform: 'translateY(0)' }], { duration: 320, easing: 'cubic-bezier(.22,1,.36,1)' });
    }).catch(() => {});
};
lines.forEach((li, k) => li.addEventListener('pointerenter', () => setOn(k)));
if (lines.length) setOn(0);

// Consent: decline first, asked once; the demo loads no trackers either way.
const consent = document.querySelector('[data-consent]');
if (consent) {
  let seen = null;
  try { seen = localStorage.getItem('dncp-consent'); } catch {}
  if (!seen) {
    setTimeout(() => (consent.hidden = false), 1800);
    const close = (v) => { consent.hidden = true; try { localStorage.setItem('dncp-consent', v); } catch {} };
    consent.querySelector('[data-consent-no]').addEventListener('click', () => close('no'));
    consent.querySelector('[data-consent-yes]').addEventListener('click', () => close('yes'));
  }
}

// Scroll-linked signature + glint: one lerped loop that sleeps when nothing is moving.
const hero = document.querySelector('.hero');
const foil = document.querySelector('.foil');
const glint = document.querySelector('.foil__glint');
let passes = null;
const state = { p: 0, pT: 0, g: 1.2, gT: 1.2 };
let running = false;

const targets = () => {
  if (passes) {
    const r = hero.getBoundingClientRect();
    const track = hero.offsetHeight - innerHeight;
    state.pT = track > 0 ? clamp(-r.top / (track * 0.9)) : 1; // finish slightly before the stage unsticks
  }
  if (glint) {
    const r = foil.getBoundingClientRect();
    // the sweep crosses the foil while the section passes the middle of the viewport
    state.gT = 1.2 - 1.6 * clamp((innerHeight - r.top) / (innerHeight + r.height));
  }
};
const tick = () => {
  targets();
  // lerp: scroll drives targets, motion eases toward them (smooth scroll already eases; this keeps the press soft on touch)
  state.p += (state.pT - state.p) * 0.14;
  state.g += (state.gT - state.g) * 0.15;
  if (passes) passes.setProgress(state.p);
  if (glint) glint.style.setProperty('--g', (state.g * 100).toFixed(2) + '%');
  if (Math.abs(state.pT - state.p) > 0.0005 || Math.abs(state.gT - state.g) > 0.001) requestAnimationFrame(tick);
  else running = false;
};
const wake = () => { if (!running) { running = true; requestAnimationFrame(tick); } };

if (!reduce) {
  const stage = document.querySelector('[data-passes]');
  try {
    const { mountPasses } = await import('./three/passes.js');
    passes = mountPasses(stage, { base: 'img/plates/' });
    hero.classList.add('hero--live');
  } catch (err) {
    // No WebGL or the module failed: the printed sheet stays as a still image and the track collapses.
    hero.style.height = 'auto';
    hero.querySelector('.hero__stage').style.position = 'relative';
  }
  if (lenis && lenis.on) lenis.on('scroll', wake);
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', wake);
  // hidden tabs pause rAF: re-sync when the tab comes back
  document.addEventListener('visibilitychange', () => { if (!document.hidden) wake(); });
  wake();
  setTimeout(wake, 120);
}
