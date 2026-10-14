// smooth.js: Lenis smooth scroll (vendored 1.1.13), driven by the shared loop; same-page anchors land under the header.
import Lenis from '../vendor/lenis.min.js';
import { setLenis, wake } from './loop.js';

// headOffset(): the --head custom property in px (the lead sets it), else the sticky header's height.
export function headOffset() {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--head'));
  if (v > 0) return v;
  const h = document.querySelector('header');
  return h ? h.getBoundingClientRect().height : 0;
}

export function boot() {
  const lenis = new Lenis({
    duration: 1.25,                                             // contract: 1.25 s per wheel tween
    easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),         // contract: expo-out
    smoothWheel: true,                                          // contract
    syncTouch: false,                                           // contract: touch stays native
  });
  setLenis(lenis);
  // scrollTo starts a tween but emits nothing until the next raf, so wake the sleeping loop.
  const scrollTo = lenis.scrollTo.bind(lenis);
  lenis.scrollTo = (...a) => { scrollTo(...a); wake(); };
  const onClick = (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href').slice(1));
    const target = id ? document.getElementById(id) : null;
    if (id && !target) return;
    e.preventDefault();
    // Purpose: anchors glide with the same easing as the wheel and stop below the sticky header.
    lenis.scrollTo(target || 0, {
      offset: target ? -headOffset() : 0,
      onComplete: () => {
        if (!target) return;
        if (!target.matches('a,button,input,select,textarea,[tabindex]')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      },
    });
    if (id) history.pushState(null, '', '#' + id);
  };
  document.addEventListener('click', onClick);
  wake();
  return { lenis, destroy() { document.removeEventListener('click', onClick); lenis.destroy(); } };
}
