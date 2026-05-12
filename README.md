# 肥仔大闯关 🚀

太空主题作业管理 PWA，专为三年级小男孩设计。  
家长添加作业 → 孩子拖拽规划 → 闯关执行 → 家长评分 → 积分奖励 → Bark 推送给家长。

**Round 1 MVP** — 已完成核心可用功能，可立即部署给孩子使用。R2 / R3 后续增加打怪兽视觉、蛋仔的家、贡献日历、周事件、分享卡片等。

---

## 功能清单（Round 1）

- **孩子端**：今日小怪、拖拽时间轴规划、闯关执行、奖励商店、蛋仔展示、段位与连击
- **家长端**：长按 + PIN 进入、添加日期标签作业、三维评分、商店管理、Bark 多人推送配置、数据导出/导入、PIN/密保管理
- **积分系统**：完成度 × 质量 / 10 × 态度倍率(0.8~1.2)，每周里程碑 + 守护卡机制
- **本地通知**：开始前 5 分钟、开始、过半、还剩 5 分钟、结束
- **Bark 多人推送**：每人独立订阅（每项 / 一轮 / 里程碑 / 待评分 / 周报）
- **数据安全**：IndexedDB + JSON 备份导出，所有数据带 schemaVersion 兼容升级
- **测试覆盖**：69 个单元测试覆盖积分、连击、Bark、时间、通知

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
npm install        # 安装依赖
npm run dev        # 本地开发服务器（http://localhost:5173）
npm test           # 跑所有单元测试
npm run test:watch # 监听模式
npm run typecheck  # 仅类型检查
npm run build      # 构建生产包到 dist/
npm run preview    # 预览构建产物
```

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
