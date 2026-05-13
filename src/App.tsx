import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, initializeDB } from './db';
import { SpaceBackground } from './components/SpaceBackground';
import { Toast } from './components/Toast';
import { ConfirmModal } from './components/ConfirmModal';
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
import { isWeekend, weekendBgClass } from './lib/weekendMode';
import { RitualMonitor } from './components/RitualMonitor';
import { CalendarPage } from './pages/CalendarPage';
import { AchievementsPage } from './pages/AchievementsPage';
import { AchievementsWatcher } from './components/AchievementsWatcher';

export default function App() {
  const [ready, setReady] = useState(false);
  const settings = useLiveQuery(() => db.settings.get('singleton'));

  useEffect(() => {
    (async () => {
      await initializeDB();
      // 启动时补齐今日的"每日必做"实例（一次性，幂等）
      try { await generateTodayDailyTasks(db as any); } catch {}
      setReady(true);
    })();
  }, []);

  if (!ready || settings === undefined) {
    return (
      <div className="flex h-full items-center justify-center text-white/60">
        <div className="animate-pulse">🚀 启动中...</div>
      </div>
    );
  }

  const weekendActive = !!(settings.weekendModeEnabled !== false && isWeekend(new Date()));

  return (
    <div className={`relative h-full overflow-hidden ${weekendActive ? weekendBgClass : ''}`}>
      <SpaceBackground />
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
      {settings.setupComplete && <RitualMonitor />}
      {settings.setupComplete && <AchievementsWatcher />}
    </div>
  );
}
