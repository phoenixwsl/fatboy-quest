// ============================================================
// R4.0.0: 商店分类常量（hardcoded，不让用户自定义）
//
// 4 分类 + 每类下的 chip 二级筛选。chip 数量控制在 ≤5 件。
// 名字按 kid-rewards skill templates.md 的"游戏化命名"风格。
// ============================================================

export type ShopCategory = 'plant' | 'decor' | 'toy' | 'food';

export interface CategorySpec {
  label: string;
  emoji: string;
  chips: readonly string[];
}

export const SHOP_CATEGORIES: Record<ShopCategory, CategorySpec> = {
  plant: { label: '小花园', emoji: '🌱', chips: ['多肉', '小盆栽', '食虫植物', '培育套装', '微景观'] },
  decor: { label: '桌面角', emoji: '🪴', chips: ['摆件', '灯具', '奖杯', '限定'] },
  toy:   { label: '玩具堆', emoji: '🧸', chips: ['乐高', '拼搭', '毛绒', '解压', '益智桌游'] },
  food:  { label: '补给站', emoji: '🍦', chips: ['零食', '饮品', '聚餐', '特权'] },
};

export const ALL_CATEGORIES: readonly ShopCategory[] = ['plant', 'decor', 'toy', 'food'];

export function categoryLabel(c: ShopCategory): string {
  return `${SHOP_CATEGORIES[c].emoji} ${SHOP_CATEGORIES[c].label}`;
}
