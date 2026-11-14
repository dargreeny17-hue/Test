"""Fill <aside> of each slide with its section of the lesson script.
usage: python3 sync_notes.py <script.md> <deck_root>"""
import html, json, os, re, sys

script, root = sys.argv[1], sys.argv[2]
s = open(script, encoding='utf8').read()
s = s.split('## Готовые ответы')[0]
parts = re.split(r'^### Слайд (\d+) · .*$', s, flags=re.M)
order = json.load(open(os.path.join(root, 'project', 'deck.json'), encoding='utf8'))['order']
nums = [int(parts[i]) for i in range(1, len(parts), 2)]
assert nums == list(range(1, len(order) + 1)), (nums, len(order))

for k, i in enumerate(range(1, len(parts), 2)):
    body = parts[i + 1].split('\n---')[0]
    body = '\n'.join(l for l in body.split('\n') if not l.startswith('**Время:**'))
    body = body.replace('**Делаете:**', 'ДЕЛАЕТЕ:').replace('**Говорите:**', 'ГОВОРИТЕ:')
    body = body.replace('**', '').replace('*', '')
    body = re.sub(r'\n\s*\n+', '\n', body).strip()
    text = html.escape(body, quote=False)
    p = os.path.join(root, 'project', 'slides', order[k] + '.html')
    h = open(p, encoding='utf8').read()
    h, n = re.subn(r'<aside>[\s\S]*?</aside>', lambda m: f'<aside>{text}</aside>', h)
    assert n == 1, p
    # aside must be the last child of the section
    assert re.search(r'</aside>\n</section>\n?$', h), p
    open(p, 'w', encoding='utf8').write(h)
print('notes synced:', len(order))
