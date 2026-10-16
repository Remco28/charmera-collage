// Drive headless Chrome over CDP: load app, attach photos, set caption, screenshot.
// node scripts/shot.mjs <url> <out.png> <width> <height> <photosDir|-> [count]
// Needs a running server (npm run dev or npm run preview). EXPORT_DIR=dir also clicks export (full, then phone size).
// PREFS='{"themeId":"gallery-salon"}' presets saved settings first.
import { spawn } from 'node:child_process';
import { readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
const [url, out, w, h, dir, count = '6'] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--window-size=${w},${h}`, `--user-data-dir=${tmpdir()}/charmera-cdp-${port}`, 'about:blank'], { stdio: 'ignore' });
try {
  let tabs;
  for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch {} await sleep(100); }
  const ws = new WebSocket(tabs.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const logs = [];
  ws.addEventListener('message', (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } if (d.method === 'Runtime.exceptionThrown' || (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error')) logs.push(JSON.stringify(d.params).slice(0, 300)); });
  const send = (method, params = {}) => new Promise((r) => { if (process.env.DEBUG) console.error('>', method); const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Runtime.enable'); await send('Page.enable'); await send('DOM.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 600 });
  await send('Page.navigate', { url }); await sleep(2000);
  const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  if (process.env.PREFS) {
    // PREFS='{"themeId":"gallery-salon"}' presets saved settings, then reloads.
    await ev(`localStorage.setItem('charmera-collage:prefs:v1', ${JSON.stringify(process.env.PREFS)})`);
    await send('Page.navigate', { url }); await sleep(2000);
  }
  if (dir !== '-') {
    const files = readdirSync(dir).sort().slice(0, +count).map((f) => `${dir}/${f}`);
    const doc = await send('DOM.getDocument');
    const q = await send('DOM.querySelector', { nodeId: doc.result.root.nodeId, selector: 'input[type=file]' });
    await send('DOM.setFileInputFiles', { nodeId: q.result.nodeId, files });
    await sleep(2500);
    await ev(`(() => { const i = document.querySelector('input[aria-label^="Caption for photo 2"]'); if (!i) return; const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(i, 'beach day!'); i.dispatchEvent(new Event('input', { bubbles: true })); })()`);
    await sleep(800);
  }
  if (process.env.EXPORT_DIR) {
    await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: process.env.EXPORT_DIR });
    const click = (txt) => ev(`[...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(txt)}))?.click()`);
    await click('Snap it'); await sleep(6000);
    await click('Phone ·'); await sleep(300); await click('Snap it'); await sleep(5000);
    console.log('saved note:', await ev(`[...document.querySelectorAll('p[aria-live]')].map(p=>p.textContent).join(' | ')`));
  }
  const full = await ev(`document.documentElement.scrollHeight`);
  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: Math.min(full, 4000), deviceScaleFactor: 1, mobile: +w < 600 });
  await sleep(500);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  console.log(out, 'height', full, 'errors:', logs.length ? logs.join('\n') : 'none');
  ws.close();
} finally { chrome.kill(); }
