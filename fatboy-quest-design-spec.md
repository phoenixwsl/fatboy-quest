# 肥仔大闯关 · UI 全面重设计规格 · v2.0

> **目标读者**：Claude Code（在本地项目里执行修改）
> **基础约束**：不增加新功能，只改 UI、颜色、布局、文案、动效
> **指导文档**：`fatboy-quest-ui-roadmap.md`（路线图）+ 本文档（具体规格）

---

## 0. 给 Claude 的工作约定

按以下顺序执行修改：

1. **先把 §1 design tokens 注入项目**（CSS variables 或 Tailwind config）
2. **再按 §2-§13 逐页改造**，每页一个 git commit
3. **每次修改前先 view 当前组件文件**，确认改动范围
4. **绝不修改任何业务逻辑**——只改 className、style、文案、组件树结构
5. **每页改完后用截图工具验证**：和本文档的"目标视觉"对照

**禁止行为**：
- ❌ 引入新功能、新页面、新数据
- ❌ 修改后端 API 调用
- ❌ 改动 emoji 时不替换为新 icon（必须有替代）
- ❌ 保留任何紫青渐变按钮样式

---

## §1 · Design Tokens（全局基础）

### 1.1 CSS Variables 注入

把以下内容加到全局 CSS 或 `tailwind.config.js`：

```css
:root {
  /* ===== 时段背景（自动切换，60秒过渡） ===== */
  --bg-day-from:    #E8F2FB;
  --bg-day-to:      #C8DEEF;
  --bg-dusk-from:   #F8DCB4;
  --bg-dusk-to:    #E0A586;
  --bg-night-from:  #2B3A52;
  --bg-night-to:    #182236;

  /* ===== 角色色（全天可用） ===== */
  --fatboy-50:      #FFF6D0;
  --fatboy-300:     #FFE082;
  --fatboy-500:     #F4C752;  /* 主色 */
  --fatboy-700:     #C77F18;
  --sky-100:        #DAEAF7;
  --sky-300:        #A3C7E7;
  --sky-500:        #4A9EE7;  /* 主 CTA */
  --sky-700:        #2C72B0;

  /* ===== 强调色（克制） ===== */
  --success:        #6BC36B;
  --danger:         #E87575;
  --magic:          #9C8CD9;

  /* ===== 中性色（白天） ===== */
  --paper:          #FFFFFF;
  --mist:           #F4F7FB;
  --fog:            #DCE3ED;
  --ink:            #2C3E50;
  --ink-muted:      #6B7B8C;
  --ink-faint:      #A8B3C0;

  /* ===== 中性色（夜晚） ===== */
  --paper-night:    #28354A;
  --mist-night:     #1F2A3D;
  --ink-night:      #E8EEF7;
  --ink-night-muted: #9BA9BC;

  /* ===== 彩虹（仅倒计时进度条） ===== */
  --rainbow-1:      #FAB1A0;
  --rainbow-2:      #FDCB6E;
  --rainbow-3:      #FFEAA7;
  --rainbow-4:      #A0E6A0;

  /* ===== 阴影 ===== */
  --shadow-sm:      0 2px 4px rgba(74,158,231,0.06), 0 4px 12px rgba(74,158,231,0.08);
  --shadow-md:      0 4px 8px rgba(74,158,231,0.08), 0 12px 32px rgba(74,158,231,0.10);
  --shadow-lg:      0 8px 16px rgba(74,158,231,0.10), 0 24px 64px rgba(74,158,231,0.14);
  --glow-fatboy:    0 0 32px rgba(244,199,82,0.4);
  --glow-sky:       0 0 24px rgba(74,158,231,0.3);

  /* ===== 圆角 ===== */
  --radius-xs:      8px;
  --radius-sm:      14px;
  --radius-md:      18px;
  --radius-lg:      24px;
  --radius-xl:      32px;

  /* ===== 间距（8pt系统） ===== */
  --space-1:        4px;
  --space-2:        8px;
  --space-3:        12px;
  --space-4:        16px;
  --space-5:        20px;
  --space-6:        24px;
  --space-7:        32px;
  --space-8:        48px;

  /* ===== 动画缓动 ===== */
  --spring-bouncy:  cubic-bezier(0.34, 1.56, 0.64, 1);
  --spring-soft:    cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-quart: cubic-bezier(0.165, 0.84, 0.44, 1);
}

/* 时段切换：根据小时数自动应用 */
body[data-time-period="day"]   { --bg-from: var(--bg-day-from);   --bg-to: var(--bg-day-to); }
body[data-time-period="dusk"]  { --bg-from: var(--bg-dusk-from);  --bg-to: var(--bg-dusk-to); }
body[data-time-period="night"] { --bg-from: var(--bg-night-from); --bg-to: var(--bg-night-to); }

body {
  background: linear-gradient(180deg, var(--bg-from), var(--bg-to));
  transition: background 60s ease-in-out;
}
```

### 1.2 时段自动切换逻辑

在 App 入口加：

```ts
function getTimePeriod(hour: number): 'day' | 'dusk' | 'night' {
  if (hour >= 21 || hour < 7)  return 'night';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'day';
}

useEffect(() => {
  const apply = () => {
    document.body.dataset.timePeriod = getTimePeriod(new Date().getHours());
  };
  apply();
  const id = setInterval(apply, 60_000); // 每分钟检查
  return () => clearInterval(id);
}, []);
```

### 1.3 字体加载

```html
<!-- 在 index.html -->
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;600;700&family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
```

CSS：
```css
:root {
  --font-zh-title: 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --font-zh-body:  var(--font-zh-title);
  --font-num:      'Fredoka', 'Inter', sans-serif;
  --font-en:       'Inter', sans-serif;
}

.text-num {
  font-family: var(--font-num);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
```

### 1.4 背景动态元素

在 App 根布局加一个 `<BackgroundCanvas>`：

```tsx
// BackgroundCanvas.tsx — 白天云朵 / 夜晚星星
export function BackgroundCanvas({ period }: { period: 'day' | 'dusk' | 'night' }) {
  if (period === 'night') {
    return (
      <div className="fixed inset-0 pointer-events-none z-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="star" style={{
            left: `${(i * 37) % 100}%`,
            top: `${(i * 23) % 100}%`,
            animationDelay: `${i * 0.4}s`,
          }} />
        ))}
      </div>
    );
  }
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
    </div>
  );
}
```

CSS：
```css
.cloud {
  position: absolute;
  width: 200px;
  height: 60px;
  background: radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.5), transparent 70%);
  filter: blur(8px);
  animation: float-horizontal 45s linear infinite;
}
.cloud-1 { top: 15%; animation-duration: 45s; }
.cloud-2 { top: 35%; animation-duration: 60s; animation-delay: -15s; opacity: 0.7; }
.cloud-3 { top: 60%; animation-duration: 55s; animation-delay: -30s; opacity: 0.5; }

@keyframes float-horizontal {
  from { transform: translateX(-220px); }
  to   { transform: translateX(calc(100vw + 220px)); }
}

.star {
  position: absolute;
  width: 3px;
  height: 3px;
  background: white;
  border-radius: 50%;
  animation: twinkle 3s ease-in-out infinite;
  box-shadow: 0 0 6px rgba(255,255,255,0.8);
}
@keyframes twinkle {
  0%, 100% { opacity: 0.3; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.3); }
}
```

### 1.5 全局 emoji 替换映射表

这些 emoji 在产品中要被替换为专属 icon（用 Lucide React 或 SVG）：

| 旧 emoji | 用途 | 替换为 |
|---|---|---|
| 🏆 | 成就馆 | `<Trophy />` lucide |
| ⚙️ | 设置 | `<Settings />` lucide |
| 🎁 | 商店 | `<Gift />` lucide |
| 📅 / 🗓 | 日历 | `<Calendar />` lucide |
| 🛡 | 守护卡 | `<Shield />` lucide |
| 🔥 | 连击 | `<Flame />` lucide |
| ⭐ | 积分 | `<Star />` lucide + 暖黄填充 |
| 🔒 / 🔓 | 锁定 | `<Lock />` / `<Unlock />` lucide |
| ⏰ | 时钟/延时 | `<Clock />` lucide |
| ▶ | 开始 | `<Play />` lucide |
| ⚔️ | 闯关/对决 | `<Swords />` lucide |
| 💥 | 击败 | `<Zap />` lucide + 暖色 |
| ✨ | 完成/魔法 | `<Sparkles />` lucide |
| 🎉 | 庆祝 | `<PartyPopper />` lucide |
| 📝 | 任务管理 | `<ClipboardList />` lucide |
| 💯 | 本周积分 | `<Target />` lucide |
| 🚀 | 最快一项 | `<Rocket />` lucide |
| 🎲 | 彩蛋 | `<Dice5 />` lucide |
| 🧑‍👩 | 家长面板 | 用 sky 色块 + 文字"家长" |
| 🙋 | 求助 | `<HandHelping />` lucide |

**例外**：用户输入的 emoji 不改（如任务名"📚阅读"）；小怪 emoji 暂保留（v1.1 单独做小怪资产）。

### 1.6 全产品禁用样式（必须移除）

搜索并替换所有匹配：

```css
/* ❌ 删除所有这类样式 */
background: linear-gradient(..., #A78BFA, #4A9EE7);  /* 紫青渐变 */
background: linear-gradient(..., violet, blue);
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

替换原则：
- 主 CTA → `background: var(--fatboy-500); color: var(--ink);`
- 次 CTA → `background: var(--paper); color: var(--sky-700); border: 2px solid var(--sky-300);`
- 危险按钮 → `background: var(--danger); color: white;`

---

## §2 · 按钮系统（蛋仔 2.5D 立体）

### 2.1 主 CTA（黄色）

用途：去闯关、我要开始、击败完成、添加、新建、回首页

```tsx
// PrimaryButton.tsx
export function PrimaryButton({ children, onClick, icon }) {
  return (
    <button
      onClick={onClick}
      className="primary-btn"
    >
      <span className="primary-btn-bottom" />
      <span className="primary-btn-top">
        {icon && <span className="primary-btn-icon">{icon}</span>}
        {children}
      </span>
    </button>
  );
}
```

```css
.primary-btn {
  position: relative;
  display: inline-flex;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  font-family: var(--font-zh-title);
  font-weight: 700;
  font-size: 17px;
  color: var(--ink);
  transition: transform 0.15s var(--spring-bouncy);
}
.primary-btn-bottom {
  position: absolute;
  inset: 4px 0 0 0;
  background: var(--fatboy-700);
  border-radius: var(--radius-sm);
}
.primary-btn-top {
  position: relative;
  padding: 16px 32px;
  background: var(--fatboy-500);
  border-radius: var(--radius-sm);
  box-shadow: var(--glow-fatboy);
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.primary-btn:active {
  transform: translateY(3px);
}
.primary-btn:active .primary-btn-bottom {
  inset: 1px 0 0 0;
}
```

### 2.2 次 CTA（白底蓝边）

用途：取消、上一步、暂停、详细、收起

```css
.secondary-btn {
  padding: 14px 28px;
  background: var(--paper);
  color: var(--sky-700);
  border: 2px solid var(--sky-300);
  border-radius: var(--radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--spring-soft);
}
.secondary-btn:hover {
  border-color: var(--sky-500);
  background: var(--sky-100);
}
```

### 2.3 危险按钮（紧迫红）

用途：删除、退出家长模式、求助（夸张但克制版）

```css
.danger-btn {
  padding: 14px 28px;
  background: var(--danger);
  color: white;
  border-radius: var(--radius-sm);
  font-weight: 700;
}
```

### 2.4 标签按钮（小尺寸）

用途：模板选择、类型选择、预计用时

```css
.tag-btn {
  padding: 8px 16px;
  background: var(--mist);
  color: var(--ink);
  border-radius: var(--radius-xs);
  font-size: 14px;
  font-weight: 500;
  border: 2px solid transparent;
  cursor: pointer;
}
.tag-btn.active {
  background: var(--fatboy-50);
  border-color: var(--fatboy-500);
  color: var(--fatboy-700);
}
```

---

## §3 · 首页改造（Image 1 → 新版）

### 3.1 当前问题

- 顶部横条数据（今日 3/3 | 积分 356 | 连击 2）占据首屏 ~25%
- 段位卡占据中部 ~30%
- 周历条挤在中下部
- 真正重要的"今日小怪"在底部要滚动
- 肥仔很小，被压在左侧
- 全屏深紫黑背景，不切换

### 3.2 目标布局

```
┌─────────────────────────────────────┐ bg: 白天蓝渐变 + 漂浮云
│                                     │
│  ☀ 周三  5月13日       [🔒 家长]    │ 顶部条 ink-muted 14px
│                                     │
│  ╔════════════════════════════╗     │
│  ║                            ║     │ 白色 paper 卡片
│  ║      [肥仔大形象]           ║     │ radius-lg, shadow-md
│  ║       240×240             ║     │ 立体厚度 3px
│  ║   (呼吸动画 3.2s)          ║     │
│  ║                            ║     │
│  ║   下午好，准备闯关吗？       ║     │ h2, ink, center
│  ║                            ║     │
│  ║   ⭐ 356   🔥 2   🛡 1      ║     │ 三浮动徽章
│  ╚════════════════════════════╝     │
│                                     │
│  今日小怪 (3)         [+ 新任务]    │ h2 + 次CTA
│  ┌────────┐  ┌────────┐  ┌────────┐│
│  │神机妙算 │  │raz阅读 │  │阅读   ││ 横滚或两列
│  │25分·20⭐│  │10分·20⭐│  │25分·20⭐││
│  └────────┘  └────────┘  └────────┘│
│                                     │
│      [⚔ 去闯关 (3) ]                │ 主CTA
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                     │
│  我的段位                    距离白银  │ 段位区
│  🥉 青铜 III                   244 分│ 移到下方
│  ━━━━━━━━━━━━━━━━━━━━━           │ 进度条
│                                     │
│  本周进度 ▾                          │ 折叠
└─────────────────────────────────────┘
```

### 3.3 关键改动清单

1. **背景**：从 `bg: #0B1026` 改为 `bg: linear-gradient(180deg, var(--bg-from), var(--bg-to))`
2. **顶部数据条整个删除**（今日 3/3、积分、连击）—— 改为浮动徽章放在肥仔卡片底部
3. **新增"肥仔英雄卡片"**：白色 paper，圆角 24px，立体 3px，肥仔 240×240 居中，下方问候语 + 3 个徽章
4. **段位卡降级**：从首屏 C 位移到滚动后看到的位置，体积缩小一半
5. **"今日小怪"提升到第二屏区**：3 张卡片横向排列（窄屏滚动）
6. **"去闯关"主 CTA 居中突出**：黄色 2.5D 按钮，glow-fatboy 阴影
7. **周历条 collapse 默认**：减少首屏干扰
8. **删除 "5月13日 周三"**："周三 5月13日" 改为浅灰小字，不抢戏
9. **"d" 用户名**：如果是占位，改成 "肥仔" 或具体昵称

### 3.4 文案改动

| 原文 | 新文 |
|---|---|
| "你好，肥仔 ✨" | "下午好，肥仔" / "晚上好，肥仔"（按时段） |
| "5月13日 周三" 大字 | "周三 5月13日"（顶部小字） |
| "距离 白银 还差 244 分" | "距离白银 · 还差 244 ⭐" |
| "🎁商店" | "商店"（移除 emoji） |
| "+ 加一个" | "+ 新任务" |
| "点击查看完整日历 →" | "查看完整日历 →" |
| "本周任务" 重复 | 保留一次即可 |

### 3.5 浮动徽章组件

```tsx
function FloatingBadge({ icon, value, color }) {
  return (
    <span
      className="float-badge"
      style={{
        background: color,
        color: color === 'var(--fatboy-500)' ? 'var(--ink)' : 'white',
      }}
    >
      <span className="float-badge-icon">{icon}</span>
      <span className="text-num">{value}</span>
    </span>
  );
}
```

```css
.float-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 100px;
  font-weight: 700;
  font-size: 16px;
  box-shadow: var(--shadow-sm);
  position: relative;
}
.float-badge::after {
  content: '';
  position: absolute;
  inset: 2px 0 -2px 0;
  background: inherit;
  border-radius: 100px;
  z-index: -1;
  filter: brightness(0.7);
}
```

---

## §4 · 闯关准备页改造（Image 4 → 新版）

### 4.1 当前问题

- 顶部"🔒闯关中 ⚔闯关"标签冗余
- 肥仔图很小（emoji 大小）
- "下一只小怪 raz阅读" 文字感太强，无对决感
- 蓝紫渐变"我要开始"按钮（要淘汰）
- 下方"今日得分明细"列表占了一半空间，与"准备闯关"心智冲突

### 4.2 目标布局（对决感）

```
┌─────────────────────────────────────┐
│ [← 返回]  闯关中           [家长]    │
├─────────────────────────────────────┤
│                                     │
│                                     │
│   🟡 肥仔                  🐙 阅读怪 │ 左右对峙
│  (240, focused 状态)      (180×180) │
│  (握拳准备)                (默认状态) │
│                                     │
│              ⚔ VS                   │ 中间金色VS
│                                     │ (呼吸动画)
│                                     │
│         下一只小怪                   │ caption ink-muted
│         raz阅读                      │ h1 ink bold
│         预估 10 分 · ⭐ 由家长定      │ body ink-muted
│                                     │
│   ┌──────────────────────────────┐  │
│   │     ▶ 我要开始              │  │ 主CTA 黄色2.5D
│   └──────────────────────────────┘  │
│         点了才会开始计时             │ caption muted
│                                     │
├─────────────────────────────────────┤
│ 今日得分明细 (3/3 评分)  已得 77 ⭐ │ 折叠默认
│   ▾ 展开详情                        │
└─────────────────────────────────────┘
```

### 4.3 关键改动

1. **顶部"🔒闯关中⚔闯关"标签**：移除冗余，改为单一标题"闯关中"
2. **肥仔放大**：240px，focused 状态（之前是 70px）
3. **新增"小怪形象"**：先用任务的 emoji（🐙📚🔢等）做大尺寸 180×180 显示，加白色卡片包裹
4. **新增"VS"对决标志**：中间金色文字 + 双剑图标
5. **"我要开始"按钮**：从蓝紫渐变改为黄色 2.5D 按钮 + `glow-fatboy`
6. **得分明细列表**：折叠默认，让"准备闯关"成为唯一焦点
7. **"等待中 0:03 / 03:00 后通知家长"**：这个文字逻辑不清晰，建议改为"准备好就开始 →"或干脆移除（如果不重要）

### 4.4 文案改动

| 原文 | 新文 |
|---|---|
| "🔒 闯关中 ⚔ 闯关" | "闯关中" |
| "下一只小怪" | "下一关" 或 "迎战" |
| "raz阅读" | 保留 |
| "🕐 预估 10 分钟" | "预估 10 分" |
| "⭐ 由家长评分时定" | "积分由家长评分" |
| "▶ 我要开始" | "▶ 我要开始" 保留 |
| "点了才会开始计时" | 保留（这是好的安全设计） |

---

## §5 · 倒计时页改造（Image 5 → 新版）

### 5.1 当前问题

- "🔒闯关中 ⚔闯关" 顶部标签冗余
- 肥仔小（emoji 大小）
- "09:59" 数字虽然大，但用了系统默认字体，缺乏戏剧性
- "击败！我完成了"按钮还是紫蓝渐变（要淘汰）
- 评级星星（4颗灰白星）位置奇怪，不知道是什么意思
- 彩虹进度条保留（这是产品最珍贵的视觉，不动）

### 5.2 目标布局（战斗中氛围）

```
┌─────────────────────────────────────┐
│ [Ⅱ 暂停]  闯关中  raz阅读  [家长]   │
├─────────────────────────────────────┤
│                                     │
│   🟡  ←→  🐙  ←→                    │ 顶部并排
│  (80, focused)  (60, damaged)       │ 肥仔 + 小怪受损
│  对峙线（虚线连接，金色）             │
│                                     │
│              09:59                  │ Hero 数字 72pt
│           Fredoka SemiBold          │ 居中
│           tabular-nums              │
│                                     │
│         已用 0 分 · 总额度 10 分     │ caption muted
│                                     │
│   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ ← 彩虹进度条（保留）
│         (粉→橙→黄→绿)               │
│                                     │
│   ┌──────────────────────────────┐  │
│   │   ⚡ 击败！我完成了         │  │ 主CTA 黄色2.5D
│   └──────────────────────────────┘  │ + glow-fatboy
│                                     │
│   [Ⅱ 暂停 (剩1次)]   [⏰ 延时]      │ 次CTA 白底
│                                     │
├─────────────────────────────────────┤
│ 今日得分: 77 ⭐ (3/3)  ▾            │ 折叠
└─────────────────────────────────────┘
```

### 5.3 关键改动

1. **顶部标签简化**：从"🔒闯关中 ⚔闯关"改为"闯关中 raz阅读"
2. **肥仔 + 小怪同时出现在顶部**：让用户感觉是"我在和小怪战斗"
3. **删除 4 颗灰白星**：意义不明
4. **"09:59"使用 Fredoka SemiBold + tabular-nums**：Q弹圆润的多邻国数字感
5. **"击败！我完成了"按钮**：从紫蓝渐变改为黄色 2.5D，加 glow
6. **彩虹进度条保留**：颜色微调（粉→橙→黄→绿，去掉紫色一段）
7. **倒计时最后 5 分钟**：肥仔切换到 tense 状态 + 抖动动画 + 背景渐变到 dusk 色调（黄昏紧迫感）
8. **小怪状态切换**：随时间从 default → damaged → damaged+shake

### 5.4 紧迫感渐进设计

| 剩余时间 | 肥仔状态 | 小怪状态 | 背景色调 |
|---|---|---|---|
| > 50% | focused | default | day |
| 25-50% | focused | damaged | day → dusk 过渡 |
| < 5 分钟 | tense + shake | damaged + shake | dusk |
| < 1 分钟 | tense + shake | damaged + shake | dusk + 心跳脉冲 |

---

## §6 · 击败页改造（Image 6 / 7 → 新版）

### 6.1 当前问题

- "💥击败！等家长来评分 🎉" 胶囊在顶部，绿色，配色不统一
- 肥仔 celebrate 状态 OK 但缺少粒子和动效
- "今日通关！" 黄色大字不错，但下方四行统计太工具化
- 背景星空粒子稀疏
- "回首页"按钮还是紫蓝渐变

### 6.2 目标布局（3 秒戏剧仪式）

**阶段 1（0-1.5s）：击败瞬间**
```
┌─────────────────────────────────────┐ bg: 暖黄爆闪 (#FFD15C → fade)
│                                     │
│                                     │
│         [肥仔 celebrate 动画]        │ 240×240
│         (从底部 spring 弹入)          │
│         (周围金色粒子爆发 40 颗)      │
│                                     │
│            击 败 ！                  │ display 40pt
│         (字体描边发光)               │ ink + glow-fatboy
│                                     │
│         + 32 ⭐                      │ hero 56pt
│         (数字滚动动画 800ms)         │ tabular-nums
│                                     │
└─────────────────────────────────────┘
```

**阶段 2（1.5-3s）：评分提示**
```
┌─────────────────────────────────────┐ bg: 渐变回 day
│                                     │
│         [肥仔 resting 状态]          │
│         (慢呼吸 4.5s)                │
│                                     │
│         今日通关！                    │ display 32pt
│      ✨ 今天的小怪都被你击败了        │ body ink-muted
│                                     │
│   ┌─────────────────────────────┐   │ 通关总结卡
│   │  ⚡ 击败小怪      3 只      │   │ paper, radius-lg
│   │  ⏱ 总用时       45 分钟    │   │ shadow-md
│   │  🚀 最快一项     raz阅读    │   │ 立体 3px
│   │  🔥 当前连击     2 天      │   │
│   └─────────────────────────────┘   │
│                                     │
│   ┌─────────────────────────────┐   │
│   │   等家长来评分              │   │ 次CTA 白底
│   │   ↓ 评分后可领取积分        │   │
│   └─────────────────────────────┘   │
│                                     │
│         [回首页]                    │ 主CTA 黄色2.5D
│                                     │
└─────────────────────────────────────┘
```

### 6.3 鼓励文案池（30 条）

随机抽取一条显示在击败瞬间下方：

```ts
const VICTORY_PRAISES = [
  "厉害！又消灭一只！",
  "肥仔学得真好！",
  "这只小怪没扛住几下",
  "战斗经验 +1",
  "再来一只？",
  "今天的肥仔太猛了",
  "Boss 都在颤抖",
  "这就是实力",
  "妈妈看到一定开心",
  "爸爸看到一定开心",
  "比昨天还快！",
  "技术越来越精进了",
  "一气呵成",
  "稳如老狗",
  "肥仔今日精神饱满",
  "学神附体",
  "这操作绝了",
  "Smooth!",
  "稳稳的胜利",
  "你又进步了",
  "小怪闻风丧胆",
  "再接再厉",
  "这一击有水准",
  "肥仔的实力又增加了",
  "做得真不错",
  "今天的肥仔状态满分",
  "好样的",
  "继续保持",
  "完美收官",
  "今日份的厉害",
];
```

**文案规则**：
- 不出现"你"或"您"
- 不出现"作业"或"学习"
- 长度 ≤ 12 字
- 多用动词和名词

### 6.4 关键改动

1. **删除顶部"💥击败！等家长来评分 🎉"绿色胶囊**：这个信息合并到下方
2. **分阶段动画**：阶段 1 暖黄爆闪 + 数字滚动；阶段 2 通关总结
3. **粒子系统**：用 `canvas-confetti` 库，金色 + 暖橙 + 白色 40 颗
4. **数字滚动**：每位数独立翻滚 800ms ease-out-quart
5. **背景**：阶段 1 短暂转为 `#FFE4B5`（暖黄黄昏色），1.5s 后渐回当前时段
6. **删除蛋仔彩蛋胶囊**：如果还存在，移除（这个像广告位）
7. **"回首页"按钮**：紫蓝渐变 → 黄色 2.5D

---

## §7 · 评分页改造（Image 13 → 新版）

### 7.1 当前问题（这页最严重）

- "完美/很好/OK/加油" 四色横排（棕/绿/蓝/红）**严重违反低饱和治愈感原则**
- 颜色强度太高，像四个警示灯
- "全部完美评分"金色按钮还行，但和四色按钮一起更乱
- 整体配色是产品中最违和的

### 7.2 目标布局

```
┌─────────────────────────────────────┐
│ [← 返回]  待评分                     │
├─────────────────────────────────────┤
│                                     │
│  待评分 (2)        [✨ 全部完美评分]  │
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📊 神机妙算  孩子加的     详细 →││ 任务卡 paper
│  │ 完成于 17:05:15               ││
│  │ ┌─────┐┌─────┐┌─────┐┌─────┐  ││ 评分按钮 4 个
│  │ │完美 ││很好 ││ OK  ││加油 │  ││ 统一灰底
│  │ │ ⭐  ││ 👍  ││ 😊  ││ 💪  │  ││ 选中后才变色
│  │ └─────┘└─────┘└─────┘└─────┘  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─────────────────────────────────┐│
│  │ 📖 raz阅读  孩子加的      详细 →││
│  │ 完成于 17:04:08               ││
│  │ [完美][很好][OK][加油]         ││
│  └─────────────────────────────────┘│
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                     │
│  已评分（最近）                     │
│  ✓ 神机妙算   已评分              │
│  ✓ raz阅读   已评分              │
│  ✓ 阅读      已评分              │
└─────────────────────────────────────┘
```

### 7.3 评分按钮新设计

**未选中状态**（默认）：
```css
.rating-btn {
  flex: 1;
  padding: 14px 0;
  background: var(--mist);
  border: 2px solid var(--fog);
  border-radius: var(--radius-sm);
  color: var(--ink-muted);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s var(--spring-bouncy);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.rating-btn:hover {
  border-color: var(--sky-300);
  background: var(--paper);
  color: var(--ink);
  transform: translateY(-2px);
}
```

**选中后**（4 个选项各有微差异，但统一低饱和）：
```css
.rating-btn[data-rating="perfect"].selected {
  background: var(--fatboy-50);
  border-color: var(--fatboy-500);
  color: var(--fatboy-700);
}
.rating-btn[data-rating="good"].selected {
  background: #E8F5E8;
  border-color: var(--success);
  color: #2D8A2D;
}
.rating-btn[data-rating="ok"].selected {
  background: var(--sky-100);
  border-color: var(--sky-500);
  color: var(--sky-700);
}
.rating-btn[data-rating="encourage"].selected {
  background: #FFE8E8;
  border-color: var(--danger);
  color: #C04545;
}
```

### 7.4 关键改动

1. **四色按钮统一未选状态**：全部灰底，只在选中后才显色
2. **饱和度全面降低**：当前的棕/绿/蓝/红太刺眼
3. **按钮内加 emoji**：⭐👍😊💪 让评分更有情感（不是纯色色块）
4. **加 "✨ 全部完美评分" 按钮**：当前已有，保留但样式调整为黄色 2.5D 主按钮
5. **每张任务卡用 paper 白底**：和当前黑底不同，让卡片"漂浮"感更强

---

## §8 · 闯关结算页（Image 7 / 8 → 新版）

### 8.1 当前问题

- "这一轮全部击败！" 紫蓝渐变"回首页"按钮（要淘汰）
- "今日得分明细"列表的左侧颜色边框（粉/蓝/无）含义不清
- "+11 / +32 / +34" 积分文字偏小，没有"积分到账"的喜悦感
- "蛋仔彩蛋（今日 1 次） +5 分" 这个胶囊不知道是啥

### 8.2 目标布局

```
┌─────────────────────────────────────┐
│                                     │
│      🟡 [肥仔 celebrate]            │
│      (240×240 + 粒子)               │
│                                     │
│         这一轮全部击败！              │ display 32pt
│         等家长给你打分吧             │ body muted
│                                     │
│      ┌─────────────────┐            │
│      │   ← 回首页      │            │ 主CTA 黄色2.5D
│      └─────────────────┘            │
│                                     │
├─────────────────────────────────────┤
│                                     │
│ 今日得分明细                  82⭐(3/4)│
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✓ 📖 raz阅读 (孩子加的)    +11⭐│ │ paper card
│ │   已评分                       │ │ radius-lg
│ │   完成度⭐⭐⭐⭐⭐ 质量⭐⭐⭐⭐⭐│ │ shadow-sm
│ │   基础 5 → 实得 6 + 5提前奖    │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ✓ 🧮 神机妙算 (必做)       +32⭐│ │ 必做的左侧加红色 4px 边
│ │   已评分                       │ │
│ │   ...                          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ✓ 📖 阅读                  +34⭐│ │
│ │   ...                          │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ ? 📖 raz阅读 (孩子加的)         │ │ 待评分卡片
│ │   待评分              [撤回 ↻]  │ │ 灰色边
│ └─────────────────────────────────┘ │
│                                     │
│ 🎲 蛋仔彩蛋（今日 1 次）       +5 ⭐│ 删除或重设计
└─────────────────────────────────────┘
```

### 8.3 关键改动

1. **"回首页"按钮**：紫蓝渐变 → 黄色 2.5D
2. **左侧颜色边框规则化**：
   - 必做任务：左侧 4px `var(--danger)` 边
   - 普通任务：无左边
   - 待评分：左侧 4px `var(--fog)` 边
3. **积分数字加大 + 颜色**：`+32 ⭐` 用 Fredoka Bold 24pt + `var(--fatboy-500)`
4. **"蛋仔彩蛋"**：如果这是已有功能，保留但样式调整；如果不重要，移除

### 8.4 文案改动

| 原文 | 新文 |
|---|---|
| "这一轮全部击败！" | 保留 |
| "等家长给你打分吧" | 保留 |
| "回首页" | "回首页" |
| "基础 5 → 实得 6 分 +5 提前奖" | "基础 5 → 实得 6 ⭐ · 提前奖 +5" |

---

## §9 · 添加任务弹窗（Image 3 → 新版）

### 9.1 当前问题

- 整体深紫黑底
- "我要加一个任务" 标题旁有黄色✨emoji
- 紫色"其他"按钮和紫色"20 分"按钮过于显眼
- "添加"按钮蓝紫渐变（要淘汰）
- 模板/类型/用时三组按钮风格不统一

### 9.2 目标布局

```
┌─────────────────────────────────────┐
│                                     │
│  ✨ 我要加一个任务              [×] │ h1 ink
│  积分由家长在评分时给你              │ caption muted
│                                     │
│  📋 选一个模板（可选）              │ h3 ink
│  ┌────┐┌────┐┌────┐┌────┐┌────┐    │ tag-btn 灰底
│  │raz │ │raz│ │raz│ │aa │ │阅读│    │
│  │阅读│ │   │ │打开│ │   │ │   │   │
│  └────┘└────┘└────┘└────┘└────┘    │
│  ┌────┐                            │
│  │神机│                            │
│  └────┘                            │
│                                     │
│  任务名字                            │ h3
│  ┌─────────────────────────────────┐│
│  │ 例如：背 10 个单词              ││ input
│  └─────────────────────────────────┘│
│                                     │
│  类型                                │ h3
│  ┌────┐┌────┐┌────┐┌────┐┌────┐    │ tag-btn
│  │数学│ │语文│ │英语│ │阅读│ │练字│    │
│  └────┘└────┘└────┘└────┘└────┘    │
│  ┌────┐                            │
│  │其他│                            │
│  └────┘                            │
│                                     │
│  预计用时                            │ h3
│  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐         │ tag-btn
│  │10│ │15│ │20│ │30│ │45│ │60│     │
│  │分│ │分│ │分│ │分│ │分│ │分│     │
│  └──┘└──┘└──┘└──┘└──┘└──┘         │
│                                     │
│  [取消]              [✓ 添加]       │ 次CTA + 主CTA
└─────────────────────────────────────┘
```

### 9.3 关键改动

1. **背景**：深紫黑 → 当前时段背景的浅色版（白天用 `var(--mist)`）
2. **所有 tag-btn 统一样式**：灰底未选 / 黄底已选
3. **"添加"按钮**：蓝紫渐变 → 黄色 2.5D
4. **"取消"按钮**：次CTA 白底蓝边
5. **emoji 保留在 input 占位符**：用户输入区可保留
6. **emoji 在 tag-btn 上的处理**：保留（这些是用户的视觉记忆点）

---

## §10 · 角色选择弹窗（Image 10 → 新版）

### 10.1 当前问题（实际上做得不错，小调整）

- 标题 "● 选择肥仔角色" 前的灰色圆点不知道是啥
- 卡片背景是深紫黑，和我们 V2 的浅色调有冲突
- 选中状态黄色边框 + 黄色"✓ 当前" 这个很好
- 锁定卡片灰显也合理
- "连击 X 天解锁" 文案很好

### 10.2 改动建议

```css
.character-modal {
  background: var(--paper);   /* 白底，治愈 */
  color: var(--ink);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
}
.character-card {
  background: var(--mist);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
}
.character-card.unlocked.current {
  border-color: var(--fatboy-500);
  background: var(--fatboy-50);
  box-shadow: var(--glow-fatboy);
}
.character-card.unlocked:not(.current) {
  cursor: pointer;
}
.character-card.unlocked:hover {
  transform: translateY(-3px);
  border-color: var(--sky-300);
}
.character-card.locked {
  opacity: 0.5;
  filter: grayscale(0.8);
}
```

文案调整：
- 标题 "● 选择肥仔角色" → "选择肥仔角色"（删除前面的圆点）
- "已解锁 3/8" 保留，但放右上角小字
- "✓ 当前" 保留，黄色

---

## §11 · 求助弹窗（Image 9 → 新版）

### 11.1 当前问题

- 整个弹窗一个粉色边框（视觉强度过高）
- 标题"要给爸妈发求助吗？"用了粉色，和粉色"发出求助"按钮重复
- 🙋‍♂️ emoji 太大占主视觉

### 11.2 改动

```
┌─────────────────────────────────────┐
│                                     │
│         [HandHelping icon]          │ lucide icon 48px
│         sky-500 色                  │
│                                     │
│      要给爸妈发求助吗？             │ h2 ink
│      会推送一条"需要帮助"           │ body muted
│      的通知到爸妈手机                │
│                                     │
│   [取消]            [发出求助]      │ 次CTA + 主CTA(danger)
│                                     │
└─────────────────────────────────────┘
```

- 删除粉色边框
- 把 emoji 改为 lucide 的 `<HandHelping />` icon
- 主按钮用 `var(--danger)` 红色（求助是紧迫场景，用红色合理）
- 取消按钮次 CTA

---

## §12 · 家长面板改造（Image 11 → 新版）

### 12.1 当前问题

- 顶部 "👨🧑 家长面板" 用了系统 emoji
- "✨ 一键分析（本周）" 紫蓝渐变（要淘汰）
- 功能入口卡片用 emoji 做 icon
- 整体还是深紫黑底

### 12.2 改动

```
┌─────────────────────────────────────┐ bg 时段切换
│ [← 退出家长模式]    家长面板         │
├─────────────────────────────────────┤
│ 今日作业       累计积分      连击    │
│   5             361          2 天   │ 大数字+tabular
│                                     │
├─────────────────────────────────────┤
│ ┌──────────┐┌──────────┐┌──────────┐│ 三卡并排
│ │ 连击     ││ 本周积分 ││ 最慢学科 ││ paper白底
│ │ 2 天    ││ 612     ││ 英语    ││
│ │ 在涨·最长2││ +612 ↑  ││ 13/135分││
│ └──────────┘└──────────┘└──────────┘│
│                                     │
│ ┌─────────────────┐┌──────────────┐ │
│ │ ✨ 一键分析(本周) │ │  ▶ 展开图表 │ │ 主CTA黄 + 次CTA
│ └─────────────────┘└──────────────┘ │
│                                     │
│ 功能入口                             │
│ ┌──────────────┐┌──────────────┐    │
│ │📋任务管理    ││⭐待评分      │    │ paper card
│ │一次性+循环   ││2 项等你评分  │    │ shadow-sm
│ └──────────────┘└──────────────┘    │
│ ┌──────────────┐┌──────────────┐    │
│ │🎁奖励商店    ││📱通知接收人  │    │
│ │管理可兑换奖励│ │配置 Bark 推送 │    │
│ └──────────────┘└──────────────┘    │
│ ┌──────────────┐┌──────────────┐    │
│ │⚙ 设置        ││📅贡献日历    │    │
│ │PIN/密保/通知 ││月度热力+导出 │    │
│ └──────────────┘└──────────────┘    │
│ ┌──────────────┐                    │
│ │💾 数据        │                   │
│ │导出/导入备份  │                   │
│ └──────────────┘                    │
└─────────────────────────────────────┘
```

### 12.3 关键改动

1. **删除"👨🧑"emoji**：标题"家长面板"足够
2. **"一键分析" 主CTA**：紫蓝渐变 → 黄色 2.5D
3. **"展开图表" 次CTA**：白底蓝边
4. **功能入口卡片用 lucide icon 替换 emoji**：见 §1.5
5. **卡片改为 paper 白底**：和首页风格统一
6. **数字用 Fredoka + tabular**

---

## §13 · 任务管理页（Image 12 → 新版）

### 13.1 当前问题

- "+ 新建" 按钮是紫蓝渐变（要淘汰）
- 全部/普通/每日必做/每周N次/每周一次 5 个 tab，紫色被选中很跳
- 任务列表卡片间距不够
- "必做" 红色胶囊好

### 13.2 改动

```
┌─────────────────────────────────────┐
│ [← 返回]  任务管理        [+ 新建]   │ 主CTA黄色
├─────────────────────────────────────┤
│ [全部] [普通] [每日必做] [每周N次]  │ tab按钮 灰底/黄底
│ [每周一次]                          │
├─────────────────────────────────────┤
│ 📝 一次性任务                       │ h2
│ ┌─────────────────────────────────┐ │ 任务卡 paper
│ │ 🧮 神机妙算   孩子加的   [必做] ││ 间距更大
│ │ 2026-05-13 · 25分 · 积分待定    │ │
│ │                            [🗑] ││
│ └─────────────────────────────────┘ │
│ ...                                 │
└─────────────────────────────────────┘
```

### 13.3 关键改动

1. **"+ 新建"按钮**：紫蓝渐变 → 黄色 2.5D
2. **tab 按钮**：用 §2.4 的 tag-btn 样式
3. **任务卡间距**：从 4px 加到 12px（gap-3）
4. **删除按钮**：emoji 🗑 → lucide `<Trash2 />` 红色

---

## §14 · 状态文案统一

把英文状态文案中文化：

| 现状 | 改为 |
|---|---|
| `done` | 已完成 |
| `evaluated` | 已评分 |
| `pending` | 待处理 |
| `待评分` | 保留 |
| `已评分` | 保留 |

---

## §15 · 验收清单

每页改完后逐项检查：

### 全局
- [ ] 所有页面背景是浅色（夜晚除外）
- [ ] 全产品没有紫青/蓝紫渐变按钮
- [ ] 所有主 CTA 都是黄色 2.5D
- [ ] 所有次 CTA 都是白底蓝边
- [ ] §1.5 映射表里的所有 emoji 都已替换为 lucide icon
- [ ] 数字都用 Fredoka + tabular-nums
- [ ] 21:00 后访问，背景切到夜晚版
- [ ] 白天访问能看到漂浮云

### 首页（§3）
- [ ] 肥仔形象 240×240 居中
- [ ] 顶部数据条已删除
- [ ] 浮动徽章在肥仔卡片底部
- [ ] "去闯关"主 CTA 居中突出

### 闯关流程（§4-§6）
- [ ] 准备页有 VS 对决感
- [ ] 倒计时页肥仔状态根据剩余时间切换
- [ ] 击败页有 3 秒动画仪式
- [ ] 粒子爆发效果实现

### 评分（§7）
- [ ] 评分按钮未选中状态统一灰底
- [ ] 不再"花花绿绿"

### 弹窗（§9-§11）
- [ ] 添加任务弹窗淡色化
- [ ] 角色选择弹窗白底化
- [ ] 求助弹窗去粉色边框

### 家长侧（§12-§13）
- [ ] 家长面板卡片化重排
- [ ] 任务管理页按钮淘汰渐变

---

## §16 · 优先级与执行顺序

按这个顺序做，每阶段独立 commit：

| 阶段 | 内容 | 工期 |
|---|---|---|
| **P0** | §1 design tokens 注入 + §1.5 emoji 替换 + §2 按钮系统 | 半天 |
| **P1** | §3 首页 + §4 闯关准备 + §5 倒计时 + §6 击败页（核心交互） | 2 天 |
| **P2** | §7 评分页 + §8 结算页（家长侧 + 闭环关键） | 半天 |
| **P3** | §9 添加任务 + §10 角色选择 + §11 求助（弹窗） | 半天 |
| **P4** | §12 家长面板 + §13 任务管理（管理侧） | 半天 |
| **P5** | §14 状态文案 + §15 验收 + §16 收尾打磨 | 半天 |

**总工期估算**：4-5 天（全力以赴）/ 1-2 周（业余推进）

---

## §17 · 给 Claude 的最终指令

**当 Frank 把这份文档和项目一起给你时，你这样开始**：

1. 阅读完本文档
2. 运行 `ls -la src/` 了解项目结构
3. 找出主路由配置和首页组件
4. 列出 **你计划修改的所有文件**（不要直接动手）
5. 把列表给 Frank，问他确认从哪个 P0/P1 开始
6. 一次只改一页，git commit message 用 `style(page): apply v2.0 design tokens`
7. 每页改完截图给 Frank 看，他确认后再下一页
8. **绝不修改任何业务逻辑**（API 调用、state 管理、路由跳转）

---

**END · 现在请 Claude 开始执行 P0。**
