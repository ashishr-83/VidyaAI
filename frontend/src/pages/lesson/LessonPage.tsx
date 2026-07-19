import { useEffect, useRef, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useLessonSession } from '../../hooks/useLessonSession';
import type { LessonMessage } from '../../types/plan';

interface LocationState {
  chapterId?: string;
  taskIndex?: number;
  chapterName?: string;
}

export function LessonPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as LocationState;

  const {
    sessionId,
    messages,
    taskComplete,
    currentTaskIndex,
    loading,
    startSession,
    sendMessage,
    completeSession,
    resetSession,
  } = useLessonSession();

  const [input, setInput] = useState('');
  const [started, setStarted] = useState(false);
  const [allDone, setAllDone] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start session on mount if we have chapterId from route state
  useEffect(() => {
    if (!started && state.chapterId) {
      setStarted(true);
      void startSession(state.chapterId, state.taskIndex ?? 0, 'hi');
    }
  }, [started, state.chapterId, state.taskIndex, startSession]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when not loading
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !sessionId) return;
    setInput('');
    await sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleNextTask = async () => {
    if (allDone) {
      await completeSession();
      navigate('/plan');
      return;
    }
    if (!state.chapterId) return;
    resetSession();
    setStarted(false);
    setAllDone(false);
    // Navigate to same page with next task index
    navigate(`/lesson/new`, {
      state: {
        chapterId: state.chapterId,
        taskIndex: currentTaskIndex,
        chapterName: state.chapterName,
      },
      replace: true,
    });
  };

  const chapterName = state.chapterName ?? 'Lesson';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#F1F3FB',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px 20px',
          background: '#fff',
          borderBottom: '1.5px solid #E5E7EB',
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate('/plan')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#6B7280', fontSize: '18px' }}
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0D1B3E' }}>{chapterName}</div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
            Task {(state.taskIndex ?? 0) + 1} · Interactive Lesson
          </div>
        </div>
        <div
          style={{
            padding: '4px 10px',
            background: '#FFF7F0',
            border: '1px solid #FFD4B8',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#FF6B00',
          }}
        >
          VidyaAI Teacher
        </div>
      </div>

      {/* Chat messages area */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '14px' }}>
            {state.chapterId ? 'Lesson shuru ho rahi hai...' : 'Koi chapter select nahi kiya — plan pe wapas jao.'}
          </div>
        )}

        {messages.map((msg: LessonMessage, idx: number) => (
          <MessageBubble key={idx} message={msg} />
        ))}

        {loading && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <AvatarDot />
            <div
              style={{
                padding: '10px 14px',
                background: '#fff',
                borderRadius: '12px 12px 12px 4px',
                border: '1.5px solid #E5E7EB',
                fontSize: '13px',
                color: '#6B7280',
              }}
            >
              <span style={{ display: 'inline-flex', gap: '3px' }}>
                <Dot delay={0} />
                <Dot delay={0.2} />
                <Dot delay={0.4} />
              </span>
            </div>
          </div>
        )}

        {/* Task complete banner */}
        {taskComplete && !allDone && (
          <TaskCompleteBanner onNext={() => void handleNextTask()} isLast={false} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          padding: '16px 20px',
          background: '#fff',
          borderTop: '1.5px solid #E5E7EB',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '10px',
            alignItems: 'center',
            background: '#F9FAFB',
            border: '1.5px solid #E5E7EB',
            borderRadius: '12px',
            padding: '8px 12px',
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apna jawab ya sawaal yahan likhो..."
            disabled={loading || !sessionId || taskComplete}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: '14px',
              color: '#0D1B3E',
              outline: 'none',
            }}
          />
          <button
            onClick={() => void handleSend()}
            disabled={!input.trim() || loading || !sessionId || taskComplete}
            style={{
              padding: '8px 16px',
              background: !input.trim() || loading || taskComplete ? '#E5E7EB' : '#FF6B00',
              color: !input.trim() || loading || taskComplete ? '#9CA3AF' : '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: !input.trim() || loading || taskComplete ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
          >
            Bhejo
          </button>
        </div>
        <div style={{ textAlign: 'center', fontSize: '11px', color: '#9CA3AF', marginTop: '6px' }}>
          Enter dabao ya "Bhejo" pe click karo
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: LessonMessage }) {
  const isAI = message.role === 'assistant';
  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'flex-end',
        flexDirection: isAI ? 'row' : 'row-reverse',
      }}
    >
      {isAI && <AvatarDot />}
      <div
        style={{
          maxWidth: '75%',
          padding: '12px 16px',
          background: isAI ? '#fff' : '#FF6B00',
          color: isAI ? '#0D1B3E' : '#fff',
          borderRadius: isAI ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
          border: isAI ? '1.5px solid #E5E7EB' : 'none',
          fontSize: '14px',
          lineHeight: '1.6',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

function AvatarDot() {
  return (
    <div
      style={{
        width: '30px',
        height: '30px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #FF6B00, #FF8C42)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        flexShrink: 0,
      }}
    >
      🎓
    </div>
  );
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      style={{
        width: '6px',
        height: '6px',
        background: '#9CA3AF',
        borderRadius: '50%',
        display: 'inline-block',
        animation: `bounce 1.2s ${delay}s infinite`,
      }}
    />
  );
}

function TaskCompleteBanner({ onNext, isLast }: { onNext: () => void; isLast: boolean }) {
  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #10B981, #059669)',
        borderRadius: '12px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}
    >
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
          {isLast ? 'Chapter complete! 🎉' : 'Task complete! Bahut badhiya! 🌟'}
        </div>
        <div style={{ fontSize: '12px', color: '#A7F3D0', marginTop: '2px' }}>
          {isLast ? 'Tum ne ye chapter finish kar liya!' : 'Agla task karo?'}
        </div>
      </div>
      <button
        onClick={onNext}
        style={{
          padding: '8px 16px',
          background: '#fff',
          color: '#059669',
          border: 'none',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {isLast ? 'Plan pe wapas jao' : 'Agla Task →'}
      </button>
    </div>
  );
}
