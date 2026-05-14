// 家长 - 循环任务管理（每日必做 / 每周 N 次 / 每周一次）
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { newId } from '../../lib/ids';
import { weeklyProgress, TASK_TYPE_LABEL } from '../../lib/recurrence';
import { useAppStore } from '../../store/useAppStore';
import { SubjectIcon } from '../HomePage';
import type { SubjectType, TaskDefinition } from '../../types';

const SUBJECTS: { id: SubjectType; label: string }[] = [
  { id: 'math', label: '数学' }, { id: 'chinese', label: '语文' },
  { id: 'english', label: '英语' }, { id: 'reading', label: '阅读' },
  { id: 'writing', label: '练字' }, { id: 'other', label: '其他' },
];

export function RecurringTasks() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const defs = useLiveQuery(() => db.taskDefinitions.toArray());
  const allTasks = useLiveQuery(() => db.tasks.toArray());

  const [type, setType] = useState<'daily-required' | 'weekly-min' | 'weekly-once'>('daily-required');
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState<SubjectType>('math');
  const [basePoints, setBasePoints] = useState(20);
  const [minutes, setMinutes] = useState(25);
  const [weeklyMinTimes, setWeeklyMinTimes] = useState(3);

  async function addDef() {
    if (!title.trim()) { toast('标题不能为空', 'warn'); return; }
    const d: TaskDefinition = {
      id: newId('def'),
      title: title.trim(),
      subject,
      basePoints: Math.max(1, basePoints),
      estimatedMinutes: Math.max(5, minutes),
      type,
      active: true,
      createdAt: Date.now(),
      isRequired: type === 'daily-required' ? true : undefined,
      weeklyMinTimes: type === 'weekly-min' ? Math.max(1, weeklyMinTimes) : undefined,
    };
    await db.taskDefinitions.add(d);
    setTitle('');
    toast(`✓ 已添加${TASK_TYPE_LABEL[type]}：${d.title}`, 'success');
  }

  async function toggleActive(d: TaskDefinition) {
    await db.taskDefinitions.update(d.id, { active: !d.active });
  }
  async function delDef(d: TaskDefinition) {
    const ok = await confirmModal({
      title: `删除「${d.title}」？`,
      body: '已生成的任务实例不受影响。\n以后不会再自动生成新实例。',
      emoji: '🗑',
      tone: 'danger',
      confirmLabel: '删除',
    });
    if (!ok) return;
    await db.taskDefinitions.delete(d.id);
  }

  const grouped = (kind: TaskDefinition['type']) => (defs ?? []).filter(d => d.type === kind);

  return (
    <div className="min-h-full p-4 pb-24">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">🔁 循环任务</div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>新建循环任务</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(['daily-required', 'weekly-min', 'weekly-once'] as const).map(k => {
            const active = type === k;
            const activeBg = k === 'daily-required'
              ? 'var(--state-danger-soft)'
              : k === 'weekly-min'
                ? 'var(--accent-soft)'
                : 'var(--state-info-soft)';
            const activeBorder = k === 'daily-required'
              ? 'var(--state-danger)'
              : k === 'weekly-min'
                ? 'var(--accent)'
                : 'var(--state-info)';
            return (
              <button key={k} onClick={() => setType(k)}
                className="px-2 py-2 rounded-xl text-xs"
                style={active
                  ? { background: activeBg, borderColor: activeBorder, borderWidth: 1, borderStyle: 'solid' }
                  : { background: 'var(--surface-mist)' }}>
                {TASK_TYPE_LABEL[k]}
              </button>
            );
          })}
        </div>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="任务标题（例如：数学口算）"
          className="w-full px-3 py-2 rounded-xl outline-none mb-2"
          style={{ background: 'var(--surface-mist)' }} />
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUBJECTS.map(s => (
            <button key={s.id} onClick={() => setSubject(s.id)}
              className="px-2 py-1 rounded-lg text-xs"
              style={{ background: subject === s.id ? 'var(--accent-soft)' : 'var(--surface-mist)' }}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <label>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>基础积分</div>
            <input type="number" value={basePoints} onChange={e => setBasePoints(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded outline-none text-sm"
              style={{ background: 'var(--surface-mist)' }} />
          </label>
          <label>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>预估分钟</div>
            <input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded outline-none text-sm"
              style={{ background: 'var(--surface-mist)' }} />
          </label>
        </div>
        {type === 'weekly-min' && (
          <label>
            <div className="text-xs mb-1" style={{ color: 'var(--ink-faint)' }}>每周最少做几次</div>
            <input type="number" value={weeklyMinTimes} onChange={e => setWeeklyMinTimes(Number(e.target.value))}
              className="w-full px-2 py-1.5 rounded outline-none text-sm"
              style={{ background: 'var(--surface-mist)' }} />
          </label>
        )}
        <button onClick={addDef} className="space-btn w-full mt-3">+ 添加</button>
      </div>

      <SectionList
        title="🔴 每日必做"
        defs={grouped('daily-required')}
        allTasks={allTasks ?? []}
        toggleActive={toggleActive}
        del={delDef}
      />
      <SectionList
        title="🟣 每周 N 次"
        defs={grouped('weekly-min')}
        allTasks={allTasks ?? []}
        toggleActive={toggleActive}
        del={delDef}
      />
      <SectionList
        title="🔵 每周一次"
        defs={grouped('weekly-once')}
        allTasks={allTasks ?? []}
        toggleActive={toggleActive}
        del={delDef}
      />
    </div>
  );
}

function SectionList({ title, defs, allTasks, toggleActive, del }: {
  title: string;
  defs: TaskDefinition[];
  allTasks: any[];
  toggleActive: (d: TaskDefinition) => void;
  del: (d: TaskDefinition) => void;
}) {
  if (defs.length === 0) return null;
  return (
    <div className="mt-4">
      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>{title}</div>
      {defs.map(d => {
        const p = (d.type === 'weekly-min' || d.type === 'weekly-once') ? weeklyProgress(d, allTasks) : null;
        return (
          <div key={d.id} className={`space-card p-3 mb-2 flex items-center gap-3 ${!d.active ? 'opacity-50' : ''}`}>
            <SubjectIcon subject={d.subject} />
            <div className="flex-1">
              <div className="font-medium">{d.title}</div>
              <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>
                {d.estimatedMinutes}分 · {d.basePoints}积分
                {d.type === 'weekly-min' && ` · 本周目标 ${d.weeklyMinTimes} 次`}
                {p && ` · 本周完成 ${p.done}/${p.target} ${p.achieved ? '✓' : ''}`}
              </div>
            </div>
            <button onClick={() => toggleActive(d)} className="px-2 py-1 rounded text-xs"
              style={{ background: d.active ? 'var(--state-success-soft)' : 'var(--surface-mist)' }}>
              {d.active ? '启用' : '停用'}
            </button>
            <button onClick={() => del(d)} className="px-1" style={{ color: 'var(--state-danger)' }}>🗑</button>
          </div>
        );
      })}
    </div>
  );
}
