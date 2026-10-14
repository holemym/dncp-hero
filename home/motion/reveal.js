// reveal.js: feed reveals that run once — hero words (data-words), heading line masks (data-lines), the stamp hit
// (data-stamp). Every split waits for fonts, measures first, and only transform / opacity / filter / clip animate.
import { splitWords, lines, fontsFor } from './split.js';

const own = (el) => el.setAttribute('data-mo', '');            // engine owns it: drops the CSS pre-hide + failsafe
const done = (anims, fn) => Promise.all(anims.map((a) => a.finished.catch(() => {}))).then(fn);

// words(): hero heading arrives word by word, rising out of a soft blur (right to left = DOM order in RTL).
export async function words(reduce) {
  const els = Array.from(document.querySelectorAll('[data-words]'));
  if (!els.length) return;
  if (reduce) { els.forEach(own); return; }
  await fontsFor(els);
  for (const el of els) {
    const ws = splitWords(el, { atomic: true, className: 'mo-w' });
    own(el);
    const targets = ws || [el];                                // split refused (layout would move): animate the whole line
    const anims = targets.map((w, i) => w.animate([
      { filter: 'blur(10px)', opacity: 0.001, transform: 'translateY(.25em)' },
      { filter: 'blur(0px)', opacity: 1, transform: 'translateY(0)' },
    ], {
      duration: 1200,                                          // contract 1.2 s
      delay: 200 + i * 80,                                     // contract: .2 s after fonts, .08 s stagger
      easing: 'cubic-bezier(.44,0,.56,1)',
      fill: 'backwards',
    }));
    done(anims, () => el.classList.add('mo-done'));            // static end frame: no inline styles, will-change dropped
  }
}

// lineMasks(): each rendered line of a heading rises out of its own mask when the heading enters the view.
// Words keep their place in the flow; each word gets a clip box and an inner box that rises, all words of one line
// share one delay, so it reads as a line mask without restructuring (and reflowing) the heading.
export async function lineMasks(reduce) {
  const els = Array.from(document.querySelectorAll('[data-lines]'));
  if (!els.length) return () => {};
  if (reduce) { els.forEach(own); return () => {}; }
  await fontsFor(els);
  const items = [];
  for (const el of els) {
    const ws = splitWords(el, { atomic: true, className: 'mo-lm' });
    if (ws) for (const w of ws) {
      const inner = document.createElement('span');
      inner.className = 'mo-li';
      while (w.firstChild) inner.appendChild(w.firstChild);
      w.appendChild(inner);
    }
    const it = { el, ws, inners: ws ? ws.map((w) => w.firstChild) : [el], width: el.getBoundingClientRect().width, shown: false, anims: [] };
    el.classList.add('mo-lines');
    hideLines(it);
    own(el);
    items.push(it);
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const it = items.find((x) => x.el === e.target);
      io.unobserve(e.target);
      showLines(it);
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  items.forEach((it) => io.observe(it.el));
  // resize: regroup lines only when the width changed and the heading has not been revealed yet; never unsplit
  let t = 0;
  const onResize = () => { clearTimeout(t); t = setTimeout(() => {
    for (const it of items) {
      const w = it.el.getBoundingClientRect().width;
      if (w === it.width) continue;
      it.width = w;
      if (!it.shown) hideLines(it);
    }
  }, 120); };
  addEventListener('resize', onResize, { passive: true });
  return () => { io.disconnect(); removeEventListener('resize', onResize); };
}

function hideLines(it) {
  it.groups = it.ws ? lines(it.ws).map((g) => g.map((w) => w.firstChild)) : [[it.el]];
  if (!it.ws) { it.el.style.opacity = '0'; return; }          // split refused: the heading fades instead
  for (const g of it.groups) for (const n of g) n.style.transform = 'translateY(calc(105% + .25em))';   // 105% + the mask's bottom bleed
}

function showLines(it) {
  it.shown = true;
  if (!it.ws) {                                                // purpose: the unsplittable heading still arrives, by opacity
    it.el.style.opacity = '';
    it.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 900, easing: 'ease-out' });
    return;
  }
  const anims = [];
  it.groups.forEach((g, li) => g.forEach((n) => {
    n.style.transform = '';
    anims.push(n.animate([{ transform: 'translateY(calc(105% + .25em))' }, { transform: 'translateY(0)' }], {
      duration: 900,                                           // contract .9 s
      delay: li * 70,                                          // contract: .07 s per line
      easing: getComputedStyle(it.el).getPropertyValue('--ease-feed').trim() || 'cubic-bezier(.22,1,.36,1)',
      fill: 'backwards',
    }));
  }));
  done(anims, () => it.el.classList.add('mo-done'));           // masks open up (clip none) once settled
}

// stamp(): the title lands once like a stamp hit — two hard steps from 1.08 to 1, then still.
export function stamp(reduce) {
  const els = Array.from(document.querySelectorAll('[data-stamp]'));
  els.forEach(own);
  if (reduce || !els.length) return () => {};
  els.forEach((el) => { el.style.opacity = '0'; });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      io.unobserve(e.target);
      const el = e.target;
      el.style.opacity = '';
      el.animate([{ transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'steps(2)' });   // contract: 160 ms, steps(2)
    }
  }, { rootMargin: '0px 0px -20% 0px' });
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}
