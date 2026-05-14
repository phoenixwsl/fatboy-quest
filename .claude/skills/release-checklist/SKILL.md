---
name: release-checklist
description: |
  Use this skill before any commit/push to production, before bumping the app version, and before telling the user "可以发版了". Trigger on phrases like "发版", "release", "commit", "push", "上线", "部署", "deploy", "ship", "bump 版本", "新版本", and after completing any change set the user expects to land on their iPad PWA. This skill enforces a non-negotiable pre-flight checklist: type-check → tests → build → version bump → schema-migration safety → iPad cache notes. It also produces the one-line commit message in the user's preferred style. Apply it as a gate, not a suggestion — if any item fails, stop and tell the user, don't ship.
---

# Release Checklist — 发版前 Pre-flight 清单

You are the release manager for fatboy-quest. Every commit/push must pass this checklist. Do not skip steps because "it's a small change" — small changes have shipped some of this project's worst bugs.

## 工作流

当用户表达任何"完成"、"发版"、"提交"意图时，按下面的顺序执行。**任何一步失败就停下来报告，不要往下走**。

## ✓ 1. TypeScript 编译

```bash
cd /Users/senlin.wsl/fatboy/fatboy-quest && npx tsc --noEmit
```

期望：0 错误，无输出。

如果有错误：列出修改，让用户决定。**不要自动改 .ts** 来掩盖类型问题（这是项目的安全网）。

## ✓ 2. 测试套件

```bash
cd /Users/senlin.wsl/fatboy/fatboy-quest && npx vitest run --reporter=basic
```

期望：~421+ 通过，1 skipped，2 todo。

**如果失败**：
- 看失败是不是因为这次改动影响了原有逻辑 → 修改测试或修改代码（视情况）
- 看是否是闪烁测试 → 重试一次
- 不要跳过失败的测试上线

集成测试单独跑：
```bash
npx vitest run tests/integration --reporter=basic
```

期望 120 通过 / 1 skipped / 2 todo。

## ✓ 3. Production 构建

```bash
cd /Users/senlin.wsl/fatboy/fatboy-quest && npx vite build
```

如果 macOS 本地撞 EPERM 删 dist，临时换输出路径：
```bash
npx vite build --outDir /tmp/fb-dist --emptyOutDir
```

期望：`built in Xs` + PWA precache 文件生成。

## ✓ 4. 版本号 bump

改 `src/version.ts`：
- `APP_VERSION` 按 `RX.Y.Z` 规则递增
  - 重构 / 主功能 → 升 X
  - 新特性 → 升 Y
  - 修复 / 小调整 → 升 Z
- `APP_BUILD_DATE` 改成今天日期 `YYYY-MM-DD`

**忘了 bump 等于没发**：iPad 用户看不到版本号变化就不会刷缓存。

## ✓ 5. DB Schema 兼容性

如果这次改动涉及 `src/db/index.ts` 或 `src/types/index.ts` 中 DB 相关字段：

- [ ] schema version 是否需要升？（看 `db.version(N).stores(...)` 调用）
- [ ] 是否有新字段？老数据是否有合理默认值？
- [ ] 是否删了字段？老数据是否能 graceful 处理？
- [ ] migration 是否在 `initializeDB()` 里实现了？

**示例反模式**：
```ts
// ❌ 加新必填字段没默认值
interface Task { newField: string; }   // 老数据 newField=undefined → crash

// ✓ 加新可选字段
interface Task { newField?: string; }  // 老数据 undefined → safe
```

## ✓ 6. iPad 缓存提示

每次 push 后告诉用户：
> 推到 GitHub Pages 后 iPad 上：
> 1. Safari 长按刷新按钮 → 重新载入忽略缓存
> 2. 如果还是老版本，UpdateBanner 1 分钟内会弹"有新版本"
> 3. 极端情况删 PWA 重装

如果这次改 service worker / PWA manifest，**额外强调要清缓存**。

## ✓ 7. Commit message 一句话

按用户偏好（已确认）：**一句话 commit**。

格式：`RX.Y.Z: 这次改了什么`

例子：
- ✓ `R3.4.1: 242 处硬编码颜色 token 化`
- ✓ `R3.5.0: 加入周末模式`
- ✗ `R3.4.1: 修复了主题切换的对比度问题，包括 ShopPage、CalendarPage...` ← 太长

**不要列 bullet、不要分行、不要写实现细节**。

## ✓ 8. Push 命令

```bash
git add -A && git commit -m "RX.Y.Z: 一句话描述" && git push
```

一行搞定，不要分三步问用户。

## ✓ 9. 重要操作的人工确认

下列操作即使通过 1-8，**也必须再问用户**：
- DB schema 变更（version bump from N to N+1）
- 删除已有功能
- 改 Bark 推送 key
- 改 PWA manifest（影响 icon / scope / start_url）
- 引入新依赖（package.json）

## ✓ 10. 发版后

第一次拉新版用户反馈来之前，告诉用户：

- 这次改了什么（**只列 3-5 个主要点**，不要长列表）
- 如何在 iPad 上验证（具体操作）
- 任何需要观察的边界情况

## 出错时怎么办

如果 push 后用户截图反馈"看不到新版"或"功能异常"：
1. 不要慌，**先让用户告诉你 iPad 上显示的版本号**（设置页底部）
2. 如果版本号还是老的 → 缓存问题，引导清缓存
3. 如果版本号已经是新的 → 真的有 bug，先复现再修

## 反模式（绝对不要做）

- ❌ 跳过 tsc 因为"小改动"
- ❌ 跳过 tests 因为"很赶"
- ❌ 忘了 bump 版本号
- ❌ commit message 写多行
- ❌ DB schema 改了不写 migration
- ❌ 用户截图问题没复现就开始改

## 速查命令

一次性运行全 pipeline：
```bash
cd /Users/senlin.wsl/fatboy/fatboy-quest && \
  npx tsc --noEmit && \
  npx vitest run --reporter=basic && \
  npx vite build && \
  echo "✓ READY TO COMMIT"
```

任何一步出问题，整条 fails，安全。
