// scroll.js: scroll-linked mechanisms on the shared loop — word light-up (data-light), section window (data-window),
// image parallax + grain (data-parallax / data-grain), header hide (data-hide-on-scroll). All lerp to a target that is
// linear in scroll, so they settle and the loop can sleep; all end at a static frame.
import { onFrame, trackAll, onMeasure, clamp, lerp, state } from './loop.js';
import { splitWords, fontsFor } from './split.js';

const own = (el) => el.setAttribute('data-mo', '');

// light(): a fact paragraph lights up word by word as it is read (clearpath M08 offsets ["0 1","0 .3"]).
export async function light(reduce) {
  const els = Array.from(document.querySelectorAll('[data-light]'));
  if (!els.length) return;
  if (reduce) { els.forEach(own); return; }
  await fontsFor(els);
  const items = [];
  for (const el of els) {
    const ws = splitWords(el, { atomic: false, className: 'mo-lw' });   // plain inline spans: opacity only, no reflow
    own(el);
    if (!ws) continue;
    ws.forEach((w) => { w.style.opacity = '0.2'; });
    items.push({ el, ws, rec: trackAll(el), s: 0, last: [] });
  }
  if (!items.length) return;
  onFrame(({ y, vh }) => {
    let more = false;
    for (const it of items) {
      const start = it.rec.top - vh;                 // "0 1": element top meets the viewport bottom
      const end = it.rec.top - 0.3 * vh;             // "0 .3": element top at 30 % of the viewport
      const p = clamp((y - start) / (end - start));
      it.s = Math.abs(p - it.s) < 0.0005 ? p : lerp(it.s, p, 0.15);   // contract: lerp .15 (spring-ish follower)
      if (it.s !== p) more = true;
      const n = it.ws.length;
      for (let i = 0; i < n; i++) {
        const o = (0.2 + 0.8 * clamp(it.s * n - i)).toFixed(3);     // word i lights across [i/N, (i+1)/N]
        if (it.last[i] !== o) { it.last[i] = o; it.ws[i].style.opacity = o === '1.000' ? '' : o; }
      }
    }
    return more;
  });
}

// windowSections(): the section opens like a sheet pulled straight from the feed — side and top margins close as it rises.
export function windowSections(reduce) {
  const els = Array.from(document.querySelectorAll('[data-window]'));
  els.forEach(own);
  if (reduce || !els.length) return;
  const items = els.map((el) => { el.classList.add('mo-window'); return { el, rec: trackAll(el), s: -1, last: '' }; });
  onFrame(({ y, vh }) => {
    let more = false;
    for (const it of items) {
      const top = it.rec.top - y;
      const p = clamp((vh - top) / (vh - 0.25 * vh));   // 0 at entry (top at viewport bottom), 1 when top reaches 25 %
      it.s = it.s < 0 || Math.abs(p - it.s) < 0.0005 ? p : lerp(it.s, p, 0.15);
      if (it.s !== p) more = true;
      const k = 1 - it.s < 0.002 ? 0 : 1 - it.s;                  // snap the last fraction of a pixel: static open frame
      const key = k.toFixed(4);
      if (key === it.last) continue;
      it.last = key;
      it.el.style.setProperty('--wx', (6 * k).toFixed(3) + 'vw');    // contract: wx 6vw → 0
      it.el.style.setProperty('--wy', (10 * k).toFixed(3) + 'vh');   // contract: wy 10vh → 0
      it.el.classList.toggle('mo-window--open', k === 0);            // fully open: clip-path none (static end)
    }
    return more;
  });
}

// parallax(): photos drift inside their frames, slower than the page, so the frame reads as a window onto the print.
export function parallax(reduce) {
  const frames = Array.from(document.querySelectorAll('[data-parallax]'));
  for (const el of frames) {
    own(el);
    if (el.hasAttribute('data-grain') && !el.querySelector(':scope > .mo-grain')) {
      const g = document.createElement('i');
      g.className = 'mo-grain';                    // static paper grain over the photo (overlay, .08)
      g.setAttribute('aria-hidden', 'true');
      el.appendChild(g);
    }
  }
  if (reduce || !frames.length) return;
  const items = frames.map((el) => ({ el, img: el.querySelector('img'), rec: trackAll(el), n: 0, last: '' })).filter((it) => it.img);
  const size = () => {
    const phone = innerWidth < 810;
    for (const it of items) {
      it.n = (parseFloat(it.el.dataset.parallax) || 0) * (phone ? 0.4 : 1);   // contract: phones N × 0.4
      Object.assign(it.img.style, { height: `calc(100% + ${it.n}px)`, marginTop: `${-it.n / 2}px`, display: 'block', maxWidth: 'none' });
      it.last = '';
    }
  };
  size();
  onMeasure(size);
  onFrame(({ y, vh, changed }) => {
    for (const it of items) {
      const top = it.rec.top - y;
      const p = clamp((vh - top) / (vh + it.rec.height));      // 0 frame enters at the bottom, 1 leaves at the top
      const ty = ((p - 0.5) * it.n).toFixed(1);                // −N/2 → +N/2
      if (ty === it.last) continue;
      it.last = ty;
      it.img.style.transform = `translate3d(0,${ty}px,0)`;
    }
    return false;
  });
}

// hideHeader(): the header steps out of the way after 120 px of reading downwards and returns on any upward scroll.
export function hideHeader(reduce, isMenuOpen) {
  const head = document.querySelector('[data-hide-on-scroll]');
  if (!head) return;
  own(head);
  if (reduce) return;
  head.classList.add('mo-hide');
  let lastY = state.y, down = 0, hidden = false, hh = head.offsetHeight;
  onMeasure(() => { hh = head.offsetHeight; });
  const set = (h) => { if (h !== hidden) { hidden = h; head.classList.toggle('mo-hidden', h); } };
  head.addEventListener('focusin', () => set(false));           // keyboard focus brings it back
  onFrame(({ y }) => {
    const dy = y - lastY;
    lastY = y;
    if (dy > 0) down += dy; else if (dy < 0) { down = 0; set(false); }
    if (y < hh || isMenuOpen() || head.querySelector(':focus-visible')) set(false);
    else if (down > 120) set(true);                             // contract: 120 px of downward scroll
    return false;
  });
}
