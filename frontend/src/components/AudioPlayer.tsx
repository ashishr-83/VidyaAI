import { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  language: string;
  onHelpful: () => void;
  onNotHelpful: () => void;
}

function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ src, language, onHelpful, onNotHelpful }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); } else { void audio.play(); }
    setIsPlaying(!isPlaying);
  };

  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * duration;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
      {src && <audio ref={audioRef} src={src} preload="metadata" />}

      {/* Track row */}
      <div className="flex items-center gap-2.5 mb-2.5">
        <button
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-navy-dark text-white flex items-center justify-center text-[13px] flex-shrink-0 hover:opacity-90 transition-opacity"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>
        <div
          className="flex-1 h-1 bg-gray-200 rounded-full relative cursor-pointer"
          onClick={handleTrackClick}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#FF6B00,#FF9800)' }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-orange shadow-[0_0_0_3px_rgba(255,107,0,0.2)]"
            style={{ left: `${progress}%` }}
          />
        </div>
        <span className="text-[11px] text-gray-400 flex-shrink-0">
          {fmtTime(currentTime)} / {fmtTime(duration)}
        </span>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400">🇮🇳 {language}</span>
        <div className="flex gap-2">
          <button
            onClick={onHelpful}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px] border-green/30 text-green bg-green/5 hover:bg-green/10 transition-colors"
          >
            👍 Helpful
          </button>
          <button
            onClick={onNotHelpful}
            className="px-3 py-1.5 rounded-full text-[12px] font-semibold border-[1.5px] border-gray-200 text-gray-500 bg-white hover:bg-gray-50 transition-colors"
          >
            👎 Explain More
          </button>
        </div>
      </div>
    </div>
  );
}
