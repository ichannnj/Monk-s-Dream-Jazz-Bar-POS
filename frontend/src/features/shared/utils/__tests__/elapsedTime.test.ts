import { describe, it, expect } from 'vitest';
import { getItemElapsedMetrics, formatStageBreakdown } from '../elapsedTime';

describe('getItemElapsedMetrics & per-item timers', () => {
  const baseMs = new Date('2026-11-26T10:00:00.000Z').getTime();

  it('computes live current-stage timer for pending item', () => {
    const nowMs = baseMs + 95_000; // 1m 35s later
    const res = getItemElapsedMetrics(
      {
        status: 'pending',
        stationTarget: 'bar',
        createdAt: '2026-11-26T10:00:00.000Z',
      },
      nowMs
    );
    expect(res.stageLabel).toBe('NEW');
    expect(res.displayTimer).toBe('01:35');
    expect(res.isFrozen).toBe(false);
    expect(res.urgency).toBe('normal');
  });

  it('resets stage timer when transitioning to preparing and evaluates kitchen SLA', () => {
    const nowMs = baseMs + 700_000; // 11m 40s after created; 10m 20s after preparing
    const res = getItemElapsedMetrics(
      {
        status: 'preparing',
        stationTarget: 'kitchen',
        createdAt: '2026-11-26T10:00:00.000Z',
        preparingAt: '2026-11-26T10:01:20.000Z',
      },
      nowMs
    );
    expect(res.stageLabel).toBe('PREP');
    expect(res.displayTimer).toBe('10:20');
    expect(res.totalWaitTimer).toBe('11:40');
    expect(res.urgency).toBe('warning'); // kitchen warn = 600s, urgent = 900s
  });

  it('freezes displayTimer at Total Wait once item is served', () => {
    const nowMs = baseMs + 3600_000; // 1 hour later
    const res = getItemElapsedMetrics(
      {
        status: 'served',
        stationTarget: 'bar',
        createdAt: '2026-11-26T10:00:00.000Z',
        preparingAt: '2026-11-26T10:00:30.000Z',
        readyAt: '2026-11-26T10:02:00.000Z',
        servedAt: '2026-11-26T10:03:00.000Z',
      },
      nowMs
    );
    expect(res.stageLabel).toBe('SERVED');
    expect(res.displayTimer).toBe('03:00');
    expect(res.totalWaitTimer).toBe('03:00');
    expect(res.isFrozen).toBe(true);
    expect(res.urgency).toBe('normal');
  });

  it('computes Queue duration even when item skips preparingAt straight to readyAt', () => {
    const nowMs = baseMs + 120_000;
    const breakdown = formatStageBreakdown(
      [
        {
          status: 'ready',
          createdAt: '2026-11-26T10:00:00.000Z',
          readyAt: '2026-11-26T10:01:30.000Z',
        },
      ],
      nowMs
    );
    expect(breakdown.queueDuration).toBe('01:30');
    expect(breakdown.passDuration).toBe('00:30');
    expect(breakdown.totalWaitTimer).toBe('02:00');
  });
});
