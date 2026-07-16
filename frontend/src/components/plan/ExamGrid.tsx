interface ExamGridProps {
  selected: string;
  onSelect: (exam: string) => void;
}

const EXAMS = [
  { id: 'JEE Mains 2026', icon: '🔬', name: 'JEE Mains', sub: 'Engineering' },
  { id: 'JEE Advanced 2026', icon: '⚛️', name: 'JEE Advanced', sub: 'IIT Entrance' },
  { id: 'NEET 2026', icon: '🩺', name: 'NEET', sub: 'Medical' },
  { id: 'CBSE Class 12', icon: '📘', name: 'CBSE 12th', sub: 'Board Exam' },
  { id: 'CBSE Class 10', icon: '📗', name: 'CBSE 10th', sub: 'Board Exam' },
  { id: 'ICSE', icon: '📙', name: 'ICSE', sub: 'Board Exam' },
  { id: 'State Board', icon: '🏫', name: 'State Board', sub: 'Board Exam' },
  { id: 'Other', icon: '📚', name: 'Other', sub: 'Custom' },
];

export default function ExamGrid({ selected, onSelect }: ExamGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '10px',
      }}
    >
      {EXAMS.map((exam) => {
        const isSelected = selected === exam.id;
        return (
          <div
            key={exam.id}
            onClick={() => onSelect(exam.id)}
            style={{
              border: `2px solid ${isSelected ? '#FF6B00' : '#E5E7EB'}`,
              background: isSelected ? 'rgba(255,107,0,0.06)' : '#fff',
              borderRadius: '12px',
              padding: '12px',
              cursor: 'pointer',
              textAlign: 'center',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>{exam.icon}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0D1B3E' }}>{exam.name}</div>
            <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>{exam.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
