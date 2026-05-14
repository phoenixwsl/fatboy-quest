// R3.1 mecha 主题背景 — 霓虹电路网格 + 流动数据条
import { useMemo } from 'react';

export function CircuitGrid() {
  // 16 条随机流动数据线
  const lines = useMemo(() => {
    const out: { left: string; top: string; w: number; delay: number; opacity: number }[] = [];
    for (let i = 0; i < 14; i++) {
      out.push({
        left: `${(i * 71) % 100}%`,
        top: `${(i * 53) % 100}%`,
        w: 60 + Math.floor((i * 19) % 80),
        delay: (i % 5) * 0.7,
        opacity: 0.35 + ((i % 3) * 0.2),
      });
    }
    return out;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 静态网格背景 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(45,212,191,0.06) 1px, transparent 1px), ' +
            'linear-gradient(90deg, rgba(45,212,191,0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
      {/* 流动数据条 */}
      {lines.map((l, i) => (
        <span
          key={i}
          className="absolute h-px"
          style={{
            left: l.left,
            top: l.top,
            width: l.w + 'px',
            background:
              'linear-gradient(90deg, transparent, rgba(45,212,191,' + l.opacity + '), transparent)',
            animation: `circuit-flow 6s linear ${l.delay}s infinite`,
            boxShadow: '0 0 4px rgba(45,212,191,0.5)',
          }}
        />
      ))}
      <style>{`
        @keyframes circuit-flow {
          0%   { transform: translateX(-100px); opacity: 0; }
          15%  { opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translateX(100vw); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
