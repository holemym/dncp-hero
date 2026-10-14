// ui.js: state-driven pieces — odometer digits (data-odometer), questions accordion (data-accordion) and the menu
// overlay (data-menu-open / #menu[data-menu]). The engine switches states; motion.css carries the transitions.

const own = (el) => el.setAttribute('data-mo', '');
const feed = () => getComputedStyle(document.documentElement).getPropertyValue('--ease-feed').trim() || 'cubic-bezier(.22,1,.36,1)';

// odometer(): the machine number rolls to its new value so the index change reads as one counter turning.
export function odometer(reduce) {
  const obs = [];
  document.querySelectorAll('[data-odometer]').forEach((el) => {
    own(el);
    const digits = Math.max(2, el.textContent.trim().length);  // lead: two digits, zero-padded
    const label = document.createElement('span');
    label.className = 'mo-sr';
    const cols = [];
    const row = document.createElement('span');
    row.className = 'mo-odo';
    row.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < digits; i++) {
      const col = document.createElement('span');
      col.className = 'mo-odo__col';
      const strip = document.createElement('span');
      strip.className = 'mo-odo__strip';
      for (let d = 0; d <= 9; d++) { const s = document.createElement('span'); s.textContent = d; strip.appendChild(s); }
      col.appendChild(strip);
      row.appendChild(col);
      cols.push(strip);
    }
    el.textContent = '';
    el.append(label, row);
    if (reduce) el.classList.add('mo-odo--still');
    const set = () => {
      const v = String(Math.max(0, parseInt(el.dataset.value, 10) || 0)).padStart(digits, '0').slice(-digits);
      label.textContent = v;
      cols.forEach((strip, i) => { strip.style.transform = `translateY(${-10 * +v[i]}%)`; });   // one tenth of the strip per digit
    };
    set();
    const mo = new MutationObserver(set);
    mo.observe(el, { attributes: true, attributeFilter: ['data-value'] });
    obs.push(mo);
  });
  return () => obs.forEach((m) => m.disconnect());
}

// accordion(): an answer opens to its measured height so the list below slides, not jumps; aria-expanded stays true.
export function accordion(reduce, refresh) {
  document.querySelectorAll('[data-accordion]').forEach((list, li) => {
    own(list);
    list.querySelectorAll('.qa').forEach((qa, i) => {
      const q = qa.querySelector('.qa__q'), a = qa.querySelector('.qa__a');
      if (!q || !a) return;
      if (!a.id) a.id = `mo-qa-${li}-${i}`;
      q.setAttribute('aria-controls', a.id);
      const open0 = q.getAttribute('aria-expanded') === 'true';
      q.setAttribute('aria-expanded', String(open0));
      a.hidden = !open0;                                      // JS collapses; without JS every answer stays visible
      q.addEventListener('click', () => {
        const opening = q.getAttribute('aria-expanded') !== 'true';
        q.setAttribute('aria-expanded', String(opening));
        if (a.__anim) a.__anim.cancel();
        if (reduce) { a.hidden = !opening; refresh(); return; }
        const h0 = a.hidden ? 0 : a.getBoundingClientRect().height;
        a.hidden = false;
        const h1 = opening ? a.getBoundingClientRect().height : 0;
        a.style.overflow = 'hidden';
        const anim = a.animate([{ height: `${h0}px` }, { height: `${h1}px` }], { duration: 500, easing: feed() });   // contract .5 s
        a.__anim = anim;
        anim.onfinish = () => { a.__anim = null; a.style.overflow = ''; if (!opening) a.hidden = true; refresh(); };
        anim.oncancel = () => { a.style.overflow = ''; };
      });
    });
  });
}

// menu(): the overlay drops from the top and its links rise one by one; Esc closes; page scroll is locked meanwhile.
export function menu(reduce, getLenis) {
  const root = document.querySelector('#menu[data-menu]') || document.querySelector('[data-menu]');
  const buttons = Array.from(document.querySelectorAll('[data-menu-open]'));
  if (!root || !buttons.length) return { isOpen: () => false, destroy() {} };
  own(root);
  const links = Array.from((root.querySelector('nav') || root).children);
  links.forEach((l, i) => l.style.setProperty('--mo-i', i));  // stagger index (.08 s each, motion.css)
  let state = root.hidden ? 'closed' : 'open', t = 0, opener = null;
  root.dataset.menu = state;
  const expanded = (v) => buttons.forEach((b) => b.setAttribute('aria-expanded', String(v)));
  const open = () => {
    if (state === 'open') return;
    clearTimeout(t);
    opener = document.activeElement;
    root.hidden = false;
    root.dataset.menu = 'closed';
    root.getBoundingClientRect();                             // commit the closed frame so the transition runs
    root.dataset.menu = state = 'open';
    expanded(true);
    const l = getLenis(); if (l) l.stop();
    document.documentElement.classList.add('mo-menu-open');
    const first = root.querySelector('a,button'); if (first) first.focus({ preventScroll: true });
  };
  const close = (refocus = true) => {
    if (state !== 'open') return;
    root.dataset.menu = state = 'closing';
    expanded(false);
    const l = getLenis(); if (l) l.start();
    document.documentElement.classList.remove('mo-menu-open');
    t = setTimeout(() => { if (state === 'closing') { root.hidden = true; root.dataset.menu = state = 'closed'; } }, reduce ? 0 : 620);
    if (refocus && opener && opener.focus) opener.focus({ preventScroll: true });
  };
  const onBtn = (e) => { e.preventDefault(); state === 'open' ? close() : open(); };
  const onKey = (e) => { if (e.key === 'Escape' && state === 'open') close(); };
  const onLink = (e) => { if (e.target.closest('[data-menu-close]')) close(); else if (e.target.closest('a')) close(false); };   // a link closes first, then the anchor scroll runs
  buttons.forEach((b) => b.addEventListener('click', onBtn));
  root.addEventListener('click', onLink, true);
  addEventListener('keydown', onKey);
  return {
    isOpen: () => state !== 'closed',
    destroy() { buttons.forEach((b) => b.removeEventListener('click', onBtn)); root.removeEventListener('click', onLink, true); removeEventListener('keydown', onKey); },
  };
}
