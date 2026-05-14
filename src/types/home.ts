// ============================================================
// 肥仔的书房 · 类型定义
// 来源: docs/home-feature-delivery/01-design-spec.md §7 + 02-code-scaffold.ts
// M1 阶段只定义骨架，M2-M4 逐步使用
// ============================================================

export type TrophyRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type TrophyCategory = 'rank' | 'challenge' | 'hidden';
export type ItemCategory = 'lego' | 'toy' | 'desk_item' | 'plant';
export type DeskItemSlot =
  | 'lamp' | 'pen_cup' | 'notebook' | 'globe' | 'frame' | 'corner';
export type PlantSlot = 'left' | 'right';

export interface Trophy {
  id: string;
  name: string;
  story: string;
  rarity: TrophyRarity;
  category: TrophyCategory;
  hiddenUntilUnlock: boolean;
  triggerDescription: string;
}

export interface HomeShopItem {
  id: string;
  category: ItemCategory;
  name: string;
  nameEn?: string;
  code?: string;
  pricePoints: number;
  priceRealRmb?: number;
  pieces?: number;
  ageRange?: string;
  imageUrl: string;
  description: string;
  parentNote?: string;
  tags: string[];
  defaultOwned?: boolean;
  slotType?: DeskItemSlot | PlantSlot;
}

export interface UserHomeCollection {
  userId: string;

  trophies: Array<{
    id: string;
    unlockedAt: string;
  }>;

  legosOwned: Array<{
    id: string;
    purchasedAt: string;
    pointsPaid: number;
  }>;

  toysOwned: Array<{
    id: string;
    purchasedAt: string;
    pointsPaid: number;
  }>;

  deskItemsOwned: string[];
  deskItemsActive: Array<{
    slot: DeskItemSlot;
    itemId: string;
  }>;

  plantsOwned: Array<{
    id: string;
    purchasedAt: string;
  }>;
  plantsActive: Array<{
    slot: PlantSlot;
    plantId: string;
  }>;
}
