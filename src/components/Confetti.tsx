import { POS_COLORS } from '../game/constants';

export function Confetti() {
  const dots = Array.from({ length: 12 }, (_, i) => ({
    color: POS_COLORS[i % 4],
    left: `${(i / 11) * 100}%`,
    delay: `${(i * 60) % 400}ms`,
    size: 6 + (i % 3) * 3,
  }));
  return (
    <div className="confetti-wrap">
      {dots.map((d, i) => (
        <div
          key={i}
          className="confetti-dot"
          style={{
            background: d.color,
            left: d.left,
            width: d.size, height: d.size,
            animationDelay: d.delay,
            top: -10,
          }}
        />
      ))}
    </div>
  );
}
