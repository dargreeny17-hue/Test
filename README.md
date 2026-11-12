# ABAP-разработка с Claude

Разработка на ABAP для песочницы клиента. Прямого доступа к SAP нет
(система за двумя RDP), поэтому код передаётся через «мост через буфер
обмена»: две Z-программы, которые переносят исходники одним копированием
в каждую сторону.

```
Claude ──пакет──▶ Ctrl+C/V ──▶ ZCLAUDE_IMPORT (сохранение, проверка синтаксиса)
   ▲                                   │
   └──────── Ctrl+C/V ◀── отчёт ───────┘

ZCLAUDE_EXPORT ──исходники и словарь──▶ Ctrl+C/V ──▶ Claude
```

- **Установка и рабочий цикл:** [`docs/bridge-install.md`](docs/bridge-install.md)
- **Формат пакета:** [`docs/bundle-format.md`](docs/bundle-format.md)
- **Правила проекта для Claude:** [`CLAUDE.md`](CLAUDE.md)
- **Постановка задачи:** [`tasks/TEMPLATE.md`](tasks/TEMPLATE.md)
- **Документация клиента:** `docs/project/`

Статическая проверка кода (без SAP):

```
npx @abaplint/cli abaplint.json
```
