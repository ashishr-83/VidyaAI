type Subject = 'Physics' | 'Chemistry' | 'Maths' | 'Biology';

interface SubjectBadgeProps {
  subject: Subject;
  size?: 'sm' | 'md';
  active?: boolean;
}

const colorMap: Record<Subject, string> = {
  Physics:   'border-[rgba(57,73,171,0.25)] text-[#3949AB] bg-[rgba(57,73,171,0.06)]',
  Chemistry: 'border-[rgba(27,138,78,0.25)] text-green bg-[rgba(27,138,78,0.06)]',
  Maths:     'border-[rgba(255,107,0,0.25)] text-orange bg-[rgba(255,107,0,0.06)]',
  Biology:   'border-[rgba(107,0,255,0.25)] text-[#6B00FF] bg-[rgba(107,0,255,0.06)]',
};

export function SubjectBadge({ subject, size = 'sm', active = false }: SubjectBadgeProps) {
  const sizeClass =
    size === 'sm'
      ? 'px-[7px] py-[3px] text-[9px] font-extrabold tracking-wide rounded-[6px] border'
      : 'px-[13px] py-[5px] text-[12px] font-semibold rounded-full border-[1.5px]';

  const colorClass = active
    ? 'bg-navy-dark text-white border-navy-dark'
    : colorMap[subject];

  return (
    <span className={`inline-flex items-center whitespace-nowrap uppercase ${sizeClass} ${colorClass}`}>
      {subject}
    </span>
  );
}
