// 每日打卡分享卡片 - 9:16 竖版
import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { toPng } from 'html-to-image';
import { PetAvatar } from './PetAvatar';

const QUOTES = [
  '每一天都是新的冒险',
  '今天的努力，明天的礼物',
  '坚持，是最酷的超能力',
  '一步一步，星辰大海',
  '小怪兽都被你打败啦',
  '今天，你也很棒 ✨',
  '稳稳的，慢慢来',
  '不慌不忙，节奏正好',
  '专注的样子最帅',
  '完成 > 完美',
];

interface Props {
  show: boolean;
  onClose: () => void;
  childName: string;
  petSkinId?: string;
  completed: number;
  totalMinutes: number;
  pointsEarned: number;
  streakDays: number;
}

export function DailyShareCard({
  show, onClose, childName, petSkinId, completed, totalMinutes, pointsEarned, streakDays,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const today = new Date();
  const dateStr = `${today.getMonth()+1} 月 ${today.getDate()} 日`;
  const quote = QUOTES[today.getDate() % QUOTES.length];

  async function save() {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { backgroundColor: '#0b1026', pixelRatio: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `打卡-${today.toISOString().slice(0,10)}.png`;
      a.click();
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div ref={cardRef} className="rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(160deg, #1a1f4a 0%, #4a2f6a 50%, #7c5cff 100%)',
                aspectRatio: '9 / 16',
              }}
            >
              <div className="h-full flex flex-col p-6 text-white">
                <div className="flex items-center justify-between text-xs opacity-70">
                  <span>🚀 肥仔大闯关</span>
                  <span>{dateStr}</span>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center -mt-4">
                  <PetAvatar skinId={petSkinId} size={120} state="victory" bobbing={false} />
                  <div className="mt-3 text-2xl font-black drop-shadow-lg">
                    {childName} 今日通关 ✨
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <Stat label="击败" value={`${completed}`} />
                  <Stat label="用时" value={`${totalMinutes}m`} />
                  <Stat label="积分" value={`+${pointsEarned}`} />
                  <Stat label="连击" value={`${streakDays}天`} />
                </div>

                <div className="text-center text-sm opacity-80 italic">
                  "{quote}"
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="space-btn-ghost flex-1">关闭</button>
              <button onClick={save} className="space-btn flex-1">💾 保存到相册</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-2 text-center">
      <div className="text-[10px] opacity-70">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
