import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import { db } from '../db';
import { PetAvatar } from '../components/PetAvatar';
import { ChildAddTaskModal } from '../components/ChildAddTaskModal';
import { todayString, formatChineseDate } from '../lib/time';
import { totalPoints, getRank, getNextRank } from '../lib/points';
import { canUndoCompletion } from '../lib/templates';
import { sounds, syncFromSettings } from '../lib/sounds';
import { useAppStore } from '../store/useAppStore';
import { APP_VERSION } from '../version';
import { HeatmapStrip } from '../components/HeatmapStrip';
import { isWeekend } from '../lib/weekendMode';
import { TASK_TYPE_BORDER, TASK_TYPE_BADGE, activeWeeklyDefinitions, weeklyProgress, makeWeeklyInstance } from '../lib/recurrence';

export function HomePage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const today = todayString();
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const todayTasks = useLiveQuery(() => db.tasks.where({ date: today }).toArray(), [today]);
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const pointsEntries = useLiveQuery(() => db.points.toArray());
  const taskDefs = useLiveQuery(() => db.taskDefinitions.toArray());
  const [addOpen, setAddOpen] = useState(false);
  const weekendMode = !!(settings?.weekendModeEnabled !== false && isWeekend(new Date()));

  // 同步音效开关
  useEffect(() => { syncFromSettings(settings?.soundEnabled); }, [settings?.soundEnabled]);

  const total = pointsEntries ? totalPoints(pointsEntries) : 0;
  const rank = getRank(total);
  const next = getNextRank(total);

  // 长按右上角进入家长模式
  const pressTimer = useRef<number | null>(null);
  const [pressProgress, setPressProgress] = useState(0);
  const startPress = () => {
    let p = 0;
    pressTimer.current = window.setInterval(() => {
      p += 100 / 30; // 3 秒
      setPressProgress(p);
      if (p >= 100) {
        endPress();
        sounds.play('unlock');
        nav('/parent');
      }
    }, 100);
  };
  const endPress = () => {
    if (pressTimer.current) clearInterval(pressTimer.current);
    pressTimer.current = null;
    setPressProgress(0);
  };
  useEffect(() => () => { if (pressTimer.current) clearInterval(pressTimer.current); }, []);

  const pendingTasks = todayTasks?.filter(t => t.status === 'pending') ?? [];
  const scheduledOrInProgress = todayTasks?.filter(t => t.status === 'scheduled' || t.status === 'inProgress') ?? [];
  const doneTasks = todayTasks?.filter(t => t.status === 'done' || t.status === 'evaluated') ?? [];

  async function undoComplete(taskId: string) {
    const t = await db.tasks.get(taskId);
    if (!t || !canUndoCompletion(t)) return;
    if (!confirm('确定撤回？这一项会变回"闯关中"，可以重新点完成。')) return;
    await db.tasks.update(taskId, { status: 'scheduled', completedAt: undefined });
    sounds.play('undo');
    toast('已撤回 ↩', 'info');
  }

  const childCanAdd = settings?.childCanAddTasks !== false;

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs text-white/50">{formatChineseDate(today)}</div>
          <div className="text-2xl font-bold glow-text">你好，{settings?.childName ?? '肥仔'} ✨</div>
        </div>
        <div
          onPointerDown={startPress}
          onPointerUp={endPress}
          onPointerLeave={endPress}
          onPointerCancel={endPress}
          className="relative w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/20 select-none"
        >
          <span className="text-xl">⚙️</span>
          {pressProgress > 0 && (
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="22" fill="none" stroke="rgba(124,92,255,0.8)"
                strokeWidth="3" strokeDasharray={138} strokeDashoffset={138 - (138 * pressProgress / 100)}
                strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>

      {weekendMode && (
        <div className="space-card p-3 mt-4 bg-gradient-to-r from-amber-500/20 to-fuchsia-500/20 ring-1 ring-amber-300/40">
          <div className="text-sm text-amber-200 font-bold flex items-center gap-2">
            🌞 周末模式 <span className="text-xs font-normal text-white/70">· 完成 1 项即保持连击</span>
          </div>
        </div>
      )}

      {/* 蛋仔 + 段位 + 进度 */}
      <motion.div
        className="space-card p-6 mt-4"
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-4">
          <PetAvatar skinId={pet?.skinId} size={96} mood={weekendMode ? 'happy' : 'happy'} />
          <div className="flex-1">
            <div className="text-lg font-bold">{pet?.name ?? '蛋仔'}</div>
            <div className={`text-sm ${rank.color}`}>{rank.emoji} {rank.name}</div>
            <div className="text-xs text-white/60 mt-1">⭐ {total} 积分</div>
            {next && (
              <div className="text-xs text-white/40 mt-0.5">距离 {next.name} 还差 {next.minPoints - total} 分</div>
            )}
            <div className="text-xs text-amber-300/80 mt-1">
              🔥 连击 {streak?.currentStreak ?? 0} 天 · 🛡️ {streak?.guardCards ?? 0} 张
            </div>
          </div>
        </div>
        <PetPanelExtras todayTasks={todayTasks ?? []} defs={taskDefs ?? []} allTasks={allTasks ?? []} />
        <div className="mt-3 pt-3 border-t border-white/10">
          <HeatmapStrip />
        </div>
      </motion.div>

      {/* 今日任务区 */}
      <div className="mt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">今日小怪 ({(pendingTasks.length + scheduledOrInProgress.length + doneTasks.length) || 0})</h2>
          <div className="flex gap-2">
            {childCanAdd && (
              <button onClick={() => { sounds.play('tap'); setAddOpen(true); }} className="space-btn-ghost text-sm">+ 加一个</button>
            )}
            <button onClick={() => { sounds.play('tap'); nav('/shop'); }} className="space-btn-ghost text-sm">🎁 商店</button>
          </div>
        </div>

        {todayTasks && todayTasks.length === 0 && (
          <div className="space-card p-6 mt-3 text-center text-white/60">
            <div className="text-4xl mb-2">🌙</div>
            <div>今天还没有作业</div>
            <div className="text-xs mt-1 text-white/40">让家长添加，或者你自己加一个 ✨</div>
          </div>
        )}

        {pendingTasks.length > 0 && (
          <div className="mt-3">
            <div className="text-sm text-white/60 mb-2">📋 待安排</div>
            <div className="space-y-2">
              {pendingTasks.map(t => {
                const tt = (t.taskType ?? 'normal');
                const badge = TASK_TYPE_BADGE[tt];
                return (
                <div key={t.id} className={`space-card p-3 flex items-center gap-3 ${TASK_TYPE_BORDER[tt]}`}>
                  <SubjectIcon subject={t.subject} />
                  <div className="flex-1">
                    <div className="font-medium flex items-center gap-2 flex-wrap">
                      {t.title}
                      {badge && <span className={`text-xs px-1.5 py-0.5 rounded ${badge.class}`}>{badge.label}</span>}
                      {t.createdBy === 'child' && <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/30">我加的</span>}
                    </div>
                    <div className="text-xs text-white/50">{t.estimatedMinutes} 分钟{t.basePoints ? ` · ${t.basePoints} 积分` : ' · 积分由家长评分时给'}</div>
                  </div>
                </div>
              )})}
            </div>
            <button onClick={() => { sounds.play('tap'); nav('/schedule'); }} className="space-btn w-full mt-3">📅 去规划今天</button>
          </div>
        )}

        {scheduledOrInProgress.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-white/60 mb-2">⏱️ 闯关中</div>
            <div className="space-y-2">
              {scheduledOrInProgress.map(t => (
                <div key={t.id} className="space-card p-3 flex items-center gap-3">
                  <SubjectIcon subject={t.subject} />
                  <div className="flex-1">
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-white/50">{t.estimatedMinutes} 分钟 · {t.basePoints} 积分</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => { sounds.play('tap'); nav('/quest'); }} className="space-btn w-full mt-3">⚔️ 进入闯关</button>
          </div>
        )}

        {doneTasks.length > 0 && (
          <div className="mt-4">
            <div className="text-sm text-emerald-300 mb-2">✓ 今日已击败 ({doneTasks.length})</div>
            <div className="space-y-2">
              {doneTasks.map(t => (
                <div key={t.id} className="space-card p-3 flex items-center gap-3 opacity-80">
                  <SubjectIcon subject={t.subject} />
                  <div className="flex-1">
                    <div className="font-medium line-through">{t.title}</div>
                    <div className="text-xs text-white/50">
                      {t.status === 'evaluated' ? '已评分 ✓（积分已入账）' : '等待家长评分...'}
                    </div>
                  </div>
                  {canUndoCompletion(t) && (
                    <button onClick={() => undoComplete(t.id)}
                      className="text-amber-300 text-xs bg-amber-500/20 px-2 py-1 rounded-lg active:scale-90">
                      ↩ 撤回
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <WeeklyTasksPanel defs={taskDefs ?? []} allTasks={allTasks ?? []} />

      <ChildAddTaskModal open={addOpen} onClose={() => setAddOpen(false)} settings={settings} />

      <div className="mt-6 text-center text-[10px] text-white/30">
        🚀 肥仔大闯关 · {APP_VERSION}
      </div>
    </div>
  );
}

function PetPanelExtras({ todayTasks, defs, allTasks }: { todayTasks: any[]; defs: any[]; allTasks: any[] }) {
  const completed = todayTasks.filter(t => t.status === 'done' || t.status === 'evaluated').length;
  const total = todayTasks.length;
  const requiredRemain = todayTasks.filter(t => t.isRequired && t.status !== 'done' && t.status !== 'evaluated').length;
  const weeklyDefs = activeWeeklyDefinitions(defs);
  const weeklyAchieved = weeklyDefs.filter(d => weeklyProgress(d, allTasks).achieved).length;
  return (
    <div className="mt-3 pt-3 border-t border-white/10 space-y-1 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-white/60">📅 今日进度</span>
        <span><b>{completed}</b>/{total}</span>
      </div>
      {requiredRemain > 0 && (
        <div className="flex items-center justify-between text-rose-300">
          <span>🔴 必做剩余</span>
          <span><b>{requiredRemain}</b> 项</span>
        </div>
      )}
      {weeklyDefs.length > 0 && (
        <div className="flex items-center justify-between text-fuchsia-300/90">
          <span>🟣🔵 本周任务</span>
          <span><b>{weeklyAchieved}</b>/{weeklyDefs.length}</span>
        </div>
      )}
    </div>
  );
}

function WeeklyTasksPanel({ defs, allTasks }: { defs: any[]; allTasks: any[] }) {
  const toast = useAppStore(s => s.showToast);
  const weeklyDefs = activeWeeklyDefinitions(defs);
  if (weeklyDefs.length === 0) return null;

  async function doOne(def: any) {
    const inst = makeWeeklyInstance(def, todayString());
    await db.tasks.add(inst);
    sounds.play('unlock');
    toast(`已加到今日：${def.title}`, 'success');
  }

  return (
    <div className="mt-6">
      <div className="text-lg font-bold mb-2">📅 本周任务</div>
      <div className="space-y-2">
        {weeklyDefs.map(d => {
          const p = weeklyProgress(d, allTasks);
          const isMin = d.type === 'weekly-min';
          return (
            <div key={d.id} className={`space-card p-3 flex items-center gap-3 ${isMin ? 'border-l-4 border-l-fuchsia-500' : 'border-l-4 border-l-sky-500'}`}>
              <SubjectIcon subject={d.subject} />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  {d.title}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isMin ? 'bg-fuchsia-500/40 text-fuchsia-100' : 'bg-sky-500/40 text-sky-100'}`}>
                    {isMin ? `本周 ${p.done}/${p.target}` : (p.achieved ? '本周已完成' : '本周未完成')}
                  </span>
                </div>
                <div className="text-xs text-white/50">{d.estimatedMinutes}分 · {d.basePoints}积分</div>
              </div>
              {!p.achieved && (
                <button onClick={() => doOne(d)} className="space-btn-ghost text-sm">+ 做一次</button>
              )}
              {p.achieved && <div className="text-emerald-300 text-sm">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function SubjectIcon({ subject }: { subject: string }) {
  const map: Record<string, string> = {
    math: '🔢', chinese: '📖', english: '🔤', reading: '📚', writing: '✏️', other: '⭐',
  };
  return <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">{map[subject] ?? '⭐'}</div>;
}
