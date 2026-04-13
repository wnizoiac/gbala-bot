import { QueueHistory } from './history';
import {
  advanceQueue,
  clearQueueState,
  createQueueState,
  discardCurrentTrack,
  enqueueItem,
  isQueueEmpty,
  moveQueueItem,
  queueSize,
  queueToArray,
  removeItemAt,
  setQueueLoopMode,
  shuffleQueue,
  type LoopMode,
  type QueueItem,
  type QueueOperationResult,
  type QueueState
} from './queue-state';

export class QueueManager {
  private readonly states = new Map<string, QueueState>();
  private readonly histories = new Map<string, QueueHistory>();

  private getState(guildId: string): QueueState {
    return this.states.get(guildId) ?? createQueueState();
  }

  private getHistory(guildId: string): QueueHistory {
    const existing = this.histories.get(guildId);

    if (existing) {
      return existing;
    }

    const history = new QueueHistory();
    this.histories.set(guildId, history);
    return history;
  }

  private setState(guildId: string, state: QueueState): void {
    this.states.set(guildId, state);
  }

  enqueue(guildId: string, item: QueueItem): QueueOperationResult<QueueState> {
    const nextState = enqueueItem(this.getState(guildId), item);
    this.setState(guildId, nextState);

    return { ok: true, value: nextState };
  }

  dequeue(guildId: string): QueueOperationResult<QueueItem | null> {
    const result = advanceQueue(this.getState(guildId));

    if (!result.ok) {
      return result;
    }

    if (
      result.value.previous &&
      result.value.current?.id !== result.value.previous.id &&
      this.getState(guildId).loopMode !== 'track'
    ) {
      this.getHistory(guildId).push(result.value.previous);
    }

    this.setState(guildId, result.value.state);
    return { ok: true, value: result.value.current };
  }

  skip(guildId: string): QueueOperationResult<QueueItem | null> {
    return this.dequeue(guildId);
  }

  current(guildId: string): QueueItem | null {
    return this.getState(guildId).current;
  }

  discardCurrent(guildId: string): QueueOperationResult<QueueItem | null> {
    const result = discardCurrentTrack(this.getState(guildId));

    if (!result.ok) {
      return result;
    }

    this.setState(guildId, result.value.state);
    return { ok: true, value: result.value.current };
  }

  removeAt(guildId: string, position: number): QueueOperationResult<QueueItem> {
    const result = removeItemAt(this.getState(guildId), position);

    if (!result.ok) {
      return result;
    }

    this.setState(guildId, result.value.state);
    return { ok: true, value: result.value.removed };
  }

  moveTo(guildId: string, from: number, to: number): QueueOperationResult<QueueState> {
    const result = moveQueueItem(this.getState(guildId), from, to);

    if (!result.ok) {
      return result;
    }

    this.setState(guildId, result.value);
    return result;
  }

  shuffle(guildId: string, randomValues?: number[]): QueueOperationResult<QueueState> {
    const state = this.getState(guildId);
    const nextState = shuffleQueue(state, randomValues);
    this.setState(guildId, nextState);

    return { ok: true, value: nextState };
  }

  clear(guildId: string): QueueOperationResult<QueueState> {
    const nextState = clearQueueState(this.getState(guildId));
    this.setState(guildId, nextState);
    this.getHistory(guildId).clear();

    return { ok: true, value: nextState };
  }

  setLoopMode(guildId: string, mode: LoopMode): QueueOperationResult<QueueState> {
    const nextState = setQueueLoopMode(this.getState(guildId), mode);
    this.setState(guildId, nextState);

    return { ok: true, value: nextState };
  }

  size(guildId: string): number {
    return queueSize(this.getState(guildId));
  }

  isEmpty(guildId: string): boolean {
    return isQueueEmpty(this.getState(guildId));
  }

  toArray(guildId: string): QueueItem[] {
    return queueToArray(this.getState(guildId));
  }

  history(guildId: string): QueueItem[] {
    return this.getHistory(guildId).list();
  }

  activeGuildCount(): number {
    let count = 0;

    for (const guildId of this.states.keys()) {
      if (!this.isEmpty(guildId)) {
        count += 1;
      }
    }

    return count;
  }

  snapshot(guildId: string): QueueState {
    return this.getState(guildId);
  }
}
