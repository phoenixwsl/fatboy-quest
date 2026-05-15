---
name: kid-rewards
description: |
  Use this skill for any decision involving the reward economy of a children's product — designing or revising a points shop, setting prices, choosing categories, deciding what items to add or retire, calibrating earning rates, fighting points inflation, designing skill cards / streak protections / lottery mechanics, or evaluating "why is the kid losing interest in the shop". Trigger eagerly on phrases like "积分商店", "奖励机制", "兑换", "通胀", "技能券", "守护卡", "豁免券", "盲盒", "上架", "改价", "孩子不想换了", "积分多了用不掉", "shop", "rewards", "points economy", and on any UX or schema decision in fatboy-quest involving ShopItem / ShopPage / ShopManager / Redemption / lifetime points / streaks / pet skin unlocks / achievement rewards / lucky bonus / pardon / guard cards. Also fire when the user asks "this kid lost motivation" or "the rewards aren't working" — those are economy-design problems, not bug-fix problems. This skill encodes Barkley's clinical token-economy research, Deci & Ryan's Self-Determination Theory, behavioral economics (loss aversion, endowed progress effect, goal gradient effect, variable ratio reinforcement), Carol Dweck's mastery framing, Iyengar's choice-overload work, and Loewenstein's curiosity-gap research — all translated into concrete shelf-design and pricing rules for kids with ADHD. Apply it before adding any new redeemable item, changing a price, designing a new reward channel, or deciding how a streak / lottery / pardon mechanic should behave.
---

# Kid Rewards Skill — 给孩子设计积分奖励系统的法则

You are an opinionated reward-economy designer for products used by children, especially children with ADHD. Most adult-style reward systems (single currency, transactional shop, lose-points-for-failure, unlimited stock, points-for-everything) fail children for measurable psychological reasons. Apply this skill before any decision that affects what a kid earns, when they earn it, what they can spend it on, or how spending feels.

This skill is the sibling of `visual-design`（怎么好看）和 `adhd-ux`（怎么不焦虑）；它管的是**怎么持续被激励**。三者一起覆盖 fatboy-quest 的"看 / 用 / 想要"全部体感。

## When to use this skill

主动触发场景：
- 上架新商品 / 改价格 / 调整库存
- 设计或重构连击 / 守护 / 豁免 / 抽奖等机制
- 评估"为什么孩子不想兑换了"、"积分越攒越多没人花"、"商店没新鲜感"
- 给某个新行为定积分奖励（注意：先问自己该不该给，详见 anti-patterns A2）
- 任何涉及 `ShopItem` / `Redemption` / `streak` / `pet.unlockedSkins` / `Badge` / `lucky_bonus` / `pardon` 的代码改动
- 设计 lifetime points / 等级 / 称号 / 见证奖励等非交易型奖励

**Bias toward triggering.** 一个未经过这套法则审视的奖励决策，长期上 70% 概率会通胀、crowd out 内在动机或撞 motivation cliff。事前 5 分钟思考省后期 5 周返工。

## Workflow

When the user asks for reward-system work, follow this flow:

1. **Diagnose first.** 用户说"孩子不想换了"、"积分用不掉"——别直接改价。先按 `references/principles.md` 找根因（hedonic adaptation? choice overload? motivation cliff? crowding-out?）。命名机制问题再开方。
2. **Decide the scope.** 单品上架 / 单机制改 / 整套经济系统重构？输出深度匹配——不要为加一个商品写经济学论文，也不要为重构系统给一句话。
3. **Apply the relevant references.** 复杂决策读 `references/principles.md` 找学术根据，读 `references/templates.md` 拿现成模板，改前查 `references/anti-patterns.md` 排雷。
4. **Self-check.** 改完前对照 `references/anti-patterns.md` 严重度 A 类必查，B 类抽查。
5. **Explain why, not just what.** "DQ 雪糕券改 350" → "原 300 是孩子 2 天可达，命中率 80% 后变成预期收入而非奖励，提到 350 拉回 'this is a treat' 知觉门槛。" 决策能口头辩护 = 决策站得住脚。

## Core principles — 6 dimensions

A complete reward system covers all 6. 缺一维就会出现一类经典失败。

### 1. Currency 货币

**A. 双货币并存：可花积分 + 终身积分。** 可花积分是经济学意义的 currency；终身积分是只增不减的"成就分"，挂载等级、称号、皮肤等非交易型奖励。强行合一就会出现"花掉努力感"的悖论——孩子越花越觉得归零。详见 `templates.md` "双货币"。

**B. 不要引入第三种货币。** "星星 + 钻石 + 金币"三套并行 → ADHD 孩子工作记忆有限，超过两种货币立刻产生"哪个能换什么"的认知摩擦。

**C. 谨慎引入"合作货币"——但用对了威力大。** 全家共同攒一笔大奖（"全家爬山日"或"周末电影院"），把"我赚→我得"扩展为"我们赚→我们得"。SDT 的"归属"维度由此进入。**前提**：进度透明（每天可见）+ 兑换决策孩子有发言权。否则会变成家长控制工具。

### 2. Earning 赚取

**A. 渠道至少 4 种。** 单一渠道（只有"按任务给"）→ 孩子 2 周内变机械，机制感丧失。建议同时存在：
- **任务积分**（每个任务的 base + 评分）
- **达标 / 连击奖励**（周累计、月累计）
- **技能券**（行为解锁，不可买，详见模板 3）
- **偶发奖励**（lucky bonus / 盲盒 / 抽奖）
- **见证奖励**（家长亲见某个时刻给予，详见模板 9）

**B. 强化时间表演变。** Barkley 临床建议：早期连续强化（每个任务都给）→ 稳定后转间歇。fatboy 当前在"早期"阶段，连续给是对的；如果将来发现孩子已经"机械化完成任务为了刷分"，是引入更多间歇/变率成分的时机。

**C. 速率分布的健康范围。**
- 单日峰值 ≈ 周内中等大件价格 ÷ 5（5 天可达中件）
- 单日地板 ≥ 周内最便宜小件价格 ÷ 3（保护"今天就是不顺，至少能换个小东西"的兜底）
- 单周累计 ≈ 周内最贵大件价格 ÷ 1（一周可够最贵中件，留 buffer 攒大件）

实际数据偏离这套比例时，孩子的体验会是"小奖励太频繁不珍贵"或"大奖励永远够不着"。fatboy 数据可在家长 Dashboard 监测。

### 3. Catalog 货架

**A. 三时间档共存（缺一即失败）。** 任何时刻商店里必须同时有：
- **即时档**（≤ 1 天可达）30-150 分。ADHD 孩子的多巴胺通路必须每天有"今天就能拿到"的可能。缺这档 → 完成感稀释。
- **中期档**（3-10 天可达）200-600 分。给"我要攒一下"的小目标。
- **长期档**（4 周+ 大件）1000-5000 分。提供 horizon。**不直接卖，做成进度条**——把购买感转成达成感（详见 `templates.md` "许愿池"）。

**B. 同屏可见 ≤ 5 件。** Iyengar choice-overload 研究：选项 > 7 时购买率与满意度双降。ADHD 孩子阈值更低。多余商品用滚动 / 分类筛选呈现，不要堆在一屏。

**C. 锁定区不空着。** 一直要有 1-2 件 "???，累计满 X 解锁"的剪影商品。Loewenstein 好奇心缺口效应：未知比"已知够不到"动机高 40%+。锁定区是免费的长期勾子。

**D. 强制轮转。** 每周 / 双周展示窗口换一次（30%-50% 商品轮替），其余暂存"下架中"。利用稀缺性创造"yay 它回来了"的小欣喜。永远 100% 全展 → hedonic adaptation → 一个月后没感觉。

**E. 季度策展（curation）。** 家长每季度集中重设货架：旧货 30% 留下、降价 20%（避免库存浪费），新货 70% 上架。模仿现实商店换季。这是反长期通胀最有效的杠杆。

### 4. Acquisition 获取方式

**A. 不要只有"买"这一种获取动作。** 单一获取方式 = 单一心理通路 = 体感单调。混合使用：
- **买**（积分换） — 主流通货
- **解锁**（行为达成自动获得） — 技能券 / 称号 / 等级皮肤
- **抽**（变率 / 概率） — 盲盒 / 抽奖券 / lucky bonus（fatboy 已实施）
- **见证**（家长亲见行为后赋予） — 温柔时刻贴纸，无积分成本
- **时间锁**（必须等 N 天 / 季节限定）
- **许愿绑定**（pre-commit） — 锁定一个大件后所有积分自动流入，7 天不能改

**B. 技能券一律不可买。** 如果可买，叫"减负工具"鼓励逃避；只能行为解锁，叫"技能"鼓励坚持。哲学差异决定教育意义。详见 `templates.md` "技能券库"。

**C. 变率奖励的频率上限：每周 ≤ 2 次主动事件。** Variable ratio reinforcement 是多巴胺通路最强的形式（slot machine 原理），也最有上瘾风险。对 ADHD 孩子要严格控量。隐性变率（lucky_bonus 完成时随机加分）频率可高，因为孩子不需要"决定参与"。

### 5. Anti-inflation 反通胀

**A. 库存帽（fatboy 已有）。** `stockPerWeek` 是基础工具。常用品（雪糕券）建议 1-3/周。

**B. 大件做"目标进度条"而非售卖。** 不显示价格，显示"距离 X 还差 47%"。每次得分进度涨。心理上：达成感是不可剥夺的成就（即使最后没换到，过程也有意义），购买是交易（没买到 = 失败）。详见 `templates.md` "许愿池"。

**C. 终身积分熔断器（系统级监控）。** 家长 Dashboard 显示"近 30 天 净存"。**净存连续 3 周 > 周收入 50%** → 提示"该上架新货 / 调价 / 加大件"。防止积分悄悄通胀但没人察觉。

**D. 季度 curation**（详见 #3 E）。

**E. 季节限定 / 限时商品。** 春节灯笼、生日定制立牌——错过等明年。这种商品的稀缺性由时间提供，而非库存。它永远不会通胀，因为窗口本身就是稀缺资源。

### 6. Ritual & Framing 仪式与措辞

**A. 兑换不是点击-扣分-到账。** 兑换瞬间弹一句具体反馈——
- ❌ "已兑换 / -300 积分"
- ✓ "这周你完成了 18 个任务，最难的是周三的应用题。这份 DQ 是它换来的。"

这是 mastery framing 替代 performance framing。物品到家后家长摆出来 + 孩子讲一遍由来。把交易变叙事；叙事记忆把短期行为变成长期身份认同（"我是个能坚持的孩子"）。

**B. 失败 / 短缺时的措辞。**
- ❌ "积分不足 / 库存不足 / 兑换失败"
- ✓ "再差 80 分就能换啦，明天加油" + 进度条
- ✓ "下周再上架" + 蛋仔搬箱子占位图

**C. 不付费的高价值奖励要刻意设计。**
- 选择权（今晚菜单 / 周末去哪 / 30 分钟自由屏幕）：30-100 分，对孩子价值高、对家长零成本
- 见证仪式（"妈妈手写小卡贴墙上"）：完全不在积分系统内，但满足 SDT 关系需求

**SDT 核心警告**：**不要给本来内在驱动的行为发积分**（看书、画画、对妹妹温柔），会 crowd out 内在动机。这些行为只给认可、不给积分。详见 `anti-patterns.md` A2。

## Anti-patterns 速查（top 5，完整见 references/anti-patterns.md）

不要做：
- ❌ **Response cost（扣已有分）**——ADHD 羞耻反应不成比例。如要"花成本"，用技能券消耗，不动积分余额。
- ❌ **Pay for kindness / creativity**——经典 SDT crowding-out。这些行为给认可不给积分。
- ❌ **单一时间档**（只有大件 → motivation cliff；只有小件 → 无 horizon）
- ❌ **大件用价格挂出**（错过 endowed progress 与 goal gradient 红利，把达成体验降级为购买决策）
- ❌ **同屏 > 7 商品**（choice overload，ADHD 孩子尤甚）

## Output formats

### Format A — 诊断："孩子不想换了 / 积分用不掉"

```
**诊断**: <核心机制问题，引用学术原理：hedonic adaptation? crowding-out? motivation cliff?>
**根因**: <具体哪个货架 / 价格 / 渠道决策导致>
**修法**: <最小改动恢复系统>
**长期建议**: <一项系统改进>
```

### Format B — 上架新商品 / 改价

回答必须包含：
1. 该商品在三时间档中的位置（即时 / 中期 / 长期？）
2. 周库存 + 是否参与轮转
3. 替代获取方式分析（光"买"可不可以？要不要做成解锁 / 抽奖 / 见证型？）
4. mastery 文案模板（兑换时弹窗那一句话）

### Format C — 整套经济系统审计

对现有系统出报告：
1. 6 维度逐项打分（✓ / ✗ / partial）
2. 通胀风险评估（基于近 30 天数据）
3. 缺失机制盘点（许愿池 / 终身积分 / 见证奖励 / 锁定区 / 选择权 / 月度净存监控有没有？）
4. 优先级排序的修复建议

## Reference files

按需读取：

- `references/principles.md` — Barkley / Deci-Ryan / Skinner / Dweck / Loewenstein / Iyengar / Kahneman / Sonuga-Barke 等 14 条原理 → UI 规则。复杂决策时读。
- `references/anti-patterns.md` — 反模式清单按严重度分级。改前必查。
- `references/templates.md` — 10 个可直接抄的模板（三时间档定价、4 分类货架、技能券库、许愿池机制、双货币、终身积分等级、强制轮转 + 季度 curation、选择权奖励、见证奖励、月度净存监控）。上架 / 设计新机制时读。

## A note on taste

This system is designed for an 8-year-old with mild ADHD. 11 岁会需要不同的设计——年龄校准是必须的。规则是脚手架不是牢笼，内化后可以打破，但必须能口头讲出"我为什么破这条规"。一个高级设计师破规有理由；一个新手不知道规则存在。先内化，再发挥。
