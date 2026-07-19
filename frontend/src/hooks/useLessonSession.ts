import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '../lib/axios';
import type { LessonMessage, LessonStartResponse, LessonRespondResponse } from '../types/plan';

interface UseLessonSessionState {
  sessionId: string | null;
  messages: LessonMessage[];
  taskComplete: boolean;
  currentTaskIndex: number;
  loading: boolean;
  error: string | null;
}

export function useLessonSession() {
  const [state, setState] = useState<UseLessonSessionState>({
    sessionId: null,
    messages: [],
    taskComplete: false,
    currentTaskIndex: 0,
    loading: false,
    error: null,
  });

  const startSession = useCallback(
    async (chapterId: string, taskIndex: number, language: string): Promise<string | null> => {
      setState((prev) => ({ ...prev, loading: true, error: null, messages: [], taskComplete: false }));
      try {
        const res = await apiClient.post<LessonStartResponse>('/api/lesson/start', {
          chapterId,
          taskIndex,
          language,
        });

        const data = res.data;
        const firstMsg: LessonMessage = {
          role: 'assistant',
          content: data.message,
          timestamp: Date.now(),
        };

        setState((prev) => ({
          ...prev,
          sessionId: data.sessionId,
          messages: [firstMsg],
          taskComplete: data.taskComplete,
          currentTaskIndex: taskIndex,
          loading: false,
        }));

        return data.sessionId;
      } catch {
        const msg = 'Lesson start karne mein dikkat aayi — dobara try karo';
        toast.error(msg);
        setState((prev) => ({ ...prev, loading: false, error: msg }));
        return null;
      }
    },
    []
  );

  const sendMessage = useCallback(async (message: string): Promise<void> => {
    setState((prev) => {
      if (!prev.sessionId) return prev;
      const userMsg: LessonMessage = { role: 'user', content: message, timestamp: Date.now() };
      return { ...prev, messages: [...prev.messages, userMsg], loading: true, error: null };
    });

    setState((prev) => {
      if (!prev.sessionId) return { ...prev, loading: false };
      return prev;
    });

    try {
      const sessionId = state.sessionId;
      if (!sessionId) return;

      const res = await apiClient.post<LessonRespondResponse>('/api/lesson/respond', {
        sessionId,
        studentMessage: message,
      });

      const data = res.data;
      const aiMsg: LessonMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, aiMsg],
        taskComplete: data.taskComplete,
        currentTaskIndex: data.nextTaskIndex,
        loading: false,
      }));
    } catch {
      const msg = 'Jawab bhejne mein dikkat — dobara try karo';
      toast.error(msg);
      setState((prev) => ({ ...prev, loading: false, error: msg }));
    }
  }, [state.sessionId]);

  const completeSession = useCallback(async (): Promise<void> => {
    if (!state.sessionId) return;
    try {
      await apiClient.post('/api/lesson/complete', { sessionId: state.sessionId });
      toast.success('Lesson complete! Bahut badhiya 🎉');
    } catch {
      // Non-fatal — session can be marked complete on next load
    }
  }, [state.sessionId]);

  const resetSession = useCallback(() => {
    setState({
      sessionId: null,
      messages: [],
      taskComplete: false,
      currentTaskIndex: 0,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    startSession,
    sendMessage,
    completeSession,
    resetSession,
  };
}
