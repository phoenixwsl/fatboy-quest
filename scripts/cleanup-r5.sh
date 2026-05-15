#!/usr/bin/env bash
# ============================================================
# R5.x 清理脚本：删 tsc/vite/vitest 编译垃圾 + 死代码文件
# 在本机仓库根目录运行：bash scripts/cleanup-r5.sh
# 沙箱 FUSE 不允许 unlink，所以由用户在本机跑
# ============================================================
set -e
cd "$(dirname "$0")/.."

echo "=== R5 cleanup ==="

# 1) 232 个 vite/vitest config timestamp 残留
COUNT=$(ls vite.config.*.timestamp-*.mjs 2>/dev/null | wc -l | tr -d ' ')
COUNT2=$(ls vitest.config.*.timestamp-*.mjs 2>/dev/null | wc -l | tr -d ' ')
echo "▶ 删除 $COUNT 个 vite timestamp + $COUNT2 个 vitest timestamp..."
rm -f vite.config.*.timestamp-*.mjs vitest.config.*.timestamp-*.mjs

# 2) tsc 误编译到根的 .d.ts/.js 编译产物（tsconfig.node.json 已经修了根因）
echo "▶ 删除 vite.config.{d.ts,js} / vitest.config.{d.ts,js} 编译产物..."
rm -f vite.config.d.ts vite.config.js vitest.config.d.ts vitest.config.js

# 3) R5 死代码 stub（许愿池机制已删，留着是空 export）
echo "▶ 删除 R5 死代码 stub 文件..."
rm -f src/lib/wishingPool.ts
rm -f src/components/WishingPoolBar.tsx
rm -f tests/wishingPool.test.ts

# 4) git rm 跟踪的版本（避免下次 commit 又把空 stub 加回来）
echo "▶ git rm 已跟踪的死文件..."
git rm -f --cached --ignore-unmatch \
  vite.config.*.timestamp-*.mjs \
  vitest.config.*.timestamp-*.mjs \
  vite.config.d.ts vite.config.js \
  vitest.config.d.ts vitest.config.js \
  src/lib/wishingPool.ts \
  src/components/WishingPoolBar.tsx \
  tests/wishingPool.test.ts 2>/dev/null || true

# 5) 验证
echo ""
echo "=== 完成。建议跑一次 verify 确认没破坏："
echo "    npm run verify"
echo ""
echo "然后 commit:"
echo "    git add -A && git commit -m 'chore: 清理 R5 死代码 + tsc/vite 残留 (232 个 timestamp + stub 文件)'"
