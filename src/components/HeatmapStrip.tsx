import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { compute7DayHeatmap, HEAT_STYLES } from '../lib/heatmap';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export function HeatmapStrip() {
  const nav = useNavigate();
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const cells = compute7DayHeatmap(tasks ?? []);
  return (
    <button onClick={() => nav('/calendar')} className="w-full active:scale-95 transition-transform">
      <div className="flex justify-between gap-1.5">
        {cells.map((c, i) => {
          const dt = new Date(c.date);
          const wd = WEEKDAYS[dt.getDay()];
          const isToday = i === cells.length - 1;
          return (
            <div key={c.date} className="flex flex-col items-center gap-1 flex-1">
              <div
                className={`w-full h-6 rounded ${isToday ? 'ring-2' : ''}`}
                style={{
                  ...HEAT_STYLES[c.status],
                  ...(isToday ? { boxShadow: '0 0 0 2px var(--surface-fog)' } : {}),
                }}
                title={`${c.date} - ${c.completed}/${c.total}`}
              />
              <div
                className="text-[10px]"
                style={{
                  color: isToday ? 'var(--ink-strong)' : 'var(--ink-faint)',
                  fontWeight: isToday ? 700 : undefined,
                }}
              >
                {wd}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-center mt-1" style={{ color: 'var(--ink-faint)' }}>点击查看完整日历 →</div>
    </button>
  );
}
