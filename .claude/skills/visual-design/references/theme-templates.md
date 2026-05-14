# Theme Templates — 5 套现成主题

每套主题给出：①情绪定位 / 借鉴来源、②色彩 token（OKLCH + hex fallback）、③圆角与形状、④字体节奏、⑤阴影/装饰、⑥代表组件 CSS。

直接复制粘贴可用。如果你的项目用 OKLCH 不便，每个 token 都给了 hex fallback。

---

## 1. 🌻 cozy（温馨黄）— 暖光绘本

**情绪**：温暖、田园、贴纸感、像绘本。**借鉴**：Animal Crossing 的奶白容器 + Duolingo 的暖橙状态 + Monument Valley 2 的低饱和绿松对比。

**色相位置**：色环 30°（暖橙），辅色 170°（薄荷绿）— 互补对差 140°。

### 1.1 Tokens

```css
body[data-theme="cozy"] {
  /* 主色：暖橙 */
  --primary:         oklch(70% 0.16 30deg);    /* #F5A04A */
  --primary-soft:    oklch(95% 0.05 30deg);    /* #FFF1DD */
  --primary-strong:  oklch(42% 0.16 30deg);    /* #B05A14 */

  /* 辅色：薄荷绿（互补） */
  --accent:          oklch(72% 0.12 170deg);   /* #7FC8A9 */
  --accent-soft:     oklch(94% 0.04 170deg);   /* #E1F5EC */
  --accent-strong:   oklch(40% 0.12 170deg);   /* #2A6E55 */

  /* 容器（奶白系，带 5% 暖偏色 — Gurney unity） */
  --surface-page:    oklch(97% 0.012 60deg);   /* #FFF8EC */
  --surface-paper:   oklch(99% 0.008 60deg);   /* #FFFFFA */
  --surface-mist:    oklch(94% 0.018 50deg);   /* #FBF1DE */
  --surface-fog:     oklch(86% 0.022 40deg);   /* #E8D8B8 */

  /* 文字（深栗，比纯黑暖） */
  --ink-strong:      oklch(28% 0.04 40deg);    /* #3E2A1F */
  --ink-muted:       oklch(50% 0.04 40deg);    /* #8A6B55 */
  --ink-faint:       oklch(70% 0.03 40deg);    /* #BFA88E */

  /* 状态（饱和度微调，不改 hue） */
  --state-success:   oklch(72% 0.18 140deg);   /* #58CC02 */
  --state-warn:      oklch(78% 0.16 75deg);    /* #FFC800 */
  --state-danger:    oklch(60% 0.18 25deg);    /* #E25555 */

  /* 圆角（贴纸感） */
  --radius-xs: 8px;  --radius-sm: 14px;
  --radius-md: 20px; --radius-lg: 28px; --radius-xl: 36px;

  /* 阴影（黑阴影 + 补色阴影） */
  --shadow-sm:  0 2px 4px rgba(180,120,60,.10);
  --shadow-md:  0 4px 12px rgba(180,120,60,.14), 0 16px 32px rgba(60,80,120,.05); /* 主阴影暖 + 副阴影冷 = Gurney */
  --shadow-lg:  0 8px 24px rgba(180,120,60,.18);
  --shadow-cta: 0 4px 0 oklch(42% 0.16 30deg); /* 4px 下沉式底色 */
}
```

### 1.2 字体与形状

- 字体：`'PingFang SC', 'Nunito', sans-serif`，数字 `'Fredoka', sans-serif`
- 字重：700 / 600 / 500
- 标题字号 24-32，正文 16，标签 14
- 主 CTA：胶囊形（radius-xl）+ 4px 下沉式底色

### 1.3 标志装饰

- 卡片右上角圆点虚线撕边
- 顶部 emoji（🌻🍞☀️）作为内容引导
- 背景可加 10% alpha 的细密圆点 grain texture

### 1.4 代表组件

```css
.cozy-primary-btn {
  position: relative;
  background: var(--primary);
  color: white;
  padding: 14px 28px;
  border-radius: var(--radius-xl);
  font-weight: 700;
  box-shadow: var(--shadow-cta);
  transition: transform 100ms cubic-bezier(0.34, 1.56, 0.64, 1);
}
.cozy-primary-btn:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--primary-strong);
}
.cozy-card {
  background: var(--surface-paper);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  padding: 20px;
}
```

---

## 2. 🌌 starry（星空蓝）— 夜空神秘

**情绪**：神秘、深邃、安静、像入睡前的小宇宙。**借鉴**：Alto's Odyssey 紫深渐变 + Sky: Children of the Light 冷底唯一暖锚点 + Linear 的 LCH 主题。

**色相位置**：色环 250°（紫蓝），辅色 65°（金黄星点）— 互补对差 185°。

### 2.1 Tokens

```css
body[data-theme="starry"] {
  --primary:         oklch(60% 0.18 270deg);   /* #6F5BE9 */
  --primary-soft:    oklch(35% 0.10 270deg);   /* #2D2654 */
  --primary-strong:  oklch(80% 0.14 270deg);   /* #B8A9F5 */

  /* 辅色：金黄（唯一暖锚点） */
  --accent:          oklch(85% 0.15 80deg);    /* #FFD66B */
  --accent-soft:     oklch(40% 0.08 80deg);    /* #5E4F2A */
  --accent-strong:   oklch(92% 0.10 80deg);    /* #FFEDB0 */

  /* 容器（深夜蓝，不要纯黑） */
  --surface-page:    oklch(15% 0.04 270deg);   /* #0E1226 */
  --surface-paper:   oklch(22% 0.05 268deg);   /* #1A1F3A */
  --surface-mist:    oklch(28% 0.06 265deg);   /* #232A4D */
  --surface-fog:     oklch(36% 0.06 260deg);   /* #353D5E */

  /* 文字（冷白偏蓝，纯度高） */
  --ink-strong:      oklch(97% 0.01 250deg);   /* #F5F8FF */
  --ink-muted:       oklch(78% 0.04 255deg);   /* #B8C0DD */
  --ink-faint:       oklch(55% 0.04 258deg);   /* #6E7799 */

  /* 状态 */
  --state-success:   oklch(78% 0.18 145deg);   /* #6BE3A0 */
  --state-warn:      oklch(85% 0.15 80deg);    /* #FFD66B（与 accent 同） */
  --state-danger:    oklch(70% 0.20 360deg);   /* #FF7A8A */

  /* 圆角（卡片感，中等） */
  --radius-xs: 6px;  --radius-sm: 10px;
  --radius-md: 14px; --radius-lg: 18px; --radius-xl: 24px;

  /* 阴影 = glow + dark drop */
  --shadow-sm:  0 2px 8px rgba(0,0,0,.4), 0 0 0 1px rgba(180,168,250,.10);
  --shadow-md:  0 4px 16px rgba(0,0,0,.5), 0 0 16px rgba(111,91,233,.20);
  --shadow-lg:  0 8px 32px rgba(0,0,0,.6), 0 0 24px rgba(111,91,233,.30);
  --shadow-cta: 0 0 20px rgba(255,214,107,.4); /* 金色 glow */
}
```

### 2.2 字体与形状

- 字体：`'PingFang SC', 'Inter', sans-serif`，数字 `'Fredoka', sans-serif`
- 字重：600 / 500 / 400
- letter-spacing: title 0.02em, body 0.005em（比 cozy 稍开）
- 主 CTA：圆角矩形 + glow，无下沉

### 2.3 标志装饰

- 背景层闪烁星点（5-10 个随机 1-3px 白点）
- 紫到深蓝径向渐变背景
- 卡片边缘 1px subtle glow

### 2.4 代表组件

```css
.starry-primary-btn {
  background: var(--primary);
  color: white;
  padding: 14px 28px;
  border-radius: var(--radius-md);
  font-weight: 600;
  letter-spacing: 0.02em;
  border: 1px solid var(--primary-strong);
  box-shadow: var(--shadow-cta);
  transition: filter 150ms ease;
}
.starry-primary-btn:hover { filter: brightness(1.15); }
.starry-card {
  background: var(--surface-paper);
  border: 1px solid var(--surface-fog);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: 20px;
}
.starry-page::before {
  content: '';
  position: absolute; inset: 0;
  background-image:
    radial-gradient(1px 1px at 20% 30%, white 50%, transparent),
    radial-gradient(1.5px 1.5px at 70% 60%, var(--accent) 50%, transparent),
    radial-gradient(1px 1px at 40% 80%, white 50%, transparent);
  opacity: 0.6;
  pointer-events: none;
}
```

---

## 3. ⚙️ mecha（机甲科技）— 冷硬棱角

**情绪**：硬朗、克制、霓虹、像高级耳机包装盒。**借鉴**：Linear 的中性中性 + Carrot Weather 的语义独立 + 经典科幻 HUD。

**色相位置**：色环 170°（青绿霓虹），辅色 350°（玫红警示）— 互补对差 180°。

### 3.1 Tokens

```css
body[data-theme="mecha"] {
  --primary:         oklch(75% 0.15 180deg);   /* #2DD4BF */
  --primary-soft:    oklch(30% 0.08 180deg);   /* #1A3E3A */
  --primary-strong:  oklch(88% 0.12 180deg);   /* #7FE6DA */

  --accent:          oklch(70% 0.20 10deg);    /* #FB7185 */
  --accent-soft:     oklch(30% 0.08 10deg);    /* #4A1F2A */
  --accent-strong:   oklch(85% 0.15 10deg);    /* #FDA4B0 */

  /* 容器（深青墨，明显偏冷绿） */
  --surface-page:    oklch(14% 0.02 200deg);   /* #0F1B22 */
  --surface-paper:   oklch(20% 0.025 195deg);  /* #16252F */
  --surface-mist:    oklch(25% 0.03 190deg);   /* #1F303B */
  --surface-fog:     oklch(38% 0.04 185deg);   /* #3D4F5B */

  /* 文字（青白，与 starry 拉开温度） */
  --ink-strong:      oklch(95% 0.025 180deg);  /* #E8FFF8 */
  --ink-muted:       oklch(70% 0.04 180deg);   /* #93B5AC */
  --ink-faint:       oklch(50% 0.04 180deg);   /* #5E807A */

  --state-success:   oklch(80% 0.20 145deg);   /* #00FF9C */
  --state-warn:      oklch(80% 0.16 85deg);    /* #FBBF24 */
  --state-danger:    oklch(70% 0.20 10deg);    /* 与 accent 重 */

  /* 圆角（小 + 切角） */
  --radius-xs: 4px;  --radius-sm: 6px;
  --radius-md: 8px;  --radius-lg: 12px; --radius-xl: 16px;

  --shadow-sm:  inset 0 0 0 1px rgba(45,212,191,.12), 0 2px 4px rgba(0,0,0,.4);
  --shadow-md:  inset 0 0 0 1px rgba(45,212,191,.18), 0 4px 16px rgba(0,0,0,.5);
  --shadow-lg:  inset 0 0 0 1px rgba(45,212,191,.25), 0 8px 32px rgba(0,0,0,.6);
  --shadow-cta: inset 0 0 12px rgba(45,212,191,.4), 0 0 0 1px var(--primary);
}
```

### 3.2 字体与形状

- 字体：`'PingFang SC', 'JetBrains Mono', monospace`（labels 用等宽）
- 字重：500 / 400
- 标签全大写 + tracking 0.1em
- 主 CTA：可加切角（clip-path 八边形） + 1px 描边内发光

### 3.3 标志装饰

- 背景 1px 等距网格（24px x 24px）
- 卡片 1px inset stroke 模拟金属边
- 角标用单根斜线（"／"）做切角
- 数字 + 单位之间留空，单位小一号灰一点（像 HUD）

### 3.4 代表组件

```css
.mecha-primary-btn {
  background: transparent;
  color: var(--primary);
  padding: 12px 24px;
  border-radius: var(--radius-sm);
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 1px solid var(--primary);
  box-shadow: var(--shadow-cta);
  font-family: 'JetBrains Mono', monospace;
}
.mecha-primary-btn:hover {
  background: var(--primary-soft);
  box-shadow: var(--shadow-cta), 0 0 20px rgba(45,212,191,.4);
}
.mecha-card {
  background: var(--surface-paper);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  padding: 20px;
  position: relative;
}
.mecha-page {
  background-image:
    linear-gradient(rgba(45,212,191,.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(45,212,191,.05) 1px, transparent 1px);
  background-size: 24px 24px;
}
```

---

## 4. 🍬 candy（糖果马卡龙）— Q 弹梦幻

**情绪**：糖果、Q 弹、撞色狂欢。**借鉴**：Kirby 粉调 + Eggy Party 撞色 + 蛋仔派对的胶囊按钮。

**色相位置**：色环 330°（糖果粉），辅色 165°（薄荷青） + 第三色 60°（蛋黄黄）。三色撞色。

### 4.1 Tokens

```css
body[data-theme="candy"] {
  --primary:         oklch(70% 0.20 340deg);   /* #FF7AC4 糖果粉 */
  --primary-soft:    oklch(92% 0.06 340deg);   /* #FFE8F3 */
  --primary-strong:  oklch(45% 0.18 340deg);   /* #A8307B */

  --accent:          oklch(80% 0.14 165deg);   /* #7FE6C8 薄荷 */
  --accent-soft:     oklch(94% 0.04 165deg);   /* #E1F8EE */
  --accent-strong:   oklch(50% 0.14 165deg);   /* #2D7F6A */

  --tertiary:        oklch(85% 0.16 80deg);    /* #FFD23F 蛋黄 */
  --tertiary-soft:   oklch(96% 0.06 80deg);    /* #FFF6D8 */

  --surface-page:    oklch(98% 0.01 320deg);   /* #FFF5F8 */
  --surface-paper:   oklch(100% 0 0);          /* #FFFFFF */
  --surface-mist:    oklch(96% 0.015 330deg);  /* #FCEFF5 */
  --surface-fog:     oklch(88% 0.03 330deg);   /* #EFD3DE */

  --ink-strong:      oklch(28% 0.04 350deg);   /* #3E2A2A 深咖 */
  --ink-muted:       oklch(55% 0.04 350deg);   /* #8E6F75 */
  --ink-faint:       oklch(75% 0.03 350deg);   /* #BFA8AC */

  --state-success:   oklch(75% 0.18 145deg);
  --state-warn:      oklch(85% 0.16 80deg);
  --state-danger:    oklch(65% 0.20 25deg);

  /* 圆角（最大，胶囊感） */
  --radius-xs: 12px; --radius-sm: 20px;
  --radius-md: 28px; --radius-lg: 36px; --radius-xl: 999px; /* 胶囊 */

  --shadow-sm:  0 2px 6px rgba(255,122,196,.15);
  --shadow-md:  0 4px 16px rgba(255,122,196,.20), 0 12px 32px rgba(127,230,200,.08);
  --shadow-lg:  0 8px 32px rgba(255,122,196,.28);
  --shadow-cta: 0 4px 0 var(--primary-strong), 0 8px 16px rgba(255,122,196,.25);
}
```

### 4.2 装饰特色

- 胶囊按钮（border-radius: 999px）
- 高光描边：CTA 顶部加 inset 1px 白色高光 `inset 0 1px 0 rgba(255,255,255,.4)`，像糖果表面反光
- 完成时撒彩带粒子 canvas-confetti

```css
.candy-cta {
  background: linear-gradient(180deg, var(--primary), var(--primary-strong));
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-cta), inset 0 1px 0 rgba(255,255,255,.4);
  padding: 16px 32px;
  font-weight: 800;
  color: white;
}
```

---

## 5. 🍃 leaf（动森田园）— 岁月静好

**情绪**：田园、低饱和高质感、季节性。**借鉴**：Animal Crossing 全套 + Monument Valley 2 低饱和打底。

**色相位置**：色环 145°（苔藓绿），辅色 30°（暖陶土橙） — 同分裂互补。

### 5.1 Tokens

```css
body[data-theme="leaf"] {
  --primary:         oklch(70% 0.13 150deg);   /* #74E0AA */
  --primary-soft:    oklch(93% 0.05 150deg);   /* #DCF5E5 */
  --primary-strong:  oklch(45% 0.13 150deg);   /* #2E8056 */

  --accent:          oklch(75% 0.12 50deg);    /* #E2A075 */
  --accent-soft:     oklch(94% 0.04 50deg);    /* #F8ECDF */
  --accent-strong:   oklch(45% 0.13 50deg);    /* #8C4F22 */

  --surface-page:    oklch(96% 0.018 70deg);   /* #FFF8E7 米色 */
  --surface-paper:   oklch(99% 0.012 70deg);   /* #FFFCF0 */
  --surface-mist:    oklch(92% 0.025 60deg);   /* #F0E5C8 木纹米 */
  --surface-fog:     oklch(80% 0.04 50deg);    /* #D4B894 */

  --ink-strong:      oklch(30% 0.04 50deg);    /* #5C4A3A 深栗 */
  --ink-muted:       oklch(52% 0.04 50deg);    /* #8B7558 */
  --ink-faint:       oklch(72% 0.03 50deg);    /* #BAA887 */

  --state-success:   oklch(70% 0.18 145deg);
  --state-warn:      oklch(80% 0.15 80deg);
  --state-danger:    oklch(60% 0.18 25deg);

  --radius-xs: 10px; --radius-sm: 16px;
  --radius-md: 22px; --radius-lg: 30px; --radius-xl: 40px;

  --shadow-sm:  0 2px 6px rgba(116,224,170,.10);
  --shadow-md:  0 4px 12px rgba(140,79,34,.10), 0 12px 28px rgba(116,224,170,.06);
  --shadow-lg:  0 8px 24px rgba(140,79,34,.14);
  --shadow-cta: 0 3px 0 var(--primary-strong);
}
```

### 5.2 装饰特色

- 卡片用"叶片形"圆角（不等圆角：左上+右下 30px，右上+左下 12px）
- 标签做成贴纸样式（带白色 2px 描边 + 1deg 轻微倾斜）

```css
.leaf-card {
  background: var(--surface-paper);
  border-radius: 30px 12px 30px 12px; /* 叶片 */
  box-shadow: var(--shadow-md);
}
.leaf-sticker {
  display: inline-block;
  background: var(--primary-soft);
  color: var(--primary-strong);
  padding: 4px 12px;
  border-radius: var(--radius-sm);
  border: 2px solid white;
  transform: rotate(-1deg);
  box-shadow: var(--shadow-sm);
  font-weight: 700;
}
```

---

## 互通的语义层（所有主题共享，**不随主题改**）

所有主题都遵循同一组 token 名 — 切主题只换数值，组件代码不变：

```css
:root {
  /* Motion */
  --spring-bouncy: cubic-bezier(0.34, 1.56, 0.64, 1);
  --spring-soft:   cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --duration-micro:  150ms;
  --duration-std:    280ms;
  --duration-hero:   480ms;

  /* Typography */
  --font-zh:    'PingFang SC', 'Hiragino Sans GB', sans-serif;
  --font-en:    'Inter', sans-serif;
  --font-round: 'Nunito', 'PingFang SC', sans-serif; /* 圆头 */
  --font-num:   'Fredoka', 'Inter', sans-serif;
  --font-mono:  'JetBrains Mono', monospace;
}
```

---

## 取用建议

| 你的产品 | 推荐主题 | 备选 |
|---|---|---|
| 儿童教育（k-12） | cozy / candy / leaf | starry（睡前模式） |
| 家庭工具（任务、习惯） | cozy / leaf | candy（仪式感强的奖励页） |
| 游戏 / 娱乐 | candy + starry（夜模式） | mecha（科技 / 太空题材） |
| 工具 / 效率 | mecha + cozy（白天暗夜切换） | leaf（写作 / 阅读类） |
| 全场景三主题 | **cozy + starry + mecha**（首选） | **cozy + candy + leaf**（暖系全家桶） |

如果项目就是要"三主题区分度大"，**cozy + starry + mecha** 是最经过验证的搭配：暖 / 紫蓝深 / 青绿深，三个温度方向覆盖，三种装饰元素各占一极。
