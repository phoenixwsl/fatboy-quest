# 肥仔的书房 · 完整交付包

> **目标**：让 Claude Code 实现的最终效果**和提供的 mockup 完全一致**。
>
> **路径**：建议放到 `/Users/senlin.wsl/fatboy/fatboy-quest/docs/home-feature/`

---

## 📦 文件清单

| 文件 | 用途 | 必读 |
|---|---|---|
| **README.md**（本文件） | 总入口，告诉 Claude Code 如何工作 | 🔴 |
| **mockup-final.png** | 最终视觉参考（像素级 ground truth） | 🔴 |
| **IMPLEMENTATION.md** | 像素级实现对照表（Python → React+CSS） | 🔴 |
| **01-design-spec.md** | 主设计文档（覆盖所有功能逻辑） | 🔴 |
| **02-code-scaffold.ts** | 代码骨架（CSS tokens + TypeScript + 组件） | 🟡 |
| **03-render-reference.py** | Python 渲染脚本（精确像素数值的源头） | 🟡 |
| **04-original-v1-spec.md** | v1 原始规格（历史参考） | ⚪ |
| **05-v4-revision-notes.md** | v3 → v4 修订记录 | ⚪ |
| **06-claude-code-guide.md** | 给 Frank 的 Claude Code 操作手册 | 🔴 |
| **assets/center_hero.jpg** | 科比偶像海报图（用户提供） | 🔴 |

---

## 🎯 给 Claude Code 的核心指令

**第一步**：当你打开这份 README 时，按以下顺序读文档：

1. 看 `mockup-final.png` —— 这是**最终效果**，所有实现都必须收敛到这张图
2. 读 `IMPLEMENTATION.md` —— 这是**像素级实现对照**，告诉你每个元素的精确坐标和颜色
3. 读 `01-design-spec.md` —— 这是**功能逻辑**，告诉你交互、数据模型、商店等
4. 用 `02-code-scaffold.ts` —— 这是**可直接复制的代码**，CSS tokens 和 TypeScript 类型
5. 参考 `03-render-reference.py` —— 这是**精确像素位置的源头**，所有数值在里面

**第二步**：按 4 个 milestone 顺序实施：
- M1 基础架构（路由、骨架、tokens、数据模型）
- M2 奖杯柜（35 个奖杯 + 解锁逻辑）
- M3 乐高+玩具+装饰商店
- M4 桌面摆件 + 绿植 + 收尾

每个 milestone 完成后必须**截图 → 对比 mockup → 验收 → 才能进入下一个**。

---

## 🎨 设计意图（一句话）

肥仔的书房是孩子的"**收藏陈列馆**"——通过完成作业获得积分，购买虚拟收藏品摆在书房，激励长期坚持。

视觉 DNA：**博物馆 + 工作室 + 日式收藏屋**，温馨治愈，60-30-10 配色（暖白墙占 60%）。

---

## ✅ 核心要素（必须实现）

### 11 个视觉元素

| # | 元素 | 关键点 |
|---|---|---|
| 1 | **墙面** | 暖白 #FAF6EF → #F4EEE2 渐变 + 细微纹理 |
| 2 | **左上斜光** | 从画面左上倾斜下来的暖光带 |
| 3 | **画轨** | y=165 处 7px 高的木质条 |
| 4 | **3 幅画** | 左荣耀 SVG / 中科比海报 / 右探索 SVG |
| 5 | **木地板** | 横向板缝 + 错落纵向接缝 |
| 6 | **3 个柜子** | 经典 / 现代 / 趣味 三种风格 |
| 7 | **2 盆绿植** | 左大叶绿萝 + 右龟背竹（落地） |
| 8 | **椅背** | 360 宽，深棕皮革，6 道车线，金色徽章 |
| 9 | **肥仔** | 260 大小，y=600 起，露出完整脸+肩+手 |
| 10 | **桌子** | 深胡桃木 #8B5A2B（关键：明显比地板深） |
| 11 | **桌面摆件** | 台灯 + 笔记本 + 地球仪 + 相框 |

### 关键功能

- 点击柜子 → 弹出 modal 显示全部物品
- 单品点击 → 详情卡
- 装饰商店 4 个 tab：乐高/玩具/摆件/绿植
- 购买后立刻在房间里看到
- 积分解锁奖杯（自动检测）
- 绿植可切换槽位

---

## 🚫 绝对不做的事

| 不做的事 | 原因 |
|---|---|
| 修改主产品业务逻辑 | 隔离风险 |
| 引入紫青/紫蓝渐变 | V2 已淘汰 |
| 重画肥仔 | 复用现有 v4 资产（8 角色 × 8 状态） |
| 跨 milestone 提交 | 便于回滚 |
| 自由发挥添加新功能 | 边界蔓延 |
| 实现独立的全屏陈列页 | v4 用 modal 即可，独立页是 v4.1 |
| 实现用户自定义偶像图上传 | v4.1 再做 |
| 实现绿植养成（浇水/开花） | 永不做 |

---

## 🎬 启动话术（直接复制给 Claude Code）

```
你好。我要在 fatboy-quest 项目里添加"肥仔的书房"功能，
这是一个独立的子页面。

我提供了完整的设计文档和参考资料，目标是让最终实现的效果
和提供的 mockup 100% 一致。

请按以下流程工作：

【第 1 步 · 读文档】
按这个顺序读：
  1. docs/home-feature/README.md
  2. docs/home-feature/mockup-final.png（视觉 ground truth）
  3. docs/home-feature/IMPLEMENTATION.md（像素级对照）
  4. docs/home-feature/01-design-spec.md（功能逻辑）
  5. docs/home-feature/02-code-scaffold.ts（代码骨架）

【第 2 步 · 项目盘点】
执行 `ls -la src/` 了解项目结构。
找到主路由文件和现有的设计系统。
找到现有 fatboy 角色组件（不要重新画肥仔，复用现有的）。

【第 3 步 · 给我看实施计划】
不要直接动手。先生成：
  - 你计划新增的所有文件路径
  - 你计划修改的现有文件（应该极少）
  - 你不确定的问题

我确认计划后才开始 M1。

【第 4 步 · 按 M1 → M4 顺序实施】
- M1 基础架构（参考 mockup + IMPLEMENTATION.md 还原视觉层）
- M2 奖杯柜（35 个奖杯）
- M3 乐高 + 玩具 + 商店
- M4 摆件 + 绿植 + 收尾

每个 milestone 独立 git commit，message 用 `feat(home): xxx`。

【第 5 步 · 每个 milestone 验收】
完成后截图（桌面 1600×1000 + 移动 375×812）。
对比 mockup-final.png。
通过 IMPLEMENTATION.md §17 的 10 项验收清单。
我看完确认才进下一步。

【绝对的规矩】
1. 不修改主产品业务逻辑
2. 不引入紫青渐变（V2 已淘汰）
3. 复用现有 fatboy SVG 资产
4. 任何不确定的地方，给我 2-3 个选项让我选
5. 发现冲突，停下来报告

请先复述你对任务的理解，然后从第 1 步开始。
```

---

## 📁 项目里的文件结构

实施完成后，你的项目应该是这样：

```
fatboy-quest/
├── docs/
│   └── home-feature/          ← 把这个交付包放在这里
│       ├── README.md
│       ├── mockup-final.png
│       ├── IMPLEMENTATION.md
│       ├── 01-design-spec.md
│       ├── 02-code-scaffold.ts
│       ├── 03-render-reference.py
│       └── assets/
│           └── center_hero.jpg
│
└── src/
    ├── routes/
    │   └── home.route.tsx           ← 新增
    ├── components/
    │   └── home/                    ← 整个新增
    │       ├── StudyRoom.tsx
    │       ├── StudyRoom.module.css
    │       ├── Wall.tsx
    │       ├── Floor.tsx
    │       ├── LightingLayer.tsx
    │       ├── paintings/
    │       │   ├── PaintingLeft.tsx
    │       │   ├── PaintingCenter.tsx
    │       │   └── PaintingRight.tsx
    │       ├── cabinets/
    │       │   ├── TrophyCabinet.tsx
    │       │   ├── LegoCabinet.tsx
    │       │   ├── ToyCabinet.tsx
    │       │   ├── CabinetAllModal.tsx
    │       │   └── ItemDetailModal.tsx
    │       ├── plants/
    │       │   ├── PlantSlot.tsx
    │       │   └── plants-data.ts
    │       ├── desk/
    │       │   ├── Desk.tsx
    │       │   ├── DeskItems.tsx
    │       │   ├── ChairBack.tsx
    │       │   └── Fatboy.tsx        ← 复用现有
    │       └── shop/
    │           ├── ShopPage.tsx
    │           └── ShopTab{Lego,Toy,DeskItem,Plant}.tsx
    ├── types/
    │   └── home.ts                  ← 新增
    ├── lib/
    │   └── home/                    ← 整个新增
    │       ├── catalog.ts
    │       ├── trophy-checker.ts
    │       └── shop.ts
    ├── hooks/
    │   └── useHomeCollection.ts     ← 新增
    ├── styles/
    │   └── study-room-tokens.css    ← 新增
    └── assets/
        └── home/                    ← 整个新增
            ├── paintings/
            │   ├── center_hero.jpg  ← 从 docs/ 复制过来
            │   ├── left_glory.svg
            │   └── right_explore.svg
            ├── trophies/
            │   ├── rank/ (7 SVGs)
            │   ├── challenge/ (20 SVGs)
            │   └── hidden/ (9 SVGs)
            ├── legos/ (12 PNGs，Frank 准备)
            ├── toys/ (12 PNGs，Frank 准备)
            ├── desk_items/ (8-12 SVGs)
            ├── plants/ (8 SVGs)
            └── chairs/
                └── default.svg
```

---

## 🎯 关键认知（给 Claude Code）

### 1. mockup 是 ground truth

`mockup-final.png` 是 Frank 已经多轮反复打磨过的最终视觉。**所有实现都必须能用肉眼对比通过**。
不允许"我觉得这样更好"的创造性发挥——按 mockup 来。

### 2. Python 代码是精确数值源头

`03-render-reference.py` 是渲染这张 mockup 的实际代码。
当 IMPLEMENTATION.md 描述不够清楚时，**直接看 Python 源代码里的数字**。
所有坐标、颜色、尺寸都在里面，是 ground truth 的来源。

### 3. 60-30-10 配色不能违反

- **60% 墙面**（暖白）—— 占视觉主导
- **30% 木质**（柜子、桌子、地板）—— 次要色
- **10% 焦点**（奖杯金色 / 肥仔黄 / 偶尔的红蓝）—— 点睛

如果实现出来看起来"很暗"或"很花"，就是这个比例错了。

### 4. 桌子必须比地板深

这是 v4 的关键改动，解决"桌子和地板融在一起"的问题。
桌面 `#8B5A2B`（深胡桃木）必须**明显**比地板（浅木渐变）深一档。
肉眼对比时，桌子应该"跳出来"。

### 5. 肥仔必须露出整张脸

不能像之前那样被椅背"夹住"或被桌面"压扁"。
v4 把肥仔从 y=690 上移到 y=600，目的就是让脸+腮红+嘴+小手都完整可见。

### 6. 柜子必须落地（不是浮在墙上）

每个柜子要有：
- 底座（宽于柜身的木质基座）
- 装饰脚（左方脚 / 中金属脚 / 右圆脚）
- 地板阴影（椭圆模糊阴影）

让它们看起来真的"站在地板上"。

---

## 🔄 当实现不符合 mockup 时

如果 Claude Code 实现出来和 mockup 有差异，按这个流程：

1. **找出差异**：截图 vs mockup 并排对比，圈出不同的地方
2. **定位代码**：找到对应组件的代码
3. **回到对照表**：查 IMPLEMENTATION.md 里这部分的精确数值
4. **对照源头**：如果 IMPLEMENTATION.md 还不够，看 `03-render-reference.py` 里的 Python 数值
5. **修正**：用精确数值替换实现里的值
6. **重新截图验证**

如果实在不能像素级一致（比如 Python 的渐变和 CSS 渐变的细微差别），允许 90% 一致——但**结构、颜色、布局必须一致**。

---

## 📅 时间表

| 阶段 | 工期 | 输出 |
|---|---|---|
| 准备 | 1 天 | 文档放好，Claude Code 启动 |
| M1 | 1 周 | 基础架构（骨架渲染正确） |
| M2 | 1 周 | 奖杯柜 |
| M3 | 1.5 周 | 商店 + 乐高 + 玩具 |
| M4 | 1.5 周 | 摆件 + 绿植 + 收尾 |
| 验收 | 0.5 周 | 全功能测试 |
| **总计** | **5-6 周** | 业余推进 |

---

## ⚠️ 常见踩坑预警

### 1. Claude Code 想"重画" mockup
说："我觉得用 Three.js 做 3D 效果更好。"
**拒绝**。按 2D + SVG + CSS 实现，对应 mockup。

### 2. Claude Code 想"加更多奖杯"
说："才 35 个奖杯太少了，我建议加到 60 个。"
**拒绝**。v4 范围 35 个，按规格来。

### 3. Claude Code 想"优化"积分系统
说："这个积分计算可以改成 Redux..."
**拒绝**。不动主产品业务逻辑。

### 4. Claude Code 想"统一"三柜风格
说："三个柜子风格差异太大，统一一下吧。"
**拒绝**。这是 mockup 的特意设计，看 IMPLEMENTATION §9。

### 5. Claude Code 实现到一半"忘了" mockup
表现：实现出来和 mockup 越来越远。
**应对**：让它**每隔 2-3 个组件就对一次 mockup**。
对的话：让它截图对照检查。

---

## 📞 出问题的应对（Frank 用）

**问题：Claude Code 卡住，不确定怎么做**
→ 让它列出 2-3 个具体方案，你选

**问题：实现出来不像 mockup**
→ 让它列出每个不同点，针对性改

**问题：写到一半发现技术债**
→ 让它**记录下来**但不修，做完 M4 再说

**问题：进度比预期慢**
→ 看是不是 milestone 太大，可以拆 M3、M4 为各 2-3 天的小步

**问题：测试用户（你儿子）反馈某个交互不爽**
→ 攒到 v4.1 一起改，不打断 v4 节奏

---

## 🎬 最终目标

完成后，**儿子拿着 iPad 用 5 分钟**，他自己说：

> "爸爸，我想再买一个 XXX！"

如果他说了这句话，v4 就成功了。

---

**END** · 这份 README 是你跟 Claude Code 沟通的协议。
按 §"启动话术" 直接复制粘贴给它，开始干活。
