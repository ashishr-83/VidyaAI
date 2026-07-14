interface WeaknessBarProps {
  concept: string;
  score: number;   // 0–100, higher = weaker
  label: string;   // e.g. 'Weak' | 'Medium' | 'Strong'
}

function getBarStyle(score: number): { fill: string; labelColor: string } {
  if (score >= 70) return { fill: 'linear-gradient(90deg,#FCA5A5,#DC2626)', labelColor: 'text-red-600' };
  if (score >= 40) return { fill: 'linear-gradient(90deg,#FCD34D,#D97706)', labelColor: 'text-amber-600' };
  return { fill: 'linear-gradient(90deg,#6EE7B7,#1B8A4E)', labelColor: 'text-green' };
}

export function WeaknessBar({ concept, score, label }: WeaknessBarProps) {
  const { fill, labelColor } = getBarStyle(score);
  return (
    <div>
      <div className="flex items-center justify-between mb-[5px]">
        <span className="text-[12px] font-semibold text-gray-700">{concept}</span>
        <span className={`text-[11px] font-bold ${labelColor}`}>{label} {score}%</span>
      </div>
      <div className="h-[6px] bg-gray-100 rounded-[3px] overflow-hidden">
        <div
          className="h-full rounded-[3px]"
          style={{ width: `${score}%`, background: fill }}
        />
      </div>
    </div>
  );
}
