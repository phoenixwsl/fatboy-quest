import { useMemo } from 'react';

interface Star {
  x: number;
  y: number;
  size: 'small' | 'big';
  delay: number;
}

export function SpaceBackground() {
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
      {/* 星云 */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 20% 30%, rgba(124,92,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(34,211,238,0.2) 0%, transparent 50%)',
        }}
      />
    </div>
  );
}
