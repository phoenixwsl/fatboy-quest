import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '../db';
import { aggregateMonth, DAY_LEVEL_STYLE, buildDayDetail } from '../lib/calendar';
import { scoreRatio, ratioColorStyle } from '../lib/points';
import { SubjectIcon } from './HomePage';
import { useAppStore } from '../store/useAppStore';
import { toPng } from 'html-to-image';

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

export function CalendarPage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const tasks = useLiveQuery(() => db.tasks.toArray());
  const evals = useLiveQuery(() => db.evaluations.toArray());
  const points = useLiveQuery(() => db.points.toArray());

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const days = aggregateMonth(tasks ?? [], evals ?? [], points ?? [], year, month);
  const firstDow = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 周一=0
  const padding = Array.from({ length: firstDow }, (_, i) => i);

  function prev() {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  }
  function next() {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  }

  async function exportImage() {
    if (!canvasRef.current) return;
    try {
      // R3.4.1: 导出时用当前 surface-paper 作背景，跟主题走
      const bg = getComputedStyle(document.body).getPropertyValue('--surface-paper').trim() || '#FFFFFA';
      const dataUrl = await toPng(canvasRef.current, { backgroundColor: bg, pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `calendar-${year}-${String(month).padStart(2,'0')}.png`;
      a.click();
      toast('✓ 长图已下载', 'success');
    } catch (e) {
      toast('导出失败', 'warn');
    }
  }

  const totalDays = days.filter(d => d.completed > 0).length;
  const perfectDays = days.filter(d => d.perfectDay).length;
  const totalPoints = days.reduce((s, d) => s + d.pointsEarned, 0);
  const selectedDay = selected ? days.find(d => d.date === selected) : null;

  // R3.4.1: 移除 page 级 text-white；body 已 cascades color:var(--ink-strong)
  return (
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink-strong)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav(-1)} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold flex-1">📅 贡献日历</div>
        <button onClick={exportImage} className="space-btn-ghost text-sm">💾 导出长图</button>
      </div>

      <div ref={canvasRef} className="space-card p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prev}
            className="px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--surface-mist)', color: 'var(--ink-strong)' }}
          >
            ← {month === 1 ? 12 : month - 1} 月
          </button>
          <div className="text-xl font-bold">{year} 年 {month} 月</div>
          <button
            onClick={next}
            className="px-3 py-1.5 rounded-xl"
            style={{ background: 'var(--surface-mist)', color: 'var(--ink-strong)' }}
          >
            {month === 12 ? 1 : month + 1} 月 →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-xs mb-2" style={{ color: 'var(--ink-faint)' }}>
          {WEEKDAYS.map(w => <div key={w} className="text-center">{w}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {padding.map(i => <div key={`p${i}`} />)}
          {days.map(d => {
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            return (
              <button key={d.date}
                onClick={() => setSelected(selected === d.date ? null : d.date)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative active:scale-95 transition-transform ${isToday ? 'ring-2' : ''}`}
                style={{
                  ...DAY_LEVEL_STYLE[d.level],
                  // d.level 高时（深色 / 金色）用浅文字，低时用 ink-muted
                  color: d.level >= 3 ? '#fff' : 'var(--ink-strong)',
                  ...(isToday ? { boxShadow: '0 0 0 2px var(--ink-strong)' } : {}),
                }}
              >
                <span style={{ fontWeight: d.level >= 3 ? 700 : 500 }}>
                  {Number(d.date.slice(-2))}
                </span>
                {d.completed > 0 && (
                  <span className="text-[9px]" style={{ opacity: d.level >= 3 ? 0.95 : 0.7 }}>
                    {d.completed}/{d.total}
                  </span>
                )}
                {d.perfectDay && <span className="absolute top-0.5 right-0.5 text-[9px]">⭐</span>}
              </button>
            );
          })}
        </div>

        <div
          className="mt-5 pt-4 grid grid-cols-3 gap-2 text-center"
          style={{ borderTop: '1px solid var(--surface-fog)' }}
        >
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>活跃天数</div>
            <div className="text-xl font-bold">{totalDays}</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>完美天</div>
            <div className="text-xl font-bold" style={{ color: 'var(--state-warn)' }}>{perfectDays} ⭐</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>本月积分</div>
            <div className="text-xl font-bold" style={{ color: 'var(--state-success)' }}>{totalPoints}</div>
          </div>
        </div>

        {/* 图例 */}
        <div className="mt-4 flex items-center gap-2 justify-center text-[10px]" style={{ color: 'var(--ink-faint)' }}>
          <span>少</span>
          {[0,1,2,3,4].map(l => (
            <div key={l} className="w-3 h-3 rounded" style={DAY_LEVEL_STYLE[l as 0|1|2|3|4]} />
          ))}
          <span>多</span>
        </div>
      </div>

      {selectedDay && (
        <DayDetailPanel
          date={selectedDay.date}
          tasks={tasks ?? []}
          evals={evals ?? []}
          points={points ?? []}
          perfectDay={selectedDay.perfectDay}
        />
      )}
    </div>
  );
}

// R2.1.1: 详细任务列表面板
function DayDetailPanel({ date, tasks, evals, points, perfectDay }: {
  date: string; tasks: any[]; evals: any[]; points: any[]; perfectDay: boolean;
}) {
  const detail = buildDayDetail(date, tasks, evals, points);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-card p-4 mt-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm font-bold">📅 {date}</div>
        <div className="text-xs" style={{ color: 'var(--state-warn)' }}>
          ⭐ {detail.totalPoints} 积分
          {perfectDay && ' · 🌟 完美一天'}
        </div>
      </div>

      {detail.tasks.length === 0 ? (
        <div className="text-xs text-center py-3" style={{ color: 'var(--ink-faint)' }}>这一天没有作业</div>
      ) : (
        <div className="space-y-2">
          {detail.tasks.map(t => {
            const ev = t.evaluation;
            const earlyBonus = t.earlyBonus ?? 0;
            const totalEarned = ev ? ev.finalPoints + earlyBonus : 0;
            const ratio = ev ? scoreRatio(ev.basePointsAtEval, ev.finalPoints, earlyBonus) : 0;
            const ratioStyle = ev ? ratioColorStyle(ratio) : { color: 'var(--ink-faint)' };
            const stateEmoji =
              t.status === 'evaluated' ? '✅' :
              t.status === 'done' ? '❓' :
              t.status === 'inProgress' ? '⏳' :
              t.status === 'scheduled' ? '⏸' : '○';
            return (
              <div
                key={t.id}
                className="rounded-lg p-2 text-xs"
                style={{ background: 'var(--surface-mist)' }}
              >
                <div className="flex items-center gap-2">
                  <span>{stateEmoji}</span>
                  <SubjectIcon subject={t.subject} />
                  <span className="flex-1 font-medium">{t.title}</span>
                  {ev && (
                    <span className="font-bold" style={ratioStyle}>+{totalEarned} ({ratio}%)</span>
                  )}
                </div>
                {ev && (
                  <div className="mt-1 ml-12 flex gap-2 text-[10px]" style={{ color: 'var(--ink-muted)' }}>
                    <span>完成 {'⭐'.repeat(ev.completion)}</span>
                    <span>质量 {'⭐'.repeat(ev.quality)}</span>
                    <span>态度 {'⭐'.repeat(ev.attitude)}</span>
                  </div>
                )}
                {ev?.note && (
                  <div className="mt-1 ml-12 text-[10px]" style={{ color: 'var(--state-warn-strong)' }}>💬 {ev.note}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {detail.comboBonus && detail.comboBonus > 0 && (
        <div
          className="mt-3 pt-2 text-xs flex justify-between"
          style={{ borderTop: '1px solid var(--surface-fog)' }}
        >
          <span style={{ color: 'var(--state-warn)' }}>⚡ Combo 加成</span>
          <span className="font-bold" style={{ color: 'var(--state-warn)' }}>+{detail.comboBonus}</span>
        </div>
      )}
    </motion.div>
  );
}
