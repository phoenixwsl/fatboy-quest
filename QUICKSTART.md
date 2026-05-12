# 快速部署指南（10 分钟搞定）

## 第一步：本地准备（5 分钟）

1. 在电脑上装 [Node.js 20 LTS](https://nodejs.org/)（一路 Next）
2. 把整个 `fatboy-quest` 文件夹放到任意位置
3. 打开终端，cd 进去：
   ```bash
   cd path/to/fatboy-quest
   npm install
   npm test          # 跑测试，确认 69 个全绿
   npm run build     # 构建一下，确认能编译通过
   ```

## 第二步：推到 GitHub（3 分钟）

1. 登录 GitHub → New repository → 名字 `fatboy-quest` → Create
   - **注意**：如果用别的名字，要改 `vite.config.ts` 里的 `base: '/fatboy-quest/'` 和 manifest 里的路径
2. 在终端里：
   ```bash
   git init
   git add .
   git commit -m "Round 1 MVP"
   git branch -M main
   git remote add origin https://github.com/phoenixwsl/fatboy-quest.git
   git push -u origin main
   ```

## 第三步：启用 GitHub Pages（2 分钟）

1. 仓库页面 → **Settings** → **Pages**（左侧菜单）
2. **Source** 选 `GitHub Actions`
3. 回到 **Actions** 标签，看到 "Build, Test, Deploy" 在跑
4. 等绿勾出现（约 1-2 分钟），打开 `https://phoenixwsl.github.io/fatboy-quest/`

## 第四步：iPad 上"安装"（1 分钟）

1. iPad 用 **Safari**（不是 Chrome）打开上面那个网址
2. 底部分享按钮 → "添加到主屏幕"
3. 桌面有图标了，点开走完初始引导（孩子昵称、蛋仔、PIN、密保）

## 第五步：配 Bark（家长 iPhone）

1. iPhone App Store 搜 "Bark"（蓝色波浪），免费下载打开
2. 看到一个 URL，最后那串字符就是你的 Key
3. 在 iPad 上长按右上角齿轮 3 秒进家长模式
4. 通知接收人 → 添加 → 标签写"爸爸"，粘 Key
5. 点测试，iPhone 收到通知就成了
6. 妈妈那边重复一次

## 第六步：开始用

1. 家长模式 → 任务管理 → 添加今天 / 明天的 5 项作业
2. 退出家长模式，孩子打开就能看到任务池
3. 孩子点"去规划今天" → 拖任务进时间轴 → 锁定 → 开始闯关
4. 完成一项 → 你 iPhone 收到推送
5. 进家长模式 → 待评分 → 给三维评分

---

## 后续我给新版本时怎么更新？

```bash
# 把我给的新文件夹覆盖旧的（或者只复制变化的文件）
git add .
git commit -m "Round 2"
git push
```

推送后 GitHub Actions 自动构建 + 测试 + 部署。  
**孩子 iPad 上的图标不用动**，PWA 会自动检测新版本，下次打开就是新的。  
**数据不会丢**（在 IndexedDB 里）。

---

## 一定要做的事：每周备份

iPadOS 极少数情况会清理 PWA 数据。每周日提醒自己一次：

1. iPad 进家长模式 → 数据 → 下载备份文件
2. 在 iPad「文件」App 里把它存到 **iCloud Drive** 任意位置

万一哪天数据真的没了，重新装一次 App，回到这里"从备份恢复"即可。
