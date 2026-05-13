# 肥仔 · AI 生图 Prompt 手册

> 用途：当 v1.0 占位 SVG 不够用、需要升级到「美术 final 版」时，使用本手册中的 prompt 模板生成新版资产。
> 工具：Midjourney v6.1+、Flux.1 dev / pro、Recraft V3、Ideogram 2.0 都适用。
> 关键原则：先固化 `default` 状态作为「角色锚」，其他 7 个状态以它为 character reference 生成，保证视觉一致性。

---

## 1. 角色 Character Bible

任何 prompt 的开头都包含这段「角色定义」，确保 AI 理解我们要的是什么。

### 中文版（贴给用中文交互的工具）
```
角色名：肥仔（Fatboy）
原型：奶龙底子 + 小机械师装备
体型：圆滚滚的鸡蛋形身体，头身比 1:1，大头大身
主色：暖黄色腹部 (#F4C752 到 #E8A93C 渐变)，腹部稍亮
五官：大眼睛（占脸 1/4），小嘴，圆鼓鼓的腮红（粉红色）
机械元素：佩戴一件标志性机械装备——小工程师护目镜（戴在头顶或脖子上）
        或一条小齿轮项圈
        或一个小工具腰带
        （选择其中一种并贯穿所有状态，最推荐：头顶护目镜）
性格：呆萌但有勇气，圆润但准备战斗，不是单纯卖萌的形象
不要：戴皇冠、穿衣服、长头发、长尾巴、复杂的甲胄
风格：3D 渲染感的卡通插画，柔和阴影，圆滑边缘，有微妙的光泽
       不要平面 2D，不要轮廓粗黑线，不要日漫眼睛
```

### 英文版（适用于 Midjourney/Flux/Recraft）
```
Character: Fatboy
Type: Adorable round mascot with a tiny mechanical accent
Body: Egg-shaped, plump, 1:1 head-to-body ratio
Color: Warm honey yellow body with subtle gradient
       (top brighter #FFEEA8, mid #F4C752, bottom darker #D89020)
Face: Large round eyes (1/4 of face), tiny smile, pink rosy cheeks
Mechanical accent: small engineer goggles resting on top of the head
                   (keep this accessory consistent across all states)
Personality: brave but cute, sturdy but soft, brave-mascot energy
             not just a sweet baby — has determination
Avoid: crown, clothing, hair, tail, complex armor, sharp angles
Style: soft 3D-rendered toy-like illustration, gentle shadows,
       smooth edges, subtle glossy highlight on top of head
       NOT flat 2D, NOT thick outline, NOT anime eyes
Background: deep cosmic blue (#0B1026), starry, slight purple gradient
```

---

## 2. Midjourney v6.1 / v7 Prompt

### 第一步：生成 default 锚（最重要）
```
A plump egg-shaped chibi mascot character named "Fatboy", warm honey-yellow gradient body
(top #FFEEA8, mid #F4C752, bottom #D89020), tiny engineer goggles resting on top of head,
big round black eyes with sparkle highlights, small smile, pink rosy cheeks,
tiny stubby hands at sides, tiny round feet, 3D toy-like soft rendering,
gentle ambient shadows, subtle glossy head highlight, centered on deep cosmic blue
background (#0B1026) with scattered tiny stars, friendly determined expression,
mechanical-fantasy mood, character design sheet, white separator —ar 1:1 —style raw —v 7
```

跑 4 张，选一张最像「奶龙 + 小机械师」的，记下 `--seed`，或者用 `--cref [图片URL]` 作为后续状态的 character reference。

### 第二步：用 cref 生成其他 7 个状态

替换上方 prompt 末尾的「friendly determined expression」为下列文案，**保留其他所有部分**，再加上 `--cref [default图URL] --cw 100`：

| State | Replace expression with |
|---|---|
| `thinking` | a thoughtful pondering expression, one tiny hand on chin, eyes looking up-right, small thought bubbles with a question mark trailing up |
| `focused` | a determined narrowed-eye gaze, furrowed brow, both tiny fists clenched at sides, energy lines around body in soft purple, battle-ready stance |
| `tense` | a strained worried expression, gritted teeth showing, two small blue sweat drops on the side of head, tiny fists raised slightly, eyebrows slanted down |
| `victory` | overjoyed laughing eyes (^_^), wide open laugh-mouth, both tiny arms raised high in V-pose, golden sparkle stars scattered around, triumphant pose |
| `celebrate` | sparkling starry eyes, big open smile, both arms thrown wide open, colorful confetti bits floating around (gold/purple/pink/blue), joyful pose |
| `resting` | peacefully closed eyes (gentle curves), small content smile, hands resting on lap, a tiny steaming teacup sitting beside, calm relaxed pose |
| `sleeping` | fully closed flat eyes (—_—), tiny open sleeping mouth, hands relaxed at sides, three floating purple "Z" letters of increasing size above head, deep peaceful sleep |

### 第三步：固化输出
- 每个状态选 1 张最佳 → upscale → 用 `--no background` 重跑去背景，或用 remove.bg 抠图
- 导出为透明背景 PNG，512×512 和 1024×1024 两档
- 命名：`default.png`、`thinking.png`、…放到 `/assets/fatboy/`

---

## 3. Flux.1 dev / pro Prompt（更可控）

Flux 对长描述支持更好，可以一次性写更详细：

### Default 状态完整 prompt
```
A 3D chibi cartoon mascot character called Fatboy, shown in a character design sheet
style. The mascot has an egg-shaped plump body with a 1:1 head-to-body ratio. The body
features a warm honey-yellow gradient — brighter pale yellow at the top, rich golden
yellow in the middle, and deep amber at the bottom. The character has large round
expressive eyes (about 1/4 of the face), tiny pink rosy cheek blushes on both sides of
the face, and a small gentle smile. On top of the head rests a pair of tiny brass-colored
engineer goggles, which serve as the character's signature mechanical accessory. The
character has small stubby hands at its sides and tiny round feet. Rendering style is
soft 3D toy-like with gentle ambient shadows, smooth rounded edges, and a subtle glossy
highlight near the top of the head. The expression is friendly yet determined — brave
mascot energy, not just sweet. Background is a deep cosmic blue (hex #0B1026) with
scattered tiny stars and a faint purple gradient glow. Style: clean character design,
not anime, not flat 2D, no thick black outlines.
```

每个其他状态：把上述 prompt 的「The expression is friendly yet determined…」部分替换为对应状态的描述（参考第 2 节表格），其他保留。

Flux 一致性的关键：使用相同的 seed，或用 IP-Adapter 喂入 default 图作为参考。

---

## 4. Recraft V3 Prompt（推荐用于风格统一）

Recraft 的优势是「Style」可以预设，对一组图保持高度一致。

### 步骤
1. 上传 default 图（用上面 MJ/Flux 跑出的最佳版本）→ 创建 Custom Style
2. 命名 Style 为 "Fatboy 3D Toy"
3. 后续每个状态用「同一 Style」生成

### Recraft prompt 模板（每个状态）
```
Fatboy mascot character, [STATE DESCRIPTION], full body, centered,
on deep cosmic blue starry background, character design sheet style
```

`[STATE DESCRIPTION]` 替换为：
- `default`: standing with friendly smile, looking at viewer
- `thinking`: hand on chin pondering, eyes up-right, thought bubble
- `focused`: clenched fists at sides, narrowed determined eyes, battle ready
- `tense`: gritted teeth, sweat drops, raised fists, anxious determination
- `victory`: arms raised in V, laughing eyes, surrounded by gold sparkles
- `celebrate`: arms thrown wide, sparkly eyes, confetti around
- `resting`: eyes closed peacefully, small smile, teacup beside
- `sleeping`: fast asleep, floating Z letters above head

---

## 5. 全局视觉锁定（避免漂移）

无论用哪个工具，**这几条必须始终一致**：

| 维度 | 锁定值 |
|---|---|
| 主色 | `#F4C752` 暖黄渐变（不要纯黄、不要橙黄） |
| 眼睛 | 大圆眼，白色巩膜，深棕黑色瞳孔，1-2 个白色高光点（不是反光） |
| 腮红 | 浅粉红椭圆，柔和不刺眼 |
| 标志机械装备 | 头顶护目镜（贯穿所有 8 个状态） |
| 体型 | 圆鸡蛋形，胖墩墩，无脖子 |
| 头身比 | 1:1（绝对不能瘦长） |
| 风格 | 3D 软质感卡通（不是 2D 平面、不是日漫、不是写实） |
| 背景 | 深空蓝 + 星点（输出后可抠透明） |

如果某次生成出现下列任一情况，**重跑**：
- 身体被画成纺锤形或人形（必须是圆鸡蛋）
- 眼睛画成日漫风（必须是简单圆形 + 高光点）
- 颜色偏向纯橙或纯柠檬黄（必须是温暖蜂蜜黄）
- 加上了帽子/皇冠/披风/复杂服装（v1.0 只保留护目镜）
- 风格变成了 2D 平面或线稿（必须是 3D 软质感）

---

## 6. 升级到 final 版的工作流

```
[占位 SVG 已就位（v1.0）]
        ↓
[选择 AI 工具] → Midjourney（推荐，氛围最好） / Flux（最可控） / Recraft（最统一）
        ↓
[跑 default 锚]
        ↓
[选 1 张最佳作品]
        ↓
[让儿子从前 3 个候选投票，定 final]
        ↓
[以 default 为 cref/reference，生成其他 7 状态]
        ↓
[抠透明背景（remove.bg 或 Photoshop）]
        ↓
[导出 PNG 512×512 + 1024×1024]
        ↓
[替换 /assets/fatboy/svg/*.svg 为 *.png]
        ↓
[修改 FatboyAvatar.tsx 中 import 路径]
        ↓
[完成 v1.0 final]
```

整套流程：1 天即可完成。

---

## 7. 进阶：使用 AI 装备分层

为 v2.0「装扮系统」做准备：可以让 AI 生成肥仔的「无装备 base」+ 「各种装备分图层」，开发时按需叠加。

### Base 角色 prompt
```
[default prompt as above] — but without any goggles or accessories,
just the bare Fatboy character, ready for layered accessories
```

### 装备分图 prompt（举例）
```
Just a pair of small brass engineer goggles, top-down isolated view,
sized to fit on a chibi character's head, transparent background,
3D rendered with the same warm soft style
```

```
Just a small red race helmet with goggles, side view, transparent
background, 3D toy-style rendering, fitted for a chibi character
```

把 base + 装备组合，就是 v2.0 装扮系统的资产路径。

---

## 8. 常见问题排查

**Q：生成出来的肥仔每次造型都不一样**
A：必须用 character reference（MJ 的 `--cref`、Flux 的 IP-Adapter、Recraft 的 Custom Style）。不要靠 prompt 一致性。

**Q：眼睛画得太复杂（像日漫）**
A：prompt 里加 `simple round chibi eyes, NOT anime-style, NOT detailed iris`。

**Q：身体画成人形**
A：prompt 强调 `egg-shaped`, `round potato body`, `no neck`, `chibi proportions`，并用 negative prompt 排除 `human body`, `tall figure`。

**Q：颜色太橙/太柠檬**
A：在 prompt 里精确指定 hex `#F4C752`，并加 `warm honey color, NOT pure orange, NOT lemon yellow`。

**Q：背景抠不干净**
A：生成时直接用 prompt 加 `on pure black background` 或 `on solid color background`，比深空背景更好抠。后期用 remove.bg。

---

**文档版本**：v1.0
**对应资产版本**：FatboyAvatar v1.0（8 状态占位 SVG）
**升级目标**：FatboyAvatar v1.1（8 状态 final 美术 PNG）
