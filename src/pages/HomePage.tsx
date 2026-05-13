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
import { TASK_TYPE_BORDER, TASK_TYPE_BADGE, activeWeeklyDefinitions, weeklyProgress, makeWeeklyInstance, hasInstanceToday } from '../lib/recurrence';
import { scoreRatio, ratioColorClass } from '../lib/points';
import { detectHealActions, isHealNeeded } from '../lib/heal';
import { SkinPicker } from '../components/SkinPicker';
import { IdleNagBubble } from '../components/IdleNagBubble';

export function HomePage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const today = todayString();
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const todayTasks = useLiveQuery(() => db.tasks.where({ date: today }).toArray(), [today]);
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const todaySchedules = useLiveQuery(() => db.schedules.where({ date: today }).toArray(), [today]);
  const pointsEntries = useLiveQuery(() => db.points.toArray());
  const taskDefs = useLiveQuery(() => db.taskDefinitions.toArray());
  const [addOpen, setAddOpen] = useState(false);
  const [skinPickerOpen, setSkinPickerOpen] = useState(false);
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const weekendMode = !!(settings?.weekendModeEnabled !== false && isWeekend(new Date()));

  // R2.0.2: 自愈死锁 - 检测并修复状态不一致
  useEffect(() => {
    if (!allTasks || !todaySchedules) return;
    const plan = detectHealActions(allTasks, todaySchedules, today);
    if (!isHealNeeded(plan)) return;
    (async () => {
      for (const sid of plan.uncompleteScheduleIds) {
        await db.schedules.update(sid, {
          completedAt: undefined,
          comboPeakInRound: undefined,
          comboBonusPoints: undefined,
          reportShownAt: undefined,
        });
      }
      for (const tid of plan.resetTaskIds) {
        await db.tasks.update(tid, {
          status: 'pending',
          actualStartedAt: undefined,
          pausedAt: undefined,
          completedAt: undefined,
        });
      }
      const total = plan.uncompleteScheduleIds.length + plan.resetTaskIds.length;
      if (total > 0) {
        toast(`🔧 自动修复了 ${total} 处状态异常，请重新规划`, 'info');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allTasks?.length, todaySchedules?.length, today]);

  // 同步音效开关 + 声音包
  useEffect(() => {
    syncFromSettings(settings?.soundEnabled, settings?.soundPack);
  }, [settings?.soundEnabled, settings?.soundPack]);

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
    if (!confirm('确定撤回？这一项会回到"待开始"，可以重新点开始。')) return;
    await db.tasks.update(taskId, {
      status: 'scheduled',
      completedAt: undefined,
      // R2.2.5: 撤回时一并清掉 runtime 字段，避免下次进闯关倒计时显示离谱
      actualStartedAt: undefined,
      pausedAt: undefined,
      pauseSecondsUsed: undefined,
      pauseCount: undefined,
      firstEncounteredAt: undefined,
      startNagSentAt: undefined,
      undoCount: (t.undoCount ?? 0) + 1,
    });
    // Bug 修复：撤回后必须清掉本日所有 schedule 的 completedAt + combo，
    // 否则 QuestPage 找不到"活动中"的 schedule（lockedAt && !completedAt 失败）
    // 导致孩子既不能进闯关也不能再规划
    const schedules = await db.schedules.where({ date: t.date }).toArray();
    for (const sch of schedules) {
      if (sch.completedAt && sch.items.some(it => it.taskId === taskId)) {
        await db.schedules.update(sch.id, {
          completedAt: undefined,
          comboPeakInRound: undefined,
          comboBonusPoints: undefined,
          reportShownAt: undefined,
        });
      }
    }
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
        <div className="flex items-center gap-2">
          <button onClick={() => { sounds.play('tap'); nav('/achievements'); }}
            className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-300/40 flex items-center justify-center active:scale-90">
            <span className="text-xl">🏆</span>
          </button>
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
      </div>

      {/* R2.0.1: 大号 stats banner - 三个核心数字，最醒目位置 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="space-card p-4 mt-3 bg-gradient-to-br from-space-nebula/30 via-space-plasma/15 to-amber-500/15"
      >
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] text-white/60 uppercase tracking-wide">今日</div>
            <div className="text-3xl font-black tabular-nums">
              {todayTasks?.filter((t: any) => t.status === 'done' || t.status === 'evaluated').length ?? 0}
              <span className="text-base text-white/40 font-normal">/{todayTasks?.length ?? 0}</span>
            </div>
            <div className="text-[10px] text-white/40">作业</div>
          </div>
          <div className="border-l border-r border-white/10">
            <div className="text-[10px] text-amber-300/80 uppercase tracking-wide">积分</div>
            <div className="text-3xl font-black text-amber-300 tabular-nums">⭐{total}</div>
            <div className="text-[10px] text-white/40">累计</div>
          </div>
          <div>
            <div className="text-[10px] text-rose-300/80 uppercase tracking-wide">连击</div>
            <div className="text-3xl font-black text-rose-300 tabular-nums">{streak?.currentStreak ?? 0}</div>
            <div className="text-[10px] text-white/40">🔥 天</div>
          </div>
        </div>
      </motion.div>

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
          <button onClick={() => { sounds.play('tap'); setSkinPickerOpen(true); }} className="active:scale-95 transition-transform">
            <PetAvatar
              skinId={pet?.skinId}
              size={96}
              state={(() => {
                const h = new Date().getHours();
                if (h >= 22 || h < 6) return 'sleeping';
                return 'default';
              })()}
            />
          </button>
          <div className="flex-1">
            <div className="text-lg font-bold">{pet?.name ?? '蛋仔'}</div>
            <div className={`text-sm ${rank.color}`}>{rank.emoji} {rank.name}</div>
            {next && (
              <div className="text-xs text-white/40 mt-1">距离 {next.name} 还差 {next.minPoints - total} 分</div>
            )}
            <div className="text-xs text-white/60 mt-1">
              🛡️ {streak?.guardCards ?? 0} 张守护卡
            </div>
          </div>
        </div>
        <PetPanelExtras todayTasks={todayTasks ?? []} defs={taskDefs ?? []} allTasks={allTasks ?? []} />
        <div className="mt-3 pt-3 border-t border-white/10">
          <HeatmapStrip />
        </div>
      </motion.div>

      {/* R2.1.1: 检测到正在进行的闯关，强引导回去 */}
      {scheduledOrInProgress.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          onClick={() => { sounds.play('tap'); nav('/quest'); }}
          className="w-full mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-500/40 to-amber-500/40 ring-2 ring-amber-300/60 animate-pulse-glow flex items-center gap-3 active:scale-95"
        >
          <div className="text-3xl">⚔️</div>
          <div className="flex-1 text-left">
            <div className="font-bold text-white">你有未完成的闯关</div>
            <div className="text-xs text-white/80">{scheduledOrInProgress.length} 个小怪还在等你</div>
          </div>
          <div className="text-white">→</div>
        </motion.button>
      )}

      {/* 今日任务区（R1.3.1 重排序：待安排/闯关中/本周任务 在前；已击败折叠在后） */}
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
                return <PendingTaskCard key={t.id} task={t} tt={tt} badge={badge} />;
              })}
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
      </div>

      <WeeklyTasksPanel defs={taskDefs ?? []} allTasks={allTasks ?? []} todayTasks={todayTasks ?? []} />

      {doneTasks.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => { sounds.play('tap'); setDoneCollapsed(c => !c); }}
            className="w-full flex items-center justify-between text-emerald-300 mb-2 active:scale-95"
          >
            <span className="text-sm">✓ 今日已击败 ({doneTasks.length})</span>
            <span className="text-xs">{doneCollapsed ? '▶ 展开' : '▼ 收起'}</span>
          </button>
          {!doneCollapsed && (
            <div className="space-y-2">
              {doneTasks.map(t => <DoneTaskCard key={t.id} task={t} onUndo={undoComplete} />)}
            </div>
          )}
        </div>
      )}

      <ChildAddTaskModal open={addOpen} onClose={() => setAddOpen(false)} settings={settings} />
      <SkinPicker open={skinPickerOpen} onClose={() => setSkinPickerOpen(false)} />
      <IdleNagBubble enabled={settings?.idleNagEnabled !== false} />

      <div className="mt-6 text-center text-[10px] text-white/30">
        🚀 肥仔大闯关 · {APP_VERSION}
      </div>
    </div>
  );
}

// R2.1.D: 显示家长留的"下次提醒"
function PendingTaskCard({ task: t, tt, badge }: { task: any; tt: any; badge: any }) {
  const lastReminder = useLiveQuery(async () => {
    const allEvals = await db.evaluations.orderBy('evaluatedAt').reverse().limit(50).toArray();
    for (const e of allEvals) {
      if (!e.parentReminderForNext) continue;
      const srcTask = await db.tasks.get(e.taskId);
      if (srcTask && srcTask.title === t.title && srcTask.id !== t.id) {
        return e.parentReminderForNext;
      }
    }
    return undefined;
  }, [t.title, t.id]);

  return (
    <div className={`space-card p-3 flex items-center gap-3 ${TASK_TYPE_BORDER[tt as keyof typeof TASK_TYPE_BORDER]}`}>
      <SubjectIcon subject={t.subject} />
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2 flex-wrap">
          {t.title}
          {badge && <span className={`text-xs px-1.5 py-0.5 rounded ${badge.class}`}>{badge.label}</span>}
          {t.createdBy === 'child' && <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/30">我加的</span>}
        </div>
        <div className="text-xs text-white/50">{t.estimatedMinutes} 分钟{t.basePoints ? ` · ${t.basePoints} 积分` : ' · 积分由家长评分时给'}</div>
        {lastReminder && (
          <div className="mt-1.5 text-xs text-amber-200 bg-amber-500/10 rounded-lg px-2 py-1 border-l-2 border-amber-300">
            💡 家长说：{lastReminder}
          </div>
        )}
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

function WeeklyTasksPanel({ defs, allTasks, todayTasks }: { defs: any[]; allTasks: any[]; todayTasks: any[] }) {
  const toast = useAppStore(s => s.showToast);
  const weeklyDefs = activeWeeklyDefinitions(defs);
  if (weeklyDefs.length === 0) return null;
  const today = todayString();

  async function doOne(def: any) {
    if (hasInstanceToday(def.id, today, todayTasks)) {
      toast('今天已经做过一次了，明天再来 😊', 'warn');
      sounds.play('error');
      return;
    }
    const inst = makeWeeklyInstance(def, today);
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
          const doneToday = hasInstanceToday(d.id, today, todayTasks);
          return (
            <div key={d.id} className={`space-card p-3 flex items-center gap-3 ${isMin ? 'border-l-4 border-l-fuchsia-500' : 'border-l-4 border-l-sky-500'}`}>
              <SubjectIcon subject={d.subject} />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2">
                  {d.title}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${isMin ? 'bg-fuchsia-500/40 text-fuchsia-100' : 'bg-sky-500/40 text-sky-100'}`}>
                    {isMin ? `本周 ${p.done}/${p.target}` : (p.achieved ? '本周已完成' : '本周未完成')}
                  </span>
                  {doneToday && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/30 text-amber-200">今日已做</span>}
                </div>
                <div className="text-xs text-white/50">{d.estimatedMinutes}分 · {d.basePoints}积分</div>
              </div>
              {!p.achieved && !doneToday && (
                <button onClick={() => doOne(d)} className="space-btn-ghost text-sm">+ 做一次</button>
              )}
              {(p.achieved || doneToday) && <div className="text-emerald-300 text-sm">✓</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DoneTaskCard({ task: t, onUndo }: { task: any; onUndo: (id: string) => void }) {
  const ev = useLiveQuery(async () => {
    if (!t.evaluationId) return undefined;
    return await db.evaluations.get(t.evaluationId);
  }, [t.evaluationId]);
  const earlyBonus = useLiveQuery(() =>
    db.points.where('reason').equals('early_bonus').filter(p => p.refId === t.id).toArray(),
    [t.id],
  );
  const earlySum = (earlyBonus ?? []).reduce((s, p) => s + p.delta, 0);
  const tt = (t.taskType ?? 'normal') as keyof typeof TASK_TYPE_BORDER;
  const ratio = ev ? scoreRatio(ev.basePointsAtEval, ev.finalPoints, earlySum) : 0;
  const ratioCls = ratioColorClass(ratio);
  return (
    <div className={`space-card p-3 flex items-center gap-3 opacity-90 ${TASK_TYPE_BORDER[tt]}`}>
      <SubjectIcon subject={t.subject} />
      <div className="flex-1">
        <div className="font-medium line-through">{t.title}</div>
        {ev ? (
          <div className="text-xs text-white/50 mt-0.5 flex items-center gap-1">
            预期 {ev.basePointsAtEval} · 实得 <b className="text-white">{ev.finalPoints + earlySum}</b>
            <span className={`ml-1 font-bold ${ratioCls}`}>({ratio}%)</span>
            {ratio >= 130 && <span className="text-amber-300 ml-1">🌟</span>}
            {ratio >= 110 && ratio < 130 && <span className="text-sky-300 ml-1">✨</span>}
            {ratio < 60 && <span className="text-rose-300 ml-1">💧</span>}
          </div>
        ) : (
          <div className="text-xs text-white/50">等待家长评分...</div>
        )}
      </div>
      {ev ? (
        <div className={`text-2xl font-black tabular-nums ${ratioCls}`}>{ratio}%</div>
      ) : canUndoCompletion(t) ? (
        <button onClick={() => onUndo(t.id)}
          className="text-amber-300 text-xs bg-amber-500/20 px-2 py-1 rounded-lg active:scale-90">
          ↩ 撤回
        </button>
      ) : null}
    </div>
  );
}

export function SubjectIcon({ subject }: { subject: string }) {
  const map: Record<string, string> = {
    math: '🔢', chinese: '📖', english: '🔤', reading: '📚', writing: '✏️', other: '⭐',
  };
  return <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xl">{map[subject] ?? '⭐'}</div>;
}
