// ============================================================
// R4.1.0: 商店强制轮转算法
//
// 触发：每周一 00:00 应用启动检查 + ShopManager 顶部"轮转一下"按钮
//
// 算法：
//   1. 取所有 enabled 商品
//   2. 对当前 displayed 中"shelved 时长 ≥ 0 周 + 已两周未兑换"的，
//      30%-50% 随机改成 shelved
//   3. 从 shelved 池补充进 displayed，目标维持 5-7 件
//   4. 锁定区商品（isLocked=true）不参与轮转，固定显示
//   5. 心愿池中的商品不参与轮转
//   6. 三时间档（instant/mid/long）每档至少 1 件 displayed
// ============================================================

import type { ShopItem } from '../types';

export const TARGET_DISPLAYED_MIN = 5;
export const TARGET_DISPLAYED_MAX = 7;
export const SHELVE_RATIO_MIN = 0.3;
export const SHELVE_RATIO_MAX = 0.5;
/** 商品在 displayed 中至少待 N 天才考虑下架 */
export const MIN_DISPLAY_DAYS = 14;

// ------------------------------------------------------------
// 计划：返回要改 status 的商品列表，由调用方写库
// 这样算法是纯函数（同 schedule GC 一样），便于单测
// ------------------------------------------------------------

export interface RotationPlan {
  toShelve: string[];     // 这些 ShopItem id 要改成 'shelved'
  toDisplay: string[];    // 这些要改成 'displayed'
  rationale: string;      // 给家长看的简短解释（用于"轮转一下"按钮反馈）
}

export interface RotationInput {
  items: ShopItem[];
  now: number;
  /** 当前 wishingPool 锁住的商品 id（不参与轮转） */
  wishedItemId?: string;
  /** 测试用：固定的 shelve 比例（0-1）；不传则在 30%-50% 随机 */
  fixedShelveRatio?: number;
  /** 测试用：固定的随机种子（决定哪些商品被选中下架）；不传用 Math.random */
  rng?: () => number;
}

export function planRotation(input: RotationInput): RotationPlan {
  const { items, now, wishedItemId, fixedShelveRatio } = input;
  const rng = input.rng ?? Math.random;

  // 候选池：enabled + 非 locked + 非 wished
  const eligible = items.filter(s =>
    s.enabled &&
    !s.isLocked &&
    s.id !== wishedItemId,
  );

  const displayed = eligible.filter(s => (s.rotationStatus ?? 'displayed') === 'displayed');
  const shelved   = eligible.filter(s => s.rotationStatus === 'shelved');

  // ---- 第一步：选要下架的 ----
  const old = displayed.filter(s => {
    const last = s.lastDisplayedAt ?? 0;
    return now - last >= MIN_DISPLAY_DAYS * 24 * 3600 * 1000;
  });
  const ratio = fixedShelveRatio ?? (SHELVE_RATIO_MIN + rng() * (SHELVE_RATIO_MAX - SHELVE_RATIO_MIN));
  const toShelveCount = Math.min(old.length, Math.max(0, Math.floor(old.length * ratio)));
  const toShelveCandidates = pickRandom(old, toShelveCount, rng);

  // ---- 第二步：保三时间档分布 — 不能让某档为 0 ----
  // 计算每档剩余 displayed 数（去掉本轮要下架的）
  const shelvedSet = new Set(toShelveCandidates.map(s => s.id));
  const remaining = displayed.filter(s => !shelvedSet.has(s.id));
  const tierCount = (tier: string) => remaining.filter(s => (s.tier ?? 'mid') === tier).length;

  // 撤销那些下架后会让某档变 0 的决定
  const finalToShelve: ShopItem[] = [];
  for (const s of toShelveCandidates) {
    const tier = s.tier ?? 'mid';
    const after = tierCount(tier);
    // 如果这档去掉这件后还 ≥ 1，OK 下架；否则保留
    if (after >= 1) {
      finalToShelve.push(s);
    } else {
      // 这件留下，不下架
    }
  }
  const finalShelvedSet = new Set(finalToShelve.map(s => s.id));
  const remaining2 = displayed.filter(s => !finalShelvedSet.has(s.id));

  // ---- 第三步：从 shelved 池补到 5-7 件 ----
  // 加上本轮新下架的也回到 shelved 池可补
  const shelvedPool = [...shelved, ...finalToShelve];
  // 优先按 lastDisplayedAt 升序（最久没被显示的先回来）
  shelvedPool.sort((a, b) => (a.lastDisplayedAt ?? 0) - (b.lastDisplayedAt ?? 0));

  const need = Math.max(0, TARGET_DISPLAYED_MIN - remaining2.length);
  // 留 buffer 到 MAX：实际补到 MAX 但不超过 shelvedPool 大小
  const want = Math.min(shelvedPool.length, TARGET_DISPLAYED_MAX - remaining2.length);
  // 至少补 need；最多补 want
  const fillCount = Math.max(need, Math.min(want, need + 2));

  const toDisplay: ShopItem[] = [];
  // 优先按"补缺失档" → "随机/老的"
  const tiersAfter: Record<string, number> = {
    instant: remaining2.filter(s => (s.tier ?? 'mid') === 'instant').length,
    mid:     remaining2.filter(s => (s.tier ?? 'mid') === 'mid').length,
    long:    remaining2.filter(s => (s.tier ?? 'mid') === 'long').length,
  };

  // 第一轮：补每档 0 的
  for (const tier of ['instant', 'mid', 'long']) {
    if (tiersAfter[tier] > 0) continue;
    const candidate = shelvedPool.find(s => (s.tier ?? 'mid') === tier && !toDisplay.includes(s));
    if (candidate) { toDisplay.push(candidate); tiersAfter[tier]++; }
  }
  // 第二轮：把数量补到 fillCount
  for (const s of shelvedPool) {
    if (toDisplay.length >= fillCount) break;
    if (toDisplay.includes(s)) continue;
    toDisplay.push(s);
  }

  return {
    toShelve: finalToShelve.map(s => s.id),
    toDisplay: toDisplay.map(s => s.id),
    rationale: buildRationale(finalToShelve.length, toDisplay.length, displayed.length + toDisplay.length - finalToShelve.length),
  };
}

function pickRandom<T>(arr: T[], n: number, rng: () => number): T[] {
  if (n <= 0) return [];
  if (n >= arr.length) return [...arr];
  const copy = [...arr];
  // Fisher-Yates 取前 n
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

function buildRationale(shelved: number, displayed: number, finalCount: number): string {
  if (shelved === 0 && displayed === 0) return '商品都还很新，本周不轮转';
  return `下架 ${shelved} 件，上架 ${displayed} 件，当前展示 ${finalCount} 件`;
}

// ------------------------------------------------------------
// 应用计划到数据库（调用方在 transaction 里使用）
// ------------------------------------------------------------

export interface ApplyRotationDeps {
  shopUpdate: (id: string, patch: Partial<ShopItem>) => Promise<void>;
}

export async function applyRotation(plan: RotationPlan, now: number, deps: ApplyRotationDeps): Promise<void> {
  for (const id of plan.toShelve) {
    await deps.shopUpdate(id, { rotationStatus: 'shelved' });
  }
  for (const id of plan.toDisplay) {
    await deps.shopUpdate(id, { rotationStatus: 'displayed', lastDisplayedAt: now });
  }
}

// ------------------------------------------------------------
// 时机判定：本周一是否已经轮转过？
// ------------------------------------------------------------
export function shouldAutoRotate(lastRotationAt: number | undefined, now: Date): boolean {
  if (!lastRotationAt) return true;
  // 找出"本周一 00:00"
  const day = now.getDay() || 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (day - 1));
  monday.setHours(0, 0, 0, 0);
  return lastRotationAt < monday.getTime();
}
