import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { newId } from '../../lib/ids';
import { todayString, addDays, formatChineseDate } from '../../lib/time';
import { extractTemplates, type TaskTemplate } from '../../lib/templates';
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
  const [isRequired, setIsRequired] = useState(false);

  const tasksForDate = useLiveQuery(() => db.tasks.where({ date }).toArray(), [date]);
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const hiddenRows = useLiveQuery(() => db.templateHidden.toArray());

  const templates = (() => {
    if (!allTasks) return [];
    const hidden = new Set((hiddenRows ?? []).map(h => h.title));
    return extractTemplates(allTasks, hidden, 15);
  })();

  function applyTemplate(tpl: TaskTemplate) {
    setTitle(tpl.title);
    setDescription(tpl.description ?? '');
    setSubject(tpl.subject);
    setPoints(tpl.basePoints || 20);
    setMinutes(tpl.estimatedMinutes);
  }

  async function hideTemplate(t: TaskTemplate) {
    if (!confirm(`从模板列表里移除「${t.title}」？（不会删除历史任务）`)) return;
    await db.templateHidden.put({ title: t.title, hiddenAt: Date.now() });
    toast('模板已隐藏', 'info');
  }

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
      createdBy: 'parent',
      isRequired: isRequired || undefined,
    };
    await db.tasks.add(t);
    setTitle(''); setDescription(''); setIsRequired(false);
    toast(`✓ 已添加${isRequired ? '（必做）' : ''}`, 'success');
  }

  async function toggleRequired(taskId: string, current: boolean | undefined) {
    await db.tasks.update(taskId, { isRequired: !current });
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
        actualStartedAt: undefined,
        pausedAt: undefined,
        pauseSecondsUsed: undefined,
        pauseCount: undefined,
        extendCount: undefined,
        extendMinutesTotal: undefined,
        extendPointsSpent: undefined,
        undoCount: undefined,
        earlyBonusPoints: undefined,
      });
    }
    toast(`已复制 ${tasks.length} 项到 ${date}`, 'success');
  }

  const allDates = (() => {
    if (!allTasks) return [];
    return Array.from(new Set(allTasks.map(t => t.date))).sort();
  })();

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

      {/* 模板 */}
      {templates.length > 0 && (
        <div className="space-card p-3 mb-3">
          <div className="text-sm text-white/70 mb-2">📋 任务模板（点一下填入表单，长按移除）</div>
          <div className="flex flex-wrap gap-1.5">
            {templates.map(tpl => (
              <div key={tpl.title} className="relative group">
                <button onClick={() => applyTemplate(tpl)}
                  onContextMenu={(e) => { e.preventDefault(); hideTemplate(tpl); }}
                  className="bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5">
                  <SubjectIcon subject={tpl.subject} />
                  <span>{tpl.title}</span>
                  <span className="text-white/40">×{tpl.useCount}</span>
                </button>
                <button onClick={() => hideTemplate(tpl)}
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500/80 text-white text-xs opacity-0 group-hover:opacity-100">
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <button onClick={() => setIsRequired(!isRequired)}
          className={`w-full mt-3 px-3 py-2 rounded-xl text-sm flex items-center justify-center gap-2 ${
            isRequired ? 'bg-rose-500/30 ring-1 ring-rose-300/60' : 'bg-white/5'
          }`}>
          {isRequired ? '🔴 必做（孩子不能删）' : '○ 选填'}
        </button>
        <button onClick={addTask} className="space-btn w-full mt-3">+ 添加</button>
      </div>

      {/* 复制现有日期 */}
      {allDates.length > 0 && (
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
              <div className="font-medium flex items-center gap-2 flex-wrap">
                {t.title}
                {t.isRequired && <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/40 text-rose-100">🔴 必做</span>}
                {t.createdBy === 'child' && <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/30">孩子加的</span>}
              </div>
              <div className="text-xs text-white/50">
                {t.estimatedMinutes}分 · {t.basePoints || '积分待评分'} · {t.status}
              </div>
            </div>
            <button onClick={() => toggleRequired(t.id, t.isRequired)}
              className={`px-2 py-1 rounded text-xs ${t.isRequired ? 'bg-rose-500/30 text-rose-200' : 'bg-white/10'}`}>
              {t.isRequired ? '取消必做' : '设为必做'}
            </button>
            <button onClick={() => delTask(t.id)} className="text-rose-400 active:scale-90 px-2">🗑</button>
          </div>
        ))}
        {tasksForDate?.length === 0 && <div className="text-white/40 text-sm text-center py-4">这一天还没有作业</div>}
      </div>
    </div>
  );
}
