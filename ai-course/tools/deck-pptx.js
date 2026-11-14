// Export a Slides deck to an editable PPTX: background art as a picture, every text block as a native text box, notes as speaker notes.
// usage: node deck-pptx.js <deckRoot> <out.pptx> [font]
// needs playwright, lucide-static, pptxgenjs on NODE_PATH
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const pptxgen = require('pptxgenjs');

const [root, out, fontArg] = process.argv.slice(2);
const FONT = fontArg || 'Arial';
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
  .pp-hide, .pp-hide * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; }
</style>
<style>${css}</style></head><body>${slides}</body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 });
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  const data = await page.evaluate(() => {
    const hex = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(x => parseFloat(x)); return { hex: p.slice(0, 3).map(v => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase(), a: p.length > 3 ? p[3] : 1 }; };
    const rotated = el => { for (let e = el; e && e.tagName !== 'SECTION'; e = e.parentElement) { const t = getComputedStyle(e).transform; if (t && t !== 'none') { const m = t.match(/matrix\(([^)]+)\)/); if (m) { const v = m[1].split(',').map(Number); if (Math.abs(v[1]) > 0.001) return true; } } } return false; };
    const BLOCK = 'h1,h2,h3,p,li,td,th';
    return [...document.querySelectorAll('section')].map(sec => {
      const sr = sec.getBoundingClientRect();
      const blocks = [...sec.querySelectorAll(BLOCK)].filter(el => !el.closest('aside') && !el.closest('svg') && !el.parentElement.closest(BLOCK) && el.textContent.trim() && !rotated(el));
      const items = blocks.map(el => {
        const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
        const pl = parseFloat(cs.paddingLeft), pr = parseFloat(cs.paddingRight), pt = parseFloat(cs.paddingTop), pb = parseFloat(cs.paddingBottom);
        const runs = [];
        const walk = (node, inh) => {
          for (const ch of node.childNodes) {
            if (ch.nodeType === 3) { let t = ch.textContent.replace(/\s+/g, ' '); if (t) { if (inh.upper) t = t.toUpperCase(); runs.push({ t, ...inh }); } }
            else if (ch.nodeType === 1) {
              if (ch.tagName === 'BR') { runs.push({ br: true }); continue; }
              if (ch.tagName === 'X-ICON' || ch.tagName === 'svg' || ch.tagName === 'X-SHAPE') continue;
              const c = getComputedStyle(ch);
              walk(ch, { color: hex(c.color), bold: parseInt(c.fontWeight) >= 600, italic: c.fontStyle === 'italic', size: parseFloat(c.fontSize), upper: c.textTransform === 'uppercase' });
            }
          }
        };
        walk(el, { color: hex(cs.color), bold: parseInt(cs.fontWeight) >= 600, italic: cs.fontStyle === 'italic', size: parseFloat(cs.fontSize), upper: cs.textTransform === 'uppercase' });
        // trim edges
        const tx = runs.filter(r => !r.br);
        if (tx.length) { tx[0].t = tx[0].t.replace(/^\s+/, ''); tx[tx.length - 1].t = tx[tx.length - 1].t.replace(/\s+$/, ''); }
        // text extent
        const range = document.createRange(); range.selectNodeContents(el); const tr = range.getBoundingClientRect();
        let lh = parseFloat(cs.lineHeight); if (isNaN(lh)) lh = parseFloat(cs.fontSize) * 1.2;
        let align = cs.textAlign; if (align === 'start') align = 'left'; if (align === 'end') align = 'right';
        if (cs.display.includes('flex') && cs.justifyContent === 'center') align = 'center';
        return { x: r.left - sr.left + pl, y: r.top - sr.top + pt, w: r.width - pl - pr, h: r.height - pt - pb,
          tx: tr.left - sr.left, ty: tr.top - sr.top, tw: tr.width, th: tr.height,
          align, lh, ls: parseFloat(cs.letterSpacing) || 0, font: cs.fontFamily, runs: runs.filter(r => r.br || r.t) };
      });
      blocks.forEach(el => el.classList.add('pp-hide'));
      return items;
    });
  });
  const tmp = path.join(path.dirname(out), 'pptx-bg'); fs.mkdirSync(tmp, { recursive: true });
  const bgs = [];
  for (let i = 0; i < deck.order.length; i++) {
    const f = path.join(tmp, String(i + 1).padStart(2, '0') + '.jpg');
    await page.locator('section').nth(i).screenshot({ path: f, type: 'jpeg', quality: 88 });
    bgs.push(f);
  }
  await browser.close();

  const PX = 13.333 / 1920; // inches per px
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.title = deck.title || 'deck';
  data.forEach((items, i) => {
    const s = pres.addSlide();
    s.addImage({ path: bgs[i], x: 0, y: 0, w: 13.333, h: 7.5, altText: 'Фон слайда' });
    items.forEach((it, k) => {
      const mono = /mono/i.test(it.font);
      const face = mono ? 'Courier New' : FONT;
      const runs = [];
      it.runs.forEach((r, j) => {
        if (r.br) { if (runs.length) runs[runs.length - 1].options.breakLine = true; return; }
        const o = { color: r.color ? r.color.hex : '16181D', bold: r.bold, italic: r.italic, fontSize: Math.round(r.size * 0.5 * 2) / 2, fontFace: face };
        if (r.color && r.color.a < 1) o.transparency = Math.round((1 - r.color.a) * 100);
        if (it.ls) o.charSpacing = Math.round(it.ls * 0.5 * 10) / 10;
        runs.push({ text: r.t, options: o });
      });
      if (!runs.length) return;
      // position by the real text extent; widen single lines a little for font substitution
      const single = it.th <= it.lh * 1.5;
      const cx = it.tx + it.tw / 2;
      let w = single ? Math.max(it.w, it.tw * 1.12 + 8) : it.w;
      let x = it.x;
      if (it.align === 'center') x = cx - w / 2; else if (it.align === 'right') x = it.x + it.w - w;
      x = Math.max(0, x); w = Math.min(w, 1920 - x);
      const y = it.ty, h = Math.max(it.th, it.lh);
      s.addText(runs, { x: x * PX, y: y * PX, w: w * PX, h: h * PX, margin: 0, valign: 'top', align: it.align,
        lineSpacing: Math.round(it.lh * 0.5 * 10) / 10, fit: 'none', wrap: true, isTextBox: true, objectName: 'Текст ' + (k + 1) });
    });
    if (notes[i]) s.addNotes(notes[i]);
  });
  await pres.writeFile({ fileName: out });
  console.log('pptx:', out, data.length, 'slides,', data.reduce((a, b) => a + b.length, 0), 'text boxes');
})();
