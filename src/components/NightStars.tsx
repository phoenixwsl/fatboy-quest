// R3.0: 原 SpaceBackground 改造而来
//   - 保留 80 颗 CSS 星点 + twinkle animation（视觉很好）
//   - 删除紫青径向渐变星云（违反 §1.6 紫青渐变禁令）
//   - 仅在夜晚时段挂载
import { useMemo } from 'react';

interface Star { x: number; y: number; size: 'small' | 'big'; delay: number; }

export function NightStars() {
  const stars = useMemo<Star[]>(() => {
    const out: Star[] = [];
    for (let i = 0; i < 80; i++) {
      out.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() > 0.7 ? 'big' : 'small',
        delay: Math.random() * 3,
      });
    }
    return out;
  }, []);

  return (
    <div className="stars-layer">
      {stars.map((s, i) => (
        <span
          key={i}
          className={`star ${s.size === 'big' ? 'big' : ''}`}
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {/* R3.0: 删掉了紫青径向渐变星云（违反 §1.6） */}
    </div>
  );
}
