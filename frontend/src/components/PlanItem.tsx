type PlanItemType = 'Lecture' | 'Revision' | 'Practice';

interface PlanItemProps {
  subject: string;
  topic: string;
  duration: string;
  type: PlanItemType;
  done: boolean;
}

const typeStyle: Record<PlanItemType, string> = {
  Lecture:  'bg-[rgba(57,73,171,0.1)] text-[#3949AB]',
  Revision: 'bg-[rgba(249,168,37,0.12)] text-[#B45309]',
  Practice: 'bg-[rgba(255,107,0,0.1)] text-orange',
};

export function PlanItem({ subject, topic, duration, type, done }: PlanItemProps) {
  return (
    <div
      className={`flex items-center gap-[11px] px-3 py-2.5 rounded-[10px] mb-[7px] border-[1.5px] ${
        done ? 'border-green/30 bg-green/5' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <div
        className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${
          done ? 'bg-green text-white' : 'border-2 border-gray-300 bg-white'
        }`}
      >
        {done && '✓'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.4px]">{subject}</div>
        <div className="text-[12px] font-semibold text-gray-900 mt-0.5 truncate">{topic}</div>
      </div>
      <span className="text-[11px] text-gray-400 whitespace-nowrap flex-shrink-0">{duration}</span>
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-[5px] uppercase flex-shrink-0 ${typeStyle[type]}`}>
        {type}
      </span>
    </div>
  );
}
