import { describe, expect, it } from 'vitest';

import { QueueHistory } from '../src/music/queue/history';
import { QueueManager } from '../src/music/queue/queue-manager';

function createItem(id: string) {
  return {
    id,
    trackId: `track-${id}`,
    title: `Faixa ${id}`,
    duration: 180,
    filePath: `/tmp/${id}.mp3`,
    requestedBy: 'user-1',
    addedAt: Number(id.replace(/\D/g, '')) || 1
  };
}

describe('QueueManager', () => {
  it('enqueue adiciona item pendente e atualiza size', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));

    expect(manager.size('guild')).toBe(1);
    expect(manager.current('guild')).toBeNull();
  });

  it('dequeue promove primeiro item quando nao existe current', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));

    const result = manager.dequeue('guild');

    expect(result.ok && result.value?.id).toBe('1');
    expect(manager.current('guild')?.id).toBe('1');
    expect(manager.toArray('guild').map((item) => item.id)).toEqual(['1', '2']);
  });

  it('dequeue falha de forma tipada com fila vazia', () => {
    const manager = new QueueManager();
    const result = manager.dequeue('guild');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('QUEUE_EMPTY');
    }
  });

  it('skip usa a mesma transicao do dequeue', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.dequeue('guild');

    const result = manager.skip('guild');

    expect(result.ok && result.value?.id).toBe('2');
  });

  it('removeAt remove apenas itens pendentes', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.enqueue('guild', createItem('3'));
    manager.dequeue('guild');

    const result = manager.removeAt('guild', 2);

    expect(result.ok && result.value.id).toBe('3');
    expect(manager.toArray('guild').map((item) => item.id)).toEqual(['1', '2']);
  });

  it('removeAt retorna erro quando posicao nao existe', () => {
    const manager = new QueueManager();
    const result = manager.removeAt('guild', 1);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('POSITION_OUT_OF_RANGE');
    }
  });

  it('moveTo reordena itens pendentes', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.enqueue('guild', createItem('3'));

    const result = manager.moveTo('guild', 1, 3);

    expect(result.ok).toBe(true);
    expect(manager.toArray('guild').map((item) => item.id)).toEqual(['2', '3', '1']);
  });

  it('moveTo para mesma posicao mantem a fila', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));

    const result = manager.moveTo('guild', 2, 2);

    expect(result.ok).toBe(true);
    expect(manager.toArray('guild').map((item) => item.id)).toEqual(['1', '2']);
  });

  it('moveTo invalido falha de forma tipada', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));

    const result = manager.moveTo('guild', 1, 2);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('INVALID_MOVE');
    }
  });

  it('shuffle embaralha apenas o restante e preserva current', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.enqueue('guild', createItem('3'));
    manager.enqueue('guild', createItem('4'));
    manager.dequeue('guild');

    manager.shuffle('guild', [0.8, 0]);

    expect(manager.toArray('guild').map((item) => item.id)).toEqual(['1', '3', '2', '4']);
  });

  it('shuffle com um unico item pendente nao altera ordem', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));

    manager.shuffle('guild', [0.5]);

    expect(manager.toArray('guild').map((item) => item.id)).toEqual(['1']);
  });

  it('clear limpa current e pendencias', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.dequeue('guild');

    manager.clear('guild');

    expect(manager.isEmpty('guild')).toBe(true);
    expect(manager.toArray('guild')).toEqual([]);
  });

  it('setLoopMode altera o modo da fila', () => {
    const manager = new QueueManager();
    const result = manager.setLoopMode('guild', 'queue');

    expect(result.ok && result.value.loopMode).toBe('queue');
  });

  it('loop de track repete a faixa atual', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.dequeue('guild');
    manager.setLoopMode('guild', 'track');

    const result = manager.dequeue('guild');

    expect(result.ok && result.value?.id).toBe('1');
    expect(manager.current('guild')?.id).toBe('1');
  });

  it('loop de queue reinsere a faixa atual ao final', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.enqueue('guild', createItem('3'));
    manager.dequeue('guild');
    manager.setLoopMode('guild', 'queue');

    const result = manager.dequeue('guild');

    expect(result.ok && result.value?.id).toBe('2');
    expect(manager.toArray('guild').map((item) => item.id)).toEqual(['2', '3', '1']);
  });

  it('sem loop a fila termina em current nulo ao consumir ultimo item', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.dequeue('guild');

    const result = manager.dequeue('guild');

    expect(result.ok && result.value).toBeNull();
    expect(manager.current('guild')).toBeNull();
  });

  it('historico registra faixas anteriores quando avancam', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.dequeue('guild');
    manager.dequeue('guild');

    expect(manager.history('guild').map((item) => item.id)).toEqual(['1']);
  });

  it('discardCurrent descarta a faixa atual sem mandar para o historico', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.dequeue('guild');

    const result = manager.discardCurrent('guild');

    expect(result.ok && result.value?.id).toBe('2');
    expect(manager.current('guild')?.id).toBe('2');
    expect(manager.history('guild')).toEqual([]);
  });

  it('discardCurrent esvazia a fila quando a atual era a ultima faixa', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.dequeue('guild');

    const result = manager.discardCurrent('guild');

    expect(result.ok && result.value).toBeNull();
    expect(manager.current('guild')).toBeNull();
    expect(manager.isEmpty('guild')).toBe(true);
    expect(manager.history('guild')).toEqual([]);
  });

  it('clear tambem limpa o historico', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.dequeue('guild');
    manager.dequeue('guild');
    manager.clear('guild');

    expect(manager.history('guild')).toEqual([]);
  });

  it('mantem isolamento por guild', () => {
    const manager = new QueueManager();
    manager.enqueue('guild-a', createItem('1'));
    manager.enqueue('guild-b', createItem('2'));
    manager.dequeue('guild-a');

    expect(manager.current('guild-a')?.id).toBe('1');
    expect(manager.current('guild-b')).toBeNull();
    expect(manager.toArray('guild-b').map((item) => item.id)).toEqual(['2']);
  });

  it('toArray inclui current na primeira posicao', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.dequeue('guild');

    expect(manager.toArray('guild').map((item) => item.id)).toEqual(['1', '2']);
  });

  it('isEmpty diferencia fila vazia de fila com current', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.dequeue('guild');

    expect(manager.isEmpty('guild')).toBe(false);
  });

  it('size inclui current e itens pendentes', () => {
    const manager = new QueueManager();
    manager.enqueue('guild', createItem('1'));
    manager.enqueue('guild', createItem('2'));
    manager.dequeue('guild');

    expect(manager.size('guild')).toBe(2);
  });
});

describe('QueueHistory', () => {
  it('mantem buffer circular limitado', () => {
    const history = new QueueHistory(2);
    history.push(createItem('1'));
    history.push(createItem('2'));
    history.push(createItem('3'));

    expect(history.list().map((item) => item.id)).toEqual(['3', '2']);
  });
});
