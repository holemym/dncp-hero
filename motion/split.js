// split.js: RTL-safe word splitting. Spaces and punctuation stay as they were; `dir` is inherited, never set.
// Atomic word boxes (inline-block, needed for transforms) are bidi-neutral, so in an RTL block a run of Latin tokens
// ("HP Indigo · Ricoh") is wrapped in an LTR isolate or the browser would reverse its order.
const HEB = /[֐-׿יִ-ﭏ]/;
const LAT = /[A-Za-zÀ-ɏ]/;
const cls = (t) => { for (const ch of t) { if (HEB.test(ch)) return 'R'; if (LAT.test(ch)) return 'L'; } return 'N'; };

// fontsFor(el): resolve after the element's own font (weight, family) and every pending face have loaded.
export async function fontsFor(els) {
  if (!document.fonts) return;
  await Promise.all(els.map((el) => {
    const cs = getComputedStyle(el);
    return document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} 32px ${cs.fontFamily}`, el.textContent.trim().slice(0, 40) || 'a').catch(() => {});
  }));
  await document.fonts.ready;
}

const box = (el) => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height, sw: el.scrollWidth }; };

// splitWords(el, {atomic, className}): wraps words in <span class=className>. atomic=true makes them inline-block
// (transformable) and groups LTR runs in RTL blocks. Elements carrying `dir`, <br> and replaced elements stay whole.
// Measures before and after; if the layout changed by more than half a pixel it undoes itself and returns null.
export function splitWords(el, { atomic = false, className = 'mo-w' } = {}) {
  const before = box(el);
  const html = el.innerHTML;
  const rtl = getComputedStyle(el).direction === 'rtl';
  const words = [];
  const mk = (text) => { const s = document.createElement('span'); s.className = className; s.textContent = text; words.push(s); return s; };
  const walk = (node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const toks = child.textContent.split(/(\s+)/).filter(Boolean);
        const frag = document.createDocumentFragment();
        let i = 0;
        while (i < toks.length) {
          const t = toks[i];
          if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(t)); i++; continue; }
          let j = i + 1;
          if (atomic && rtl && cls(t) === 'L') {
            // a Latin run inside RTL text: atomic boxes are bidi-neutral and would come out reversed, so the run sits
            // in an LTR isolate (still breakable at its spaces); punctuation at its edges stays outside, as neutrals
            // resolve there in the original text
            const run = [t];
            while (j + 1 < toks.length && /^\s+$/.test(toks[j]) && cls(toks[j + 1]) !== 'R') { run.push(toks[j], toks[j + 1]); j += 2; }
            if (run.length > 1) {
              const lead = run[0].match(/^[^\p{L}\p{N}]*/u)[0];
              const trail = run[run.length - 1].match(/[^\p{L}\p{N}]*$/u)[0];
              run[0] = run[0].slice(lead.length);
              run[run.length - 1] = run[run.length - 1].slice(0, run[run.length - 1].length - trail.length);
              if (lead) frag.appendChild(mk(lead));
              const iso = document.createElement('span');
              iso.className = 'mo-ltr';
              iso.style.cssText = 'unicode-bidi:isolate;direction:ltr';
              for (const r of run) iso.appendChild(/^\s+$/.test(r) ? document.createTextNode(r) : mk(r));
              frag.appendChild(iso);
              if (trail) frag.appendChild(mk(trail));
              i = j;
              continue;
            }
            j = i + 1;
          }
          frag.appendChild(mk(t));
          i = j;
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const tag = child.tagName;
        if (tag === 'BR') continue;
        const whole = child.hasAttribute('dir') || /^(IMG|SVG|PICTURE|VIDEO|CANVAS|INPUT|BUTTON)$/.test(tag) ||
          getComputedStyle(child).display !== 'inline';
        if (whole && atomic) {
          const disp = getComputedStyle(child).display;
          if (disp === 'block' || disp === 'flex' || disp === 'grid') { walk(child); continue; }   // block children: split inside
          const s = document.createElement('span'); s.className = className;
          child.replaceWith(s); s.appendChild(child); words.push(s);
        } else if (whole && child.hasAttribute('dir')) {
          const s = document.createElement('span'); s.className = className;
          child.replaceWith(s); s.appendChild(child); words.push(s);
        } else walk(child);
      }
    }
  };
  walk(el);
  if (atomic) words.forEach((w) => { w.style.display = 'inline-block'; });
  const after = box(el);
  if (Math.abs(after.h - before.h) > 0.5 || Math.abs(after.w - before.w) > 0.5 || after.sw > before.sw) {
    el.innerHTML = html;                  // the split would have moved text: keep the original layout instead
    return null;
  }
  return words;
}

// lines(words): group word boxes by their rendered line (offsetTop), in reading order.
export function lines(words) {
  const out = [];
  let top = null, cur = null;
  for (const w of words) {
    const t = Math.round(w.getBoundingClientRect().top);
    if (top === null || Math.abs(t - top) > 2) { cur = []; out.push(cur); top = t; }
    cur.push(w);
  }
  return out;
}
