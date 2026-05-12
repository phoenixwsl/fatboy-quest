import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { todayString } from '../../lib/time';
import { totalPoints } from '../../lib/points';
import { analyzeWeek } from '../../lib/analyze';
import {
  PointsTrendCard, SubjectPieCard, TimeAccuracyCard, RatingRadarCard,
} from '../../components/charts/ChartCards';

export function ParentDashboard() {
  const nav = useNavigate();
  const today = todayString();
  const todayTasks = useLiveQuery(() => db.tasks.where({ date: today }).toArray(), [today]);
  const pendingReview = useLiveQuery(() => db.tasks.where({ status: 'done' }).toArray());
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const points = useLiveQuery(() => db.points.toArray());
  const evaluations = useLiveQuery(() => db.evaluations.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));
  const settings = useLiveQuery(() => db.settings.get('singleton'));

  const total = points ? totalPoints(points) : 0;
  const [showCharts, setShowCharts] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  const tiles = [
    { label: '📝 一次性任务', desc: '指定日期的作业', to: '/parent/tasks' },
    { label: '🔁 循环任务', desc: '每日必做 / 每周 N 次 / 每周一次', to: '/parent/recurring' },
    { label: '⭐ 待评分', desc: `${pendingReview?.length ?? 0} 项等你评分`, to: '/parent/evaluations', urgent: (pendingReview?.length ?? 0) > 0 },
    { label: '🎁 奖励商店', desc: '管理可兑换奖励', to: '/parent/shop' },
    { label: '📱 通知接收人', desc: '配置 Bark 推送', to: '/parent/recipients' },
    { label: '⚙️ 设置', desc: 'PIN / 密保 / 通知 / 重置', to: '/parent/settings' },
    { label: '📅 贡献日历', desc: '月度热力图 + 长图导出', to: '/calendar' },
    { label: '🏆 成就馆', desc: '50 个成就，已解锁与未解锁', to: '/achievements' },
    { label: '💾 数据', desc: '导出 / 导入备份', to: '/parent/data' },
  ];

  function runAnalysis() {
    const text = analyzeWeek({
      tasks: allTasks ?? [],
      evaluations: evaluations ?? [],
      points: points ?? [],
      childName: settings?.childName ?? '肥仔',
      streakDays: streak?.currentStreak ?? 0,
    });
    setAnalysis(text);
  }

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/')} className="space-btn-ghost">← 退出家长模式</button>
        <div className="text-xl font-bold">👨‍👩 家长面板</div>
      </div>

      <div className="space-card p-4 mb-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs text-white/50">今日作业</div>
            <div className="text-2xl font-bold">{todayTasks?.length ?? 0}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">累计积分</div>
            <div className="text-2xl font-bold text-amber-300">{total}</div>
          </div>
          <div>
            <div className="text-xs text-white/50">连击</div>
            <div className="text-2xl font-bold text-rose-300">{streak?.currentStreak ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={runAnalysis} className="space-btn flex-1 text-sm">✨ 一键分析（本周）</button>
        <button onClick={() => setShowCharts(!showCharts)} className="space-btn-ghost flex-1 text-sm">
          {showCharts ? '▼ 收起图表' : '▶ 展开图表'}
        </button>
      </div>

      {analysis && (
        <div className="space-card p-4 mb-3 bg-gradient-to-br from-space-nebula/20 to-space-plasma/10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-bold text-amber-300">本周分析</div>
            <button onClick={() => setAnalysis(null)} className="text-white/40 text-xs">✕</button>
          </div>
          <pre className="text-sm whitespace-pre-wrap font-kid text-white/90 leading-relaxed">
            {analysis}
          </pre>
        </div>
      )}

      {showCharts && (
        <div className="space-y-3 mb-4">
          <PointsTrendCard entries={points ?? []} />
          <RatingRadarCard evaluations={evaluations ?? []} />
          <SubjectPieCard tasks={allTasks ?? []} />
          <TimeAccuracyCard tasks={allTasks ?? []} />
        </div>
      )}

      <div className="text-sm text-white/60 mb-2">功能入口</div>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(t => (
          <button key={t.to} onClick={() => nav(t.to)} className={`space-card p-4 text-left active:scale-95 transition-transform ${t.urgent ? 'ring-2 ring-amber-400 animate-pulse-glow' : ''}`}>
            <div className="text-base font-bold">{t.label}</div>
            <div className="text-xs text-white/50 mt-1">{t.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
