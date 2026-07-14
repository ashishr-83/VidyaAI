interface MicButtonProps {
  isRecording: boolean;
  onClick: () => void;
  size?: number;
}

export function MicButton({ isRecording, onClick, size = 118 }: MicButtonProps) {
  return (
    <button
      onClick={onClick}
      className="rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer border-0"
      style={{
        width: size,
        height: size,
        background: isRecording
          ? 'linear-gradient(135deg,#DC2626,#EF4444)'
          : 'linear-gradient(135deg,#FF6B00,#FF9800)',
        boxShadow: isRecording
          ? '0 0 0 20px rgba(220,38,38,0.07), 0 0 0 42px rgba(220,38,38,0.03), 0 16px 48px rgba(220,38,38,0.35)'
          : '0 0 0 20px rgba(255,107,0,0.07), 0 0 0 42px rgba(255,107,0,0.03), 0 16px 48px rgba(255,107,0,0.35)',
      }}
    >
      {isRecording ? (
        <span className="text-white font-bold text-[14px] tracking-wide animate-pulse">● REC</span>
      ) : (
        <span style={{ fontSize: size * 0.42 }}>🎤</span>
      )}
    </button>
  );
}
