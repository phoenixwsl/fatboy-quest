# 给 Claude Code 的实施手册

> 这份文档是给 **Frank（用户）** 看的，告诉你如何让 Claude Code 把这套设计落地到代码里。

---

## 第一步：准备文件包

把这 3 个文件放到一个新文件夹里，准备一起丢给 Claude Code：

| 文件 | 作用 |
|---|---|
| `fatboy-home-final-spec.md` | 主设计文档（必读） |
| `fatboy-home-code-scaffold.ts` | 可直接复用的代码骨架 |
| `center_hero.jpg` | 科比海报图片（重命名后的 Frank 提供图） |

可选：

| 文件 | 作用 |
|---|---|
| `fatboy-home-study-mockup-v3.png` | v3 mockup 截图（作为视觉参考） |

---

## 第二步：在 Claude Code 里启动会话

打开你的项目终端，进入 fatboy-quest 仓库根目录，运行：

```bash
claude
```

然后**完整复制粘贴下面这段话**给 Claude Code：

---

```
你好。我要给一个名叫"肥仔大闯关"的儿童作业管理 PWA 添加一个新的扩展功能：
肥仔的书房（study room）。这是一个独立的子页面，孩子通过完成作业获得积分，
用积分购买虚拟收藏品（乐高/玩具/绿植/摆件等）摆在虚拟书房里。

我已经把完整的设计文档准备好了。请按以下流程工作：

【第 1 步 · 阅读文档】
请完整读这两份文件：
- fatboy-home-final-spec.md（主规格，必读）
- fatboy-home-code-scaffold.ts（代码骨架，作为参考）

重点理解：
- §2 整体布局（11 个图层 + 屏幕分区）
- §3 Design Tokens（完整 CSS 变量，可直接复制）
- §4 视觉元素详细规格（11 类元素）
- §7 数据模型 TypeScript 接口
- §9 实施路线图（M1 → M4，共 4 个 milestone）

【第 2 步 · 项目盘点】
执行：
- `ls -la src/` 了解项目结构
- 找到主路由配置文件
- 确认现有的样式系统（CSS Modules / Tailwind / styled-components）
- 找到现有 fatboy 角色组件（应该已经有 v4 的 8 角色 × 8 状态资产）
- 找到现有 design tokens（V2 已经定义过的颜色）

【第 3 步 · 制定计划】
**不要直接动手**。先生成一份"实施计划"给我看，包含：
1. 你计划新增的所有文件路径列表
2. 你计划修改的现有文件列表（应该极少）
3. 你计划的 git 分支策略（建议每个 milestone 一个 commit）
4. 任何你不确定的地方（用问号列出来问我）

我确认计划后再开始 M1。

【第 4 步 · 按 M1 → M4 顺序执行】
- M1: 基础架构（1 周）— 路由 + 骨架 + tokens + 数据模型
- M2: 奖杯柜（1 周）— 35 个奖杯 SVG + 解锁逻辑
- M3: 乐高 + 玩具 + 装饰商店（1.5 周）
- M4: 桌面摆件 + 绿植 + 收尾（1.5 周）

每个 milestone 内的所有任务做完了，独立 git commit。
不要跨 milestone 提交。

【第 5 步 · 每个 milestone 完成后】
- 截一张主页面的截图给我看
- 用 §9 里的"验收"标准对照
- 我确认符合后才进入下一个 milestone
- 如果我觉得需要调整，按我反馈改完再 commit

【绝对的规矩】
1. 不修改主产品任何业务逻辑（包括 store / API / 路由跳转）
2. 不引入任何紫青/紫蓝渐变（V2 已淘汰）
3. 复用现有 fatboy SVG 资产（不要重画肥仔）
4. 资产放 src/assets/home/，路径见 §8.1
5. 每个 git commit message 用：
   - feat(home): 新功能
   - style(home): 样式调整
   - fix(home): bug 修复
6. 任何不确定的地方，**给我 2-3 个选项让我选**，不要自由发挥
7. 如果发现和现有产品冲突，**停下来报告**，不要自己改业务逻辑

【关于"全屏陈列页"的特别说明】
v4 主页面里"点击柜子" → 弹出 modal 显示完整网格（35 / 12 / 12）。
**不要做独立路由的全屏陈列页**——那是 v4.1 的任务。

【关于资产准备】
我会提供：
- /assets/home/paintings/center_hero.jpg（科比海报）
- 12 张 Lego 实物照片（M3 阶段我再给）
- 12 张玩具实物照片（M3 阶段我再给）

你需要画的（用 SVG）：
- 35 个奖杯（M2 阶段）
- 8 个绿植（M4 阶段）
- 8-12 个桌面摆件（M4 阶段）
- 1 个椅背（M1 阶段，先做默认款）
- 2 幅墙画的 SVG（M1 阶段，左荣耀 + 右探索）

【关于代码骨架文件】
fatboy-home-code-scaffold.ts 里有：
- 完整的 CSS Design Tokens（直接复制到 study-room-tokens.css）
- TypeScript 接口（直接复制到 src/types/home.ts）
- 关键组件骨架（React 组件示例）
- 解锁/购买逻辑骨架
- 8 个绿植的完整 catalog 示例

这些都是"可直接使用"的——你可以扩展它们，但不要从零写一遍。

请先复述你对整个任务的理解，然后从第 1 步开始。
```

---

## 第三步：盘点 + 计划阶段

Claude Code 读完文档后会给你一份**实施计划**，类似：

```
我计划新增以下文件：
  src/routes/HomeRoute.tsx
  src/components/home/StudyRoom.tsx
  src/components/home/Wall.tsx
  src/components/home/Floor.tsx
  ...

我计划修改：
  src/App.tsx (添加 /home 路由)
  src/components/Home.tsx (添加"肥仔之家"入口)

不确定的：
  1. 你的项目用 React Router v6 还是其他？我需要先确认。
  2. 现有 fatboy 角色组件路径是什么？
  3. 你想用 framer-motion 做动画吗？还是 css-only？
```

**仔细看这份计划**：
- 修改清单是否触及业务逻辑？如果有，**拒绝**
- 不确定的问题，**逐个回答**
- 文件结构是否合理？

确认后再让它开始。

---

## 第四步：M1 开始时的检查点

M1 完成时，让它截图给你看。验收点：

**视觉层面**：
- [ ] 路由 `/home` 可访问
- [ ] 进入页面看到完整骨架：墙、地板、3 个空柜子、椅子、肥仔、桌子
- [ ] 颜色和 design tokens 一致（不是黑底紫渐变）
- [ ] 肥仔的脸+肩露出，没被椅子夹住

**功能层面**：
- [ ] 点击 [← 退出] 能回到首页
- [ ] 没有控制台错误
- [ ] localStorage 里有 fatboy-home-collection 初始数据

**代码层面**：
- [ ] git log 看到一个 commit
- [ ] 没动主产品的任何文件
- [ ] design tokens 注入到全局 CSS

**不符合就让它改**，不要妥协。

---

## 第五步：每个 milestone 的验收清单

### M2 验收（奖杯柜）

- [ ] 完成一个作业任务后，"首胜徽章"自动解锁
- [ ] 解锁瞬间有弹出动画
- [ ] 奖杯柜橱窗显示前 9 个（按稀有度排序）
- [ ] 点击柜子弹出 modal，显示全部 35 个槽位
- [ ] 已解锁的奖杯可点击 → 详情卡
- [ ] 锁定的奖杯显示 "?" + 锁标
- [ ] 隐藏奖杯在 modal 里也是 "?"，解锁后才显示
- [ ] 首页底部小卡片显示红点（新奖杯）

### M3 验收（乐高 + 玩具 + 商店）

- [ ] 装饰商店 4 个 tab 都能切换
- [ ] 乐高页能看到 12 个商品
- [ ] 玩具页能看到 12 个商品
- [ ] 买一个乐高后：扣积分 + 柜子立刻显示新乐高
- [ ] 购买动画（"咔嗒"落下效果）
- [ ] 积分不够时显示进度条（"还差 XX ⭐"）
- [ ] 已购买的显示 "✓ 已收藏"
- [ ] 单品详情卡能看到购买时间和积分

### M4 验收（绿植 + 摆件 + 收尾）

- [ ] 进入书房默认看到 2 盆绿植（左绿萝 + 右龟背竹）
- [ ] 叶子有轻微摇曳动画
- [ ] 绿植商店能买新植物
- [ ] 我的绿植里能切换槽位（左/右）
- [ ] 桌面摆件至少 4 个默认显示
- [ ] 摆件商店能购买和切换
- [ ] 椅背是深棕皮革款（默认）
- [ ] 进入/退出有"门"音效
- [ ] 购买/解锁有音效
- [ ] 触觉反馈（移动端）

---

## 第六步：常见问题处理

### 问题 1：Claude Code 想加新功能

例如它说："我建议加一个'今日推荐'板块。"

**你的回答**：
> 不在 v4 范围。参考 fatboy-home-final-spec.md §11 边界声明。继续按 milestone 推进。

### 问题 2：Claude Code 在某处自由发挥

例如它自己决定了奖杯的颜色搭配，但和文档不符。

**你的回答**：
> 严格按文档 §3 design tokens 走。重新做这部分。

### 问题 3：发现现有产品有问题需要修

例如它说："我发现 src/store/user.ts 里有个 bug，我顺手修了。"

**你的回答**：
> 立即撤销那个修改。本任务不修改业务逻辑。把那个 bug 记下来单独 issue 跟进。

### 问题 4：资产质量不行

例如某个奖杯 SVG 太简陋。

**你的回答**：
> 重画 [奖杯名]。要求：[具体方向，比如"金属感更强"/"形态更夸张"]。参考其他奖杯的风格。

### 问题 5：动画卡顿

如果手机上动画掉帧。

**你的回答**：
> 把所有动画从 JS 改为 CSS transform/opacity，避免触发 layout。绿植摇曳用 transform: rotate()，不用 left/top。

---

## 第七步：如何告诉它"我想看实际效果"

每个 milestone 完成后，让它**截图给你看**。要求：

```
请用浏览器开发工具截图：
- 全屏宽度 (1600x1000) 一张
- 移动端宽度 (375x812) 一张
保存到 /screenshots/m{N}-{description}.png
```

或者让它启动本地 dev server，你用浏览器自己打开看。

---

## 第八步：如果中途想做调整

每个 milestone 完成后是改动设计的最佳时机。

**好的反馈方式**：

✅ "桌面颜色还是有点浅，再深一档。具体：把 --study-desk-top 改成 #6B4423。"
✅ "奖杯柜的金色徽章太小，从 16x16 改到 24x24。"
✅ "进入动画太快，从 0.5s 改到 1s。"

**不好的反馈方式**：

❌ "感觉不对，重做。"（太模糊）
❌ "我想要更高级的感觉。"（无法执行）
❌ "你看着改。"（让 Claude 自由发挥的开始）

---

## 第九步：完成后的事

M4 全部完成后：

1. 让 Claude Code 跑一遍代码质量检查（eslint / typescript）
2. 让它写一份 RELEASE_NOTES.md 总结本次添加的所有内容
3. 把 git log 整理成清晰的提交历史
4. 在 README 里加一段"肥仔的书房"功能说明
5. 部署到测试环境，让儿子试用

---

## 第十步：v4.1 规划

当儿子用了一周左右，你应该会发现：
- 哪些奖杯频繁被点击 → 说明设计成功
- 哪些柜子里物品太少 → 需要扩充
- 哪些交互不顺手 → 需要优化

这些反馈攒一周后，作为 v4.1 的基础。v4.1 候选清单见 fatboy-home-final-spec.md §11.3。

---

## 附录 · 文件路径快速参考

最终 Claude Code 应该创建的核心文件：

```
src/
├── routes/
│   └── home.route.tsx                    # 路由配置
├── components/
│   └── home/
│       ├── StudyRoom.tsx                  # 主页面
│       ├── StudyRoom.module.css           # 主样式
│       ├── Wall.tsx
│       ├── Floor.tsx
│       ├── LightingLayer.tsx
│       ├── paintings/
│       │   ├── PaintingLeft.tsx           # SVG (荣耀)
│       │   ├── PaintingCenter.tsx         # <img> (科比)
│       │   └── PaintingRight.tsx          # SVG (探索)
│       ├── cabinets/
│       │   ├── TrophyCabinet.tsx
│       │   ├── LegoCabinet.tsx
│       │   ├── ToyCabinet.tsx
│       │   ├── CabinetAllModal.tsx        # 点柜子弹出
│       │   └── ItemDetailModal.tsx        # 点单品弹出
│       ├── plants/
│       │   ├── PlantSlot.tsx
│       │   └── plants-data.ts             # 8 种植物
│       ├── desk/
│       │   ├── Desk.tsx
│       │   ├── DeskItems.tsx
│       │   ├── ChairBack.tsx
│       │   └── Fatboy.tsx                 # 复用现有
│       └── shop/
│           ├── ShopPage.tsx               # /home/shop 路由
│           ├── ShopTabLego.tsx
│           ├── ShopTabToy.tsx
│           ├── ShopTabDeskItem.tsx
│           └── ShopTabPlant.tsx
├── types/
│   └── home.ts                            # 所有 TypeScript 类型
├── lib/
│   └── home/
│       ├── catalog.ts                     # 35 奖杯 + 12 乐高 + 等所有商品库
│       ├── trophy-checker.ts              # 自动解锁逻辑
│       └── shop.ts                        # 购买流程
├── hooks/
│   └── useHomeCollection.ts               # 收藏状态管理
├── styles/
│   └── study-room-tokens.css              # design tokens
└── assets/
    └── home/
        ├── paintings/
        │   └── center_hero.jpg
        ├── trophies/
        │   ├── rank/                      # 7 SVGs
        │   ├── challenge/                 # 20 SVGs
        │   └── hidden/                    # 9 SVGs
        ├── legos/                         # 12 PNGs
        ├── toys/                          # 12 PNGs
        ├── desk_items/                    # 8-12 SVGs
        ├── plants/                        # 8 SVGs
        └── chairs/
            └── default.svg
```

---

**END** · 这份手册让你能"指挥"Claude Code 把设计落地。
不需要你写代码——但需要你按这份手册做"产品经理"，控制方向和质量。
