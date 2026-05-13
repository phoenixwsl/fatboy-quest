// 统一任务管理（R2.0.1）：合并一次性 + 循环任务
// 顶部 filter：全部 / 一次性 / 每日必做 / 每周N次 / 每周一次
// 新建表单：下拉选类型，根据类型显示对应字段（日期 or 周N次）
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { newId } from '../../lib/ids';
import { todayString, addDays, formatChineseDate } from '../../lib/time';
import { extractTemplates, type TaskTemplate } from '../../lib/templates';
import { TASK_TYPE_LABEL, TASK_TYPE_BORDER, TASK_TYPE_BADGE, weeklyProgress } from '../../lib/recurrence';
import { useAppStore } from '../../store/useAppStore';
import { SubjectIcon } from '../HomePage';
import type { SubjectType, Task, TaskDefinition, TaskType } from '../../types';

type FilterKind = 'all' | 'normal' | 'daily-required' | 'weekly-min' | 'weekly-once';

const SUBJECTS: { id: SubjectType; label: string }[] = [
  { id: 'math', label: '数学' }, { id: 'chinese', label: '语文' },
  { id: 'english', label: '英语' }, { id: 'reading', label: '阅读' },
  { id: 'writing', label: '练字' }, { id: 'other', label: '其他' },
];

const TYPE_OPTIONS: { id: TaskType; label: string; desc: string }[] = [
  { id: 'normal', label: '一次性任务', desc: '指定某一天做（默认）' },
  { id: 'daily-required', label: '每日必做', desc: '每天自动出现，孩子不能删' },
  { id: 'weekly-min', label: '每周 N 次', desc: '一周至少做 N 次' },
  { id: 'weekly-once', label: '每周一次', desc: '一周任意一天做一次' },
];

export function TaskManager() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const allTasks = useLiveQuery(() => db.tasks.toArray());
  const allDefs = useLiveQuery(() => db.taskDefinitions.toArray());
  const hiddenRows = useLiveQuery(() => db.templateHidden.toArray());

  const [filter, setFilter] = useState<FilterKind>('all');
  const [showForm, setShowForm] = useState(false);

  // form state
  const [taskType, setTaskType] = useState<TaskType>('normal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState<SubjectType>('math');
  const [points, setPoints] = useState(20);
  const [minutes, setMinutes] = useState(25);
  const [date, setDate] = useState(todayString());
  const [isRequired, setIsRequired] = useState(false);
  const [weeklyMinTimes, setWeeklyMinTimes] = useState(3);

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
    const ok = await confirmModal({
      title: `从模板列表移除「${t.title}」？`,
      body: '只是隐藏模板，不影响已经创建的任务。',
      emoji: '🚫',
      tone: 'warn',
      confirmLabel: '移除',
    });
    if (!ok) return;
    await db.templateHidden.put({ title: t.title, hiddenAt: Date.now() });
  }

  async function submitNew() {
    if (!title.trim()) { toast('标题不能为空', 'warn'); return; }
    if (taskType === 'normal') {
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
        taskType: 'normal',
      };
      await db.tasks.add(t);
      toast(`✓ 已添加一次性任务${isRequired ? '（必做）' : ''}`, 'success');
    } else {
      const d: TaskDefinition = {
        id: newId('def'),
        title: title.trim(),
        description: description.trim() || undefined,
        subject,
        basePoints: Math.max(1, points),
        estimatedMinutes: Math.max(5, minutes),
        type: taskType as any,
        active: true,
        createdAt: Date.now(),
        isRequired: taskType === 'daily-required' ? true : undefined,
        weeklyMinTimes: taskType === 'weekly-min' ? Math.max(1, weeklyMinTimes) : undefined,
      };
      await db.taskDefinitions.add(d);
      toast(`✓ 已添加循环任务：${TASK_TYPE_LABEL[taskType]}`, 'success');
    }
    setTitle(''); setDescription(''); setIsRequired(false);
    setShowForm(false);
  }

  async function delTask(id: string) {
    const ok = await confirmModal({
      title: '删除这项作业？',
      body: '作业会从列表里消失，不可恢复。',
      emoji: '🗑',
      tone: 'danger',
      confirmLabel: '删除',
    });
    if (!ok) return;
    await db.tasks.delete(id);
  }
  async function delDef(d: TaskDefinition) {
    const ok = await confirmModal({
      title: `删除循环任务「${d.title}」？`,
      body: '已经生成的任务实例不受影响。\n以后不会再自动生成新实例。',
      emoji: '🗑',
      tone: 'danger',
      confirmLabel: '删除',
    });
    if (!ok) return;
    await db.taskDefinitions.delete(d.id);
  }
  async function toggleActive(d: TaskDefinition) {
    await db.taskDefinitions.update(d.id, { active: !d.active });
  }
  async function toggleRequired(t: Task) {
    await db.tasks.update(t.id, { isRequired: !t.isRequired });
  }

  // 列表展示
  const showAll = filter === 'all';
  const onceTasks = (allTasks ?? []).filter(t => (t.taskType ?? 'normal') === 'normal');
  const filteredOnce = (showAll || filter === 'normal') ? onceTasks : [];
  const dailyDefs = (allDefs ?? []).filter(d => d.type === 'daily-required');
  const weeklyMinDefs = (allDefs ?? []).filter(d => d.type === 'weekly-min');
  const weeklyOnceDefs = (allDefs ?? []).filter(d => d.type === 'weekly-once');

  return (
    <div className="min-h-full p-4 pb-24 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav('/parent/dashboard')} className="space-btn-ghost">←</button>
        <div className="text-xl font-bold flex-1">📝 任务管理</div>
        <button onClick={() => setShowForm(!showForm)} className="space-btn text-sm">
          {showForm ? '收起' : '+ 新建'}
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {(['all', 'normal', 'daily-required', 'weekly-min', 'weekly-once'] as FilterKind[]).map(k => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap ${filter === k ? 'bg-space-nebula' : 'bg-white/10'}`}>
            {k === 'all' ? '全部' : TASK_TYPE_LABEL[k as TaskType]}
          </button>
        ))}
      </div>

      {/* 新建表单 */}
      {showForm && (
        <div className="space-card p-4 mb-3">
          <div className="text-sm text-white/70 mb-2">类型</div>
          <select value={taskType} onChange={e => setTaskType(e.target.value as TaskType)}
            className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2 appearance-none cursor-pointer">
            {TYPE_OPTIONS.map(o => <option key={o.id} value={o.id} className="bg-space-card">{o.label}</option>)}
          </select>
          <div className="text-xs text-white/40 mb-3">
            {TYPE_OPTIONS.find(o => o.id === taskType)?.desc}
          </div>

          {templates.length > 0 && (
            <div className="mb-3">
              <div className="text-xs text-white/60 mb-1">📋 历史模板</div>
              <div className="flex flex-wrap gap-1">
                {templates.slice(0, 8).map(tpl => (
                  <button key={tpl.title} onClick={() => applyTemplate(tpl)}
                    onContextMenu={(e) => { e.preventDefault(); hideTemplate(tpl); }}
                    className="bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-xs">
                    {tpl.title} ×{tpl.useCount}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="标题（如：数学口算 P12）"
            className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2" />
          <input value={description} onChange={e => setDescription(e.target.value)}
            placeholder="描述（可选）"
            className="w-full px-3 py-2 bg-white/10 rounded-xl outline-none mb-2" />
          <div className="flex flex-wrap gap-1.5 mb-2">
            {SUBJECTS.map(s => (
              <button key={s.id} onClick={() => setSubject(s.id)}
                className={`px-2 py-1 rounded-lg text-xs ${subject === s.id ? 'bg-space-nebula' : 'bg-white/10'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label>
              <div className="text-xs text-white/60 mb-1">基础积分</div>
              <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white/10 rounded outline-none text-sm" />
            </label>
            <label>
              <div className="text-xs text-white/60 mb-1">预估分钟</div>
              <input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white/10 rounded outline-none text-sm" />
            </label>
          </div>

          {taskType === 'normal' && (
            <>
              <label>
                <div className="text-xs text-white/60 mb-1">日期</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-2 py-1.5 bg-white/10 rounded outline-none text-sm mb-1" />
                <div className="text-xs text-white/40 mb-2">{formatChineseDate(date)}</div>
              </label>
              <button onClick={() => setIsRequired(!isRequired)}
                className={`w-full mt-1 px-3 py-2 rounded-xl text-sm ${
                  isRequired ? 'bg-rose-500/30 ring-1 ring-rose-300/60' : 'bg-white/5'
                }`}>
                {isRequired ? '🔴 必做' : '○ 选填'}
              </button>
            </>
          )}
          {taskType === 'weekly-min' && (
            <label>
              <div className="text-xs text-white/60 mb-1">每周最少做几次</div>
              <input type="number" value={weeklyMinTimes} onChange={e => setWeeklyMinTimes(Number(e.target.value))}
                className="w-full px-2 py-1.5 bg-white/10 rounded outline-none text-sm" />
            </label>
          )}

          <button onClick={submitNew} className="space-btn w-full mt-3">+ 添加</button>
        </div>
      )}

      {/* 一次性任务列表 */}
      {(showAll || filter === 'normal') && filteredOnce.length > 0 && (
        <Section title="📝 一次性任务">
          {filteredOnce.slice(-50).reverse().map(t => (
            <div key={t.id} className="space-card p-3 mb-2 flex items-center gap-3">
              <SubjectIcon subject={t.subject} />
              <div className="flex-1">
                <div className="font-medium flex items-center gap-2 flex-wrap">
                  {t.title}
                  {t.isRequired && <span className="text-xs px-1.5 py-0.5 rounded bg-rose-500/40 text-rose-100">🔴 必做</span>}
                  {t.createdBy === 'child' && <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/30">孩子加的</span>}
                </div>
                <div className="text-xs text-white/50">{t.date} · {t.estimatedMinutes}分 · {t.basePoints || '积分待定'} · {t.status}</div>
              </div>
              <button onClick={() => toggleRequired(t)}
                className={`px-2 py-1 rounded text-xs ${t.isRequired ? 'bg-rose-500/30' : 'bg-white/10'}`}>
                {t.isRequired ? '取消必做' : '必做'}
              </button>
              <button onClick={() => delTask(t.id)} className="text-rose-400 px-2">🗑</button>
            </div>
          ))}
        </Section>
      )}

      {/* 循环：每日必做 */}
      {(showAll || filter === 'daily-required') && dailyDefs.length > 0 && (
        <Section title="🔴 每日必做">
          {dailyDefs.map(d => <DefRow key={d.id} d={d} allTasks={allTasks ?? []} onToggle={toggleActive} onDel={delDef} />)}
        </Section>
      )}

      {/* 循环：每周 N 次 */}
      {(showAll || filter === 'weekly-min') && weeklyMinDefs.length > 0 && (
        <Section title="🟣 每周 N 次">
          {weeklyMinDefs.map(d => <DefRow key={d.id} d={d} allTasks={allTasks ?? []} onToggle={toggleActive} onDel={delDef} />)}
        </Section>
      )}

      {/* 循环：每周一次 */}
      {(showAll || filter === 'weekly-once') && weeklyOnceDefs.length > 0 && (
        <Section title="🔵 每周一次">
          {weeklyOnceDefs.map(d => <DefRow key={d.id} d={d} allTasks={allTasks ?? []} onToggle={toggleActive} onDel={delDef} />)}
        </Section>
      )}

      {(allTasks?.length === 0 && allDefs?.length === 0) && (
        <div className="text-center text-white/40 mt-12">
          <div className="text-4xl">📭</div>
          <div className="mt-2">还没有任务，点右上角"+ 新建"</div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <div className="text-sm text-white/70 mb-2">{title}</div>
      {children}
    </div>
  );
}

function DefRow({ d, allTasks, onToggle, onDel }: {
  d: TaskDefinition; allTasks: Task[];
  onToggle: (d: TaskDefinition) => void; onDel: (d: TaskDefinition) => void;
}) {
  const tt = d.type as TaskType;
  const badge = TASK_TYPE_BADGE[tt];
  const p = (d.type === 'weekly-min' || d.type === 'weekly-once') ? weeklyProgress(d, allTasks) : null;
  return (
    <div className={`space-card p-3 mb-2 flex items-center gap-3 ${TASK_TYPE_BORDER[tt]} ${!d.active ? 'opacity-50' : ''}`}>
      <SubjectIcon subject={d.subject} />
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2">
          {d.title}
          {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.class}`}>{badge.label}</span>}
        </div>
        <div className="text-xs text-white/50">
          {d.estimatedMinutes}分 · {d.basePoints}积分
          {d.type === 'weekly-min' && ` · 目标 ${d.weeklyMinTimes} 次/周`}
          {p && ` · 本周 ${p.done}/${p.target} ${p.achieved ? '✓' : ''}`}
        </div>
      </div>
      <button onClick={() => onToggle(d)} className={`px-2 py-1 rounded text-xs ${d.active ? 'bg-emerald-500/30' : 'bg-white/10'}`}>
        {d.active ? '启用' : '停用'}
      </button>
      <button onClick={() => onDel(d)} className="text-rose-400 px-2">🗑</button>
    </div>
  );
}
