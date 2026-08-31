"""Аватар и обложки сообществ в фирменных цветах.

Аватар подходит для Telegram, VK, Одноклассников и Дзена — везде круглый кроп,
поэтому знак centred с запасом по краям.

Обложки свёрстаны с учётом мобильного кропа: у VK на телефоне видно примерно
центральные 1196 px, поэтому весь смысл держится внутри безопасной зоны.

Запуск:  python3 docs/creatives/gen_social_covers.py
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOGO = HERE.parent.parent / "public" / "logo-mark.png"

BLACK = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
BOLD  = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

NAVY   = (0, 48, 106)
GREEN  = (33, 160, 56)
GRN_LT = (92, 179, 56)
BG     = (253, 255, 254)
MUTE   = (102, 117, 127)
BORDER = (223, 233, 227)

def F(p, s): return ImageFont.truetype(p, s)
def wd(d, t, f): return d.textlength(t, font=f)

def logo(img, x, y, h):
    m = Image.open(LOGO).convert("RGBA")
    m = m.resize((round(m.width * h / m.height), h), Image.LANCZOS)
    img.paste(m, (x, y), m)
    return x + m.width

def wordmark(d, x, y, size):
    fb = F(BLACK, size)
    d.text((x, y), "Работа", font=fb, fill=NAVY)
    x += wd(d, "Работа", fb)
    d.text((x, y), " Рядом", font=fb, fill=GRN_LT)

def avatar(path, size=512):
    img = Image.new("RGB", (size, size), BG)
    h = int(size * 0.62)
    m = Image.open(LOGO).convert("RGBA")
    m = m.resize((round(m.width * h / m.height), h), Image.LANCZOS)
    img.paste(m, ((size - m.width) // 2, (size - h) // 2), m)
    img.save(path); print("saved", path)

def cover(path, W, H, safe_l, safe_r, logo_h, mark_size, desc_size, facts_size):
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)
    # зелёная линия снизу — единственный декоративный элемент
    d.rectangle([0, H - 10, W, H], fill=GREEN)

    top = (H - logo_h) // 2
    xe = logo(img, safe_l, top, logo_h)
    d = ImageDraw.Draw(img)
    wordmark(d, xe + int(logo_h * 0.24), top + int(logo_h * 0.14), mark_size)
    d.text((xe + int(logo_h * 0.24), top + int(logo_h * 0.14) + int(mark_size * 1.35)),
           "Вакансии курьеров и сборщиков заказов", font=F(BOLD, desc_size), fill=MUTE)

    facts = ["169 вакансий · 78 городов",
             "Выплаты еженедельно",
             "Без опыта и резюме"]
    fb = F(BOLD, facts_size)
    step = int(facts_size * 1.65)
    y = (H - step * len(facts)) // 2
    for t in facts:
        d.text((safe_r - wd(d, t, fb), y), t, font=fb, fill=NAVY)
        y += step
    img.save(path); print("saved", path)

if __name__ == "__main__":
    avatar(HERE / "social-avatar-512.png")
    # VK: 1590x530, на мобиле видно центральные ~1196 px
    cover(HERE / "vk-cover-1590x530.png", 1590, 530, 210, 1380, 190, 60, 30, 30)
    # Одноклассники: 1340x460
    cover(HERE / "ok-cover-1340x460.png", 1340, 460, 110, 1230, 170, 54, 27, 27)
