# Russian slop detector (stop-slop rules adapted). usage: python3 slop.py file [file...]
import re, sys, html
PATTERNS = {
 'усилители/наречия': r'\b(очень|действительно|буквально|абсолютно|совершенно|крайне|по-настоящему|по‑настоящему|невероятно|реально|именно|особенно|честно|конечно|просто так|всего лишь|намного|гораздо|сильно)\b',
 'разгон/вода': r'(Стоит отметить|Важно понимать|Важно помнить|Обратите внимание|Давайте|Итак,|Вот что|Вот почему|Вот как|Главное —|Главное:|На самом деле|Дело в том|По сути|В целом|Как видите|Как мы видим|Короче говоря|Запомните)',
 'не X, а Y': r'\bне [^.!?\n]{1,50}?, а\b',
 'не просто': r'\bне просто\b',
 'абсолюты': r'\b(всегда|никогда|каждый|каждая|каждое|каждую|любой|любая|любую|всё|все)\b',
 'тире': r' — ',
 'вопрос-ответ': r'\?\s+[А-ЯЁ][^?!.\n]{0,40}[.!]',
 'двоеточие-раскрытие': r'(Вывод|Итог|Правило|Секрет|Разница|Ответ|Суть)\s*[:—]',
}
def text_of(path):
    s = open(path, encoding='utf8').read()
    if path.endswith('.html'):
        s = re.sub(r'<aside>.*?</aside>', ' ', s, flags=re.S)
        s = html.unescape(re.sub(r'<[^>]+>', ' ', s))
    s = re.sub(r'```.*?```', ' ', s, flags=re.S)  # prompts are tools, not prose
    return s
tot = {}
words = 0
for p in sys.argv[1:]:
    t = text_of(p); words += len(t.split())
    for k, rx in PATTERNS.items():
        tot[k] = tot.get(k, 0) + len(re.findall(rx, t, flags=re.I if k != 'вопрос-ответ' else 0))
print(f'слов: {words}')
for k, v in tot.items():
    print(f'  {k:22s} {v:5d}   ({v*1000/max(words,1):.1f} на 1000 слов)')
