import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion } from 'framer-motion';
import {
  Trophy, Settings as SettingsIcon, Shield, Flame, Star,
  Calendar as CalendarIcon, Swords, Plus, ChevronRight, Palette, X, Home as HomeIcon,
  Gift,
} from 'lucide-react';
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
import {
  effectivePardonCards, isStreakBroken, applyPardonToStreak, WEEKLY_PARDON_QUOTA,
} from '../lib/pardon';
import { newId } from '../lib/ids';
import { todayString as todayStr } from '../lib/time';
import { ScoreDetailRow } from './QuestPage';
import { DifficultyStars } from '../components/DifficultyStars';
import { SkinPicker } from '../components/SkinPicker';
import { IdleNagBubble } from '../components/IdleNagBubble';
import { ThemePicker } from './parent/Settings';
import { SkillCardShelf } from '../components/SkillCardShelf';
import { LevelsModal } from '../components/LevelsModal';
import { getLifetimePoints } from '../lib/petStats';
import { getLevelFromLifetime, getNextLevel } from '../lib/levels';

// R3.0 §3.4: 按时段问候
function greeting(hour: number, name: string): string {
  if (hour < 6)  return `还在熬夜呢，${name}`;
  if (hour < 11) return `早上好，${name}`;
  if (hour < 14) return `中午好，${name}`;
  if (hour < 18) return `下午好，${name}`;
  if (hour < 22) return `晚上好，${name}`;
  return `该睡了，${name}`;
}

export function HomePage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const today = todayString();
  const pet = useLiveQuery(() => db.pet.get('singleton'));
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const todayTasks = useLiveQuery(() => db.tasks.where({ date: today }).toArray(), [today]);
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const todaySchedules = useLiveQuery(() => db.schedules.where({ date: today }).toArray(), [today]);
  const pointsEntries = useLiveQuery(() => db.points.toArray());
  const taskDefs = useLiveQuery(() => db.taskDefinitions.toArray());
  // R5.1.0: 心愿池机制已删
  // R4.3.0: 终身积分 derived（监听 points 表变化）
  const lifetimePoints = useLiveQuery(async () => await getLifetimePoints(db), []) ?? 0;
  const currentLevel = getLevelFromLifetime(lifetimePoints);
  const nextLevel = getNextLevel(lifetimePoints);
  // R4.4.0: 贴纸墙数量（仅当 > 0 时显示入口）
  const stickerCount = useLiveQuery(() => db.witnessMoments.count()) ?? 0;
  const [addOpen, setAddOpen] = useState(false);
  const [skinPickerOpen, setSkinPickerOpen] = useState(false);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [doneCollapsed, setDoneCollapsed] = useState(true);
  const [levelsModalOpen, setLevelsModalOpen] = useState(false);
  // R5.3.0: 卡牌数量（仅当 > 0 显示入口）
  const cardsCount = useLiveQuery(() => db.cards.count()) ?? 0;
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
  // R5.0.0: 长按 3s → 短按 1s + 视觉点亮（PIN 仍在 ParentGate）
  const startPress = () => {
    let p = 0;
    pressTimer.current = window.setInterval(() => {
      p += 100 / 10; // 1 秒
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
    const ok = await confirmModal({
      title: '撤回这一项？',
      body: '会回到"待开始"，可以重新点开始。\n已得的积分先不动。',
      emoji: '↩️',
      tone: 'warn',
      confirmLabel: '撤回',
    });
    if (!ok) return;
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
  const childName = settings?.childName ?? '肥仔';
  const hour = new Date().getHours();
  const isNight = hour >= 21 || hour < 7;

  return (
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink)' }}>
      {/* R3.0 §3.2: 顶部条 — 日期小字 + 成就按钮 + 家长门禁 */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
          {formatChineseDate(today)}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          <IconBtn
            label="成就馆" onClick={() => { sounds.play('tap'); nav('/achievements'); }}
            bg="var(--fatboy-50)" fg="var(--fatboy-700)"
          ><Trophy size={20} /></IconBtn>
          <IconBtn
            label="肥仔的书房" onClick={() => { sounds.play('tap'); nav('/home'); }}
            bg="var(--primary-soft)" fg="var(--primary-strong)"
          ><HomeIcon size={20} /></IconBtn>
          {/* R5.0.0: 商店上方图标行 */}
          <IconBtn
            label="奖励商店" onClick={() => { sounds.play('tap'); nav('/shop'); }}
            bg="var(--state-warn-soft)" fg="var(--state-warn-strong)"
          ><Gift size={20} /></IconBtn>
          {/* R3.3.1: 主题切换 — 孩子也能直接换 */}
          <IconBtn
            label="换主题" onClick={() => { sounds.play('tap'); setThemePickerOpen(true); }}
            bg="var(--sky-100)" fg="var(--sky-700)"
          ><Palette size={20} /></IconBtn>
          {/* R5.0.0: 设置 — 短按 1s + 视觉点亮（PIN 仍在 ParentGate） */}
          <div
            onPointerDown={startPress}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            aria-label="长按 1 秒进入家长设置"
            className="relative w-11 h-11 rounded-full flex items-center justify-center select-none transition-all cursor-pointer"
            style={{
              background: pressProgress > 0 ? 'var(--accent-soft)' : 'var(--mist)',
              color: pressProgress > 0 ? 'var(--accent-strong)' : 'var(--ink-muted)',
              boxShadow: pressProgress > 0 ? `0 0 ${8 + pressProgress / 8}px var(--accent)` : 'none',
              transform: pressProgress > 0 ? `scale(${1 + pressProgress / 1000})` : 'scale(1)',
            }}
          >
            <SettingsIcon size={20} />
            {pressProgress > 0 && (
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="20" fill="none" stroke="var(--accent)"
                  strokeWidth="2.5" strokeDasharray={126} strokeDashoffset={126 - (126 * pressProgress / 100)}
                  strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* R3.0 §3.2: 肥仔英雄卡片 — 白色 paper, 立体 3px, 肥仔 240×240 + 问候 + 浮动徽章 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[var(--radius-lg)] p-6 pt-7 pb-12"
        style={{
          background: 'var(--paper)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* 立体底色（深 3px） */}
        <span
          aria-hidden
          className="absolute left-0 right-0 bottom-[-3px] h-2 rounded-b-[var(--radius-lg)]"
          style={{ background: 'var(--fog)', zIndex: -1 }}
        />
        <button
          onClick={() => { sounds.play('tap'); setSkinPickerOpen(true); }}
          className="block mx-auto active:scale-95 transition-transform"
          aria-label="换肥仔角色"
        >
          <PetAvatar
            skinId={pet?.skinId}
            size={240}
            state={isNight ? 'sleeping' : 'default'}
          />
        </button>
        <h1
          className="text-xl font-bold text-center mt-3"
          style={{ color: 'var(--ink)' }}
        >
          {greeting(hour, childName)}
        </h1>
        {/* 3 个浮动徽章（§3.5）— 锚在卡片底沿 */}
        <div className="absolute left-0 right-0 bottom-[-22px] flex justify-center gap-3">
          <FloatBadge color="var(--fatboy-500)" textColor="var(--ink)" icon={<Star size={16} fill="currentColor" />}>
            {total}
          </FloatBadge>
          <FloatBadge color="var(--danger)" textColor="#fff" icon={<Flame size={16} />}>
            {streak?.currentStreak ?? 0}
          </FloatBadge>
          <FloatBadge color="var(--sky-500)" textColor="#fff" icon={<Shield size={16} />}>
            {streak?.guardCards ?? 0}
          </FloatBadge>
        </div>
      </motion.div>

      {weekendMode && (
        <div
          className="mt-6 p-3 rounded-[var(--radius-md)] text-sm font-medium"
          style={{
            background: 'var(--fatboy-50)',
            color: 'var(--fatboy-700)',
            border: '2px solid var(--fatboy-300)',
          }}
        >
          🌞 周末模式 · 完成 1 项即保持连击
        </div>
      )}

      {/* R2.5.D: 断击时显示豁免券 banner */}
      <PardonBanner />

      {/* R4.3.0 + R5.3.0: 双货币 + 等级（可点开 LevelsModal） */}
      <div
        className="mt-5 p-3 rounded-[var(--radius-md)] flex items-center gap-3"
        style={{
          background: 'var(--surface-paper)',
          border: '1px solid var(--surface-fog)',
        }}
      >
        <div className="flex-1 grid grid-cols-2 gap-2">
          <div>
            <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>可换</div>
            <div className="text-lg font-bold text-num" style={{ color: 'var(--primary-strong)' }}>⭐ {total}</div>
          </div>
          <div>
            <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>总成就</div>
            <div className="text-lg font-bold text-num" style={{ color: 'var(--accent-strong)' }}>🏆 {lifetimePoints}</div>
          </div>
        </div>
        <button
          onClick={() => { sounds.play('tap'); setLevelsModalOpen(true); }}
          className="text-right active:scale-95 transition-transform p-1.5 rounded-md"
          style={{ background: 'var(--surface-mist)' }}
          aria-label="查看段位详情"
        >
          <div className="text-[10px]" style={{ color: 'var(--ink-faint)' }}>Lv. {currentLevel.level}</div>
          <div className="text-sm font-medium" style={{ color: 'var(--ink-strong)' }}>{currentLevel.title}</div>
          {nextLevel ? (
            <div className="text-[10px] text-num" style={{ color: 'var(--ink-faint)' }}>
              还差 {nextLevel.threshold - lifetimePoints} ›
            </div>
          ) : (
            <div className="text-[10px]" style={{ color: 'var(--state-warn-strong)' }}>已满级 ›</div>
          )}
        </button>
      </div>

      {/* R4.3.0: 我的卡片 */}
      <SkillCardShelf />

      {/* R4.4.0: 贴纸墙入口 + R5.3.0: 卡牌展示柜入口 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {stickerCount > 0 && (
          <button
            onClick={() => { sounds.play('tap'); nav('/stickers'); }}
            className="p-3 rounded-[var(--radius-md)] flex items-center gap-2 active:scale-[0.99] transition-transform"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent-strong)' }}
          >
            <span className="text-xl">💛</span>
            <span className="text-sm flex-1 text-left">贴纸墙</span>
            <span className="text-xs text-num">{stickerCount}</span>
          </button>
        )}
        {cardsCount > 0 && (
          <button
            onClick={() => { sounds.play('tap'); nav('/collection'); }}
            className="p-3 rounded-[var(--radius-md)] flex items-center gap-2 active:scale-[0.99] transition-transform"
            style={{ background: 'var(--primary-soft)', color: 'var(--primary-strong)' }}
          >
            <span className="text-xl">🃏</span>
            <span className="text-sm flex-1 text-left">卡牌柜</span>
            <span className="text-xs text-num">{cardsCount}</span>
          </button>
        )}
      </div>

      {/* R5.1.0: 心愿池机制已删 */}

      {/* R2.1.1: 检测到正在进行的闯关，强引导回去 */}
      {scheduledOrInProgress.length > 0 && (
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          onClick={() => { sounds.play('tap'); nav('/quest'); }}
          className="w-full mt-5 p-4 rounded-[var(--radius-lg)] flex items-center gap-3 active:scale-95"
          style={{
            background: 'var(--danger)',
            color: '#fff',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <Swords size={28} />
          <div className="flex-1 text-left">
            <div className="font-bold">你有未完成的闯关</div>
            <div className="text-xs opacity-90">{scheduledOrInProgress.length} 个小怪还在等你</div>
          </div>
          <ChevronRight size={22} />
        </motion.button>
      )}

      {/* 今日任务区 — 主战场 */}
      <div className="mt-7">
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* R5.3.0: "今日小怪" → "今日任务" */}
          <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
            今日任务
            <span className="ml-2 text-base font-medium" style={{ color: 'var(--ink-muted)' }}>
              ({(pendingTasks.length + scheduledOrInProgress.length + doneTasks.length) || 0})
            </span>
          </h2>
        </div>

        {/* R5.3.0: 新任务 hero 大按钮（主要按钮，醒目） */}
        {childCanAdd && (
          <button
            onClick={() => { sounds.play('tap'); setAddOpen(true); }}
            className="w-full mb-3 active:scale-[0.98] transition-transform flex items-center justify-center gap-2 text-base font-bold"
            style={{
              background: 'var(--primary)',
              color: '#fff',
              padding: '14px 20px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <Plus size={22} strokeWidth={3} />
            <span>新任务</span>
          </button>
        )}

        {todayTasks && todayTasks.length === 0 && (
          <div
            className="p-8 mt-3 text-center rounded-[var(--radius-lg)]"
            style={{ background: 'var(--paper)', color: 'var(--ink-muted)', boxShadow: 'var(--shadow-sm)' }}
          >
            <div className="text-5xl mb-2">🌙</div>
            <div>今天还没有作业</div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-faint)' }}>
              让家长添加，或者你自己加一个
            </div>
          </div>
        )}

        {pendingTasks.length > 0 && (
          <div className="mt-3">
            <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>📋 待安排</div>
            <div className="space-y-2">
              {pendingTasks.map(t => {
                const tt = (t.taskType ?? 'normal');
                const badge = TASK_TYPE_BADGE[tt];
                return <PendingTaskCard key={t.id} task={t} tt={tt} badge={badge} />;
              })}
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => { sounds.play('tap'); nav('/schedule'); }}
                className="primary-btn"
              >
                <span className="primary-btn-bottom" aria-hidden />
                <span className="primary-btn-top">
                  <CalendarIcon size={20} />
                  去规划今天
                </span>
              </button>
            </div>
          </div>
        )}

        {scheduledOrInProgress.length > 0 && (
          <div className="mt-5">
            <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>⏱ 闯关中</div>
            <div className="space-y-2">
              {scheduledOrInProgress.map(t => (
                <div
                  key={t.id}
                  className="p-3 flex items-center gap-3 rounded-[var(--radius-md)]"
                  style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}
                >
                  <SubjectIcon subject={t.subject} />
                  <div className="flex-1">
                    <div className="font-medium" style={{ color: 'var(--ink)' }}>{t.title}</div>
                    <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                      {t.estimatedMinutes} 分 · <span className="text-num">{t.basePoints}</span> ⭐
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4">
              <button
                onClick={() => { sounds.play('tap'); nav('/quest'); }}
                className="primary-btn"
              >
                <span className="primary-btn-bottom" aria-hidden />
                <span className="primary-btn-top">
                  <Swords size={20} />
                  去闯关 ({scheduledOrInProgress.length})
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      <WeeklyTasksPanel defs={taskDefs ?? []} allTasks={allTasks ?? []} todayTasks={todayTasks ?? []} />

      {doneTasks.length > 0 && (
        <div className="mt-7">
          <button
            onClick={() => { sounds.play('tap'); setDoneCollapsed(c => !c); }}
            className="w-full flex items-center justify-between mb-2 active:scale-95"
            style={{ color: 'var(--success)' }}
          >
            <span className="text-sm font-medium">✓ 今日已完成任务 ({doneTasks.length})</span>
            <span className="text-xs">{doneCollapsed ? '▶ 展开' : '▼ 收起'}</span>
          </button>
          {!doneCollapsed && (
            <div className="space-y-2">
              {doneTasks.map(t => <ScoreDetailRow key={t.id} task={t} isActive={false} onUndo={undoComplete} />)}
            </div>
          )}
        </div>
      )}

      {/* R3.0 §3.3: 段位卡降级，移到 done 之后 */}
      <div
        className="mt-7 p-4 rounded-[var(--radius-lg)]"
        style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>我的段位</div>
            <div className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
              {rank.emoji} {rank.name}
            </div>
          </div>
          {next && (
            <div className="text-xs text-right" style={{ color: 'var(--ink-muted)' }}>
              距离 {next.name}<br/>
              <span className="text-num font-bold" style={{ color: 'var(--fatboy-700)' }}>
                还差 {next.minPoints - total} ⭐
              </span>
            </div>
          )}
        </div>
        <PetPanelExtras todayTasks={todayTasks ?? []} defs={taskDefs ?? []} allTasks={allTasks ?? []} />
      </div>

      {/* R3.0 §3.3: 周历条折叠 */}
      <CollapsibleHeatmap />

      <ChildAddTaskModal open={addOpen} onClose={() => setAddOpen(false)} settings={settings} />
      <SkinPicker open={skinPickerOpen} onClose={() => setSkinPickerOpen(false)} />
      <LevelsModal open={levelsModalOpen} lifetimePoints={lifetimePoints} onClose={() => setLevelsModalOpen(false)} />
      {themePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.55)' }}
          onClick={() => setThemePickerOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md"
            style={{
              background: 'var(--paper)',
              border: '1px solid var(--fog)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              padding: 20,
              color: 'var(--ink)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-bold">🎨 换主题</div>
              <button
                onClick={() => setThemePickerOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center active:scale-90"
                style={{ background: 'var(--mist)', color: 'var(--ink-muted)' }}
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>
            <ThemePicker />
            <div className="text-xs mt-3" style={{ color: 'var(--ink-faint)' }}>
              点一下就换，可以多试几个。
            </div>
          </div>
        </div>
      )}
      <IdleNagBubble enabled={settings?.idleNagEnabled !== false} />

      <div className="mt-6 text-center text-[10px]" style={{ color: 'var(--ink-faint)' }}>
        肥仔大闯关 · {APP_VERSION}
      </div>
    </div>
  );
}

// R5.0.0: 顶部图标按钮（统一封装）
function IconBtn({
  label, onClick, bg, fg, children,
}: { label: string; onClick: () => void; bg: string; fg: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="w-11 h-11 rounded-full flex items-center justify-center active:scale-90 transition-transform"
      style={{ background: bg, color: fg }}
    >
      {children}
    </button>
  );
}

// R3.0 §3.5: 浮动徽章
function FloatBadge({
  icon, children, color, textColor,
}: { icon: React.ReactNode; children: React.ReactNode; color: string; textColor: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-sm"
      style={{
        background: color,
        color: textColor,
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      {icon}
      <span className="text-num">{children}</span>
    </span>
  );
}

// R3.0 §3.3.7: 周历条折叠
function CollapsibleHeatmap() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-sm font-medium"
        style={{ color: 'var(--ink-muted)' }}
      >
        <span>本周进度</span>
        <span className="text-xs">{open ? '▼ 收起' : '▶ 展开'}</span>
      </button>
      {open && (
        <div
          className="mt-2 p-3 rounded-[var(--radius-md)]"
          style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}
        >
          <HeatmapStrip />
        </div>
      )}
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
    <div
      className={`p-3 flex items-center gap-3 rounded-[var(--radius-md)] ${TASK_TYPE_BORDER[tt as keyof typeof TASK_TYPE_BORDER]}`}
      style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}
    >
      <SubjectIcon subject={t.subject} />
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2 flex-wrap" style={{ color: 'var(--ink)' }}>
          {t.title}
          <DifficultyStars difficulty={t.difficulty} />
          {badge && <span className={`text-xs px-1.5 py-0.5 rounded ${badge.class}`}>{badge.label}</span>}
          {t.createdBy === 'child' && (
            <span className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: 'var(--sky-100)', color: 'var(--sky-700)' }}>
              我加的
            </span>
          )}
        </div>
        <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
          <span className="text-num">{t.estimatedMinutes}</span> 分
          {t.basePoints ? <> · <span className="text-num">{t.basePoints}</span> ⭐</> : ' · 积分由家长评分时给'}
        </div>
        {lastReminder && (
          <div
            className="mt-1.5 text-xs rounded-lg px-2 py-1 border-l-2"
            style={{
              color: 'var(--fatboy-700)',
              background: 'var(--fatboy-50)',
              borderLeftColor: 'var(--fatboy-500)',
            }}
          >
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
    <div className="mt-3 pt-3 space-y-1 text-xs" style={{ borderTop: '1px solid var(--fog)' }}>
      <div className="flex items-center justify-between" style={{ color: 'var(--ink-muted)' }}>
        <span>今日进度</span>
        <span style={{ color: 'var(--ink)' }}><b className="text-num">{completed}</b>/<span className="text-num">{total}</span></span>
      </div>
      {requiredRemain > 0 && (
        <div className="flex items-center justify-between" style={{ color: 'var(--danger)' }}>
          <span>必做剩余</span>
          <span><b className="text-num">{requiredRemain}</b> 项</span>
        </div>
      )}
      {weeklyDefs.length > 0 && (
        <div className="flex items-center justify-between" style={{ color: 'var(--magic)' }}>
          <span>本周任务</span>
          <span><b className="text-num">{weeklyAchieved}</b>/<span className="text-num">{weeklyDefs.length}</span></span>
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
      <div className="text-lg font-bold mb-2" style={{ color: 'var(--ink)' }}>本周任务</div>
      <div className="space-y-2">
        {weeklyDefs.map(d => {
          const p = weeklyProgress(d, allTasks);
          const isMin = d.type === 'weekly-min';
          const doneToday = hasInstanceToday(d.id, today, todayTasks);
          return (
            <div
              key={d.id}
              className="p-3 flex items-center gap-3 rounded-[var(--radius-md)]"
              style={{
                background: 'var(--paper)',
                boxShadow: 'var(--shadow-sm)',
                borderLeft: `4px solid ${isMin ? 'var(--magic)' : 'var(--sky-500)'}`,
              }}
            >
              <SubjectIcon subject={d.subject} />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2 flex-wrap" style={{ color: 'var(--ink)' }}>
                  {d.title}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: isMin ? 'rgba(156,140,217,0.18)' : 'var(--sky-100)',
                      color: isMin ? 'var(--magic)' : 'var(--sky-700)',
                    }}
                  >
                    {isMin
                      ? <>本周 <span className="text-num">{p.done}</span>/<span className="text-num">{p.target}</span></>
                      : (p.achieved ? '本周已完成' : '本周未完成')}
                  </span>
                  {doneToday && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: 'var(--fatboy-50)', color: 'var(--fatboy-700)' }}>
                      今日已做
                    </span>
                  )}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                  <span className="text-num">{d.estimatedMinutes}</span> 分 · <span className="text-num">{d.basePoints}</span> ⭐
                </div>
              </div>
              {!p.achieved && !doneToday && (
                <button onClick={() => doOne(d)} className="tag-btn">+ 做一次</button>
              )}
              {(p.achieved || doneToday) && (
                <div className="text-lg" style={{ color: 'var(--success)' }}>✓</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// R2.2.8: DoneTaskCard 已被 ScoreDetailRow (QuestPage 导出) 替换，去重保持单一来源

export function SubjectIcon({ subject }: { subject: string }) {
  const map: Record<string, string> = {
    math: '🔢', chinese: '📖', english: '🔤', reading: '📚', writing: '✏️', other: '⭐',
  };
  return (
    <div
      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
      style={{ background: 'var(--mist)' }}
    >
      {map[subject] ?? '⭐'}
    </div>
  );
}

// R2.5.D: 豁免券 banner — 断击时显示，让孩子主动决定是否用券
function PardonBanner() {
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const confirmModal = useAppStore(s => s.confirmModal);
  const toast = useAppStore(s => s.showToast);

  if (!streak) return null;

  const broken = isStreakBroken(streak);
  if (!broken) return null;

  const { remaining } = effectivePardonCards(streak);

  async function usePardon() {
    if (!streak) return;
    const ok = await confirmModal({
      title: '用 1 张豁免券保住连击？',
      body: `连击 ${streak.currentStreak} 天断了！\n用一张豁免券可以让今天算过关，保住连击。\n本周还剩 ${remaining} 张。`,
      emoji: '🛡️',
      tone: 'warn',
      confirmLabel: '用券保住',
    });
    if (!ok) return;
    try {
      const patch = applyPardonToStreak(streak, todayStr());
      await db.streak.update('singleton', patch as any);
      await db.ritualLogs.put({
        id: newId('rl'),
        kind: 'streak-pardon',
        date: todayStr(),
        shownAt: Date.now(),
      } as any);
      sounds.play('unlock');
      toast('🛡️ 豁免券已使用，连击保住了！', 'success');
    } catch (e: any) {
      toast(e?.message === 'no_cards' ? '本周豁免券已用完' : '保住失败', 'warn');
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
      className="mt-4 p-4 rounded-[var(--radius-lg)] flex items-center gap-3"
      style={{
        background: 'var(--paper)',
        boxShadow: 'var(--shadow-md)',
        border: '2px solid var(--danger)',
      }}
    >
      <div className="text-3xl">📛</div>
      <div className="flex-1">
        <div className="font-bold" style={{ color: 'var(--danger)' }}>
          连击 <span className="text-num">{streak.currentStreak}</span> 天断了
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--ink-muted)' }}>
          {remaining > 0
            ? <>用一张豁免券能救回来（本周还剩 <span className="text-num">{remaining}</span>/<span className="text-num">{WEEKLY_PARDON_QUOTA}</span>）</>
            : '本周豁免券已经用完了'}
        </div>
      </div>
      {remaining > 0 ? (
        <button onClick={usePardon} className="primary-btn">
          <span className="primary-btn-bottom" aria-hidden />
          <span className="primary-btn-top" style={{ padding: '10px 18px', fontSize: 14 }}>
            <Shield size={16} /> 用券
          </span>
        </button>
      ) : (
        <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>下周一回血</div>
      )}
    </motion.div>
  );
}
