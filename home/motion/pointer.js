// pointer.js: order-sheet photo preview (data-preview). Hovering a row floats that product's photo by the cursor so the
// reader sees what the line prints; desktop fine pointers only, never on touch or under reduced motion.
import { onFrame, lerp, wake } from './loop.js';

export function preview(reduce) {
  const lists = Array.from(document.querySelectorAll('[data-preview]'));
  lists.forEach((l) => l.setAttribute('data-mo', ''));
  const mq = matchMedia('(hover: hover) and (pointer: fine) and (min-width: 810px)');
  if (reduce || !lists.length) return () => {};
  const fly = document.createElement('div');
  fly.className = 'mo-preview';
  fly.setAttribute('aria-hidden', 'true');
  const layers = [new Image(), new Image()];
  layers.forEach((im) => { im.alt = ''; im.decoding = 'async'; fly.appendChild(im); });
  document.body.appendChild(fly);
  let front = 0, src = '', on = false, tx = 0, ty = 0, x = 0, y = 0, placed = false;
  const W = 320, H = 240, GAP = 28;
  const target = (cx, cy) => {
    // sit on the feed side of the cursor (to its left in RTL), vertically centred, kept inside the viewport
    const rtl = getComputedStyle(document.documentElement).direction === 'rtl';
    let left = rtl ? cx - GAP - W : cx + GAP;
    if (left < 8) left = cx + GAP;
    if (left + W > innerWidth - 8) left = cx - GAP - W;
    tx = left; ty = Math.min(innerHeight - H - 8, Math.max(8, cy - H / 2));
  };
  const show = (url) => {
    if (url === src) return;
    src = url;
    const next = 1 - front;                                    // crossfade: load into the back layer, then swap
    const im = layers[next];
    im.src = url;
    const swap = () => { layers[front].classList.remove('is-front'); im.classList.add('is-front'); front = next; };
    if (im.complete) swap(); else im.onload = swap;
  };
  const move = (e) => {
    if (!mq.matches) return;
    const row = e.target.closest('[data-img]');
    target(e.clientX, e.clientY);
    if (!placed) { x = tx; y = ty; placed = true; }
    if (row) {
      show(new URL(row.dataset.img, document.baseURI).href);
      if (!on) { on = true; fly.classList.add('is-on'); }      // enter: fade in, scale .9 → 1
    } else if (on) { on = false; fly.classList.remove('is-on'); }
    wake();
  };
  const leave = () => { on = false; placed = false; fly.classList.remove('is-on'); };
  lists.forEach((l) => {
    l.addEventListener('pointermove', move, { passive: true });
    l.addEventListener('pointerleave', leave);
    l.addEventListener('pointerenter', () => {                 // warm the photos on first approach
      l.querySelectorAll('[data-img]').forEach((r) => { const i = new Image(); i.src = r.dataset.img; });
    }, { once: true });
  });
  const off = onFrame(() => {
    if (!placed) return false;
    x = lerp(x, tx, 0.18); y = lerp(y, ty, 0.18);             // contract: follower lerp .18
    const settled = Math.abs(tx - x) < 0.1 && Math.abs(ty - y) < 0.1;
    if (settled) { x = tx; y = ty; }
    fly.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    return !settled;
  });
  return () => { off(); fly.remove(); };
}
