import { useState, useEffect, useCallback } from 'react';

export interface GameState {
  step: 'name' | 'jujubas' | 'mais_provavel' | 'finished' | undefined;
  name: string;
  jujubaGuess: string;
  maisProvavelAnswers: Record<string, string>;
}

const defaultState: GameState = {
  step: 'name',
  name: '',
  jujubaGuess: '',
  maisProvavelAnswers: {},
};

export function useGameProgress(roomId: string) {
  const [state, setState] = useState<GameState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`cha-casa-nova-${roomId}`);
    if (saved) {
      try {
        setState(JSON.parse(saved));
      } catch (e) {
        console.error('Erro ao ler do localStorage', e);
      }
    }
    setIsLoaded(true);
  }, [roomId]);

  const updateState = useCallback((updates: Partial<GameState>) => {
    setState((prev) => {
      const newState = { ...prev, ...updates };
      localStorage.setItem(`cha-casa-nova-${roomId}`, JSON.stringify(newState));
      return newState;
    });
  }, [roomId]);

  const removeState = useCallback(() => {
    localStorage.removeItem(`cha-casa-nova-${roomId}`);
    setState(defaultState);
  }, [roomId]);

  return { state, updateState, isLoaded, removeState };
}