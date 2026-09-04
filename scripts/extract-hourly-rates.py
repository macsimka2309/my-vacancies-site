# -*- coding: utf-8 -*-
"""Сопоставление часовых ставок из Google-таблицы с вакансиями сайта.

Ключ сопоставления — тройка (проект, город, тип вакансии). Города в таблице
есть, но одного города мало: в Великом Новгороде у Самоката и «Электровело»
со ставкой 125, и «сборщик» с 70 — по городу они склеиваются в одно число.

Запуск из каталога, где лежат выгрузки листов и список вакансий:

    curl -sL "https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=<gid>" -o s-<лист>.csv
    psql -At -c "select slug||'|'||project||'|'||title||'|'||city||'|'||coalesce(salary,'') from vacancies" > vacancies.txt
    python3 extract-hourly-rates.py -v   # -v печатает разбор и пишет rates.csv

Что в таблице ставкой **не является** — «60 позиций в час» (норма выработки),
«Доход в час 591,67» у Магнита (это доход за день ÷ 12 часов), «за ночной час»
и «+15 р/час в выходные» (надбавки). См. docs/conversion-backlog.md, п. 9.
"""
import csv
import collections
import re
import sys
from datetime import datetime

SHEETS = {
    "s-lenta-kur.csv": ("Лента", "курьер"),
    "s-lenta-piker.csv": ("Лента", "сборщик"),
    "s-magnit-kur.csv": ("Магнит", "курьер"),
    "s-magnit-sbor.csv": ("Магнит", "сборщик"),
    "s-samokat.csv": ("Самокат", "курьер"),
    "s-vahta.csv": ("ВАХТА", "курьер"),
}

# Тип вакансии сайта -> типы в таблице. Заголовок столбца в таблице:
# «ТИП ВАКАНСИИ (авто/вело/пеший/авто компании...)».
TYPES = {
    "Курьер на авто": {"авто", "на авто компании", "на авто  компании", "авто компании"},
    # Название вакансии на сайте — «Курьер на а/м (универсал)» (без
    # жаргона «Ларгус», см. п. 9); ключ словаря должен совпадать с title
    # на сайте, а не с формулировкой таблицы.
    "Курьер на а/м (универсал)": {
        "ларгусы, универсалы(большой богажник)",
        "ларгусы, универсалы(большой багажник) !!!!!!!!!!",
        "авто (ларгус)!!!",
    },
    "Курьер на велосипеде": {"вело"},
    "Курьер на электровелосипеде": {"электровело", "эвело"},
    "Курьер на мото": {"мото", "на мото компании"},
    "Курьер (вело/мото)": {"вело/мото"},
    "Сборщик заказов": {"сборщик", "сборщик ночь"},
    "ВАХТА курьер": {"электровело"},
}

# Только именованные формулировки. Общий шаблон «N в час» ловит выработку:
# в Мурманске «при сборке 60 позиций в час» читалось как ставка 60 руб/час.
GOOD = [
    (r"Тариф\s+в\s+час\s+ДЕНЬ\s*[-–:]?\s*(\d+(?:[.,]\d+)?)", "тариф день"),
    (r"Тариф\s+в\s+час\s+НОЧЬ\s*[-–:]?\s*(\d+(?:[.,]\d+)?)", "тариф ночь"),
    (r"Часова[яй]\s+ставка\s*[-–:]?\s*(\d+(?:[.,]\d+)?)", "часовая ставка"),
    (r"Фикс\.?\s*Часова[яй]\s*[-–:]?\s*(\d+(?:[.,]\d+)?)", "фикс. часовая"),
    (r"Почасова[яю]\s+оплата\s*[-–:]?\s*(\d+(?:[.,]\d+)?)\s*р", "почасовая"),
    (r"оплата\s+за\s+час\s*[-–:]?\s*(\d+(?:[.,]\d+)?)\s*р", "оплата за час"),
    (r"оплата\s+(\d+(?:[.,]\d+)?)\s*р\.?\s*(?:в\s+час|/\s*ч)", "оплата в час"),
    (r"(\d+(?:[.,]\d+)?)\s*руб\.?\s*/\s*час", "N руб/час"),
    (r"Тариф\s+(\d+(?:[.,]\d+)?)\s*час", "тариф Nчас"),
    # Лента пикеры, столбец «Тариф»: строка начинается с «В час 143».
    (r"(?:^|\n)\s*В\s+час\s*[-–:]?\s*(\d+(?:[.,]\d+)?)", "в час N"),
    (r"(\d+(?:[.,]\d+)?)\s*р\.?\s*в\s+час\s*\((?:электро|вел)", "N р в час (тип)"),
    (r"Гарант\s+доход\s+в\s+час\s*[-–:]?\s*(\d+(?:[.,]\d+)?)", "гарант"),
    # Лента, столбец «Тариф»: «час 100р/заказ 153,60р». Отрицательный просмотр
    # назад отсекает «Доход в час — 591,67» у Магнита: это не тариф, а потолок
    # дня, делённый на 12-часовую смену.
    (r"(?<!в\s)(?<![а-яё])час\s*[-–:]?\s*(\d+(?:[.,]\d+)?)\s*р", "час Nр"),
]
GOOD = [(re.compile(p, re.I), name) for p, name in GOOD]
BAD = re.compile(r"(позици|штук|шт\.|заказ|сборк)[^\n]{0,20}в\s+час", re.I)


def norm_city(value):
    value = re.sub(r"\(.*?\)", " ", value)
    value = re.sub(r"\bБФ\b|\bМФ\b", " ", value)
    value = value.replace("ё", "е").replace("Ё", "Е")
    return re.sub(r"[\s ]+", " ", value).strip().lower()


def parse_date(value):
    for fmt in ("%d.%m.%Y", "%d.%m.%y"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            pass
    return datetime.min


def extract(row):
    """Ставки из строки таблицы: (значение, формулировка, из какого столбца)."""
    found = []
    # 7 — «ОПЛАТА ЗА СМЕНУ / ЧАСТОТА ВЫПЛАТ», 8 — «Тариф». Остальные столбцы
    # (описание, требования, бонусы) ставок не несут, но несут выработку.
    for col in (7, 8):
        if len(row) <= col:
            continue
        text = row[col]
        # У Самоката «Тариф» — отдельный столбец с одним числом: «120р».
        bare = re.fullmatch(r"\s*(\d+(?:[.,]\d+)?)\s*р?\.?\s*", text)
        if col == 8 and bare:
            value = float(bare.group(1).replace(",", "."))
            if 0 <= value <= 1000:
                found.append((value, "столбец «Тариф»", col))
            continue
        for pattern, name in GOOD:
            for match in pattern.finditer(text):
                window = text[max(0, match.start() - 60): match.end() + 60]
                if BAD.search(window):
                    continue
                value = float(match.group(1).replace(",", "."))
                # Ноль оставляем: «час 0р» — это ответ «часовой ставки нет»,
                # а не молчание. Без него код уходил к строке 2024 года и
                # выдавал за тариф Москвы «156р» из позапрошлого прайса.
                if 0 <= value <= 1000:
                    found.append((value, name, col))
    return found


# --- таблица -----------------------------------------------------------------
sheet = collections.defaultdict(list)  # (проект, город, тип) -> строки

for filename, (project, _kind) in SHEETS.items():
    rows = list(csv.reader(open(filename, encoding="utf-8")))
    for row in rows[2:]:
        if len(row) < 9:
            continue
        city = norm_city(row[1])
        kind = row[6].strip().lower()
        if not city or not kind:
            continue
        date = parse_date(row[2]) if len(row) > 2 else datetime.min
        sheet[(project, city, kind)].append((date, row))

# --- сайт --------------------------------------------------------------------
site = [line.rstrip("\n").split("|") for line in open("vacancies.txt", encoding="utf-8") if line.strip()]

report = []
for slug, project, title, city, salary in site:  # noqa: B007
    key_project = "ВАХТА" if title.startswith("ВАХТА") else project
    kinds = TYPES.get(title, set())
    rows = []
    for kind in kinds:
        rows += sheet.get((key_project, norm_city(city), kind), [])
    rows.sort(key=lambda item: item[0], reverse=True)

    # Берём **самую свежую** строку, где про час вообще сказано хоть что-то,
    # включая «час 0р». Ноль — это ответ, а не пропуск: если его пролистать,
    # код доедет до прайса 2024 года и выдаст его за сегодняшний тариф.
    rates, date_used = [], None
    for date, row in rows:
        rates = extract(row)
        if rates:
            date_used = date
            break

    values = sorted({value for value, _n, _c in rates if value > 0})
    # В одной строке может стоять несколько тарифов сразу: у Ленты в
    # Санкт-Петербурге это «ГМ СПБ: час 0р … СМ СПБ: час 116р … СМ ЛО: час 92р»
    # — гипермаркет, супермаркет и область. Какой из них у нашей точки,
    # таблица не говорит, а адресов точек у нас нет.
    mixed = bool(values) and any(value == 0 for value, _n, _c in rates)
    if mixed or len(values) > 1:
        values = []
        rates = [(0.0, "неоднозначно", 0)]
    report.append((slug, project, title, city, salary, values, rates, len(rows), date_used))

# --- вывод -------------------------------------------------------------------
# найдено / явный ноль / строка есть, про час молчит / строки нет
by_group = collections.defaultdict(lambda: [0, 0, 0, 0, 0])
for slug, project, title, city, salary, values, rates, nrows, date in report:
    stats = by_group[(project, title)]
    stats[4] += 1
    if values:
        stats[0] += 1
    elif rates:
        stats[1] += 1
    elif nrows:
        stats[2] += 1
    else:
        stats[3] += 1

head = f"{'проект':9} {'вакансия':30} {'ставка':>7} {'час=0':>6} {'молчит':>7} {'нет стр':>8} {'всего':>6}"
print(head)
total = [0, 0, 0, 0, 0]
for (project, title), stats in sorted(by_group.items()):
    print(f"{project:9} {title:30} {stats[0]:7} {stats[1]:6} {stats[2]:7} {stats[3]:8} {stats[4]:6}")
    total = [a + b for a, b in zip(total, stats)]
print(f"{'ИТОГО':40} {total[0]:7} {total[1]:6} {total[2]:7} {total[3]:8} {total[4]:6}")

if "-v" in sys.argv:
    print("\n--- найденные ставки ---")
    for slug, project, title, city, salary, values, rates, nrows, date in report:
        if values:
            names = ", ".join(sorted({n for _v, n, _c in rates}))
            flag = "  ⚠ несколько значений" if len(values) > 1 else ""
            shown = "/".join(f"{v:g}" for v in values)
            print(f"{slug:45} {shown:>12} ₽/ч  {date:%d.%m.%Y}  [{names}]{flag}")
    with open("rates.csv", "w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["slug", "project", "title", "city", "salaryHour", "date", "salary"])
        for slug, project, title, city, salary, values, rates, nrows, date in report:
            if values:
                writer.writerow([slug, project, title, city, f"{values[0]:g}", f"{date:%Y-%m-%d}", salary])
    print("\n→ rates.csv")

    print("\n--- в таблице явно «час 0» ---")
    for slug, project, title, city, salary, values, rates, nrows, date in report:
        if not values and rates:
            print(f"{slug:45} {date:%d.%m.%Y}")
    print("\n--- строка есть, про час молчит ---")
    for slug, project, title, city, salary, values, rates, nrows, date in report:
        if not rates and nrows:
            print(f"{slug:45} строк: {nrows}")
    print("\n--- строки в таблице нет ---")
    for slug, project, title, city, salary, values, rates, nrows, date in report:
        if not nrows:
            print(f"{slug:45} {title} / {city}")
