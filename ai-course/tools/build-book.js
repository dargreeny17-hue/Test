// Build a student handbook page (HTML) and PDF from Markdown.
// Usage: node build-book.js <lesson.md> <out.html> [out.pdf] [--color #2F6BFF] [--member Ассистент] [--no]
// Requires: marked (npm i marked@12.0.2); playwright for PDF.
const fs = require('fs');
const path = require('path');
const { marked } = require(require.resolve('marked', { paths: [process.cwd(), __dirname] }));

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const [src, outHtml, outPdf] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const color = opt('--color', '#2F6BFF');
const color50 = opt('--color50', '#E3EBFF');
const color700 = opt('--color700', '#1A3FA6');
const member = opt('--member', 'Ассистент');
const num = opt('--num', '1');
const title = opt('--title', 'Первый результат');

const md = fs.readFileSync(src, 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const slug = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

const toc = [];
const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
  const id = slug(text);
  if (level === 2) toc.push({ id, text: text.replace(/<[^>]+>/g, '') });
  return `<h${level} id="${id}">${text}</h${level}>\n`;
};
renderer.code = (code) =>
  `<div class="code"><button class="copy" type="button" aria-label="Скопировать промпт">Скопировать</button><pre><code>${esc(code)}</code></pre></div>\n`;
renderer.table = (header, body) => {
  const empty = header.replace(/<[^>]+>/g, '').trim() === '';
  return `<div class="table-wrap"><table>${empty ? '' : `<thead>${header}</thead>`}<tbody>${body}</tbody></table></div>\n`;
};
renderer.blockquote = (quote) => {
  const m = quote.match(/<strong>([^<]+)<\/strong>/);
  const head = m ? m[1] : '';
  let cls = 'c-note';
  if (/^Готовый промпт/.test(head)) cls = 'c-prompt';
  else if (/^Внимание/.test(head)) cls = 'c-warn';
  else if (/^Типичная ошибка/.test(head)) cls = 'c-mistake';
  else if (/^Попробуйте сами/.test(head)) cls = 'c-try';
  else if (/^Из практики/.test(head)) cls = 'c-practice';
  else if (/^Актуально/.test(head)) cls = 'c-date';
  return `<aside class="callout ${cls}">${quote}</aside>\n`;
};
marked.use({ renderer, breaks: true });
let body = marked.parse(md);
// first H1 is the book title in the markdown; drop it (the page header shows it)
body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>\n?/, '');

const page = `<title>ИИ‑команда · Книжка ${num}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600..800&family=Golos+Text:wght@400..700&family=JetBrains+Mono:wght@400..600&display=swap">
<style>
/* Layout: one reading column with a contents block; course colours per lesson. */
:root {
  --bg: #F5F6F8; --card: #FEFEFF; --ink: #16181D; --soft: #555A66; --line: #E2E5EB;
  --code-bg: #16181D; --code-fg: #EEF0F4;
  --lesson: ${color}; --lesson-50: ${color50}; --lesson-700: ${color700};
  --warn: #A11A1F; --warn-50: #FDE8E8; --mistake: #A3460A; --mistake-50: #FFEEDF;
  --ok: #0A6A3A; --ok-50: #DFF5E8; --date: #555A66; --date-50: #ECEEF3;
  --f-head: 'Manrope', Verdana, sans-serif; --f-body: 'Golos Text', Arial, sans-serif; --f-mono: 'JetBrains Mono', 'Courier New', monospace;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #121418; --card: #1B1E24; --ink: #EEF0F4; --soft: #AEB3BF; --line: #2C3038;
  --code-bg: #0B0C0F; --code-fg: #E6E8EE;
  --lesson-50: #1E2A4A; --lesson-700: #9DB8FF;
  --warn: #FF9A9E; --warn-50: #3A1E20; --mistake: #FFB37A; --mistake-50: #3A2617;
  --ok: #7FDDA8; --ok-50: #16301F; --date: #AEB3BF; --date-50: #22262D; color-scheme: dark; } }
:root[data-theme="dark"] {
  --bg: #121418; --card: #1B1E24; --ink: #EEF0F4; --soft: #AEB3BF; --line: #2C3038;
  --code-bg: #0B0C0F; --code-fg: #E6E8EE;
  --lesson-50: #1E2A4A; --lesson-700: #9DB8FF;
  --warn: #FF9A9E; --warn-50: #3A1E20; --mistake: #FFB37A; --mistake-50: #3A2617;
  --ok: #7FDDA8; --ok-50: #16301F; --date: #AEB3BF; --date-50: #22262D; color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.65 var(--f-body);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.wrap { max-width: 760px; margin: 0 auto; padding-block: 40px 96px; }
header.hero { display: grid; grid-template-columns: 1fr auto; gap: 24px; align-items: center; padding-block: 24px 32px; }
.brand { display: inline-block; font: 700 13px/1 var(--f-body); letter-spacing: .06em; color: var(--card); background: var(--ink); border-radius: 999px; padding: 8px 14px; }
.hero h1 { font: 800 clamp(34px, 6vw, 52px)/1.04 var(--f-head); letter-spacing: -0.03em; margin: 16px 0 10px; text-wrap: balance; }
.hero p { margin: 0; color: var(--soft); font-size: 18px; }
.pass { width: 168px; background: var(--card); border-radius: 22px; overflow: hidden; box-shadow: 0 18px 40px rgba(22,24,29,.12); transform: rotate(-3deg); }
.pass-top { background: var(--lesson); color: #fff; font: 700 11px/1 var(--f-body); letter-spacing: .14em; padding: 10px 14px; display: flex; justify-content: space-between; }
.pass-body { padding: 14px; display: grid; gap: 6px; }
.pass-av { width: 52px; height: 52px; border-radius: 50%; background: var(--lesson); }
.pass-name { font: 800 20px/1.1 var(--f-head); }
.pass-role { font-size: 12px; color: var(--soft); line-height: 1.3; }
nav.toc { background: var(--card); border-radius: 20px; padding: 20px 24px; margin-bottom: 40px; }
nav.toc h2 { font: 800 15px/1 var(--f-head); letter-spacing: .04em; text-transform: uppercase; color: var(--soft); margin: 0 0 12px; padding: 0; border: 0; }
nav.toc ol { margin: 0; padding-left: 20px; columns: 2; column-gap: 32px; }
nav.toc li { break-inside: avoid; margin: 2px 0; }
a { color: var(--lesson-700); text-underline-offset: 3px; }
h2 { font: 800 30px/1.15 var(--f-head); letter-spacing: -0.02em; margin: 56px 0 16px; padding-top: 24px; border-top: 2px solid var(--line); text-wrap: balance; }
h3 { font: 800 21px/1.25 var(--f-head); margin: 32px 0 8px; text-wrap: balance; }
p, ul, ol { margin: 0 0 14px; }
li { margin: 4px 0; }
strong { font-weight: 700; }
hr { display: none; }
.table-wrap { overflow-x: auto; margin: 16px 0 20px; background: var(--card); border-radius: 16px; }
table { border-collapse: collapse; width: 100%; font-size: 15px; line-height: 1.45; }
th, td { text-align: left; vertical-align: top; padding: 10px 14px; border-bottom: 1px solid var(--line); }
th { font-weight: 700; background: var(--lesson-50); color: var(--lesson-700); }
tr:last-child td { border-bottom: 0; }
.code { position: relative; margin: 0 0 14px; }
pre { margin: 0; background: var(--code-bg); color: var(--code-fg); border-radius: 16px; padding: 18px 20px; padding-top: 44px; overflow-x: auto; font: 14.5px/1.6 var(--f-mono); white-space: pre-wrap; word-break: break-word; }
.copy { position: absolute; top: 10px; right: 10px; font: 600 13px/1 var(--f-body); color: var(--code-bg); background: var(--lesson-50); border: 0; border-radius: 999px; padding: 8px 12px; cursor: pointer; }
.copy:focus-visible { outline: 3px solid var(--lesson); outline-offset: 2px; }
.callout { border-radius: 16px; padding: 14px 18px; margin: 20px 0 14px; }
.callout p:last-child { margin-bottom: 0; }
.callout > p:first-child strong:first-child { display: block; font-family: var(--f-head); font-weight: 800; margin-bottom: 2px; }
.c-prompt { background: var(--lesson); color: #fff; margin-bottom: 8px; padding: 10px 16px; }
.c-prompt strong { color: #fff; }
.c-warn { background: var(--warn-50); } .c-warn strong:first-child { color: var(--warn); }
.c-mistake { background: var(--mistake-50); } .c-mistake strong:first-child { color: var(--mistake); }
.c-try { background: var(--lesson-50); } .c-try strong:first-child { color: var(--lesson-700); }
.c-practice { background: var(--ok-50); } .c-practice strong:first-child { color: var(--ok); }
.c-date, .c-note { background: var(--date-50); } .c-date strong:first-child { color: var(--date); }
footer { margin-top: 64px; color: var(--soft); font-size: 14px; }
@media (max-width: 560px) { header.hero { grid-template-columns: 1fr; } .pass { display: none; } nav.toc ol { columns: 1; } h2 { font-size: 25px; } }
@media print {
  :root { --bg: #fff; --card: #fff; }
  body { font-size: 11.5pt; padding: 0; }
  .wrap { max-width: none; padding: 0; }
  .copy { display: none; }
  pre { padding-top: 14px; white-space: pre-wrap; }
  h2 { break-before: page; border-top: 0; padding-top: 0; margin-top: 0; }
  h3, .callout, .code, tr { break-inside: avoid; }
  .c-prompt { break-after: avoid; }
  nav.toc { border: 1px solid var(--line); }
  .pass { box-shadow: none; border: 1px solid var(--line); }
}
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
<div class="wrap">
<header class="hero">
  <div>
    <span class="brand">ИИ‑КОМАНДА · КНИЖКА ${num}</span>
    <h1>${title}</h1>
    <p>Всё, что было на уроке, — подробно, с готовыми промптами и шпаргалкой. Промпты копируются одной кнопкой.</p>
  </div>
  <div class="pass" aria-hidden="true"><div class="pass-top"><span>ПРОПУСК</span><span>№ 0${num}</span></div>
    <div class="pass-body"><div class="pass-av"></div><div class="pass-name">${member}</div><div class="pass-role">Участник вашей ИИ‑команды с урока ${num}</div></div></div>
</header>
<nav class="toc" aria-label="Содержание"><h2>Содержание</h2><ol>${toc.map(t => `<li><a href="#${t.id}">${t.text}</a></li>`).join('')}</ol></nav>
<main>
${body}
</main>
<footer>ИИ‑команда · авторский курс · Книжка ${num}. Цены, лимиты и доступность сервисов — в Справочнике курса.</footer>
</div>
<script>
document.querySelectorAll('.copy').forEach(btn => {
  btn.addEventListener('click', () => {
    const text = btn.nextElementSibling.innerText;
    const done = () => { btn.textContent = 'Скопировано'; setTimeout(() => { btn.textContent = 'Скопировать'; }, 1600); };
    const fallback = () => { const r = document.createRange(); r.selectNodeContents(btn.nextElementSibling); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Выделено — нажмите Ctrl+C'; };
    try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
  });
});
</script>
`;
fs.writeFileSync(outHtml, page);
console.log('html:', outHtml, 'toc:', toc.length, 'sections');

if (outPdf) {
  (async () => {
    const { chromium } = require('playwright');
    const browser = await chromium.launch();
    const p = await browser.newPage();
    await p.setContent(`<!doctype html><html lang="ru"><head><meta charset="utf-8"></head><body>${page}</body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.pdf({ path: outPdf, format: 'A4', printBackground: true, margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' },
      displayHeaderFooter: true, headerTemplate: '<span></span>',
      footerTemplate: `<div style="font-size:8pt;color:#888;width:100%;text-align:center;font-family:Arial">ИИ‑команда · Книжка ${num} · <span class="pageNumber"></span></div>` });
    await browser.close();
    console.log('pdf:', outPdf);
  })();
}
