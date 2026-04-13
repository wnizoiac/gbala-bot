import type { QueueItem } from './queue-state';

export class QueueHistory {
  private readonly items: QueueItem[] = [];

  constructor(private readonly capacity = 50) {}

  push(item: QueueItem): void {
    this.items.unshift({ ...item });

    if (this.items.length > this.capacity) {
      this.items.length = this.capacity;
    }
  }

  clear(): void {
    this.items.length = 0;
  }

  list(): QueueItem[] {
    return this.items.map((item) => ({ ...item }));
  }
}
