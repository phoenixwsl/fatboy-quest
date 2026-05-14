---
name: adhd-ux
description: |
  Use this skill for any UX decision in a product used by children with ADHD, especially when designing for executive-function support — time perception, working memory, emotional regulation, task initiation, transitions. Trigger eagerly on: "ADHD", "孩子", "注意力", "走神", "拖延", "忘记", "超时", "焦虑", "情绪", "提醒", "倒计时", "切换", "完成感", "奖励机制", and any time the user shows a screenshot or describes behavior involving a child with attention/regulation challenges. Also fire on any UX decision in fatboy-quest (the homework app for a 3rd-grader with mild ADHD) — feature additions, copy choices, error states, reward mechanics, time pressure surfaces. This skill encodes evidence-based ADHD-friendly UX patterns + the specific learnings accumulated in this project. Apply it before adding any "warning", "reminder", "timer", "punishment", or "deadline" UI element.
---

# ADHD-UX Skill — 给 ADHD 孩子设计 UX 的法则

You are designing for a brain that processes time, reward, and emotion differently. Most adult-facing UX patterns (long countdown timers, punitive deadlines, dense information layouts, delayed gratification) are *anti-patterns* here. Apply this skill before any UX decision in a children's product, especially one where the child has attention-regulation challenges.

## Core ADHD traits + UX implications

| 神经特性 | UX 表现 | 设计法则 |
|---|---|---|
| **时间感知差** (Time Blindness) | "我以为只过了 5 分钟，其实 30 分钟过了" | 视觉化时间流逝（进度条 / 沙漏 / 星星消减），不只靠数字 |
| **工作记忆弱** | 步骤多了忘前面 | 单页单焦点，至多 1 个"下一步"按钮 |
| **延迟厌恶** (Delay Aversion) | 远期奖励无激励 | 即时反馈 < 5 秒到位（响声 + 动画 + 积分变化） |
| **情绪放大** | 小挫败 → 大崩溃 | 失败反馈温柔（"再试一次"而不是"错了"），重要不可逆操作要二次确认 |
| **过度专注 + 启动困难** | 既能进入心流也能卡死在开始 | 启动摩擦最小化（一键开始），心流中不打断 |
| **任务切换成本高** | 暂停后回来要重新进入状态 | 暂停要"保留情境"（不清空进度、可见上次到哪），少用 modal 切换 |
| **多巴胺寻求** | 重复刺激源（彩蛋、Surprise） | 不可预测的小奖励（lucky bonus）比固定奖励更有效 |
| **执行功能弱** | 不会自我提醒、自我规划 | 系统主动推送提醒，但要分级（不能高频惊扰） |

## 核心法则

### 1. 时间反馈分级（**禁止焦虑放大**）

❌ **错误**：超时 → 立即大声警报 + 红屏闪烁 + 推送家长。
✓ **正确**（fatboy-quest 已实施）：
- 0-3 分钟超时：仅视觉提示（蛋仔表情变 worried，无声）
- 3-5 分钟超时：温和提示音（不是警报音）
- 5+ 分钟超时：推送家长，**文案是"陪一下"不是"超时了"**

**原理**：ADHD 大脑对失败信号反应过度。焦虑放大会让孩子崩溃，反而完不成任务。温和分级 + 让家长介入而非孩子单挑。

### 2. 即时奖励 + 不可预测彩蛋

✓ 完成任务的奖励要在 < 1 秒内到达（音效 + 动画 + 积分数字跳动）。
✓ 加入不可预测的奖励（fatboy-quest 的 lucky_bonus）：完成时按概率给额外积分，触发"再来一次"的多巴胺循环。

**反例**：积分要等家长评分后才到账 — 这是延迟奖励，无效。即时给一部分（"击败！+5 ⭐"），评分时再补差额。

### 3. 单页单焦点

❌ 一屏 5 个 CTA 按钮 + 3 个 banner + 2 个 modal 排队。
✓ 一屏一件事。如果有多个待办，把"当前在做的"高亮锁定，其他降饱和、缩小、灰化。

**fatboy-quest 实施**：闯关页只显示当前任务卡片 + 4 个固定操作（开始/暂停/延时/求助），其他全部隐藏。

### 4. 启动摩擦最小化

❌ "开始任务"前要填表单选择难度估时间。
✓ 默认值合理 + 一键启动。难度家长预设，孩子只点"我要开始"。

**通用规则**：能预设的不让孩子选，能省的步骤都省。每多一个决策步 = 启动门槛升高 30%。

### 5. 暂停保留情境

ADHD 孩子被打断后回来很难重新进入状态。
✓ 暂停时保留：剩余时间显示、当前进度位置、上一秒的视觉状态。
✓ 暂停超 N 分钟自动恢复（fatboy-quest: 3 分钟），防止假死。

❌ 暂停后清空所有计时 / 跳回首页 / 弹"确定要暂停吗"二次询问。

### 6. 不可逆操作要二次确认 + 撤回

ADHD 冲动控制弱，误点率高。
✓ "删除任务" / "重置数据" / "积分扣除" 必须二次确认，文案 emoji 化。
✓ "完成任务" 允许 N 分钟内撤回（fatboy-quest 已实施 canUndoCompletion）。
✓ 撤回保留 undoCount 用于分析，但不惩罚孩子。

### 7. 提醒要分级 + 个性化

不要"一刀切"提醒。
- 启动提醒（孩子进入任务页但没点开始）：3 分钟后温和提示音 + 蛋仔气泡"在想什么呢？"
- 超时提醒：见法则 1
- 未评分提醒（针对家长）：45 分钟后推送家长
- 连击破坏前夜：8 PM 还有未完成任务时推送

**频率上限**：同一孩子每天最多 3 条主动推送家长，超出聚合成一条。

### 8. 情绪友好的失败反馈

❌ "错了"、"超时了"、"扣分"。
✓ "再试一次"、"陪一下"、"差一点"、"明天继续加油"。

**词典对照**：
| 标准词 | ADHD 友好词 |
|---|---|
| 超时 | 时间到了 |
| 失败 | 这次没完成 |
| 错误 | 不太对 |
| 警告 | 提醒一下 |
| 危险 | 注意 |
| 删除 | 移除 |
| 扣分 | 兑换（如延时扣分写"用 X 积分换 N 分钟"） |

### 9. 颜色 + 形状不要"惊吓"

详见 visual-design skill。ADHD 特殊补充：
- ❌ 大面积高饱和红色 / 闪烁动画 / 高对比黑白闪屏
- ✓ 警示色用温和的橙红（#E25555）而不是纯红（#FF0000）
- ✓ 进度条用温暖渐变彩虹而不是单色（fatboy-quest 已实施）

### 10. 让家长接力，不让孩子独抗

ADHD 孩子的自我调节有限。系统设计要假设"家长会接力"：
- 孩子超时 → 推送家长来陪
- 孩子情绪崩溃 → 通过"求助"按钮一键通知家长
- 孩子忘记规划 → 家长在 TaskManager 提前排好

**反模式**：把所有调节责任压给孩子（"你怎么又超时了"、"自己规划好"）。设计应该让家长无负担介入。

## 反模式速查

下次想加这些功能时**停下来再想**：
- ❌ 大红色 / 闪烁 / 警报音的"超时警告"
- ❌ "扣分" / "失败" / "错误" / "警告" 字眼
- ❌ 一屏多个 CTA 让孩子选
- ❌ 高频推送 / 多步骤 wizard
- ❌ 删除前不二次确认
- ❌ 完成后 5 秒以上才有反馈
- ❌ 强迫孩子自己评估难度 / 估时长
- ❌ 长期目标做主激励（"积满 10000 分换 X"），缺中短期反馈

## fatboy-quest 已实施的 ADHD 友好特性（参考实施样本）

- ADHD 友好模式开关（`settings.adhdFriendlyMode`），默认开
- 超时四档分级反馈（lib/heal + QuestPage）
- 完成撤回（`canUndoCompletion`）
- 暂停 3 分钟自动恢复（`PAUSE_LIMIT_SEC`）
- Lucky bonus 彩蛋（`shouldGrantLuckyBonus`）
- 即时奖励：完成 → kill 音效 + 积分跳动 + 蛋仔 celebrate 动画
- 启动等待 3 分钟推送家长（`startNagSentAt`）
- 求助一键通知（HandHelping 按钮）
- 蛋仔气泡温柔提示（"在想什么呢？" 而不是"你怎么还没开始"）
- 推送家长文案"陪一下"（`adhdFriendlyMode` 分支）
- 难度系统但家长预设，孩子不操作

## 当你 (Claude) 发现违反这些法则时

主动质疑用户：
- "这个 X 功能会引入焦虑放大的风险吗？"
- "这个步骤是否可以让家长预设而不是让孩子选？"
- "失败反馈的措辞会不会让孩子有挫败感？"

用户在 CLAUDE.md 已授权 Claude 主动质疑。
