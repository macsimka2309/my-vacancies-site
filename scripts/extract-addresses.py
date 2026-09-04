# -*- coding: utf-8 -*-
"""Извлечение адресов точек для вакансий Ленты (курьер и сборщик).

Только Лента: у Самоката и Магнита-курьера в столбце «ГЕО» — список из
5-10 точек по городу (курьер обслуживает весь город, а не одну точку),
адрес там ставить нельзя — это будет неправдой. У Магнита-сборщика адреса
чистые, но на сайте нет ни одной вакансии этого типа — девать некуда.

У Ленты один гипермаркет на город (изредка два) — курьер и сборщик
привязаны к конкретной точке, адрес этой точки — правда, а не сочинение.
"""
import csv
import re
import json
from datetime import datetime

SHEETS = {
    "s-lenta-kur.csv": ("Лента", {
        "Курьер на авто": {"авто", "на авто компании", "на авто  компании", "авто компании"},
        # Ключ должен совпадать с title на сайте — «Курьер (большой
        # багажник)», без жаргона таблицы «Ларгус» (см. п. 9).
        "Курьер (большой багажник)": {
            "ларгусы, универсалы(большой богажник)",
            "ларгусы, универсалы(большой багажник) !!!!!!!!!!",
            "авто (ларгус)!!!",
        },
        "Курьер на велосипеде": {"вело"},
        "Курьер на мото": {"мото", "на мото компании"},
        "Курьер (вело/мото)": {"вело/мото"},
    }),
    "s-lenta-piker.csv": ("Лента", {
        "Сборщик заказов": {"сборщик", "сборщик ночь"},
    }),
}

STREET = re.compile(
    r"\b(ул\.?|улиц\w*|просп\w*|пр-?кт|пер\.?|переул\w*|ш(?:оссе)?\.?|"
    r"проезд\w*|бульв\w*|наб\.?|набережн\w*|тракт\w*|пл\.?|площад\w*)\b",
    re.I,
)
# Мусор, который встречается в той же ячейке рядом с адресом и не относится
# к делу: служебные пометки заявки на подбор, не адрес точки.
JUNK = re.compile(
    r"потребность вне таблицы.*|АДРЕС[АЫ]?\s+КРИТИКИ|новые адреса|ОБНОВИТЬ АДРЕСА|"
    r"ФОКУСНЫЕ АДРЕСА:?|размест(ить|ил).*",
    re.I,
)


def norm_city(value):
    value = re.sub(r"\(.*?\)", " ", value)
    value = re.sub(r"\bБФ\b|\bМФ\b", " ", value)
    value = value.replace("ё", "е").replace("Ё", "Е")
    return re.sub(r"[\s ]+", " ", value).strip().lower()


def parse_date(value):
    for fmt in ("%d.%m.%Y", "%d.%m.%y"):
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            pass
    return datetime.min


def clean_address(raw):
    """Адрес одной точки — только если в городе она ровно одна.

    В крупных городах у Ленты по нескольку складов сразу — Москва
    перечисляет четыре («ТК Путилково», «ТК Елино», «ТК Наро-Фоминск»,
    «ТК Красногорск»), это разные концы области. Склеить их в одну строку —
    значит выдать за адрес вакансии то, чем он не является: непонятно, к
    какой точке привязан конкретный курьер. Берём адрес только там, где
    неоднозначности нет.
    """
    text = raw.strip().strip('"')
    lines = [JUNK.sub("", line).strip() for line in text.split("\n")]
    lines = [line for line in lines if line and STREET.search(line)]
    unique = list(dict.fromkeys(lines))

    if len(unique) != 1:
        return None

    return unique[0] if len(unique[0]) <= 280 else None


sheet = {}  # (проект, город, тип) -> [(дата, адрес)]

for filename, (project, types) in SHEETS.items():
    rows = list(csv.reader(open(filename, encoding="utf-8")))
    kind_by_alias = {}
    for title, aliases in types.items():
        for alias in aliases:
            kind_by_alias[alias] = title

    for row in rows[2:]:
        if len(row) < 14:
            continue

        city = norm_city(row[1])
        kind = row[6].strip().lower()
        geo = row[13].strip()

        if not city or kind not in kind_by_alias or not geo:
            continue

        address = clean_address(geo)

        if not address:
            continue

        date = parse_date(row[2]) if len(row) > 2 else datetime.min
        key = (project, city, kind_by_alias[kind])
        sheet.setdefault(key, []).append((date, address))

# --- сайт --------------------------------------------------------------------
site = [line.rstrip("\n").split("|") for line in open("vacancies.txt", encoding="utf-8") if line.strip()]

report = []
for slug, project, title, city, salary in site:
    rows = sheet.get((project, norm_city(city), title), [])
    rows.sort(key=lambda item: item[0], reverse=True)
    address = rows[0][1] if rows else None
    date = rows[0][0] if rows else None
    report.append({"slug": slug, "project": project, "title": title, "city": city,
                    "address": address, "date": date.strftime("%Y-%m-%d") if date else None})

found = [r for r in report if r["address"]]
print(f"адрес найден: {len(found)} из {len(report)}")

by_group = {}
for r in report:
    key = f"{r['project']} · {r['title']}"
    stat = by_group.setdefault(key, [0, 0])
    stat[1] += 1
    if r["address"]:
        stat[0] += 1

for key, (ok, total) in sorted(by_group.items()):
    if total:
        print(f"  {key:35} {ok:3} из {total}")

json.dump(found, open("addresses.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n→ addresses.json")

print("\n--- примеры ---")
for r in found[:10]:
    print(f"  {r['slug']:40} {r['address']}")
