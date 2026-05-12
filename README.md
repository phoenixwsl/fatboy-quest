# 肥仔大闯关 🚀

太空主题作业管理 PWA，专为三年级小男孩设计。  
家长添加作业 → 孩子拖拽规划 → 闯关执行 → 家长评分 → 积分奖励 → Bark 推送给家长。

**Round 1.2** — 在 MVP 基础上加固了执行体验、家长可见度、防 regression。R2 / R3 后续增加打怪兽视觉、蛋仔的家、贡献日历、周事件、分享卡片等。

---

## 功能清单（Round 1.2）

### 孩子端
- 太空主题首页 + 蛋仔展示 + 段位 + 连击
- **孩子自助加任务**（不进家长模式，从模板选 + 标题/科目/时长）
- 拖拽时间轴规划，**休息块 5-120 分钟可选 + 自定义**
- **「照搬上次」**一键复用上轮安排
- **闯关页 "我要开始" 按钮**：每项任务从实际开始时间计时
- **暂停**（每项 1 次最多 3 分钟）/ **延时**（剩 < 3 分钟才能点，免费 → 阶梯付费）
- **3 分钟硬提醒**：屏幕中央大字闪烁
- **求助按钮**：一键发 Bark 给所有家长
- **完成撤回**（未评分前）+ 撤回打断连击
- **得分明细面板**：每项任务的评分维度、积分细节、家长留言
- **休息倒计时**：最后 1 分钟滴答声 + 结束钟声
- **一轮通关战报**：金币雨动画 + 数据展示
- **音效**：开始/击杀/解锁/连击/撤回 全合成无文件依赖

### 家长端
- 长按 3 秒 + PIN 进入，密保问题重置
- 任务管理 + **模板列表**（按使用频次排序，可隐藏）
- **评分时可改基础积分**（孩子加的任务在此填）
- **评分弹窗显示执行记录**：实际用时 / 超时 / 暂停次数 / 延时次数 / 撤回次数
- **提前完成奖励**（质量 ≥ 4 星才有，封顶 10 分）
- **Combo 连击加分**（一轮全评分后自动结算）
- **4 张数据图表**：14 天积分 / 评分雷达 / 科目分布 / 实际 vs 预估
- Bark 多人推送，每人独立订阅 6 类通知（含求助）
- **通知详化**：实际开始时间-结束时间，提前/超时多少分钟
- 商店管理（预置 DQ / 蜜雪 / 守护卡 + 自由扩展）
- 数据导出 / 导入，schemaVersion 自动兼容

### 测试覆盖（136 个，防 regression 核心）
- `points.test.ts` — 积分公式 / 段位 / 守护卡价格
- `streak.test.ts` — 连击 / 守护卡 / 里程碑 / 周礼物
- `combo.test.ts` — combo 计算 / 撤回打断 / 休息不打断 / 加分公式
- `extension.test.ts` — 延时阶梯成本 / 按钮可见时机
- `earlyBonus.test.ts` — 提前完成奖励 / 质量门槛 / 暂停扣除
- `charts.test.ts` — 4 张图表的聚合逻辑
- `templates.test.ts` — 模板提取 / 隐藏过滤 / 撤回/删除规则
- `bark.test.ts` — Bark URL / 多人推送 / 订阅过滤 / 详细消息
- `time.test.ts` — 日期边界 / ISO 周
- `notifications.test.ts` — 本地提醒构造
- `sounds.test.ts` — 音效开关

---

## 部署到 GitHub Pages

### 一次性设置

1. **创建 GitHub 仓库**：登录 GitHub，新建一个仓库，建议命名 `fatboy-quest`（如果用别的名字，需要改 `vite.config.ts` 里的 `base` 字段）

2. **本地需要 Node 18+**（推荐用 [Node 20 LTS](https://nodejs.org/)）

3. **下载这个文件夹到本地**，在文件夹里打开终端，执行：

   ```bash
   npm install
   git init
   git remote add origin https://github.com/phoenixwsl/fatboy-quest.git
   git branch -M main
   git add .
   git commit -m "Round 1 MVP"
   git push -u origin main
   ```

4. **启用 GitHub Pages**：到 GitHub 仓库 → Settings → Pages
   - **Source** 选择 `GitHub Actions`，然后用下面的 workflow

5. **新建 `.github/workflows/deploy.yml`**（已在仓库根目录提供，见下方一节）

6. **推送后等 2 分钟**，访问 `https://phoenixwsl.github.io/fatboy-quest/`

### iPad 上"安装"

1. iPad 用 **Safari** 打开 `https://phoenixwsl.github.io/fatboy-quest/`
2. 点底部分享按钮（方框带向上箭头）→ **"添加到主屏幕"**
3. 桌面上会出现「肥仔闯关」图标，点开就是独立 App
4. **首次进入**：通过引导设置孩子昵称、蛋仔名字、家长 PIN、密保问题
5. 进入家长模式 → 通知接收人 → 添加爸爸 / 妈妈 Bark Key
6. 设置 → 请求通知权限（首次需要 iPad 允许）

### 升级 / 更新

```bash
git pull   # 同步我后续给的代码
git push   # 触发自动重新部署
```

PWA 会自动检测新版本并更新（service worker），不需要孩子重新安装。  
**数据不会丢**，所有持久化数据都在 IndexedDB，更新只换代码不动数据。

---

## GitHub Actions 部署 workflow

新建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

每次 push 到 main 会：跑测试 → 构建 → 部署。测试失败会阻止部署，防止 regression。

---

## 本地开发

```bash
npm install        # 安装依赖（自动通过 prepare 脚本安装 pre-commit 钩子）
npm run dev        # 本地开发服务器（http://localhost:5173）
npm test           # 跑所有单元测试
npm run test:watch # 监听模式
npm run typecheck  # 仅类型检查
npm run build      # 构建生产包到 dist/
npm run preview    # 预览构建产物
npm run verify     # 一次跑 typecheck + 测试 + 构建（pre-commit 同款）
```

### Pre-commit 钩子（防破窗）

每次 `git commit` 自动跑 TypeScript 类型检查 + Vitest + Vite 构建，**任一失败拒绝提交**。

- 首次 clone 后运行 `npm install`（会自动设置 `core.hooksPath=.githooks`）
- 也可手动设置：`npm run setup-hooks`
- 仅 docs 改动会自动跳过（README、md 文件不触发完整验证）
- 紧急绕过：`git commit --no-verify`（不推荐，CI 仍会拦下）

---

## Bark 配置教程

1. iPhone 上 App Store 搜「**Bark**」(蓝色波浪图标，作者 Day)，免费下载
2. 打开后会有一个 URL，形如 `https://api.day.app/AbCdEf123XyZ`
3. 最后那串 `AbCdEf123XyZ` 就是你的 **Bark Key**
4. 在「肥仔大闯关」家长模式 → 通知接收人 → 添加：
   - 标签：爸爸
   - Bark Key：粘贴 `AbCdEf123XyZ`
   - 服务器地址保持默认 `https://api.day.app`
5. 点测试按钮，iPhone 收到推送就成功了
6. 多个家长重复以上步骤，每人独立订阅

---

## 项目结构

```
fatboy-quest/
├── src/
│   ├── types/          # 数据模型类型 + schemaVersion
│   ├── db/             # Dexie 数据库 + 迁移策略
│   ├── lib/            # 纯函数核心逻辑（被测试覆盖）
│   │   ├── points.ts       # 积分公式
│   │   ├── streak.ts       # 连击 / 守护卡 / 里程碑
│   │   ├── bark.ts         # Bark 推送
│   │   ├── notifications.ts # 本地通知调度
│   │   └── time.ts         # 时间工具
│   ├── store/          # Zustand 全局状态
│   ├── components/     # 通用组件（PetAvatar / SpaceBackground / StarRating ...）
│   ├── pages/          # 路由页面
│   │   └── parent/     # 家长端页面
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tests/              # Vitest 单元测试
├── public/             # 静态资源（图标、manifest）
└── ...
```

---

## 防 regression 测试策略

**单元测试覆盖**（69 个测试）：
- `points.test.ts` — 积分公式 / 段位 / 守护卡价格（19 个）
- `streak.test.ts` — 连击逻辑 / 守护卡 / 里程碑 / 周礼物（14 个）
- `bark.test.ts` — URL 构造 / 多人推送 / 订阅过滤 / 错误处理（14 个）
- `time.test.ts` — 日期边界 / ISO 周 / 时长格式化（17 个）
- `notifications.test.ts` — 本地提醒构造与过滤（5 个）

**升级原则**：
- 每次改 `lib/` 下的核心逻辑前先看测试
- 改公式时测试会失败 → 强制人为 review 是否符合预期
- 改完写新测试覆盖新行为
- CI 跑测试通过才能部署

---

## Round 2 / Round 3 预告

将在后续迭代加入：
- **打怪兽视觉**：每项作业是一只小怪兽，完成时有击杀动画
- **蛋仔的家**：可装扮的房间，所有解锁物可摆放
- **显式 + 隐藏成就**：~50 个徽章，隐藏的需要探索
- **作业贡献日历**：月/学期视图，可导出长图
- **每周特殊事件**：双倍周 / 宝藏周 / 守护周 / 极速周 / Boss 周
- **历史自己 PK**：和上周同日的自己对比
- **临时称号系统**：周日重置
- **周末 Boss 战**：周日集合本周残血怪
- **每日打卡分享卡片** + **本周战报**（生成竖版海报）

---

## 故障排查

**Q: iPad 上没收到本地通知？**  
A: 必须先「添加到主屏幕」后打开，并允许通知权限。Safari 直接打开的页面不行。

**Q: Bark 测试没收到？**  
A: 检查 Bark Key 是否复制对了（区分大小写）；检查 iPhone Bark App 是否开了通知权限。

**Q: 数据会丢吗？**  
A: 极少数情况 iPadOS 在存储紧张时可能清理 PWA 数据。建议每周日通过家长模式 → 数据 → 导出备份到 iCloud Drive。

**Q: 升级会丢数据吗？**  
A: 不会。所有数据通过 `schemaVersion` 自动迁移，老数据兼容。

---

Made with ❤️ for 肥仔
