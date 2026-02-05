import { useState, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useUndoRedo<T>(initialState: T) {
  // Helper function for deep cloning state
  const deepCopy = (data: T): T => {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch (e) {
      logger.error("Error deep copying state", e);
      return data; // Fallback to shallow copy on error
    }
  };

  const [state, setState] = useState<UndoRedoState<T>>({
    past: [],
    present: deepCopy(initialState),
    future: [],
  });

  const canUndo = state.past.length > 0;
  const canRedo = state.future.length > 0;

  const undo = useCallback(() => {
    if (canUndo) {
      setState(currentState => {
        const previous = currentState.past[currentState.past.length - 1];
        const newPast = currentState.past.slice(0, currentState.past.length - 1);
        
        return {
          past: newPast,
          present: deepCopy(previous),
          future: [deepCopy(currentState.present), ...currentState.future],
        };
      });
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setState(currentState => {
        const next = currentState.future[0];
        const newFuture = currentState.future.slice(1);
        
        return {
          past: [...currentState.past, deepCopy(currentState.present)],
          present: deepCopy(next),
          future: newFuture,
        };
      });
    }
  }, [canRedo]);

  const set = useCallback((newState: T) => {
    setState(currentState => {
      // Prevent adding identical state to the history
      if (JSON.stringify(currentState.present) === JSON.stringify(newState)) {
        return currentState;
      }


      const newStateObj = {
        past: [...currentState.past, deepCopy(currentState.present)],
        present: deepCopy(newState),
        future: [],
      };

      return newStateObj;
    });
  }, []);

  const reset = useCallback((newState: T) => {
    setState({
      past: [],
      present: deepCopy(newState),
      future: [],
    });
  }, []);

  return {
    state: state.present,
    set,
    reset,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
