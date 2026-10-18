// Feature screenshots for the About page, cropped to one feature each, at 2x.
// node scripts/about-shots.mjs [url] [outDir] [photosDir]
// Needs the dev server (npm run dev): stand-in photos are painted from src/lib/samples.ts.
// Pass photosDir to use real photos instead (never a personal folder; photos chosen for the page).
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
const [url = 'http://localhost:5173/', outDir = 'public/about/shots', photosDir] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 1280;

// name, saved settings, photo count, captions, and the element to crop to.
const SHOTS = [
  { name: 'sheet-corkboard', prefs: { themeId: 'corkboard-cork' }, n: 6, captions: { 1: 'beach day!', 4: 'best cake' }, el: 'sheet' },
  { name: 'sheet-contact', prefs: { themeId: 'contact-proof', align: 'contact' }, n: 6, captions: { 2: 'keeper' }, el: 'table' },
  { name: 'sheet-stamps', prefs: { themeId: 'stamps-airmail' }, n: 4, captions: {}, el: 'table' },
  { name: 'sheet-instant', prefs: { themeId: 'instant-classic' }, n: 3, captions: { 1: 'beach day!', 2: 'park nap', 3: 'cake!!' }, el: 'table' },
  { name: 'themes', prefs: { themeId: 'prints-wood' }, n: 4, captions: {}, el: 'themes' },
  { name: 'photos', prefs: { themeId: 'prints-wood' }, n: 4, captions: { 1: 'beach day!', 3: 'cake!!' }, el: 'photos' },
  { name: 'mix', prefs: { themeId: 'custom-mix' }, n: 4, captions: {}, el: 'mix' },
  { name: 'export', prefs: { themeId: 'gallery-white', format: 'jpeg' }, n: 9, captions: {}, el: 'export' },
  { name: 'bodies', prefs: { body: 'cobalt' }, n: 0, captions: {}, el: 'bodies' },
  { name: 'drop', prefs: {}, n: 3, captions: {}, el: 'drop' },
];

// How to find each feature on the page.
const FIND = {
  sheet: `[...document.querySelectorAll('section.card')].find((s) => s.querySelector('h2')?.textContent === 'Your sheet')`,
  export: `document.querySelector('button.btn.w-full').closest('section')`,
  themes: `[...document.querySelectorAll('section.card')].find((s) => s.textContent.includes('Surprise me'))`,
  photos: `[...document.querySelectorAll('section.card')].find((s) => s.textContent.includes('Clear all'))`,
  mix: `document.querySelector('div.grid.overflow-auto').nextElementSibling`,
  table: `document.querySelector('.table-top')`,
  bodies: `document.querySelector('header .card')`,
  drop: `document.querySelector('[aria-label="Add photos"]')`,
};

const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${tmpdir()}/charmera-about-${port}`, 'about:blank'], { stdio: 'ignore' });
try {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch {} await sleep(100); }
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const logs = [];
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } if (d.method === 'Runtime.exceptionThrown') logs.push(JSON.stringify(d.params).slice(0, 300)); });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable');
  const viewport = (h) => send('Emulation.setDeviceMetricsOverride', { width: W, height: h, deviceScaleFactor: 2, mobile: false });
  await viewport(900);

  // Stand-in photos: the four sample scenes at native size, then mirrored, as JPGs on disk.
  let dir = photosDir;
  if (!dir) {
    dir = `${tmpdir()}/charmera-about-photos`;
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    await send('Page.navigate', { url }); await sleep(2000);
    const urls = await ev(`import('/src/lib/samples.ts').then((m) => Array.from({ length: 12 }, (_, i) => m.sampleCanvas(i, 3, i % 8 >= 4).toDataURL('image/jpeg', 0.9)))`);
    urls.forEach((u, i) => writeFileSync(`${dir}/${String(i + 1).padStart(2, '0')} ${['beach', 'park', 'party', 'dusk'][i % 4]}.jpg`, Buffer.from(u.split(',')[1], 'base64')));
  }
  const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort().map((f) => `${dir}/${f}`);
  mkdirSync(outDir, { recursive: true });

  for (const s of SHOTS) {
    await send('Page.navigate', { url }); await sleep(800);
    await ev(`localStorage.setItem('charmera-collage:prefs:v1', ${JSON.stringify(JSON.stringify(s.prefs))})`);
    await send('Page.navigate', { url }); await sleep(2000);
    if (s.n) {
      const doc = await send('DOM.getDocument');
      const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
      await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files: files.slice(0, s.n) });
      await sleep(1500 + s.n * 300);
      for (const [n, text] of Object.entries(s.captions)) {
        await ev(`(() => { const i = document.querySelector('input[aria-label="Caption for photo ${n}"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, ${JSON.stringify(text)}); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
      }
      await sleep(1200);
    }
    // Tall viewport so nothing is sticky or clipped, then crop to the feature.
    await viewport(await ev('document.documentElement.scrollHeight'));
    await sleep(600);
    const box = await ev(`(() => { const r = (${FIND[s.el]}).getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; })()`);
    const pad = 8;
    const clip = { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2, scale: 1 };
    const shot = await send('Page.captureScreenshot', { format: 'webp', quality: 86, clip, captureBeyondViewport: true });
    writeFileSync(`${outDir}/${s.name}.webp`, Buffer.from(shot.result.data, 'base64'));
    console.log(`${s.name}.webp ${Math.round(clip.width)}×${Math.round(clip.height)}`);
    await viewport(900);
  }
  console.log('errors:', logs.length ? logs.join('\n') : 'none');
  ws.close();
} finally { chrome.kill(); }
