"""Баннер К4 «Порядок действий» для РСЯ, в фирменных цветах.

Концепт К4 из брифа «Картинка, которой верят»: показанный порядок действий как
сигнал доверия. Единственный концепт, не требующий фотосъёмки, согласий людей
и прав на логотипы брендов.

Цвета: синий и зелёный взяты из пикселей public/logo-mark.png,
акцентный зелёный кнопки — токен --accent из app/globals.css.

Запуск:  python3 docs/creatives/gen_k4_brand.py
Результат: k4-brand-1x1.png (1080x1080), k4-brand-16x9.png (1920x1080)
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOGO = HERE.parent.parent / "public" / "logo-mark.png"

BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
BOLD  = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
REG   = "/System/Library/Fonts/Supplemental/Arial.ttf"
MONO  = "/System/Library/Fonts/Menlo.ttc"

NAVY   = (0, 48, 106)     # #00306A — синий логотипа
GREEN  = (33, 160, 56)    # #21A038 — --accent сайта
GRN_LT = (92, 179, 56)    # #5CB338 — зелёный логотипа
BG     = (253, 255, 254)  # --background
MUTE   = (102, 117, 127)  # --muted
BORDER = (223, 233, 227)  # --border
WHITE  = (255, 255, 255)

DESC = "Вакансии курьеров и сборщиков заказов"

# Сроки должны быть правдой: если обзвон не укладывается в час, макет
# работает против нас (см. п. 27 бэклога).
STEPS = [([("Оставили ", 0), ("номер", 1)],           "сегодня"),
         ([("Звонок", 1), (" менеджера", 0)],         "за 1 час"),
         ([("Документы и ", 0), ("первая смена", 1)], "завтра"),
         ([("Выплата", 1), (" на карту", 0)],         "в среду")]


def F(p, s): return ImageFont.truetype(p, s)
def M(s):    return ImageFont.truetype(MONO, s)
def wd(d, t, f): return d.textlength(t, font=f)


def runs(d, x, y, parts, fill):
    for t, f in parts:
        d.text((x, y), t, font=f, fill=fill)
        x += wd(d, t, f)
    return x


def logo(img, x, y, h):
    m = Image.open(LOGO).convert("RGBA")
    m = m.resize((round(m.width * h / m.height), h), Image.LANCZOS)
    img.paste(m, (x, y), m)
    return x + m.width


def wordmark(d, x, y, size):
    fb = F(BLACK, size)
    x = runs(d, x, y, [("Работа", fb)], NAVY)
    runs(d, x, y, [(" Рядом", fb)], GRN_LT)


def draw_steps(d, x0, x1, y0, step_h, fs, fs_time, dot):
    fb, fr, ft = F(BOLD, fs), F(REG, fs), M(fs_time)
    y = y0
    for parts, when in STEPS:
        d.line([x0, y, x1, y], fill=BORDER, width=2)
        cy = y + step_h / 2
        d.rectangle([x0, cy - dot / 2, x0 + dot, cy + dot / 2], fill=GREEN)
        bb = d.textbbox((0, 0), "Нg", font=fb)
        runs(d, x0 + dot + 28, cy - (bb[3] - bb[1]) / 2 - fs * 0.16,
             [(t, fb if b else fr) for t, b in parts], NAVY)
        d.text((x1 - wd(d, when, ft), cy - fs_time * 0.72), when, font=ft, fill=MUTE)
        y += step_h
    d.line([x0, y, x1, y], fill=BORDER, width=2)


def cta(d, x, y, w, h, label, fs, r=16):
    d.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=GREEN)
    f = F(BLACK, fs)
    b = d.textbbox((0, 0), label, font=f)
    d.text((x + (w - wd(d, label, f)) / 2, y + (h - (b[3] - b[1])) / 2 - b[1]),
           label, font=f, fill=WHITE)


def square(path):
    img = Image.new("RGB", (1080, 1080), BG)
    xe = logo(img, 80, 70, 112)
    d = ImageDraw.Draw(img)
    wordmark(d, xe + 26, 104, 44)
    d.text((80, 214), DESC, font=F(BOLD, 34), fill=NAVY)
    draw_steps(d, 80, 1000, 300, 132, 46, 30, 18)
    cta(d, 80, 876, 470, 100, "Перезвоните мне", 40)
    d.text((596, 894), "Без опыта и резюме", font=F(BOLD, 30), fill=NAVY)
    d.text((596, 938), "my-dream-vacancy.ru", font=F(BOLD, 26), fill=MUTE)
    img.save(path)
    print("saved", path)


def wide(path):
    img = Image.new("RGB", (1920, 1080), BG)
    xe = logo(img, 110, 96, 150)
    d = ImageDraw.Draw(img)
    wordmark(d, xe + 32, 140, 56)
    d.text((110, 300), "Вакансии курьеров", font=F(BOLD, 40), fill=NAVY)
    d.text((110, 352), "и сборщиков заказов", font=F(BOLD, 40), fill=NAVY)
    d.text((110, 442), "169 вакансий в 78 городах", font=F(BOLD, 32), fill=MUTE)
    cta(d, 110, 600, 560, 120, "Перезвоните мне", 46, r=18)
    d.text((110, 800), "Без опыта и резюме", font=F(BOLD, 34), fill=NAVY)
    d.text((110, 850), "my-dream-vacancy.ru", font=F(BOLD, 30), fill=MUTE)
    draw_steps(d, 800, 1810, 196, 172, 54, 34, 22)
    img.save(path)
    print("saved", path)


if __name__ == "__main__":
    square(HERE / "k4-brand-1x1.png")
    wide(HERE / "k4-brand-16x9.png")
