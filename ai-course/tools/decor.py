"""Generate full-canvas decor SVG (circles pre-clipped to 1920x1080) and inject it as the
first child of <section>. Usage: python3 decor.py [--lesson=l1|l2] <slides_dir> <preset> <id> [<id> ...]
Preset 'none' removes the decor layer. --lesson picks the fallback colours (default l1, blue);
the classes f-50 / f-l / f-900 follow the lesson colour in deck.css anyway."""
import math, re, sys

W, H = 1920, 1080
COMMON = {'w': '#FFFFFF', 'y': '#F5B400', 'dk': '#1E2129'}
# per lesson: its own colour + the next lesson's colour ('g'/'g50' = next member on the "next lesson" slide)
PALETTES = {
    'l1': {'l': '#2F6BFF', '50': '#E3EBFF', '600': '#2456E8', '900': '#1D2A55', 'g': '#12A35B', 'g50': '#DCF4E6'},
    'l2': {'l': '#12A35B', '50': '#DCF4E6', '600': '#0B7843', '900': '#143A2B', 'g': '#FF7A1A', 'g50': '#FFE9D8'},
}
LESSON = dict(COMMON, **PALETTES['l1'])


def clip(poly):
    def clip_edge(pts, inside, inter):
        out = []
        for i in range(len(pts)):
            a, b = pts[i - 1], pts[i]
            if inside(b):
                if not inside(a):
                    out.append(inter(a, b))
                out.append(b)
            elif inside(a):
                out.append(inter(a, b))
        return out

    def ix(a, b, x):
        t = (x - a[0]) / (b[0] - a[0]); return (x, a[1] + t * (b[1] - a[1]))

    def iy(a, b, y):
        t = (y - a[1]) / (b[1] - a[1]); return (a[0] + t * (b[0] - a[0]), y)

    pts = poly
    for inside, inter in [(lambda p: p[0] >= 0, lambda a, b: ix(a, b, 0)),
                          (lambda p: p[0] <= W, lambda a, b: ix(a, b, W)),
                          (lambda p: p[1] >= 0, lambda a, b: iy(a, b, 0)),
                          (lambda p: p[1] <= H, lambda a, b: iy(a, b, H))]:
        if not pts:
            break
        pts = clip_edge(pts, inside, inter)
    return pts


def circle_pts(cx, cy, r, n=144):
    return [(cx + r * math.cos(2 * math.pi * i / n), cy + r * math.sin(2 * math.pi * i / n)) for i in range(n)]


def fmt(p):
    return f'{p[0]:.0f} {p[1]:.0f}'


def disc(cx, cy, r, color, cls, op=None):
    if cx - r >= 0 and cx + r <= W and cy - r >= 0 and cy + r <= H:
        o = f' fill-opacity="{op}"' if op else ''
        return f'<circle class="{cls}" cx="{cx}" cy="{cy}" r="{r}" fill="{LESSON[color]}"{o}/>'
    pts = clip(circle_pts(cx, cy, r))
    d = 'M' + 'L'.join(fmt(p) for p in pts) + 'Z'
    o = f' fill-opacity="{op}"' if op else ''
    return f'<path class="{cls}" d="{d}" fill="{LESSON[color]}"{o}/>'


def ring(cx, cy, r, color, cls, width=3, op=None):
    pts = circle_pts(cx, cy, r, 180)
    runs, cur = [], []
    m = width
    for p in pts + pts[:1]:
        if m <= p[0] <= W - m and m <= p[1] <= H - m:
            cur.append(p)
        elif cur:
            runs.append(cur); cur = []
    if cur:
        runs.append(cur)
    if len(runs) > 1 and runs[0][0] == pts[0] and runs[-1][-1] == pts[0]:
        runs[0] = runs.pop() + runs[0]
    d = ''.join('M' + 'L'.join(fmt(p) for p in run) for run in runs if len(run) > 1)
    o = f' stroke-opacity="{op}"' if op else ''
    return f'<path class="{cls}" d="{d}" fill="none" stroke="{LESSON[color]}" stroke-width="{width}"{o}/>'


PRESETS = {
    # content slides: one pale lesson circle top-right + a small solid lesson dot
    'content': lambda: [disc(1880, 20, 400, '50', 'f-50'), disc(1503, 150, 26, 'l', 'f-l')],
    'content-plain': lambda: [disc(1880, 20, 400, '50', 'f-50')],
    # demo (dark): deep lesson glow top-right, faint circle bottom-left
    'dark': lambda: [disc(1820, 60, 560, '900', 'f-900'), disc(40, 1120, 300, 'dk', 'f-dk')],
    # section openers: white glow + ring on the lesson fill
    'sec': lambda: [disc(1640, 210, 600, 'w', 'f-w', 0.09), ring(1600, 930, 360, 'w', 's-w', 3, 0.3), ring(1580, 270, 360, 'w', 's-w', 3, 0.18)],
    # audience action: glow bottom-right (camera), ring top-right
    'act': lambda: [disc(1760, 1010, 560, 'w', 'f-w', 0.08), ring(1820, 140, 300, 'w', 's-w', 3, 0.28)],
    # covers: solid lesson circle behind the badge + a soft ring
    'cover': lambda: [disc(1580, 400, 640, '50', 'f-50'), disc(1580, 400, 480, 'l', 'f-l'), disc(1180, 860, 40, 'y', 'f-y')],
    'cover-next': lambda: [disc(1560, 450, 640, 'g50', 'f-g50'), disc(1560, 450, 480, 'g', 'f-g'), disc(1160, 900, 40, 'l', 'f-l')],
}


def layer(preset):
    body = ''.join(PRESETS[preset]())
    return (f'<svg class="deco-svg" aria-hidden="true" width="{W}" height="{H}" viewBox="0 0 {W} {H}">'
            f'{body}</svg>\n')


def inject(path, preset):
    s = open(path, encoding='utf8').read()
    s = re.sub(r'<svg class="deco-svg".*?</svg>\n', '', s, flags=re.S)
    if preset != 'none':
        m = re.match(r'<section[^>]*>\n', s)
        s = s[:m.end()] + layer(preset) + s[m.end():]
    open(path, 'w', encoding='utf8').write(s)


if __name__ == '__main__':
    args = sys.argv[1:]
    if args and args[0].startswith('--lesson='):
        LESSON.update(PALETTES[args.pop(0).split('=', 1)[1]])
    d, preset, ids = args[0], args[1], args[2:]
    for i in ids:
        inject(f'{d}/{i}.html', preset)
    print(preset, len(layer(preset)) if preset != 'none' else 0, 'bytes x', len(ids))
