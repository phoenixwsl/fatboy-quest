import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDB, ensureDefaultRecipients } from './db';
import { BackgroundCanvas, type TimePeriod, type ThemeId } from './components/BackgroundCanvas';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
import { UpdateBanner } from './components/UpdateBanner';
import { SetupWizard } from './pages/SetupWizard';
import { HomePage } from './pages/HomePage';
import { SchedulePage } from './pages/SchedulePage';
import { QuestPage } from './pages/QuestPage';
import { ShopPage } from './pages/ShopPage';
import { ParentGate } from './pages/ParentGate';
import { ParentDashboard } from './pages/parent/Dashboard';
import { TaskManager } from './pages/parent/TaskManager';
import { Evaluations } from './pages/parent/Evaluations';
import { ShopManager } from './pages/parent/ShopManager';
import { Recipients } from './pages/parent/Recipients';
import { ParentSettings } from './pages/parent/Settings';
import { DataExport } from './pages/parent/DataExport';
import { RecurringTasks } from './pages/parent/RecurringTasks';
import { generateTodayDailyTasks } from './lib/recurrence';
import { planScheduleGC } from './lib/scheduleGC';
import { installGlobalErrorLogger } from './lib/errorLogger';
import { isWeekend, weekendBgClass } from './lib/weekendMode';
import { RitualMonitor } from './components/RitualMonitor';
import { CalendarPage } from './pages/CalendarPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { AchievementsWatcher } from './components/AchievementsWatcher';
import { EvalReminderWatcher } from './components/EvalReminderWatcher';
import { StudyRoomPage } from './pages/StudyRoomPage';
import { LevelUpWatcher } from './components/LevelUpWatcher';
import { evaluateAllRules, expireSweep } from './lib/skillCards';
import { StickerWall } from './pages/StickerWall';
import { CardCabinet } from './pages/CardCabinet';

// R3.0 §1.2: 按小时数自动切换时段
function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 21 || hour < 7)  return 'night';
  if (hour >= 18 && hour < 21) return 'dusk';
  return 'day';
}

export default function App() {
  const [ready, setReady] = useState(false);
  const settings = useLiveQuery(() => db.settings.get('singleton'));
  const [period, setPeriod] = useState<TimePeriod>(() => getTimePeriod(new Date().getHours()));

  // R3.0 §1.2: 时段切换 — body[data-time-period] 触发 60s 渐变；每分钟检查一次
  useEffect(() => {
    const apply = () => {
      const p = getTimePeriod(new Date().getHours());
      document.body.dataset.timePeriod = p;
      setPeriod(p);
    };
    apply();
    const id = setInterval(apply, 60_000);
    return () => clearInterval(id);
  }, []);

  // R3.1: 主题切换 — body[data-theme] 由 settings.themeId 决定（旧 'space' → 'starry'）
  useEffect(() => {
    if (!settings) return;
    let theme = settings.themeId;
    if (!theme || theme === 'space') theme = 'starry';   // 老数据迁移
    if (!['cozy', 'starry', 'mecha'].includes(theme)) theme = 'cozy';
    document.body.dataset.theme = theme;
  }, [settings?.themeId]);

  useEffect(() => {
    (async () => {
      // R2.3.4: 全局错误收集需要在 DB 初始化后挂（写日志要 DB 就绪）
      await initializeDB();
      // R3.0.1: 老用户兜底 — 确保爸爸 / 妈妈预置 Bark key 存在
      try { await ensureDefaultRecipients(); } catch {}
      installGlobalErrorLogger();
      // 启动时补齐今日的"每日必做"实例（一次性，幂等）
      try { await generateTodayDailyTasks(db as any); } catch {}
      // R2.3.3: 清理空 / 半路废弃的 schedule
      try {
        const all = await db.schedules.toArray();
        const plan = planScheduleGC(all);
        if (plan.scheduleIdsToDelete.length > 0) {
          await db.schedules.bulkDelete(plan.scheduleIdsToDelete);
        }
      } catch {}
      // R4.3.0: 技能券引擎 - 清过期 + 扫规则发新卡
      try { await expireSweep(db); } catch {}
      try { await evaluateAllRules(db); } catch {}
      setReady(true);
    })();
  }, []);

  if (!ready || settings === undefined) {
    return (
      <div className="flex h-full items-center justify-center" style={{ color: 'var(--ink-faint)' }}>
        <div className="animate-pulse">🚀 启动中...</div>
      </div>
    );
  }

  const weekendActive = !!(settings.weekendModeEnabled !== false && isWeekend(new Date()));

  return (
    <div className={`relative h-full overflow-hidden ${weekendActive ? weekendBgClass : ''}`}>
      <BackgroundCanvas
        period={period}
        theme={
          (() => {
            const t = settings.themeId;
            if (!t || t === 'space') return 'starry';
            if (['cozy', 'starry', 'mecha'].includes(t)) return t as ThemeId;
            return 'cozy';
          })()
        }
      />
      <div className="relative z-10 h-full overflow-y-auto">
        <HashRouter>
          <Routes>
            {!settings.setupComplete ? (
              <>
                <Route path="/setup" element={<SetupWizard />} />
                <Route path="*" element={<Navigate to="/setup" replace />} />
              </>
            ) : (
              <>
                <Route path="/" element={<HomePage />} />
                <Route path="/schedule" element={<SchedulePage />} />
                <Route path="/quest" element={<QuestPage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/achievements" element={<AchievementsPage />} />
                <Route path="/stickers" element={<StickerWall />} />
                <Route path="/collection" element={<CardCabinet />} />
                <Route path="/home" element={<StudyRoomPage />} />
                <Route path="/parent" element={<ParentGate />} />
                <Route path="/parent/dashboard" element={<ParentDashboard />} />
                <Route path="/parent/tasks" element={<TaskManager />} />
                {/* R2.0.1: /parent/recurring 重定向到合并后的 tasks 页 */}
                <Route path="/parent/recurring" element={<TaskManager />} />
                <Route path="/parent/evaluations" element={<Evaluations />} />
                <Route path="/parent/shop" element={<ShopManager />} />
                <Route path="/parent/recipients" element={<Recipients />} />
                <Route path="/parent/settings" element={<ParentSettings />} />
                <Route path="/parent/data" element={<DataExport />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </HashRouter>
      </div>
      <Toast />
      <ConfirmModal />
      <UpdateBanner />
      {settings.setupComplete && <RitualMonitor />}
      {settings.setupComplete && <AchievementsWatcher />}
      {settings.setupComplete && <EvalReminderWatcher />}
      {settings.setupComplete && <LevelUpWatcher />}
    </div>
  );
}
