import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../db';
import { newId } from '../lib/ids';
import { todayString, currentMinuteOfDay, minutesToHHMM, formatDuration } from '../lib/time';
import { sounds } from '../lib/sounds';
import { SubjectIcon } from './HomePage';
import { useAppStore } from '../store/useAppStore';
import type { Task, ScheduleItem } from '../types';

interface BoardItem {
  uid: string;
  kind: 'task' | 'rest';
  taskId?: string;
  duration: number;
  task?: Task;
}

const REST_PRESETS = [5, 10, 15, 20, 30, 45, 60];

function SortableRow({ item, onRemove, onAdjust }: {
  item: BoardItem;
  onRemove: () => void;
  onAdjust: (delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="space-card p-3 flex items-center gap-3 mb-2 touch-none">
      <div {...attributes} {...listeners} className="cursor-move">⋮⋮</div>
      {item.kind === 'task' ? (
        <>
          <SubjectIcon subject={item.task?.subject ?? 'other'} />
          <div className="flex-1">
            <div className="font-medium">{item.task?.title}</div>
            <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              {formatDuration(item.duration)}
              {item.task?.basePoints ? ` · ${item.task.basePoints} 分` : ' · 积分待评分'}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: 'var(--state-info-soft)' }}>☕</div>
          <div className="flex-1">
            <div className="font-medium">休息一下</div>
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-faint)' }}>
              <button onClick={() => onAdjust(-5)} className="px-1 rounded" style={{ background: 'var(--surface-mist)' }}>−</button>
              <span className="px-2">{formatDuration(item.duration)}</span>
              <button onClick={() => onAdjust(5)} className="px-1 rounded" style={{ background: 'var(--surface-mist)' }}>+</button>
            </div>
          </div>
        </>
      )}
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="active:scale-90 px-2" style={{ color: 'var(--ink-faint)' }}>✕</button>
    </div>
  );
}

export function SchedulePage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const confirmModal = useAppStore(s => s.confirmModal);
  const today = todayString();
  const pendingTasks = useLiveQuery(() => db.tasks.where({ date: today, status: 'pending' }).toArray(), [today]);
  const inFlightTasks = useLiveQuery(() => db.tasks.where({ date: today }).filter(t => t.status === 'scheduled' || t.status === 'inProgress').toArray(), [today]);
  const recentSchedule = useLiveQuery(async () => {
    const all = await db.schedules.orderBy('id').reverse().limit(20).toArray();
    return all.find(s => s.lockedAt);
  });

  const [startMinute, setStartMinute] = useState<number>(currentMinuteOfDay() + 5);
  const [board, setBoard] = useState<BoardItem[]>([]);
  const [customRest, setCustomRest] = useState(30);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const locked = (inFlightTasks?.length ?? 0) > 0;

  useEffect(() => {
    if (locked) {
      toast('当前已有进行中的闯关，请先完成或重置', 'warn');
      setTimeout(() => nav('/quest'), 800);
    }
  }, [locked, toast, nav]);

  function addTask(t: Task) {
    if (board.filter(b => b.kind === 'task').length >= 5) {
      toast('一轮最多 5 项作业哦', 'warn'); sounds.play('error'); return;
    }
    setBoard([...board, { uid: newId('b'), kind: 'task', taskId: t.id, task: t, duration: t.estimatedMinutes }]);
    sounds.play('tap');
  }

  function addRest(min: number) {
    setBoard([...board, { uid: newId('b'), kind: 'rest', duration: min }]);
    sounds.play('tap');
  }

  function removeItem(uid: string) {
    setBoard(board.filter(b => b.uid !== uid));
    sounds.play('tap');
  }

  function adjustRest(uid: string, delta: number) {
    setBoard(board.map(b => b.uid === uid
      ? { ...b, duration: Math.max(5, Math.min(120, b.duration + delta)) }
      : b));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = board.findIndex(b => b.uid === active.id);
    const newIndex = board.findIndex(b => b.uid === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setBoard(arrayMove(board, oldIndex, newIndex));
  }

  async function copyFromLast() {
    if (!recentSchedule || !pendingTasks) {
      toast('还没有可参考的安排', 'warn'); return;
    }
    // 上次 schedule.items 里的任务可能不存在了，用相同 title 在 pending 里匹配
    const allPastTasks = await db.tasks.bulkGet(
      recentSchedule.items.filter(i => i.kind === 'task' && i.taskId).map(i => i.taskId!),
    );
    const newBoard: BoardItem[] = [];
    for (const it of recentSchedule.items) {
      if (it.kind === 'rest') {
        newBoard.push({ uid: newId('b'), kind: 'rest', duration: it.durationMinutes });
      } else if (it.taskId) {
        const past = allPastTasks.find(p => p?.id === it.taskId);
        if (!past) continue;
        // 在今天的 pending 里找同名 task
        const today = pendingTasks.find(p => p.title.trim() === past.title.trim() && !newBoard.find(b => b.taskId === p.id));
        if (today) {
          newBoard.push({ uid: newId('b'), kind: 'task', taskId: today.id, task: today, duration: it.durationMinutes });
        }
      }
    }
    if (newBoard.filter(b => b.kind === 'task').length === 0) {
      toast('今天的待安排里没有上次的任务', 'warn'); return;
    }
    setBoard(newBoard);
    sounds.play('unlock');
    toast(`照搬完成（${newBoard.filter(b => b.kind === 'task').length} 项 + ${newBoard.filter(b => b.kind === 'rest').length} 休息）`, 'success');
  }

  const timed = useMemo(() => {
    let cursor = startMinute;
    return board.map(b => {
      const start = cursor; const end = cursor + b.duration; cursor = end;
      return { ...b, start, end };
    });
  }, [board, startMinute]);

  const taskCount = board.filter(b => b.kind === 'task').length;

  async function lockAndStart() {
    if (taskCount === 0) { toast('至少安排 1 项作业', 'warn'); sounds.play('error'); return; }

    // R3.0.1: 加二次确认，防止误锁定（一旦锁定 task 进 scheduled，需要撤回才能改）
    const taskTitles = board
      .filter(b => b.kind === 'task' && b.task)
      .map(b => `• ${b.task!.title}（${b.duration} 分）`)
      .join('\n');
    const restCount = board.filter(b => b.kind === 'rest').length;
    const totalMin = board.reduce((s, b) => s + b.duration, 0);
    const ok = await confirmModal({
      title: `锁定 ${taskCount} 项任务的时间轴？`,
      body: `${taskTitles}${restCount > 0 ? `\n（含 ${restCount} 个休息块）` : ''}\n\n总用时约 ${totalMin} 分钟。锁定后会进入闯关。`,
      emoji: '🔒',
      tone: 'info',
      confirmLabel: '锁定并开始',
    });
    if (!ok) return;

    const items: ScheduleItem[] = timed.map(t => ({
      kind: t.kind, taskId: t.taskId, startMinute: t.start, durationMinutes: t.duration,
    }));
    const existingToday = await db.schedules.where({ date: today }).toArray();
    const nextRound = (existingToday.reduce((max, s) => Math.max(max, s.round ?? 0), 0)) + 1;
    const scheduleId = `${today}_round_${nextRound}_${Date.now()}`;
    await db.schedules.put({
      id: scheduleId, date: today, round: nextRound, items, lockedAt: Date.now(),
    });
    await db.transaction('rw', db.tasks, async () => {
      for (const b of board) {
        if (b.kind === 'task' && b.taskId) {
          await db.tasks.update(b.taskId, { status: 'scheduled' });
        }
      }
    });
    sounds.play('unlock');
    toast('时间轴锁定！准备闯关 🚀', 'success');
    nav('/quest');
  }

  if (locked) return null;

  return (
    <div className="min-h-full p-4 pb-32">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav(-1)} className="space-btn-ghost">← 返回</button>
        <div className="text-xl font-bold flex-1">📅 规划今天</div>
        {recentSchedule && (
          <button onClick={copyFromLast} className="space-btn-ghost text-sm">📋 照搬上次</button>
        )}
      </div>

      <div className="space-card p-3 mb-3">
        <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>什么时候开始？</div>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={minutesToHHMM(startMinute)}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              setStartMinute(h * 60 + m);
            }}
            className="px-3 py-2 rounded-xl outline-none text-lg"
            style={{ background: 'var(--surface-mist)' }}
          />
          <div className="text-sm" style={{ color: 'var(--ink-faint)' }}>起点时间</div>
        </div>
      </div>

      <div className="space-card p-3 mb-3">
        <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>📋 待安排（{pendingTasks?.length ?? 0}）</div>
        <div className="flex flex-wrap gap-2">
          {(pendingTasks ?? []).filter(t => !board.find(b => b.taskId === t.id)).map(t => (
            <button key={t.id} onClick={() => addTask(t)}
              className="active:scale-95 px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-transform"
              style={{ background: 'var(--surface-mist)' }}
            >
              <SubjectIcon subject={t.subject} />
              <div className="text-left">
                <div>{t.title}</div>
                <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>{t.estimatedMinutes}分</div>
              </div>
              <span className="text-space-plasma">+</span>
            </button>
          ))}
          {(pendingTasks ?? []).filter(t => !board.find(b => b.taskId === t.id)).length === 0 && (
            <div className="text-sm" style={{ color: 'var(--ink-faint)' }}>没有更多了</div>
          )}
        </div>
      </div>

      <div className="space-card p-3 mb-3">
        <div className="text-sm mb-2" style={{ color: 'var(--ink-muted)' }}>☕ 加休息块</div>
        <div className="flex gap-2 flex-wrap mb-2">
          {REST_PRESETS.map(min => (
            <button key={min} onClick={() => addRest(min)}
              className="px-3 py-1.5 rounded-xl text-sm active:scale-95 transition-transform"
              style={{ background: 'var(--state-info-soft)' }}>
              + {min}分
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span style={{ color: 'var(--ink-faint)' }}>自定义：</span>
          <button onClick={() => setCustomRest(Math.max(5, customRest - 5))} className="px-2 py-1 rounded" style={{ background: 'var(--surface-mist)' }}>−</button>
          <span className="px-3 py-1 rounded min-w-[60px] text-center" style={{ background: 'var(--surface-mist)' }}>{customRest} 分</span>
          <button onClick={() => setCustomRest(Math.min(120, customRest + 5))} className="px-2 py-1 rounded" style={{ background: 'var(--surface-mist)' }}>+</button>
          <button onClick={() => addRest(customRest)} className="ml-2 space-btn-ghost text-xs">添加</button>
        </div>
      </div>

      <div className="text-sm mb-2" style={{ color: 'var(--ink-faint)' }}>⚡ 今日时间轴 (拖把手调顺序)</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={board.map(b => b.uid)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {timed.map(item => (
              <motion.div key={item.uid} layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="text-xs ml-2 mt-2 mb-1" style={{ color: 'var(--ink-faint)' }}>
                  {minutesToHHMM(item.start)} - {minutesToHHMM(item.end)}
                </div>
                <SortableRow
                  item={item}
                  onRemove={() => removeItem(item.uid)}
                  onAdjust={(d) => adjustRest(item.uid, d)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      {board.length === 0 && (
        <div className="text-center mt-12" style={{ color: 'var(--ink-faint)' }}>
          <div className="text-4xl mb-2">👆</div>
          <div>点上面的作业添加到时间轴</div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-space-void via-space-void/80 to-transparent">
        <button onClick={lockAndStart} disabled={taskCount === 0} className="space-btn w-full text-lg animate-pulse-glow disabled:opacity-50">
          🔒 锁定时间轴 · 开始闯关 ({taskCount} 项)
        </button>
      </div>
    </div>
  );
}
