// Build a student handbook page (HTML) and PDF from Markdown.
// Usage: node build-book.js <lesson.md> <out.html> [out.pdf]
//   [--num 1] [--title "..."] [--member Ассистент] [--label "..."] [--lead "..."]
//   [--color #2F6BFF] [--color50 #E3EBFF] [--color700 #1A3FA6] [--toc3]
// Requires: marked (npm i marked@12.0.2); playwright for PDF.
// Icons: Lucide (ISC licence), inlined as SVG paths.
const fs = require('fs');
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
const lead = opt('--lead', 'Всё, что было на уроке, — подробно, с готовыми промптами и шпаргалкой. Промпты копируются одной кнопкой.');
const label = opt('--label', `ИИ‑КОМАНДА · КНИЖКА ${num}`);
const toc3 = args.includes('--toc3');

const md = fs.readFileSync(src, 'utf8');
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const strip = s => s.replace(/<[^>]+>/g, '');
const slug = s => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
const plural = (n, one, few, many) => { const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 10 || b >= 20) ? few : many; };

// ---------- colour helpers (contrast-checked text colours) ----------
const rgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const hex = a => '#' + a.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return hex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = h => { const c = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const INK = '#16181D';
// A "strong" version of a colour that carries small white text at >= 4.6:1;
// colours too light for that (orange, yellow) keep their hue and get dark text instead.
const strongOf = c => { if (contrast(c, '#FFFFFF') < 3) return { bg: c, on: INK }; let s = c; while (contrast(s, '#FFFFFF') < 4.6) s = mix(s, '#000000', 0.03); return { bg: s, on: '#FFFFFF' }; };
const onOf = c => (contrast(c, '#FFFFFF') >= 3 ? '#FFFFFF' : INK); // for large text / icons (3:1)

// Team palette: base, light tint, dark text colour (light theme); dark-theme tint and text are derived.
const TEAM = [
  { c: '#2F6BFF', l: '#E3EBFF', d: '#1A3FA6' }, // Ассистент
  { c: '#12A35B', l: '#DDF5E8', d: '#0A6A3A' },
  { c: '#FF7A1A', l: '#FFEBDC', d: '#A3460A' },
  { c: '#7B4DFF', l: '#ECE5FF', d: '#4F26C9' },
  { c: '#EE3E86', l: '#FDE4EF', d: '#A3184F' },
  { c: '#F5B400', l: '#FFF4CC', d: '#7A5700' },
];
const DARK_CARD = '#1B1E24';
const darkTint = c => mix(c, DARK_CARD, 0.8);
const darkText = c => mix(c, '#FFFFFF', 0.55);
const markOf = c => (contrast(c, '#FFFFFF') < 2 ? mix(c, '#000000', 0.1) : c); // bullets: keep yellow visible
let lessonIdx = TEAM.findIndex(t => t.c.toLowerCase() === color.toLowerCase());
if (lessonIdx < 0) lessonIdx = (parseInt(num, 10) - 1 + 6) % 6;
const lessonStrong = strongOf(color);

// ---------- icons ----------
const ICON = {
  sparkles: '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/><path d="M4 17v2"/><path d="M5 18H3"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  x: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/><path d="m15 5 3 3"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  calendar: '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>',
  quote: '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  slides: '<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>',
  idcard: '<path d="M16 10h2"/><path d="M16 14h2"/><path d="M6.17 15a3 3 0 0 1 5.66 0"/><circle cx="9" cy="11" r="2"/><rect x="2" y="5" width="20" height="14" rx="2"/>',
  help: '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  listchecks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  notebook: '<path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M21.378 5.626a1 1 0 1 0-3.004-3.004l-5.01 5.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/>',
  book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  circlecheck: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  bookmark: '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
};
const svg = (name, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICON[name]}</svg>`;

// ---------- chapters: number, icon, accent colour, kind ----------
const numRe = /^(\d+(?:\.\d+)*)\.\s+([\s\S]+)$/;
const slideRe = /^(Слайд\s+\d+)\s+·\s+([\s\S]+)$/;
const chapterIcon = t =>
  /^Паспорт/.test(t) ? 'idcard' : /^Ответы/.test(t) ? 'circlecheck' : /вопрос/i.test(t) ? 'help' : /^Чек/.test(t) ? 'listchecks'
  : /^Домашнее/.test(t) ? 'notebook' : /^Что почитать/.test(t) ? 'book' : /^Шпаргалка/.test(t) ? 'zap'
  : /^Журнал/.test(t) ? 'history' : /^Как пользоваться/.test(t) ? 'info' : 'bookmark';
const chapterKind = t =>
  /^Паспорт/.test(t) ? 'passport' : /^Ответы/.test(t) ? 'answers' : /Проверьте себя/.test(t) ? 'quiz' : /вопрос/i.test(t) ? 'faq'
  : /^Чек/.test(t) ? 'check' : /^Домашнее/.test(t) ? 'hw' : /^Что почитать/.test(t) ? 'read' : /^Шпаргалка/.test(t) ? 'cheat'
  : /^Журнал/.test(t) ? 'log' : '';
let numbered = 0;
const accentFor = t => {
  // numbered chapters cycle through the other five team colours; the first chapter,
  // the one about the lesson's team member and all unnumbered ones keep the lesson colour
  if (!numRe.test(t)) return lessonIdx;
  if (numbered === 0 || t.includes(member)) { numbered = Math.max(numbered, 1); return lessonIdx; }
  const others = TEAM.map((_, i) => i).filter(i => i !== lessonIdx);
  return others[(numbered++ - 1) % others.length];
};

const toc = [];
const chapters = {}; // id -> { acc, kind }
let curAcc = lessonIdx;
const renderer = new marked.Renderer();
renderer.heading = (text, level) => {
  const id = slug(text);
  const plain = strip(text);
  if (level === 2) {
    curAcc = accentFor(plain);
    chapters[id] = { acc: curAcc, kind: chapterKind(plain), plain };
  }
  if (level === 2 || (toc3 && level === 3)) toc.push({ id, text: plain, level, acc: curAcc });
  if (level === 2) {
    const m = text.match(numRe);
    const tile = m ? `<span class="ch-tile" aria-hidden="true"><span class="ch-num">${m[1]}</span></span>`
      : `<span class="ch-tile" aria-hidden="true">${svg(chapterIcon(plain))}</span>`;
    const inner = m ? `<span class="vh">${m[1]}. </span>${m[2]}` : text;
    return `<header class="ch-head">${tile}<h2 id="${id}">${inner}</h2></header>\n`;
  }
  if (level === 3) {
    const s = text.match(slideRe);
    if (s) return `<h3 id="${id}" class="slide-h"><span class="slide-no">${s[1]}</span><span class="vh"> · </span><span class="slide-t">${s[2]}</span></h3>\n`;
  }
  return `<h${level} id="${id}">${text}</h${level}>\n`;
};
renderer.code = (code) =>
  `<div class="code"><button class="copy" type="button" aria-label="Скопировать промпт">${svg('copy')}<span class="copy-l">Скопировать</span></button><pre><code>${esc(code)}</code></pre></div>\n`;
renderer.table = (header, body) => {
  const empty = header.replace(/<[^>]+>/g, '').trim() === '';
  const cols = (body.match(/<tr>[\s\S]*?<\/tr>/) || [''])[0].split('<td').length - 1;
  const cls = empty && cols === 2 ? ' kv' : '';
  return `<div class="table-wrap${cls}"><table>${empty ? '' : `<thead>${header}</thead>`}<tbody>${body}</tbody></table></div>\n`;
};
const CALLOUT = {
  'c-prompt': 'sparkles', 'c-warn': 'shield', 'c-mistake': 'x', 'c-try': 'pencil', 'c-practice': 'bulb', 'c-date': 'calendar', 'c-note': 'quote',
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
  if (cls === 'c-note') return `<aside class="callout c-note"><span class="c-ico" aria-hidden="true">${svg('quote')}</span><div class="c-body">${quote}</div></aside>\n`;
  // take the bold title out of the first paragraph and render it as the callout head
  let bodyHtml = quote.replace(/<strong>[^<]+<\/strong>(\s*<br>\s*)?/, '').replace(/<p>\s*<\/p>\s*/g, '');
  if (cls === 'c-prompt') {
    const pm = head.match(/^(Готовый промпт)\s+(\S+)(.*?)(\s+—\s+)(.+)$/);
    const meta = pm
      ? `<span class="pc-kicker">${pm[1]} <span class="pc-id">${pm[2]}</span>${pm[3]}</span><span class="vh">${pm[4]}</span><span class="pc-title">${pm[5]}</span>`
      : `<span class="pc-title">${head}</span>`;
    return `<!--prompt--><div class="pc-head"><span class="pc-ico" aria-hidden="true">${svg('sparkles')}</span><div class="pc-meta">${meta}</div></div>${bodyHtml.trim() ? `<div class="pc-note">${bodyHtml}</div>` : ''}<!--/prompt-->\n`;
  }
  if (cls === 'c-mistake') {
    // "Как делают / Чем плохо / Как правильно" lines -> labelled rows
    const rowCls = { 'Как делают:': 'm-how', 'Чем плохо:': 'm-bad', 'Как правильно:': 'm-ok' };
    bodyHtml = bodyHtml.replace(/<p>([\s\S]*?)<\/p>/g, (all, inner) => {
      const lines = inner.split(/<br>\s*/);
      if (!lines.every(l => /^(Как делают:|Чем плохо:|Как правильно:)/.test(l.trim()))) return all;
      return '<div class="m-rows">' + lines.map(l => { const lm = l.trim().match(/^(Как делают:|Чем плохо:|Как правильно:)([\s\S]*)$/); return `<p class="m-row ${rowCls[lm[1]]}"><span class="m-lbl">${lm[1]}</span>${lm[2]}</p>`; }).join('') + '</div>';
    });
  }
  return `<aside class="callout ${cls}"><div class="c-head"><span class="c-ico" aria-hidden="true">${svg(CALLOUT[cls])}</span><span class="c-title">${head}</span></div><div class="c-body">${bodyHtml}</div></aside>\n`;
};
marked.use({ renderer, breaks: true });
let body = marked.parse(md);
// first H1 is the book title in the markdown; drop it (the page header shows it)
body = body.replace(/<h1[^>]*>[\s\S]*?<\/h1>\n?/, '');

// prompt card = head + the code block right after it (+ the "Что подставить" note if it follows)
body = body.replace(/<!--prompt-->([\s\S]*?)<!--\/prompt-->\n(<div class="code">[\s\S]*?<\/pre><\/div>\n)?(<p><strong>Что подставить:[\s\S]*?<\/p>\n)?/g,
  (all, head, code, note) => `<figure class="prompt-card">${head}${code || ''}${note ? `<div class="pc-foot">${note}</div>` : ''}</figure>\n`);
// "Было:" / "Стало:" quotes
body = body.replace(/(<p>(Было|Стало):<\/p>\n)<aside class="callout c-note">/g, (all, p, w) => `${p.replace('<p>', `<p class="ba-label ba-${w === 'Было' ? 'before' : 'after'}">`)}<aside class="callout c-note c-${w === 'Было' ? 'before' : 'after'}">`);
// traffic-light cells
const TL = { 'Красный': 'red', 'Жёлтый': 'yellow', 'Зелёный': 'green' };
body = body.replace(/<td><strong>(Красный|Жёлтый|Зелёный)<\/strong>/g, (all, w) => `<td><span class="tl tl-${TL[w]}" aria-hidden="true"></span><strong>${w}</strong>`);
// task lists -> real checkboxes with labels
body = body.replace(/<li><input (?:disabled="" )?type="checkbox"(?: checked="")?(?: disabled="")?>\s*([\s\S]*?)<\/li>/g, (all, t) => `<li class="task"><label><input type="checkbox"><span class="box" aria-hidden="true">${svg('check')}</span><span class="task-t">${t}</span></label></li>`);
body = body.replace(/<ul>\n<li class="task">/g, '<ul class="tasks">\n<li class="task">');
// ordered lists that do not start at 1
body = body.replace(/<ol start="(\d+)">/g, (a, n) => `<ol start="${n}" style="counter-reset: li ${parseInt(n, 10) - 1}">`);
// presenter script: labelled paragraphs
body = body.replace(/<p><strong>Время:<\/strong>([^<]*)<\/p>/g, `<p class="p-time">${svg('clock')}<strong>Время:</strong>$1</p>`)
  .replace(/<p><strong>Делаете:<\/strong>/g, '<p class="p-do"><strong>Делаете:</strong>')
  .replace(/<p><strong>(Говорите[^<]*)<\/strong>/g, '<p class="p-say"><strong>$1</strong>');

// wrap each H2 into a <section> carrying its accent colour and kind
const parts = body.split(/(?=<header class="ch-head">)/);
body = parts.map(part => {
  const hm = part.match(/^<header class="ch-head">[\s\S]*?<h2 id="([^"]+)">/);
  if (!hm) return part;
  const ch = chapters[hm[1]] || { acc: lessonIdx, kind: '' };
  let inner = part;
  if (ch.kind === 'cheat') {
    const [headPart, rest] = [inner.slice(0, inner.indexOf('</header>') + 9), inner.slice(inner.indexOf('</header>') + 9)];
    const items = rest.replace(/(<p>[\s\S]*?<\/p>\n)(<(ul|ol)[^>]*>[\s\S]*?<\/\3>\n)?/g, (a, p, list) => `<div class="cs-item">${p}${list || ''}</div>\n`);
    inner = `${headPart}<div class="sec-box">${items}</div>`;
  } else if (ch.kind === 'quiz' || ch.kind === 'check' || ch.kind === 'answers') {
    const i = inner.indexOf('</header>') + 9;
    inner = `${inner.slice(0, i)}<div class="sec-box">${inner.slice(i)}</div>`;
  }
  return `<section class="chapter acc-${ch.acc}${ch.kind ? ' sec-' + ch.kind : ''}" aria-labelledby="${hm[1]}">\n${inner}</section>\n`;
}).join('');

// ---------- "what's inside" facts, counted from the text ----------
const promptCards = (body.match(/class="prompt-card"/g) || []).length;
const codeBlocks = (body.match(/class="code"/g) || []).length;
const slides = toc.filter(t => t.level === 3 && slideRe.test(t.text)).length;
const numberedSections = toc.filter(t => t.level === 2 && numRe.test(t.text)).length;
const words = strip(body).split(/\s+/).filter(Boolean).length;
const passportTime = (md.match(/\|\s*Время чтения\s*\|\s*(?:около\s*)?(\d+)\s*мин/) || [])[1];
const readMin = passportTime ? parseInt(passportTime, 10) : Math.max(5, Math.round(words / 180 / 5) * 5);
const facts = [{ icon: 'clock', v: `≈ ${readMin} мин`, k: 'чтения' }];
if (promptCards) facts.push({ icon: 'sparkles', v: String(promptCards), k: `${plural(promptCards, 'готовый промпт', 'готовых промпта', 'готовых промптов')}` });
else if (codeBlocks) facts.push({ icon: 'sparkles', v: String(codeBlocks), k: plural(codeBlocks, 'промпт', 'промпта', 'промптов') });
if (slides) facts.push({ icon: 'slides', v: String(slides), k: plural(slides, 'слайд', 'слайда', 'слайдов') });
if (numberedSections) facts.push({ icon: 'layers', v: String(numberedSections), k: plural(numberedSections, 'раздел', 'раздела', 'разделов') });
if (Object.values(chapters).some(c => c.kind === 'cheat')) facts.push({ icon: 'zap', v: 'Шпаргалка', k: 'на одну страницу' });

// ---------- contents ----------
const tocItem = (t, short) => {
  const m = t.text.match(numRe), s = t.text.match(slideRe);
  const badge = m ? `<span class="toc-b" aria-hidden="true">${m[1]}</span>` : s ? `<span class="toc-b" aria-hidden="true">${s[1].replace(/\D+/g, '')}</span>`
    : `<span class="toc-b toc-i" aria-hidden="true">${svg(chapterIcon(t.text))}</span>`;
  const txt = m ? `<span class="vh">${m[1]}. </span>${m[2]}` : s ? `<span class="vh">${s[1]} · </span>${s[2]}` : t.text;
  return `<li class="acc-${t.acc} toc-l${t.level}"><a href="#${t.id}">${badge}<span class="toc-t">${txt}</span></a></li>`;
};
const tocList = toc.map(t => tocItem(t)).join('');

// ---------- CSS tokens ----------
const teamVars = (mode) => TEAM.map((t, i) => mode === 'light'
  ? `.acc-${i} { --acc: ${t.c}; --acc-mark: ${markOf(t.c)}; --acc-on: ${onOf(t.c)}; --acc-50: ${t.l}; --acc-700: ${t.d}; }`
  : `.acc-${i} { --acc-50: ${darkTint(t.c)}; --acc-700: ${darkText(t.c)}; }`).join('\n');
const LIGHT = `
  --bg: #F5F6F8; --card: #FFFFFF; --ink: #16181D; --soft: #555A66; --line: #E2E5EB; --zebra: #F7F8FA;
  --code-bg: #16181D; --code-fg: #EEF0F4; --code-line: #16181D;
  --lesson-50: ${color50}; --lesson-700: ${color700};
  --warn-50: #FDECEC; --warn-700: #A11A1F; --mistake-50: #FFEFE2; --mistake-700: #A3460A;
  --ok-50: #E2F5EA; --ok-700: #0A6A3A; --date-50: #ECEEF3; --date-700: #555A66;
  --shadow: 0 1px 2px rgba(22,24,29,.05), 0 10px 30px -16px rgba(22,24,29,.25);`;
const DARK = `
  --bg: #121418; --card: ${DARK_CARD}; --ink: #EEF0F4; --soft: #AEB3BF; --line: #2C3038; --zebra: #20242B;
  --code-bg: #0B0C0F; --code-fg: #E6E8EE; --code-line: #2C3038;
  --lesson-50: ${darkTint(color)}; --lesson-700: ${darkText(color)};
  --warn-50: #3A1E20; --warn-700: #FF9A9E; --mistake-50: #3A2617; --mistake-700: #FFB37A;
  --ok-50: #16301F; --ok-700: #7FDDA8; --date-50: #22262D; --date-700: #AEB3BF;
  --shadow: 0 1px 2px rgba(0,0,0,.3), 0 10px 30px -16px rgba(0,0,0,.6); color-scheme: dark;`;
const darkTeam = (pre) => TEAM.map((t, i) => `${pre} .acc-${i} { --acc-50: ${darkTint(t.c)}; --acc-700: ${darkText(t.c)}; }`).join('\n');

const passNo = String(num).padStart(2, '0');
const teamStrip = TEAM.map((t, i) => `<span class="ts${i === lessonIdx ? ' on' : ''}" style="background:${t.c}"></span>`).join('');

const page = `<title>ИИ‑команда · Книжка ${num}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@600..800&family=Golos+Text:wght@400..700&family=JetBrains+Mono:wght@400..600&display=swap">
<style>
/* Course colours: the lesson colour leads (cover, prompts, links); every chapter gets one
   team colour for its opener, bullets and table head. Callouts are coloured by type. */
:root {${LIGHT}
  --lesson: ${color}; --lesson-strong: ${lessonStrong.bg}; --on-lesson: ${lessonStrong.on};
  --warn: #D93036; --mistake: #FF7A1A; --ok: #12A35B; --date: #6B7080;
  --f-head: 'Manrope', Verdana, sans-serif; --f-body: 'Golos Text', Arial, sans-serif; --f-mono: 'JetBrains Mono', 'Courier New', monospace;
}
${teamVars('light')}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {${DARK} }
${darkTeam(':root:not([data-theme="light"])')} }
:root[data-theme="dark"] {${DARK} }
${darkTeam(':root[data-theme="dark"]')}

* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
body { margin: 0; background: var(--bg); color: var(--ink); font: 17px/1.7 var(--f-body);
  padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.vh { position: absolute !important; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
.i { width: 1em; height: 1em; flex: none; }
:focus-visible { outline: 3px solid var(--lesson); outline-offset: 3px; border-radius: 6px; }
a { color: var(--lesson-700); text-underline-offset: 3px; text-decoration-thickness: 1px; }
a:hover { text-decoration-thickness: 2px; }

/* reading progress */
.progress { position: fixed; inset: 0 0 auto 0; height: 4px; z-index: 10; background: transparent; pointer-events: none; }
.progress span { display: block; height: 100%; background: var(--lesson); transform-origin: 0 50%; transform: scaleX(0); }

/* ---------- cover ---------- */
.top { max-width: 1048px; margin: 0 auto; padding-top: 32px; }
.hero { position: relative; overflow: hidden; isolation: isolate; background: var(--lesson-strong); color: var(--on-lesson);
  border-radius: 32px; padding: 48px 48px 40px; display: grid; grid-template-columns: minmax(0, 1fr) 248px; gap: 32px; align-items: center; }
.hero-big { position: absolute; z-index: -1; right: -24px; bottom: -92px; font: 800 340px/1 var(--f-head); letter-spacing: -0.06em; color: currentColor; opacity: .08; user-select: none; }
.brand { display: inline-block; font: 800 12.5px/1 var(--f-body); letter-spacing: .08em; color: ${INK}; background: #FFFFFF; border-radius: 999px; padding: 9px 14px; }
.hero h1 { font: 800 clamp(38px, 6.4vw, 64px)/1.02 var(--f-head); letter-spacing: -0.035em; margin: 20px 0 14px; text-wrap: balance; }
.hero .lead { margin: 0; font-size: 19px; line-height: 1.55; max-width: 34em; }
.facts { list-style: none; margin: 28px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
.facts li { display: flex; align-items: center; gap: 10px; background: rgba(8, 16, 48, .22); border-radius: 14px; padding: 10px 14px 10px 12px; margin: 0; line-height: 1.2; }
.facts .i { width: 20px; height: 20px; opacity: .95; }
.facts b { display: block; font: 800 17px/1.15 var(--f-head); }
.facts small { display: block; font-size: 13px; }
.pass { position: relative; justify-self: end; width: 248px; color: ${INK}; background: #FFFFFF; border-radius: 24px; overflow: hidden;
  box-shadow: 0 24px 48px -12px rgba(8, 16, 48, .45); transform: rotate(-4deg); }
.pass-top { background: ${INK}; color: #FFFFFF; font: 800 11px/1 var(--f-body); letter-spacing: .16em; padding: 13px 16px; display: flex; justify-content: space-between; align-items: center; }
.pass-top i { width: 8px; height: 8px; border-radius: 50%; background: var(--lesson); display: inline-block; margin-right: 8px; }
.pass-body { padding: 18px 18px 16px; display: grid; gap: 4px; }
.pass-av { width: 76px; height: 76px; border-radius: 22px; background: var(--lesson); color: #FFFFFF; display: grid; place-items: center; margin-bottom: 10px; }
.pass-av .i { width: 40px; height: 40px; stroke-width: 1.75; }
.pass-name { font: 800 26px/1.1 var(--f-head); letter-spacing: -0.02em; }
.pass-role { font-size: 13px; color: #555A66; line-height: 1.35; }
.pass-team { display: flex; gap: 6px; margin-top: 14px; }
.ts { width: 22px; height: 8px; border-radius: 4px; opacity: .35; }
.ts.on { opacity: 1; width: 40px; }
.pass-code { height: 26px; margin: 14px 0 0; border-radius: 4px; background: repeating-linear-gradient(90deg, ${INK} 0 2px, transparent 2px 5px, ${INK} 5px 6px, transparent 6px 9px, ${INK} 9px 12px, transparent 12px 14px); opacity: .85; }

/* ---------- layout ---------- */
.layout { max-width: 1048px; margin: 0 auto; padding: 40px 0 96px; }
.content { max-width: 760px; margin: 0 auto; min-width: 0; }
.side { display: none; }
@media (min-width: 1120px) {
  .layout { display: grid; grid-template-columns: 232px minmax(0, 760px); gap: 56px; }
  .content { margin: 0; }
  .side { display: block; }
  .side nav { position: sticky; top: 24px; max-height: calc(100vh - 48px); overflow: auto; padding: 4px 6px 16px 0; scrollbar-width: thin; }
  nav.toc { display: none; }
}

/* ---------- contents ---------- */
.toc-h { font: 800 13px/1 var(--f-head); letter-spacing: .1em; text-transform: uppercase; color: var(--soft); margin: 0 0 14px; }
.toc ul, .side ul { list-style: none; margin: 0; padding: 0; }
.toc li, .side li { margin: 0; padding: 0; }
.toc a, .side a { display: flex; align-items: flex-start; gap: 12px; color: var(--ink); text-decoration: none; border-radius: 12px; padding: 7px 8px; line-height: 1.35; }
.toc a:hover, .side a:hover { background: var(--acc-50); }
.toc-b { flex: none; min-width: 40px; height: 26px; padding: 0 7px; display: inline-grid; place-items: center; border-radius: 8px; background: var(--acc-50); color: var(--acc-700);
  font: 800 13px/1 var(--f-head); font-variant-numeric: tabular-nums; }
.toc-i .i { width: 15px; height: 15px; }
.toc-t { padding-top: 3px; }
nav.toc { background: var(--card); border-radius: 24px; padding: 24px; margin-bottom: 48px; box-shadow: var(--shadow); }
nav.toc ul { display: grid; grid-template-columns: 1fr 1fr; column-gap: 16px; row-gap: 2px; }
nav.toc.many ul { grid-template-columns: 1fr; }
.side .toc-h { padding-left: 8px; }
.side a { font-size: 14.5px; padding: 6px 8px; gap: 10px; }
.side .toc-b { min-width: 34px; height: 22px; font-size: 11.5px; border-radius: 7px; }
.side .toc-t { padding-top: 2px; }
.side .toc-l3 a { padding-left: 8px; }
.side a[aria-current="true"] { background: var(--acc-50); font-weight: 600; }
.side a[aria-current="true"] .toc-b { background: var(--acc); color: var(--acc-on); }

/* ---------- chapters ---------- */
.chapter { margin-top: 72px; }
.chapter:first-child { margin-top: 0; }
.ch-head { display: flex; align-items: center; gap: 20px; background: var(--acc-50); border-radius: 24px; padding: 20px 24px; margin: 0 0 28px; position: relative; overflow: hidden; }
.ch-head::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: var(--acc); }
.ch-tile { flex: none; min-width: 76px; height: 76px; padding: 0 12px; border-radius: 20px; background: var(--acc); color: var(--acc-on); display: grid; place-items: center; }
.ch-num { font: 800 32px/1 var(--f-head); letter-spacing: -0.03em; font-variant-numeric: tabular-nums; }
.ch-tile .i { width: 36px; height: 36px; }
h2 { font: 800 32px/1.12 var(--f-head); letter-spacing: -0.025em; margin: 0; text-wrap: balance; color: var(--ink); }
h3 { font: 800 22px/1.25 var(--f-head); letter-spacing: -0.01em; margin: 40px 0 10px; text-wrap: balance; }
h3::before { content: ''; display: inline-block; width: 10px; height: 10px; border-radius: 3px; background: var(--acc-mark); margin-right: 12px; vertical-align: 0.12em; }
h3 + p, h3 + ul, h3 + ol { margin-top: 0; }
p, ul, ol { margin: 0 0 16px; }
strong { font-weight: 700; }
hr { display: none; }

/* lists */
main ul { list-style: none; padding-left: 0; }
main ul > li { position: relative; padding-left: 26px; margin: 6px 0; }
main ul > li::before { content: ''; position: absolute; left: 5px; top: 0.66em; width: 8px; height: 8px; border-radius: 3px; background: var(--acc-mark); }
main ol { list-style: none; padding-left: 0; counter-reset: li; }
main ol > li { position: relative; padding-left: 40px; margin: 8px 0; counter-increment: li; }
main ol > li::before { content: counter(li); position: absolute; left: 0; top: 0.1em; width: 26px; height: 26px; border-radius: 9px; background: var(--acc-50); color: var(--acc-700);
  font: 800 13.5px/26px var(--f-head); text-align: center; font-variant-numeric: tabular-nums; }

/* tasks (check-list) */
ul.tasks > li { padding-left: 0; }
ul.tasks > li::before { display: none; }
.task label { display: flex; gap: 14px; align-items: flex-start; cursor: pointer; padding: 10px 12px; border-radius: 14px; }
.task label:hover { background: var(--zebra); }
.task input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.task .box { flex: none; width: 26px; height: 26px; border-radius: 8px; border: 2px solid var(--acc); display: grid; place-items: center; color: transparent; margin-top: 1px; background: var(--card); }
.task .box .i { width: 16px; height: 16px; stroke-width: 3; }
.task input:checked + .box { background: var(--acc); color: var(--acc-on); }
.task input:checked ~ .task-t { color: var(--soft); text-decoration: line-through; text-decoration-thickness: 1px; }
.task input:focus-visible + .box { outline: 3px solid var(--lesson); outline-offset: 2px; }

/* tables */
.table-wrap { overflow-x: auto; margin: 18px 0 22px; background: var(--card); border-radius: 18px; border: 1px solid var(--line); box-shadow: var(--shadow); }
table { border-collapse: collapse; width: 100%; font-size: 15px; line-height: 1.5; }
th, td { text-align: left; vertical-align: top; padding: 12px 16px; }
th { font: 800 13px/1.3 var(--f-head); letter-spacing: .04em; text-transform: uppercase; background: var(--acc-50); color: var(--acc-700); border-bottom: 3px solid var(--acc); }
tbody tr:nth-child(even) td { background: var(--zebra); }
td + td, th + th { border-left: 1px solid var(--line); }
.kv td:first-child { width: 32%; color: var(--soft); font-weight: 600; }
.kv td + td { border-left: 0; }
.tl { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; vertical-align: -0.05em; box-shadow: 0 0 0 3px var(--card); }
.tl-red { background: #E5484D; } .tl-yellow { background: #F5B400; } .tl-green { background: #12A35B; }

/* code + copy */
.code { position: relative; margin: 0 0 16px; }
pre { margin: 0; background: var(--code-bg); color: var(--code-fg); border: 1px solid var(--code-line); border-radius: 18px; padding: 54px 22px 20px; overflow-x: auto;
  font: 14.5px/1.65 var(--f-mono); white-space: pre-wrap; word-break: break-word; }
.copy { position: absolute; top: 12px; right: 12px; display: inline-flex; align-items: center; gap: 8px; font: 700 13.5px/1 var(--f-body); color: ${INK}; background: #FFFFFF;
  border: 0; border-radius: 999px; padding: 9px 14px 9px 12px; cursor: pointer; min-height: 34px; }
.copy .i { width: 16px; height: 16px; }
.copy:hover { background: ${color50}; }
.copy.done { background: #C9F2DA; }
.copy:focus-visible { outline: 3px solid ${mix(color, '#FFFFFF', 0.35)}; outline-offset: 2px; }

/* prompt card */
.prompt-card { margin: 28px 0 22px; border-radius: 22px; overflow: hidden; background: var(--code-bg); box-shadow: var(--shadow); border: 1px solid var(--code-line); }
.pc-head { display: flex; align-items: center; gap: 14px; background: var(--lesson-strong); color: var(--on-lesson); padding: 16px 20px; }
.pc-ico { flex: none; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: rgba(8, 16, 48, .22); }
.pc-ico .i { width: 22px; height: 22px; }
.pc-meta { display: grid; gap: 3px; min-width: 0; }
.pc-kicker { font: 700 12.5px/1.3 var(--f-body); letter-spacing: .06em; text-transform: uppercase; }
.pc-id { display: inline-block; font: 600 12px/1 var(--f-mono); letter-spacing: 0; text-transform: none; border: 1px solid currentColor; border-radius: 6px; padding: 3px 6px; margin-left: 4px; }
.pc-title { font: 800 19px/1.25 var(--f-head); letter-spacing: -0.01em; }
.pc-title::first-letter { text-transform: uppercase; }
.pc-note { background: var(--lesson-strong); color: var(--on-lesson); padding: 0 20px 14px; font-size: 15px; }
.pc-note p { margin: 0; }
.prompt-card .code { margin: 0; }
.prompt-card pre { border: 0; border-radius: 0; }
.pc-foot { background: var(--card); padding: 16px 20px; font-size: 15.5px; line-height: 1.6; border-top: 1px solid var(--line); }
.pc-foot p { margin: 0; }
.pc-foot strong { color: var(--lesson-700); }

/* callouts */
.callout { --c: var(--lesson); --c-on: #FFFFFF; --c-50: var(--lesson-50); --c-700: var(--lesson-700); --acc-mark: var(--c);
  background: var(--c-50); border-radius: 20px; padding: 18px 22px 18px; margin: 26px 0 20px; }
.c-head { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.c-ico { flex: none; width: 34px; height: 34px; border-radius: 11px; display: grid; place-items: center; background: var(--c); color: var(--c-on); }
.c-ico .i { width: 19px; height: 19px; }
.c-title { font: 800 17px/1.3 var(--f-head); color: var(--c-700); }
.c-body > :last-child, .c-body > :last-child > :last-child { margin-bottom: 0; }
.c-warn { --c: var(--warn); --c-50: var(--warn-50); --c-700: var(--warn-700); }
.c-mistake { --c: var(--mistake); --c-on: ${INK}; --c-50: var(--mistake-50); --c-700: var(--mistake-700); }
.c-try { --c: var(--lesson); --c-on: ${onOf(color)}; }
.c-practice { --c: var(--ok); --c-on: #FFFFFF; --c-50: var(--ok-50); --c-700: var(--ok-700); }
.c-date, .c-note { --c: var(--date); --c-50: var(--date-50); --c-700: var(--date-700); }
.m-rows { display: grid; gap: 8px; }
.m-row { margin: 0; padding: 10px 14px; border-radius: 12px; background: var(--card); }
.m-lbl { display: block; font: 800 12.5px/1.3 var(--f-head); letter-spacing: .06em; text-transform: uppercase; margin-bottom: 2px; color: var(--soft); }
.m-bad .m-lbl { color: var(--mistake-700); }
.m-ok { box-shadow: inset 4px 0 0 var(--ok); }
.m-ok .m-lbl { color: var(--ok-700); }
.c-note { display: flex; gap: 14px; align-items: flex-start; background: var(--card); border: 1px solid var(--line); }
.c-note .c-ico { background: var(--date-50); color: var(--date-700); }
.c-note .c-body { padding-top: 4px; }
.c-before { border-left: 5px solid #E5484D; }
.c-after { border-left: 5px solid var(--ok); }
.ba-label { font: 800 13px/1 var(--f-head); letter-spacing: .08em; text-transform: uppercase; margin: 24px 0 -12px; color: var(--soft); }

/* special sections */
.sec-box { background: var(--card); border-radius: 24px; padding: 24px 28px; box-shadow: var(--shadow); border: 1px solid var(--line); }
.sec-box > :last-child { margin-bottom: 0; }
.sec-quiz .sec-box { background: var(--acc-50); border: 0; box-shadow: none; }
.sec-quiz .sec-box ol > li { padding: 10px 14px 10px 52px; background: var(--card); border-radius: 14px; }
.sec-quiz .sec-box ol > li::before { left: 14px; top: 11px; background: var(--acc); color: var(--acc-on); }
.sec-cheat .sec-box { border: 2px solid var(--acc); columns: 2 300px; column-gap: 16px; padding: 18px; }
.cs-item { break-inside: avoid; background: var(--acc-50); border-radius: 16px; padding: 14px 16px; margin: 0 0 16px; font-size: 15.5px; line-height: 1.6; display: flow-root; }
.cs-item p, .cs-item ul, .cs-item ol { margin: 0 0 6px; }
.cs-item > :last-child { margin-bottom: 0; }
.cs-item strong { color: var(--acc-700); }
.cs-item ul > li, .cs-item ol > li { margin: 3px 0; }
.cs-item ol > li::before { background: var(--card); }
.sec-faq p { background: var(--card); border-radius: 16px; padding: 16px 20px; border: 1px solid var(--line); }
.sec-faq p > strong:first-child { display: block; font-family: var(--f-head); font-weight: 800; color: var(--acc-700); margin-bottom: 4px; }
.sec-hw .ch-head + p { background: var(--card); border-radius: 18px; padding: 16px 20px; border: 1px solid var(--line); box-shadow: var(--shadow); }
.sec-answers .sec-box ol > li::before { background: var(--ok-50); color: var(--ok-700); }
.sec-log table { font-size: 14px; }

/* presenter script */
.slide-h { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; padding-top: 28px; border-top: 1px solid var(--line); }
.slide-h::before { display: none; }
.slide-no { font: 800 12.5px/1 var(--f-head); letter-spacing: .06em; text-transform: uppercase; background: var(--acc); color: var(--acc-on); border-radius: 8px; padding: 7px 10px; transform: translateY(-3px); }
.p-time { max-width: 100%; display: inline-flex; align-items: center; gap: 8px; font-size: 15px; background: var(--acc-50); color: var(--acc-700); border-radius: 999px; padding: 4px 14px 4px 10px; }
.p-time .i { width: 16px; height: 16px; }
.p-do { background: var(--card); border: 1px solid var(--line); border-left: 5px solid var(--mistake); border-radius: 14px; padding: 12px 16px; }
.p-say strong:first-child { color: var(--acc-700); }

footer { margin-top: 80px; color: var(--soft); font-size: 14px; display: grid; gap: 14px; }
.team-strip { display: flex; gap: 6px; }
.team-strip span { height: 6px; flex: 1; border-radius: 3px; }

@media (max-width: 760px) {
  .top { padding-top: 16px; }
  .hero { grid-template-columns: 1fr; padding: 28px 22px 26px; border-radius: 26px; gap: 24px; }
  .hero-big { font-size: 220px; bottom: -60px; right: -12px; }
  .hero .lead { font-size: 17px; }
  .pass { justify-self: start; width: 100%; max-width: 300px; transform: rotate(-2deg); }
  .pass-body { grid-template-columns: auto 1fr; column-gap: 14px; align-items: center; }
  .pass-av { grid-row: span 2; width: 60px; height: 60px; border-radius: 18px; margin: 0; }
  .pass-av .i { width: 32px; height: 32px; }
  .pass-name { font-size: 22px; align-self: end; }
  .pass-role { align-self: start; }
  .pass-team, .pass-code { grid-column: 1 / -1; }
  .facts { gap: 8px; }
  .facts li { flex: 1 1 140px; }
  .layout { padding-top: 28px; }
  nav.toc { padding: 18px 14px; border-radius: 20px; }
  nav.toc ul { grid-template-columns: 1fr; }
  .chapter { margin-top: 56px; }
  .ch-head { gap: 14px; padding: 16px; border-radius: 20px; }
  .ch-tile { min-width: 56px; height: 56px; border-radius: 16px; padding: 0 8px; }
  .ch-num { font-size: 22px; }
  .ch-tile .i { width: 28px; height: 28px; }
  h2 { font-size: 24px; }
  h3 { font-size: 20px; }
  body { font-size: 16.5px; }
  table { font-size: 14px; }
  th, td { padding: 10px 12px; }
  pre { padding: 54px 16px 16px; font-size: 13.5px; }
  .pc-head { padding: 14px 16px; }
  .pc-ico { width: 34px; height: 34px; }
  .pc-title { font-size: 17px; }
  .pc-foot { padding: 14px 16px; }
  .callout { padding: 16px; }
  .sec-box { padding: 16px; border-radius: 20px; }
  .sec-cheat .sec-box { padding: 12px; }
}

@page { size: A4; margin: 20mm 17mm 17mm; }
@page :first { margin: 0; }
@media print {
  :root:root:root:root {${LIGHT} }
${TEAM.map((t, i) => `  :root:root:root:root .acc-${i} { --acc-50: ${t.l}; --acc-700: ${t.d}; }`).join('\n')}
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-size: 10.5pt; line-height: 1.6; padding: 0; background: #FFFFFF; }
  .progress, .side, .copy, .no-print { display: none !important; }
  .top { max-width: none; padding: 0; }
  .hero { height: 297mm; border-radius: 0; padding: 26mm 20mm 22mm; grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; align-items: start; gap: 0; break-after: page; }
  .hero-main { display: contents; }
  .hero .brand { grid-row: 1; justify-self: start; }
  .hero .pass { grid-row: 1; justify-self: end; width: 64mm; margin-top: 6mm; transform: rotate(-4deg); box-shadow: 0 18px 40px -12px rgba(8,16,48,.5); }
  .hero .titles { grid-row: 2; align-self: end; }
  .hero h1 { font-size: 52pt; margin: 0 0 6mm; }
  .hero .lead { font-size: 14pt; max-width: 150mm; }
  .hero .facts { grid-row: 3; margin-top: 12mm; }
  .hero-big { font-size: 150mm; right: -8mm; bottom: -40mm; }
  .layout { display: block; max-width: none; padding: 0; }
  .content { max-width: none; }
  nav.toc { display: block; box-shadow: none; border: 1px solid var(--line); break-after: page; padding: 8mm; }
  nav.toc ul { grid-template-columns: 1fr 1fr; }
  nav.toc.many ul { grid-template-columns: 1fr 1fr; font-size: 9pt; }
  .chapter { margin-top: 0; break-before: page; }
  .chapter:first-child { break-before: auto; }
  .ch-head { break-after: avoid; }
  h3 { break-after: avoid; margin-top: 8mm; }
  .callout, .prompt-card, .m-row, .cs-item, tr, .sec-faq p, .task, .sec-quiz li, .pc-head { break-inside: avoid; }
  .pc-head { break-after: avoid; }
  pre { background: #F3F5F9; color: ${INK}; border: 0; border-left: 4px solid var(--lesson); padding: 12px 16px; font-size: 9.5pt; }
  .prompt-card { background: #F3F5F9; box-shadow: none; border: 1px solid var(--line); }
  .prompt-card pre { border-left: 0; }
  .table-wrap, .sec-box, nav.toc, .sec-hw .ch-head + p { box-shadow: none; }
  .table-wrap { overflow: visible; }
  footer { margin-top: 12mm; }
}
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; scroll-behavior: auto !important; } }
</style>
<div class="progress" aria-hidden="true"><span></span></div>
<div class="top">
<header class="hero">
  <div class="hero-big" aria-hidden="true">${passNo}</div>
  <div class="hero-main">
    <span class="brand">${label}</span>
    <div class="titles"><h1>${title}</h1>
    <p class="lead">${lead}</p></div>
    <ul class="facts" aria-label="Что внутри">${facts.map(f => `<li>${svg(f.icon)}<span><b>${f.v}</b><small>${f.k}</small></span></li>`).join('')}</ul>
  </div>
  <div class="pass" aria-hidden="true"><div class="pass-top"><span><i></i>ПРОПУСК</span><span>№ ${passNo}</span></div>
    <div class="pass-body"><div class="pass-av">${svg('bot')}</div><div class="pass-name">${member}</div><div class="pass-role">Участник вашей ИИ‑команды с урока ${num}</div>
    <div class="pass-team">${teamStrip}</div><div class="pass-code"></div></div></div>
</header>
</div>
<div class="layout">
<aside class="side"><nav aria-label="Навигация по разделам"><p class="toc-h">Содержание</p><ul>${tocList}</ul></nav></aside>
<div class="content">
<nav class="toc${toc.length > 24 ? ' many' : ''}" aria-label="Содержание"><h2 class="toc-h">Содержание</h2><ul>${tocList}</ul></nav>
<main>
${body}
</main>
<footer><div class="team-strip" aria-hidden="true">${TEAM.map(t => `<span style="background:${t.c}"></span>`).join('')}</div>ИИ‑команда · авторский курс · Книжка ${num}. Цены, лимиты и доступность сервисов — в Справочнике курса.</footer>
</div>
</div>
<script>
(function () {
  // copy buttons
  document.querySelectorAll('.copy').forEach(function (btn) {
    var label = btn.querySelector('.copy-l');
    btn.addEventListener('click', function () {
      var pre = btn.nextElementSibling, text = pre.innerText;
      var done = function () { label.textContent = 'Скопировано'; btn.classList.add('done'); setTimeout(function () { label.textContent = 'Скопировать'; btn.classList.remove('done'); }, 1600); };
      var fallback = function () { var r = document.createRange(); r.selectNodeContents(pre); var s = getSelection(); s.removeAllRanges(); s.addRange(r); label.textContent = 'Выделено — нажмите Ctrl+C'; };
      try { navigator.clipboard.writeText(text).then(done, fallback); } catch (e) { fallback(); }
    });
  });
  // check-list: remember ticks in this browser only
  var key = 'ai-team-book-${num}-' + location.pathname + '-tasks';
  var boxes = Array.prototype.slice.call(document.querySelectorAll('.task input'));
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
  boxes.forEach(function (b, i) {
    b.checked = !!saved[i];
    b.addEventListener('change', function () { try { localStorage.setItem(key, JSON.stringify(boxes.map(function (x) { return x.checked; }))); } catch (e) {} });
  });
  // reading progress + current section in the side contents
  var bar = document.querySelector('.progress span');
  var links = Array.prototype.slice.call(document.querySelectorAll('.side a'));
  var side = document.querySelector('.side nav');
  var heads = links.map(function (a) { return document.getElementById(decodeURIComponent(a.hash.slice(1))); });
  var current = -1, ticking = false;
  function update() {
    ticking = false;
    var h = document.documentElement, max = h.scrollHeight - innerHeight;
    if (bar) bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    var idx = -1;
    for (var i = 0; i < heads.length; i++) { if (heads[i] && heads[i].getBoundingClientRect().top < 140) idx = i; else if (heads[i]) break; }
    if (idx !== current) {
      if (current >= 0) links[current].removeAttribute('aria-current');
      current = idx;
      if (idx >= 0) {
        var a = links[idx]; a.setAttribute('aria-current', 'true');
        if (side && side.scrollHeight > side.clientHeight) {
          var top = a.offsetTop;
          if (top < side.scrollTop + 40 || top > side.scrollTop + side.clientHeight - 80) side.scrollTop = top - side.clientHeight / 2;
        }
      }
    }
  }
  addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
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
    const runHead = `font-family:Arial,sans-serif;font-size:7.5pt;color:#6B7080;width:100%;padding:0 17mm;display:flex;justify-content:space-between;align-items:center;-webkit-print-color-adjust:exact`;
    await p.pdf({ path: outPdf, format: 'A4', printBackground: true, preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: `<div style="${runHead};padding-top:8mm"><span style="letter-spacing:.08em;font-weight:bold"><span style="display:inline-block;width:7px;height:7px;border-radius:2px;background:${color};margin-right:6px"></span>${esc(label)}</span><span>${esc(strip(title))}</span></div>`,
      footerTemplate: `<div style="${runHead};padding-bottom:6mm;justify-content:flex-end"><span style="font-weight:bold;color:#16181D"><span class="pageNumber"></span></span><span style="margin:0 4px">/</span><span class="totalPages"></span></div>` });
    await browser.close();
    console.log('pdf:', outPdf);
  })();
}
