---
name: children-app-design
description: |
  Use this skill BEFORE any product decision for any app, web, or game whose users are under 18 — kids apps, K-12 educational tools, family apps, parental co-use apps. Trigger eagerly on: "儿童 app", "k12", "教育产品", "孩子用", "家庭产品", "亲子", "学习 app", "edutainment", "kids product", "family product", "学龄", "适合 N 岁", and any feature decision in fatboy-quest. This is the umbrella skill for the product philosophy + decision framework layer; defer to sub-skills for details (visual-design for color/shape/type, adhd-ux for executive-function support, kid-rewards for points economy, release-checklist for shipping). What this skill uniquely covers that the others don't: the 4 ways children are not adult users, multi-stakeholder design (kid + parent + teacher), privacy & ethical bright lines, anti-dark-pattern principles, the 90/10 educational-entertainment law, age-stage calibration, and a decision framework for "should we even build this?". Apply it whenever the user proposes a new feature, before the cost of building lands — the answer might be "don't build that" and saving the work is more valuable than shipping. Also apply when evaluating an existing feature that "feels off": often the disease is at this layer, not in code.
---

# Children App Design Skill — 儿童产品设计哲学层

You are designing for users who cannot fully consent, who lack adult self-regulation, who are co-piloted by parents and teachers, and whose psychological development you will measurably affect by what you ship. The bar is higher than for adult products. Apply this skill before, during, and after any design decision.

## 一、儿童 app 不是缩小版的成人 app — 4 个根本特殊性

任何把成人 UX 模式直接缩小、加点卡通色、套个吉祥物就当"儿童产品"的做法，都会失败或造成伤害。儿童用户在 4 个根本维度不同于成人：

### 1. 自我调节有限 (Limited Self-Regulation)

孩子的执行功能、时间感知、冲动控制、情绪调节都在发育中。成人 app 假设的"用户自律"在这里不成立。

UX 含义：
- 不能依赖"用户自己会停"，要主动建议休息
- 不能依赖"用户会规划"，要提供脚手架或让家长预设
- 不能依赖"用户会忍受延迟",反馈必须即时
- 详见 `adhd-ux` skill 法则 1-7

### 2. 多用户协同 (Multi-Stakeholder)

成人产品的"用户"就是用户。儿童产品有 3 个角色，且权力不对等：

| 角色 | 关系 | 设计要点 |
|---|---|---|
| **孩子**（user）| 实际使用者 | 易用、有趣、可控 |
| **家长**（stakeholder + 共同 user）| 法律责任人 + 经济决策者 + 日常协同者 | 透明度、可见性、可干预 |
| **老师**（次级 stakeholder，部分场景）| 教学引导者 | 报告、可配置教学目标 |

**设计原则**：任何 feature 同时考虑这 3 个角色。"孩子爱用" + "家长信任" 同时满足，缺一不可。

### 3. 信任红线高 (Heightened Trust Requirements)

孩子无法对隐私和数据使用做出有效同意。家长授权也只在有限范围有效。法律和伦理标准远高于成人产品：

- **法律层**：COPPA（美）、GDPR-K（欧）、未成年人个人信息网络保护规定（中）。所有都禁止未经家长同意收集 13 岁以下儿童的个人数据。
- **伦理层**：即使法律允许，也不该收集。**数据本地优先**应是默认架构，不是 nice-to-have。
- **商业层**：广告、内购、订阅压力在儿童产品里都是红线。即使法律允许也不该做。

### 4. 心理影响放大 (Amplified Psychological Impact)

孩子的认知与情感正在发育。你做的每个 UX 决策会被儿童大脑当作"世界规则"的样本：

- 失败反馈方式 → 孩子如何看待失败
- 奖励机制 → 孩子的动机倾向（外驱 vs 内驱）
- 攀比/排行机制 → 孩子的自我价值感
- 时间压力 → 孩子的焦虑水平
- 攻克难关的体验 → 孩子的 grit 和成长心态

**这不是夸张**。Carol Dweck 的成长心态研究、Bandura 的自我效能理论、Deci & Ryan 的自决理论，都证明儿童阶段的心理体验对长期发展有显著影响。你 ship 的东西不是中性工具。

## 二、12 大设计法则

### 法则 1：先问"该不该做"，再问"怎么做"

儿童产品最重要的设计决策是**不做什么**。每个 feature 提议过决策框架（见 Part 三）再动手。

**反例**：用户说"加排行榜"。盲目实现 = ship 攀比焦虑机制。先问：会激励还是打击？孩子需要看到同龄人吗？家长能否关闭？

### 法则 2：多用户协同设计

任何 feature 设计阶段就同时画 3 个 mock — 孩子端 / 家长端 / 老师端。**孩子端的复杂度不应该外泄到家长端**，反之亦然。

fatboy-quest 例：
- 任务难度由家长在 TaskManager 预设（孩子不暴露给"评估自己任务难度"的认知负担）
- 评分由家长在 Evaluations 页完成（孩子不需要自评）
- 积分商店上下架由家长在 ShopManager（孩子只看到"上架"列表）

### 法则 3：内在动机优先（自决理论 SDT）

Deci & Ryan 的自决理论指出 3 个心理基本需求：
- **自主感 (Autonomy)**：我自己做出的选择
- **胜任感 (Competence)**：我能做到、有进步
- **归属感 (Relatedness)**：被理解和重视

把这 3 个作为产品的根目的，积分/徽章/排行只是辅助。**当孩子失去兴趣时**，问题往往不在奖励金额，而在这 3 个需求是否被满足。

详见 `kid-rewards` skill（已存在），covers 经济学层。

### 法则 4：不可逆操作必须可撤回 + 二次确认

孩子冲动控制弱，误操作率比成人高 3-5 倍。任何"删除/扣分/退出/重置"操作都必须：
- 二次确认（emoji 化文案，不要冷冰冰对话框）
- 一段时间内可撤回（fatboy-quest: 完成后 24 小时可撤回评分）
- 不可逆的真删除前要导出/备份

### 法则 5：失败反馈温柔分级

详见 `adhd-ux` skill 法则 1 + 8。儿童产品全面适用（不只 ADHD 孩子）：
- 不用"错了"、"失败"、"超时"等惩罚性词汇
- 失败反馈用 progress framing（"还差一点"）+ 试错允许
- 不要焦虑放大（红屏闪烁、警报音）

### 法则 6：零商业陷阱

儿童产品**永远不应该**有这些机制：
- ❌ 应用内广告（特别是诱导购买的）
- ❌ 限时优惠 / 倒计时 FOMO
- ❌ "再玩 5 分钟就解锁" 这类延迟解锁勒索
- ❌ 看广告获得奖励
- ❌ 朋友邀请奖励（社交压力转化）
- ❌ 内购需要孩子操作（即使有家长确认弹窗）
- ❌ 上瘾设计（无限滚动、连续登录强制、随机宝箱）

合法 ≠ 道德。这些机制即使法律允许，也不应该出现在儿童产品里。

### 法则 7：隐私最大化（本地优先）

默认架构：
- **数据本地存储**（fatboy-quest 用 IndexedDB / Dexie，零云端）
- **不收集个人信息**（除了昵称，且本地不出账户）
- **家长可见全部数据**（Dashboard / DataExport）
- **家长可一键导出 + 一键删除**
- **不集成第三方分析 SDK**（即使是 GA / Mixpanel 这种"标准做法"）
- **不集成社交分享 SDK**（即使是无害的微信分享）

如果一定要联网（如 Bark 推送），明确说明发送什么数据到哪、按需关闭。

### 法则 8：家长是 partner，不是监工

家长权力来自责任，不来自"控制欲"。设计时区分：

| 监工模式（避免）| Partner 模式（拥抱）|
|---|---|
| 实时屏幕录制 | 完成后看简报 |
| 强制密码门禁 | PIN 保护但可绕过 |
| 弹窗式督促 | 推送式提醒（可关）|
| 单向命令 | 双向反馈（评分时可备注）|

fatboy-quest 已实施：家长收到 Bark 推送 + 完成简报 + 可评分备注；不监控孩子操作；孩子可主动求助。

### 法则 9：吉祥物 + 情感锚点

一个角色承载情感。它不是装饰：
- 表达孩子当前状态（开心、紧张、累了、需要帮助）
- 给孩子反馈（不直接说"你错了"，是角色"哎呀，一起再试一次")
- 在情感低谷时陪伴（孩子失败时角色不嘲笑，是同情）
- **不要做权威角色**。它是同伴 / 助手，不是老师 / 上帝。

fatboy-quest 实施：蛋仔形象 + 多种表情（focused/worried/sleeping/celebrate）+ 永远不评价孩子。

### 法则 10：90/10 教娱平衡

经验法则（来自 Toca Boca / Khan Academy Kids 教训）：
- 一段 10 分钟体验：**9 分钟是有趣的活动 + 1 分钟是教育目的**
- 教学内容**夹在乐趣里**，不要让孩子知道"这是学习时间"
- 反例：把教学包装成"游戏皮肤" — 孩子 5 分钟看穿，丢弃
- 正例：DragonBox（代数游戏），孩子玩游戏过程中"顺便"学了代数概念

fatboy-quest 的位置稍微不同（任务管理而非学习内容产品），但类似法则仍适用：积分商店、闯关包装、蛋仔互动是"乐趣"包装；任务执行才是"目的"。乐趣必须真乐趣。

### 法则 11：年龄适配

不要做"3-15 岁通用"app。年龄段差异：

| 年龄段 | 阅读 | 抽象思维 | 社交需求 | 设计要点 |
|---|---|---|---|---|
| 学龄前 (3-5) | 无 / 极弱 | 具象 | 家长主导 | 全图形界面，无文字依赖 |
| 小学低年级 (6-8) | 基础识字 | 半具象 | 同伴觉察 | 短词 + 大字 + 多图，简单文字 |
| 小学中年级 (9-11) | 流畅 | 开始抽象 | 同伴重要 | 长句可，可解释规则 |
| 小学高年级 (12-13) | 流畅 | 抽象成熟 | 同伴 + 独立 | 接近成人 UX，但保留温柔感 |
| 初高中 (14-17) | 同成人 | 同成人 | 强独立 | 成人 UX 但内容选择仍受限 |

fatboy-quest 目标用户：小学中年级 — 故文字可用、规则可解释，但视觉仍需大字 + 形状可触感强。

### 法则 12：测试给真实孩子用

最大的儿童产品设计陷阱：**用爸爸/妈妈的脑袋测自己设计的孩子产品**。
- 你 30 年前是孩子。**你不是现在这个孩子**。
- 你设计时投入的注意力 ≠ 孩子用时的注意力
- 你能看懂的文字 ≠ 孩子能看懂

唯一可信的测试：
- 让自己的孩子 / 同龄孩子真正用
- **不要在旁边解释或催促**
- 观察他/她卡在哪、放弃在哪、笑在哪、烦在哪
- 收集行为后再讨论（不要在他用着时问"你觉得这个怎么样")
- 多个孩子测试，单个孩子的反应可能极端不代表整体

## 三、决策框架 — "该不该做这个 feature？"

任何新功能提议，按 4 维度评估，每维度 -2 到 +2。**总分 < 0 不要做；0-3 谨慎；>3 可以做**。

| 维度 | -2 | -1 | 0 | +1 | +2 |
|---|---|---|---|---|---|
| **A. 心理健康影响** | 引发焦虑/攀比/挫败 | 中性偏负 | 中性 | 培养胜任感 | 培养自主+归属 |
| **B. 家长信任** | 触发隐私/钱/沉迷红线 | 家长可能担忧 | 透明 | 让家长更安心 | 强化亲子互动 |
| **C. 复杂度** | 孩子需要 5+ 步骤理解 | 需要解释 | 直观 | 一目了然 | 自然涌现（无需教学）|
| **D. 替代 vs 促进亲子互动** | 完全替代真人陪伴 | 减少互动机会 | 中性 | 创造话题 | 主动促进亲子讨论 |

**示例**：用户说"加排行榜让孩子跟同学比"
- A: -2（攀比、外驱、伤害自决）
- B: 0（家长可能矛盾）
- C: 0（直观）
- D: -1（孩子可能减少跟家长讨论）
- 总分 -3 → **不做**

**示例**：用户说"加每天三件正向小事记录（孩子写）"
- A: +2（自主表达 + 内观）
- B: +2（家长可看到孩子心情）
- C: +1（简单输入）
- D: +2（晚饭话题）
- 总分 +7 → 可以做

## 四、跟其他 skill 的关系

这个 skill 是**入口决策层**。具体执行细节去：

| 子问题 | 找哪个 skill |
|---|---|
| 颜色 / 字体 / 圆角 / 形状 / 主题 | `visual-design` |
| ADHD 友好 / 时间反馈 / 启动困难 | `adhd-ux` |
| 积分 / 兑换 / 通胀 / 奖励机制 | `kid-rewards` |
| 发版 / 测试 / 提交 | `release-checklist` |
| **该不该做 / 多用户协同 / 隐私 / 商业陷阱 / 年龄适配 / 反 dark pattern** | **本 skill** |

不要把决策层和执行层混淆。先来这里判断"该不该做"，确定后下钻到执行 skill 做"怎么做"。

## 五、反模式速查（绝对禁止）

下次想做这些时**停下来**：

### 商业反模式
- ❌ 内购 / 广告 / 看广告解锁 / 订阅压力
- ❌ FOMO 倒计时（"限时 10 分钟内消费"）
- ❌ 上瘾设计（无限滚动、连续登录强制、签到惩罚断签）
- ❌ 社交压力（邀请好友才能解锁、朋友间排行）

### 心理反模式
- ❌ 攀比 / 排行榜（即使隐藏也不要存）
- ❌ 惩罚性失败（红屏闪烁 / 警报音 / 扣大额积分）
- ❌ 紧迫感焦虑（"还剩 30 秒")
- ❌ 公开羞耻（"昨天有 5 个任务没完成"在显著位置）
- ❌ 对比型反馈（"你比 70% 同龄人差")

### 隐私反模式
- ❌ 默认开启数据上传
- ❌ 集成第三方 analytics SDK
- ❌ 集成社交分享 SDK
- ❌ 让孩子自己输入手机号 / 邮箱 / 真实姓名
- ❌ 上传孩子照片到云端

### 多用户反模式
- ❌ 强迫家长监控（无法关闭的实时屏幕共享）
- ❌ 把家长复杂功能放在孩子端（让孩子困惑）
- ❌ 替代亲子互动（让孩子跟 AI 对话取代跟父母）
- ❌ 强迫家长每天打开 app（推送数量上限是有的）

### 设计反模式
- ❌ 大块文字依赖（孩子阅读速度比成人慢 3-5 倍）
- ❌ 多 modal 嵌套（孩子工作记忆不够）
- ❌ 一屏多 CTA（注意力分散）
- ❌ 隐藏关键操作在二级菜单
- ❌ 没有撤回的破坏性操作

## 六、fatboy-quest 已实施 / 待实施

### 已实施（参考样本）
- ✓ 多用户协同：孩子端简化 + 家长端完整功能
- ✓ 内在动机：闯关叙事 + 蛋仔陪伴 + 蛋仔皮肤解锁（胜任 + 归属）
- ✓ 撤回机制：completion undo + 暂停恢复
- ✓ 失败温柔：ADHD 友好模式 + "陪一下"文案
- ✓ 零商业：无广告 / 无内购 / 无订阅
- ✓ 本地优先：IndexedDB / 零云端账户 / 家长可导出
- ✓ Partner 模式：Bark 推送（家长可关）+ 完成简报 + 评分备注
- ✓ 吉祥物：蛋仔（多表情）
- ✓ 测试：用户自己孩子使用反馈
- ✓ 隐私：无第三方 SDK / 无 analytics / 无登录账户

### 待评估 / 待改善
- [ ] 是否考虑加"每天三件好事"或情绪日记类内在动机功能（用决策框架评 +7 高分）
- [ ] 现有积分商店是否有"上瘾设计"风险（kid-rewards skill 已 cover）
- [ ] 评分时家长备注的"诚实性 + 温柔度"是否有更好引导
- [ ] 长期跟踪：孩子使用半年后是否对积分疲劳？

## 七、参考文献

- **Self-Determination Theory** — Deci & Ryan, *Self-Determination Theory: Basic Psychological Needs in Motivation, Development, and Wellness*, Guilford 2017
- **Growth Mindset** — Carol Dweck, *Mindset: The New Psychology of Success*, Random House 2006
- **Children's UX** — Debra Gelman, *Design for Kids*, Rosenfeld Media 2014
- **Edutainment failures** — 看 Toca Boca / DragonBox / Sago Mini 的 case studies（见 `references/case-studies.md`）
- **Dark patterns** — Harry Brignull 的 deceptive.design

详见 `references/case-studies.md`（5 个教育向 + 5 个家庭向 app 拆解）和 `references/decision-framework.md`（决策框架更多 worked examples）。

---

**最后一句**：你 ship 的不是 app，是孩子童年的一部分。慎重、温柔、克制。
