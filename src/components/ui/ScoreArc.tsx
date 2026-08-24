export function ScoreArc({ score, size = 36 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const startAngle = -200;
  const endAngle = 20;
  const totalDeg = endAngle - startAngle;
  const fillDeg = (score / 100) * totalDeg;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc = (deg: number) => ({
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  });
  const s = arc(startAngle);
  const e = arc(startAngle + fillDeg);
  const largeArc = fillDeg > 180 ? 1 : 0;
  const color = score >= 70 ? "var(--green)" : score >= 45 ? "var(--teal)" : "var(--amber)";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <path
        d={`M ${arc(startAngle).x} ${arc(startAngle).y} A ${r} ${r} 0 1 1 ${arc(endAngle).x} ${arc(endAngle).y}`}
        fill="none"
        stroke="var(--line)"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {fillDeg > 2 && (
        <path
          d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`}
          fill="none"
          stroke={color}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill={color}>
        {score}
      </text>
    </svg>
  );
}
