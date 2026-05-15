// ============================================================
// R5.0.0: UnlockConditionEditor
//
// 家长 ShopManager 创建/编辑商品时使用：选择"通过任务条件解锁"通路时，
// 这个表单让家长拼出一个 UnlockCondition。
//
// 支持 5 种 kind：
//   1. lifetimePoints  — 累计积分阈值
//   2. taskCount       — 完成 X 个铜/银/金任务（按窗口）
//   3. longTask        — 完成 X 个长任务（按窗口）
//   4. perfectTask     — 完成 X 个完美任务（按窗口）
//   5. streak          — 连击 X 天
//
// 实时显示 describeCondition() 预览。
// ============================================================

import {
  type UnlockCondition,
  type StarLevel,
  type Window,
  describeCondition,
} from '../lib/unlockCondition';

const KIND_OPTIONS: { kind: UnlockCondition['kind']; label: string; emoji: string }[] = [
  { kind: 'lifetimePoints', label: '累计积分阈值', emoji: '⭐' },
  { kind: 'taskCount',      label: '完成 N 个 X 任务', emoji: '🎯' },
  { kind: 'longTask',       label: '完成 N 个长任务', emoji: '⏱️' },
  { kind: 'perfectTask',    label: '完成 N 个完美任务', emoji: '💎' },
  { kind: 'streak',         label: '连击 N 天', emoji: '🔥' },
];

const WINDOW_LABELS: Record<Window, string> = {
  week: '本周', month: '本月', quarter: '本季度', lifetime: '累计',
};

const STAR_LABELS: Record<StarLevel, { label: string; color: string }> = {
  none:   { label: '☆ 0 星', color: '#5A5A5A' },
  bronze: { label: '🥉 铜', color: '#B87333' },
  silver: { label: '🥈 银', color: '#7A7A7A' },
  gold:   { label: '🥇 金', color: '#A87C00' },
};

interface Props {
  value: UnlockCondition | null;
  onChange: (v: UnlockCondition | null) => void;
}

export function UnlockConditionEditor({ value, onChange }: Props) {
  const kind = value?.kind ?? 'lifetimePoints';

  function setKind(k: UnlockCondition['kind']) {
    // 为新 kind 生成默认参数
    switch (k) {
      case 'lifetimePoints':
        onChange({ kind: 'lifetimePoints', threshold: 1000 });
        break;
      case 'taskCount':
        onChange({ kind: 'taskCount', star: 'gold', count: 5, window: 'lifetime' });
        break;
      case 'longTask':
        onChange({ kind: 'longTask', count: 5, window: 'lifetime' });
        break;
      case 'perfectTask':
        onChange({ kind: 'perfectTask', count: 5, window: 'lifetime' });
        break;
      case 'streak':
        onChange({ kind: 'streak', days: 7 });
        break;
    }
  }

  return (
    <div className="space-y-3">
      {/* kind 选择 */}
      <div>
        <div className="text-xs mb-1.5" style={{ color: 'var(--ink-faint)' }}>解锁条件类型</div>
        <div className="grid grid-cols-2 gap-1.5">
          {KIND_OPTIONS.map(o => (
            <button
              key={o.kind}
              onClick={() => setKind(o.kind)}
              aria-pressed={kind === o.kind}
              className={`tag-btn text-left ${kind === o.kind ? 'active' : ''}`}
              style={{ padding: '8px 10px', fontSize: 12 }}
            >
              <span className="mr-1">{o.emoji}</span>{o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 参数 */}
      {value?.kind === 'lifetimePoints' && (
        <ParamRow label="累计积分阈值">
          <NumInput
            value={value.threshold}
            onChange={n => onChange({ kind: 'lifetimePoints', threshold: n })}
            min={1}
          />
        </ParamRow>
      )}

      {value?.kind === 'taskCount' && (
        <>
          <ParamRow label="星级">
            <div className="flex gap-1.5">
              {(['bronze', 'silver', 'gold'] as StarLevel[]).map(s => (
                <button
                  key={s}
                  onClick={() => onChange({ ...value, star: s })}
                  aria-pressed={value.star === s}
                  className={`tag-btn flex-1 ${value.star === s ? 'active' : ''}`}
                  style={value.star === s ? { color: STAR_LABELS[s].color } : undefined}
                >
                  {STAR_LABELS[s].label}
                </button>
              ))}
            </div>
          </ParamRow>
          <ParamRow label="完成数">
            <NumInput
              value={value.count}
              onChange={n => onChange({ ...value, count: n })}
              min={1}
            />
          </ParamRow>
          <WindowPicker
            value={value.window}
            onChange={w => onChange({ ...value, window: w })}
          />
        </>
      )}

      {value?.kind === 'longTask' && (
        <>
          <ParamRow label="长任务数（≥ 30 分钟）">
            <NumInput
              value={value.count}
              onChange={n => onChange({ ...value, count: n })}
              min={1}
            />
          </ParamRow>
          <WindowPicker
            value={value.window}
            onChange={w => onChange({ ...value, window: w })}
          />
        </>
      )}

      {value?.kind === 'perfectTask' && (
        <>
          <ParamRow label="完美任务数（三维全 5）">
            <NumInput
              value={value.count}
              onChange={n => onChange({ ...value, count: n })}
              min={1}
            />
          </ParamRow>
          <WindowPicker
            value={value.window}
            onChange={w => onChange({ ...value, window: w })}
          />
        </>
      )}

      {value?.kind === 'streak' && (
        <ParamRow label="连击天数">
          <NumInput
            value={value.days}
            onChange={n => onChange({ kind: 'streak', days: n })}
            min={1}
          />
        </ParamRow>
      )}

      {/* 预览 */}
      {value && (
        <div
          className="p-2.5 rounded text-sm"
          style={{
            background: 'var(--accent-soft)',
            color: 'var(--accent-strong)',
            borderLeft: '3px solid var(--accent)',
          }}
        >
          📖 解锁条件：{describeCondition(value)}
        </div>
      )}
    </div>
  );
}

// ============================================================
function WindowPicker({ value, onChange }: { value: Window; onChange: (w: Window) => void }) {
  return (
    <ParamRow label="时间窗口">
      <div className="grid grid-cols-4 gap-1.5">
        {(['week', 'month', 'quarter', 'lifetime'] as Window[]).map(w => (
          <button
            key={w}
            onClick={() => onChange(w)}
            aria-pressed={value === w}
            className={`tag-btn ${value === w ? 'active' : ''}`}
            style={{ padding: '6px 8px', fontSize: 11 }}
          >
            {WINDOW_LABELS[w]}
          </button>
        ))}
      </div>
    </ParamRow>
  );
}

function ParamRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>{label}</div>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, min }: { value: number; onChange: (n: number) => void; min?: number }) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      onChange={e => onChange(Math.max(min ?? 0, Number(e.target.value) || 0))}
      className="w-full px-3 py-2 rounded-xl outline-none text-num"
      style={{ background: 'var(--surface-mist)' }}
    />
  );
}
