# 肥仔的书房 · 最终设计方案

> **版本**：v4.0 Final（合并 v1 + v4 修订）
> **状态**：可直接交付 Claude Code 执行
> **预计工期**：5-6 周业余时间

---

# 目录

1. [项目背景](#1-项目背景)
2. [整体布局](#2-整体布局)
3. [Design Tokens（完整代码）](#3-design-tokens完整代码)
4. [视觉元素详细规格](#4-视觉元素详细规格)
5. [收藏内容清单](#5-收藏内容清单)
6. [交互行为](#6-交互行为)
7. [数据模型（TypeScript）](#7-数据模型typescript)
8. [资产清单](#8-资产清单)
9. [实施路线图](#9-实施路线图)
10. [Claude Code 使用指南](#10-claude-code-使用指南)
11. [边界声明](#11-边界声明)

---

# 1. 项目背景

## 这是什么

**肥仔的书房**是肥仔大闯关的"第二战场"——

- 第一战场（现有）：日常做作业 → 拿积分 → 升段位（驱动当下行为）
- **第二战场（新增）：积分 → 收藏 → 陈列 → 看见自己积累的力量**（驱动长期留存）

设计灵感：博物馆 + 工作室 + 日式收藏屋。
情感目标：让儿子打开 app 后**想多看几眼**，离开后**想着自己的柜子又添了什么**。

## 设计原则

1. **空间感优先**：60-30-10 配色（墙 60%，木质 30%，焦点 10%）
2. **真实家装感**：柜子落地、画挂墙、有底座、有阴影
3. **个人化**：中央偶像海报、椅背随角色变化
4. **收藏成长性**：橱窗只看一部分，点击进入看全部
5. **温馨治愈**：暖橙调全天不切换，区别于主产品的日/夜切换

## 不做什么（明确边界）

- ❌ 不做装修（家具搬动、自由摆放）
- ❌ 不做心愿单（不打通现实购买）
- ❌ 不做任务委托（不引入 NPC 系统）
- ❌ 不做多个房间（只一个书房）
- ❌ 不做绿植养成（浇水/开花）
- ❌ 不做用户上传偶像图（v4.1 再做）

---

# 2. 整体布局

## 2.1 视角

**正面视角** — 摄像机在书桌前方对着肥仔，肥仔正脸朝向观众。

## 2.2 图层结构（从远到近）

```
图层 1 · 墙面（暖白渐变 + 细微纹理）
图层 2 · 装饰条 + 画轨
图层 3 · 三幅画（挂在墙上）
图层 4 · 木地板（横向木纹，明显的"地面"）
图层 5 · 三个收藏柜（落地 + 底座 + 地板阴影）
图层 6 · 桌后绿植（左大叶绿萝 + 右龟背竹）
图层 7 · 椅背（深棕皮革办公椅）
图层 8 · 肥仔（露出脸 + 肩 + 上半身）
图层 9 · 桌子（深胡桃木，前景）
图层 10 · 桌面摆件（4 件核心 + 可购买）
图层 11 · 顶部 nav + 底部 status bar
图层 12 · 光线（顶部 ambient + 左上斜光 + 柜内聚光 + 台灯局部光）
```

## 2.3 屏幕分区（1600 × 1000 桌面 / 16:10）

| 区域 | y 范围 | 高度 | 内容 |
|---|---|---|---|
| 顶部 nav | 0-60 | 60 | [← 退出] 标题 [⚙ 设置] |
| 墙顶留白 | 60-180 | 120 | 大面积墙面 + 顶部装饰条 |
| 画区 | 180-310 | 130 | 3 幅画 + 画轨挂绳 |
| 画下留白 | 310-380 | 70 | 墙面空间 |
| 柜子 | 380-685 | 305 | 3 柜（中柜略宽，比例 1:1.3:1） |
| 地板（柜后到椅前） | 685-720 | 35 | 绿植在此区域内 |
| 椅子 | 720-870 | 150 | 椅背 |
| 肥仔 | 600-860 | 260 | 上半身（脸+肩+一点身体） |
| 桌面 | 870-906 | 36 | 桌面顶部（深胡桃木） |
| 桌前面板 | 906-940 | 34 | 桌前侧（压缩，让椅子下沿可见） |
| 底部 bar | 940-1000 | 60 | ⭐ 积分 + [装饰商店] 按钮 |

## 2.4 柜子横向布局

```
x = 80    455    575    1025   1145    1520
    │      │      │      │      │      │
    │ 左柜 │ 间隙 │ 中柜 │ 间隙 │ 右柜  │
    │ 375  │ 120  │ 450  │ 120  │ 375   │
```

- 左右边距：80px
- 柜间距：120px（呼吸空间）
- 中柜略宽（放偶像海报和乐高）：1:1.3:1

---

# 3. Design Tokens（完整代码）

## 3.1 把这段 CSS 加到全局样式（或 Tailwind config）

```css
:root {
  /* ===== Wall (60% — warm white dominant) ===== */
  --study-wall-top:        #FAF6EF;
  --study-wall-bot:        #F4EEE2;

  /* ===== Floor (wooden) ===== */
  --study-floor-light:     #D7B991;
  --study-floor-mid:       #BE9B73;
  --study-floor-dark:      #9B7850;
  --study-floor-grain:     #AA875F;
  --study-floor-deep:      #826441;
  --study-floor-line:      #B49164;  /* wall-floor transition */

  /* ===== Wood tones (30%) ===== */
  --study-wood-dark:       #583C24;
  --study-wood-mid:        #8C6441;
  --study-wood-light:      #BE9669;
  --study-wood-highlight:  #E1BE91;
  --study-pic-rail:        #BEA582;
  --study-ceiling-trim:    #DCC8A5;

  /* ===== Cabinet · Classic (left, trophy) ===== */
  --cab-classic-frame:     #734B2D;
  --cab-classic-dark:      #4B301C;
  --cab-classic-inner:     #3A2619;

  /* ===== Cabinet · Modern (center, lego) ===== */
  --cab-modern-frame:      #D7D7DC;
  --cab-modern-frame-dk:   #AFAFB9;
  --cab-modern-inner:      #262830;
  --cab-modern-inner-lt:   #343741;
  --cab-modern-led:        #FFF0C8;  /* LED strip warm white */

  /* ===== Cabinet · Playful (right, toy) ===== */
  --cab-playful-frame:     #DCB496;
  --cab-playful-frame-dk:  #AF8764;
  --cab-playful-inner:     #5A3C50;

  /* ===== Desk (V4: DEEP walnut to separate from floor) ===== */
  --study-desk-top:        #8B5A2B;
  --study-desk-top-light:  #A07050;
  --study-desk-edge:       #3E2614;
  --study-desk-front:      #5C3920;
  --study-desk-grain:      #A07050;

  /* ===== Chair (premium leather) ===== */
  --study-chair-leather:   #3E2A1C;
  --study-chair-highlight: #695032;
  --study-chair-stitch:    #5A3C23;
  --study-chair-emblem:    #F0C350;

  /* ===== Accent colors (10%) ===== */
  --acc-gold:              #F0C350;
  --acc-gold-light:        #FFE182;
  --acc-gold-dark:         #AF8228;
  --acc-silver:            #D2D7E1;
  --acc-silver-light:      #F0F2F8;
  --acc-silver-dark:       #8C919B;
  --acc-bronze:            #C88246;
  --acc-bronze-light:      #E1A569;
  --acc-bronze-dark:       #8C5523;
  --acc-locked:            #4E463E;
  --acc-fatboy:            #F4C752;  /* main hero color */

  /* ===== Lighting ===== */
  --study-warm-glow:       rgba(255, 215, 155, 0.4);
  --study-window-beam:     rgba(255, 235, 175, 0.3);
  --study-spot-warm:       rgba(255, 220, 150, 0.5);
  --study-lamp-glow:       rgba(255, 220, 130, 0.55);

  /* ===== Shadows ===== */
  --shadow-cabinet:        0 12px 24px rgba(40, 25, 12, 0.25);
  --shadow-cabinet-floor:  0 8px 16px rgba(0, 0, 0, 0.3);
  --shadow-desk:           0 -2px 8px rgba(0, 0, 0, 0.2);
  --shadow-chair:          0 6px 12px rgba(0, 0, 0, 0.3);

  /* ===== Text ===== */
  --study-ink:             #34281C;
  --study-ink-muted:       #87735A;
  --study-paper:           #FFFCF5;

  /* ===== Geometry ===== */
  --study-radius-sm:       4px;
  --study-radius-md:       12px;
  --study-radius-lg:       24px;
  --study-radius-xl:       36px;
}
```

## 3.2 字体

```css
@import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&display=swap');

:root {
  --study-font-title: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --study-font-num:   'Fredoka', sans-serif;
}

.study-num {
  font-family: var(--study-font-num);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```

## 3.3 动画缓动

```css
:root {
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-soft:      cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
}
```

---

# 4. 视觉元素详细规格

## 4.1 墙面 + 地板

### 墙面（顶部到 y=685）

- 渐变：`var(--study-wall-top)` → `var(--study-wall-bot)`
- 细微暖色斑点纹理（每屏 ~800 个，alpha 8-25%）
- 顶部装饰条：y=60 处 4px 高的 `--study-ceiling-trim`
- 画轨：y=165 处 5px 高的 `--study-pic-rail`，画从此处挂绳垂下

### 墙地交界线（y=685-690）

- y=685-689: `var(--study-floor-line)` 4px 厚（阴影线）
- y=690 + 2px: 更深的转折线

### 地板（y=690 → bottom）

- 垂直渐变：浅木 (`#D7B991`) → 深木 (`#9B7850`)（远到近）
- 横向板缝：每 30-50px 一道，错落分布的纵向接缝
- 5-6 行板缝，模拟透视

## 4.2 三幅画

### 共同规格

- 尺寸：210 × 130（左右）/ 260 × 130（中）
- 画框 3 层：
  - 外框：`var(--study-wood-dark)` 10px 厚
  - 中框：`var(--study-wood-mid)` 4px 厚
  - 内框：`var(--study-wood-light)` 3px 厚
- 衬纸（mat）：`var(--study-paper)` 6px 内边距
- 画轨挂绳：从画顶中央分别拉向画轨 y=165 处的两个点

### 左画 · "荣耀"主题

- SVG 绘制
- 内容：金桂冠 + 中央 5 角星
- 渐变背景：淡黄 → 米色

### 中画 · 偶像海报（用户上传）

- **路径**：`/src/assets/home/paintings/center_hero.jpg`
- 推荐尺寸：800 × 500
- `object-fit: cover`，充满画框内部
- 默认图：科比投篮夕阳油画（Frank 已提供）

### 右画 · "探索"主题

- SVG 绘制
- 内容：星空 + 月亮 + 火箭升空
- 渐变背景：深蓝 → 紫蓝

## 4.3 三个收藏柜（差异化）

### 左柜 · 经典实木（奖杯柜）

- 雕花顶饰（pediment）：弧形拱顶 + 金色徽章
- 玻璃门 + 中央铜质拉手（位于柜身下 1/3，不挡奖杯）
- 内部背景：深棕红木 `--cab-classic-inner`
- 底部铜质标牌："收藏 8 件"
- 底座：宽于柜身，带 2 个方形装饰脚
- 内部 3 层木架，每层 3 个奖杯槽位（橱窗显示 9 个）

### 中柜 · 现代极简（乐高柜）

- 银灰金属框 + 圆角
- 顶部 LED 灯带（暖白光，向下扩散光晕）
- 内部深灰冷色：`--cab-modern-inner`
- 无形玻璃门（frameless）
- 底部金属标牌："收藏 4 件"
- 底座：金属感简洁脚
- 内部 4 行 × 2 列 = 8 个槽位（橱窗显示）

### 右柜 · 趣味（玩具柜）

- 弧形拱顶（圆弧）
- 暖紫红内衬：`--cab-playful-inner`
- 可见木质层板（不被玻璃挡）
- 底部木质标牌："收藏 4 件"
- 底座：圆形装饰脚（"卡通腿"）
- 内部 3 行 × 3 列 = 9 个槽位（橱窗显示）

### 三柜共同细节

- 顶部投影：投在墙上的轻阴影
- 底座下：投在地板上的椭圆阴影（`box-shadow: var(--shadow-cabinet-floor)`）
- 玻璃反光：两道斜向白光，opacity 22-28%
- 内部聚光灯：顶部椭圆暖色光晕

## 4.4 桌后绿植（V4 新增）

### 位置

```
x = 540 (左盆中心) / 1060 (右盆中心)
y = 720 (盆底，地面)
高度 150-180px
```

### 默认 2 盆（开局免费）

- **左 · 大叶绿萝**：陶土盆 + 心形垂叶 + 自然下垂的藤蔓
- **右 · 龟背竹**：陶土盆 + 大圆叶 + 网状孔洞

### 微动效

```css
.study-plant-leaves {
  transform-origin: bottom center;
  animation: study-plant-sway 4s ease-in-out infinite;
}

@keyframes study-plant-sway {
  0%, 100% { transform: rotate(-1deg); }
  50%      { transform: rotate(1.5deg); }
}
```

### 图层位置

绿植在**柜子之后、椅子之前**——可以轻微遮挡椅子左右边缘。

## 4.5 椅子（深棕皮革办公椅）

### 尺寸

- 宽度：360px（v2 同款，稳重）
- 高度：150px
- 顶部 y：720
- 中心 x：W/2 = 800

### 设计

- 外层皮革：`var(--study-chair-leather)`
- 内层填充：`var(--study-chair-highlight)`
- 6 道纵向车线（vertical stitching）：offsets [-90, -55, -20, 20, 55, 90]
- 顶部头枕填充段：距顶 18-56px 之间的 padded section
- 中央金色徽章：椭圆 16×16，渐变金色
- 圆角：顶部 24px / 底部 36px（让肥仔头不被夹）

### 阴影

地板椭圆阴影，blur 6px，alpha 0.35。

## 4.6 肥仔

### 尺寸与位置

- 大小：260px（保持现有 v4 资产）
- y 起点：**600**（脸+肩+一点身体都露出）
- 状态：永远 default（书房是避风港）
- 椅背在肥仔身后，宽于肥仔，露出两侧

### 角色联动

肥仔的角色（赛车手 / 宇航员 / 海盗等）**跟随主产品的角色选择**。
椅背风格也随角色变化（v4 先做 default，其他后续）。

## 4.7 桌子（V4 深胡桃木）

### 尺寸（保持 v3 横贯）

- x 范围：40 → W-40（横贯几乎全屏）
- 桌面顶：y=870-906（高 36px）
- 桌前面板：y=906-940（高 34px，从 v3 的 70px 压缩）

### 颜色（V4 改深）

```css
.study-desk-top {
  background: linear-gradient(180deg,
    var(--study-desk-top-light) 0%,
    var(--study-desk-top) 100%);
}
.study-desk-front {
  background: var(--study-desk-front);
}
```

### 木纹细节

- 桌面顶 6 条横向极细线（`var(--study-desk-grain)`）
- 桌前 2-3 条横向线条

## 4.8 桌面摆件

### 4 个固定位置 + 4 个可购买槽位

| 位置 | 默认物品 | 可替换 |
|---|---|---|
| 桌左（x=200） | 复古绿罩台灯 | 是 |
| 桌中前（x=W/2 偏左） | 打开的笔记本+铅笔 | 否（默认） |
| 桌中右（x=W/2+250） | 地球仪 | 是 |
| 桌右（x=W-200） | 小植物（仙人掌） | 是 |

后续可购买：复古时钟、计算器、相框、宇航员手办、小机器人、笔筒等。

---

# 5. 收藏内容清单

## 5.1 奖杯（共 35 个，分 3 档）

### 段位奖杯（7 个，跟随段位系统自动解锁）

| ID | 段位 | 形态 | 触发 |
|---|---|---|---|
| `rookie` | 新兵 | 木质徽章 | 默认拥有 |
| `bronze` | 青铜 | 生锈的剑 | 累计 100 ⭐ |
| `silver` | 白银 | 圆盾 | 累计 300 ⭐ |
| `gold` | 黄金 | 王冠 | 累计 700 ⭐ |
| `platinum` | 铂金 | 一对翅膀 | 累计 1500 ⭐ |
| `diamond` | 钻石 | 水晶球 | 累计 3000 ⭐ |
| `legend` | 传奇 | 凤凰雕像 | 累计 6000 ⭐ |

### 挑战奖杯（20 个，特殊条件）

| ID | 名称 | 故事 | 触发 |
|---|---|---|---|
| `first_kill` | 首胜徽章 | "第一只小怪倒下时" | 完成第 1 个任务 |
| `dawn` | 晨光徽章 | "清晨第一缕光看见你正在战斗" | 连续 5 天 7 点前完成 |
| `night_owl` | 夜行者徽章 | "星星都为你照路" | 3 次 22 点前完成所有 |
| `iron_will` | 铁人徽章 | "雷打不动的肥仔" | 连续 30 天不缺勤 |
| `perfectionist` | 完美主义徽章 | "这一天没有一颗星暗淡" | 单日所有"完美"评分 |
| `master_zh` | 语文大师 | "语言的力量" | 累计 100 个语文任务 |
| `master_math` | 数学大师 | "算无遗策" | 累计 100 个数学任务 |
| `master_en` | 英语大师 | "通晓四方" | 累计 100 个英语任务 |
| `speedster` | 速度之神 | "比闪电还快" | 5 次预估时间一半内完成 |
| `veteran` | 老司机徽章 | "你已经是这个领域的老手" | 累计 500 个任务 |
| ... | （其余 10 个由 Frank 后续补） |

### 隐藏奖杯（9 个，不告知触发条件）

| ID | 名称 | 触发（不展示） |
|---|---|---|
| `midnight_warrior` | 夜半侠 | 23:00-01:00 完成任务 |
| `birthday_hero` | 生日勇士 | 生日当天完成所有任务 |
| `rainy_day` | 雨天战士 | 下雨日完成所有任务 |
| `sick_warrior` | 病榻勇士 | 标记"生病但还是做了" |
| `parent_combo` | 家长助攻 | 7 天家长 1 小时内评分 |
| `comeback` | 王者归来 | 中断 7+ 天后重新开始连击 |
| `marathon` | 马拉松 | 单日完成 ≥ 6 个任务 |
| `early_bird` | 早起之鹰 | 6 点前完成第一只小怪 |
| `secret` | ??? | (Frank 自定义) |

## 5.2 乐高（12 件，Frank + 爱人精选）

| 档次 | 价格区间 | 积分 | 数量 |
|---|---|---|---|
| 入门 | 200 元以下 | 20-30 ⭐ | 4 款 |
| 进阶 | 200-600 元 | 30-60 ⭐ | 4 款 |
| 高级 | 600-1500 元 | 60-150 ⭐ | 3 款 |
| 旗舰 | 1500+ 元 | 150+ ⭐ | 1 款（如法拉利 SF90） |

**积分换算公式**：现实价格 ÷ 10 = 积分价格

**资产**：用户提供 12 张实物照片（去背景 + 暖光叠加 + 圆角剪裁）

## 5.3 玩具（12 件）

| 类型 | 价格区间 |
|---|---|
| 公仔 / 手办 | 10-30 ⭐ |
| 遥控车 / 模型 | 30-50 ⭐ |
| 收藏卡 / 摆件 | 20-40 ⭐ |
| 智力玩具 | 15-30 ⭐ |

## 5.4 桌面摆件（8-12 件，SVG 绘制）

| 槽位 | 候选物品 |
|---|---|
| 台灯 | 复古绿罩 / 北欧木质 / 未来 LED |
| 笔筒 | 蓝色含彩色铅笔 |
| 地球仪 | 经典手摇 / 电子发光 |
| 相框 | 全家福 / 励志语录 |
| 角落小件 | 小植物 / 宇航员手办 / 机器人 / 时钟 / 沙漏 |

## 5.5 绿植（8 种，V4 新增）

| ID | 名称 | 价格 | 形态 | 默认 |
|---|---|---|---|---|
| `plant_pothos` | 大叶绿萝 | 0 ⭐ | 垂蔓 + 心形叶 | ✅ |
| `plant_monstera` | 龟背竹 | 0 ⭐ | 大叶 + 网状孔 | ✅ |
| `plant_cactus` | 沙漠仙人掌 | 20 ⭐ | 圆柱 + 红花 |  |
| `plant_lavender` | 薰衣草盆 | 40 ⭐ | 紫色花穗 |  |
| `plant_moss` | 苔玉 | 30 ⭐ | 圆球苔藓挂件 |  |
| `plant_fiddle` | 琴叶榕 | 60 ⭐ | 大圆叶 + 树形 |  |
| `plant_lemon` | 小柠檬树 | 80 ⭐ | 树形 + 黄果实 |  |
| `plant_bonsai` | 迷你松柏盆景 | 100 ⭐ | 弯曲松枝 |  |

## 5.6 墙画（3 幅固定）

| 位置 | 主题 | 是否可替换 |
|---|---|---|
| 左 | 荣耀（金桂冠） | 否（v1 固定 SVG） |
| 中 | 偶像海报 | 否（v1 固定用户图） |
| 右 | 探索（星空火箭） | 否（v1 固定 SVG） |

> v4.1 可考虑加入"画作商店"——用户上传自定义偶像图或购买更多画。

---

# 6. 交互行为

## 6.1 进入书房

**入口位置**：主产品首页底部（不抢戏的小卡片，红点提示新奖杯）

**进入动画（1 秒）**：
```
T+0.0s  当前页淡出
T+0.5s  黑屏（短暂转场）
T+0.5s  书房从黑屏淡入 + "推开门"音效
T+1.0s  完全显示，肥仔挥手/眨眼
```

## 6.2 退出书房

点击左上 [← 退出]：
- 0.2s 内淡出 + "关门"音效
- 返回到进入书房前的页面

## 6.3 点击柜子 → 全屏陈列页（V4.1 实现）

> **重要**：这是 v4 之后的子页面，**v4 主页面先实现"点击柜子" → 弹出 modal 显示完整网格**。
> v4.1 再升级为独立路由 + 滑动浏览 + 详细筛选。

### V4 简易版（modal）

```
点击柜子（任意位置） → 0.3s spring 放大铺满屏幕
  → 显示完整网格（如奖杯 5×7=35 / 乐高 4×3=12 / 玩具 4×3=12）
  → 已解锁的可点击看详情
  → 锁定的点击显示提示
  → 点击空白处或返回按钮关闭
```

## 6.4 点击单品 → 详情卡

### 奖杯详情卡

```
┌─────────────────────────────────┐
│                                 │
│      [大版奖杯图 200×200]        │
│      (附带稀有度光环)            │
│                                 │
│      ✨ 晨光徽章                 │
│   "清晨第一缕光看见你正在战斗"     │
│                                 │
│   ─────────────────────────     │
│   获取时间   2026年4月3日 6:48   │
│   触发条件   连续 5 天 7 点前完成 │
│   稀有度    ⭐⭐⭐ 罕见           │
│                                 │
│         [关闭]                  │
└─────────────────────────────────┘
```

### 乐高 / 玩具详情卡

```
┌─────────────────────────────────┐
│      [产品照片 360×240]          │
│                                 │
│   法拉利 SF90 Stradale          │
│   LEGO #42153                   │
│                                 │
│   1080 件 · 10-14 岁 · 高级款    │
│                                 │
│   [家长留言 - 可选]              │
│   "这是你 8 岁生日爸爸答应你的"   │
│                                 │
│   ─────────────────────────     │
│   购买时间  2026年5月13日        │
│   花费     140 ⭐                │
└─────────────────────────────────┘
```

## 6.5 装饰商店

- 底部右下角的黄色 2.5D 按钮
- 进入商店页（独立路由 `/home/shop`）
- 商店内分 4 个 tab：**乐高 / 玩具 / 摆件 / 绿植**
- 已拥有的灰显 + "✓ 已收藏"
- 积分够的高亮 + "立即收藏"
- 积分不够的显示进度条

## 6.6 绿植 / 摆件切换

进入装饰商店 → 选"绿植"或"摆件" → 切换到"我的"tab → 看到所有已购买
- 点击未在使用的：弹出"放到哪边？[桌左] [桌右]"
- 点击在使用的：高亮显示"当前桌左 / 桌右"

## 6.7 触觉与音效（移动端）

- 进入书房：100ms 振动 + "门"音效
- 点击柜子：60ms 振动 + "玻璃门"音效
- 解锁奖杯：[100, 50, 200] 振动 + 庆祝音效
- 购买物品：50ms 振动 + "咔嗒"落地音效

---

# 7. 数据模型（TypeScript）

## 7.1 完整接口定义

```typescript
// /src/types/home.ts

export type TrophyRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemCategory = 'lego' | 'toy' | 'desk_item' | 'plant';
export type DeskItemSlot = 'lamp' | 'pen_cup' | 'notebook' | 'globe' | 'frame' | 'corner';
export type PlantSlot = 'left' | 'right';

/**
 * Trophy catalog (35 predefined trophies)
 */
export interface Trophy {
  id: string;
  name: string;
  story: string;             // 故事文案
  rarity: TrophyRarity;
  category: 'rank' | 'challenge' | 'hidden';
  hidden_until_unlock: boolean;  // hidden 类的奖杯
  trigger_description: string;   // 触发条件说明（hidden 类不显示）
  check_unlock: (user: User, event?: any) => boolean;  // 解锁判定函数
}

/**
 * Lego / Toy catalog item
 */
export interface ShopItem {
  id: string;
  category: 'lego' | 'toy' | 'desk_item' | 'plant';
  name: string;
  name_en?: string;
  code?: string;             // for lego: #42153
  price_points: number;
  price_real_rmb?: number;   // for lego
  pieces?: number;           // for lego
  age_range?: string;        // for lego
  image_url: string;         // /assets/home/{category}/{id}.png
  description: string;
  parent_note?: string;      // 家长留言（可选）
  tags: string[];
  default_owned?: boolean;   // for plant: default 2 plants
  slot_type?: DeskItemSlot | PlantSlot;  // 限定槽位
}

/**
 * User's collection state
 */
export interface UserHomeCollection {
  user_id: string;

  trophies: Array<{
    id: string;
    unlocked_at: string;     // ISO date
  }>;

  legos_owned: Array<{
    id: string;
    purchased_at: string;
    points_paid: number;
  }>;

  toys_owned: Array<{
    id: string;
    purchased_at: string;
    points_paid: number;
  }>;

  desk_items_owned: string[];
  desk_items_active: Array<{
    slot: DeskItemSlot;
    item_id: string;
  }>;

  plants_owned: Array<{
    id: string;
    purchased_at: string;
  }>;
  plants_active: Array<{
    slot: PlantSlot;
    plant_id: string;
  }>;
}

/**
 * Painting catalog (v4 固定 3 幅)
 */
export interface Painting {
  position: 'left' | 'center' | 'right';
  type: 'svg' | 'image';
  src: string;               // svg path or image url
}
```

## 7.2 解锁逻辑（关键代码）

```typescript
// /src/lib/home/trophy-checker.ts

import { TROPHY_CATALOG } from './catalog';
import { UserHomeCollection } from '@/types/home';

export function checkAndUnlockTrophies(
  user: User,
  collection: UserHomeCollection,
  event: TaskCompletedEvent
): Trophy[] {
  const newlyUnlocked: Trophy[] = [];

  for (const trophy of TROPHY_CATALOG) {
    // Skip if already unlocked
    if (collection.trophies.find(t => t.id === trophy.id)) continue;

    // Check unlock condition
    if (trophy.check_unlock(user, event)) {
      collection.trophies.push({
        id: trophy.id,
        unlocked_at: new Date().toISOString(),
      });
      newlyUnlocked.push(trophy);
    }
  }

  return newlyUnlocked;
}
```

## 7.3 购买流程

```typescript
// /src/lib/home/shop.ts

export async function purchaseItem(
  user: User,
  collection: UserHomeCollection,
  item: ShopItem
): Promise<{ success: boolean; error?: string }> {
  // 1. Check points
  if (user.points < item.price_points) {
    return { success: false, error: '积分不够' };
  }

  // 2. Already owned?
  const ownedList = getOwnedList(collection, item.category);
  if (ownedList.find(o => o.id === item.id)) {
    return { success: false, error: '已收藏' };
  }

  // 3. Deduct points + add to collection
  user.points -= item.price_points;
  addToCollection(collection, item);

  // 4. Persist
  await saveUser(user);
  await saveCollection(collection);

  // 5. Trigger unlock animation
  triggerPurchaseAnimation(item);

  return { success: true };
}
```

---

# 8. 资产清单

## 8.1 资产目录结构

```
src/assets/home/
├── paintings/
│   ├── center_hero.jpg       (Frank 提供：科比海报)
│   ├── left_glory.svg        (荣耀桂冠，Claude 画)
│   └── right_explore.svg     (探索星空，Claude 画)
│
├── trophies/
│   ├── rank/
│   │   ├── rookie.svg
│   │   ├── bronze.svg        (生锈的剑)
│   │   ├── silver.svg        (盾)
│   │   ├── gold.svg          (王冠)
│   │   ├── platinum.svg      (翅膀)
│   │   ├── diamond.svg       (水晶球)
│   │   └── legend.svg        (凤凰)
│   ├── challenge/
│   │   ├── first_kill.svg
│   │   ├── dawn.svg
│   │   └── ... (共 20 个)
│   └── hidden/
│       ├── midnight_warrior.svg
│       └── ... (共 9 个，含剪影状态)
│
├── legos/
│   ├── 42153_ferrari.png     (Frank 准备 12 个)
│   ├── 10305_castle.png
│   └── ...
│
├── toys/
│   ├── robot_01.png          (Frank 准备 12 个)
│   ├── rocket_01.png
│   └── ...
│
├── desk_items/
│   ├── lamp_retro_green.svg  (8-12 个)
│   ├── lamp_nordic.svg
│   ├── globe_classic.svg
│   ├── globe_electric.svg
│   ├── frame_family.svg
│   ├── pen_cup_blue.svg
│   ├── plant_cactus_small.svg
│   ├── robot_figure.svg
│   └── ...
│
├── plants/
│   ├── plant_pothos.svg      (default)
│   ├── plant_monstera.svg    (default)
│   ├── plant_cactus.svg
│   ├── plant_lavender.svg
│   ├── plant_moss.svg
│   ├── plant_fiddle.svg
│   ├── plant_lemon.svg
│   └── plant_bonsai.svg
│
└── chairs/
    ├── default.svg           (default leather chair)
    └── ... (v4 后续补 racer/astronaut 等 7 个)
```

## 8.2 资产准备清单

| 资产 | 数量 | 来源 | 状态 |
|---|---|---|---|
| 偶像海报 | 1 张 | Frank 提供 | ✅ 已有 |
| 段位奖杯 | 7 个 | Claude 画 | ❌ 待 |
| 挑战奖杯 | 20 个 | Claude 画 | ❌ 待 |
| 隐藏奖杯 | 9 个 | Claude 画 | ❌ 待 |
| 乐高图片 | 12 张 | Frank + 爱人精选 | ❌ 待 |
| 玩具图片 | 12 张 | Frank + 爱人精选 | ❌ 待 |
| 桌面摆件 | 8-12 个 | Claude 画 | ❌ 待 |
| 绿植 SVG | 8 个 | Claude 画 | ❌ 待 |
| 椅背 SVG | 1+ 个 | Claude 画 | ❌ 待（v4 默认 1 个） |

## 8.3 资产规格

### SVG 文件
- viewBox 统一（如奖杯 100×120，乐高 80×60，绿植 80×180）
- 颜色用 design tokens（不写死颜色，用 `currentColor` 或变量）
- 单文件 < 5KB

### 实物照片
- 去背景（PNG with transparency）
- 暖光叠加（5% 暖白 overlay）
- 圆角 8px 裁剪
- 暖橙阴影投影
- 单文件 < 100KB

---

# 9. 实施路线图

## 9.1 4 个 Milestone

### M1 · 基础架构（1 周）

- [ ] 路由 `/home` 新增
- [ ] 书房页面骨架（按 §2 布局）
- [ ] Design tokens 注入（§3 完整 CSS）
- [ ] 数据模型落地（§7 TypeScript）
- [ ] 进入/退出动画
- [ ] 默认渲染：墙、地板、画框（空）、柜子框架、椅子、桌子、肥仔
- [ ] 全部内容用空槽位
- [ ] git commit: `feat(home): scaffold study room with v4 layout`

**验收**：路由可访问，骨架显示，肥仔在场，没有崩。

### M2 · 奖杯柜（1 周）

- [ ] 7 个段位奖杯 SVG
- [ ] 20 个挑战奖杯 SVG
- [ ] 9 个隐藏奖杯（含剪影状态）
- [ ] 奖杯柜橱窗渲染（前 9 个）
- [ ] 奖杯柜点击 → modal 显示完整 35 个网格
- [ ] 单奖杯详情卡
- [ ] 解锁逻辑（自动检测 + 弹出动画）
- [ ] 红点提示（新奖杯）
- [ ] git commit: `feat(home): trophy cabinet with unlock system`

**验收**：完成 1 个任务后，"首胜徽章" 解锁，柜子里看到。

### M3 · 乐高 + 玩具柜 + 装饰商店（1.5 周）

- [ ] Frank + 爱人筛选 12 款 Lego + 12 款玩具
- [ ] 实物照片处理（去背 + 暖光 overlay）
- [ ] 乐高柜橱窗 + modal 全展品 + 详情卡
- [ ] 玩具柜橱窗 + modal 全展品 + 详情卡
- [ ] 装饰商店页面（路由 `/home/shop`，4 个 tab）
- [ ] 购买流程（确认 → 扣积分 → 立即出现）
- [ ] 购买动画（"咔嗒"落下）
- [ ] git commit: `feat(home): lego + toy + decoration shop`

**验收**：买一个乐高 → 柜子里立刻看到 → 详情可看。

### M4 · 桌面摆件 + 绿植 + 收尾（1.5 周）

- [ ] 8 个核心桌面摆件 SVG
- [ ] 摆件商店 tab
- [ ] 摆件槽位渲染
- [ ] 摆件切换 UI
- [ ] 2 个默认绿植 SVG（绿萝 + 龟背竹）
- [ ] 6 个可购买绿植 SVG
- [ ] 绿植槽位（左右各一）
- [ ] 绿植摇曳动画
- [ ] 绿植商店 tab + 切换 UI
- [ ] 椅背 SVG（v4 先做 default 款）
- [ ] 各种微动效（钟摆/灯光呼吸/肥仔眨眼）
- [ ] 音效（进入/退出/购买/解锁）
- [ ] git commit: `feat(home): desk items + plants + polish`

**验收**：儿子能完整玩一遍，主动说出"我想再买一个 XXX"。

## 9.2 总工期

约 **5-6 周** 业余推进。

## 9.3 v4 修订补丁（如果已经做了 v3）

如果已有 v3 实现，按 5 步增量更新：

```
Step 1: 替换中央画为偶像海报          0.5 天
Step 2: 加深桌面颜色为深胡桃木          0.3 天
Step 3: 椅子放大 360 + 肥仔上移         0.3 天
Step 4: 加入桌后绿植 2 盆               1.0 天
Step 5: 商店新增"绿植" tab             0.5 天
─────────────────────────────────────
总计：约 2.5 天
```

---

# 10. Claude Code 使用指南

## 10.1 启动话术（粘贴给 Claude Code）

```
你好。我正在做一个叫"肥仔大闯关"的儿童作业管理 PWA 的扩展功能：
肥仔的书房（study room）。这是一个收藏陈列系统，孩子通过完成
作业获得积分，用积分购买虚拟收藏品（乐高/玩具/绿植/摆件等）
摆在自己的虚拟书房里，激励他坚持完成作业。

我会提供两份文档：
1. fatboy-home-final-spec.md（主规格）
2. （如果有）fatboy-home-design-spec.md（v1 原始规格，可参考）

请按以下顺序工作：

第 1 步 · 阅读文档
  - 先完整读 fatboy-home-final-spec.md
  - 重点理解：§2 布局、§3 design tokens、§4 视觉元素、
    §7 数据模型、§9 实施路线图

第 2 步 · 项目盘点
  - 运行 ls -la src/ 了解项目结构
  - 找出主路由配置和现有的产品代码
  - 确认 design tokens 系统（CSS variables / Tailwind）

第 3 步 · 制定计划
  - 列出你计划新增的所有文件路径
  - 列出你计划修改的现有文件
  - 不要直接动手——先把列表给我确认

第 4 步 · 按 M1 → M4 顺序执行
  - 一次只做一个 milestone
  - 每个 milestone 内的所有任务完成后再下一个
  - 每个 milestone 独立 git commit

第 5 步 · 每个 milestone 完成后
  - 截图给我看
  - 我验收符合标准后才进入下一个

注意：
- 绝对不修改主产品的业务逻辑
- 不引入新的紫青/紫蓝渐变（V2 已淘汰）
- 复用现有 fatboy SVG 资产（v4 的 8 角色 × 8 状态）
- 资产放 src/assets/home/，路径见 §8.1
- 每个 git commit message 用 'feat(home): xxx' 或 'style(home): xxx'

开始之前，请先复述你的理解，然后从第 1 步开始。
```

## 10.2 文档使用方式

**情况 A · 全新开始**：
- 把 `fatboy-home-final-spec.md` 放进项目（或丢给 Claude Code）
- 用 §10.1 启动话术
- 让它按 M1 → M4 推进

**情况 B · 已有 v3 实现，要升级到 v4**：
- 把 `fatboy-home-v4-revision.md` + `fatboy-home-final-spec.md` 一起给
- 告诉它："我已有 v3 实现，需要升级到 v4"
- 它会按 v4 revision 的 5 个 Step 增量更新

## 10.3 每个 milestone 完成后验收

| Milestone | 关键验收点 |
|---|---|
| M1 | 路由可访问、布局正确、肥仔可见 |
| M2 | 完成任务后能解锁奖杯并在柜内显示 |
| M3 | 商店购买后柜子立刻更新 |
| M4 | 绿植/摆件切换流畅、整体氛围治愈 |

每个 milestone 验收时拿现成的截图和文档里的"目标"对照——
不一定要完全像 mockup，但**关键元素都要在**、**调性正确**。

## 10.4 常见问题处理

**问 1**：Claude Code 想加新功能（比如装修系统、心愿单）

**答**：拒绝。指 §11 "边界声明"，明确不在 v4 范围。

**问 2**：Claude Code 不确定某个细节怎么实现

**答**：让它**给你 2-3 个选项**，你来选，不要让它自由发挥。

**问 3**：发现某处和现有产品冲突

**答**：让它**停下来报告**，不要自己改业务逻辑。

**问 4**：资产（如奖杯 SVG）质量不行

**答**：单独让它重画，给具体方向（"金属感更强"、"形态更夸张"）。

## 10.5 文件交付清单

最终给 Claude Code 的是这些：

```
fatboy-home-final-spec.md       (本文档，主规格)
fatboy-home-v4-revision.md      (可选，如果已有 v3)
fatboy-home-design-spec.md      (可选，v1 历史规格作参考)

资产文件夹（Frank 准备）：
  /center_hero.jpg              (科比海报)
  /lego_*.png                   (12 张乐高图)
  /toy_*.png                    (12 张玩具图)
```

---

# 11. 边界声明

## 11.1 v4 范围内（做）

- ✅ 主屏：3 柜 + 3 画 + 椅子 + 肥仔 + 桌子 + 绿植 + 摆件
- ✅ 柜子点击 → modal 显示完整网格
- ✅ 单品点击 → 详情卡
- ✅ 装饰商店（4 tab：乐高/玩具/摆件/绿植）
- ✅ 购买流程 + 解锁动画
- ✅ 35 奖杯 + 12 乐高 + 12 玩具 + 8-12 摆件 + 8 绿植
- ✅ 桌后绿植槽位 + 摇曳动画
- ✅ 触觉 + 音效
- ✅ 椅背随角色变化（v4 先做 default）

## 11.2 v4 范围外（不做）

- ❌ 多个房间（卧室、阁楼）
- ❌ 装修系统（家具搬动、自由摆放）
- ❌ 心愿单 / 家长承诺打通
- ❌ 任务委托系统（小白式 NPC）
- ❌ 客人来访
- ❌ 季节限定装饰
- ❌ 用户上传自定义偶像图
- ❌ 绿植养成（浇水/开花/长大）
- ❌ 全屏陈列页（独立路由）—— 建议 v4.1
- ❌ 多娃支持
- ❌ 父子对战
- ❌ 故事章节

这些都好想法，但**v4 先把"陈列+收藏"做扎实**，后续单独 release。

## 11.3 v4.1 候选清单（v4 完成后再规划）

| 功能 | 工期 |
|---|---|
| 全屏陈列页（独立路由 + 滑动浏览 + 筛选） | 1 周 |
| 偶像海报上传与切换 | 0.5 周 |
| 椅背其他 7 个角色款 | 0.5 周 |
| 绿植购买"咔嗒落地"动画 | 0.3 周 |
| 触摸交互优化（移动端长按预览） | 0.3 周 |
| 季节装饰（圣诞树、春节灯笼） | 1 周 |

---

# 文档信息

- **版本**：v4.0 Final
- **创建日期**：2026-05-13
- **作者**：Frank + Claude
- **修订历史**：
  - v1.0 主规格（2026-05-13）
  - v4.0 修订补丁（2026-05-13）
  - v4.0 Final 合并（2026-05-14）
- **关联文件**：
  - `fatboy-home-design-spec.md`（v1 原始）
  - `fatboy-home-v4-revision.md`（v4 增量）
  - `fatboy-home-study-mockup-v3.png`（v3 mockup）
- **下次修订**：v4.1（待 v4 完成）

---

**END** · 这是 v4 最终方案。把这份文档丢给 Claude Code，按 §10.1 启动。
