// Local preview of a Slides deck: node render.js <deckRoot> <outDir> [slideId...]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = process.argv[2];
const out = process.argv[3];
const only = process.argv.slice(4);
const deck = JSON.parse(fs.readFileSync(path.join(root, 'project/deck.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'project/deck.css'), 'utf8');
const links = Object.values(deck.faces || {}).filter(f => f.href).map(f => `<link rel="stylesheet" href="${f.href}">`).join('\n');
const ids = only.length ? only : deck.order;
const slides = ids.map(id => fs.readFileSync(path.join(root, 'project/slides', id + '.html'), 'utf8')).join('\n');

const html = `<!doctype html><html><head><meta charset="utf-8">${links}
<style>
  html, body { margin: 0; padding: 0; background: #888; }
  body { counter-reset: page; }
  section { position: relative; display: block; width: 1920px; height: 1080px; box-sizing: border-box; overflow: hidden; margin-bottom: 20px; }
  aside { display: none; }
  h1, h2, h3, p, ul, ol { margin: 0; }
  x-shape { display: block; }
  x-icon { display: inline-block; box-sizing: border-box; border: 3px solid currentColor; border-radius: 30%; flex: none; }
</style>
<style>${css}</style></head><body>${slides}</body></html>`;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.5 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  const report = await page.evaluate(() => {
    const res = [];
    document.querySelectorAll('section').forEach(sec => {
      const sr = sec.getBoundingClientRect();
      const issues = [];
      sec.querySelectorAll('*').forEach(el => {
        if (el.closest('aside')) return;
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        if (r.right > sr.right + 1 || r.bottom > sr.bottom + 1) issues.push(`${el.tagName.toLowerCase()}.${el.className} out of canvas (${Math.round(r.right - sr.left)}x${Math.round(r.bottom - sr.top)})`);
        if (el.scrollWidth > el.clientWidth + 2 && ['P', 'H1', 'H2', 'H3', 'TD', 'TH', 'LI'].includes(el.tagName)) issues.push(`${el.tagName.toLowerCase()} text overflows box: "${el.textContent.slice(0, 40)}"`);
        // camera zone: x>1440 && y>720 relative to slide
        const cx = r.right - sr.left, cy = r.bottom - sr.top, lx = r.left - sr.left, ty = r.top - sr.top;
        if (lx < 1920 && cx > 1440 && cy > 720 && ty < 1080 && el.children.length === 0 && (el.textContent || '').trim() && !el.closest('.cam')) issues.push(`text in camera zone: "${el.textContent.trim().slice(0, 40)}"`);
      });
      res.push({ id: sec.id, issues: [...new Set(issues)].slice(0, 8) });
    });
    return res;
  });
  const secs = await page.$$('section');
  for (let i = 0; i < secs.length; i++) {
    const id = await secs[i].getAttribute('id');
    await secs[i].screenshot({ path: path.join(out, `${id}.png`) });
  }
  await browser.close();
  for (const r of report) console.log(r.id + ': ' + (r.issues.length ? '\n  - ' + r.issues.join('\n  - ') : 'ok'));
})();
