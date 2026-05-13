# 肥仔 · v4 资产包

> 肥仔大闯关产品资产包 v4「角色 × 状态全矩阵」。
> 8 个角色 × 8 个状态 = **64 个组合 SVG**，每个角色都有完整 8 表情。

---

## 🆕 v4 相对于 v3 的提升

| 维度 | v3 | v4 |
|---|---|---|
| 状态 | 8 个（仅原版） | **8 个 × 所有角色** |
| 角色 | 8 个（仅 default 表情） | **8 个 × 所有状态** |
| SVG 总数 | 16 | **64** |
| React 组件 | 2 个独立 | **1 个统一** + 2 个兼容别名 |
| 矩阵预览 | 无 | **8×8 完整矩阵** |

---

## 📦 包内容

```
fatboy/
├── svg/characters/
│   ├── default/          (8 个状态 SVG)
│   ├── racer/            (8)
│   ├── astronaut/        (8)
│   ├── pirate/           (8)
│   ├── ninja/            (8)
│   ├── mario/            (8)
│   ├── knight/           (8)
│   └── wizard/           (8)
├── Fatboy.tsx              # 统一组件（含兼容别名）
├── preview.html            # 自包含预览（双击直接看）
├── generate_all.py         # 完整生成器（64 个 SVG）
├── build_preview.py        # 预览页构建脚本
├── AI-PROMPTS.md           # AI 升级 prompt
└── README.md               # 本文档
```

---

## 👀 怎么看效果

**双击 preview.html** — 所有 64 个 SVG 已内联，单文件无外部依赖。
用 Chrome / Safari / Edge 打开。

Preview 里有 5 个部分：
1. **PART ONE · 完整矩阵** — 64 个组合一图全见，悬停可放大
2. **PART TWO · 角色总览** — 8 个角色 card
3. **PART THREE · 状态总览** — 8 个状态 card（以原版为例）
4. **PART FOUR · 动画演示** — 5 段动画跨角色演示
5. **PART FIVE · 场景演练** — 6 个产品场景预览

---

## 🚀 5 分钟集成

### 复制资产
```bash
cp -r fatboy /path/to/your-project/src/components/
```

### 统一组件（推荐）
```tsx
import { Fatboy, inferFatboyState } from '@/components/fatboy/Fatboy';

// 最简
<Fatboy />                                              // 默认角色 + 默认状态

// 任意组合
<Fatboy state="victory" />                              // 默认角色 + 胜利
<Fatboy character="racer" state="tense" autoAnimate />  // 赛车手紧张抖动
<Fatboy character="ninja" state="sleeping" autoAnimate /> // 忍者睡着了

// 根据上下文自动选状态
<Fatboy
  character="astronaut"
  state={inferFatboyState({ page: 'quest-running', remainingMinutes: 3 })}
  size={200}
  autoAnimate
/>
```

### 向后兼容（v3 写法）
```tsx
import { FatboyAvatar, FatboyCharacter } from '@/components/fatboy/Fatboy';

<FatboyAvatar state="victory" />              // = <Fatboy character="default" state="victory" />
<FatboyCharacter character="racer" />          // = <Fatboy character="racer" state="default" />
```

### 角色选择器
```tsx
import { Fatboy, ALL_CHARACTERS, CHARACTER_META } from '@/components/fatboy/Fatboy';

{ALL_CHARACTERS.map(id => (
  <button key={id} onClick={() => setCharacter(id)}>
    <Fatboy character={id} size={120} bouncing />
    <span>{CHARACTER_META[id].name}</span>
  </button>
))}
```

---

## 🎭 8 角色 × 8 状态

### 8 个主题角色

| ID | 中文 | 装扮 |
|---|---|---|
| `default`   | 原版肥仔   | 呆毛 + 尾巴 |
| `racer`     | 赛车手     | 红头盔 + 护目镜 + #7 |
| `astronaut` | 宇航员     | 透明圆头盔 + 天线 + SPACE |
| `pirate`    | 海盗船长   | 三角帽 + 骷髅 + 眼罩 |
| `ninja`     | 忍者       | 头巾 + 日字头带 + 蒙面布 |
| `mario`     | 水管工     | M 字红帽 + 八字胡 |
| `knight`    | 骑士       | 银盔 + 红羽毛 + 护鼻 |
| `wizard`    | 魔法师     | 紫尖帽 + 月亮星星 + 金球 |

### 8 个情绪状态

| ID | 情绪 | 触发场景 |
|---|---|---|
| `default`   | 站立微笑   | 首页、家长面板 |
| `thinking`  | 撑下巴想   | 规划页、商店 |
| `focused`   | 握拳准备   | 闯关准备、倒计时 |
| `tense`     | 咬牙坚持   | 倒计时最后 5 分钟 |
| `victory`   | 举手大笑   | 击败瞬间 |
| `celebrate` | 撒花欢呼   | 段位升级、成就解锁 |
| `resting`   | 闭眼喝茶   | 等待评分 |
| `sleeping`  | Z 字飘升   | 夜间、长期未操作 |

### 特殊组合说明

- **忍者所有状态**：蒙面布始终遮住下半脸（嘴、腮红），所以情绪全靠**眼睛**表达
- **海盗所有状态**：右眼眼罩始终在位，左眼负责所有情绪
- **马里奥所有状态**：八字胡始终在嘴上方
- **宇航员所有状态**：透明头盔下五官完整可见
- 其他角色装扮只在头顶，不影响表情

---

## 🎬 自动动画系统

```tsx
<Fatboy character="racer" state="tense" autoAnimate />
```

`autoAnimate` 会根据 state 自动选动画：

| state | 自动动画 |
|---|---|
| `default`   | breathe（呼吸） |
| `tense`     | shake（抖动） |
| `victory`   | bounce（弹跳） |
| `celebrate` | wobble（摇摆） |
| `sleeping`  | sleepbob（睡眠起伏） |
| `resting`   | breathe-slow（缓呼吸） |
| `thinking` / `focused` | 无（静止有意为之） |

CSS 代码在 `Fatboy.tsx` 文件底部注释，复制到全局样式表即可。

---

## 🛠️ 改造与扩展

### 改某个角色的装扮
```bash
vim generate_all.py
# 找到 CHARACTERS 字典里对应角色的 accessory，修改 SVG
python3 generate_all.py     # 重新生成 64 个 SVG（其中 8 个会更新）
python3 build_preview.py    # 重新生成预览页
```

### 改某个状态的表情
```bash
vim generate_all.py
# 改 EYES / MOUTHS / HANDS / EXTRAS_FRONT 里对应 state
python3 generate_all.py     # 该 state 在 8 个角色身上同时更新
python3 build_preview.py
```

### 新增第 9 个角色（例如 sailor 海军）

1. `generate_all.py` 的 `CHARACTERS` 字典加：
   ```python
   'sailor': {
       'show_daemao': False, 'show_cheeks': True,
       'show_mouth': True, 'show_top_sheen': False,
       'accessory': '''<!-- 水手帽 SVG ... -->'''
   }
   ```
2. 跑 `python3 generate_all.py` → 自动生成 sailor 的 8 个状态
3. 在 `Fatboy.tsx`:
   - `FatboyCharacterId` 类型加 `'sailor'`
   - 加 8 行 import
   - `SVG_MATRIX` 加一行
   - `CHARACTER_META` 加描述
   - `ALL_CHARACTERS` 加 `'sailor'`
4. 跑 `python3 build_preview.py` → 矩阵自动扩展为 9×8 = 72

新角色 idea：sailor 海军 / cowboy 牛仔 / detective 侦探 / chef 厨师 /
firefighter 消防员 / doctor 医生 / king 国王 / hero 超级英雄 / vampire 吸血鬼 / robot 机器人...

---

## 📋 给 Claude（开发助手）的提示

1. **永远用统一组件** `<Fatboy character="..." state="..." />`
2. **状态选择优先用** `inferFatboyState()` 函数
3. **开启 `autoAnimate`** 让动画自动匹配状态
4. **改造型先改 `generate_all.py`，跑生成器，再 commit SVG**。不要直接改 SVG 文件。
5. **新增角色要同步改 4 处**：generate_all.py、Fatboy.tsx 的类型/import/SVG_MATRIX/META
6. **preview.html 是构建产物**，改 SVG 后跑 `python3 build_preview.py`
7. **不要在肥仔身上叠加 UI 元素**（徽章、数字气泡）—— 用兄弟元素绝对定位

---

## 📝 版本

| 版本 | 内容 |
|---|---|
| v1.0 | 椭圆基础造型 + 8 状态 |
| v2 | 重画为奶龙+蛋仔+卡比气质 |
| v3 | 新增 8 个主题角色（仅 default 表情） |
| **v4** | **64 个组合，每个角色完整 8 状态** |
| v5 (TBD) | AI 美术版（3D 渲染感 PNG） |

---

肥仔大闯关 · v4 · Made with care · 2026
