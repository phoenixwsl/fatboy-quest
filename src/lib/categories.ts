// ============================================================
// R4.0.0 / R5.0.0: 商店分类常量（hardcoded）
//
// R5.0.0 简化：从 4 类裁到 2 类（玩具堆 / 补给站）。
// 'plant' 和 'decor' 在 v8 migration 里映射到 'toy'。
// ============================================================

export type ShopCategory = 'toy' | 'food';

export interface CategorySpec {
  label: string;
  emoji: string;
  chips: readonly string[];
}

export const SHOP_CATEGORIES: Record<ShopCategory, CategorySpec> = {
  toy:  { label: '玩具堆', emoji: '🧸', chips: ['乐高', '拼搭', '毛绒', '解压', '益智桌游', '收藏品'] },
  food: { label: '补给站', emoji: '🍦', chips: ['零食', '饮品', '聚餐', '特权'] },
};

export const ALL_CATEGORIES: readonly ShopCategory[] = ['toy', 'food'];

/** 默认 tab（孩子打开商店看到的） */
export const DEFAULT_CATEGORY: ShopCategory = 'toy';

export function categoryLabel(c: ShopCategory): string {
  return `${SHOP_CATEGORIES[c].emoji} ${SHOP_CATEGORIES[c].label}`;
}
