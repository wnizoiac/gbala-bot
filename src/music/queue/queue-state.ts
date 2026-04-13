export interface QueueItem {
  id: string;
  trackId: string;
  title: string;
  duration?: number;
  filePath: string;
  requestedBy: string;
  addedAt: number;
}

export type LoopMode = 'none' | 'track' | 'queue';

export interface QueueState {
  current: QueueItem | null;
  items: QueueItem[];
  loopMode: LoopMode;
}

export type QueueErrorCode =
  | 'QUEUE_EMPTY'
  | 'POSITION_OUT_OF_RANGE'
  | 'INVALID_MOVE'
  | 'NO_CURRENT_TRACK';

export interface QueueOperationError {
  code: QueueErrorCode;
  message: string;
}

export type QueueOperationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: QueueOperationError };

export function createQueueState(): QueueState {
  return {
    current: null,
    items: [],
    loopMode: 'none'
  };
}

export function cloneQueueState(state: QueueState): QueueState {
  return {
    current: state.current ? { ...state.current } : null,
    items: state.items.map((item) => ({ ...item })),
    loopMode: state.loopMode
  };
}

export function queueSize(state: QueueState): number {
  return state.current ? state.items.length + 1 : state.items.length;
}

export function isQueueEmpty(state: QueueState): boolean {
  return !state.current && state.items.length === 0;
}

export function queueToArray(state: QueueState): QueueItem[] {
  return state.current ? [state.current, ...state.items] : [...state.items];
}

export function enqueueItem(state: QueueState, item: QueueItem): QueueState {
  return {
    ...cloneQueueState(state),
    items: [...state.items, { ...item }]
  };
}

export function setQueueLoopMode(state: QueueState, loopMode: LoopMode): QueueState {
  return {
    ...cloneQueueState(state),
    loopMode
  };
}

export function removeItemAt(
  state: QueueState,
  position: number
): QueueOperationResult<{ state: QueueState; removed: QueueItem }> {
  if (position < 1 || position > state.items.length) {
    return {
      ok: false,
      error: {
        code: 'POSITION_OUT_OF_RANGE',
        message: 'Posicao invalida para remocao na fila.'
      }
    };
  }

  const nextState = cloneQueueState(state);
  const removed = nextState.items.splice(position - 1, 1)[0];

  if (!removed) {
    return {
      ok: false,
      error: {
        code: 'POSITION_OUT_OF_RANGE',
        message: 'Posicao invalida para remocao na fila.'
      }
    };
  }

  return {
    ok: true,
    value: {
      state: nextState,
      removed
    }
  };
}

export function moveQueueItem(
  state: QueueState,
  from: number,
  to: number
): QueueOperationResult<QueueState> {
  if (from < 1 || to < 1 || from > state.items.length || to > state.items.length) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MOVE',
        message: 'Posicoes invalidas para mover item na fila.'
      }
    };
  }

  if (from === to) {
    return {
      ok: true,
      value: cloneQueueState(state)
    };
  }

  const nextState = cloneQueueState(state);
  const [item] = nextState.items.splice(from - 1, 1);

  if (!item) {
    return {
      ok: false,
      error: {
        code: 'INVALID_MOVE',
        message: 'Posicoes invalidas para mover item na fila.'
      }
    };
  }

  nextState.items.splice(to - 1, 0, item);

  return {
    ok: true,
    value: nextState
  };
}

export function shuffleQueue(state: QueueState, randomValues?: number[]): QueueState {
  const nextState = cloneQueueState(state);
  const items = [...nextState.items];
  let randomIndex = 0;

  for (let index = items.length - 1; index > 0; index -= 1) {
    const source = randomValues?.[randomIndex] ?? Math.random();
    randomIndex += 1;
    const targetIndex = Math.floor(source * (index + 1));
    const temp = items[index];

    if (!temp) {
      continue;
    }

    const target = items[targetIndex];

    if (!target) {
      continue;
    }

    items[index] = target;
    items[targetIndex] = temp;
  }

  return {
    ...nextState,
    items
  };
}

export function clearQueueState(state: QueueState): QueueState {
  return {
    ...cloneQueueState(state),
    current: null,
    items: []
  };
}

export function discardCurrentTrack(
  state: QueueState
): QueueOperationResult<{ state: QueueState; removed: QueueItem; current: QueueItem | null }> {
  if (!state.current) {
    return {
      ok: false,
      error: {
        code: 'NO_CURRENT_TRACK',
        message: 'Nao existe faixa atual para descartar.'
      }
    };
  }

  const [nextCurrent, ...rest] = state.items.map((item) => ({ ...item }));

  return {
    ok: true,
    value: {
      removed: { ...state.current },
      current: nextCurrent ?? null,
      state: {
        current: nextCurrent ?? null,
        items: rest,
        loopMode: state.loopMode
      }
    }
  };
}

export function advanceQueue(
  state: QueueState
): QueueOperationResult<{ state: QueueState; previous: QueueItem | null; current: QueueItem | null }> {
  if (!state.current && state.items.length === 0) {
    return {
      ok: false,
      error: {
        code: 'QUEUE_EMPTY',
        message: 'Nao ha itens na fila.'
      }
    };
  }

  if (!state.current && state.items.length > 0) {
    const [nextCurrent, ...rest] = state.items;

    if (!nextCurrent) {
      return {
        ok: false,
        error: {
          code: 'QUEUE_EMPTY',
          message: 'Nao ha itens na fila.'
        }
      };
    }

    return {
      ok: true,
      value: {
        previous: null,
        current: nextCurrent,
        state: {
          ...cloneQueueState(state),
          current: nextCurrent,
          items: rest
        }
      }
    };
  }

  if (!state.current) {
    return {
      ok: false,
      error: {
        code: 'NO_CURRENT_TRACK',
        message: 'Nao existe faixa atual para avancar.'
      }
    };
  }

  if (state.loopMode === 'track') {
    return {
      ok: true,
      value: {
        previous: state.current,
        current: { ...state.current },
        state: cloneQueueState(state)
      }
    };
  }

  const items = state.items.map((item) => ({ ...item }));

  if (state.loopMode === 'queue') {
    items.push({ ...state.current });
  }

  const [nextCurrent, ...rest] = items;

  return {
    ok: true,
    value: {
      previous: state.current,
      current: nextCurrent ?? null,
      state: {
        current: nextCurrent ?? null,
        items: rest,
        loopMode: state.loopMode
      }
    }
  };
}
