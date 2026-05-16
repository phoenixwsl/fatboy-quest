---
name: gallery-design
description: |
  Use BEFORE any decision involving fatboy-quest's gallery (画廊/相片墙/album), the feature replacing StudyRoom's legacy single-poster decoration. Trigger on: 画廊/gallery/相册/瀑布流/masonry/lightbox/单击放大/图片上传/image upload/EXIF/IndexedDB blob/美术馆/caption/作者/curated/策展, and on any change to `src/components/home/StudyRoom.tsx` or 肥仔之家. Defines: philosophy (温馨家庭画廊, NOT 高冷艺术展/Pinterest/朋友圈), masonry (CSS columns, 2/3 cols iPad), compression + 100-image cap (JPEG 0.82, 长边 1200px), permissions (双端可传仅家长可删), museum-label lightbox (米白底 NOT 黑底, optional artist/year/medium/caption), pre-rejected features (no likes/comments/AI filters/sharing/leaderboards). Apply before component code, before DB schema changes for galleryImages, before any gallery feature. Without it, gallery changes drift to Pinterest aesthetics or break storage budget.
---

# Gallery Design Skill — 温馨家庭画廊

你正在设计 fatboy-quest 的画廊功能 —— 这个功能**替换**掉 StudyRoom 当前墙上唯一那张装饰海报 (`src/assets/home/paintings/center_hero.jpg`),把它扩展成一面**可上传、可策展、可放大欣赏**的家庭相片墙.

本 skill 把所有画廊决策对准同一个目标:

> **温馨家庭画廊,像家里客厅墙上挂的相片墙.NOT 美术馆 / NOT Instagram / NOT Pinterest / NOT 朋友圈九宫格 / NOT 抖音瀑布流.**

家人会站在它前面,孩子会指着自己上传的画问"妈妈你看!",晚上灯光打在白色相框上有一点点暖光晕.这是设计的灵魂检验题.

---

## When to use this skill

Trigger eagerly when:

- 设计或修改画廊功能本身(瀑布流、单击放大、上传、删除、管理 UI)
- 改动 `src/components/home/StudyRoom.tsx` 或 `src/components/home/study-room.css` —— 画廊就活在这里
- 增/改 DB schema 涉及 `galleryImages` 表
- 写图片上传/压缩/EXIF 处理/Blob 存储代码
- 设计瀑布流/masonry 布局(即使不在画廊页,法则也适用)
- 设计图片 lightbox / 单击放大流程
- 选择 caption 字体、相框样式、画廊页颜色 token
- 任何针对画廊的"feature 想法"(点赞、评论、AI 滤镜、分享、排行榜……)
- 用户截图画廊说"难看 / cheap / 像 Pinterest / 不对劲"

**Bias toward triggering.** 不加载本 skill 的画廊改动几乎一定会跑偏到 Pinterest/电商美学,或撞破存储预算.

---

## Workflow

1. **先过 children-app-design.** 任何新画廊 feature(例如"加 AI 滤镜按钮"、"显示点赞数")**必须先**在 `children-app-design/SKILL.md` 走 4 维度评分(A 心理健康影响 / B 家长信任 / C 复杂度 / D 替代 vs 促进亲子互动,各 -2 到 +2).总分 < 0 拒掉;0-3 谨慎;>3 才进入本 skill 做执行设计.
2. **视觉投诉先诊断后开方.** 用户说"看起来 cheap / 像 Pinterest" → 几乎一定是这几条之一:(a)留白不够,(b)灰色被周围暖 token 拉偏,(c)圆角太小,(d)没白色相框边,(e) sans-serif caption 跟温暖基调打架.先点名违反的法则,再修.
3. **匹配范围.** 加 1 张图 / 改 1 处 caption → 快速编辑;新权限流 / 新元数据字段 / 新 lightbox 交互 → 必看第 7 节(权限)和第 8 节(lightbox).
4. **用 baked-in tokens.** 不要发明新颜色 —— 画廊用 cozy 主题的 `--surface-paper` / `--ink-strong` / `--ink-soft` / `--accent`,加 3 个本 skill 第 4 节定义的画廊专属 token.
5. **跑 pre-flight 检查清单(第 12 节)** 再宣布完成.

---

## 1. 定位 —— 一句话,永远不忘

> **这是肥仔家客厅墙上的相片墙.**

当任何决策犹豫时,问一句:

> **"这个改动会让相片墙更像家,还是更像 app?"**

答"更像 app" → 拒掉.

---

## 2. 决策门槛 —— 本 skill 是专项层

按 CLAUDE.md 第 4 节的决策链:

```
[children-app-design 决策框架]    ← 任何新画廊 feature 都先过这里(4 维度评分)
            ↓
[gallery-design 本 skill]         ← 执行细节
            ↓
[visual-design / adhd-ux]         ← 进一步下钻(颜色 / 时间反馈)
            ↓
[release-checklist]               ← 守门发版
```

**没过决策框架的画廊功能,本 skill 不参与设计.**

举例:用户说"加点赞数",先回到 children-app-design 评分(肯定 < 0,见第 10 节),反提议替代方案后再回来,本 skill 才考虑视觉.

---

## 3. 灵魂参考 —— 5 个抄的, 5 个不抄的

### ✓ 抄它的

| 参考 | 抄它的什么 |
|---|---|
| **Apple Memories 卡片** | 暖色调家庭回忆滤镜、圆角卡片、克制的衬线 caption、慢节奏入场动画 |
| **Polaroid 拍立得相片墙** | 白色相框边 (4-8px)、微阴影、手写体 caption、轻微随机旋转 ±1.5° |
| **Animal Crossing 室内装饰** | 木质 + 暖光 + 草本绿调色板、gif-like 静谧动效、零焦虑 |
| **Eric Carle / Hervé Tullet 儿童绘本** | 圆角、手绘装饰图标、拼贴感、不"印刷感"、温度优先于精度 |
| **真实美术馆 wall label**(MoMA / 中国美术馆解说牌)| 极简标签格式:作者 / 年份 / 媒介 / (可选)说明,左对齐,衬线小字 |

### ✗ 不抄

| 反面案例 | 为什么不抄 |
|---|---|
| **Pinterest** | 密度过高、商品瀑布流感、cheap、"为了看更多"的电商心智 |
| **黑底 lightbox**(Instagram / Twitter / Lightroom)| 太冷、太"专业",跟"温馨家"完全反向 |
| **抖音/快手瀑布流** | 速度太快、无留白、鼓励无限滑动、反 ADHD 友好 |
| **朋友圈九宫格** | 强制裁剪、固定比例、无策展感 |
| **Behance / Dribbble 设计师作品集** | 太专业装腔、孩子看不懂、冷色调 |

---

## 4. 视觉法则(10 条)

### 法则 1:米白底,绝不用纯白也绝不用纯黑
- cozy 主题用 `--surface-paper`(~`oklch(0.97 0.015 80)` 米白)
- starry / mecha 主题下 fallback 到 `--surface-soft` —— 深色但**带暖意**(混 5-10% 暖橙 hue),**不要纯黑**
- 即使 starry 主题,画廊背景比页面其他部分**亮 5-8%** —— 模拟"灯光照在相框墙上"

### 法则 2:白色相框边 —— 这是相片墙的灵魂
- 每张图外包 `4-8px` 纯白 padding
- 外圈再加 `1px solid` 极淡米色描边(~`oklch(0.92 0.02 80)`),模拟相纸切边
- 投影:`box-shadow: 0 4px 12px oklch(0.3 0.02 50 / 0.08)` —— **暖色低饱阴影**,不要冷黑阴影

这一条最关键 —— 砍掉它,画廊立刻像 Pinterest.

### 法则 3:圆角 12-16px,不大不小
- 太小(≤4px):印刷感、商业感、显得 cheap
- 太大(≥24px):贴纸感、幼稚
- **12-16px** 是相纸切角的甜区

### 法则 4:随机微旋转 ±1.5°(可选,装饰墙模式)
- 默认**关闭**(强迫症友好 + 浏览专心)
- StudyRoom 入口的"墙上预览"模式(显示 9 张缩略)可开启 `--rotation: random(-1.5deg, 1.5deg)`,模拟手贴的不完美
- 进入完整画廊页时全部转正 —— "走近欣赏时画都端正"

### 法则 5:衬线字体做 caption
- **绝对不用** SF / Helvetica / Inter —— 太科技感
- 用 `font-family: "Source Han Serif SC", "Songti SC", "Noto Serif SC", Georgia, serif`
- 字号:12-14px(瀑布流卡片下方)/ 14-16px(lightbox 标签)
- 字色:`--ink-soft` 淡墨,**不要纯黑**
- `letter-spacing: 0.02em` 让衬线呼吸

### 法则 6:暖光阴影,不要冷光
- 阴影 hue 偏暖:`oklch(0.3 0.02 50 / 0.08)`(暖橙偏)
- ❌ `oklch(0 0 0 / 0.15)`(中性黑)—— 这是 Material Design / 商业 app 的阴影
- 阴影**向下偏移**比向四周扩散更"挂画"

### 法则 7:gap 16-24px,留白比图大胆
- 瀑布流 `column-gap = row-gap = 20px`(默认)
- 页面 padding 至少 16px,iPad 横屏 24px
- 顶栏与首图距离:32px(给空气)

### 法则 8:顶栏温度
- 不要 `border-bottom: 1px solid` 一道硬线 —— 太办公
- 改 `mask-image: linear-gradient(to bottom, transparent, black 8px)` 模糊过渡
- 或纯空气分隔(只靠间距)

### 法则 9:管理按钮**不显眼**
- ❌ 不要每张图右上角悬浮删除按钮 —— 破坏画廊感
- ✓ 删除入口在右上"管理"按钮,**仅家长可见**(见第 7 节)
- ✓ 上传按钮:瀑布流末尾一个**虚线边框 + 中央 "+"** 的卡片,等同于"挂新画"
- ✓ 进入"管理模式"后才显示删除按钮(单独的视觉态)

### 法则 10:加载动画 —— 纸张展开,不要 loading spinner
- 图片加载用 `opacity 0 → 1` over 400ms + 轻微 `scale 0.96 → 1`
- 像翻开一页纸,**不像** web app loading
- ❌ 不要用 lucide-react 的 `Loader2` 转圈
- ✓ 占位用浅米色 `--surface-soft` rectangle + 轻微 `pulse` 动画 (1.2s 一周期,opacity 0.6 ↔ 1.0)

### 画廊专属 tokens(在 `study-room.css` 添加)

```css
:root {
  /* 相框 */
  --gallery-frame-bg: oklch(1 0 0);                          /* 纯白相框 */
  --gallery-frame-border: oklch(0.92 0.02 80);               /* 米色切边 */
  --gallery-frame-shadow: 0 4px 12px oklch(0.3 0.02 50 / 0.08); /* 暖光阴影 */
  --gallery-frame-padding: 6px;
  --gallery-frame-radius: 14px;
  
  /* 字体 */
  --gallery-caption-font: "Source Han Serif SC", "Songti SC", "Noto Serif SC", Georgia, serif;
}

[data-theme="starry"], [data-theme="mecha"] {
  --gallery-frame-bg: oklch(0.95 0.01 80);                   /* 暗主题下相框略灰但仍暖 */
  --gallery-frame-shadow: 0 4px 16px oklch(0.5 0.05 50 / 0.18);
}
```

---

## 5. 瀑布流布局规范

### 5.1 列数

| 设备 / 方向 | 列数 |
|---|---|
| iPad 竖屏 | **2 列** |
| iPad 横屏 | **3 列** |
| (iPhone 不优化,本 app 是 iPad-only PWA) | n/a |

### 5.2 排列算法 —— 默认 CSS columns,不上第三方库

```css
.gallery-masonry {
  columns: 2;            /* 横屏覆盖到 3 */
  column-gap: 20px;
}
.gallery-masonry > .item {
  break-inside: avoid;   /* 防止单张图被切两列 */
  margin-bottom: 20px;
}
```

**理由**:
- CSS columns 浏览器原生短列优先填充,无需 JS 测量
- iOS Safari 性能好,无重排卡顿
- 横竖图混排自然(高度差异越大效果越好)

**缺点 & 何时切换**:
- CSS columns 的阅读顺序是 `1, 4, 7, 2, 5, 8, ...`(纵向短列优先),如果需求是"严格按上传时间倒序",顺序会乱
- 若用户后续要求严格时序 → 切到 JS 计算 (`react-masonry-css` 或手写短列优先 + `IntersectionObserver`)
- **不要一开始就引入第三方库**,先用 CSS columns 直到撞墙

### 5.3 卡片尺寸
- `width: 100%` of column
- `height: auto` 保持原图比例
- **不裁剪、不拉伸**,横竖混排都接受原比例
- 单卡最大宽度(横屏 3 列 + iPad 1024px viewport - padding 24*2 - gap 20*2):~310px,**够看不喧宾夺主**

### 5.4 进入动画
- 列表整体:**stagger fade-in**,每张图延迟 30ms,共 ~600ms 完成
- 单张图:`opacity 0 + translateY(8px) → 1 + 0`,400ms,ease-out
- ❌ **不要** spring / 弹跳 / 旋转入场 —— 太活泼,违反温馨克制
- ❌ **不要** 一次性全部显示(无入场感),也不要慢于 600ms(显得卡)

### 5.5 滚动
- `scroll-behavior: smooth`
- 不做无限滚动 —— 100 张全部可见即可,到底就是到底
- 不做"回到顶部"按钮 —— 100 张不长

---

## 6. 上传 + 压缩 + 存储规范

### 6.1 硬上限

| 项目 | 上限 | 理由 |
|---|---|---|
| **总张数** | **100 张** | iPad IndexedDB quota 安全垫 + "少即是多"美学 |
| 单张原图 | ≤ 20MB(超过拒绝) | iPad 拍照原图 ~3-5MB,20MB 是 RAW 上限 |
| 压缩后主图 | 长边 1200px, JPEG 0.82, ≤ 400KB | Web 显示足够清晰 |
| 缩略图(瀑布流用)| 长边 400px, JPEG 0.75, ~30KB | 瀑布流不渲染大图 |
| 单张总占用 | ~430KB(主+缩略)| 100 张总 ≈ 43MB,安全 |

### 6.2 压缩流程(上传时,纯前端 Canvas)

```
原图 File (来自 <input type="file" accept="image/*" capture="environment">)
  ↓ 1. 读 EXIF orientation 标记(iPad 拍照默认横躺,值常为 6/8)
  ↓ 2. <canvas> 绘制,应用 orientation 旋转矩阵
  ↓ 3. resize 到长边 1200px(保持比例)
  ↓ 4. canvas.toBlob('image/jpeg', 0.82) → fullBlob
  ↓ 5. 同一个 canvas 再 resize 到长边 400px → canvas.toBlob('image/jpeg', 0.75) → thumbBlob
  ↓ 6. 两个 Blob 存 IndexedDB galleryImages 表
```

**技术约束**:
- 用浏览器原生 `<canvas>` + `canvas.toBlob`(免费、无依赖)
- EXIF orientation 可手写读取 marker `0xFFE1`(50 行代码) 或 用 piexifjs(轻量 ~10KB)
- ❌ 不引入 sharp / imagemagick(Node 库,跑不动)
- ❌ 不引入 fabric.js / konva(太重,只为压缩不值)
- ❌ 不用 base64 存储 —— Blob 在 IndexedDB 是 first-class,base64 大 33%

### 6.3 容量预警

| 张数 | 行为 |
|---|---|
| < 90 | 正常上传,无提示 |
| 90 ~ 99 | 上传后弹软提示 toast:"画廊快满啦,还能挂 X 张" |
| = 100 | 上传按钮 disabled,虚线卡片改文案:"画廊已满,请家长删几张老作品再来" |

---

## 7. 权限模型 + DB schema

### 7.1 谁能做什么

| 操作 | 孩子端 (`/`, `/home`, `/quest`, ...) | 家长端 (`/parent/*`) |
|---|---|---|
| 浏览 | ✓ | ✓ |
| 单击放大 lightbox | ✓ | ✓ |
| 上传(相机/相册)| ✓ | ✓ |
| 编辑 caption / 作者 / 年份 / 媒介 | ✓(**仅自己上传的**)| ✓(任何)|
| **删除** | **✗** | ✓(二次确认弹窗)|
| 批量管理(选中删除多张)| ✗ | ✓(`/parent/gallery` 独立管理页)|

**设计理由**:**先信任后修正**.
- 孩子上传 immediately 可见 → 获得即时反馈,自尊感建立
- 家长事后 review,需要时删除即可(不引入"审核队列",那对孩子是冷的)
- 只有家长能删除 —— 但**不通过删除来打压**(配合二次确认 + 措辞温柔)

### 7.2 二次确认删除

家长点删除按钮 → 弹 modal:

```
┌─────────────────────────────────┐
│  [缩略图]                          │
│                                  │
│  确定要把肥仔的《向日葵》从画廊里取下吗?│
│  取下后不可恢复.                    │
│                                  │
│         [再想想]   [取下]          │
└─────────────────────────────────┘
```

**措辞细节**:
- ✓ 用 "**取下**" 不用 "**删除**" —— 拟物化,像从墙上拿下来
- ✓ 主按钮(默认 focus)是 "**再想想**" —— 提高误删摩擦
- ✓ "取下"按钮文字色用 `--state-warning-strong`(暖橙红),但**按钮底色保持中性**(`--surface-paper`)—— 克制不威慑
- ❌ 不要 "确认删除" / "永久删除" —— 太行政

### 7.3 DB schema(v9 → v10 migration)

```ts
// src/db/index.ts 新增
interface GalleryImage {
  id: string;                    // ulid / nanoid
  fullBlob: Blob;                // 长边 1200px JPEG 0.82
  thumbBlob: Blob;               // 长边 400px JPEG 0.75
  width: number;                 // 压缩后宽
  height: number;                // 压缩后高
  ratio: number;                 // width / height,瀑布流布局用
  uploadedBy: 'parent' | 'child';
  uploadedAt: number;            // Date.now()
  
  // 美术馆标签字段 —— 全部 optional
  title?: string;                // 作品名,如 "向日葵"
  artist?: string;               // 作者(默认 '肥仔' 当 uploadedBy='child' 时,可改)
  year?: number;                 // 创作年份
  medium?: string;               // 媒介:"蜡笔画" / "照片" / "iPad 涂鸦" / "水彩" 等
  caption?: string;              // 一句话说明,上限 80 字
}

// Dexie migration —— 注意:fatboy-quest 真实 schema 已演进到 v9
// 所以画廊表加在 v10 而不是 v7(skill 早期草稿写错了 v6→v7)
this.version(10).stores({
  // ...v9 所有 tables 保持(tasks/evaluations/.../skillCards/cards/...)
  galleryImages: 'id, uploadedAt, uploadedBy',  // 索引:按时间倒序 + 按上传者过滤
}).upgrade(async (tx) => {
  // v9 没有 galleryImages 表,无数据要迁移
  // seed:把原 StudyRoom 的 center_hero.jpg 转为第一张画廊图(artist='爸爸')
  // 让老用户升级后画廊不为空
});

// 别忘了同步:src/types/index.ts 里的 SCHEMA_VERSION 从 9 → 10
```

**注意点**:
- `Blob` 在 Dexie / IndexedDB 是 first-class —— 直接存,不要 base64
- 读取时 `URL.createObjectURL(blob)` → `<img src>`,**组件 unmount 时 `URL.revokeObjectURL()` 防内存泄漏**
- `useLiveQuery` 订阅 galleryImages 时按 `uploadedAt desc` 排序

### 7.4 家长固定图("镇馆之宝")

**可选机制** —— 决定要不要做时:

- ✓ 方案 A:打包进 PWA bundle(`src/assets/gallery/*.jpg`),`uploadedBy: 'system'` 不可删除
- ✓ 方案 B:首次启动时 seed 到 IndexedDB,`uploadedBy: 'parent'`,**家长可删除**(像普通图)

**推荐方案 B** —— 简单,统一权限模型,不需要打包静态资源.家长第一次进入若画廊为空,提示"要不要先放几张相片"并提供常见来源.

---

## 8. 单击放大 lightbox 规范 —— 美术馆标签

### 8.1 背景层

**❌ 不要黑底.**

- 底层:`--surface-paper` 米白
- 后面瀑布流虚化:`backdrop-filter: blur(20px) saturate(1.1)`
- 上覆 `oklch(1 0 0 / 0.4)` 米白半透明遮罩,让前景标签可读
- 整体感觉像"走近了一幅画,周围的画都变模糊了"

### 8.2 主图

- 居中
- `max-width: min(80vw, 800px)`
- `max-height: min(75vh, 1000px)`
- 白色相框边 `8-12px`(比缩略图大,放大版)
- 圆角 16px
- 投影 `box-shadow: 0 12px 40px oklch(0.3 0.02 50 / 0.12)` —— 大、虚、暖

### 8.3 美术馆标签(主图下方)

布局:左对齐主图左下角,顶部留 24px gap.

```
《向日葵》                     ← title, 衬线, 18px, ink-strong, 适度字重
肥仔 · 2026                     ← artist · year, 衬线, 14px, ink-soft
蜡笔画                          ← medium, 衬线斜体, 13px, ink-soft, 上间距 6px
                              ← (空行 12px)
某天放学回家画的,妈妈说像梵高.     ← caption, 衬线, 14px, ink-soft, 行高 1.7
```

**字段规则**:
- **全空** → 标签整体不渲染,只显示主图(纯欣赏)
- **只有 title** → 渲染一行 title
- **部分字段** → 缺哪行就不渲染哪行(优雅降级)

**字段拼接**:
- artist 和 year 中间用 ` · `(中点)分隔,**不**用 `,` `(` `)`
- medium 单独一行,斜体
- caption 之前空一行(视觉透气)

### 8.4 关闭

- 单击空白背景关闭
- ESC 关闭
- 右上角 close 按钮:**细线 X**(2px 描边),**不要**圆形 button(那是 modal,不是 lightbox)
- 关闭动画:主图 `scale 1 → 0.96 + opacity 1 → 0`,300ms,ease-in;背景 fade 同步

### 8.5 翻页

- 支持左右滑动(touch swipe)切换上一张/下一张
- iPad 横屏在左右无形按钮 hover 出现 `<` `>` 箭头(浅灰、衬线感)
- 翻页动画:横向 slide,300ms,ease-out,**轻微**
- ❌ **不**显示"第 X / N 张"计数器 —— 美术馆里没有
- ❌ **不**显示进度条

### 8.6 编辑入口(谁能编)

- 进入 lightbox 后,标签区域 hover / long-press 显示"编辑"图标
- 孩子端:仅 `uploadedBy === 'child'` 的图可编辑(`artist` 字段在孩子端**只读**或默认填 '肥仔')
- 家长端:任何图任何字段都可编辑
- 编辑用 inline edit(点击 → 字段变 input),保存按 Enter 或失焦
- 删除按钮**只在家长端 lightbox 右上角出现**,且离 close X 按钮远(防误触)

---

## 9. ADHD 友好 —— 克制至上

画廊是这个游戏化 app 里**唯一的"非游戏化清净角落"**.以下都**不要**:

| ❌ 不要做的 | 为什么 |
|---|---|
| 显示"今天看了几张" | 把欣赏变 KPI |
| 浏览/上传/被赞发积分 | 跟游戏化解耦的最后净土 |
| 弹通知 / 震动反馈 | 跟"什么都不要求我"反向 |
| 音效 | 静音欣赏 |
| confetti / 特效 / 闪光 | 破坏温馨 |
| "成就解锁" | 把画廊变任务 |
| 自动滚动 / 自动翻页 | 剥夺孩子节奏控制 |

要做的:

| ✓ 要做的 | 怎么做 |
|---|---|
| 进入页面瞬间画面安静 | 背景音乐音量 → 50% (`Howler.js` volume fade),全局动效降速 |
| 滚动惯性轻一些 | `scroll-behavior: smooth`,iOS 用 `-webkit-overflow-scrolling: touch` |
| 单图加载用纸张展开,不用 spinner | 见法则 10 |
| 长按图片啥都不发生 | 孩子端;家长端长按出现"编辑标签"菜单 |

**设计意图**:给 ADHD 孩子提供一个"什么都不要求我"的房间.这本身就是疗愈,也是这个 app 最稀缺的体验.

---

## 10. 反 feature 提议 —— 预防跑偏

下面这些**已经决策过 —— 拒绝**.以后再有人(包括用户在情绪化时刻、或被其他 app 启发后)提,**直接引用本 skill 拒掉**:

| 提议 | A | B | C | D | 总分 | 拒绝理由 |
|---|---|---|---|---|---|---|
| **点赞 / 心心数** | 0 | -1 | -1 | -2 | **-4** | 制造社交焦虑,跟"非游戏化清净角落"完全冲突 |
| **评论** | -1 | -2 | -2 | -1 | **-6** | 隐私风险,孩子可能写不当内容,家长审核成本无穷 |
| **AI 滤镜 / 风格迁移** | 0 | -1 | -2 | -1 | **-4** | 需联网(违反离线原则),引入付费 API(违反零成本原则),削弱原始作品真实感 |
| **分享到微信/朋友圈** | -1 | -2 | -1 | 0 | **-4** | 儿童隐私红线,绝对不做 |
| **"今日最佳" / 排行榜** | -2 | -1 | 0 | -2 | **-5** | 攀比文化,跟画廊的欣赏性反向 |
| **"看了 N 张作品"成就** | -1 | 0 | 0 | -1 | **-2** | 把浏览变 KPI,反 ADHD 友好 |
| **拼图 / 涂色游戏(基于画廊图)** | +1 | 0 | -2 | 0 | **-1** | 不是不能做,但**不属于画廊** —— 该单独立项 |
| **滑动条/计数器显示"第 N 张"** | 0 | 0 | 0 | -1 | **-1** | 美术馆里没有计数器 |
| **图片上传后水印盖"肥仔出品"印章** | +1 | 0 | 0 | +1 | **+2** | 谨慎做,见 Worked Example 2 |
| **公开画廊给亲戚朋友看的 URL** | -1 | -2 | -1 | +1 | **-3** | 儿童隐私红线 |

**反提议模板**(当用户说"加个 X"):

> "X 评分总分 [N],<0 拒掉.但你这个需求底层其实是'**[真实需求,如:想让孩子获得更多鼓励]**',这个可以用'**[非画廊方案,如:评分弹窗加家长留言字段]**'解决,不需要污染画廊."

---

## 11. Worked examples —— 3 个

### Example 1:用户说"画廊加个滑动条,显示当前是第几张"

1. **过 children-app-design**:A 0 / B 0 / C 0 / D -1 = **-1** → 拒
2. **诊断真实需求**:用户可能是怕孩子滑过头找不到喜欢的那张,或者想给孩子"看了多少"的进度感.
3. **反提议**:"美术馆里没有 '第几张' 计数器,因为欣赏不是任务.如果是怕找不到某张,我建议加'**家长可置顶 1-3 张**'机制,被置顶的图永远在瀑布流最上面.这比计数器更符合相片墙美学."
4. **不动手实现计数器.**

### Example 2:用户说"想让肥仔上传图后自动盖个'肥仔的画'印章水印"

1. **过 children-app-design**:A +1(自我表达感)/ B 0 / C 0 / D +1(家长容易识别孩子作品)= **+2** → 谨慎可做
2. **进入本 skill**:这本质是法则 5(衬线 caption)的延伸 —— 印章 = 特殊样式的 corner badge / metadata
3. **设计**:
   - 位置:**右下角**(法则 9 "不显眼" —— 不是右上)
   - 样式:衬线红字 "肥仔",~14px,旋转 -8°,opacity 0.85
   - 字体:`var(--gallery-caption-font)`
   - **不直接烧入图片** —— 用 CSS overlay,孩子可以在 lightbox 编辑里关掉(自主权)
   - 默认开,可关
4. **注意**:**不要把所有 `uploadedBy === 'child'` 的图都默认强加印章**.印章是"我画的"的标识,但孩子上传的不一定都是自己的画(可能是拍的花、宠物照).改成"**上传时勾选 '这是我的作品'** → 自动加印章".

### Example 3:用户截图反馈"画廊看起来像 Pinterest,太挤了"

1. **诊断**(法则违反点名):
   - (a) 法则 7 违反 —— gap 不够,大概率 < 16px
   - (b) 法则 3 违反 —— 圆角太小或没有
   - (c) 法则 2 违反 —— **没有白色相框边**(这是 Pinterest 感最大根源)
   - (d) 可能法则 5 违反 —— caption 是 SF/Inter

2. **修复优先级**(从最显著到最细节):
   - **首推**:加白色相框边 4-8px + 米色描边(法则 2)—— 改完立刻"非 Pinterest 感"
   - **次推**:gap 改到 20px(法则 7)
   - 然后:卡片圆角 → 14px(法则 3)
   - 最后:caption 字体改衬线(法则 5)

3. **不要先动结构**(不要先把 CSS columns 换 Grid)—— 那是结构改动,先调装饰层.

---

## 12. Pre-flight 检查清单 —— 任何画廊改动 commit 前

逐条勾选:

- [ ] **总张数 ≤ 100** 的硬上限是否有被绕过?(检查上传函数)
- [ ] 新上传图压缩到长边 1200px JPEG 0.82?缩略图 400px 0.75?
- [ ] EXIF orientation 自动处理(iPad 横躺照片别歪)?
- [ ] Blob 而不是 base64 存储?
- [ ] `URL.createObjectURL` 配套 `revokeObjectURL`(防内存泄漏)?
- [ ] **删除按钮只在 `/parent/*` 路由下渲染**(检查 useLocation 或 routing guard)?
- [ ] 删除前有二次确认 modal?措辞是 "取下" 不是 "删除"?
- [ ] **Lightbox 是米白底**(`--surface-paper` + backdrop-filter blur),**不是**黑底?
- [ ] Caption 字体是 `--gallery-caption-font`(衬线),不是 SF/Helvetica/Inter?
- [ ] 卡片有 4-8px 白色相框边 + 米色描边 + 暖光阴影?
- [ ] 卡片圆角在 12-16px 区间?
- [ ] 列数:竖屏 2 / 横屏 3?
- [ ] gap = 20px(或 16-24 区间内)?
- [ ] 进入画廊页背景音乐降音 50%?(查 Howler / 全局音乐管理)
- [ ] **没有**加任何积分/特效/通知/震动/音效?
- [ ] 任何新 feature 都先过了 children-app-design 4 维度评分,记录在第 10 节?
- [ ] DB schema 改动:写了 v9 → v10 migration(SCHEMA_VERSION 同步 bump),且老用户数据不破坏?
- [ ] tsc + vitest + build 全过?
- [ ] `src/version.ts` 版本号 bump 了?(R5.x.x)
- [ ] commit message 一句话,带版本号前缀?

---

## 灵魂检验题

完成所有改动后,做最后一道题:

> **你妈妈站在 iPad 前看到这一屏,会觉得"这是家",还是"这是 app"?**

如果只会觉得"这是 app" —— 回到第 1 节再读一遍.
