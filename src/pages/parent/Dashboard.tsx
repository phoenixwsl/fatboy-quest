import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { todayString } from '../../lib/time';
import { totalPoints } from '../../lib/points';

export function ParentDashboard() {
  const nav = useNavigate();
  const today = todayString();
  const todayTasks = useLiveQuery(() => db.tasks.where({ date: today }).toArray(), [today]);
  const pendingReview = useLiveQuery(() => db.tasks.where({ status: 'done' }).toArray());
  const points = useLiveQuery(() => db.points.toArray());
  const streak = useLiveQuery(() => db.streak.get('singleton'));

  const total = points ? totalPoints(points) : 0;

  const tiles = [
    { label: '📝 任务管理', desc: '添加 / 编辑作业', to: '/parent/tasks' },
    { label: '⭐ 待评分', desc: `${pendingReview?.length ?? 0} 项等你评分`, to: '/parent/evaluations', urgent: (pendingReview?.length ?? 0) > 0 },
    { label: '🎁 奖励商店', desc: '管理可兑换奖励', to: '/parent/shop' },
    { label: '📱 通知接收人', desc: '配置 Bark 推送', to: '/parent/recipients' },
    { label: '⚙️ 设置', desc: 'PIN / 密保 / 通知', to: '/parent/settings' },
    { label: '💾 数据', desc: '导出 / 导入备份', to: '/parent/data' },
  ];

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
