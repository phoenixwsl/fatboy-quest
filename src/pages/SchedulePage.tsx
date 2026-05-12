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
import { SubjectIcon } from './HomePage';
import { useAppStore } from '../store/useAppStore';
import type { Task, ScheduleItem } from '../types';

// 时间轴上的一条（任务卡 or 休息卡）
interface BoardItem {
  uid: string;          // 局部 id
  kind: 'task' | 'rest';
  taskId?: string;
  duration: number;
  task?: Task;
}

function SortableRow({ item, onRemove }: { item: BoardItem; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.uid });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return (
    <div ref={setNodeRef} style={style} className="space-card p-3 flex items-center gap-3 mb-2 touch-none"
      {...attributes} {...listeners}
    >
      {item.kind === 'task' ? (
        <>
          <SubjectIcon subject={item.task?.subject ?? 'other'} />
          <div className="flex-1">
            <div className="font-medium">{item.task?.title}</div>
            <div className="text-xs text-white/50">{formatDuration(item.duration)} · {item.task?.basePoints} 分</div>
          </div>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center text-xl">☕</div>
          <div className="flex-1">
            <div className="font-medium">休息一下</div>
            <div className="text-xs text-white/50">{formatDuration(item.duration)}</div>
          </div>
        </>
      )}
      <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="text-white/40 active:scale-90 px-2">✕</button>
    </div>
  );
}

export function SchedulePage() {
  const nav = useNavigate();
  const toast = useAppStore(s => s.showToast);
  const today = todayString();
  const pendingTasks = useLiveQuery(() => db.tasks.where({ date: today, status: 'pending' }).toArray(), [today]);
  const inFlightTasks = useLiveQuery(() => db.tasks.where({ date: today }).filter(t => t.status === 'scheduled' || t.status === 'inProgress').toArray(), [today]);

  const [startMinute, setStartMinute] = useState<number>(currentMinuteOfDay() + 5);
  const [board, setBoard] = useState<BoardItem[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  // 如果已经有 inFlight 的，则禁止编辑
  const locked = (inFlightTasks?.length ?? 0) > 0;

  useEffect(() => {
    if (locked) {
      toast('当前已有进行中的闯关，请先完成或重置', 'warn');
      setTimeout(() => nav('/quest'), 800);
    }
  }, [locked, toast, nav]);

  function addTask(t: Task) {
    if (board.filter(b => b.kind === 'task').length >= 5) {
      toast('一轮最多 5 项作业哦', 'warn'); return;
    }
    setBoard([...board, { uid: newId('b'), kind: 'task', taskId: t.id, task: t, duration: t.estimatedMinutes }]);
  }

  function addRest(min: number) {
    setBoard([...board, { uid: newId('b'), kind: 'rest', duration: min }]);
  }

  function removeItem(uid: string) {
    setBoard(board.filter(b => b.uid !== uid));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = board.findIndex(b => b.uid === active.id);
    const newIndex = board.findIndex(b => b.uid === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    setBoard(arrayMove(board, oldIndex, newIndex));
  }

  // 计算每项块的起止时间
  const timed = useMemo(() => {
    let cursor = startMinute;
    return board.map(b => {
      const start = cursor; const end = cursor + b.duration; cursor = end;
      return { ...b, start, end };
    });
  }, [board, startMinute]);

  const taskCount = board.filter(b => b.kind === 'task').length;

  async function lockAndStart() {
    if (taskCount === 0) { toast('至少安排 1 项作业', 'warn'); return; }
    // 写入 schedule + 把对应 task 改为 scheduled
    const items: ScheduleItem[] = timed.map(t => ({
      kind: t.kind, taskId: t.taskId, startMinute: t.start, durationMinutes: t.duration,
    }));
    const scheduleId = `${today}_round_${Date.now()}`;
    await db.schedules.put({
      id: scheduleId, date: today, round: 1, items, lockedAt: Date.now(),
    });
    await db.transaction('rw', db.tasks, async () => {
      for (const b of board) {
        if (b.kind === 'task' && b.taskId) {
          await db.tasks.update(b.taskId, { status: 'scheduled' });
        }
      }
    });
    toast('时间轴锁定！准备闯关 🚀', 'success');
    nav('/quest');
  }

  if (locked) return null;

  return (
    <div className="min-h-full p-4 pb-32 text-white">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => nav(-1)} className="space-btn-ghost">← 返回</button>
        <div className="text-xl font-bold">📅 规划今天</div>
      </div>

      <div className="space-card p-3 mb-3">
        <div className="text-sm text-white/70 mb-2">什么时候开始？</div>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={minutesToHHMM(startMinute)}
            onChange={(e) => {
              const [h, m] = e.target.value.split(':').map(Number);
              setStartMinute(h * 60 + m);
            }}
            className="bg-white/10 px-3 py-2 rounded-xl outline-none text-lg"
          />
          <div className="text-sm text-white/60">起点时间</div>
        </div>
      </div>

      <div className="space-card p-3 mb-3">
        <div className="text-sm text-white/70 mb-2">📋 待安排（{pendingTasks?.length ?? 0}）</div>
        <div className="flex flex-wrap gap-2">
          {(pendingTasks ?? []).filter(t => !board.find(b => b.taskId === t.id)).map(t => (
            <button key={t.id} onClick={() => addTask(t)}
              className="bg-white/10 hover:bg-white/20 active:scale-95 px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-transform"
            >
              <SubjectIcon subject={t.subject} />
              <div className="text-left">
                <div>{t.title}</div>
                <div className="text-xs text-white/50">{t.estimatedMinutes}分 · {t.basePoints}分</div>
              </div>
              <span className="text-space-plasma">+</span>
            </button>
          ))}
          {(pendingTasks ?? []).filter(t => !board.find(b => b.taskId === t.id)).length === 0 && (
            <div className="text-white/40 text-sm">没有更多了</div>
          )}
        </div>
      </div>

      <div className="space-card p-3 mb-3">
        <div className="text-sm text-white/70 mb-2">☕ 加休息</div>
        <div className="flex gap-2">
          {[5, 10, 15, 20].map(min => (
            <button key={min} onClick={() => addRest(min)}
              className="bg-cyan-500/20 px-3 py-1.5 rounded-xl text-sm active:scale-95 transition-transform">
              + {min}分
            </button>
          ))}
        </div>
      </div>

      <div className="text-sm text-white/60 mb-2">⚡ 今日时间轴 (拖拽调整顺序)</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={board.map(b => b.uid)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {timed.map(item => (
              <motion.div key={item.uid} layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="text-xs text-white/40 ml-2 mt-2 mb-1">
                  {minutesToHHMM(item.start)} - {minutesToHHMM(item.end)}
                </div>
                <SortableRow item={item} onRemove={() => removeItem(item.uid)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      {board.length === 0 && (
        <div className="text-center text-white/40 mt-12">
          <div className="text-4xl mb-2">👆</div>
          <div>点上面的作业添加到时间轴</div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-space-void via-space-void/80 to-transparent">
        <button onClick={lockAndStart} disabled={taskCount === 0} className="space-btn w-full text-lg animate-pulse-glow">
          🔒 锁定时间轴 · 开始闯关 ({taskCount} 项)
        </button>
      </div>
    </div>
  );
}
