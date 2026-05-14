// 家长 Dashboard 用的 4 张小图表
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, Line, LineChart,
  PolarAngleAxis, PolarGrid, Radar, RadarChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  dailyPoints, subjectDistribution, timeAccuracy, ratingSnapshot,
} from '../../lib/charts';
import type { Evaluation, PointsEntry, Task } from '../../types';

const COLORS = ['#7c5cff', '#22d3ee', '#fbbf24', '#10b981', '#f43f5e', '#a78bfa'];

export function PointsTrendCard({ entries }: { entries: PointsEntry[] }) {
  const data = dailyPoints(entries, 14).map(d => ({
    date: d.date.slice(5),  // MM-DD
    earned: d.earned,
    spent: d.spent,
  }));
  return (
    <div className="space-card p-4">
      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>📊 14 天积分</div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3470" />
            <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} />
            <YAxis stroke="#94a3b8" fontSize={10} />
            <Tooltip contentStyle={{ background: '#141b3d', border: '1px solid #2a3470', borderRadius: 8 }} />
            <Bar dataKey="earned" fill="#7c5cff" name="赚取" />
            <Bar dataKey="spent" fill="#f43f5e" name="花费" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function SubjectPieCard({ tasks }: { tasks: Task[] }) {
  const data = subjectDistribution(tasks, 30);
  if (data.length === 0) return null;
  return (
    <div className="space-card p-4">
      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>🥧 近 30 天科目分布</div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="minutes" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={35} label={(d: any) => d.label}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: '#141b3d', border: '1px solid #2a3470', borderRadius: 8 }}
              formatter={(v: any) => `${v} 分钟`} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function TimeAccuracyCard({ tasks }: { tasks: Task[] }) {
  const data = timeAccuracy(tasks, 30);
  if (data.length === 0) return null;
  const plotData = data.map((d, i) => ({ idx: i + 1, ratio: d.ratio, title: d.taskTitle }));
  return (
    <div className="space-card p-4">
      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>📈 实际 / 预估 用时比 (1.0 = 准时)</div>
      <div style={{ height: 200 }}>
        <ResponsiveContainer>
          <LineChart data={plotData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3470" />
            <XAxis dataKey="idx" stroke="#94a3b8" fontSize={10} />
            <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 'auto']} />
            <Tooltip contentStyle={{ background: '#141b3d', border: '1px solid #2a3470', borderRadius: 8 }}
              labelFormatter={(idx: number) => plotData[Number(idx) - 1]?.title ?? ''} />
            <ReferenceLine y={1} stroke="#10b981" strokeDasharray="3 3" />
            <Line type="monotone" dataKey="ratio" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RatingRadarCard({ evaluations }: { evaluations: Evaluation[] }) {
  const { current, previous } = ratingSnapshot(evaluations, 10);
  if (current.count === 0) return null;
  const data = [
    { dim: '完成度', current: current.completion, previous: previous.completion },
    { dim: '质量', current: current.quality, previous: previous.quality },
    { dim: '态度', current: current.attitude, previous: previous.attitude },
  ];
  return (
    <div className="space-card p-4">
      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>🎯 评分维度（近 10 项 vs 上 10 项）</div>
      <div style={{ height: 220 }}>
        <ResponsiveContainer>
          <RadarChart data={data}>
            <PolarGrid stroke="#2a3470" />
            <PolarAngleAxis dataKey="dim" stroke="#94a3b8" fontSize={11} />
            <Radar name="本期" dataKey="current" stroke="#7c5cff" fill="#7c5cff" fillOpacity={0.4} />
            {previous.count > 0 && <Radar name="上期" dataKey="previous" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.2} />}
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#141b3d', border: '1px solid #2a3470', borderRadius: 8 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
