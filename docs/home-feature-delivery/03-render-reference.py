"""Fatboy's Study Room · V4 FINAL.

Integrates all decisions:
  - C1: Center painting → Kobe hero poster (user upload)
  - C2: Desk color → deep walnut (separate from floor)
  - C3: Chair widened back to 360 + Fatboy moved up (face+shoulders visible)
  - C4: Floor plants (left pothos + right monstera) in gap behind chair
  - Cabinets land on floor with bases (v3)
  - Three-style cabinets (classic/modern/playful)
  - Collection count: "收藏 N 件" (no upper limit)
  - Strong top-left window light beam
"""
import io
import os
import math
import random
import cairosvg
from PIL import Image, ImageDraw, ImageFont, ImageFilter


# =====================================================
#  Canvas
# =====================================================
W, H = 1600, 1000


# =====================================================
#  Tokens (V4 Final)
# =====================================================
# Wall (60% — warm white)
WALL_TOP        = (250, 246, 239)
WALL_BOT        = (244, 238, 226)

# Floor (wooden)
FLOOR_LIGHT     = (215, 185, 145)
FLOOR_MID       = (190, 155, 115)
FLOOR_DARK      = (155, 120, 80)
FLOOR_GRAIN     = (170, 135, 95)

# Wood (30%)
WOOD_DARK       = (88, 60, 36)
WOOD_MID        = (140, 100, 65)
WOOD_LIGHT      = (190, 150, 105)
WOOD_HIGHLIGHT  = (225, 190, 145)
PIC_RAIL        = (190, 165, 130)
CEILING_TRIM    = (220, 200, 165)

# Modern cabinet
MODERN_FRAME    = (215, 215, 220)
MODERN_FRAME_DK = (175, 175, 185)
MODERN_INNER    = (38, 40, 48)
MODERN_INNER_LT = (52, 55, 65)

# Playful cabinet
PLAY_FRAME      = (220, 180, 150)
PLAY_FRAME_DK   = (175, 135, 100)
PLAY_INNER      = (90, 60, 80)

# Classic cabinet
CLASSIC_FRAME   = (115, 75, 45)
CLASSIC_DARK    = (75, 48, 28)
CLASSIC_INNER   = (58, 38, 25)

# Desk (V4: DEEP walnut — separates from floor)
DESK_TOP        = (139, 90, 43)     # #8B5A2B
DESK_TOP_LT     = (160, 112, 80)    # #A07050
DESK_EDGE       = (62, 38, 20)      # #3E2614
DESK_FRONT      = (92, 57, 32)      # #5C3920
DESK_GRAIN      = (160, 112, 80)

# Chair (premium leather)
CHAIR_LEATHER   = (62, 42, 28)
CHAIR_HIGHLIGHT = (105, 75, 50)
CHAIR_STITCH    = (90, 60, 35)

# Plants
POT_TERRACOTTA  = (180, 95, 65)
POT_DARK        = (140, 65, 40)
POT_SHADOW      = (110, 50, 30)
LEAF_GREEN_LT   = (130, 195, 130)
LEAF_GREEN      = (95, 165, 95)
LEAF_GREEN_DK   = (65, 130, 65)
VINE_GREEN      = (110, 175, 100)

# Accents (10%)
GOLD            = (240, 195, 80)
GOLD_LIGHT      = (255, 225, 130)
GOLD_DARK       = (175, 130, 40)
SILVER          = (210, 215, 225)
SILVER_LT       = (240, 242, 248)
SILVER_DK       = (140, 145, 155)
BRONZE          = (200, 130, 70)
BRONZE_LT       = (225, 165, 105)
BRONZE_DK       = (140, 85, 35)
LOCKED          = (78, 70, 62)
ACCENT_RED      = (210, 90, 80)

INK             = (52, 42, 32)
INK_MUTED       = (135, 115, 90)
PAPER           = (255, 252, 245)
WHITE           = (255, 255, 255)


def load_font(size):
    cjk = [
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
    ]
    for p in cjk:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def text_size(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0], bbox[3] - bbox[1]


def rounded(draw, xy, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


# =====================================================
#  Layout constants
# =====================================================
FLOOR_LINE_Y = 690
CAB_TOP_Y    = 380
CAB_BASE_Y   = 685
CAB_H        = CAB_BASE_Y - CAB_TOP_Y  # 305

CAB_L_X, CAB_L_W = 80, 375
CAB_M_X, CAB_M_W = 575, 450
CAB_R_X, CAB_R_W = 1145, 375

DESK_TOP_Y   = 870

# Fatboy
FB_SIZE      = 260
FB_Y         = 600   # MOVED UP from 690 → 600 to show face+shoulders


# =====================================================
#  Init canvas + wall
# =====================================================
canvas = Image.new('RGB', (W, H), WALL_TOP)
draw = ImageDraw.Draw(canvas)

# Wall gradient
for y in range(FLOOR_LINE_Y):
    t = y / FLOOR_LINE_Y
    r = int(WALL_TOP[0] + (WALL_BOT[0] - WALL_TOP[0]) * t)
    g = int(WALL_TOP[1] + (WALL_BOT[1] - WALL_TOP[1]) * t)
    b = int(WALL_TOP[2] + (WALL_BOT[2] - WALL_TOP[2]) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Wall texture
random.seed(7)
tex_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
td = ImageDraw.Draw(tex_layer)
for _ in range(800):
    x = random.randint(0, W)
    y = random.randint(0, FLOOR_LINE_Y - 10)
    alpha = random.randint(8, 25)
    td.ellipse([x, y, x + 1, y + 1], fill=(180, 150, 100, alpha))
canvas.paste(tex_layer, (0, 0), tex_layer)


# =====================================================
#  Top-left window light beam (cinematic)
# =====================================================
beam_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
bd = ImageDraw.Draw(beam_layer)
beam_pts = [
    (-100, 0), (550, 0),
    (350, FLOOR_LINE_Y + 100), (-300, FLOOR_LINE_Y + 100),
]
bd.polygon(beam_pts, fill=(255, 235, 175, 50))
beam_pts_inner = [
    (-50, 0), (380, 0),
    (250, FLOOR_LINE_Y + 100), (-200, FLOOR_LINE_Y + 100),
]
bd.polygon(beam_pts_inner, fill=(255, 240, 195, 45))
beam_pts_core = [
    (50, 0), (250, 0),
    (160, FLOOR_LINE_Y + 100), (-30, FLOOR_LINE_Y + 100),
]
bd.polygon(beam_pts_core, fill=(255, 245, 210, 35))
beam_layer = beam_layer.filter(ImageFilter.GaussianBlur(25))
canvas.paste(beam_layer, (0, 0), beam_layer)


# Overhead ambient glow
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([200, -400, W - 200, 400], fill=(255, 215, 155, 50))
glow = glow.filter(ImageFilter.GaussianBlur(120))
canvas.paste(glow, (0, 0), glow)


# Ceiling trim
draw.rectangle([0, 60, W, 64], fill=CEILING_TRIM)
draw.rectangle([0, 66, W, 68], fill=(190, 165, 130))


# Picture rail
PIC_RAIL_Y = 165
draw.rectangle([0, PIC_RAIL_Y, W, PIC_RAIL_Y + 5], fill=PIC_RAIL)
draw.rectangle([0, PIC_RAIL_Y + 5, W, PIC_RAIL_Y + 7], fill=WOOD_LIGHT)


# =====================================================
#  Floor
# =====================================================
for y in range(FLOOR_LINE_Y, H):
    t = (y - FLOOR_LINE_Y) / (H - FLOOR_LINE_Y)
    r = int(FLOOR_LIGHT[0] + (FLOOR_DARK[0] - FLOOR_LIGHT[0]) * t)
    g = int(FLOOR_LIGHT[1] + (FLOOR_DARK[1] - FLOOR_LIGHT[1]) * t)
    b = int(FLOOR_LIGHT[2] + (FLOOR_DARK[2] - FLOOR_LIGHT[2]) * t)
    draw.line([(0, y), (W, y)], fill=(r, g, b))

# Floor-wall transition
draw.rectangle([0, FLOOR_LINE_Y - 4, W, FLOOR_LINE_Y], fill=(180, 145, 100))
draw.rectangle([0, FLOOR_LINE_Y, W, FLOOR_LINE_Y + 2], fill=(155, 115, 75))

# Plank horizontal lines
plank_ys = [FLOOR_LINE_Y + 30, FLOOR_LINE_Y + 70, FLOOR_LINE_Y + 115,
            FLOOR_LINE_Y + 170, FLOOR_LINE_Y + 240]
for py in plank_ys:
    if py < H:
        draw.line([(0, py), (W, py)], fill=FLOOR_GRAIN, width=1)
        draw.line([(0, py + 1), (W, py + 1)], fill=(155, 120, 80), width=1)

# Plank vertical seams
seam_data = [
    (FLOOR_LINE_Y, FLOOR_LINE_Y + 30, [200, 480, 720, 1050, 1320]),
    (FLOOR_LINE_Y + 30, FLOOR_LINE_Y + 70, [80, 380, 620, 900, 1180, 1470]),
    (FLOOR_LINE_Y + 70, FLOOR_LINE_Y + 115, [250, 550, 850, 1100, 1400]),
    (FLOOR_LINE_Y + 115, FLOOR_LINE_Y + 170, [120, 420, 700, 980, 1280, 1500]),
    (FLOOR_LINE_Y + 170, FLOOR_LINE_Y + 240, [300, 600, 900, 1200, 1450]),
    (FLOOR_LINE_Y + 240, H, [180, 480, 760, 1080, 1350]),
]
for y1, y2, xs in seam_data:
    for sx in xs:
        if y2 > H:
            y2 = H
        draw.line([(sx, y1), (sx, y2)], fill=(140, 105, 70), width=1)


# =====================================================
#  Top nav
# =====================================================
nav_bar = Image.new('RGBA', (W, 60), (255, 252, 245, 220))
canvas.paste(nav_bar, (0, 0), nav_bar)

font_nav = load_font(20)
font_title = load_font(26)

draw.text((30, 20), '← 退出', font=font_nav, fill=INK)
title = '肥仔的书房'
tw, _ = text_size(draw, title, font_title)
draw.text(((W - tw) // 2, 16), title, font=font_title, fill=INK)
# Settings (drawn gear)
gear_x, gear_y = W - 70, 30
for ang in range(0, 360, 45):
    rad = math.radians(ang)
    x1 = gear_x + int(math.cos(rad) * 6)
    y1 = gear_y + int(math.sin(rad) * 6)
    x2 = gear_x + int(math.cos(rad) * 11)
    y2 = gear_y + int(math.sin(rad) * 11)
    draw.line([(x1, y1), (x2, y2)], fill=INK_MUTED, width=4)
draw.ellipse([gear_x - 7, gear_y - 7, gear_x + 7, gear_y + 7],
              fill=INK_MUTED, outline=INK, width=1)
draw.ellipse([gear_x - 2, gear_y - 2, gear_x + 2, gear_y + 2], fill=WALL_TOP)


# =====================================================
#  PAINTINGS
# =====================================================
PAINT_Y = 200
PAINT_H = 130


def draw_picture_hanger(cx, cy):
    draw.line([(cx - 30, PIC_RAIL_Y + 7), (cx, cy)], fill=WOOD_DARK, width=1)
    draw.line([(cx + 30, PIC_RAIL_Y + 7), (cx, cy)], fill=WOOD_DARK, width=1)


def draw_painting_frame(cx, cy, w, h):
    """Draw the wooden frame around a painting (3-layer)."""
    draw_picture_hanger(cx + w // 2, cy)
    draw.rectangle([cx - 10, cy - 10, cx + w + 10, cy + h + 10], fill=WOOD_DARK)
    draw.rectangle([cx - 6, cy - 6, cx + w + 6, cy + h + 6], fill=WOOD_MID)
    draw.rectangle([cx - 3, cy - 3, cx + w + 3, cy + h + 3], fill=WOOD_LIGHT)


def draw_painting_svg(cx, cy, w, h, kind):
    """Left and right paintings drawn as SVG content."""
    draw_painting_frame(cx, cy, w, h)
    draw.rectangle([cx, cy, cx + w, cy + h], fill=PAPER)
    draw.rectangle([cx + 6, cy + 6, cx + w - 6, cy + h - 6], fill=(248, 240, 220))

    inner_x, inner_y = cx + 6, cy + 6
    inner_w, inner_h = w - 12, h - 12

    if kind == 'trophy':
        for y in range(inner_y, inner_y + inner_h):
            t = (y - inner_y) / inner_h
            r_c = int(252 - 20 * t)
            g_c = int(238 - 30 * t)
            b_c = int(200 - 25 * t)
            draw.line([(inner_x, y), (inner_x + inner_w, y)], fill=(r_c, g_c, b_c))
        wr_cx = inner_x + inner_w // 2
        wr_cy = inner_y + inner_h // 2 + 4
        for side in [-1, 1]:
            for i in range(7):
                ang = math.radians(180 - 20 * i if side < 0 else 0 + 20 * i)
                lx = wr_cx + int(math.cos(ang) * 32)
                ly = wr_cy + int(math.sin(ang) * 28)
                draw.ellipse([lx - 8, ly - 3, lx + 8, ly + 3],
                              fill=(85, 130, 80))
        pts = []
        for i in range(10):
            ang = math.radians(-90 + 36 * i)
            r = 14 if i % 2 == 0 else 6
            pts.append((wr_cx + r * math.cos(ang), wr_cy + r * math.sin(ang)))
        draw.polygon(pts, fill=GOLD, outline=GOLD_DARK)

    elif kind == 'toy':
        for y in range(inner_y, inner_y + inner_h):
            t = (y - inner_y) / inner_h
            r_c = int(35 + 50 * t)
            g_c = int(45 + 60 * t)
            b_c = int(90 + 60 * t)
            draw.line([(inner_x, y), (inner_x + inner_w, y)], fill=(r_c, g_c, b_c))
        rnd = random.Random(42)
        for _ in range(18):
            sx = inner_x + rnd.randint(5, inner_w - 5)
            sy = inner_y + rnd.randint(5, inner_h - 5)
            sr = rnd.choice([1, 1, 2, 2])
            draw.ellipse([sx - sr, sy - sr, sx + sr, sy + sr], fill=WHITE)
        draw.ellipse([inner_x + 22, inner_y + 22, inner_x + 52, inner_y + 52],
                      fill=(255, 230, 200))
        draw.ellipse([inner_x + 30, inner_y + 20, inner_x + 58, inner_y + 50],
                      fill=(35, 45, 90))
        rx = inner_x + inner_w // 2 + 25
        ry = inner_y + inner_h // 2 + 5
        draw.polygon([(rx, ry - 28), (rx + 10, ry - 16),
                      (rx + 10, ry + 16), (rx - 10, ry + 16),
                      (rx - 10, ry - 16)], fill=(235, 235, 245))
        draw.polygon([(rx, ry - 28), (rx + 10, ry - 12), (rx - 10, ry - 12)],
                      fill=ACCENT_RED)
        draw.ellipse([rx - 5, ry - 8, rx + 5, ry + 2],
                      fill=(100, 170, 220), outline=(50, 90, 140), width=1)
        draw.polygon([(rx - 10, ry + 16), (rx - 16, ry + 24), (rx - 10, ry + 24)],
                      fill=ACCENT_RED)
        draw.polygon([(rx + 10, ry + 16), (rx + 16, ry + 24), (rx + 10, ry + 24)],
                      fill=ACCENT_RED)
        draw.polygon([(rx - 6, ry + 24), (rx + 6, ry + 24), (rx, ry + 38)],
                      fill=(255, 200, 90))


def draw_painting_image(cx, cy, w, h, image_path):
    """Center painting: load user-provided image and fit into frame."""
    draw_painting_frame(cx, cy, w, h)
    # Paper mat (small margin)
    draw.rectangle([cx, cy, cx + w, cy + h], fill=PAPER)

    inner_x, inner_y = cx + 4, cy + 4
    inner_w, inner_h = w - 8, h - 8

    if os.path.exists(image_path):
        img = Image.open(image_path).convert('RGB')
        # Fit (cover) — crop to fill the frame
        img_ratio = img.width / img.height
        target_ratio = inner_w / inner_h
        if img_ratio > target_ratio:
            # image wider — crop sides
            new_w = int(img.height * target_ratio)
            left = (img.width - new_w) // 2
            img = img.crop((left, 0, left + new_w, img.height))
        else:
            # image taller — crop top/bottom
            new_h = int(img.width / target_ratio)
            top = (img.height - new_h) // 2
            img = img.crop((0, top, img.width, top + new_h))
        img = img.resize((inner_w, inner_h), Image.LANCZOS)
        # Add warm overlay (5%)
        warm = Image.new('RGB', img.size, (255, 230, 180))
        img = Image.blend(img, warm, 0.05)
        canvas.paste(img, (inner_x, inner_y))


# Painting positions
P1_W = 210
P1_X = CAB_L_X + (CAB_L_W - P1_W) // 2
P2_W = 260
P2_X = CAB_M_X + (CAB_M_W - P2_W) // 2
P3_W = 210
P3_X = CAB_R_X + (CAB_R_W - P3_W) // 2

# Draw paintings
draw_painting_svg(P1_X, PAINT_Y, P1_W, PAINT_H, 'trophy')

# Center painting → user image (Kobe poster)
KOBE_IMG_PATH = '/mnt/user-data/uploads/1778721289384_image.png'
draw_painting_image(P2_X, PAINT_Y, P2_W, PAINT_H, KOBE_IMG_PATH)

draw_painting_svg(P3_X, PAINT_Y, P3_W, PAINT_H, 'toy')


# =====================================================
#  Cabinet floor shadows
# =====================================================
def draw_cabinet_floor_shadow(x, y_base, w):
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([x - 20, y_base, x + w + 20, y_base + 40], fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(10))
    canvas.paste(sh, (0, 0), sh)


draw_cabinet_floor_shadow(CAB_L_X, CAB_BASE_Y - 5, CAB_L_W)
draw_cabinet_floor_shadow(CAB_M_X, CAB_BASE_Y - 5, CAB_M_W)
draw_cabinet_floor_shadow(CAB_R_X, CAB_BASE_Y - 5, CAB_R_W)


# =====================================================
#  Trophy item
# =====================================================
def draw_trophy_item(cx, cy, kind, size=20):
    if kind == 'locked':
        draw.polygon([(cx - size + 4, cy - size + 10), (cx + size - 4, cy - size + 10),
                      (cx + size - 7, cy + size - 10), (cx - size + 7, cy + size - 10)],
                      fill=LOCKED)
        draw.rounded_rectangle([cx - 7, cy + size - 10, cx + 7, cy + size - 4],
                                radius=1, fill=LOCKED)
        font_q = load_font(12)
        tw, _ = text_size(draw, '?', font_q)
        draw.text((cx - tw // 2, cy - 7), '?', font=font_q, fill=(35, 28, 22))
        return
    if kind == 'gold':
        m, l, d = GOLD, GOLD_LIGHT, GOLD_DARK
    elif kind == 'silver':
        m, l, d = SILVER, SILVER_LT, SILVER_DK
    else:
        m, l, d = BRONZE, BRONZE_LT, BRONZE_DK
    draw.rounded_rectangle([cx - size + 4, cy + size - 6, cx + size - 4, cy + size],
                            radius=1, fill=d)
    draw.polygon([(cx - size + 4, cy - size + 10), (cx + size - 4, cy - size + 10),
                  (cx + size - 8, cy + size - 6), (cx - size + 8, cy + size - 6)],
                  fill=m)
    draw.polygon([(cx - size + 7, cy - size + 12), (cx - size + 11, cy - size + 12),
                  (cx - size + 13, cy + size - 8), (cx - size + 9, cy + size - 8)],
                  fill=l)
    draw.ellipse([cx - size + 2, cy - size + 6, cx + size - 2, cy - size + 14],
                  fill=m, outline=d, width=1)
    draw.ellipse([cx - size + 5, cy - size + 9, cx + size - 5, cy - size + 12],
                  fill=l)
    draw.arc([cx - size - 3, cy - size + 10, cx - size + 8, cy + 4], 90, 270,
              fill=m, width=2)
    draw.arc([cx + size - 8, cy - size + 10, cx + size + 3, cy + 4], 270, 90,
              fill=m, width=2)
    pts = []
    for i in range(10):
        ang = math.radians(-90 + 36 * i)
        r = 4 if i % 2 == 0 else 2
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    draw.polygon(pts, fill=l, outline=d)


def draw_lego_box(cx, cy, kind, code):
    bw, bh = 75, 55
    if kind == 'locked':
        rounded(draw, [cx - bw // 2, cy - bh // 2, cx + bw // 2, cy + bh // 2],
                radius=3, fill=(28, 28, 36), outline=(70, 70, 78), width=1)
        font_q = load_font(18)
        tw, _ = text_size(draw, '?', font_q)
        draw.text((cx - tw // 2, cy - 12), '?', font=font_q, fill=(80, 80, 90))
        return
    colors = {'car': (210, 50, 50), 'castle': (150, 110, 80),
              'train': (60, 130, 200), 'rover': (220, 95, 35)}
    bg = colors.get(kind, (100, 100, 100))
    rounded(draw, [cx - bw // 2 + 2, cy - bh // 2 + 2, cx + bw // 2 + 2, cy + bh // 2 + 2],
            radius=3, fill=tuple(int(c * 0.55) for c in bg))
    rounded(draw, [cx - bw // 2, cy - bh // 2, cx + bw // 2, cy + bh // 2],
            radius=3, fill=bg)
    rounded(draw, [cx - bw // 2 + 4, cy - bh // 2 + 4,
                   cx + bw // 2 - 4, cy - bh // 2 + 14],
            radius=2, fill=tuple(min(int(c * 1.3), 255) for c in bg))
    rounded(draw, [cx - 16, cy - bh // 2 + 4, cx + 16, cy - bh // 2 + 12],
            radius=2, fill=(255, 220, 0), outline=(40, 40, 40), width=1)
    font_logo = load_font(7)
    lw, _ = text_size(draw, 'LEGO', font_logo)
    draw.text((cx - lw // 2, cy - bh // 2 + 5), 'LEGO',
               font=font_logo, fill=(40, 40, 40))
    if kind == 'car':
        cx2, cy2 = cx, cy + 5
        draw.rounded_rectangle([cx2 - 22, cy2 - 4, cx2 + 22, cy2 + 8],
                                radius=2, fill=(40, 40, 40))
        draw.rounded_rectangle([cx2 - 14, cy2 - 10, cx2 + 14, cy2 - 2],
                                radius=2, fill=(40, 40, 40))
        draw.ellipse([cx2 - 20, cy2 + 4, cx2 - 10, cy2 + 14], fill=(20, 20, 20))
        draw.ellipse([cx2 + 10, cy2 + 4, cx2 + 20, cy2 + 14], fill=(20, 20, 20))
    elif kind == 'castle':
        cy2 = cy + 5
        draw.rectangle([cx - 22, cy2 - 4, cx + 22, cy2 + 10], fill=(85, 65, 105))
        draw.rectangle([cx - 22, cy2 - 14, cx - 10, cy2 + 10], fill=(85, 65, 105))
        draw.rectangle([cx + 10, cy2 - 14, cx + 22, cy2 + 10], fill=(85, 65, 105))
        draw.polygon([(cx - 22, cy2 - 14), (cx - 10, cy2 - 14), (cx - 16, cy2 - 20)],
                      fill=(120, 90, 120))
        draw.polygon([(cx + 10, cy2 - 14), (cx + 22, cy2 - 14), (cx + 16, cy2 - 20)],
                      fill=(120, 90, 120))
    elif kind == 'train':
        cy2 = cy + 5
        draw.rounded_rectangle([cx - 24, cy2 - 6, cx + 18, cy2 + 6],
                                radius=2, fill=(70, 100, 140))
        draw.rectangle([cx - 10, cy2 - 14, cx + 16, cy2 - 4], fill=(70, 100, 140))
        draw.ellipse([cx - 22, cy2 + 6, cx - 12, cy2 + 16], fill=(30, 30, 30))
        draw.ellipse([cx + 8, cy2 + 6, cx + 18, cy2 + 16], fill=(30, 30, 30))
    elif kind == 'rover':
        cy2 = cy + 5
        draw.rounded_rectangle([cx - 20, cy2 - 6, cx + 20, cy2 + 4],
                                radius=2, fill=(190, 190, 195))
        draw.rectangle([cx - 5, cy2 - 14, cx + 5, cy2 - 6], fill=(190, 190, 195))
        draw.ellipse([cx - 20, cy2 + 2, cx - 10, cy2 + 12], fill=(40, 40, 40))
        draw.ellipse([cx - 5, cy2 + 2, cx + 5, cy2 + 12], fill=(40, 40, 40))
        draw.ellipse([cx + 10, cy2 + 2, cx + 20, cy2 + 12], fill=(40, 40, 40))
    if code:
        font_code = load_font(7)
        cw, _ = text_size(draw, code, font_code)
        draw.text((cx - cw // 2, cy + bh // 2 - 12), code,
                   font=font_code, fill=WHITE)


def draw_toy_item(cx, cy, kind):
    if kind == 'locked':
        draw.rounded_rectangle([cx - 14, cy - 14, cx + 14, cy + 14],
                                radius=4, fill=(60, 40, 55),
                                outline=(110, 80, 100), width=1)
        font_q = load_font(13)
        tw, _ = text_size(draw, '?', font_q)
        draw.text((cx - tw // 2, cy - 8), '?', font=font_q, fill=(140, 100, 120))
        return
    if kind == 'robot':
        draw.rounded_rectangle([cx - 11, cy - 13, cx + 11, cy], radius=3,
                                fill=(195, 195, 215))
        draw.ellipse([cx - 6, cy - 9, cx - 2, cy - 5], fill=(70, 200, 240))
        draw.ellipse([cx + 2, cy - 9, cx + 6, cy - 5], fill=(70, 200, 240))
        draw.line([(cx, cy - 13), (cx, cy - 20)], fill=(100, 100, 120), width=2)
        draw.ellipse([cx - 3, cy - 23, cx + 3, cy - 17], fill=(232, 117, 117))
        draw.rounded_rectangle([cx - 13, cy, cx + 13, cy + 14], radius=2,
                                fill=(165, 165, 195))
        draw.rectangle([cx - 6, cy + 3, cx + 6, cy + 11], fill=(80, 220, 160))
    elif kind == 'rocket':
        draw.polygon([(cx, cy - 18), (cx + 7, cy - 10),
                      (cx + 7, cy + 10), (cx - 7, cy + 10),
                      (cx - 7, cy - 10)], fill=(245, 245, 250))
        draw.polygon([(cx, cy - 18), (cx + 7, cy - 8), (cx - 7, cy - 8)],
                      fill=(232, 117, 117))
        draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4],
                      fill=(80, 160, 230), outline=(40, 80, 130), width=1)
        draw.polygon([(cx - 7, cy + 10), (cx - 13, cy + 14), (cx - 7, cy + 14)],
                      fill=(232, 117, 117))
        draw.polygon([(cx + 7, cy + 10), (cx + 13, cy + 14), (cx + 7, cy + 14)],
                      fill=(232, 117, 117))
        draw.polygon([(cx - 4, cy + 14), (cx + 4, cy + 14), (cx, cy + 20)],
                      fill=(255, 190, 90))
    elif kind == 'rc_car':
        draw.rounded_rectangle([cx - 15, cy - 4, cx + 15, cy + 8], radius=3,
                                fill=(225, 55, 55))
        draw.rounded_rectangle([cx - 9, cy - 11, cx + 9, cy], radius=2,
                                fill=(45, 45, 55))
        draw.rectangle([cx - 7, cy - 9, cx + 7, cy - 2], fill=(160, 210, 240))
        draw.ellipse([cx - 15, cy + 5, cx - 6, cy + 14], fill=(20, 20, 20))
        draw.ellipse([cx + 6, cy + 5, cx + 15, cy + 14], fill=(20, 20, 20))
    elif kind == 'plane':
        draw.ellipse([cx - 17, cy - 4, cx + 17, cy + 4], fill=(225, 225, 235))
        draw.polygon([(cx - 6, cy - 2), (cx + 6, cy - 2),
                      (cx + 14, cy - 10), (cx - 14, cy - 10)], fill=(185, 185, 205))
        draw.polygon([(cx + 12, cy - 3), (cx + 16, cy - 10), (cx + 16, cy - 2)],
                      fill=(232, 117, 117))
        draw.ellipse([cx - 9, cy - 2, cx - 4, cy + 3], fill=(80, 160, 230))
        draw.ellipse([cx - 2, cy - 2, cx + 3, cy + 3], fill=(80, 160, 230))


# =====================================================
#  Cabinet · Classic Trophy (Left)
# =====================================================
def draw_classic_trophy_cabinet(x, y, w, h):
    # Pediment
    ped_h = 24
    rounded(draw, [x - 14, y - 8 - ped_h, x + w + 14, y - 8],
            radius=4, fill=CLASSIC_DARK)
    rounded(draw, [x - 10, y - 8 - ped_h + 2, x + w + 10, y - 10],
            radius=3, fill=CLASSIC_FRAME)
    arch_cx = x + w // 2
    draw.arc([arch_cx - 50, y - 8 - ped_h - 6,
              arch_cx + 50, y - 8 - ped_h + 20],
              180, 360, fill=CLASSIC_DARK, width=3)
    draw.ellipse([arch_cx - 10, y - 8 - ped_h + 2,
                  arch_cx + 10, y - 8 - ped_h + 22],
                  fill=GOLD_DARK, outline=CLASSIC_DARK, width=1)
    draw.ellipse([arch_cx - 6, y - 8 - ped_h + 6,
                  arch_cx + 6, y - 8 - ped_h + 18],
                  fill=GOLD_LIGHT)

    # Main body
    rounded(draw, [x - 6, y - 8, x + w + 6, y + h + 6],
            radius=4, fill=CLASSIC_DARK)
    rounded(draw, [x - 2, y - 4, x + w + 2, y + h + 2],
            radius=3, fill=CLASSIC_FRAME)
    rounded(draw, [x + 4, y, x + w - 4, y + h - 40],
            radius=2, fill=CLASSIC_INNER)

    # Floor base
    base_y = y + h - 6
    rounded(draw, [x - 14, base_y, x + w + 14, base_y + 16],
            radius=2, fill=CLASSIC_DARK)
    rounded(draw, [x - 10, base_y + 2, x + w + 10, base_y + 12],
            radius=2, fill=CLASSIC_FRAME)
    draw.rectangle([x - 4, base_y + 16, x + 8, base_y + 22], fill=CLASSIC_DARK)
    draw.rectangle([x + w - 8, base_y + 16, x + w + 4, base_y + 22], fill=CLASSIC_DARK)

    # Spotlight
    spot = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sp = ImageDraw.Draw(spot)
    sp.ellipse([x, y - 30, x + w, y + 80], fill=(255, 220, 150, 70))
    spot = spot.filter(ImageFilter.GaussianBlur(20))
    canvas.paste(spot, (0, 0), spot)

    # Shelves
    inner_top = y + 6
    inner_bot = y + h - 46
    shelf_count = 3
    cell_h = (inner_bot - inner_top) / shelf_count
    for r in range(1, shelf_count):
        sh_y = inner_top + int(cell_h * r) - 2
        draw.rectangle([x + 6, sh_y, x + w - 6, sh_y + 5], fill=WOOD_MID)
        draw.line([(x + 6, sh_y), (x + w - 6, sh_y)], fill=WOOD_LIGHT)

    # Trophies
    cols = 3
    cell_w = (w - 8) / cols
    trophies = [
        ('gold', 0, 0), ('silver', 0, 1), ('locked', 0, 2),
        ('gold', 1, 0), ('locked', 1, 1), ('bronze', 1, 2),
        ('locked', 2, 0), ('gold', 2, 1), ('locked', 2, 2),
    ]
    for kind, r, c in trophies:
        cx = x + 4 + int(cell_w * c + cell_w / 2)
        cy = inner_top + int(cell_h * r + cell_h / 2)
        draw_trophy_item(cx, cy, kind, size=20)

    # Glass divider + handles
    draw.line([(x + w // 2, y + 4), (x + w // 2, y + h - 40)],
               fill=CLASSIC_DARK, width=2)
    handle_y = y + h - 90
    draw.rounded_rectangle([x + w // 2 - 16, handle_y, x + w // 2 - 10, handle_y + 26],
                            radius=2, fill=GOLD_DARK)
    draw.rounded_rectangle([x + w // 2 + 10, handle_y, x + w // 2 + 16, handle_y + 26],
                            radius=2, fill=GOLD_DARK)

    # Glass reflection
    glass = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd2 = ImageDraw.Draw(glass)
    gd2.polygon([(x + 12, y + 4), (x + 60, y + 4),
                 (x + 20, y + 90), (x - 25, y + 90)],
                fill=(255, 255, 255, 28))
    gd2.polygon([(x + w - 60, y + 100), (x + w - 30, y + 100),
                 (x + w - 70, y + 180), (x + w - 100, y + 180)],
                fill=(255, 255, 255, 18))
    glass = glass.filter(ImageFilter.GaussianBlur(1))
    canvas.paste(glass, (0, 0), glass)

    # Bottom plate — V4: count only, no upper limit
    plate_y = y + h - 38
    rounded(draw, [x + 8, plate_y, x + w - 8, y + h - 16],
            radius=2, fill=GOLD_DARK)
    rounded(draw, [x + 10, plate_y + 2, x + w - 10, y + h - 18],
            radius=2, fill=GOLD)
    font_count = load_font(14)
    count_text = '收藏 8 件'
    cw, _ = text_size(draw, count_text, font_count)
    draw.text((x + (w - cw) // 2, plate_y + 3), count_text,
               font=font_count, fill=CLASSIC_DARK)


# =====================================================
#  Cabinet · Modern Lego (Center)
# =====================================================
def draw_modern_lego_cabinet(x, y, w, h):
    rounded(draw, [x - 4, y - 4, x + w + 4, y + h + 4],
            radius=12, fill=MODERN_FRAME_DK)
    rounded(draw, [x - 2, y - 2, x + w + 2, y + h + 2],
            radius=10, fill=MODERN_FRAME)
    rounded(draw, [x + 6, y + 6, x + w - 6, y + h - 38],
            radius=6, fill=MODERN_INNER)
    rounded(draw, [x + 10, y + 10, x + w - 10, y + h - 42],
            radius=4, fill=MODERN_INNER_LT)

    # Floor base
    base_y = y + h - 4
    rounded(draw, [x - 10, base_y, x + w + 10, base_y + 18],
            radius=4, fill=MODERN_FRAME_DK)
    rounded(draw, [x - 6, base_y + 2, x + w + 6, base_y + 14],
            radius=3, fill=MODERN_FRAME)
    draw.line([(x + 30, base_y + 18), (x + 30, base_y + 24)],
               fill=MODERN_FRAME_DK, width=4)
    draw.line([(x + w - 30, base_y + 18), (x + w - 30, base_y + 24)],
               fill=MODERN_FRAME_DK, width=4)

    # LED strip
    rounded(draw, [x + 12, y + 12, x + w - 12, y + 22],
            radius=4, fill=(20, 22, 28))
    led_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    lg = ImageDraw.Draw(led_glow)
    lg.rounded_rectangle([x + 14, y + 14, x + w - 14, y + 20],
                          radius=3, fill=(255, 240, 200, 240))
    canvas.paste(led_glow, (0, 0), led_glow)
    glow_spread = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gs = ImageDraw.Draw(glow_spread)
    gs.ellipse([x + 12, y + 18, x + w - 12, y + 100],
                fill=(255, 220, 150, 100))
    glow_spread = glow_spread.filter(ImageFilter.GaussianBlur(15))
    canvas.paste(glow_spread, (0, 0), glow_spread)

    # Shelves
    inner_top = y + 30
    inner_bot = y + h - 46
    shelf_count = 4
    cell_h = (inner_bot - inner_top) / shelf_count
    for r in range(1, shelf_count):
        sh_y = inner_top + int(cell_h * r)
        draw.rectangle([x + 12, sh_y - 1, x + w - 12, sh_y + 3], fill=MODERN_FRAME_DK)
        draw.line([(x + 12, sh_y - 1), (x + w - 12, sh_y - 1)], fill=MODERN_FRAME)

    cols = 2
    cell_w = (w - 24) / cols
    legos = [
        ('car',    '#42153'), ('locked', None),
        ('castle', '#10305'), ('locked', None),
        ('train',  '#60337'), ('locked', None),
        ('locked', None),     ('rover',  '#60429'),
    ]
    for i, (kind, code) in enumerate(legos):
        r, c = divmod(i, cols)
        cx = x + 12 + int(cell_w * c + cell_w / 2)
        cy = inner_top + int(cell_h * r + cell_h / 2)
        draw_lego_box(cx, cy, kind, code)

    draw.rectangle([x + 4, y + 4, x + w - 4, y + h - 40],
                   outline=(220, 220, 230), width=1)
    glass = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd2 = ImageDraw.Draw(glass)
    gd2.polygon([(x + 20, y + 30), (x + 100, y + 30),
                 (x + 40, y + 200), (x - 40, y + 200)],
                fill=(255, 255, 255, 22))
    glass = glass.filter(ImageFilter.GaussianBlur(1))
    canvas.paste(glass, (0, 0), glass)

    plate_y = y + h - 36
    rounded(draw, [x + 8, plate_y, x + w - 8, y + h - 14],
            radius=4, fill=MODERN_FRAME)
    font_count = load_font(14)
    count_text = '收藏 4 件'
    cw, _ = text_size(draw, count_text, font_count)
    draw.text((x + (w - cw) // 2, plate_y + 3), count_text,
               font=font_count, fill=INK)


# =====================================================
#  Cabinet · Playful Toy (Right)
# =====================================================
def draw_playful_toy_cabinet(x, y, w, h):
    arch_h = 26
    draw.pieslice([x - 6, y - arch_h, x + w + 6, y + arch_h + 4],
                   180, 360, fill=PLAY_FRAME_DK)
    draw.pieslice([x - 2, y - arch_h + 4, x + w + 2, y + arch_h + 2],
                   180, 360, fill=PLAY_FRAME)

    rounded(draw, [x - 6, y, x + w + 6, y + h + 6],
            radius=4, fill=PLAY_FRAME_DK)
    rounded(draw, [x - 2, y + 4, x + w + 2, y + h + 2],
            radius=3, fill=PLAY_FRAME)
    rounded(draw, [x + 6, y + arch_h - 8, x + w - 6, y + h - 38],
            radius=6, fill=PLAY_INNER)

    # Floor base
    base_y = y + h - 4
    rounded(draw, [x - 12, base_y, x + w + 12, base_y + 18],
            radius=3, fill=PLAY_FRAME_DK)
    rounded(draw, [x - 8, base_y + 2, x + w + 8, base_y + 14],
            radius=2, fill=PLAY_FRAME)
    draw.ellipse([x - 2, base_y + 16, x + 14, base_y + 26], fill=PLAY_FRAME_DK)
    draw.ellipse([x + w - 14, base_y + 16, x + w + 2, base_y + 26], fill=PLAY_FRAME_DK)

    spot = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sp = ImageDraw.Draw(spot)
    sp.ellipse([x, y - 10, x + w, y + 90], fill=(255, 220, 180, 70))
    spot = spot.filter(ImageFilter.GaussianBlur(18))
    canvas.paste(spot, (0, 0), spot)

    inner_top = y + arch_h - 4
    inner_bot = y + h - 46
    shelf_count = 3
    cell_h = (inner_bot - inner_top) / shelf_count
    for r in range(1, shelf_count):
        sh_y = inner_top + int(cell_h * r)
        rounded(draw, [x + 4, sh_y - 4, x + w - 4, sh_y + 5],
                radius=2, fill=WOOD_LIGHT)
        rounded(draw, [x + 4, sh_y - 4, x + w - 4, sh_y - 1],
                radius=2, fill=WOOD_HIGHLIGHT)
        draw.line([(x + 4, sh_y + 5), (x + w - 4, sh_y + 5)],
                   fill=WOOD_MID, width=1)

    cols = 3
    cell_w = (w - 8) / cols
    toys = [
        ('robot',   0, 0), ('locked',  0, 1), ('rocket',  0, 2),
        ('rc_car',  1, 0), ('locked',  1, 1), ('locked',  1, 2),
        ('locked',  2, 0), ('plane',   2, 1), ('locked',  2, 2),
    ]
    for kind, r, c in toys:
        cx = x + 4 + int(cell_w * c + cell_w / 2)
        cy = inner_top + int(cell_h * r + cell_h / 2)
        draw_toy_item(cx, cy, kind)

    plate_y = y + h - 36
    rounded(draw, [x + 8, plate_y, x + w - 8, y + h - 14],
            radius=3, fill=WOOD_LIGHT)
    rounded(draw, [x + 10, plate_y + 2, x + w - 10, y + h - 16],
            radius=2, fill=WOOD_HIGHLIGHT)
    font_count = load_font(14)
    count_text = '收藏 4 件'
    cw, _ = text_size(draw, count_text, font_count)
    draw.text((x + (w - cw) // 2, plate_y + 3), count_text,
               font=font_count, fill=INK)


# Draw cabinets
draw_classic_trophy_cabinet(CAB_L_X, CAB_TOP_Y, CAB_L_W, CAB_H)
draw_modern_lego_cabinet(CAB_M_X, CAB_TOP_Y, CAB_M_W, CAB_H)
draw_playful_toy_cabinet(CAB_R_X, CAB_TOP_Y, CAB_R_W, CAB_H)


# =====================================================
#  PLANTS · Floor pots between cabinets and chair (V4 NEW)
# =====================================================
def draw_pothos(cx, base_y):
    """Big-leaf pothos with heart-shaped leaves trailing down."""
    # Pot shadow
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([cx - 35, base_y + 35, cx + 35, base_y + 55], fill=(0, 0, 0, 100))
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    canvas.paste(sh, (0, 0), sh)

    # Terracotta pot (trapezoidal)
    pot_top_w = 50
    pot_bot_w = 38
    pot_h = 50
    draw.polygon([
        (cx - pot_top_w // 2, base_y),
        (cx + pot_top_w // 2, base_y),
        (cx + pot_bot_w // 2, base_y + pot_h),
        (cx - pot_bot_w // 2, base_y + pot_h),
    ], fill=POT_TERRACOTTA)
    # Pot rim
    draw.rectangle([cx - pot_top_w // 2 - 3, base_y - 6,
                    cx + pot_top_w // 2 + 3, base_y + 4],
                    fill=POT_DARK)
    # Pot highlight
    draw.polygon([
        (cx - pot_top_w // 2 + 3, base_y + 4),
        (cx - pot_top_w // 2 + 8, base_y + 4),
        (cx - pot_bot_w // 2 + 5, base_y + pot_h - 4),
        (cx - pot_bot_w // 2 + 2, base_y + pot_h - 4),
    ], fill=(210, 130, 95))
    # Soil
    draw.ellipse([cx - pot_top_w // 2 + 4, base_y - 4,
                  cx + pot_top_w // 2 - 4, base_y + 6],
                  fill=(50, 35, 25))

    # Leaves and vines — pothos has trailing vines with heart-shaped leaves
    # Main upright leaves
    leaves_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(leaves_layer)

    def heart_leaf(cx_l, cy_l, size_l, angle_deg, color):
        """Heart-shaped leaf at (cx_l, cy_l) with size and rotation."""
        ang = math.radians(angle_deg)
        # Draw simplified heart leaf as polygon
        pts_local = [
            (0, -size_l),
            (size_l * 0.6, -size_l * 0.7),
            (size_l * 0.9, -size_l * 0.1),
            (size_l * 0.4, size_l * 0.5),
            (0, size_l * 0.7),
            (-size_l * 0.4, size_l * 0.5),
            (-size_l * 0.9, -size_l * 0.1),
            (-size_l * 0.6, -size_l * 0.7),
        ]
        pts = []
        for px, py in pts_local:
            rx = px * math.cos(ang) - py * math.sin(ang)
            ry = px * math.sin(ang) + py * math.cos(ang)
            pts.append((cx_l + rx, cy_l + ry))
        ld.polygon(pts, fill=color)

    # Vines with leaves
    # Vine 1: upward to top-left
    vine_pts_1 = [
        (cx - 10, base_y - 5),
        (cx - 25, base_y - 30),
        (cx - 45, base_y - 70),
        (cx - 60, base_y - 110),
    ]
    for i in range(len(vine_pts_1) - 1):
        ld.line([vine_pts_1[i], vine_pts_1[i + 1]],
                 fill=VINE_GREEN + (255,), width=2)
    # Leaves on vine 1
    for px, py in vine_pts_1[1:]:
        heart_leaf(px, py, 14, -30, LEAF_GREEN + (230,))

    # Vine 2: upward to top-center
    vine_pts_2 = [
        (cx - 2, base_y - 5),
        (cx - 5, base_y - 35),
        (cx + 3, base_y - 75),
        (cx + 10, base_y - 120),
    ]
    for i in range(len(vine_pts_2) - 1):
        ld.line([vine_pts_2[i], vine_pts_2[i + 1]],
                 fill=VINE_GREEN + (255,), width=2)
    for px, py in vine_pts_2[1:]:
        heart_leaf(px, py, 15, 0, LEAF_GREEN_LT + (230,))

    # Vine 3: upward to top-right
    vine_pts_3 = [
        (cx + 10, base_y - 5),
        (cx + 25, base_y - 28),
        (cx + 40, base_y - 60),
        (cx + 55, base_y - 100),
    ]
    for i in range(len(vine_pts_3) - 1):
        ld.line([vine_pts_3[i], vine_pts_3[i + 1]],
                 fill=VINE_GREEN + (255,), width=2)
    for px, py in vine_pts_3[1:]:
        heart_leaf(px, py, 14, 25, LEAF_GREEN + (230,))

    # Hanging vines (drooping over pot edge)
    # Left droop
    drop_pts_l = [
        (cx - 22, base_y + 5),
        (cx - 32, base_y + 20),
        (cx - 40, base_y + 38),
    ]
    for i in range(len(drop_pts_l) - 1):
        ld.line([drop_pts_l[i], drop_pts_l[i + 1]],
                 fill=VINE_GREEN + (255,), width=2)
    for px, py in drop_pts_l[1:]:
        heart_leaf(px, py, 12, -45, LEAF_GREEN + (230,))

    # Right droop
    drop_pts_r = [
        (cx + 22, base_y + 5),
        (cx + 30, base_y + 22),
        (cx + 38, base_y + 40),
    ]
    for i in range(len(drop_pts_r) - 1):
        ld.line([drop_pts_r[i], drop_pts_r[i + 1]],
                 fill=VINE_GREEN + (255,), width=2)
    for px, py in drop_pts_r[1:]:
        heart_leaf(px, py, 12, 45, LEAF_GREEN_LT + (230,))

    canvas.paste(leaves_layer, (0, 0), leaves_layer)


def draw_monstera(cx, base_y):
    """Monstera (Swiss cheese plant) with split leaves."""
    # Pot shadow
    sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([cx - 35, base_y + 35, cx + 35, base_y + 55], fill=(0, 0, 0, 100))
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    canvas.paste(sh, (0, 0), sh)

    # White ceramic pot (different from pothos)
    pot_top_w = 55
    pot_bot_w = 45
    pot_h = 55
    draw.polygon([
        (cx - pot_top_w // 2, base_y),
        (cx + pot_top_w // 2, base_y),
        (cx + pot_bot_w // 2, base_y + pot_h),
        (cx - pot_bot_w // 2, base_y + pot_h),
    ], fill=(245, 240, 230))
    # Pot rim
    draw.rectangle([cx - pot_top_w // 2 - 3, base_y - 6,
                    cx + pot_top_w // 2 + 3, base_y + 4],
                    fill=(200, 195, 185))
    # Pot shadow side
    draw.polygon([
        (cx + pot_top_w // 2 - 8, base_y + 4),
        (cx + pot_top_w // 2, base_y + 4),
        (cx + pot_bot_w // 2, base_y + pot_h - 4),
        (cx + pot_bot_w // 2 - 6, base_y + pot_h - 4),
    ], fill=(220, 215, 200))
    # Soil
    draw.ellipse([cx - pot_top_w // 2 + 4, base_y - 4,
                  cx + pot_top_w // 2 - 4, base_y + 6],
                  fill=(50, 35, 25))

    # Monstera leaves — large with characteristic splits
    leaves_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(leaves_layer)

    def monstera_leaf(cx_l, cy_l, size_l, angle_deg, color):
        """Large split-leaf shape."""
        ang = math.radians(angle_deg)
        # Approximate split leaf with multiple finger-like protrusions
        leaf_pts_local = [
            (0, -size_l),
            (size_l * 0.4, -size_l * 0.85),
            (size_l * 0.7, -size_l * 0.4),
            # split right side
            (size_l * 0.5, -size_l * 0.2),
            (size_l * 0.85, 0),
            (size_l * 0.55, size_l * 0.15),
            (size_l * 0.8, size_l * 0.35),
            (size_l * 0.4, size_l * 0.55),
            (size_l * 0.45, size_l * 0.8),
            (0, size_l * 0.95),
            (-size_l * 0.45, size_l * 0.8),
            (-size_l * 0.4, size_l * 0.55),
            # split left side
            (-size_l * 0.8, size_l * 0.35),
            (-size_l * 0.55, size_l * 0.15),
            (-size_l * 0.85, 0),
            (-size_l * 0.5, -size_l * 0.2),
            (-size_l * 0.7, -size_l * 0.4),
            (-size_l * 0.4, -size_l * 0.85),
        ]
        pts = []
        for px, py in leaf_pts_local:
            rx = px * math.cos(ang) - py * math.sin(ang)
            ry = px * math.sin(ang) + py * math.cos(ang)
            pts.append((cx_l + rx, cy_l + ry))
        ld.polygon(pts, fill=color)
        # Stem (line from base to leaf center)
        ld.line([(cx, base_y - 5), (cx_l, cy_l)], fill=(80, 130, 80, 200), width=3)

    # 5 large leaves spreading outward and upward
    monstera_leaf(cx - 50, base_y - 50, 38, -25, LEAF_GREEN_DK + (240,))
    monstera_leaf(cx + 45, base_y - 60, 40, 30, LEAF_GREEN + (240,))
    monstera_leaf(cx - 10, base_y - 95, 42, -10, LEAF_GREEN + (240,))
    monstera_leaf(cx + 25, base_y - 120, 38, 15, LEAF_GREEN_LT + (240,))
    monstera_leaf(cx - 40, base_y - 130, 36, -20, LEAF_GREEN + (240,))

    canvas.paste(leaves_layer, (0, 0), leaves_layer)


# Plant positions — between cabinets and chair
# Left plant: between left cabinet (ends at 455) and chair (starts at 620)
PLANT_L_CX = 530
# Right plant: between right cabinet (starts at 1145) and chair (ends at 980)
PLANT_R_CX = 1070
PLANT_BASE_Y = FLOOR_LINE_Y + 50  # 740 — sits on the floor

draw_pothos(PLANT_L_CX, PLANT_BASE_Y)
draw_monstera(PLANT_R_CX, PLANT_BASE_Y)


# =====================================================
#  CHAIR (V4: widened back to 360, top corners more flat)
# =====================================================
chair_cx = W // 2
chair_w = 360   # WIDENED back from 240 to 360
chair_top_y = 720
chair_bot_y = DESK_TOP_Y

# Chair floor shadow
ch_sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ch_sd = ImageDraw.Draw(ch_sh)
ch_sd.ellipse([chair_cx - chair_w // 2 - 10, chair_bot_y - 8,
               chair_cx + chair_w // 2 + 10, chair_bot_y + 18],
               fill=(0, 0, 0, 90))
ch_sh = ch_sh.filter(ImageFilter.GaussianBlur(6))
canvas.paste(ch_sh, (0, 0), ch_sh)

chair_layer = Image.new('RGBA', (W, H), (0, 0, 0, 0))
cd_layer = ImageDraw.Draw(chair_layer)

# Main back — V4: top corners less rounded so Fatboy head not "trapped"
cd_layer.rounded_rectangle(
    [chair_cx - chair_w // 2, chair_top_y,
     chair_cx + chair_w // 2, chair_bot_y],
    radius=30, fill=CHAIR_LEATHER
)
# Inner padding
cd_layer.rounded_rectangle(
    [chair_cx - chair_w // 2 + 14, chair_top_y + 12,
     chair_cx + chair_w // 2 - 14, chair_bot_y - 8],
    radius=24, fill=CHAIR_HIGHLIGHT
)
# 6 vertical stitching lines
for offset in [-90, -55, -20, 20, 55, 90]:
    cd_layer.line(
        [(chair_cx + offset, chair_top_y + 22),
         (chair_cx + offset, chair_bot_y - 14)],
        fill=CHAIR_STITCH, width=2
    )
# Top headrest
cd_layer.rounded_rectangle(
    [chair_cx - chair_w // 2 + 28, chair_top_y + 18,
     chair_cx + chair_w // 2 - 28, chair_top_y + 56],
    radius=18, fill=(125, 90, 60)
)
# Gold emblem
cd_layer.ellipse(
    [chair_cx - 8, chair_top_y + 30, chair_cx + 8, chair_top_y + 46],
    fill=GOLD, outline=GOLD_DARK, width=2
)
cd_layer.ellipse(
    [chair_cx - 4, chair_top_y + 34, chair_cx + 4, chair_top_y + 42],
    fill=GOLD_LIGHT
)
canvas.paste(chair_layer, (0, 0), chair_layer)


# =====================================================
#  FATBOY (V4: moved up to show face + shoulders)
# =====================================================
svg_path = '/home/claude/fatboy/svg/characters/default/default.svg'
if os.path.exists(svg_path):
    fb_png = cairosvg.svg2png(url=svg_path, output_width=FB_SIZE)
    fb_img = Image.open(io.BytesIO(fb_png)).convert('RGBA')
    fb_x = chair_cx - FB_SIZE // 2
    canvas.paste(fb_img, (fb_x, FB_Y), fb_img)


# =====================================================
#  DESK (V4: DEEP walnut to separate from floor)
# =====================================================
desk_x1, desk_x2 = 40, W - 40

# Shadow on floor
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
sd = ImageDraw.Draw(sh)
sd.rectangle([desk_x1, DESK_TOP_Y - 8, desk_x2, DESK_TOP_Y - 2],
              fill=(0, 0, 0, 100))
sh = sh.filter(ImageFilter.GaussianBlur(4))
canvas.paste(sh, (0, 0), sh)

# Desk top (DEEP walnut)
draw.rectangle([desk_x1, DESK_TOP_Y, desk_x2, DESK_TOP_Y + 14], fill=DESK_TOP_LT)
draw.rectangle([desk_x1, DESK_TOP_Y + 12, desk_x2, DESK_TOP_Y + 24], fill=DESK_TOP)
draw.rectangle([desk_x1, DESK_TOP_Y + 22, desk_x2, DESK_TOP_Y + 30], fill=DESK_EDGE)
# Front panel (V4: COMPRESSED to 36px height)
draw.rectangle([desk_x1, DESK_TOP_Y + 30, desk_x2, H - 60], fill=DESK_FRONT)
# Wood grain on top
for i in range(6):
    y = DESK_TOP_Y + 2 + i * 2
    draw.line([(desk_x1, y), (desk_x2, y)], fill=DESK_GRAIN, width=1)
# Front grain (subtle)
for y in [DESK_TOP_Y + 50, DESK_TOP_Y + 75]:
    if y < H - 60:
        draw.line([(desk_x1 + 20, y), (desk_x2 - 20, y)], fill=DESK_EDGE, width=1)


# =====================================================
#  DESK ITEMS (4 core)
# =====================================================
# 1. Lamp (left)
lamp_x = 220
lamp_base_y = DESK_TOP_Y + 14
draw.ellipse([lamp_x - 22, lamp_base_y - 6, lamp_x + 22, lamp_base_y + 6],
              fill=(60, 60, 70))
draw.ellipse([lamp_x - 18, lamp_base_y - 10, lamp_x + 18, lamp_base_y - 2],
              fill=(90, 90, 100))
draw.line([(lamp_x, lamp_base_y - 6), (lamp_x + 35, lamp_base_y - 70)],
           fill=(60, 60, 70), width=4)
draw.line([(lamp_x + 35, lamp_base_y - 70), (lamp_x + 70, lamp_base_y - 45)],
           fill=(60, 60, 70), width=4)
draw.ellipse([lamp_x + 31, lamp_base_y - 75, lamp_x + 39, lamp_base_y - 67],
              fill=(40, 40, 50))
draw.polygon([
    (lamp_x + 70, lamp_base_y - 50),
    (lamp_x + 95, lamp_base_y - 68),
    (lamp_x + 110, lamp_base_y - 32),
    (lamp_x + 85, lamp_base_y - 14),
], fill=(75, 130, 95))
draw.polygon([
    (lamp_x + 72, lamp_base_y - 48),
    (lamp_x + 88, lamp_base_y - 62),
    (lamp_x + 90, lamp_base_y - 52),
    (lamp_x + 76, lamp_base_y - 40),
], fill=(115, 165, 135))
# Lamp glow
lamp_glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
lg2 = ImageDraw.Draw(lamp_glow)
lg2.ellipse([lamp_x + 30, lamp_base_y - 20,
             lamp_x + 220, lamp_base_y + 80],
             fill=(255, 220, 130, 105))
lamp_glow = lamp_glow.filter(ImageFilter.GaussianBlur(28))
canvas.paste(lamp_glow, (0, 0), lamp_glow)

# 2. Notebook (centered in front of Fatboy)
nb_x = chair_cx - 110
nb_y = DESK_TOP_Y + 26
nb_w, nb_h = 220, 28
draw.polygon([(nb_x - 12, nb_y), (nb_x + nb_w + 12, nb_y),
              (nb_x + nb_w, nb_y + nb_h), (nb_x, nb_y + nb_h)],
              fill=(252, 248, 238))
draw.line([(nb_x + nb_w // 2, nb_y), (nb_x + nb_w // 2, nb_y + nb_h)],
           fill=(210, 200, 180), width=1)
for i in range(3):
    y = nb_y + 6 + i * 6
    draw.line([(nb_x - 6, y), (nb_x + nb_w // 2 - 8, y)],
               fill=(185, 175, 160), width=1)
    line_end = nb_x + nb_w - (4 if i == 0 else 30 if i == 1 else 14)
    draw.line([(nb_x + nb_w // 2 + 8, y), (line_end, y)],
               fill=(60, 100, 180), width=1)
# Pencil on notebook
draw.polygon([(nb_x + 90, nb_y + nb_h - 4), (nb_x + 180, nb_y + nb_h - 14),
              (nb_x + 182, nb_y + nb_h - 9), (nb_x + 92, nb_y + nb_h + 1)],
              fill=(255, 200, 60))
draw.polygon([(nb_x + 90, nb_y + nb_h - 4), (nb_x + 92, nb_y + nb_h + 1),
              (nb_x + 82, nb_y + nb_h - 2)], fill=(50, 30, 20))
draw.rectangle([nb_x + 178, nb_y + nb_h - 14, nb_x + 186, nb_y + nb_h - 8],
                fill=(232, 117, 117))

# 3. Globe (right of Fatboy)
globe_cx = chair_cx + 240
globe_cy = DESK_TOP_Y - 30
draw.rectangle([globe_cx - 28, DESK_TOP_Y + 10, globe_cx + 28, DESK_TOP_Y + 22],
                fill=(75, 55, 35))
draw.line([(globe_cx, DESK_TOP_Y + 10), (globe_cx, globe_cy + 40)],
           fill=(100, 75, 50), width=3)
draw.arc([globe_cx - 42, globe_cy - 42, globe_cx + 42, globe_cy + 42],
          0, 360, fill=GOLD_DARK, width=3)
draw.ellipse([globe_cx - 36, globe_cy - 36, globe_cx + 36, globe_cy + 36],
              fill=(75, 145, 215))
draw.polygon([(globe_cx - 20, globe_cy - 22), (globe_cx - 6, globe_cy - 28),
              (globe_cx + 8, globe_cy - 12), (globe_cx + 4, globe_cy + 6),
              (globe_cx - 10, globe_cy + 18), (globe_cx - 24, globe_cy + 6),
              (globe_cx - 28, globe_cy - 8)], fill=(120, 180, 100))
draw.polygon([(globe_cx + 14, globe_cy - 25), (globe_cx + 28, globe_cy - 14),
              (globe_cx + 24, globe_cy + 2)], fill=(120, 180, 100))
draw.ellipse([globe_cx - 28, globe_cy - 28, globe_cx - 12, globe_cy - 14],
              fill=(180, 220, 255))

# 4. Picture frame (far right)
frame_cx = W - 220
frame_cy = DESK_TOP_Y - 25
frame_w, frame_h = 60, 70
draw.rectangle([frame_cx - frame_w // 2 - 4, frame_cy - frame_h // 2 - 4,
                frame_cx + frame_w // 2 + 4, frame_cy + frame_h // 2 + 4],
                fill=WOOD_DARK)
draw.rectangle([frame_cx - frame_w // 2, frame_cy - frame_h // 2,
                frame_cx + frame_w // 2, frame_cy + frame_h // 2],
                fill=WOOD_LIGHT)
draw.rectangle([frame_cx - frame_w // 2 + 3, frame_cy - frame_h // 2 + 3,
                frame_cx + frame_w // 2 - 3, frame_cy + frame_h // 2 - 3],
                fill=PAPER)
# Small star (placeholder)
ph_cx, ph_cy = frame_cx, frame_cy
pts = []
for i in range(10):
    ang = math.radians(-90 + 36 * i)
    r = 10 if i % 2 == 0 else 4
    pts.append((ph_cx + r * math.cos(ang), ph_cy + r * math.sin(ang)))
draw.polygon(pts, fill=GOLD, outline=GOLD_DARK)


# =====================================================
#  Bottom bar
# =====================================================
bar_h = 60
bar_y = H - bar_h
bar = Image.new('RGBA', (W, bar_h), (255, 252, 245, 220))
canvas.paste(bar, (0, bar_y), bar)
draw.rectangle([0, bar_y, W, bar_y + 1], fill=(200, 180, 150))

# Star + points
star_cx, star_cy, star_r = 50, bar_y + 30, 10
pts = []
for i in range(10):
    ang = math.radians(-90 + 36 * i)
    r = star_r if i % 2 == 0 else star_r // 2
    pts.append((star_cx + r * math.cos(ang), star_cy + r * math.sin(ang)))
draw.polygon(pts, fill=GOLD, outline=GOLD_DARK, width=1)
font_stat = load_font(18)
draw.text((70, bar_y + 21), '361 积分', font=font_stat, fill=INK)

# Decoration shop button
btn_w, btn_h = 200, 40
btn_x = W - btn_w - 30
btn_y = bar_y + 10
rounded(draw, [btn_x, btn_y + 4, btn_x + btn_w, btn_y + btn_h + 4],
        radius=14, fill=GOLD_DARK)
rounded(draw, [btn_x, btn_y, btn_x + btn_w, btn_y + btn_h],
        radius=14, fill=GOLD)
bag_x = btn_x + 30
bag_y = btn_y + 12
draw.rounded_rectangle([bag_x, bag_y + 4, bag_x + 18, bag_y + 22],
                        radius=2, fill=INK)
draw.arc([bag_x + 2, bag_y - 4, bag_x + 16, bag_y + 8],
          180, 360, fill=INK, width=2)
font_btn = load_font(17)
draw.text((btn_x + 60, btn_y + 10), '装饰商店', font=font_btn, fill=INK)


# Save
out = '/tmp/fatboy_home_study_v4_final.png'
canvas.save(out, optimize=True, quality=95)
print(f'saved {out}')
print(f'size: {canvas.size}')
