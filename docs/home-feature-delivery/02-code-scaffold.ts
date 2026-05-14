/**
 * 肥仔的书房 · 代码骨架包
 *
 * 这个文件包含 Claude Code 可以直接使用的核心代码：
 * 1. CSS Design Tokens (放到 study-room-tokens.css)
 * 2. TypeScript Types (放到 src/types/home.ts)
 * 3. 关键 React 组件骨架 (放到 src/components/home/)
 * 4. 解锁逻辑骨架 (放到 src/lib/home/)
 * 5. 数据 Mock (开发期用)
 */

/* ============================================================
 * 1. CSS DESIGN TOKENS
 * 文件路径: src/styles/study-room-tokens.css
 * 用途: 全局注入肥仔之家的设计变量
 * ============================================================ */

/*
:root {
  // Wall (60%)
  --study-wall-top:        #FAF6EF;
  --study-wall-bot:        #F4EEE2;

  // Floor (wooden)
  --study-floor-light:     #D7B991;
  --study-floor-mid:       #BE9B73;
  --study-floor-dark:      #9B7850;
  --study-floor-grain:     #AA875F;
  --study-floor-deep:      #826441;
  --study-floor-line:      #B49164;

  // Wood (30%)
  --study-wood-dark:       #583C24;
  --study-wood-mid:        #8C6441;
  --study-wood-light:      #BE9669;
  --study-wood-highlight:  #E1BE91;
  --study-pic-rail:        #BEA582;
  --study-ceiling-trim:    #DCC8A5;

  // Cabinet · Classic (left, trophy)
  --cab-classic-frame:     #734B2D;
  --cab-classic-dark:      #4B301C;
  --cab-classic-inner:     #3A2619;

  // Cabinet · Modern (center, lego)
  --cab-modern-frame:      #D7D7DC;
  --cab-modern-frame-dk:   #AFAFB9;
  --cab-modern-inner:      #262830;
  --cab-modern-inner-lt:   #343741;
  --cab-modern-led:        #FFF0C8;

  // Cabinet · Playful (right, toy)
  --cab-playful-frame:     #DCB496;
  --cab-playful-frame-dk:  #AF8764;
  --cab-playful-inner:     #5A3C50;

  // Desk (V4: deep walnut)
  --study-desk-top:        #8B5A2B;
  --study-desk-top-light:  #A07050;
  --study-desk-edge:       #3E2614;
  --study-desk-front:      #5C3920;
  --study-desk-grain:      #A07050;

  // Chair
  --study-chair-leather:   #3E2A1C;
  --study-chair-highlight: #695032;
  --study-chair-stitch:    #5A3C23;
  --study-chair-emblem:    #F0C350;

  // Accent (10%)
  --acc-gold:              #F0C350;
  --acc-gold-light:        #FFE182;
  --acc-gold-dark:         #AF8228;
  --acc-silver:            #D2D7E1;
  --acc-silver-light:      #F0F2F8;
  --acc-silver-dark:       #8C919B;
  --acc-bronze:            #C88246;
  --acc-bronze-light:      #E1A569;
  --acc-bronze-dark:       #8C5523;
  --acc-locked:            #4E463E;
  --acc-fatboy:            #F4C752;

  // Lighting
  --study-warm-glow:       rgba(255, 215, 155, 0.4);
  --study-window-beam:     rgba(255, 235, 175, 0.3);
  --study-spot-warm:       rgba(255, 220, 150, 0.5);
  --study-lamp-glow:       rgba(255, 220, 130, 0.55);

  // Shadows
  --shadow-cabinet:        0 12px 24px rgba(40, 25, 12, 0.25);
  --shadow-cabinet-floor:  0 8px 16px rgba(0, 0, 0, 0.3);
  --shadow-desk:           0 -2px 8px rgba(0, 0, 0, 0.2);
  --shadow-chair:          0 6px 12px rgba(0, 0, 0, 0.3);

  // Text
  --study-ink:             #34281C;
  --study-ink-muted:       #87735A;
  --study-paper:           #FFFCF5;

  // Geometry
  --study-radius-sm:       4px;
  --study-radius-md:       12px;
  --study-radius-lg:       24px;
  --study-radius-xl:       36px;

  // Easing
  --ease-spring:           cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-soft:             cubic-bezier(0.25, 0.46, 0.45, 0.94);
  --ease-out-quart:        cubic-bezier(0.165, 0.84, 0.44, 1);

  // Font
  --study-font-num:        'Fredoka', sans-serif;
}

// Plant sway animation
@keyframes study-plant-sway {
  0%, 100% { transform: rotate(-1deg); }
  50%      { transform: rotate(1.5deg); }
}

// Glass reflection
@keyframes study-glass-shimmer {
  0%, 100% { opacity: 0.25; }
  50%      { opacity: 0.4; }
}

// Number with tabular nums
.study-num {
  font-family: var(--study-font-num);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
*/


/* ============================================================
 * 2. TYPESCRIPT TYPES
 * 文件路径: src/types/home.ts
 * ============================================================ */

export type TrophyRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type TrophyCategory = 'rank' | 'challenge' | 'hidden';
export type ItemCategory = 'lego' | 'toy' | 'desk_item' | 'plant';
export type DeskItemSlot = 'lamp' | 'pen_cup' | 'notebook' | 'globe' | 'frame' | 'corner';
export type PlantSlot = 'left' | 'right';

export interface Trophy {
  id: string;
  name: string;
  story: string;
  rarity: TrophyRarity;
  category: TrophyCategory;
  hiddenUntilUnlock: boolean;
  triggerDescription: string;
  checkUnlock: (context: TrophyCheckContext) => boolean;
}

export interface TrophyCheckContext {
  user: {
    totalPoints: number;
    streakDays: number;
    completedTasks: number;
    completedByCategory: Record<string, number>;
    // ... etc
  };
  event?: {
    type: 'task_completed' | 'evaluated' | 'daily_done';
    timestamp: Date;
    [key: string]: any;
  };
}

export interface ShopItem {
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

export interface Painting {
  position: 'left' | 'center' | 'right';
  type: 'svg' | 'image';
  src: string;
}


/* ============================================================
 * 3. KEY REACT COMPONENT SKELETONS
 * 路径: src/components/home/
 * ============================================================ */

/**
 * StudyRoom.tsx — 主页面
 * 路径: src/components/home/StudyRoom.tsx
 */
/*
import { useEffect } from 'react';
import { useHomeCollection } from '@/hooks/useHomeCollection';
import { useUser } from '@/hooks/useUser';
import './StudyRoom.css';
import {
  TopNav, BottomBar, Wall, Floor,
  PaintingLeft, PaintingCenter, PaintingRight,
  TrophyCabinet, LegoCabinet, ToyCabinet,
  PlantSlotLeft, PlantSlotRight,
  ChairBack, Fatboy, Desk, DeskItems,
  LightingLayer,
} from './';

export function StudyRoom() {
  const { user } = useUser();
  const { collection } = useHomeCollection();

  // Enter animation
  useEffect(() => {
    document.body.classList.add('study-room-entering');
    setTimeout(() => {
      document.body.classList.remove('study-room-entering');
    }, 1000);
  }, []);

  return (
    <div className="study-room">
      <Wall />
      <Floor />
      <LightingLayer />

      <TopNav title="肥仔的书房" />

      <PaintingLeft />
      <PaintingCenter />
      <PaintingRight />

      <TrophyCabinet collection={collection} />
      <LegoCabinet collection={collection} />
      <ToyCabinet collection={collection} />

      <PlantSlotLeft collection={collection} />
      <PlantSlotRight collection={collection} />

      <ChairBack character={user.selectedCharacter} />
      <Fatboy character={user.selectedCharacter} state="default" />

      <Desk />
      <DeskItems collection={collection} />

      <BottomBar points={user.points} />
    </div>
  );
}
*/

/**
 * Cabinet base props
 */
export interface CabinetProps {
  collection: UserHomeCollection;
  onItemClick: (itemId: string) => void;
  onShowAll: () => void;
}

/**
 * TrophyCabinet.tsx 骨架
 * 路径: src/components/home/cabinets/TrophyCabinet.tsx
 */
/*
import { TROPHY_CATALOG } from '@/lib/home/catalog';
import { useState } from 'react';
import { TrophyAllModal } from './TrophyAllModal';
import { TrophyDetailModal } from './TrophyDetailModal';

export function TrophyCabinet({ collection }: CabinetProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedTrophy, setSelectedTrophy] = useState<string | null>(null);

  // Top 9 trophies for showcase (rarest first)
  const showcase = collection.trophies
    .slice()
    .sort(byRarityDesc)
    .slice(0, 9);

  return (
    <>
      <div
        className="cabinet cabinet-classic cabinet-trophy"
        onClick={() => setShowAll(true)}
      >
        <div className="cabinet-pediment">
          <div className="pediment-medallion">★</div>
        </div>
        <div className="cabinet-body">
          <div className="cabinet-interior">
            <div className="cabinet-spotlight" />
            <div className="trophy-grid">
              {[...Array(9)].map((_, i) => (
                <TrophySlot
                  key={i}
                  trophy={showcase[i] || null}
                  onClick={(t) => { setSelectedTrophy(t.id); }}
                />
              ))}
            </div>
            <div className="cabinet-glass" />
          </div>
          <div className="cabinet-plate">
            收藏 {collection.trophies.length} 件
          </div>
        </div>
        <div className="cabinet-base" />
        <div className="cabinet-floor-shadow" />
      </div>

      {showAll && (
        <TrophyAllModal
          collection={collection}
          onClose={() => setShowAll(false)}
          onSelect={(id) => setSelectedTrophy(id)}
        />
      )}

      {selectedTrophy && (
        <TrophyDetailModal
          trophyId={selectedTrophy}
          collection={collection}
          onClose={() => setSelectedTrophy(null)}
        />
      )}
    </>
  );
}
*/

/**
 * Plant slot
 * 路径: src/components/home/PlantSlot.tsx
 */
/*
import { PLANT_CATALOG } from '@/lib/home/catalog';

export function PlantSlot({ slot, collection }: {
  slot: 'left' | 'right',
  collection: UserHomeCollection
}) {
  const active = collection.plantsActive.find(p => p.slot === slot);
  const plant = active ? PLANT_CATALOG.find(p => p.id === active.plantId) : null;

  if (!plant) return null;

  return (
    <div className={`plant-slot plant-slot-${slot}`}>
      <img
        src={plant.imageUrl}
        alt={plant.name}
        className="plant-leaves" // animation applied here
      />
    </div>
  );
}
*/


/* ============================================================
 * 4. UNLOCK / PURCHASE LOGIC
 * 路径: src/lib/home/
 * ============================================================ */

import {
  Trophy, TrophyCheckContext, ShopItem, UserHomeCollection, ItemCategory
} from './types';

/**
 * Check all trophies and unlock new ones
 * 路径: src/lib/home/trophy-checker.ts
 */
export function checkAndUnlockTrophies(
  catalog: Trophy[],
  collection: UserHomeCollection,
  context: TrophyCheckContext
): Trophy[] {
  const newlyUnlocked: Trophy[] = [];

  for (const trophy of catalog) {
    // Skip if already unlocked
    if (collection.trophies.find(t => t.id === trophy.id)) continue;

    // Check unlock condition
    try {
      if (trophy.checkUnlock(context)) {
        collection.trophies.push({
          id: trophy.id,
          unlockedAt: new Date().toISOString(),
        });
        newlyUnlocked.push(trophy);
      }
    } catch (e) {
      console.error(`Failed to check trophy ${trophy.id}:`, e);
    }
  }

  return newlyUnlocked;
}


/**
 * Purchase shop item
 * 路径: src/lib/home/shop.ts
 */
export interface PurchaseResult {
  success: boolean;
  error?: 'insufficient_points' | 'already_owned' | 'unknown';
  message?: string;
}

export async function purchaseItem(
  userPoints: number,
  collection: UserHomeCollection,
  item: ShopItem
): Promise<{ result: PurchaseResult; newPoints: number; newCollection: UserHomeCollection }> {
  // 1. Check points
  if (userPoints < item.pricePoints) {
    return {
      result: { success: false, error: 'insufficient_points', message: '积分不够' },
      newPoints: userPoints,
      newCollection: collection,
    };
  }

  // 2. Already owned?
  const ownedList = getOwnedList(collection, item.category);
  if (ownedList.find(o => o === item.id)) {
    return {
      result: { success: false, error: 'already_owned', message: '已收藏' },
      newPoints: userPoints,
      newCollection: collection,
    };
  }

  // 3. Add to collection
  const newCollection = addToCollection(collection, item);
  const newPoints = userPoints - item.pricePoints;

  return {
    result: { success: true },
    newPoints,
    newCollection,
  };
}

function getOwnedList(c: UserHomeCollection, cat: ItemCategory): string[] {
  switch (cat) {
    case 'lego':       return c.legosOwned.map(x => x.id);
    case 'toy':        return c.toysOwned.map(x => x.id);
    case 'desk_item':  return c.deskItemsOwned;
    case 'plant':      return c.plantsOwned.map(x => x.id);
  }
}

function addToCollection(
  c: UserHomeCollection,
  item: ShopItem
): UserHomeCollection {
  const now = new Date().toISOString();
  const newC = { ...c };

  switch (item.category) {
    case 'lego':
      newC.legosOwned = [...c.legosOwned, {
        id: item.id, purchasedAt: now, pointsPaid: item.pricePoints
      }];
      break;
    case 'toy':
      newC.toysOwned = [...c.toysOwned, {
        id: item.id, purchasedAt: now, pointsPaid: item.pricePoints
      }];
      break;
    case 'desk_item':
      newC.deskItemsOwned = [...c.deskItemsOwned, item.id];
      break;
    case 'plant':
      newC.plantsOwned = [...c.plantsOwned, {
        id: item.id, purchasedAt: now
      }];
      break;
  }
  return newC;
}


/* ============================================================
 * 5. SAMPLE CATALOG DATA
 * 路径: src/lib/home/catalog.ts
 * ============================================================ */

/**
 * Trophy catalog (35 trophies) — sample shape
 */
export const TROPHY_CATALOG_SAMPLE: Partial<Trophy>[] = [
  // Rank trophies (7)
  {
    id: 'rookie',
    name: '新兵',
    story: '一切的起点',
    rarity: 'common',
    category: 'rank',
    hiddenUntilUnlock: false,
    triggerDescription: '默认拥有',
  },
  {
    id: 'bronze',
    name: '青铜',
    story: '你已经不是新兵了',
    rarity: 'common',
    category: 'rank',
    hiddenUntilUnlock: false,
    triggerDescription: '累计 100 ⭐',
  },
  // ... silver / gold / platinum / diamond / legend

  // Challenge trophies (20)
  {
    id: 'first_kill',
    name: '首胜徽章',
    story: '第一只小怪倒下时',
    rarity: 'common',
    category: 'challenge',
    hiddenUntilUnlock: false,
    triggerDescription: '完成第 1 个任务',
  },
  {
    id: 'dawn',
    name: '晨光徽章',
    story: '清晨第一缕光看见你正在战斗',
    rarity: 'rare',
    category: 'challenge',
    hiddenUntilUnlock: false,
    triggerDescription: '连续 5 天 7 点前完成',
  },
  // ... more

  // Hidden trophies (9)
  {
    id: 'midnight_warrior',
    name: '夜半侠',
    story: '深夜也在战斗的勇者',
    rarity: 'epic',
    category: 'hidden',
    hiddenUntilUnlock: true,
    triggerDescription: '23:00-01:00 完成任务',
  },
  // ...
];

/**
 * Plant catalog (8 plants)
 */
export const PLANT_CATALOG: ShopItem[] = [
  {
    id: 'plant_pothos',
    category: 'plant',
    name: '大叶绿萝',
    pricePoints: 0,
    imageUrl: '/assets/home/plants/plant_pothos.svg',
    description: '垂蔓 + 心形叶',
    tags: ['default', 'hanging'],
    defaultOwned: true,
    slotType: 'left',
  },
  {
    id: 'plant_monstera',
    category: 'plant',
    name: '龟背竹',
    pricePoints: 0,
    imageUrl: '/assets/home/plants/plant_monstera.svg',
    description: '大叶 + 网状孔',
    tags: ['default'],
    defaultOwned: true,
    slotType: 'right',
  },
  {
    id: 'plant_cactus',
    category: 'plant',
    name: '沙漠仙人掌',
    pricePoints: 20,
    imageUrl: '/assets/home/plants/plant_cactus.svg',
    description: '圆柱 + 红花',
    tags: ['desert'],
  },
  {
    id: 'plant_lavender',
    category: 'plant',
    name: '薰衣草盆',
    pricePoints: 40,
    imageUrl: '/assets/home/plants/plant_lavender.svg',
    description: '紫色花穗',
    tags: ['flower'],
  },
  {
    id: 'plant_moss',
    category: 'plant',
    name: '苔玉',
    pricePoints: 30,
    imageUrl: '/assets/home/plants/plant_moss.svg',
    description: '圆球苔藓挂件',
    tags: ['japanese'],
  },
  {
    id: 'plant_fiddle',
    category: 'plant',
    name: '琴叶榕',
    pricePoints: 60,
    imageUrl: '/assets/home/plants/plant_fiddle.svg',
    description: '大圆叶 + 树形',
    tags: ['indoor'],
  },
  {
    id: 'plant_lemon',
    category: 'plant',
    name: '小柠檬树',
    pricePoints: 80,
    imageUrl: '/assets/home/plants/plant_lemon.svg',
    description: '树形 + 黄果实',
    tags: ['fruit'],
  },
  {
    id: 'plant_bonsai',
    category: 'plant',
    name: '迷你松柏盆景',
    pricePoints: 100,
    imageUrl: '/assets/home/plants/plant_bonsai.svg',
    description: '弯曲松枝',
    tags: ['premium', 'japanese'],
  },
];


/* ============================================================
 * 6. HOOK SKELETON
 * 路径: src/hooks/useHomeCollection.ts
 * ============================================================ */

/*
import { useState, useEffect } from 'react';
import { UserHomeCollection } from '@/types/home';

const STORAGE_KEY = 'fatboy-home-collection';

const DEFAULT_COLLECTION: UserHomeCollection = {
  userId: '',
  trophies: [
    { id: 'rookie', unlockedAt: new Date().toISOString() },
  ],
  legosOwned: [],
  toysOwned: [],
  deskItemsOwned: [],
  deskItemsActive: [],
  plantsOwned: [
    { id: 'plant_pothos', purchasedAt: new Date().toISOString() },
    { id: 'plant_monstera', purchasedAt: new Date().toISOString() },
  ],
  plantsActive: [
    { slot: 'left', plantId: 'plant_pothos' },
    { slot: 'right', plantId: 'plant_monstera' },
  ],
};

export function useHomeCollection() {
  const [collection, setCollection] = useState<UserHomeCollection>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_COLLECTION;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));
  }, [collection]);

  return {
    collection,
    setCollection,
  };
}
*/
