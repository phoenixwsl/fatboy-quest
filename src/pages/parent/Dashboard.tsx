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
import {
  streakTrend, weeklyPointsTrend, lowestEfficiencySubject,
} from '../../lib/dashboardInsights';

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
    { label: '📝 任务管理', desc: '一次性 + 循环（一站式）', to: '/parent/tasks' },
    { label: '⭐ 待评分', desc: `${pendingReview?.length ?? 0} 项等你评分`, to: '/parent/evaluations', urgent: (pendingReview?.length ?? 0) > 0 },
    { label: '🎁 奖励商店', desc: '管理可兑换奖励', to: '/parent/shop' },
    { label: '📱 通知接收人', desc: '配置 Bark 推送', to: '/parent/recipients' },
    { label: '⚙️ 设置', desc: 'PIN / 密保 / 通知 / 重置', to: '/parent/settings' },
    { label: '📅 贡献日历', desc: '月度热力图 + 长图导出', to: '/calendar' },
    { label: '💾 数据', desc: '导出 / 导入备份', to: '/parent/data' },
  ];

  function runAnalysis() {
    // toggle: 已经显示则收起
    if (analysis) { setAnalysis(null); return; }
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

      {/* R2.4.4: 3 个核心洞察卡片 */}
      <InsightCards />

      <div className="flex gap-2 mb-3">
        <button onClick={runAnalysis} className={`flex-1 text-sm ${analysis ? 'space-btn-ghost' : 'space-btn'}`}>
          {analysis ? '▼ 收起分析' : '✨ 一键分析（本周）'}
        </button>
        <button onClick={() => setShowCharts(!showCharts)} className="space-btn-ghost flex-1 text-sm">
          {showCharts ? '▼ 收起图表' : '▶ 展开图表'}
        </button>
      </div>

      {analysis && (
        <div className="space-card p-4 mb-3 bg-gradient-to-br from-space-nebula/20 to-space-plasma/10">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold text-amber-300">本周分析</div>
            <button onClick={() => setAnalysis(null)}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 text-white text-lg flex items-center justify-center">
              ✕
            </button>
          </div>
          <pre className="text-sm whitespace-pre-wrap font-kid text-white/90 leading-relaxed">
            {analysis}
          </pre>
          <button onClick={() => setAnalysis(null)} className="space-btn-ghost w-full mt-3 text-sm">关闭</button>
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

function InsightCards() {
  const points = useLiveQuery(() => db.points.toArray());
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));

  if (!points || !allTasks || streak === undefined) return null;

  const st = streakTrend(streak ?? undefined);
  const wk = weeklyPointsTrend(points);
  const eff = lowestEfficiencySubject(allTasks);

  const subjectLabel: Record<string, string> = {
    math: '数学', chinese: '语文', english: '英语',
    reading: '阅读', writing: '练字', other: '其它',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      {/* 连击趋势 */}
      <div className="space-card p-3">
        <div className="text-xs text-white/50 mb-1">🔥 连击</div>
        <div className="text-2xl font-bold tabular-nums">
          {st.current} 天
        </div>
        <div className={`text-xs mt-1 ${
          st.status === 'growing' ? 'text-emerald-300' :
          st.status === 'broken'  ? 'text-rose-300' :
          st.status === 'stable'  ? 'text-cyan-300' : 'text-white/40'
        }`}>
          {st.status === 'growing' ? '⬆️ 在涨' :
           st.status === 'broken'  ? '⚠️ 刚断了' :
           st.status === 'stable'  ? '⏸ 平稳' : '从头开始'}
          {' · 最长 ' + st.longest}
        </div>
      </div>

      {/* 本周 vs 上周 */}
      <div className="space-card p-3">
        <div className="text-xs text-white/50 mb-1">💯 本周积分</div>
        <div className="text-2xl font-bold text-amber-300 tabular-nums">
          {wk.thisWeek}
        </div>
        <div className={`text-xs mt-1 ${
          wk.direction === 'up' ? 'text-emerald-300' :
          wk.direction === 'down' ? 'text-rose-300' : 'text-white/40'
        }`}>
          上周 {wk.lastWeek}
          {wk.direction === 'up' && ` · ⬆️ +${wk.delta}${wk.pct ? ` (${wk.pct}%)` : ''}`}
          {wk.direction === 'down' && ` · ⬇️ ${wk.delta}`}
          {wk.direction === 'flat' && ' · 持平'}
        </div>
      </div>

      {/* 学科效率 */}
      <div className="space-card p-3">
        <div className="text-xs text-white/50 mb-1">⏱ 最慢学科（近 2 周）</div>
        {eff ? (
          <>
            <div className="text-2xl font-bold text-cyan-200">
              {subjectLabel[eff.subject] ?? eff.subject}
            </div>
            <div className="text-xs mt-1 text-white/60">
              用了 {eff.totalActualMinutes} 分钟（预估 {eff.totalEstMinutes}）·
              {eff.ratio > 1 ? ` 慢 ${Math.round((eff.ratio - 1) * 100)}%` : ' 准点'}
            </div>
          </>
        ) : (
          <div className="text-sm text-white/40 mt-2">数据不足（&lt; 2 个样本）</div>
        )}
      </div>
    </div>
  );
}

