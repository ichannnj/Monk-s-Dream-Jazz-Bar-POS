import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  dedupeInFlight,
  hasInFlightKey,
  clearInFlightKey,
  clearAllInFlight,
} from '../utils/inFlightDedupe';

describe('inFlightDedupe utility', () => {
  beforeEach(() => {
    clearAllInFlight();
  });

  it('runs task once when called concurrently with identical key', async () => {
    let executions = 0;
    const task = vi.fn().mockImplementation(async () => {
      executions++;
      await new Promise((resolve) => setTimeout(resolve, 30));
      return 'done';
    });

    const [res1, res2, res3] = await Promise.all([
      dedupeInFlight('test-key', task),
      dedupeInFlight('test-key', task),
      dedupeInFlight('test-key', task),
    ]);

    expect(res1).toBe('done');
    expect(res2).toBe('done');
    expect(res3).toBe('done');
    expect(executions).toBe(1);
    expect(hasInFlightKey('test-key')).toBe(false);
  });

  it('allows fresh execution after previous in-flight task resolves', async () => {
    let counter = 0;
    const task = async () => ++counter;

    const res1 = await dedupeInFlight('seq-key', task);
    expect(res1).toBe(1);
    expect(hasInFlightKey('seq-key')).toBe(false);

    const res2 = await dedupeInFlight('seq-key', task);
    expect(res2).toBe(2);
  });

  it('cleans up in-flight map on task rejection so retry is possible', async () => {
    const errorTask = vi.fn().mockRejectedValue(new Error('fail'));

    await expect(dedupeInFlight('fail-key', errorTask)).rejects.toThrow('fail');
    expect(hasInFlightKey('fail-key')).toBe(false);

    const successTask = vi.fn().mockResolvedValue('recovered');
    const res = await dedupeInFlight('fail-key', successTask);
    expect(res).toBe('recovered');
  });

  it('distinguishes different keys', async () => {
    const taskA = vi.fn().mockResolvedValue('A');
    const taskB = vi.fn().mockResolvedValue('B');

    const [resA, resB] = await Promise.all([
      dedupeInFlight('keyA', taskA),
      dedupeInFlight('keyB', taskB),
    ]);

    expect(resA).toBe('A');
    expect(resB).toBe('B');
    expect(taskA).toHaveBeenCalledTimes(1);
    expect(taskB).toHaveBeenCalledTimes(1);
  });
});
