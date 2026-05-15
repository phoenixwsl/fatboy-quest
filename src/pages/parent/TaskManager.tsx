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
import { TASK_TYPE_LABEL, TASK_TYPE_BORDER_STYLE, TASK_TYPE_BADGE_STYLE, weeklyProgress } from '../../lib/recurrence';
import { useAppStore } from '../../store/useAppStore';
import { SubjectIcon } from '../HomePage';
import { DifficultyStars } from '../../components/DifficultyStars';
import type { SubjectType, Task, TaskDefinition, TaskType, StarLevel } from '../../types';
import { DIFFICULTY_COLORS } from '../../lib/difficulty';

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
  const [difficulty, setDifficulty] = useState<StarLevel>('bronze');  // R3.2 → R4.0.0 铜/银/金

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
        difficulty,                       // R3.2
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
        difficulty,                       // R3.2
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
    <div className="min-h-full p-4 pb-24" style={{ color: 'var(--ink)' }}>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => nav('/parent/dashboard')}
          className="secondary-btn"
          style={{ padding: '8px 16px' }}
        >
          ←
        </button>
        <div className="text-xl font-bold flex-1" style={{ color: 'var(--ink)' }}>任务管理</div>
        {showForm ? (
          <button onClick={() => setShowForm(false)} className="secondary-btn text-sm" style={{ padding: '8px 16px' }}>
            收起
          </button>
        ) : (
          <button onClick={() => setShowForm(true)} className="primary-btn">
            <span className="primary-btn-bottom" aria-hidden />
            <span className="primary-btn-top" style={{ padding: '10px 18px', fontSize: 14 }}>
              + 新建
            </span>
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {(['all', 'normal', 'daily-required', 'weekly-min', 'weekly-once'] as FilterKind[]).map(k => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            aria-pressed={filter === k}
            className={`tag-btn whitespace-nowrap ${filter === k ? 'active' : ''}`}
          >
            {k === 'all' ? '全部' : TASK_TYPE_LABEL[k as TaskType]}
          </button>
        ))}
      </div>

      {/* R5.0.0: 新建表单 — 分3卡式（类型 / 基本信息 / 难度与必做） */}
      {showForm && (
        <div className="space-y-3 mb-3">
          {/* 卡 1：任务类型 */}
          <div className="space-card p-4" style={{ borderLeft: '3px solid var(--primary)' }}>
            <div className="text-sm mb-2 font-semibold" style={{ color: 'var(--ink-strong)' }}>① 任务类型</div>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(o => (
                <button key={o.id} onClick={() => setTaskType(o.id)}
                  aria-pressed={taskType === o.id}
                  className={`tag-btn text-left ${taskType === o.id ? 'active' : ''}`}
                  style={{ padding: '10px 12px' }}>
                  <div className="font-medium">{o.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: taskType === o.id ? 'var(--primary-strong)' : 'var(--ink-faint)' }}>
                    {o.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 卡 2：基本信息 */}
          <div className="space-card p-4" style={{ borderLeft: '3px solid var(--accent)' }}>
            <div className="text-sm mb-3 font-semibold" style={{ color: 'var(--ink-strong)' }}>② 基本信息</div>

            {templates.length > 0 && (
              <div className="mb-3 p-2.5 rounded-md" style={{ background: 'var(--surface-mist)' }}>
                <div className="text-[10px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>📋 从历史模板填充（长按移除）</div>
                <div className="flex flex-wrap gap-1">
                  {templates.slice(0, 8).map(tpl => (
                    <button key={tpl.title} onClick={() => applyTemplate(tpl)}
                      onContextMenu={(e) => { e.preventDefault(); hideTemplate(tpl); }}
                      className="px-2 py-1 rounded text-xs"
                      style={{ background: 'var(--surface-paper)', border: '1px solid var(--surface-fog)' }}>
                      {tpl.title} <span style={{ color: 'var(--ink-faint)' }}>×{tpl.useCount}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="📝 标题（如：数学口算 P12）"
              className="w-full px-3 py-2.5 rounded-xl outline-none mb-2 text-base"
              style={{ background: 'var(--surface-mist)' }} />
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="📌 描述（可选）"
              className="w-full px-3 py-2 rounded-xl outline-none mb-3 text-sm"
              style={{ background: 'var(--surface-mist)' }} />

            <div className="text-[11px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>科目</div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUBJECTS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSubject(s.id)}
                  aria-pressed={subject === s.id}
                  className={`tag-btn ${subject === s.id ? 'active' : ''}`}
                  style={{ padding: '6px 12px', fontSize: 13 }}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <label>
                <div className="text-[11px] mb-1" style={{ color: 'var(--ink-faint)' }}>⭐ 基础积分</div>
                <input type="number" value={points} onChange={e => setPoints(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl outline-none text-num"
                  style={{ background: 'var(--surface-mist)' }} />
              </label>
              <label>
                <div className="text-[11px] mb-1" style={{ color: 'var(--ink-faint)' }}>⏱ 预估分钟</div>
                <input type="number" value={minutes} onChange={e => setMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl outline-none text-num"
                  style={{ background: 'var(--surface-mist)' }} />
              </label>
            </div>

            {taskType === 'normal' && (
              <label className="block mt-3">
                <div className="text-[11px] mb-1" style={{ color: 'var(--ink-faint)' }}>📅 日期</div>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl outline-none text-sm"
                  style={{ background: 'var(--surface-mist)' }} />
                <div className="text-[10px] mt-1" style={{ color: 'var(--ink-faint)' }}>{formatChineseDate(date)}</div>
              </label>
            )}
            {taskType === 'weekly-min' && (
              <label className="block mt-3">
                <div className="text-[11px] mb-1" style={{ color: 'var(--ink-faint)' }}>每周最少做几次</div>
                <input type="number" value={weeklyMinTimes} onChange={e => setWeeklyMinTimes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl outline-none text-num"
                  style={{ background: 'var(--surface-mist)' }} />
              </label>
            )}
          </div>

          {/* 卡 3：难度 + 必做 */}
          <div className="space-card p-4" style={{ borderLeft: '3px solid var(--state-warn)' }}>
            <div className="text-sm mb-3 font-semibold" style={{ color: 'var(--ink-strong)' }}>③ 难度与必做</div>

            <div className="mb-3">
              <div className="text-[11px] mb-1.5" style={{ color: 'var(--ink-faint)' }}>难度（决定额外积分奖励）</div>
              <div className="flex gap-2">
                {(['bronze', 'silver', 'gold'] as StarLevel[]).map(d => {
                  const active = difficulty === d;
                  const bonus = d === 'bronze' ? '默认' : d === 'silver' ? '+5 ⭐' : '+10 ⭐';
                  const stars = d === 'bronze' ? '★' : d === 'silver' ? '★★' : '★★★';
                  const label = d === 'bronze' ? '铜' : d === 'silver' ? '银' : '金';
                  const colors = DIFFICULTY_COLORS[d];
                  return (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      aria-pressed={active}
                      className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all`}
                      style={active
                        ? { background: colors.soft, color: colors.strong, border: `2px solid ${colors.fill}`, boxShadow: `0 0 12px ${colors.fill}33` }
                        : { background: 'var(--surface-mist)', color: 'var(--ink-muted)', border: '2px solid transparent' }}
                    >
                      <div style={{ color: colors.fill, fontSize: 16 }}>{stars}</div>
                      <div className="mt-0.5">{label}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: active ? colors.strong : 'var(--ink-faint)' }}>
                        {bonus}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {taskType === 'normal' && (
              <button onClick={() => setIsRequired(!isRequired)}
                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                style={isRequired
                  ? { background: 'var(--state-danger-soft)', color: 'var(--state-danger-strong)', border: '2px solid var(--state-danger)' }
                  : { background: 'var(--surface-mist)', color: 'var(--ink-muted)', border: '2px solid transparent' }}>
                {isRequired ? '🔴 标记为必做（孩子不能删）' : '○ 选填任务（孩子可删）'}
              </button>
            )}
          </div>

          <div className="flex justify-center pt-1">
            <button onClick={submitNew} className="primary-btn">
              <span className="primary-btn-bottom" aria-hidden />
              <span className="primary-btn-top">+ 添加</span>
            </button>
          </div>
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
                  {/* R3.2: 难度星 */}
                  <DifficultyStars difficulty={t.difficulty} />
                  {t.isRequired && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--state-danger-soft)', color: 'var(--state-danger)' }}>🔴 必做</span>}
                  {t.createdBy === 'child' && <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--state-info-soft)' }}>孩子加的</span>}
                </div>
                <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t.date} · {t.estimatedMinutes}分 · {t.basePoints || '积分待定'} · {t.status}</div>
              </div>
              <button onClick={() => toggleRequired(t)}
                className="px-2 py-1 rounded text-xs"
                style={{ background: t.isRequired ? 'var(--state-danger-soft)' : 'var(--surface-mist)' }}>
                {t.isRequired ? '取消必做' : '必做'}
              </button>
              <button onClick={() => delTask(t.id)} className="px-2" style={{ color: 'var(--state-danger)' }}>🗑</button>
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
        <div className="text-center mt-12" style={{ color: 'var(--ink-faint)' }}>
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
      <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>{title}</div>
      {children}
    </div>
  );
}

function DefRow({ d, allTasks, onToggle, onDel }: {
  d: TaskDefinition; allTasks: Task[];
  onToggle: (d: TaskDefinition) => void; onDel: (d: TaskDefinition) => void;
}) {
  const tt = d.type as TaskType;
  const badge = TASK_TYPE_BADGE_STYLE[tt];
  const p = (d.type === 'weekly-min' || d.type === 'weekly-once') ? weeklyProgress(d, allTasks) : null;
  return (
    <div className={`space-card p-3 mb-2 flex items-center gap-3 ${!d.active ? 'opacity-50' : ''}`}
      style={TASK_TYPE_BORDER_STYLE[tt]}>
      <SubjectIcon subject={d.subject} />
      <div className="flex-1">
        <div className="font-medium flex items-center gap-2">
          {d.title}
          {badge && <span className="text-[10px] px-1.5 py-0.5 rounded" style={badge.style}>{badge.label}</span>}
        </div>
        <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>
          {d.estimatedMinutes}分 · {d.basePoints}积分
          {d.type === 'weekly-min' && ` · 目标 ${d.weeklyMinTimes} 次/周`}
          {p && ` · 本周 ${p.done}/${p.target} ${p.achieved ? '✓' : ''}`}
        </div>
      </div>
      <button onClick={() => onToggle(d)} className="px-2 py-1 rounded text-xs"
        style={{ background: d.active ? 'var(--state-success-soft)' : 'var(--surface-mist)' }}>
        {d.active ? '启用' : '停用'}
      </button>
      <button onClick={() => onDel(d)} className="px-2" style={{ color: 'var(--state-danger)' }}>🗑</button>
    </div>
  );
}
