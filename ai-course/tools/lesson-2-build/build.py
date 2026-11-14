"""Build lesson 2 slides: python3 build.py <deck_root>. Writes project/slides/<id>.html and project/deck.json.
Notes (<aside>) are filled by sync_notes.py, decor by tools/decor.py --lesson=l2."""
import json, os, sys

ROOT = sys.argv[1]
SL = os.path.join(ROOT, 'project', 'slides')
os.makedirs(SL, exist_ok=True)
N = '&#160;'  # nbsp inside numbers


def prog(now=None, done_all=False):
    segs = []
    for i in range(1, 9):
        if done_all or (now and i < now):
            segs.append('<div class="seg-done"></div>')
        elif i == now:
            segs.append('<div class="seg-now"></div>')
        else:
            segs.append('<div class="seg"></div>')
    return '<div class="progress">' + ''.join(segs) + '</div>'


def foot(book):
    return ('<div class="foot"><x-shape kind="ellipse" class="foot-dot"></x-shape><p class="foot-tag">Урок 2 · Аналитик</p>'
            f'<p class="foot-book">{book}</p><p class="pnum"></p></div>')


def head(chip, title, chip_cls='chip', h='h2', extra=''):
    return f'<div class="stack">\n<p class="{chip_cls}">{chip}</p>\n<h2 class="{h}"{extra}>{title}</h2>\n</div>'


def sec_opener(num, title, why, seg, book):
    return f'''<div class="sec-av"><x-icon name="Chart" class="sec-av-ic"></x-icon></div>
<div class="sec-spark"></div>
{prog(seg)}
<div class="stack" style="padding-top:150px;">
<p class="sec-num">{num}</p>
<h2 class="h1">{title}</h2>
<p class="sec-why" style="width:1240px;">Зачем вам: {why}</p>
</div>
{foot(book)}'''


def ic(name, cls):
    return f'<x-icon name="{name}" class="{cls}"></x-icon>'


def chip_ic(name, k, small=False):
    s = ' ic-chip-s' if small else ''
    return f'<div class="ic-chip{s} {k}">{ic(name, "ic-chip-ic")}</div>'


def sum_row(name, k, text):
    return f'<div class="sum-row">{chip_ic(name, k, True)}<p class="body-ink">{text}</p></div>'


def note(icon, text):
    return f'<div class="note">{ic(icon, "note-ic")}<p class="body-ink">{text}</p></div>'


def check(text):
    return f'<div class="check">{ic("CheckCircle", "check-ic")}<p class="body-ink">{text}</p></div>'


def step(n, verb, title, body, hot=False):
    c = 'step step-hot' if hot else 'step'
    return f'<div class="{c}"><p class="step-n">{n} · {verb}</p><p class="step-title">{title}</p><p class="body">{body}</p></div>'


def chat_head(name='Аналитик', status=True):
    s = '<x-shape kind="ellipse" class="dot-green"></x-shape><p class="chat-status">в сети</p>' if status else ''
    return f'<div class="chat-head"><div class="av av-s av-green">{ic("Chart", "ic-s")}</div><p class="chat-name">{name}</p>{s}</div>'


def attach(name, meta, icon='Book'):
    return f'<div class="attach">{ic(icon, "attach-ic")}<p class="attach-name">{name}</p><p class="attach-meta">{meta}</p></div>'


def ph(t):
    return f'<span class="ph">{t}</span>'


S = {}  # id -> (classes, transition, body)

# 1 ---------------------------------------------------------------- cover
S['cover'] = ('', True, f'''<div class="stack" style="width:900px; padding-top:120px;">
<p class="chip in">Урок 2 из 3</p>
<h1 class="h1 in in1">ИИ на моей работе</h1>
<p class="lead in in2">Нанимаем Аналитика: он читает ваши договоры, КП и таблицы</p>
</div>
<div class="badge badge-in" style="position:absolute; left:1310px; top:130px;">
<div class="badge-top"><p class="badge-top-text">ПРОПУСК</p><p class="badge-top-text">№ 02</p></div>
<div class="badge-body">
<div class="av av-xl av-lesson">{ic("Chart", "ic-xl")}</div>
<p class="badge-name">Аналитик</p>
<p class="badge-role">Разбирает документы и таблицы, сравнивает и считает</p>
<div class="badge-line"></div>
<div class="spread"><p class="badge-k">Принят</p><p class="badge-v">урок 2</p></div>
<div class="spread"><p class="badge-k">Где работает</p><p class="badge-v">чат + файлы</p></div>
</div>
</div>
{foot("Книжка 2")}''')

# 2 ---------------------------------------------------------------- roster
S['roster'] = ('', False, f'''<div class="stack-lg" style="gap:36px;">
{head("Команда курса", "Команда растёт")}
<div class="roster" style="grid-template-columns:1fr 1fr 1fr 1fr 1fr;">
<div class="member m-blue"><div class="av av-m av-blue">{ic("Chat", "ic-m")}</div><p class="member-name">Ассистент</p><p class="member-role">отвечает и объясняет</p><div class="grow"></div><p class="member-lesson">Урок 1 · чат</p><p class="chip-in">в команде</p></div>
<div class="member-now"><div class="av av-m av-green">{ic("Chart", "ic-m")}</div><p class="member-name">Аналитик</p><p class="member-role">разбирает документы</p><div class="grow"></div><p class="member-lesson">Урок 2 · файлы</p><p class="chip-today">сегодня</p></div>
<div class="member m-orange"><div class="av av-m av-orange">{ic("Verified", "ic-m")}</div><p class="member-name">Редактор</p><p class="member-role">доводит до качества</p><div class="grow"></div><p class="member-lesson">Урок 3 · свой помощник</p><p class="chip-soon">скоро</p></div>
<div class="member m-violet"><div class="av av-m av-violet">{ic("Code", "ic-m")}</div><p class="member-name">Агент</p><p class="member-role">делает работу сам</p><div class="grow"></div><p class="member-lesson">Модуль · сайт</p><p class="chip-soon">по желанию</p></div>
<div class="member m-pink"><div class="av av-m av-pink">{ic("Wrench", "ic-m")}</div><p class="member-name">Архитектор</p><p class="member-role">ведёт ваш проект</p><div class="grow"></div><p class="member-lesson">Модуль · проект</p><p class="chip-soon">по желанию</p></div>
</div>
{note("CheckCircle", "Из урока 1 всё остаётся: формула, уточнение, проверка, светофор")}
</div>
{foot("Книжка 2, «Паспорт урока»")}''')

# 3 ---------------------------------------------------------------- agenda
rows = [('0–3', 'Старт', 'пропуск Аналитика и план'),
        ('3–15', 'Разбор ДЗ 1', 'цифры группы, две работы, три ошибки'),
        ('15–26', 'Два показа', 'договор и три КП за минуту'),
        ('26–36', 'Как ИИ читает файлы', 'скан, таблица, длинный документ'),
        ('36–44', 'Три правила Аналитика', 'пункт, «в документе нет», Excel'),
        ('49–68', 'Ваш ход', '15 минут на своём документе'),
        ('68–79', 'Цифры и роли', 'пересчёт в Excel, шпаргалка'),
        ('79–90', 'ДЗ и вопросы', 'задание, оценка, следующий урок')]
ag = '\n'.join(f'<div class="ag-row"><p class="ag-time">{a}</p><p class="ag-title">{b}</p><p class="ag-text">{c}</p></div>' for a, b, c in rows)
S['agenda'] = ('', False, f'''<div class="stack-lg" style="gap:36px;">
{head("План урока · 90 минут", "Что успеем сегодня")}
<div class="agenda">
{ag}
</div>
</div>
{foot("Книжка 2, «Паспорт урока»")}''')

# 4 ---------------------------------------------------------------- s-hw
S['s-hw'] = (' sec', False, sec_opener('01', 'Что получилось в ДЗ 1',
             'увидеть, сколько времени группа уже сэкономила, и не повторять частые ошибки', 1, 'Книжка 2, гл. 2.1'))

# 5 ---------------------------------------------------------------- hw-numbers
S['hw-numbers'] = ('', False, f'''{prog(1)}
<div class="stack-lg">
{head("Разбор ДЗ 1", "Что получилось у группы")}
<div class="row" style="align-items:stretch; width:1664px; gap:28px;">
<div class="stat-card"><p class="label">СДАЛИ</p><p class="stat-xl">[N]</p><p class="body-ink">человек из [N] прислали домашнее задание</p></div>
<div class="stat-card"><p class="label">ПО ФОРМУЛЕ</p><p class="stat-xl">[N]</p><p class="body-ink">промптов собраны из пяти частей</p></div>
<div class="stat-card accent"><p class="label">СЭКОНОМЛЕНО</p><p class="stat-xl">[N]{N}ч</p><p class="body-ink">на задачах, которые вы и так бы делали</p></div>
</div>
{note("Clock", "В чат: сколько минут сэкономили лично вы на рабочем задании?")}
</div>
{foot("Книжка 2, гл. 2.1")}''')

# 6 ---------------------------------------------------------------- hw-works
def flow(*items):
    out = []
    for i, t in enumerate(items):
        if i:
            out.append('<x-shape kind="arrow-right" class="flow-arrow"></x-shape>')
        out.append(f'<p class="flow-box">{t}</p>')
    return '<div class="flow">' + ''.join(out) + '</div>'


S['hw-works'] = ('', False, f'''{prog(1)}
<div class="stack-lg">
{head("Разбор ДЗ 1", "Две работы, которые стоит увидеть")}
<div class="row" style="align-items:stretch; width:1664px; gap:28px;">
<div class="card card-hot" style="flex:1; gap:22px;">
<p class="chip">Работа 1 · уточнение</p>
<p class="h3">Одно уточнение сделало ответ рабочим</p>
<div class="flow" style="background:var(--bg2); border-radius:20px; padding:16px; align-self:flex-start;"><p class="flow-box">Промпт</p><x-shape kind="arrow-right" class="flow-arrow"></x-shape><p class="flow-box">Уточнение</p><x-shape kind="arrow-right" class="flow-arrow"></x-shape><p class="flow-box">Результат</p></div>
<p class="body">Смотрим, что автор попросил исправить и как изменился ответ</p>
</div>
<div class="card" style="flex:1; gap:22px;">
<p class="chip">Работа 2 · проверка</p>
<p class="h3">Проверка трёх фактов нашла ошибку</p>
<div class="flow" style="background:var(--bg2); border-radius:20px; padding:16px; align-self:flex-start;"><p class="flow-box">Ответ ИИ</p><x-shape kind="arrow-right" class="flow-arrow"></x-shape><p class="flow-box">3 факта</p><x-shape kind="arrow-right" class="flow-arrow"></x-shape><p class="flow-box">Находка</p></div>
<p class="body">И что было бы, если отдать ответ как есть</p>
</div>
</div>
{note("Users", "Показываю с согласия авторов и без имён")}
</div>
{foot("Книжка 2, гл. 2.1")}''')

# 7 ---------------------------------------------------------------- hw-errors
def err(n, title, quote, fix):
    return f'''<div class="card" style="gap:22px;">
<div class="claim" style="align-items:center;"><p class="claim-n-bad">{n}</p><p class="h3">{title}</p></div>
<p class="quote">{quote}</p>
{check(fix)}
</div>'''


S['hw-errors'] = ('', False, f'''{prog(1)}
<div class="stack-lg">
{head("Разбор ДЗ 1", "Три частые ошибки первой недели")}
<div class="cards3">
{err(1, "Промпт без контекста", "«Напиши письмо поставщику»", "Кто поставщик, что случилось, чего хотите")}
{err(2, "Принят первый ответ", "«Сделай лучше»", "Что не так и как надо")}
{err(3, "Проверка на глаз", "«Вроде всё правильно»", "Открыть источник и сверить цифру")}
</div>
{note("Lightbulb", "Документ закрывает все три: в нём и контекст, и источник для проверки")}
</div>
{foot("Книжка 2, гл. 2.1")}''')

# 8 ---------------------------------------------------------------- demo-contract
S['demo-contract'] = (' dark', False, f'''{prog(2)}
<div class="stack-lg">
<div class="stack">
<p class="chip-solid">Вау‑демо 1 · показываю</p>
<h2 class="h1" style="width:1600px;">Договор за минуту</h2>
</div>
<div class="row" style="align-items:stretch; width:1664px;">
{step("01", "берём", f"Договор поставки №{N}47/11", "Три страницы, Word. Уже обезличен: «Компания А» и «Компания Б»")}
{step("02", "просим", "Найти, что невыгодно покупателю", "Таблицей: пункт, что написано, риск, что предложить")}
{step("03", "получаем", "Риски с номерами пунктов", "Каждый вывод можно сверить с договором", True)}
</div>
<div class="tip-dark" style="width:1300px;">{ic("Lightbulb", "tip-dark-ic")}<p class="on-dark">Главное в промпте: <span class="on-dark-hl">«Ссылайся только на пункты этого договора. Чего в договоре нет, пиши „в договоре нет“»</span></p></div>
</div>
{foot("Книжка 2, промпт П‑2.1")}''')

# 9 ---------------------------------------------------------------- contract-result
tr = [('2.2', f'Предоплата 100{N}% за 5 дней', 'Деньги ушли до поставки'),
      ('3.2', 'Срок сдвигается на 30 дней', 'Склад ждёт ещё месяц'),
      ('4.1–4.2', 'Приёмка за 1 рабочий день', 'Скрытый брак не вернуть'),
      ('6.1, 6.2', f'Неустойка 0,5{N}% против 0,01{N}%', 'Ответственность неравная')]
trows = '\n'.join(f'<tr><td class="mono" style="font-weight:600; white-space:nowrap;">{a}</td><td>{b}</td><td>{c}</td></tr>' for a, b, c in tr)
S['contract-result'] = ('', False, f'''{prog(2)}
<div class="chat" style="width:1180px;">
{chat_head()}
<div class="chat-body" style="gap:20px;">
{attach("dogovor-postavki-47-11.docx", "3 страницы")}
<div class="msg-user" style="width:1060px;"><p class="msg-user-text">Найди невыгодные для покупателя условия, у каждого номер пункта</p></div>
<div class="msg-ai" style="width:100%; gap:12px;">
<p class="msg-ai-label">Фрагмент ответа</p>
<table class="t">
<tr><th style="width:15%; text-align:left;">Пункт</th><th style="width:46%; text-align:left;">Что написано</th><th style="width:39%; text-align:left;">Риск</th></tr>
{trows}
</table>
</div>
</div>
</div>
<div class="stack" style="position:absolute; left:1356px; top:128px; width:436px;">
<p class="chip">Проверяю</p>
<h2 class="h2" style="font-size:56px;">20 секунд на два пункта</h2>
<p class="body">Открываю 4.1: «в течение одного рабочего дня». Совпало</p>
<p class="body-ink">ИИ даёт первый проход. К юристу вы идёте с вопросами</p>
</div>
{foot("Книжка 2, гл. 2.2 · промпт П‑2.1")}''')

# 10 --------------------------------------------------------------- demo-kp
def kp(k, s):
    return f'<div class="kp-opt"><p class="kp-key">{k}</p><p class="kp-sum">{s}</p></div>'


S['demo-kp'] = (' dark', False, f'''{prog(2)}
<div class="stack-lg">
<div class="stack">
<p class="chip-solid">Вау‑демо 2 · показываю</p>
<h2 class="h1" style="width:1600px;">Три КП на погрузчик</h2>
</div>
<div class="row" style="align-items:stretch; width:1664px;">
{step("01", "берём", "Три КП на один погрузчик", "Те самые «ждём 3 КП» с фото заметок урока 1")}
{step("02", "просим", "Сравнить таблицей", "Пересчитать итоги и найти, чего не хватает")}
{step("03", "получаем", "Сравнение и вопросы", "Каждому поставщику свои", True)}
</div>
<div class="poll-dark" style="width:1300px; gap:40px;">
<p class="h3" style="width:400px; flex:none;">Опрос в чат: какое КП выгоднее?</p>
{kp("В", f"2{N}734{N}000")}
{kp("Г", f"2{N}480{N}000")}
{kp("Д", f"2{N}640{N}000")}
</div>
</div>
{foot("Книжка 2, промпт П‑2.2")}''')

# 11 --------------------------------------------------------------- kp-traps
S['kp-traps'] = ('', False, f'''{prog(2)}
<div class="stack-lg">
{head("Что нашёл Аналитик", "Три ловушки в трёх КП")}
<div class="cards3">
<div class="card card-hot" style="gap:14px;">
<p class="label-l">КП{N}Г · ИТОГ</p>
<p class="big-num-l">2{N}498{N}400</p>
<p class="body-ink">по строкам, а в КП написано <span class="strike">2{N}480{N}000</span></p>
<p class="body">Ошибка на 18{N}400{N}₽</p>
</div>
<div class="card" style="gap:14px;">
<p class="label">КП{N}Г · КОМПЛЕКТ</p>
<p class="big-num-red">АКБ не входит</p>
<p class="body">Самое дешёвое КП без самой дорогой детали. Цену батареи надо запросить</p>
</div>
<div class="card" style="gap:14px;">
<p class="label">КП{N}Д · НДС</p>
<p class="big-num">3{N}220{N}800</p>
<p class="body-ink">с НДС, а в КП 2{N}640{N}000 без НДС</p>
<p class="body">С налогом 22{N}% это самое дорогое КП</p>
</div>
</div>
{note("Chart", "Сначала приводим цены к одному виду. Итоги пересчитаем в Excel")}
</div>
{foot("Книжка 2, гл. 2.2 · промпт П‑2.2")}''')

# 12 --------------------------------------------------------------- s-files
S['s-files'] = (' sec', False, sec_opener('03', 'Как ИИ читает файлы',
                'знать, какие файлы ИИ читает хорошо и где он молча пропускает важное', 3, 'Книжка 2, гл. 2.3'))

# 13 --------------------------------------------------------------- file-types
def ftile(icon, k, title, text, chip, chip_cls='chip-ok', warn=False):
    c = 'tile-warn' if warn else 'tile'
    return f'''<div class="{c} tile-lg">
<div class="stack" style="gap:10px;">{chip_ic(icon, k)}<p class="tile-title">{title}</p><p class="tile-text">{text}</p></div>
<p class="{chip_cls}" style="align-self:flex-start;">{chip}</p>
</div>'''


S['file-types'] = ('', False, f'''{prog(3)}
<div class="stack-lg">
{head("Файлы", "Что читает Аналитик")}
<div class="tiles tiles-big" style="width:1664px; gap:28px;">
{ftile("Book", "k-green", "Word и PDF с текстом", "Текст лежит в файле готовым", "лучше всего")}
{ftile("Chart", "k-blue", "Таблицы Excel", "Видит строки и столбцы", "хорошо")}
{ftile("Search", "k-violet", "Фото и почерк", "Сначала распознаёт картинку, как фото заметок", "хорошо")}
{ftile("Warning", "k-orange", "Скан с печатями", "Печать поверх текста, подписи, правки ручкой", "ошибается чаще", "chip-vpn", True)}
</div>
{note("Link", "Несколько файлов сразу? Назовите, где какой: «первый файл — договор, второй — спецификация»")}
</div>
{foot("Книжка 2, гл. 2.3")}''')

# 14 --------------------------------------------------------------- lost
S['lost'] = ('', False, f'''{prog(3)}
<div class="stack-lg">
{head("Файлы", "Что теряется по дороге")}
<div class="sumlist" style="width:930px;">
{sum_row("Book", "k-green", "Приложения, вставленные картинкой")}
{sum_row("Search", "k-blue", "Мелкий шрифт и сноски")}
{sum_row("Chart", "k-violet", "Таблицы в сканах: цифра уезжает в чужую колонку")}
{sum_row("Wrench", "k-orange", "Правки на полях и зачёркивания")}
{sum_row("Verified", "k-pink", "Колонтитулы и штампы")}
</div>
</div>
<div class="card accent" style="position:absolute; left:1120px; top:128px; width:672px; gap:22px;">
<p class="h3">ИИ не скажет «я не прочитал приложение»</p>
<p class="body">Он ответит по тому, что прочитал. Спросите отдельно:</p>
<div class="msg-user" style="width:100%;"><p class="msg-user-text">Что написано в Приложении 1? Перечисли его строки</p></div>
<p class="body">Пусто или странно? Вставьте приложение текстом</p>
</div>
{foot("Книжка 2, гл. 2.3")}''')

# 15 --------------------------------------------------------------- long-doc
S['long-doc'] = ('', False, f'''{prog(3)}
<div class="stack-lg">
{head("Файлы", "Длинный документ")}
<div class="row" style="align-items:flex-start; gap:48px;">
<div class="stack" style="gap:12px;">
<div class="ctx" style="width:680px;">
<p class="ctx-label">«РАБОЧИЙ СТОЛ» ИИ ИЗ УРОКА 1</p>
<div class="ctx-msg"><p class="ctx-msg-text">Договор, 3 страницы: помещается целиком</p></div>
<div class="ctx-msg"><p class="ctx-msg-text">Ваш вопрос</p></div>
<div class="ctx-msg"><p class="ctx-msg-text">Ответ ИИ по пунктам</p></div>
</div>
<div class="ctx-gone" style="width:680px;"><p class="ctx-gone-text">Регламент на 100 страниц может не поместиться: ИИ ответит по части</p></div>
</div>
<div class="stack ctx-side" style="width:580px; gap:14px;">
<p class="h3">Как работать</p>
{sum_row("Chat", "k-green", "Один документ, один чат")}
{sum_row("Search", "k-blue", "Спрашивайте по разделам: «разбери раздел 5»")}
{sum_row("CheckCircle", "k-violet", "В конце: «перечисли разделы, которые видел»")}
</div>
</div>
{note("Clock", "Ответы поплыли? Новый чат, документ заново")}
</div>
{foot("Книжка 2, гл. 2.3")}''')

# 16 --------------------------------------------------------------- poll-files
S['poll-files'] = (' act', False, f'''{prog(3)}
<div class="stack-lg">
<div class="stack">
<p class="chip-solid">Опрос · ответ в чат</p>
<h2 class="h1" style="width:1300px;">Какой файл ИИ прочитает хуже всего?</h2>
</div>
<div class="opts">
<div class="opt"><p class="opt-key">A</p><p class="opt-text">Договор в Word</p></div>
<div class="opt"><p class="opt-key">B</p><p class="opt-text">Таблица Excel со сметой</p></div>
<div class="opt"><p class="opt-key">C</p><p class="opt-text">Скан договора с печатями и правками</p></div>
<div class="opt"><p class="opt-key">D</p><p class="opt-text">Фото страницы блокнота</p></div>
</div>
<p class="body-ink" style="width:1300px;">Напишите в чат одну букву</p>
</div>
{foot("Книжка 2, гл. 2.3")}''')

# 17 --------------------------------------------------------------- s-rules
S['s-rules'] = (' sec', False, sec_opener('04', 'Три правила Аналитика',
                'ответ ИИ можно проверить за минуту и отдать дальше', 4, 'Книжка 2, гл. 2.4'))

# 18 --------------------------------------------------------------- rule-1
S['rule-1'] = ('', False, f'''{prog(4)}
<div class="stack-lg" style="gap:36px;">
{head("Правило 1 · только по документу, со ссылкой на пункт", "Нет номера пункта, нет вывода")}
<div class="fsum" style="width:1300px;"><p class="msg-user-text">Отвечай только по документу. У каждого вывода укажи номер пункта</p></div>
<div class="row" style="align-items:stretch; width:1300px; gap:28px;">
<div class="ba ba-before"><p class="ba-label">БЕЗ ПРАВИЛА</p><p class="body-ink">«По закону покупатель имеет право…»</p><p class="body">ИИ смешал договор со своими знаниями. В договоре такого нет</p></div>
<div class="ba ba-after"><p class="ba-label-a">С ПРАВИЛОМ</p><p class="body-ink">«П. 4.1: приёмка за 1 рабочий день»</p><p class="body">Открыли пункт 4.1 и сверили за секунды</p></div>
</div>
<div class="row" style="gap:14px;"><p class="label">ГДЕ ССЫЛАТЬСЯ</p><p class="brand">договор → пункт</p><p class="brand">таблица → строка и столбец</p><p class="brand">PDF → страница</p></div>
</div>
{foot("Книжка 2, гл. 2.4")}''')

# 19 --------------------------------------------------------------- rule-2
S['rule-2'] = ('', False, f'''{prog(4)}
<div class="chat" style="width:1180px;">
{chat_head()}
<div class="chat-body" style="gap:20px;">
{attach("dogovor-postavki-47-11.docx", "3 страницы")}
<div class="msg-user" style="width:640px;"><p class="msg-user-text">Какой штраф за просрочку монтажа?</p></div>
<div class="msg-ai" style="width:100%; background:var(--bg2);">
<p class="msg-ai-label" style="color:var(--soft);">Без правила</p>
<p class="claim-text"><span class="strike">«Штраф 0,1{N}% за каждый день просрочки»</span>. Звучит разумно, и это выдумка</p>
</div>
<div class="msg-ai" style="width:100%;">
<p class="msg-ai-label">С правилом</p>
<p class="claim-text">В договоре нет. Пункта о сроке монтажа и штрафе за просрочку в договоре нет</p>
</div>
</div>
</div>
<div class="stack" style="position:absolute; left:1356px; top:128px; width:436px;">
<p class="chip">Правило 2</p>
<h2 class="h2" style="font-size:56px;">Чего нет, пишем «в документе нет»</h2>
<p class="body">«В договоре нет» тоже находка: это условие надо добавить</p>
<p class="body-ink">Часто самое важное в договоре то, чего в нём нет</p>
</div>
{foot("Книжка 2, гл. 2.4")}''')

# 20 --------------------------------------------------------------- rule-3
S['rule-3'] = ('', False, f'''{prog(4)}
<div class="stack-lg">
{head("Правило 3", "Цифры пересчитываем в Excel")}
<div class="cards3">
<div class="card">{chip_ic("Check", "k-green")}<p class="h3">Пара строк</p><p class="body">Короткий пример ИИ посчитает верно</p></div>
<div class="card tint-red">{chip_ic("Warning", "k-red")}<p class="h3">Длинная таблица</p><p class="body">Ошибка в одной строке, а ответ выглядит идеально</p></div>
<div class="card accent">{chip_ic("Chart", "k-white")}<p class="h3">Что делать</p><p class="body-ink">Сумму, процент и итог по смете считаете вы, в Excel</p></div>
</div>
{note("Lightbulb", "Помните урок 1: модель подбирает правдоподобное продолжение. Как пересчитать за минуту, покажу после практики")}
</div>
{foot("Книжка 2, гл. 2.4")}''')

# 21 --------------------------------------------------------------- traffic-docs
def tq(n, title, items):
    li = ''.join(f'<li>{i}</li>' for i in items)
    return f'''<div class="tcard" style="background:var(--card); box-shadow:0 16px 40px #16181D0D; justify-content:space-between;">
<div class="stack" style="gap:16px;">
<div class="claim" style="align-items:center;"><p class="claim-n">{n}</p><p class="h3">{title}</p></div>
<ul class="t-list">{li}</ul>
</div>
<div class="row" style="gap:18px;"><div class="tq-dots"><x-shape kind="ellipse" class="tq-dot-r"></x-shape><x-shape kind="ellipse" class="tq-dot-y"></x-shape><x-shape kind="ellipse" class="tq-dot-g"></x-shape></div><p class="caption">цвет в чат</p></div>
</div>'''


S['traffic-docs'] = ('', False, f'''{prog(4)}
<div class="stack-lg">
{head("Светофор для документов", "Можно ли загрузить этот файл?")}
<div class="tlight" style="min-height:330px;">
{tq(1, "Договор с поставщиком", ["Названия: «Компания А, Б»", "Реквизиты удалены"])}
{tq(2, "Смета на ремонт", ["Название заказчика", "Адрес объекта"])}
{tq(3, "Скан паспорта водителя", ["Для пропуска на склад"])}
</div>
{note("Search", "Пролистайте файл до конца: подписи, колонтитулы и лист согласования выдают компанию")}
</div>
{foot("Книжка 2, гл. 2.4 · Справочник, памятка В")}''')

# 22 --------------------------------------------------------------- break
S['break'] = (' act', False, '''<div class="stack" style="padding-top:110px;">
<p class="chip-solid">Перерыв</p>
<p class="big-timer">5:00</p>
<p class="lead" style="width:1150px;">Вернёмся в [ВРЕМЯ]. Откройте свой документ и проверьте, что он обезличен</p>
<p class="body" style="width:1150px;">Своего нет? Учебный договор или КП по ссылке в чате</p>
</div>''')

# 23 --------------------------------------------------------------- s-formula
S['s-formula'] = (' sec', False, sec_opener('05', 'Формула для документа',
                  'один промпт, который подходит почти к любому рабочему файлу', 5, 'Книжка 2, гл. 2.5'))

# 24 --------------------------------------------------------------- formula-doc
fp = [('fp-blue', '#2F6BFF', 'Роль', '«юрист»'), ('fp-green', '#12A35B', 'Контекст', 'ваш файл'),
      ('fp-orange', '#FF7A1A', 'Задача', 'найти риски'), ('fp-violet', '#7B4DFF', 'Формат', 'таблица и колонки'),
      ('fp-pink', '#EE3E86', 'Ограничения', 'три правила')]
fps = '\n'.join(f'<div class="fpart {c}"><p class="fnum" style="background:{col};">{i + 1}</p><p class="fname">{n}</p><p class="fex">{e}</p></div>' for i, (c, col, n, e) in enumerate(fp))
S['formula-doc'] = ('', False, f'''{prog(5)}
<div class="stack-lg" style="gap:28px;">
{head("Формула для документа", "Формула урока 1 и три правила")}
<div class="formula-s">
{fps}
</div>
<div class="chat" style="width:1220px;">
<div class="chat-head" style="padding:18px 32px;"><div class="av av-s av-green">{ic("Chart", "ic-s")}</div><p class="chat-name">Промпт П‑2.3 · он же в чате Телемоста</p></div>
<div class="chat-body" style="padding:24px 32px 28px;">
<div class="msg-user" style="width:100%;"><p class="msg-user-text">Ты — {ph("[РОЛЬ]")}. Я загрузил {ph("[ЧТО ЗА ДОКУМЕНТ]")}. Мне нужно {ph("[ЗАДАЧА]")}. Ответ — таблица: {ph("[КОЛОНКИ]")}. <span class="rule-hl">Правила: отвечай только по документу; у каждого вывода — номер пункта или страницы; чего в документе нет — пиши „в документе нет“; цифры не считай, покажи формулу Excel.</span></p></div>
</div>
</div>
</div>
<div class="card card-hot" style="position:absolute; left:1400px; top:128px; width:392px; gap:20px; padding:36px 32px;">
<p class="h3">Три правила</p>
<div class="check">{ic("CheckCircle", "check-ic")}<p class="body-ink" style="font-size:28px;">Только по документу, с номером пункта</p></div>
<div class="check">{ic("CheckCircle", "check-ic")}<p class="body-ink" style="font-size:28px;">Чего нет: «в документе нет»</p></div>
<div class="check">{ic("CheckCircle", "check-ic")}<p class="body-ink" style="font-size:28px;">Цифры считает Excel</p></div>
</div>
{foot("Книжка 2, гл. 2.5 · промпт П‑2.3")}''')

# 25 --------------------------------------------------------------- turn-doc
S['turn-doc'] = (' act', False, f'''{prog(6)}
<div class="stack-lg" style="width:780px;">
<div class="stack">
<p class="chip-solid">Ваш ход · 15 минут</p>
<h2 class="h1">Свой документ</h2>
</div>
<div class="stack" style="gap:20px;">
<div class="install-step"><p class="install-n">1</p><p class="body-ink">7 мин · ваш файл и промпт из чата</p></div>
<div class="install-step"><p class="install-n">2</p><p class="body-ink">4 мин · одно уточнение: что не так и как надо</p></div>
<div class="install-step"><p class="install-n">3</p><p class="body-ink">4 мин · проверка трёх выводов</p></div>
</div>
</div>
<p class="timer" style="position:absolute; left:960px; top:128px;">7:00</p>
<div class="chat" style="position:absolute; left:960px; top:310px; width:832px;">
<div class="chat-body" style="gap:20px;">
{attach("мой-документ.docx", "обезличен")}
<div class="msg-user" style="width:560px;"><p class="msg-user-text">Промпт П‑2.3 с моей ролью</p></div>
<div class="msg-user" style="width:100%;"><p class="msg-user-text">Ты пропустил раздел про оплату. Добавь его и для каждого риска предложи формулировку пункта</p></div>
</div>
</div>
{foot("Книжка 2, гл. 2.6 · промпт П‑2.3")}''')

# 26 --------------------------------------------------------------- check-three
def res(big, txt):
    return f'<div class="opt" style="padding:22px 30px;"><p class="h3" style="color:var(--lesson-700); font-size:44px; width:190px; flex:none;">{big}</p><p class="opt-text" style="font-size:30px;">{txt}</p></div>'


S['check-three'] = (' act', False, f'''{prog(6)}
<div class="stack-lg" style="width:780px;">
<div class="stack">
<p class="chip-solid">Ваш ход · 4 минуты</p>
<h2 class="h1">Проверьте три вывода</h2>
</div>
<div class="stack" style="gap:20px;">
<div class="install-step"><p class="install-n">1</p><p class="body-ink">Выберите три вывода с номерами пунктов</p></div>
<div class="install-step"><p class="install-n">2</p><p class="body-ink">Найдите эти пункты в документе</p></div>
<div class="install-step"><p class="install-n">3</p><p class="body-ink">Итог в чат и одна фраза, что не совпало</p></div>
</div>
</div>
<p class="timer" style="position:absolute; left:960px; top:128px;">4:00</p>
<div class="stack" style="position:absolute; left:960px; top:330px; width:832px; gap:16px;">
{res("3 из 3", "всё совпало")}
{res("2 из 3", "одно не совпало")}
{res("1 из 3", "пора уточнять промпт")}
</div>
{foot("Книжка 2, гл. 2.6")}''')

# 27 --------------------------------------------------------------- s-numbers
S['s-numbers'] = (' sec', False, sec_opener('07', 'Цифры',
                  'больше никогда не принимать итог от ИИ на веру', 7, 'Книжка 2, гл. 2.7'))

# 28 --------------------------------------------------------------- excel-kp
xr = [('2', 'Погрузчик 1,6 т', '1', f'2{N}290{N}000', f'2{N}290{N}000'),
      ('3', 'Зарядное устройство', '1', f'162{N}000', f'162{N}000'),
      ('4', 'Доставка', '1', f'28{N}400', f'28{N}400'),
      ('5', 'Пусконаладка', '1', 'включено', 'включено'),
      ('6', 'Обучение операторов', '2', f'9{N}000', f'18{N}000')]
xrows = '\n'.join(f'<tr><td class="rn">{r}</td><td>{a}</td><td class="num">{b}</td><td class="num{" muted" if c == "включено" else ""}">{c}</td><td class="num{" muted" if d == "включено" else ""}">{d}</td></tr>' for r, a, b, c, d in xr)
S['excel-kp'] = ('', False, f'''{prog(7)}
<div class="stack-lg" style="gap:36px;">
{head("Пересчёт в Excel · промпт П‑2.4", f"Пересчитываю КП{N}Г в Excel")}
<div class="stack" style="gap:0; width:1140px;">
<div class="xl-bar"><p class="xl-fx">fx</p><p class="xl-formula">=СУММ(D2:D6)</p></div>
<table class="xl" style="width:1140px;">
<tr><th style="width:56px;"></th><th style="text-align:left;">A</th><th>B</th><th>C</th><th>D</th></tr>
<tr><td class="rn">1</td><td class="hd">Наименование</td><td class="hd num">Кол‑во</td><td class="hd num">Цена</td><td class="hd num">Сумма</td></tr>
{xrows}
<tr><td class="rn">7</td><td class="hd">Итого</td><td></td><td></td><td class="num sel">2{N}498{N}400</td></tr>
</table>
</div>
{note("Chat", "В чат: вы бы заметили ошибку без пересчёта?")}
</div>
<div class="stack" style="position:absolute; left:1340px; top:300px; width:452px; gap:20px;">
<div class="card accent" style="padding:30px 36px; gap:8px;"><p class="label">EXCEL</p><p class="big-num">2{N}498{N}400</p></div>
<div class="card card-muted" style="padding:30px 36px; gap:8px;"><p class="label">В КП · НА 18{N}400 МЕНЬШЕ</p><p class="big-num" style="color:var(--soft);"><span class="strike">2{N}480{N}000</span></p></div>
</div>
{foot("Книжка 2, гл. 2.7 · промпт П‑2.4")}''')

# 29 --------------------------------------------------------------- ai-excel
S['ai-excel'] = ('', False, f'''{prog(7)}
<div class="stack-lg">
{head("Два приёма для любых цифр", "ИИ переносит, Excel считает")}
<div class="row" style="align-items:stretch; width:1664px; gap:28px;">
<div class="card" style="flex:1; gap:20px;">
<p class="label-l">ПРИЁМ 1 · ПЕРЕНОС</p>
<div class="msg-user" style="width:100%;"><p class="msg-user-text">Перенеси строки в таблицу. Итог не считай</p></div>
<p class="body">Копируете в Excel и считаете СУММ, как с КП{N}Г</p>
</div>
<div class="card card-hot" style="flex:1; gap:20px;">
<p class="label-l">ПРИЁМ 2 · ФОРМУЛА</p>
<div class="msg-user" style="width:100%;"><p class="msg-user-text">Напиши формулу Excel для итога с НДС: цены в столбце C, количество в D</p></div>
<p class="quote mono">=СУММПРОИЗВ(C2:C6;D2:D6)*1,22</p>
</div>
</div>
{note("Warning", "ИИ посчитал сам? Сверьте с Excel. Не совпало, верьте Excel")}
</div>
{foot("Книжка 2, гл. 2.7")}''')

# 30 --------------------------------------------------------------- roles
rl = [('Аналитик', 'ТЗ, протоколы', 'противоречия и открытые вопросы'),
      ('Закупщик', 'КП, договоры', 'сравнение и вопросы поставщикам'),
      ('Юрист', 'договоры', 'первый проход по рискам'),
      ('Сметчик', 'сметы, ведомости', 'структуру и итоги для Excel'),
      ('Менеджер', 'регламенты, отчёты', 'выжимку и сроки')]
rrows = '\n'.join(f'<tr><td class="tbl-role">{a}</td><td>{b}</td><td class="tbl-ai">{c}</td></tr>' for a, b, c in rl)
S['roles'] = ('', False, f'''{prog(8)}
<div class="stack-lg">
{head("Шпаргалка по ролям", "Что это значит для вашей роли")}
<div class="tbl-card">
<table class="tbl">
<tr><th style="width:22%; text-align:left;">Роль</th><th style="width:32%; text-align:left;">Документ</th><th class="tbl-ai-h" style="width:46%; text-align:left;">Что просить</th></tr>
{rrows}
</table>
</div>
</div>
<div class="card accent" style="position:absolute; left:1470px; top:300px; width:322px;">
<p class="h3">Ваш ход</p>
<p class="body-ink">Какой документ попробуете на этой неделе? Ответ в чат</p>
</div>
{foot("Книжка 2, гл. 2.8 · карточки по ролям")}''')

# 31 --------------------------------------------------------------- homework
S['homework'] = ('', False, f'''{prog(done_all=True)}
<div class="stack-lg">
<div class="stack">
<div class="row" style="gap:16px;"><p class="chip">Домашнее задание</p><p class="chip-ink">≈ 45 минут</p><p class="chip-ink">только DeepSeek</p></div>
<h2 class="h2">Два задания до урока 3</h2>
</div>
<div class="row" style="align-items:stretch; width:1664px; gap:28px;">
<div class="card" style="flex:1;">
{chip_ic("Book", "k-green")}
<p class="chip-solid">Задание 1 · документ</p>
<p class="body">Договор, ТЗ, регламент или протокол → таблица со ссылками на пункты. Два уточнения</p>
</div>
<div class="card" style="flex:1;">
{chip_ic("Chart", "k-orange")}
<p class="chip-solid">Задание 2 · цифры</p>
<p class="body">КП, смета или отчёт → сравнение или итог. Пересчёт в Excel: сошлось?</p>
</div>
<div class="card accent" style="flex:1; gap:14px;">
<p class="h3">В каждом задании</p>
{check("Документ обезличен")}
{check("Три вывода сверены по пунктам")}
{check("Замер: без ИИ и с ИИ")}
</div>
</div>
{note("PaperPlane", "Сдать в Яндекс Форму до [ДАТА]. Отзыв пришлю каждому")}
</div>
{foot("Книжка 2, «Домашнее задание 2»")}''')

# 32 --------------------------------------------------------------- summary
S['summary'] = ('', False, f'''<div class="hero-av" style="left:1500px; top:180px; width:300px; height:300px; background:var(--lesson); box-shadow:0 40px 90px var(--glow-30);">{ic("Chart", "hero-av-ic")}</div>
<div class="hero-spark" style="left:1726px; top:190px;"></div>
<div class="stack-lg">
{head("Итоги урока", "Что вы теперь умеете")}
<div class="sumlist">
{sum_row("CheckCircle", "k-green", "Загрузить документ и получить из него таблицу")}
{sum_row("CheckCircle", "k-blue", "Требовать номер пункта у каждого вывода")}
{sum_row("CheckCircle", "k-violet", "Ловить пробелы: «в документе нет»")}
{sum_row("CheckCircle", "k-orange", "Пересчитывать цифры в Excel")}
{sum_row("CheckCircle", "k-pink", "Понимать, какие файлы ИИ читает хуже")}
</div>
</div>
{foot("Книжка 2, шпаргалка на одну страницу")}''')

# 33 --------------------------------------------------------------- next
S['next'] = ('', True, f'''<div class="stack" style="width:900px; padding-top:120px;">
<p class="chip-ink">Следующий урок</p>
<h2 class="h1">Свой помощник</h2>
<p class="lead">Нанимаем Редактора и собираем помощника под вашу роль</p>
<p class="body-ink" style="padding-top:24px;">Оцените урок от 1 до 5 в чат, а потом ваши вопросы</p>
</div>
<div class="badge" style="position:absolute; left:1290px; top:120px; --lesson: #FF7A1A; --lesson-50: #FFE9D8; --lesson-600: #B84E08; --lesson-700: #A3460A;">
<div class="badge-top" style="background:#FF7A1A;"><p class="badge-top-text">ПРОПУСК</p><p class="badge-top-text">№ 03</p></div>
<div class="badge-body">
<div class="av av-xl av-orange">{ic("Verified", "ic-xl")}</div>
<p class="badge-name">Редактор</p>
<p class="badge-role">Доводит результат до качества, который не стыдно отдать</p>
<div class="badge-line"></div>
<div class="spread"><p class="badge-k">Будет принят</p><p class="badge-v">урок 3</p></div>
<div class="spread"><p class="badge-k">Где работает</p><p class="badge-v">чат + помощник</p></div>
</div>
</div>
{foot("Запись и книжку пришлю сегодня вечером в чат курса")}''')

ORDER = ['cover', 'roster', 'agenda', 's-hw', 'hw-numbers', 'hw-works', 'hw-errors', 'demo-contract', 'contract-result',
         'demo-kp', 'kp-traps', 's-files', 'file-types', 'lost', 'long-doc', 'poll-files', 's-rules', 'rule-1', 'rule-2',
         'rule-3', 'traffic-docs', 'break', 's-formula', 'formula-doc', 'turn-doc', 'check-three', 's-numbers', 'excel-kp',
         'ai-excel', 'roles', 'homework', 'summary', 'next']
assert len(ORDER) == 33 and set(ORDER) == set(S), set(S) ^ set(ORDER)

for sid in ORDER:
    cls, fade, body = S[sid]
    p = os.path.join(SL, sid + '.html')
    aside = '<aside></aside>'
    if os.path.exists(p):  # keep synced notes and decor across rebuilds
        old = open(p, encoding='utf8').read()
        import re
        m = re.search(r'<aside>[\s\S]*?</aside>', old)
        aside = m.group(0) if m else aside
    tr = ' data-transition="fade"' if fade else ''
    open(p, 'w', encoding='utf8').write(f'<section id="{sid}" class="l2{cls}"{tr}>\n{body}\n{aside}\n</section>\n')

deck = {
    "v": 5,
    "createdOnFiles": {"v": 1, "at": "2026-11-14T12:00:00Z"},
    "lists": "css",
    "format": {"v": 1, "shared": ["project/deck.css"]},
    "title": "Урок 2. ИИ на моей работе",
    "order": ORDER,
    "sections": {
        "a": {"description": "Старт: пропуск Аналитика, команда, план", "start": "cover"},
        "b": {"description": "Блок 1. Разбор ДЗ 1: цифры группы, две работы, три ошибки", "start": "s-hw"},
        "c": {"description": "Блок 2. Два показа: договор поставки и три КП", "start": "demo-contract"},
        "d": {"description": "Блок 3. Как ИИ читает файлы", "start": "s-files"},
        "e": {"description": "Блок 4. Три правила Аналитика, светофор для документов и перерыв", "start": "s-rules"},
        "f": {"description": "Блок 5. Формула для документа", "start": "s-formula"},
        "g": {"description": "Блок 6. Ваш ход: свой документ и проверка трёх выводов", "start": "turn-doc"},
        "h": {"description": "Блок 7. Цифры: пересчёт в Excel", "start": "s-numbers"},
        "i": {"description": "Блок 8. Шпаргалка по ролям", "start": "roles"},
        "j": {"description": "Домашнее задание, итоги и анонс урока 3", "start": "homework"},
    },
    "faces": {
        "manrope": {"family": "Manrope", "href": "https://fonts.googleapis.com/css2?family=Manrope:wght@500..800&display=swap"},
        "golos-text": {"family": "Golos Text", "href": "https://fonts.googleapis.com/css2?family=Golos+Text:wght@400..700&display=swap"},
        "jetbrains-mono": {"family": "JetBrains Mono", "href": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400..600&display=swap"},
    },
    "designSystems": [],
}
open(os.path.join(ROOT, 'project', 'deck.json'), 'w', encoding='utf8').write(json.dumps(deck, ensure_ascii=False, indent=2))
print('built', len(ORDER), 'slides')
