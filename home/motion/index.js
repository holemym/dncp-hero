// index.js: dncp motion engine entry. initMotion({ reduce }) boots every attribute mechanism found on the page and
// returns { lenis, destroy } (lenis is null under reduced motion). One rAF loop (loop.js) serves all scroll-linked parts.
import * as loop from './loop.js';
import { boot as smooth } from './smooth.js';
import { words, lineMasks, stamp } from './reveal.js';
import { light, windowSections, parallax, hideHeader } from './scroll.js';
import { preview } from './pointer.js';
import { odometer, accordion, menu } from './ui.js';

let live = null;

export function initMotion({ reduce } = {}) {
  if (live) return live;
  if (reduce == null) reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const html = document.documentElement;
  html.classList.add('mo');
  html.classList.toggle('mo-reduce', !!reduce);
  loop.start();
  const sm = reduce ? null : smooth();
  const lenis = sm ? sm.lenis : null;
  const cleanups = [];
  const m = menu(reduce, () => lenis);
  cleanups.push(m.destroy);
  hideHeader(reduce, m.isOpen);
  cleanups.push(odometer(reduce));
  accordion(reduce, loop.measure);
  cleanups.push(stamp(reduce));
  windowSections(reduce);
  parallax(reduce);
  cleanups.push(preview(reduce));
  // splits wait for fonts; layout cache refreshes once they are in
  words(reduce);
  light(reduce).then(loop.measure);
  lineMasks(reduce).then((c) => { cleanups.push(c); loop.measure(); });
  live = {
    lenis,
    refresh: loop.measure,
    destroy() {
      cleanups.forEach((c) => c && c());
      if (sm) sm.destroy();
      loop.stop();
      html.classList.remove('mo', 'mo-reduce');
      live = null;
    },
  };
  return live;
}
