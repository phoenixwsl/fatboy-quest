// ============================================================
// R5.0.0: 商店分类 tab + chip 二级筛选（2 tab 极简版）
//
// 2 tab：🧸 玩具堆 / 🍦 补给站，默认玩具堆
// 当前 tab 下显示该类的 chip 横滑列表（单选 + "全部" chip 复位）
// ============================================================

import { ALL_CATEGORIES, SHOP_CATEGORIES, type ShopCategory } from '../lib/categories';

interface Props {
  category: ShopCategory;
  chip: string | null;
  onCategoryChange: (c: ShopCategory) => void;
  onChipChange: (chip: string | null) => void;
}

export function CategoryTabs({ category, chip, onCategoryChange, onChipChange }: Props) {
  const chipsForCurrent = SHOP_CATEGORIES[category].chips;

  return (
    <div className="mb-3">
      {/* 一级 tab — 2 类 */}
      <div className="flex gap-2">
        {ALL_CATEGORIES.map(c => (
          <CatTab
            key={c}
            label={`${SHOP_CATEGORIES[c].emoji} ${SHOP_CATEGORIES[c].label}`}
            active={category === c}
            onClick={() => { onCategoryChange(c); onChipChange(null); }}
          />
        ))}
      </div>

      {/* 二级 chip */}
      {chipsForCurrent.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pt-2 pb-1">
          <ChipBtn label="全部" active={chip === null} onClick={() => onChipChange(null)} />
          {chipsForCurrent.map(c => (
            <ChipBtn key={c} label={`#${c}`} active={chip === c} onClick={() => onChipChange(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function CatTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`tag-btn flex-1 ${active ? 'active' : ''}`}
      style={{ padding: '10px 14px', fontSize: 15 }}
    >
      {label}
    </button>
  );
}

function ChipBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className="shrink-0"
      style={{
        padding: '4px 10px',
        borderRadius: 'var(--radius-xs)',
        background: active ? 'var(--primary-soft)' : 'transparent',
        color: active ? 'var(--primary-strong)' : 'var(--ink-muted)',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--surface-fog)'}`,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {label}
    </button>
  );
}
