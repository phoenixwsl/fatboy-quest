// R3.0: 白天 / 黄昏的漂浮云（CSS 实现，无 Canvas）
// 配合 §1.4 — 在 BackgroundCanvas 里仅当 period !== 'night' 时挂载
export function Clouds() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
    </div>
  );
}
