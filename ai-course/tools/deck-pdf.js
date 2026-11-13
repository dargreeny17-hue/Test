// Export a Slides deck (project/deck.json + slides) to a 16:9 PDF with real icons.
// usage: node deck-pdf.js <deckRoot> <out.pdf>   (needs playwright and lucide-static on NODE_PATH)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const root = process.argv[2];
const out = process.argv[3];
const deck = JSON.parse(fs.readFileSync(path.join(root, 'project/deck.json'), 'utf8'));
const css = fs.readFileSync(path.join(root, 'project/deck.css'), 'utf8');
const links = Object.values(deck.faces || {}).filter(f => f.href).map(f => `<link rel="stylesheet" href="${f.href}">`).join('\n');
const iconDir = path.join(path.dirname(require.resolve('lucide-static/package.json')), 'icons');
const MAP = { Chat: 'message-circle', CheckCircle: 'circle-check', Check: 'check', Verified: 'badge-check', Code: 'code', Wrench: 'wrench', Star: 'star',
  Chart: 'chart-column', Globe: 'globe', Play: 'play', Lock: 'lock', Key: 'key', Book: 'book-open', Lightbulb: 'lightbulb', PaperPlane: 'send',
  Search: 'search', Link: 'link', Clock: 'clock', GraduationCap: 'graduation-cap', ThumbsUp: 'thumbs-up', Users: 'users', Tool: 'hammer',
  Activity: 'activity', Home: 'house', Warning: 'triangle-alert', Settings: 'settings', Database: 'database', Cloud: 'cloud', Lightning: 'zap', Trust: 'shield-check' };
const svgFor = name => {
  const f = path.join(iconDir, (MAP[name] || 'circle') + '.svg');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').replace(/<!--.*?-->/gs, '').replace(/width="24"/, 'width="100%"').replace(/height="24"/, 'height="100%"') : '';
};
let slides = deck.order.map(id => fs.readFileSync(path.join(root, 'project/slides', id + '.html'), 'utf8')).join('\n');
slides = slides.replace(/<x-icon name="([A-Za-z]+)"([^>]*)><\/x-icon>/g, (m, n, rest) => `<x-icon${rest}>${svgFor(n)}</x-icon>`);

const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">${links}
<style>
  @page { size: 1920px 1080px; margin: 0; }
  html, body { margin: 0; padding: 0; }
  body { counter-reset: page; }
  section { position: relative; display: block; width: 1920px; height: 1080px; box-sizing: border-box; overflow: hidden; page-break-after: always; break-after: page; }
  aside { display: none; }
  h1, h2, h3, p, ul, ol { margin: 0; }
  x-icon { display: inline-flex; flex: none; }
  x-icon svg { width: 100%; height: 100%; }
  x-shape { display: block; }
  x-shape[kind="ellipse"] { border-radius: 50%; }
  x-shape[kind="arrow-right"] { clip-path: polygon(0 30%, 60% 30%, 60% 0, 100% 50%, 60% 100%, 60% 70%, 0 70%); }
  .badge-in, .in { animation: none !important; }
</style>
<style>${css}</style></head><body>${slides}</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true, pageRanges: '' });
  if (process.argv[4]) await page.locator('section').nth(Number(process.argv[4])).screenshot({ path: out.replace(/\.pdf$/, '-check.png'), scale: 'css' });
  await browser.close();
  console.log('pdf:', out, deck.order.length, 'slides');
})();
