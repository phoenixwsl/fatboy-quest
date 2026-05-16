# 肥仔大闯关 (fatboy-quest) — Claude Onboarding

This file is auto-loaded by Claude Code / Cowork at the start of every session. Read it first before touching any code.

---

## 1. 谁在用 / 用在哪

- **用户**：3 年级小学生（昵称"肥仔"），轻度 ADHD，家庭辅助使用
- **设备**：iPad，添加到主屏的 PWA，离线可用
- **协同**：爸爸（frank）+ 妈妈两个家长账号，通过 Bark 接收推送
- **场景**：每日作业 → 规划 → 闯关执行 → 家长评分 → 积分商店兑换奖励

## 2. 重要约束（违反这些 = 项目报废级别错误）

1. **必须 PWA + 离线可用**：所有数据存 IndexedDB（Dexie），不能依赖网络。
2. **iPad Safari 16.4+ 兼容**：所有 CSS 特性、JS API 必须支持 iOS Safari。
3. **不能引入付费/订阅服务**：这是单人爸爸副业项目，所有依赖必须免费。
4. **不能写恶意代码 / 不能涉及未成年人不当内容**：用户是孩子。
5. **Bark 推送 key 是写死的**：爸爸 `aWEsiXKUPXgZAPNiz6r835`、妈妈 `DfjzKiUDcfdWLcnMeR6jXf`。代码里 `ensureDefaultRecipients()` 会自动校正历史互换的情况，不要乱动。
6. **数据库 schema 已演进到 v6**：改 schema 必须写 migration，不能破坏老用户的本地数据。

## 3. 技术栈速查

- React 18 + Vite + TypeScript + Tailwind CSS + framer-motion
- Dexie.js (IndexedDB) + dexie-react-hooks (useLiveQuery)
- HashRouter（不是 BrowserRouter — PWA 部署在 GitHub Pages 子路径下，HashRouter 避开 404 问题）
- vite-plugin-pwa + Workbox 预缓存
- lucide-react@1.14.0（注意：Unlock 在这版本叫 LockOpen，不是新版 API）
- canvas-confetti（已装未充分用）
- 部署：GitHub Pages `https://phoenixwsl.github.io/fatboy-quest/`

## 4. 已建立的设计/产品资产 — Skill 库

**5 个 skill 形成完整决策链**，任何改动按"决策层 → 专项层 → 发版层"顺序找：

### 决策层（入口）
- **`.claude/skills/children-app-design/`** — 上层产品哲学 + 决策框架
  - 任何新 feature 提议**先过这里的 4 维度评分**（A 心理健康 / B 家长信任 / C 复杂度 / D 替代-促进亲子互动）
  - 总分 < 0 拒绝；0-2 谨慎；3+ 可做；6+ 优先
  - 含 10 个 worked examples（排行榜 / 三件好事 / 限时秒杀 / AI 聊天 / 班级任务...）

### 专项层（执行细节）
- **`.claude/skills/visual-design/`** — 视觉系统（色彩 / 形状 / 字体 / 多主题 10 法则 / 5 套现成主题 / Gurney·Albers·Itten 三大师）
- **`.claude/skills/adhd-ux/`** — ADHD 用户体验（时间反馈分级 / 启动摩擦最小化 / 失败温柔 / 即时奖励 / 反焦虑放大）
- **`.claude/skills/kid-rewards/`** — 积分经济（兑换 / 通胀 / 通货保护 / Streak / 守护卡 / 彩蛋）

### 发版层（守门）
- **`.claude/skills/release-checklist/`** — Pre-flight 清单（tsc → tests → build → schema-migration → 版本 bump → iPad 缓存提示 → 一句话 commit）

### 工程层资产
- `src/index.css` — 三主题完整 token 系统（cozy/starry/mecha），用语义层 token（`--primary` / `--accent` / `--surface-paper` / `--ink-strong` / `--state-success-soft/strong` 等）。**勿用 tailwind 颜色 utility 硬编码**（`text-white/40`、`bg-emerald-500/30` 等已被 R3.4.1 全量清理）
- `tests/` — 421+ 单元 + 集成测试，pre-commit hook 跑 tsc + vitest + build

## 5. 工作流约定

### 5.1 Commit 风格

**一句话 commit**：`R3.4.1: 242 处硬编码颜色 token 化`。不要展开多行解释 — 用户已明确不要详细 commit。

**所有 commit 都必须带版本号前缀**（包括 chore / docs / test —— 无一例外）。每次提交前先 bump `src/version.ts`，commit message 用同一个版本号开头，例如 `R5.6.0: xxx`。禁止出现 `chore: xxx` 这种不带版本号的 commit。

### 5.2 版本号

`RX.Y.Z` 模式：
- X = 主版本（重大功能/重构）
- Y = 中版本（新特性）
- Z = 修复 / 小调整

bump 改 `src/version.ts` 的 `APP_VERSION` 和 `APP_BUILD_DATE`。

### 5.3 推送 + iPad 缓存

每次 push 后用户需在 iPad 上：
1. Safari 长按刷新按钮 → 重新载入忽略缓存
2. 或删除 PWA 重装

如果 service worker 卡旧版本，UpdateBanner 会自动检测新版并提示。

### 5.4 改前先 plan

任何涉及 3+ 文件 / 引入新依赖 / 改 DB schema 的改动，**先列 plan 让用户确认**，再动手。不要一头扎进去改 200 个文件后才发现方向不对。

### 5.4.1 新 feature 提议先过 children-app-design 决策框架

用户说"加个 X 功能"时**不要直接动手实现**。先：
1. 用 `children-app-design/SKILL.md` 的 4 维度评分（A/B/C/D 各 -2 到 +2）
2. 如果总分 < 0：**拒绝并给反提议**（用 +分维度替代 -分维度，例如"排行榜" → "自己对比自己"）
3. 如果总分 3+：再下钻到 visual-design / adhd-ux / kid-rewards 等专项 skill 做执行设计
4. 任何 feature 实现前都让用户看见决策评分，不要黑箱实现

### 5.5 复杂改动用 subagent

大批量机械修改（如 token 化、命名重构）用 Task 工具开 subagent 批量处理，主线对话保持决策层级。改完用 reviewer subagent 独立审一遍。

### 5.6 视觉问题先诊断后开方

用户截图反馈视觉问题时（"看不清"、"颜色不对"、"觉得 cheap"），先按 `visual-design` skill 的方法名出违反的原则（Itten / Albers / Gurney），再说怎么修。不要跳过诊断直接动代码。

## 6. 行为约定 — 主动质疑

**用户授权**：如果你（Claude）认为用户提的需求有问题（over-engineering / 与现有冲突 / 长期维护成本高 / 对孩子用户体验不友好），先质疑再实现，不要默认服从。"我觉得这个不该做"是合法回答。

举例：
- 用户说"加 8 档难度"：质疑"3 档孩子已经分不清了，8 档是否过度？"
- 用户说"全删旧代码"：质疑"会不会破坏现有 DB 数据？"
- 用户说"加段动画"：质疑"会不会增加 ADHD 孩子的视觉负担？"

## 7. 关键文件指引

| 想做的事 | 看哪里 |
|---|---|
| **决定要不要做某个新 feature** | **先过 `.claude/skills/children-app-design` 决策框架** |
| 改主题颜色 / 视觉 | `src/index.css` + `.claude/skills/visual-design` |
| 改奖励 / 积分 / 兑换机制 | `.claude/skills/kid-rewards` + `src/lib/points.ts` / `src/lib/evaluate.ts` |
| 改 ADHD 友好行为（超时反馈、提醒分级）| `.claude/skills/adhd-ux` + `src/pages/QuestPage.tsx` |
| 准备发版 / 提交 / push | `.claude/skills/release-checklist` |
| 加任务/积分逻辑 | `src/lib/evaluate.ts`, `src/lib/points.ts`, `src/lib/difficulty.ts` |
| 改 DB schema | `src/db/index.ts`（注意写 migration） |
| 改家长设置页 | `src/pages/parent/Settings.tsx` |
| 改孩子首页 | `src/pages/HomePage.tsx` |
| 改闯关页 | `src/pages/QuestPage.tsx` |
| 改评分弹窗 | `src/pages/parent/Evaluations.tsx` |
| 看测试 | `tests/`（单元）+ `tests/integration/`（集成） |
| 看历史版本/约定 | 这个文件 + git log |

## 8. 当前待办（活的清单 — 每次完成后更新）

### Open

- [ ] visual-design skill 第二轮迭代：v0.1 已实战测试通过，可考虑加入 `references/motion.md`（动效法则）
- [ ] 全局 commit + push R3.4.1（242 处 token 化）
- [ ] 考虑改 `bg-space-card`/`bg-space-nebula` 这些自定义 token（目前在 tailwind config 里，跨主题不跟随）
- [ ] HomePage / QuestPage 未做的"未完成"小细节：见 git log

### Done（最近 5 个）

- ✓ R3.4.1: 242 处硬编码颜色 token 化
- ✓ R3.4.0: 建立 visual-design skill + 主题重写
- ✓ R3.3.1: 修主题深色态文字不可读 + 主题给孩子用 + 评分弹窗加任务细节
- ✓ R3.3.0: 多主题系统 + 难度星 + 屏幕长亮
- ✓ R3.2: 难度 1-3 星（算法 B）

## 9. 联系方式

- 用户：frank（phoenixwsl521@gmail.com）
- 部署：`https://phoenixwsl.github.io/fatboy-quest/`
- repo：本地路径 `/Users/senlin.wsl/fatboy/fatboy-quest`

---

**最后一句**：这是一个爸爸为儿子写的副业项目，每一次改动都会被一个 3 年级小孩在 iPad 上感受到。慎重、温柔、克制。
