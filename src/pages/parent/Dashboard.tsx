import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ArrowLeft, ClipboardList, Star, Gift, Calendar as CalendarIcon,
  Settings as SettingsIcon, Database, Smartphone, Sparkles,
  Flame, Target, Clock,
} from 'lucide-react';
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

  const tiles: Array<{
    Icon: any;
    label: string;
    desc: string;
    to: string;
    urgent?: boolean;
  }> = [
    { Icon: ClipboardList, label: '任务管理', desc: '一次性 + 循环', to: '/parent/tasks' },
    { Icon: Star, label: '待评分', desc: `${pendingReview?.length ?? 0} 项等你评分`, to: '/parent/evaluations', urgent: (pendingReview?.length ?? 0) > 0 },
    { Icon: Gift, label: '奖励商店', desc: '管理可兑换奖励', to: '/parent/shop' },
    { Icon: Smartphone, label: '通知接收人', desc: '配置 Bark 推送', to: '/parent/recipients' },
    { Icon: SettingsIcon, label: '设置', desc: 'PIN / 密保 / 通知 / 重置', to: '/parent/settings' },
    { Icon: CalendarIcon, label: '贡献日历', desc: '月度热力图 + 长图导出', to: '/calendar' },
    { Icon: Database, label: '数据', desc: '导出 / 导入备份', to: '/parent/data' },
  ];

  function runAnalysis() {
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
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => nav('/')}
          className="secondary-btn flex items-center gap-1"
          style={{ padding: '8px 14px' }}
        >
          <ArrowLeft size={16} /> 退出家长模式
        </button>
        <div className="text-xl font-bold" style={{ color: 'var(--ink)' }}>家长面板</div>
      </div>

      {/* 顶部 3 联统计 */}
      <div
        className="p-4 mb-4 rounded-[var(--radius-lg)]"
        style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-sm)' }}
      >
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>今日作业</div>
            <div className="text-2xl font-bold text-num" style={{ color: 'var(--ink)' }}>
              {todayTasks?.length ?? 0}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>累计积分</div>
            <div className="text-2xl font-bold text-num" style={{ color: 'var(--fatboy-700)' }}>
              {total}
            </div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>连击</div>
            <div className="text-2xl font-bold text-num" style={{ color: 'var(--danger)' }}>
              {streak?.currentStreak ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* R2.4.4: 3 个核心洞察卡片 */}
      <InsightCards />

      <div className="flex gap-2 mb-3">
        {analysis ? (
          <button onClick={runAnalysis} className="secondary-btn flex-1 text-sm">
            ▼ 收起分析
          </button>
        ) : (
          <button onClick={runAnalysis} className="primary-btn flex-1">
            <span className="primary-btn-bottom" aria-hidden />
            <span
              className="primary-btn-top"
              style={{ padding: '12px 18px', fontSize: 14, width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={16} /> 一键分析（本周）
            </span>
          </button>
        )}
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="secondary-btn flex-1 text-sm"
        >
          {showCharts ? '▼ 收起图表' : '▶ 展开图表'}
        </button>
      </div>

      {analysis && (
        <div
          className="p-4 mb-3 rounded-[var(--radius-lg)]"
          style={{ background: 'var(--paper)', boxShadow: 'var(--shadow-md)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-bold" style={{ color: 'var(--fatboy-700)' }}>本周分析</div>
            <button
              onClick={() => setAnalysis(null)}
              className="w-8 h-8 rounded-full active:scale-90 text-lg flex items-center justify-center"
              style={{ background: 'var(--mist)', color: 'var(--ink)' }}
            >
              ✕
            </button>
          </div>
          <pre
            className="text-sm whitespace-pre-wrap font-kid leading-relaxed"
            style={{ color: 'var(--ink)' }}
          >
            {analysis}
          </pre>
          <button onClick={() => setAnalysis(null)} className="secondary-btn w-full mt-3 text-sm">
            关闭
          </button>
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

      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>功能入口</div>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(t => (
          <button
            key={t.to}
            onClick={() => nav(t.to)}
            className="p-4 text-left active:scale-95 transition-transform rounded-[var(--radius-md)]"
            style={{
              background: 'var(--paper)',
              boxShadow: 'var(--shadow-sm)',
              ...(t.urgent ? { outline: '2px solid var(--fatboy-500)' } : {}),
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <t.Icon size={20} className="" />
              <div className="text-base font-bold" style={{ color: 'var(--ink)' }}>{t.label}</div>
            </div>
            <div className="text-xs" style={{ color: 'var(--ink-muted)' }}>{t.desc}</div>
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

  const cardStyle = {
    background: 'var(--paper)',
    boxShadow: 'var(--shadow-sm)',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      {/* 连击趋势 */}
      <div className="p-3 rounded-[var(--radius-md)]" style={cardStyle}>
        <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>
          <Flame size={14} /> 连击
        </div>
        <div className="text-2xl font-bold text-num" style={{ color: 'var(--ink)' }}>
          {st.current} 天
        </div>
        <div
          className="text-xs mt-1"
          style={{
            color:
              st.status === 'growing' ? 'var(--success)' :
              st.status === 'broken'  ? 'var(--danger)'  :
              st.status === 'stable'  ? 'var(--sky-700)' : 'var(--ink-faint)',
          }}
        >
          {st.status === 'growing' ? '⬆️ 在涨' :
           st.status === 'broken'  ? '⚠️ 刚断了' :
           st.status === 'stable'  ? '⏸ 平稳' : '从头开始'}
          {' · 最长 '}<span className="text-num">{st.longest}</span>
        </div>
      </div>

      {/* 本周 vs 上周 */}
      <div className="p-3 rounded-[var(--radius-md)]" style={cardStyle}>
        <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>
          <Target size={14} /> 本周积分
        </div>
        <div className="text-2xl font-bold text-num" style={{ color: 'var(--fatboy-700)' }}>
          {wk.thisWeek}
        </div>
        <div
          className="text-xs mt-1"
          style={{
            color:
              wk.direction === 'up'   ? 'var(--success)' :
              wk.direction === 'down' ? 'var(--danger)'  : 'var(--ink-faint)',
          }}
        >
          上周 <span className="text-num">{wk.lastWeek}</span>
          {wk.direction === 'up' && (
            <> · ⬆️ +<span className="text-num">{wk.delta}</span>{wk.pct ? ` (${wk.pct}%)` : ''}</>
          )}
          {wk.direction === 'down' && <> · ⬇️ <span className="text-num">{wk.delta}</span></>}
          {wk.direction === 'flat' && ' · 持平'}
        </div>
      </div>

      {/* 学科效率 */}
      <div className="p-3 rounded-[var(--radius-md)]" style={cardStyle}>
        <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: 'var(--ink-muted)' }}>
          <Clock size={14} /> 最慢学科（近 2 周）
        </div>
        {eff ? (
          <>
            <div className="text-2xl font-bold" style={{ color: 'var(--sky-700)' }}>
              {subjectLabel[eff.subject] ?? eff.subject}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>
              用了 <span className="text-num">{eff.totalActualMinutes}</span> 分钟
              （预估 <span className="text-num">{eff.totalEstMinutes}</span>）·
              {eff.ratio > 1 ? <> 慢 <span className="text-num">{Math.round((eff.ratio - 1) * 100)}%</span></> : ' 准点'}
            </div>
          </>
        ) : (
          <div className="text-sm mt-2" style={{ color: 'var(--ink-faint)' }}>
            数据不足（&lt; 2 个样本）
          </div>
        )}
      </div>
    </div>
  );
}
