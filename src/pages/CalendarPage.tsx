import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '../db';
import { aggregateMonth, DAY_LEVEL_COLOR, buildDayDetail } from '../lib/calendar';
import { scoreRatio, ratioColorClass } from '../lib/points';
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
      const dataUrl = await toPng(canvasRef.current, { backgroundColor: '#0b1026', pixelRatio: 2 });
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

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav(-1)} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold flex-1">📅 贡献日历</div>
        <button onClick={exportImage} className="space-btn-ghost text-sm">💾 导出长图</button>
      </div>

      <div ref={canvasRef} className="space-card p-5 bg-space-card">
        <div className="flex items-center justify-between mb-4">
          <button onClick={prev} className="px-3 py-1.5 bg-white/10 rounded-xl">← {month === 1 ? 12 : month - 1} 月</button>
          <div className="text-xl font-bold">{year} 年 {month} 月</div>
          <button onClick={next} className="px-3 py-1.5 bg-white/10 rounded-xl">{month === 12 ? 1 : month + 1} 月 →</button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-xs text-white/40 mb-2">
          {WEEKDAYS.map(w => <div key={w} className="text-center">{w}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {padding.map(i => <div key={`p${i}`} />)}
          {days.map(d => {
            const isToday = d.date === new Date().toISOString().slice(0, 10);
            return (
              <button key={d.date}
                onClick={() => setSelected(selected === d.date ? null : d.date)}
                className={`aspect-square rounded-lg ${DAY_LEVEL_COLOR[d.level]} ${isToday ? 'ring-2 ring-white/80' : ''} flex flex-col items-center justify-center text-xs relative active:scale-95 transition-transform`}
              >
                <span className={d.level >= 3 ? 'font-bold' : 'text-white/70'}>
                  {Number(d.date.slice(-2))}
                </span>
                {d.completed > 0 && (
                  <span className="text-[9px] text-white/70">{d.completed}/{d.total}</span>
                )}
                {d.perfectDay && <span className="absolute top-0.5 right-0.5 text-[9px]">⭐</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-xs text-white/50">活跃天数</div>
            <div className="text-xl font-bold">{totalDays}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">完美天</div>
            <div className="text-xl font-bold text-amber-300">{perfectDays} ⭐</div>
          </div>
          <div>
            <div className="text-xs text-white/50">本月积分</div>
            <div className="text-xl font-bold text-emerald-300">{totalPoints}</div>
          </div>
        </div>

        {/* 图例 */}
        <div className="mt-4 flex items-center gap-2 justify-center text-[10px] text-white/40">
          <span>少</span>
          {[0,1,2,3,4].map(l => (
            <div key={l} className={`w-3 h-3 rounded ${DAY_LEVEL_COLOR[l as 0|1|2|3|4]}`} />
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
        <div className="text-xs text-amber-300">
          ⭐ {detail.totalPoints} 积分
          {perfectDay && ' · 🌟 完美一天'}
        </div>
      </div>

      {detail.tasks.length === 0 ? (
        <div className="text-xs text-white/40 text-center py-3">这一天没有作业</div>
      ) : (
        <div className="space-y-2">
          {detail.tasks.map(t => {
            const ev = t.evaluation;
            const earlyBonus = t.earlyBonus ?? 0;
            const totalEarned = ev ? ev.finalPoints + earlyBonus : 0;
            const ratio = ev ? scoreRatio(ev.basePointsAtEval, ev.finalPoints, earlyBonus) : 0;
            const ratioCls = ev ? ratioColorClass(ratio) : 'text-white/50';
            const stateEmoji =
              t.status === 'evaluated' ? '✅' :
              t.status === 'done' ? '❓' :
              t.status === 'inProgress' ? '⏳' :
              t.status === 'scheduled' ? '⏸' : '○';
            return (
              <div key={t.id} className="bg-white/5 rounded-lg p-2 text-xs">
                <div className="flex items-center gap-2">
                  <span>{stateEmoji}</span>
                  <SubjectIcon subject={t.subject} />
                  <span className="flex-1 font-medium">{t.title}</span>
                  {ev && (
                    <span className={`font-bold ${ratioCls}`}>+{totalEarned} ({ratio}%)</span>
                  )}
                </div>
                {ev && (
                  <div className="mt-1 ml-12 text-white/60 flex gap-2 text-[10px]">
                    <span>完成 {'⭐'.repeat(ev.completion)}</span>
                    <span>质量 {'⭐'.repeat(ev.quality)}</span>
                    <span>态度 {'⭐'.repeat(ev.attitude)}</span>
                  </div>
                )}
                {ev?.note && (
                  <div className="mt-1 ml-12 text-[10px] text-amber-200/80">💬 {ev.note}</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {detail.comboBonus && detail.comboBonus > 0 && (
        <div className="mt-3 pt-2 border-t border-white/10 text-xs flex justify-between">
          <span className="text-amber-300">⚡ Combo 加成</span>
          <span className="font-bold text-amber-300">+{detail.comboBonus}</span>
        </div>
      )}
    </motion.div>
  );
}
