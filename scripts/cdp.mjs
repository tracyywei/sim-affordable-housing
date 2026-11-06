// Headless Chrome check (Node 22, no deps).
// usage: node scripts/cdp.mjs [url] [--shot out.png] [--eval "js expr" ...] [--wait ms] [--reduced-motion]
// Prints console errors/warnings, page exceptions, and each --eval result (JSON). Viewport 1440x900.
// --eval expressions run in order, each after the previous resolves; use `await new Promise(r=>setTimeout(r,800))` inside to wait.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const args = process.argv.slice(2);
let url = 'http://localhost:3000', shot = null, wait = 2500, reduced = false; const evals = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--shot') shot = args[++i]; else if (a === '--eval') evals.push(args[++i]);
  else if (a === '--wait') wait = +args[++i]; else if (a === '--reduced-motion') reduced = true; else url = a;
}
const port = 9300 + Math.floor(Math.random() * 500);
const dir = fs.mkdtempSync('/tmp/cdp-');
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`,
  `--user-data-dir=${dir}`, '--window-size=1440,900', '--hide-scrollbars', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50; i++) { try { const t = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); const pg = t.find(x => x.type === 'page'); if (pg) { ws = new WebSocket(pg.webSocketDebuggerUrl); break; } } catch {} await sleep(200); }
if (!ws) { console.error('chrome did not start'); chrome.kill(); process.exit(1); }
await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const problems = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'assert'].includes(m.params.type))
    problems.push(`console.${m.params.type}: ` + m.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 400));
  if (m.method === 'Runtime.exceptionThrown') problems.push('exception: ' + (m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text).slice(0, 600));
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push('log: ' + m.params.entry.text.slice(0, 300) + ' ' + (m.params.entry.url ?? ''));
});
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
if (reduced) await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url });
await sleep(wait);
for (const e of evals) {
  const r = await send('Runtime.evaluate', { expression: `(async()=>{ return (${e}); })()`, awaitPromise: true, returnByValue: true });
  const res = r.result?.result; const exc = r.result?.exceptionDetails;
  console.log('eval>', e.slice(0, 80), '\n  =', exc ? 'THREW ' + (exc.exception?.description ?? exc.text) : JSON.stringify(res?.value)?.slice(0, 2000));
}
if (shot) { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(shot, Buffer.from(r.result.data, 'base64')); console.log('screenshot ->', shot); }
console.log(problems.length ? `PROBLEMS (${problems.length}):\n  ` + problems.join('\n  ') : 'no console errors');
ws.close(); chrome.kill(); process.exit(0);
