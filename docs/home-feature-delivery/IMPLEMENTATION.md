# 像素级实现对照表

> **这份文档的目的**：让 Claude Code **100% 复现 mockup**。
> 不是模糊描述，是**精确数值**：每个元素的坐标、尺寸、颜色都来自实际渲染 mockup 的 Python 代码。
>
> **使用方法**：每个组件分左右两栏——左栏是 Python 实际数值（mockup 渲染参数），右栏是 React+CSS 实现规则。

---

## 0. 画布与坐标系

**基准画布**：1600 × 1000（桌面端横屏）
**坐标系**：左上角 (0,0)，y 向下递增

**响应式策略**：
- 桌面端（≥1200px）：按 1600×1000 设计，等比缩放
- 平板（768-1200px）：保持 16:10 比例缩放
- 移动端（<768px）：垂直堆叠，三柜变为可横滑（v4.1 实现）

**React 容器**：
```tsx
<div className="study-room" style={{ aspectRatio: '16 / 10' }}>
  {/* 所有子元素用百分比定位 */}
</div>
```

百分比换算公式：
```
top% = (y / 1000) * 100
left% = (x / 1600) * 100
width% = (w / 1600) * 100
height% = (h / 1000) * 100
```

---

## 1. 顶部导航条

**Python 参数**：
```python
nav_height = 60       # 高度
nav_bg = (255, 252, 245, 220)  # 半透明米白
title_y = 16          # 标题 y 位置
back_x, back_y = 30, 20  # 退出按钮位置
gear_x, gear_y = W - 70, 30  # 设置齿轮
```

**React 实现**：
```tsx
<nav className="study-nav" style={{
  position: 'absolute',
  top: 0, left: 0, right: 0,
  height: '6%',                // 60/1000
  background: 'rgba(255, 252, 245, 0.86)',
  zIndex: 100,
}}>
  <button className="back-btn" style={{
    position: 'absolute', left: '30px', top: '20px',
    fontSize: '20px', color: 'var(--study-ink)',
  }}>← 退出</button>

  <h1 style={{
    position: 'absolute', top: '16px',
    left: '50%', transform: 'translateX(-50%)',
    fontSize: '26px', fontWeight: 'bold',
    color: 'var(--study-ink)',
  }}>肥仔的书房</h1>

  <SettingsGearIcon style={{
    position: 'absolute', right: '70px', top: '24px',
  }} />
</nav>
```

---

## 2. 墙面渐变

**Python 参数**：
```python
WALL_TOP = (250, 246, 239)  # #FAF6EF
WALL_BOT = (244, 238, 226)  # #F4EEE2
渐变高度: 0 → 690（floor line）
墙面纹理: 800 个随机半透明圆点，alpha 8-25%
```

**React + CSS 实现**：
```css
.study-wall {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 69%;  /* 690/1000 */
  background: linear-gradient(180deg, #FAF6EF 0%, #F4EEE2 100%);
  /* Subtle texture using noise SVG */
  background-image:
    linear-gradient(180deg, #FAF6EF 0%, #F4EEE2 100%),
    url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/><feColorMatrix values="0 0 0 0 0.7  0 0 0 0 0.58  0 0 0 0 0.4  0 0 0 0.04 0"/></filter><rect width="100%" height="100%" filter="url(%23n)"/></svg>');
  background-blend-mode: multiply;
}
```

---

## 3. 左上斜光（窗光）

**Python 参数**：
```python
# 三层渐变光带，从画面左上向右下倾斜
# 外层（最弱）
beam_pts_outer = [(-100, 0), (550, 0), (350, 790), (-300, 790)]
fill_outer = (255, 235, 175, 50)

# 中层
beam_pts_middle = [(-50, 0), (380, 0), (250, 790), (-200, 790)]
fill_middle = (255, 240, 195, 45)

# 内层（最强）
beam_pts_inner = [(50, 0), (250, 0), (160, 790), (-30, 790)]
fill_inner = (255, 245, 210, 35)

模糊半径: 25px
```

**React + CSS 实现**：
```tsx
<div className="window-beam" style={{
  position: 'absolute',
  top: 0, left: 0,
  width: '40%', height: '79%',
  background: `linear-gradient(
    160deg,
    rgba(255, 245, 210, 0.35) 0%,
    rgba(255, 240, 195, 0.20) 30%,
    rgba(255, 235, 175, 0.10) 60%,
    transparent 80%
  )`,
  filter: 'blur(25px)',
  pointerEvents: 'none',
  zIndex: 1,
}} />
```

---

## 4. 顶部环境光晕

**Python 参数**：
```python
glow_ellipse = [200, -400, W-200, 400]  # 大椭圆，部分在画外
fill = (255, 215, 155, 50)
blur = 120
```

**CSS 实现**：
```css
.ambient-glow {
  position: absolute;
  top: -40%; left: 12%;
  width: 76%; height: 80%;
  background: radial-gradient(ellipse,
    rgba(255, 215, 155, 0.5) 0%,
    transparent 60%);
  filter: blur(80px);
  pointer-events: none;
  z-index: 2;
}
```

---

## 5. 顶部装饰条

**Python 参数**：
```python
draw.rectangle([0, 60, W, 64], fill=(220, 200, 165))  # 上层
draw.rectangle([0, 66, W, 68], fill=(190, 165, 130))  # 下层
```

**CSS 实现**：
```css
.ceiling-trim {
  position: absolute;
  top: 6%; left: 0; right: 0;
  height: 8px;
  background:
    linear-gradient(180deg,
      #DCC8A5 0%, #DCC8A5 50%,
      transparent 50%, transparent 60%,
      #BEA582 60%, #BEA582 100%);
}
```

---

## 6. 画轨

**Python 参数**：
```python
PIC_RAIL_Y = 165
draw.rectangle([0, 165, W, 170], fill=(190, 165, 130))  # 主体
draw.rectangle([0, 170, W, 172], fill=(190, 150, 105))  # 下边
```

**CSS 实现**：
```css
.picture-rail {
  position: absolute;
  top: 16.5%; left: 0; right: 0;
  height: 7px;
  background:
    linear-gradient(180deg,
      #BEA582 0%, #BEA582 71%,
      #BE9669 71%, #BE9669 100%);
}
```

---

## 7. 地板

**Python 参数**：
```python
FLOOR_LINE_Y = 690
FLOOR_LIGHT = (215, 185, 145)  # 顶部浅
FLOOR_DARK = (155, 120, 80)    # 底部深

# 渐变：从 y=690 到 y=1000
# 横向板缝（5 条）：
plank_ys = [720, 760, 805, 860, 930]
fill = (170, 135, 95)

# 纵向接缝（5 行，每行 5-6 个错落的位置）
seam_data = [
  (690, 720, [200, 480, 720, 1050, 1320]),
  (720, 760, [80, 380, 620, 900, 1180, 1470]),
  (760, 805, [250, 550, 850, 1100, 1400]),
  (805, 860, [120, 420, 700, 980, 1280, 1500]),
  (860, 930, [300, 600, 900, 1200, 1450]),
  (930, 1000, [180, 480, 760, 1080, 1350]),
]
seam_color = (140, 105, 70)

# 墙地交界线
draw.rectangle([0, 686, W, 690], fill=(180, 145, 100))
draw.rectangle([0, 690, W, 692], fill=(155, 115, 75))
```

**实现建议**：用一个 SVG 直接生成地板纹理（精确还原），或者用 CSS background 多层叠加。

**CSS 简化方案**：
```tsx
<div className="study-floor" style={{
  position: 'absolute',
  top: '69%', left: 0, right: 0, bottom: 0,
  background: `linear-gradient(180deg, #D7B991 0%, #9B7850 100%)`,
}}>
  {/* SVG 叠加板缝纹理 */}
  <svg width="100%" height="100%" preserveAspectRatio="none"
       style={{ position: 'absolute', inset: 0 }}>
    {/* 5 条横向板缝 */}
    {[30, 70, 115, 170, 240].map(offset => (
      <line key={offset} x1="0" x2="100%"
            y1={offset} y2={offset}
            stroke="#AA875F" strokeWidth="1" />
    ))}
    {/* 纵向接缝 - 参考 Python seam_data */}
    {/* ... */}
  </svg>
</div>

{/* 墙地交界 */}
<div style={{
  position: 'absolute',
  top: 'calc(69% - 4px)', left: 0, right: 0,
  height: '6px',
  background: 'linear-gradient(180deg, #B49164 0%, #9A734A 100%)',
}} />
```

---

## 8. 三幅画

### 8.1 位置（Python 精确数值）

```python
# 画框 y 位置: 200, 高度: 130
PAINT_Y = 200
PAINT_H = 130

# 三柜 x 位置
CAB_L_X = 80   # 左柜 x
CAB_L_W = 375  # 左柜宽
CAB_M_X = 575  # 中柜 x
CAB_M_W = 450  # 中柜宽（更宽）
CAB_R_X = 1145 # 右柜 x
CAB_R_W = 375  # 右柜宽

# 画位置（居中对齐每个柜子上方）
P1_W = 210  # 左画宽度
P1_X = 80 + (375 - 210) // 2 = 162

P2_W = 260  # 中画宽度（更宽）
P2_X = 575 + (450 - 260) // 2 = 670

P3_W = 210  # 右画宽度
P3_X = 1145 + (375 - 210) // 2 = 1227
```

### 8.2 画框结构（3 层木框）

```python
# 外框
draw.rectangle([cx-10, cy-10, cx+w+10, cy+h+10], fill=WOOD_DARK)  # #583C24
# 中框
draw.rectangle([cx-6, cy-6, cx+w+6, cy+h+6], fill=WOOD_MID)       # #8C6441
# 内框
draw.rectangle([cx-3, cy-3, cx+w+3, cy+h+3], fill=WOOD_LIGHT)     # #BE9669
# 衬纸（白底）
draw.rectangle([cx, cy, cx+w, cy+h], fill=PAPER)                  # #FFFCF5

# 画轨挂绳：从画顶中央向画轨的两个点
draw.line([(cx+w//2-30, 172), (cx+w//2, cy)], fill=WOOD_DARK)
draw.line([(cx+w//2+30, 172), (cx+w//2, cy)], fill=WOOD_DARK)
```

### 8.3 中央画 = 用户提供的偶像海报

```python
# 加载图片
img = Image.open('/assets/home/paintings/center_hero.jpg')
# cover 模式裁剪（保留主体，可能裁边）
# 应用 5% 暖光叠加
warm = Image.new('RGB', img.size, (255, 230, 180))
img = Image.blend(img, warm, 0.05)
# 嵌入到画框内部（4px 内边距）
inner_x, inner_y = cx + 4, cy + 4
inner_w, inner_h = w - 8, h - 8
```

**React 实现**：
```tsx
<div className="painting painting-center" style={{
  position: 'absolute',
  top: '20%', left: '41.875%',  // (200/1000, 670/1600)
  width: '16.25%', height: '13%',  // (260/1600, 130/1000)
}}>
  {/* 画框 3 层 */}
  <div className="frame-outer" />
  <div className="frame-middle" />
  <div className="frame-inner" />

  <div className="painting-content">
    <img src="/assets/home/paintings/center_hero.jpg"
         alt="偶像海报"
         style={{
           width: '100%', height: '100%',
           objectFit: 'cover',  // 关键：cover 模式
           filter: 'sepia(0.05) brightness(1.02)',  // 暖光叠加
         }} />
  </div>

  {/* 挂绳从画轨垂下 */}
  <PictureCord />
</div>
```

### 8.4 左右画（SVG 绘制）

**左画** · 荣耀主题（金桂冠+星）：见 Python 函数 `draw_painting_svg('trophy')`，关键元素：
- 渐变背景：浅黄到米色（`(252,238,200)` → `(232,208,175)`）
- 双侧 7 片桂冠叶（深绿 `#558252`）排成圆环
- 中心 5 角星（金色，r 内=6, r 外=14）

**右画** · 探索主题（星空火箭）：见 Python 函数 `draw_painting_svg('toy')`，关键元素：
- 渐变背景：深蓝到深紫（`(35,45,90)` → `(85,105,150)`）
- 18 个随机白色星点（半径 1-2）
- 弯月（米白色，r=15）
- 居中火箭（白身体 + 红顶 + 蓝窗 + 红尾翼）

---

## 9. 三个柜子

### 9.1 通用参数

```python
CAB_TOP_Y = 380    # 柜子顶部 y
CAB_BASE_Y = 685   # 柜子底部 y（贴近地板线 690）
CAB_H = 305        # 高度

# 柜子之间间距 120px
# 左柜: 80-455 (宽375)
# 中柜: 575-1025 (宽450, 比例 1.2)
# 右柜: 1145-1520 (宽375)
```

### 9.2 左柜 · 经典实木（奖杯柜）

```python
颜色:
  CLASSIC_FRAME = (115, 75, 45)   # #734B2D
  CLASSIC_DARK = (75, 48, 28)     # #4B301C
  CLASSIC_INNER = (58, 38, 25)    # #3A2619

结构:
  - 雕花顶饰 24px 高（弧形拱顶 + 金色徽章）
  - 主体框架 3 层（外深 → 中 → 内深背景）
  - 玻璃门 + 中央双铜拉手（位于柜身下 1/3）
  - 底座宽于柜身 14px 两侧
  - 底座下 2 个方形装饰脚

内部:
  - 3 行 × 3 列 = 9 个奖杯槽位（橱窗显示）
  - 内部聚光灯（顶部椭圆暖光晕）
  - 玻璃反光两道斜线

底部铜牌:
  - 金色 plate
  - 文字: "收藏 8 件"
```

**React 组件结构**：
```tsx
<div className="cabinet cabinet-classic" style={{
  position: 'absolute',
  left: '5%', top: '38%',
  width: '23.4375%', height: '30.5%',
}}>
  <div className="cabinet-pediment">
    <div className="pediment-arch" />
    <div className="pediment-medallion">
      <Star size={8} fill="gold" />
    </div>
  </div>

  <div className="cabinet-body">
    <div className="cabinet-inner">
      <div className="cabinet-spotlight" />

      <div className="trophy-grid">
        {trophyShowcase.slice(0, 9).map((trophy, i) => (
          <TrophySlot key={i} trophy={trophy} />
        ))}
      </div>

      <div className="cabinet-glass">
        <div className="glass-divider" />
        <div className="brass-handle handle-left" />
        <div className="brass-handle handle-right" />
        <div className="glass-reflection-1" />
        <div className="glass-reflection-2" />
      </div>
    </div>

    <div className="cabinet-plate">
      <span>收藏 {trophyCount} 件</span>
    </div>
  </div>

  <div className="cabinet-base">
    <div className="base-foot foot-left" />
    <div className="base-foot foot-right" />
  </div>

  <div className="cabinet-floor-shadow" />
</div>
```

### 9.3 中柜 · 现代极简（乐高柜）

```python
颜色:
  MODERN_FRAME = (215, 215, 220)     # #D7D7DC
  MODERN_FRAME_DK = (175, 175, 185)  # #AFAFB9
  MODERN_INNER = (38, 40, 48)        # #262830
  LED_COLOR = (255, 240, 200, 240)   # 暖白 LED

结构:
  - 银灰金属框 + 圆角 12px
  - 顶部 LED 灯带（10px 高，暖白光，下方有渐变扩散光晕）
  - 内部深灰背景（无形玻璃门）
  - 底座 + 极简金属脚（仅 4px 宽线条）

内部:
  - 4 行 × 2 列 = 8 个乐高槽位
  - LED 光晕向下扩散（高斯模糊 15px）
  - 单道大斜面玻璃反光

底部铜牌:
  - 金属 plate
  - 文字: "收藏 4 件"
```

### 9.4 右柜 · 趣味（玩具柜）

```python
颜色:
  PLAY_FRAME = (220, 180, 150)      # #DCB496
  PLAY_FRAME_DK = (175, 135, 100)   # #AF8764
  PLAY_INNER = (90, 60, 80)         # #5A3C50

结构:
  - 顶部弧形拱顶（pieslice 180-360 度）
  - 暖紫红内衬
  - 可见木质层板（3 层）
  - 底座 + 圆形装饰脚（"卡通腿"）

内部:
  - 3 行 × 3 列 = 9 个玩具槽位
  - 内部聚光灯
  - 木质层板有高光线条

底部铜牌:
  - 木质 plate
  - 文字: "收藏 4 件"
```

### 9.5 柜子落地阴影（关键）

```python
def draw_cabinet_floor_shadow(x, y_base, w):
    """每个柜子下方在地板上的椭圆阴影"""
    sh.ellipse([x-20, y_base, x+w+20, y_base+40], fill=(0,0,0,90))
    blur = 10
```

**CSS 等效**：
```css
.cabinet-floor-shadow {
  position: absolute;
  bottom: -20px;
  left: -20px; right: -20px;
  height: 40px;
  background: radial-gradient(ellipse, rgba(0,0,0,0.35) 0%, transparent 70%);
  filter: blur(10px);
}
```

---

## 10. 椅子（关键 · v4 改动）

```python
chair_cx = W // 2 = 800     # 中心 x
chair_w = 360               # 宽（v4 放大）
chair_top_y = 720           # 顶部 y
chair_bot_y = 870           # 底部 y = DESK_TOP_Y
chair_h = 150               # 高
radius = 30                 # 圆角（v4 改小）

颜色:
  CHAIR_LEATHER = (62, 42, 28)      # #3E2A1C
  CHAIR_HIGHLIGHT = (105, 75, 50)   # #695032
  CHAIR_STITCH = (90, 60, 35)       # #5A3C23

细节:
  - 主体皮革（圆角 30）
  - 内层填充（圆角 24，内缩 14px）
  - 6 道车线（offsets: -90, -55, -20, 20, 55, 90）
  - 顶部头枕条（y=738-756，左右内缩 28px）
  - 中央金色徽章（直径 16px，y=750）
```

**React 实现**：
```tsx
<div className="chair-back" style={{
  position: 'absolute',
  left: 'calc(50% - 180px)', top: '72%',
  width: '22.5%', height: '15%',  // 360/1600, 150/1000
  background: '#3E2A1C',
  borderRadius: '30px',
  boxShadow: '0 6px 12px rgba(0,0,0,0.3)',
}}>
  {/* Inner padding */}
  <div style={{
    position: 'absolute',
    top: '8px', left: '14px', right: '14px', bottom: '8px',
    background: '#695032',
    borderRadius: '24px',
  }}>
    {/* 6 vertical stitches */}
    {[-90, -55, -20, 20, 55, 90].map(offset => (
      <div key={offset} style={{
        position: 'absolute',
        left: `calc(50% + ${offset}px)`,
        top: '22px', bottom: '14px',
        width: '2px',
        background: '#5A3C23',
      }} />
    ))}

    {/* Headrest */}
    <div style={{
      position: 'absolute',
      top: '14px', left: '28px', right: '28px',
      height: '38px',
      background: '#7D5A3C',
      borderRadius: '18px',
    }} />

    {/* Gold emblem */}
    <div style={{
      position: 'absolute',
      top: '26px', left: '50%',
      transform: 'translateX(-50%)',
      width: '16px', height: '16px',
      borderRadius: '50%',
      background: 'var(--acc-gold)',
      border: '2px solid var(--acc-gold-dark)',
    }} />
  </div>
</div>
```

---

## 11. 肥仔位置（关键 · v4 改动）

```python
FB_SIZE = 260       # 肥仔尺寸
FB_Y = 600          # y 起点（v4 上移：从 690 → 600）
FB_X = chair_cx - FB_SIZE // 2 = 670

# 露出部分：从 600 到 870（被桌面挡）= 270px
# 显示：脸 + 腮红 + 嘴 + 一点身体 + 小手
```

**React 实现**：
```tsx
<div className="fatboy-container" style={{
  position: 'absolute',
  left: 'calc(50% - 130px)',
  top: '60%',
  width: '16.25%',   // 260/1600
  height: '26%',     // 260/1000
  zIndex: 20,
}}>
  <FatboyComponent character="default" state="default" size={260} />
</div>
```

---

## 12. 绿植（v4 新增 · 关键）

### 12.1 位置

```python
PLANT_L_CX = 530    # 左盆中心 x（柜与椅之间）
PLANT_R_CX = 1070   # 右盆中心 x
PLANT_BASE_Y = 740  # 盆底 y（地板上）

# 左盆：大叶绿萝（陶土盆 + 心形垂叶 + 藤蔓）
# 右盆：龟背竹（白陶瓷盆 + 大叶 + 网状孔）
```

### 12.2 左盆 · 大叶绿萝

```python
颜色:
  POT_TERRACOTTA = (180, 95, 65)
  POT_DARK = (140, 65, 40)
  LEAF_GREEN_LT = (130, 195, 130)
  LEAF_GREEN = (95, 165, 95)
  VINE_GREEN = (110, 175, 100)

盆: 梯形（顶宽 50，底宽 38，高 50）
盆口环: y=base_y-6 到 y=base_y+4

藤蔓（3 条向上）:
  vine_1: 4 段折线，从盆底到左上 (cx-60, base_y-110)
  vine_2: 4 段折线，从盆底到上方 (cx+10, base_y-120)
  vine_3: 4 段折线，从盆底到右上 (cx+55, base_y-100)
  每段连接处有心形叶（14-15px）

下垂藤（2 条）:
  drop_l: 3 段，向左下 (cx-40, base_y+38)
  drop_r: 3 段，向右下 (cx+38, base_y+40)
```

### 12.3 右盆 · 龟背竹

```python
颜色:
  POT: 白陶瓷 (245, 240, 230)
  LEAF_GREEN_DK = (65, 130, 65)

盆: 梯形（顶宽 55，底宽 45，高 55）
盆: 白陶瓷 + 灰色侧面阴影

5 片大叶（split-leaf 形状）:
  叶 1: (cx-50, base_y-50), size=38, angle=-25, 深绿
  叶 2: (cx+45, base_y-60), size=40, angle=30, 中绿
  叶 3: (cx-10, base_y-95), size=42, angle=-10, 中绿
  叶 4: (cx+25, base_y-120), size=38, angle=15, 浅绿
  叶 5: (cx-40, base_y-130), size=36, angle=-20, 中绿

每片叶子有 18 个折点，模拟龟背竹的分裂叶形
每片叶子有茎从盆口延伸到叶中心
```

### 12.4 React 实现策略

**推荐方案**：把两盆植物**画成 SVG 文件**，作为静态资产：

```tsx
<img
  src="/assets/home/plants/plant_pothos.svg"
  className="plant plant-left"
  style={{
    position: 'absolute',
    left: '31.25%',  // 500/1600
    top: '54%',      // (740-200)/1000，盆顶位置
    width: '7.5%',   // 120/1600
    height: '20%',   // 200/1000
    transformOrigin: 'bottom center',
    animation: 'plant-sway 4s ease-in-out infinite',
  }}
/>
```

**SVG 模板** · 大叶绿萝（参考 Python 实现，简化为 SVG）：
```svg
<svg viewBox="0 0 120 200" xmlns="http://www.w3.org/2000/svg">
  <!-- Shadow under pot -->
  <ellipse cx="60" cy="190" rx="40" ry="6" fill="rgba(0,0,0,0.3)" />

  <!-- Pot -->
  <path d="M35 140 L85 140 L80 185 L40 185 Z" fill="#B45F41" />
  <rect x="32" y="134" width="56" height="10" fill="#8C4128" rx="2" />
  <ellipse cx="60" cy="138" rx="22" ry="4" fill="#32231A" />

  <!-- Pot highlight -->
  <path d="M38 144 L43 144 L45 180 L42 180 Z" fill="#D28260" />

  <!-- Vine 1 (left up) -->
  <g class="plant-leaves" style="transform-origin: 60px 140px;">
    <polyline points="50,135 35,110 15,70 0,30"
              stroke="#6EAF64" stroke-width="2" fill="none" />
    <!-- Heart leaves on vine 1 -->
    <use href="#heart-leaf" transform="translate(35,110) rotate(-30) scale(1)" fill="#5FA55F" />
    <use href="#heart-leaf" transform="translate(15,70) rotate(-30) scale(1)" fill="#5FA55F" />
    <use href="#heart-leaf" transform="translate(0,30) rotate(-30) scale(1)" fill="#5FA55F" />

    <!-- Vine 2, 3, drop_l, drop_r ... 同样的结构 -->
  </g>

  <!-- Heart leaf shape definition -->
  <defs>
    <path id="heart-leaf" d="M0,-14 L8,-10 L12,-1 L6,7 L0,10 L-6,7 L-12,-1 L-8,-10 Z" />
  </defs>
</svg>
```

### 12.5 摇曳动画

```css
@keyframes plant-sway {
  0%, 100% { transform: rotate(-1deg); }
  50%      { transform: rotate(1.5deg); }
}

.plant {
  animation: plant-sway 4s ease-in-out infinite;
  transform-origin: bottom center;
}
```

---

## 13. 桌子（v4 关键改动 · 深胡桃木）

```python
DESK_TOP_Y = 870
desk_x1 = 40       # 左边距
desk_x2 = 1560     # 右边距

层次:
  - 桌面顶部 (870-884): #A07050 浅
  - 桌面中部 (884-894): #8B5A2B 深胡桃
  - 桌面前边缘 (894-900): #3E2614 深棕黑
  - 桌前面板 (900-940): #5C3920 深棕（v4 压缩到 40px 高）

阴影:
  - 桌面下方有 4px 高的阴影投在墙面（黑色 70 alpha）

木纹:
  - 桌面顶 6 条横向极细线 (y=872, 874, ..., 882)
  - 桌前 2 条横向线条 (y=920, 945)
```

**React + CSS 实现**：
```tsx
<div className="desk" style={{ position: 'absolute', left: '2.5%', right: '2.5%', top: '87%', bottom: 0 }}>
  {/* Desk top */}
  <div className="desk-top" style={{
    height: '14px',
    background: 'linear-gradient(180deg, #A07050 0%, #8B5A2B 100%)',
    /* Wood grain overlay */
    backgroundImage: `
      linear-gradient(180deg, #A07050 0%, #8B5A2B 100%),
      repeating-linear-gradient(0deg, transparent, transparent 1px, #A07050 1px, #A07050 2px)
    `,
  }} />

  {/* Desk edge (dark line) */}
  <div style={{ height: '6px', background: '#3E2614' }} />

  {/* Front panel */}
  <div className="desk-front" style={{
    height: 'calc(100% - 20px)',
    background: '#5C3920',
  }} />
</div>
```

---

## 14. 桌面摆件

### 14.1 台灯（左 · 复古绿罩）

```python
lamp_x = 220
lamp_base_y = 884 (桌面顶+14)

部件:
  - 底座椭圆 44×12 (#3C3C46)
  - 底座盖 36×8 (#5A5A64)
  - 摇臂 1: 直线 (220, 878) → (255, 814) 粗 4
  - 摇臂 2: 直线 (255, 814) → (290, 839) 粗 4
  - 关节圆点 (#282832)
  - 灯罩四边形（绿色 #4B8265）
  - 灯罩高光（浅绿 #73A587）
  - 灯光晕（黄色 alpha 105，blur 28）
```

### 14.2 笔记本（中前 · 打开的作业本）

```python
nb_x = chair_cx - 110 = 690
nb_y = 896
nb_w = 220, nb_h = 28

部件:
  - 书本主体（梯形，浅米 #FCF8EE）
  - 中央书脊（细线 #D2C8B4）
  - 左页 3 条横线（铅笔灰）
  - 右页 3 条蓝色线条（不同长度）
  - 铅笔（黄色 #FFC83C + 红色橡皮头）
```

### 14.3 地球仪（右 · 经典蓝绿）

```python
globe_cx = chair_cx + 240 = 1040
globe_cy = 840

部件:
  - 木质底座方块 (75-55, 880, 75+55, 892) #4B371F
  - 立柱（细线，从底座到球顶下方 40px）
  - 金色环（赤道）#AF8228 width=3
  - 球体（蓝色 #4B91D7）半径 36
  - 大陆（绿色 #78B464 不规则多边形）
  - 高光（浅蓝白色椭圆，左上）
```

### 14.4 相框（最右 · 装饰物）

```python
frame_cx = W - 220 = 1380
frame_cy = 845
frame_w = 60, frame_h = 70

部件:
  - 外框深木 #583C24
  - 内框浅木 #BE9669
  - 衬纸 #FFFCF5
  - 中心 5 角星（金色，r 内 4，r 外 10）
```

---

## 15. 底部状态条

```python
bar_h = 60
bar_y = 940
bg = (255, 252, 245, 220)

左侧:
  - 5 角星 (x=50, y=970, r=10) 金色
  - 文字 "361 积分" (x=70, y=961, size=18)

右侧:
  - 按钮 (200×40) 位于 (W-230, 950)
  - 黄色 2.5D 效果（背后阴影偏移 4px）
  - 购物袋图标 (18×22) 黑色绘制
  - 文字 "装饰商店" 内黑色
```

**React 实现**：
```tsx
<footer className="study-status-bar" style={{
  position: 'absolute',
  bottom: 0, left: 0, right: 0,
  height: '6%',
  background: 'rgba(255, 252, 245, 0.86)',
  borderTop: '1px solid #C8B496',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 30px',
}}>
  <div className="points-display">
    <StarIcon fill="var(--acc-gold)" stroke="var(--acc-gold-dark)" size={20} />
    <span className="study-num" style={{ marginLeft: 12, fontSize: 18 }}>361 积分</span>
  </div>

  <button className="shop-btn" style={{
    width: 200, height: 40,
    background: 'var(--acc-gold)',
    boxShadow: '0 4px 0 var(--acc-gold-dark)',
    borderRadius: 14,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
    color: 'var(--study-ink)',
    fontSize: 17,
  }}>
    <ShoppingBagIcon size={18} />
    装饰商店
  </button>
</footer>
```

---

## 16. 图层顺序（z-index 关键）

确保渲染时各元素正确叠加：

| z-index | 元素 |
|---|---|
| 1 | 墙面 |
| 2 | 窗光斜射 |
| 3 | 顶部环境光 |
| 4 | 装饰条 + 画轨 |
| 5 | 地板 |
| 10 | 三幅画 |
| 11 | 柜子地板阴影 |
| 12 | 三个柜子 |
| 13 | 柜内陈列品 |
| 14 | 柜子玻璃反光 |
| 15 | 绿植 |
| 18 | 椅子地板阴影 |
| 19 | 椅子 |
| **20** | **肥仔（关键，要在椅子之前）** |
| 21 | 桌子阴影 |
| 22 | 桌子 |
| 23 | 桌面摆件 |
| 50 | 台灯光晕 |
| 100 | 顶部导航 |
| 100 | 底部状态条 |

---

## 17. 一致性验收清单

实现完成后，对比 mockup 检查以下 10 项：

| # | 检查项 | 通过标准 |
|---|---|---|
| 1 | 整体配色 | 暖白墙占 60%，木色 30%，焦点 10% |
| 2 | 三柜风格差异 | 经典/现代/趣味，肉眼可辨 |
| 3 | 中央科比海报 | 能看到 24 号球衣 + 棕榈树 + 夕阳 |
| 4 | 柜子落地 | 每柜有底座、装饰脚、地板阴影 |
| 5 | 木地板 | 横向板缝清晰，错落自然 |
| 6 | 椅背宽 | 360px，宽于肥仔，两侧明显露出 |
| 7 | 肥仔可见 | 完整脸+腮红+嘴+小手 |
| 8 | 桌子颜色 | 深胡桃木，比地板明显深一档 |
| 9 | 两盆绿植 | 左绿萝（垂蔓）+ 右龟背竹（直立大叶） |
| 10 | 收藏数文案 | "收藏 N 件" 三个柜子下方都有 |

**最终验收**：把 Claude Code 实现的截图和 mockup 并排，10 项中至少 9 项通过。

---

**END** · 这份对照表让 Claude Code 能精确复现 mockup 的每个细节。
配合 `render_study_v4_final.py`（Python 渲染代码）作为像素级参考。
