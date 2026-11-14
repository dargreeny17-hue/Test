// Export a Slides deck to slide images, an image-based PDF and a PPTX with speaker notes.
// usage: node deck-export.js <deckRoot> <outDir> <baseName> [scale]
// needs playwright, lucide-static, pptxgenjs on NODE_PATH
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const pptxgen = require('pptxgenjs');

const [root, outDir, base, scaleArg] = process.argv.slice(2);
const scale = Number(scaleArg || 1.5);
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
const unesc = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const raw = deck.order.map(id => fs.readFileSync(path.join(root, 'project/slides', id + '.html'), 'utf8'));
const notes = raw.map(s => { const m = s.match(/<aside>([\s\S]*?)<\/aside>/); return m ? unesc(m[1]).trim() : ''; });
const slides = raw.join('\n').replace(/<x-icon name="([A-Za-z]+)"([^>]*)><\/x-icon>/g, (m, n, rest) => `<x-icon${rest}>${svgFor(n)}</x-icon>`);
const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8">${links}
<style>
  html, body { margin: 0; padding: 0; }
  section { position: relative; display: block; width: 1920px; height: 1080px; box-sizing: border-box; overflow: hidden; }
  aside { display: none !important; }
  h1, h2, h3, p, ul, ol { margin: 0; }
  x-icon { display: inline-flex; flex: none; }
  x-icon svg { width: 100%; height: 100%; }
  x-shape { display: block; }
  x-shape[kind="ellipse"] { border-radius: 50%; }
  x-shape[kind="arrow-right"] { clip-path: polygon(0 30%, 60% 30%, 60% 0, 100% 50%, 60% 100%, 60% 70%, 0 70%); }
  *, *::before, *::after { animation: none !important; transition: none !important; }
</style>
<style>${css}</style></head><body>${slides}</body></html>`;

(async () => {
  fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const files = [];
  for (let i = 0; i < deck.order.length; i++) {
    const f = path.join(outDir, 'img', String(i + 1).padStart(2, '0') + '-' + deck.order[i] + '.jpg');
    await page.locator('section').nth(i).screenshot({ path: f, type: 'jpeg', quality: 90 });
    files.push(f);
  }
  // image-based PDF
  const pdfPage = await browser.newPage();
  const imgs = files.map(f => `<img src="data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}">`).join('');
  await pdfPage.setContent(`<!doctype html><style>@page{size:1920px 1080px;margin:0}html,body{margin:0}img{display:block;width:1920px;height:1080px;break-after:page}</style>${imgs}`, { waitUntil: 'load' });
  await pdfPage.pdf({ path: path.join(outDir, base + '.pdf'), width: '1920px', height: '1080px', printBackground: true });
  await browser.close();
  // PPTX: one full-bleed picture per slide + speaker notes
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = deck.title || base;
  files.forEach((f, i) => {
    const s = pres.addSlide();
    s.addImage({ path: f, x: 0, y: 0, w: 13.333, h: 7.5, altText: deck.order[i] });
    if (notes[i]) s.addNotes(notes[i]);
  });
  await pres.writeFile({ fileName: path.join(outDir, base + '.pptx') });
  console.log('exported', files.length, 'slides');
})();
