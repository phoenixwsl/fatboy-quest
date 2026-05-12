import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { newId } from '../../lib/ids';
import { todayString, addDays, formatChineseDate } from '../../lib/time';
import { useAppStore } from '../../store/useAppStore';
import { SubjectIcon } from '../HomePage';
import type { SubjectType, Task } from '../../types';

const SUBJECTS: { id: SubjectType; label: string }[] = [
  { id: 'math', label: '数学' },
  { id: 'chinese', label: '语文' },
  { id: 'english', label: '英语' },
  { id: 'reading', label: '阅读' },
  { id: 'writing', label: '练字' },
  { id: 'other', label: '其他' },
];

export function TaskManager() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const [date, setDate] = useState(todayString());
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState<SubjectType>('math');
  const [points, setPoints] = useState(20);
  const [minutes, setMinutes] = useState(25);

  const tasksForDate = useLiveQuery(() => db.tasks.where({ date }).toArray(), [date]);
  const allDates = useLiveQuery(async () => {
    const all = await db.tasks.toArray();
    const set = new Set(all.map(t => t.date));
    return Array.from(set).sort();
  });

  async function addTask() {
    if (!title.trim()) { toast('标题不能为空', 'warn'); return; }
    const t: Task = {
      id: newId('task'),
      title: title.trim(),
      description: description.trim() || undefined,
      date,
      basePoints: Math.max(1, points),
      estimatedMinutes: Math.max(5, minutes),
      subject,
      status: 'pending',
      createdAt: Date.now(),
    };
    await db.tasks.add(t);
    setTitle(''); setDescription('');
    toast('✓ 已添加', 'success');
  }

  async function delTask(id: string) {
    if (!confirm('确定删除这项作业？')) return;
    await db.tasks.delete(id);
    toast('已删除', 'info');
  }

  async function duplicateFrom(srcDate: string) {
    const tasks = await db.tasks.where({ date: srcDate }).toArray();
    for (const t of tasks) {
      await db.tasks.add({
        ...t,
        id: newId('task'),
        date,
        status: 'pending',
        createdAt: Date.now(),
        completedAt: undefined,
        evaluationId: undefined,
      });
    }
    toast(`已复制 ${tasks.length} 项到 ${date}`, 'success');
  }

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold">📝 任务管理</div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">选择日期</div>
        <div className="flex gap-2 items-center mb-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="bg-white/10 px-3 py-2 rounded-xl outline-none" />
          <button onClick={() => setDate(todayString())} className="space-btn-ghost text-sm">今天</button>
          <button onClick={() => setDate(addDays(date, 1))} className="space-btn-ghost text-sm">+1 天</button>
        </div>
        <div className="text-sm text-white/50">{formatChineseDate(date)}</div>
      </div>

      <div className="space-card p-4 mb-3">
        <div className="text-sm text-white/70 mb-2">新增作业</div>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder="例如：数学口算 P12"
          className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2" />
        <input value={description} onChange={e => setDescription(e.target.value)}
          placeholder="描述（可选）"
          className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2" />
        <div className="flex flex-wrap gap-2 mb-2">
          {SUBJECTS.map(s => (
            <button key={s.id} onClick={() => setSubject(s.id)}
              className={`px-3 py-1.5 rounded-xl text-sm ${subject === s.id ? 'bg-space-nebula' : 'bg-white/10'}`}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <div className="text-xs text-white/60 mb-1">基础积分</div>
            <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none" />
          </label>
          <label className="block">
            <div className="text-xs text-white/60 mb-1">预估时长（分钟）</div>
            <input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none" />
          </label>
        </div>
        <button onClick={addTask} className="space-btn w-full mt-3">+ 添加</button>
      </div>

      {/* 复制现有日期 */}
      {allDates && allDates.length > 0 && (
        <div className="space-card p-3 mb-3">
          <div className="text-sm text-white/70 mb-2">📋 一键复制其他日期</div>
          <div className="flex flex-wrap gap-2">
            {allDates.filter(d => d !== date).slice(-7).map(d => (
              <button key={d} onClick={() => duplicateFrom(d)}
                className="bg-white/10 px-3 py-1.5 rounded-xl text-sm active:scale-95">
                ⎘ {d.slice(5)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="text-sm text-white/70 my-3">📅 {date} 的作业</div>
      <div className="space-y-2">
        {tasksForDate?.map(t => (
          <div key={t.id} className="space-card p-3 flex items-center gap-3">
            <SubjectIcon subject={t.subject} />
            <div className="flex-1">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-white/50">{t.estimatedMinutes}分 · {t.basePoints}积分 · {t.status}</div>
            </div>
            <button onClick={() => delTask(t.id)} className="text-rose-400 active:scale-90 px-2">🗑</button>
          </div>
        ))}
        {tasksForDate?.length === 0 && <div className="text-white/40 text-sm text-center py-4">这一天还没有作业</div>}
      </div>
    </div>
  );
}
