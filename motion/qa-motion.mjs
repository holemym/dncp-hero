// qa-motion.mjs: headless check of every motion attribute on motion-test.html (computed end states, no reflow,
// console errors, 375 overflow, reduced motion, no-JS). Serve dncp/site on :8791, then:
//   node dncp/site/motion/qa-motion.mjs [http://localhost:8791]
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../_tools/package.json'));
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://localhost:8791';
const URL_ = BASE + '/motion-test.html';
const SHOTS = path.join(here, '../_tools/motion-shots');
mkdirSync(SHOTS, { recursive: true });
const results = [];
const check = (id, ok, info) => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${info === undefined ? '' : JSON.stringify(info)}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--no-sandbox'] });

async function open(opts = {}, url = URL_) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, reducedMotion: opts.reduce ? 'reduce' : 'no-preference', javaScriptEnabled: opts.js !== false, hasTouch: false });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  return { ctx, page, errors };
}
const scrollEl = (page, sel, frac) => page.evaluate(([sel, frac]) => {
  const el = document.querySelector(sel);
  const top = el.getBoundingClientRect().top + scrollY;
  scrollTo(0, top - frac * innerHeight);
}, [sel, frac]);

// ---- no-JS reference geometry
{
  const { ctx, page } = await open({ js: false });
  await page.evaluate(() => document.fonts.ready.then(() => null));
  await wait(300);
  const ref = await page.evaluate(() => {
    const o = {};
    for (const id of ['words', 'light', 'lines', 'stamp']) { const r = document.getElementById(id).getBoundingClientRect(); o[id] = [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; }
    o.opacities = ['words', 'light', 'lines', 'stamp'].map((id) => getComputedStyle(document.getElementById(id)).opacity);
    o.answers = Array.from(document.querySelectorAll('.qa__a')).map((a) => a.getBoundingClientRect().height > 0);
    return o;
  });
  globalThis.REF = ref;
  check('0  no-JS: every text block opacity 1, answers visible', ref.opacities.every((v) => v === '1') && ref.answers.every(Boolean), ref);
  await ctx.close();
}

// ---- main run, 1440×900
const { ctx, page, errors } = await open();
// words: sample mid-animation, then the end frame
await page.waitForFunction(() => document.querySelector('#words[data-mo]'));
await wait(350);
await page.screenshot({ path: path.join(SHOTS, '01-words-t0.35.png'), clip: { x: 0, y: 0, width: 1440, height: 700 } });
const mid = await page.evaluate(() => {
  const ws = Array.from(document.querySelectorAll('#words .mo-w'));
  const r = document.getElementById('words').getBoundingClientRect();
  return { n: ws.length, ops: ws.map((w) => +(+getComputedStyle(w).opacity).toFixed(2)), size: [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10], texts: ws.map((w) => w.textContent), kids: Array.from(document.querySelectorAll('#words > span')).map((k) => k.querySelectorAll('.mo-w').length) };
});
await wait(900);
await page.screenshot({ path: path.join(SHOTS, '02-words-t1.25.png'), clip: { x: 0, y: 0, width: 1440, height: 700 } });
await wait(1600);
const end = await page.evaluate(() => Array.from(document.querySelectorAll('#words .mo-w')).map((w) => { const c = getComputedStyle(w); return [c.opacity, c.transform, c.filter]; }));
check('1a words: split, animating mid-way, same box as no-JS (no reflow)', mid.n > 3 && mid.ops.some((o) => o < 0.9) && JSON.stringify(mid.size) === JSON.stringify(REF.words), { ...mid, ref: REF.words });
check('1b words: LTR run kept in one box (RTL-safe), child spans kept and split inside', mid.texts.includes('HP Indigo 7900,') && mid.kids.length === 2 && mid.kids.every((n) => n >= 2), { texts: mid.texts, kids: mid.kids });
check('1c words end: opacity 1, transform none, filter none', end.every(([o, t, f]) => o === '1' && t === 'none' && f === 'none'), end[0]);

// light: start state, end state
const lightAt = async (frac) => { await scrollEl(page, '#light', frac); await wait(900); return page.evaluate(() => Array.from(document.querySelectorAll('#light .mo-lw')).map((w) => +getComputedStyle(w).opacity)); };
const l0 = await lightAt(1.0);
const lm = await lightAt(0.65);
const l1 = await lightAt(0.3);
const lightSize = await page.evaluate(() => { const r = document.getElementById('light').getBoundingClientRect(); return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; });
check('2  light: .2 at entry, partly lit mid, all 1 at 30 %, no reflow', l0.every((o) => Math.abs(o - 0.2) < 0.01) && lm[0] > 0.9 && lm[lm.length - 1] < 0.5 && l1.every((o) => o === 1) && JSON.stringify(lightSize) === JSON.stringify(REF.light), { n: l0.length, entry: l0[0], mid: [lm[0], lm[lm.length - 1]], end: l1[l1.length - 1], lightSize, ref: REF.light });

// lines: hidden before view, settled after
const linesBefore = await page.evaluate(() => Array.from(document.querySelectorAll('#lines .mo-li')).map((n) => n.style.transform));
await scrollEl(page, '#lines', 0.5);
await wait(250);
await page.screenshot({ path: path.join(SHOTS, '03-lines-mid.png') });
await wait(1500);
const linesEnd = await page.evaluate(() => ({ tr: Array.from(document.querySelectorAll('#lines .mo-li')).map((n) => getComputedStyle(n).transform), clip: getComputedStyle(document.querySelector('#lines .mo-lm')).clipPath, size: (() => { const r = document.getElementById('lines').getBoundingClientRect(); return [Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; })() }));
check('3  lines: start below the mask, end transform none + clip none, no reflow', linesBefore.length > 3 && linesBefore.every((t) => t.includes('105%')) && linesEnd.tr.every((t) => t === 'none') && linesEnd.clip === 'none' && JSON.stringify(linesEnd.size) === JSON.stringify(REF.lines), { n: linesBefore.length, ...linesEnd, ref: REF.lines });

// window: entry inset, open at 25 %
await scrollEl(page, '#t-window', 0.98);
await wait(900);
const wIn = await page.evaluate(() => getComputedStyle(document.getElementById('t-window')).clipPath);
await scrollEl(page, '#t-window', 0.6);
await wait(80);
await page.screenshot({ path: path.join(SHOTS, '04-window-mid.png') });
await scrollEl(page, '#t-window', 0.25);
await wait(1200);
const wEnd = await page.evaluate(() => getComputedStyle(document.getElementById('t-window')).clipPath);
check('4  window: inset ≈ 10vh/6vw at entry, clip-path none at 25 %', /inset\((8[5-9]|9\d)\.?\d*px (8[0-9]|7\d)\.?\d*px 0px/.test(wIn) && wEnd === 'none', { wIn, wEnd });

// parallax: −N/2 entering, 0 centred, +N/2 leaving; image N px taller; grain
const px = async (frac) => { await scrollEl(page, '#px1', frac); await wait(120); return page.evaluate(() => { const f = document.getElementById('px1'), img = f.querySelector('img'); return { ty: new DOMMatrix(getComputedStyle(img).transform).m42, dh: Math.round(img.getBoundingClientRect().height - f.getBoundingClientRect().height) }; }); };
const pIn = await px(1.0);
const pMid = await page.evaluate(() => { const f = document.getElementById('px1'); return (innerHeight - f.getBoundingClientRect().height) / 2 / innerHeight; }).then((c) => px(c));
await page.screenshot({ path: path.join(SHOTS, '05-parallax-grain.png') });
const pOut = await page.evaluate(() => -document.getElementById('px1').getBoundingClientRect().height / innerHeight).then((c) => px(c));
const grain = await page.evaluate(() => { const g = document.querySelector('#px1 > .mo-grain'); const c = getComputedStyle(g); return [c.opacity, c.mixBlendMode, c.backgroundSize]; });
check('5  parallax: −80 → 0 → +80 (N=160), img 160 px taller, grain .08 overlay 100px', Math.abs(pIn.ty + 80) < 1 && Math.abs(pMid.ty) < 2 && Math.abs(pOut.ty - 80) < 1 && pIn.dh === 160 && grain[0] === '0.08' && grain[1] === 'overlay', { pIn, pMid, pOut, grain });

// preview
await scrollEl(page, '#preview', 0.4);
await wait(400);
const box = await page.evaluate(() => { const r = document.querySelector('#preview li:nth-child(2)').getBoundingClientRect(); return [r.left + r.width * 0.5, r.top + r.height / 2]; });
await page.mouse.move(box[0], box[1] - 30); await page.mouse.move(box[0], box[1], { steps: 6 });
await wait(800);
await page.screenshot({ path: path.join(SHOTS, '06-preview.png') });
const pv = await page.evaluate(() => { const f = document.querySelector('.mo-preview'); const c = getComputedStyle(f); const r = f.getBoundingClientRect(); return { op: c.opacity, scale: c.scale, w: r.width, h: r.height, src: (f.querySelector('img.is-front') || {}).src || '' }; });
const box3 = await page.evaluate(() => { const r = document.querySelector('#preview li:nth-child(3)').getBoundingClientRect(); return [r.left + r.width * 0.5, r.top + r.height / 2]; });
await page.mouse.move(box3[0], box3[1], { steps: 6 });
await wait(700);
const pv3 = await page.evaluate(() => (document.querySelector('.mo-preview img.is-front') || {}).src || '');
await page.mouse.move(box3[0], box3[1] + 400, { steps: 4 });
await wait(600);
const pvOff = await page.evaluate(() => getComputedStyle(document.querySelector('.mo-preview')).opacity);
check('6  preview: 320×240 shown at scale 1 on row 2, swaps to row 3, hidden on leave', pv.op === '1' && pv.scale === '1' && pv.w === 320 && pv.h === 240 && pv.src.includes('prayer-book') && pv3.includes('cutter') && pvOff === '0', { pv, pv3, pvOff });

// odometer
await scrollEl(page, '#t-odo', 0.3);
await wait(300);
await page.click('[data-set="8"]');
await wait(1000);
const odo = await page.evaluate(() => { const el = document.getElementById('odo'); const strips = Array.from(el.querySelectorAll('.mo-odo__strip')); return { label: el.querySelector('.mo-sr').textContent, ty: strips.map((s) => Math.round(new DOMMatrix(getComputedStyle(s).transform).m42 / (s.getBoundingClientRect().height / 10) * 100) / 100), dur: getComputedStyle(strips[0]).transitionDuration }; });
check('7  odometer: data-value 8 → "08", columns at digit 0 and 8, .7 s roll', odo.label === '08' && odo.ty[0] === 0 && odo.ty[1] === -8 && odo.dur === '0.7s', odo);

// stamp
const stBefore = await page.evaluate(() => getComputedStyle(document.getElementById('stamp')).opacity);
await scrollEl(page, '#stamp', 0.5);
await wait(60);
const stMid = await page.evaluate(() => { const a = document.getElementById('stamp').getAnimations()[0]; return a ? getComputedStyle(document.getElementById('stamp')).transform : 'none'; });
await wait(500);
const st = await page.evaluate(() => { const c = getComputedStyle(document.getElementById('stamp')); return [c.opacity, c.transform]; });
check('8  stamp: hidden before view, stepped scale mid-hit, then opacity 1 transform none', stBefore === '0' && st[0] === '1' && st[1] === 'none', { stBefore, stMid, st });

// accordion
await scrollEl(page, '#qa', 0.3);
await wait(300);
const q = '#qa .qa:nth-child(1) .qa__q';
await page.click(q);
await wait(200);
const qaMid = await page.evaluate(() => document.querySelector('#qa .qa__a').getAnimations().length);
await wait(500);
const qaOpen = await page.evaluate(() => { const b = document.querySelector('#qa .qa__q'), a = document.querySelector('#qa .qa__a'), i = b.querySelector('.qa__i'); return { exp: b.getAttribute('aria-expanded'), ctl: b.getAttribute('aria-controls') === a.id, h: a.getBoundingClientRect().height, hidden: a.hidden, rot: Math.round(Math.atan2(new DOMMatrix(getComputedStyle(i).transform).b, new DOMMatrix(getComputedStyle(i).transform).a) * 180 / Math.PI) }; });
await page.click(q);
await wait(700);
const qaClosed = await page.evaluate(() => { const b = document.querySelector('#qa .qa__q'), a = document.querySelector('#qa .qa__a'); return { exp: b.getAttribute('aria-expanded'), hidden: a.hidden }; });
check('9  accordion: WAAPI height, aria-expanded true, icon 45°, closes back to hidden', qaMid === 1 && qaOpen.exp === 'true' && qaOpen.ctl && qaOpen.h > 0 && !qaOpen.hidden && qaOpen.rot === 45 && qaClosed.exp === 'false' && qaClosed.hidden, { qaMid, qaOpen, qaClosed });

// menu
await page.click('[data-menu-open]');
await wait(250);
await page.screenshot({ path: path.join(SHOTS, '07-menu-opening.png') });
await wait(900);
const mOpen = await page.evaluate(() => { const m = document.getElementById('menu'); return { hidden: m.hidden, state: m.dataset.menu, tr: getComputedStyle(m).transform, links: Array.from(m.querySelectorAll('nav > *')).map((a) => getComputedStyle(a).opacity), exp: document.querySelector('[data-menu-open]').getAttribute('aria-expanded'), stopped: !!window.__motion.lenis.isStopped, focus: document.activeElement.textContent }; });
await page.keyboard.press('Escape');
await wait(900);
const mClosed = await page.evaluate(() => { const m = document.getElementById('menu'); return { hidden: m.hidden, state: m.dataset.menu, exp: document.querySelector('[data-menu-open]').getAttribute('aria-expanded'), stopped: !!window.__motion.lenis.isStopped }; });
check('10 menu: open (transform none, links 1, aria-expanded, lenis stopped), Esc closes to hidden', !mOpen.hidden && mOpen.state === 'open' && mOpen.tr === 'none' && mOpen.links.every((o) => o === '1') && mOpen.exp === 'true' && mOpen.stopped && mClosed.hidden && mClosed.exp === 'false' && !mClosed.stopped, { mOpen, mClosed });

// lenis + header hide (wheel goes through Lenis)
await page.evaluate(() => { scrollTo(0, 0); document.activeElement.blur(); });
await wait(400);
await page.mouse.move(700, 450);
for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 120); await wait(60); }
await wait(1500);
const down = await page.evaluate(() => ({ y: scrollY, last: window.__lastScroll, hidden: document.querySelector('.head').classList.contains('mo-hidden'), tr: new DOMMatrix(getComputedStyle(document.querySelector('.head')).transform).m42 }));
await page.mouse.wheel(0, -60);
await wait(800);
const up = await page.evaluate(() => ({ y: scrollY, hidden: document.querySelector('.head').classList.contains('mo-hidden'), tr: getComputedStyle(document.querySelector('.head')).transform }));
check('11 lenis smooth wheel + lenis.on(scroll), header up after 120 px down, back on scroll up', down.y > 300 && Math.abs(down.last - down.y) < 2 && down.hidden && down.tr === -64 && !up.hidden && up.tr === 'none', { down, up });

// anchors with header offset
await page.click('[data-menu-open]'); await wait(700);
await page.click('#menu a[href="#t-qa"]');
await wait(2200);
const anchor = await page.evaluate(() => ({ top: Math.round(document.getElementById('t-qa').getBoundingClientRect().top), hash: location.hash, menu: document.getElementById('menu').hidden }));
check('12 anchor from menu: menu closes, lands at --head (64 px)', Math.abs(anchor.top - 64) <= 1 && anchor.hash === '#t-qa' && anchor.menu, anchor);

// loop sleeps when idle
const idle = await page.evaluate(() => new Promise((res) => { let n = 0; const orig = window.requestAnimationFrame; setTimeout(() => { window.requestAnimationFrame = (f) => { n++; return orig(f); }; setTimeout(() => { window.requestAnimationFrame = orig; res(n); }, 1000); }, 1500); }));
check('13 shared loop sleeps when idle (rAF calls in 1 s, page still)', idle === 0, { idle });
check('14 zero console errors (1440)', errors.length === 0, errors);
await ctx.close();

// ---- 375: overflow + errors, test page and the real page
for (const u of [URL_, BASE + '/index.html']) {
  const { ctx: c, page: p, errors: e } = await open({ viewport: { width: 375, height: 800 } }, u);
  await wait(2500);
  const ov = await p.evaluate(async () => { const out = []; for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); out.push(document.documentElement.scrollWidth); } return Math.max(...out); });
  const name = u.endsWith('index.html') ? 'index.html' : 'motion-test';
  const h1 = await p.evaluate(() => { const h = document.querySelector('[data-words]'); return { kids: Array.from(h.children).map((k) => [getComputedStyle(k).display, k.querySelectorAll('.mo-w').length]), words: h.querySelectorAll('.mo-w').length, op: Array.from(h.querySelectorAll('.mo-w')).every((w) => getComputedStyle(w).opacity === '1' && getComputedStyle(w).transform === 'none') }; });
  console.log('      h1 at 375', name, JSON.stringify(h1));
  if (name === 'motion-test') await p.screenshot({ path: path.join(SHOTS, '08-375-top.png') });
  check(`15 375 ${name}: no horizontal overflow, zero console errors`, ov <= 375 && e.length === 0, { scrollWidth: ov, errors: e });
  await c.close();
}

// ---- reduced motion
{
  const { ctx: c, page: p, errors: e } = await open({ reduce: true });
  await wait(600);
  const r = await p.evaluate(async () => {
    const o = { lenis: window.__motion.lenis, words: document.querySelectorAll('.mo-w').length, light: document.querySelectorAll('.mo-lw').length, linesSplit: document.querySelectorAll('.mo-li').length };
    o.op = ['words', 'light', 'lines'].map((id) => getComputedStyle(document.getElementById(id)).opacity);
    const st = document.getElementById('stamp'); st.scrollIntoView(); await new Promise((r) => setTimeout(r, 300));
    o.stamp = [getComputedStyle(st).opacity, st.getAnimations().length];
    const w = document.getElementById('t-window'); w.scrollIntoView(); await new Promise((r) => setTimeout(r, 200));
    o.clip = getComputedStyle(w).clipPath;
    const f = document.getElementById('px1'); f.scrollIntoView(); await new Promise((r) => setTimeout(r, 200));
    o.img = getComputedStyle(f.querySelector('img')).transform;
    o.grain = !!f.querySelector('.mo-grain');
    o.preview = !!document.querySelector('.mo-preview');
    o.head = document.querySelector('.head').classList.contains('mo-hide');
    return o;
  });
  await p.click('#qa .qa__q');
  const qa = await p.evaluate(() => ({ exp: document.querySelector('#qa .qa__q').getAttribute('aria-expanded'), anims: document.querySelector('#qa .qa__a').getAnimations().length, hidden: document.querySelector('#qa .qa__a').hidden }));
  await p.click('[data-set="5"]');
  const odo = await p.evaluate(() => ({ label: document.querySelector('#odo .mo-sr').textContent, dur: getComputedStyle(document.querySelector('.mo-odo__strip')).transitionDuration }));
  await p.screenshot({ path: path.join(SHOTS, '09-reduced.png') });
  check('16 reduced motion: no Lenis, no splits, all opacity 1, stamp still, no clip, img untouched, accordion + odometer instant', r.lenis === null && r.words === 0 && r.light === 0 && r.linesSplit === 0 && r.op.every((v) => v === '1') && r.stamp[0] === '1' && r.stamp[1] === 0 && r.clip === 'none' && r.img === 'none' && !r.preview && !r.head && qa.exp === 'true' && qa.anims === 0 && !qa.hidden && odo.label === '05' && odo.dur === '0s' && e.length === 0, { ...r, qa, odo, errors: e });
  await c.close();
}

await browser.close();
const pass = results.filter(Boolean).length;
console.log(`${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
