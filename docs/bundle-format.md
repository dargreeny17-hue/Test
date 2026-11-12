# Формат пакета (bundle) для моста через буфер обмена

Пакет — обычный текст. Служебные строки начинаются с `*@@`. Для ABAP это
комментарий, поэтому случайная вставка пакета в редактор ничего не ломает.

## Импорт: Claude → SAP (`ZCLAUDE_IMPORT`)

```abap
*@@BUNDLE v1
*@@OBJECT PROG ZSD_ORDERS_REPORT TYPE=1 TITLE=Отчёт по заказам
REPORT zsd_orders_report.
INCLUDE zsd_orders_report_top.
INCLUDE zsd_orders_report_f01.
...
*@@TEXTS
I 001 Заказы не найдены
S P_VKORG Сбытовая организация
*@@OBJECT PROG ZSD_ORDERS_REPORT_TOP TYPE=I MAIN=ZSD_ORDERS_REPORT
...
*@@END
```

| Строка | Значение |
|---|---|
| `*@@BUNDLE v1` | начало пакета. Весь текст до этой строки игнорируется |
| `*@@OBJECT PROG <имя> TYPE=<t> [MAIN=<программа>] [TITLE=<заголовок>]` | начало объекта. `TYPE`: `1` — исполняемая программа, `I` — include, `S` — пул подпрограмм, `M` — модульный пул. `MAIN` нужен include-файлу, чтобы проверить синтаксис его главной программы. `TITLE` всегда пишется последним и тянется до конца строки |
| `*@@TEXTS` | текстовые элементы объекта: `I <ключ> <текст>` — текстовый символ, `S <параметр> <текст>` — текст выбора |
| `*@@END` | конец пакета. **Без него импорт отклоняется целиком** (защита от неполной вставки) |

Импорт поддерживает только `PROG`: программы и include-файлы. Классы
пишутся как локальные классы внутри include-файлов. Объекты словаря и
глобальные классы создаёте вы вручную по моей инструкции.

## Результат: SAP → Claude

```
*@@RESULT v1 mode=import system=DEV client=100 basis=750 sp=0012 ...
OK ZSD_ORDERS_REPORT created (42 lines, package $TMP)
SYNTAX ZSD_ORDERS_REPORT ERROR include ZSD_ORDERS_REPORT_F01 line 17 word "LV_X"
  MSG Поле "LV_X" неизвестно...
  SRC     lv_x = 1.
*@@SUMMARY errors=1
*@@END
```

## Выгрузка: SAP → Claude (`ZCLAUDE_EXPORT`)

Программы выгружаются в том же формате, что и импорт: их можно изменить и
загрузить обратно. Остальные объекты только для чтения:

- `*@@CLASS CLAS|INTF <имя>`, затем `*@@PART <класс> PUBLIC|PROTECTED|PRIVATE|METHOD|... <include>`;
- `*@@FUNCTION <ФМ> GROUP=<группа> INCLUDE=<include>`;
- `*@@DDIC TABL <имя> CLASS=... TITLE=...`, затем поля через ` | `;
- `*@@SKIP ...` — объект пропущен (нет полномочий или не найден).
