// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetClockData, useClockStore } from './clockStore';

// Web Audio isn't available in jsdom; sound is a side effect we don't assert on.
vi.mock('../utils/audioUtils', () => ({
  playBeep: vi.fn(),
  playCompletionSound: vi.fn(),
}));

const COUNTDOWN_MS = 3000;
const clock = () => useClockStore.getState();

/** Start the timer and run through the pre-start countdown. */
const startAndSkipCountdown = () => {
  clock().start();
  vi.advanceTimersByTime(COUNTDOWN_MS + 100);
};

beforeEach(() => {
  vi.useFakeTimers();
  resetClockData();
  clock().setCountdownSeconds(3);
});

afterEach(() => {
  resetClockData();
  vi.useRealTimers();
});

describe('countdown', () => {
  it('starts the workout when the countdown ends', () => {
    clock().setMode('amrap');
    clock().start();

    vi.advanceTimersByTime(COUNTDOWN_MS - 200);
    expect(clock().status).toBe('countdown');

    vi.advanceTimersByTime(400);
    expect(clock().status).toBe('running');
  });
});

describe('tabata (8 × 20s work / 10s rest)', () => {
  beforeEach(() => {
    clock().setMode('tabata');
  });

  it('completes after 3:50 — the final work interval has no trailing rest', () => {
    clock().start();
    vi.advanceTimersByTime(COUNTDOWN_MS);

    vi.advanceTimersByTime(229_500);
    expect(clock().status).toBe('running');
    expect(clock().currentRound).toBe(8);

    vi.advanceTimersByTime(1_000);
    expect(clock().status).toBe('complete');
    expect(clock().phase).toBe('work');
    expect(clock().currentRound).toBe(8);
  });

  it('enters rest after the first work interval', () => {
    startAndSkipCountdown();

    vi.advanceTimersByTime(20_000);

    expect(clock()).toMatchObject({ status: 'rest', phase: 'rest', currentRound: 1 });
  });

  it('catches up over several intervals after a long gap between ticks', () => {
    startAndSkipCountdown();
    const before = clock().timeRemaining;

    // Tab throttled: no ticks for 65s, then a single tick sees the whole gap.
    vi.setSystemTime(Date.now() + 65_000);
    vi.advanceTimersByTime(100);

    // 65.1s = rest of round-1 work + rest(10) + work(20) + rest(10) → into round 3 work.
    const intoRound3 = 65.1 - before - 10 - 20 - 10;
    expect(clock()).toMatchObject({ status: 'running', phase: 'work', currentRound: 3 });
    expect(clock().timeRemaining).toBeCloseTo(20 - intoRound3, 1);
  });

  it('completes when a single late tick covers the rest of the workout', () => {
    startAndSkipCountdown();

    vi.setSystemTime(Date.now() + 10 * 60_000);
    vi.advanceTimersByTime(100);

    expect(clock()).toMatchObject({ status: 'complete', timeRemaining: 0, currentRound: 8 });
  });
});

describe('emom', () => {
  it('catches up rounds after a long gap', () => {
    clock().setConfig({ mode: 'emom', intervalTime: 60, rounds: 10 });
    startAndSkipCountdown();

    vi.setSystemTime(Date.now() + 150_000);
    vi.advanceTimersByTime(100);

    expect(clock()).toMatchObject({ status: 'running', currentRound: 3 });
  });
});

describe('for time', () => {
  it('stops at the time cap and shows the cap time', () => {
    clock().setConfig({ mode: 'forTime', totalTime: 60 });
    startAndSkipCountdown();

    vi.advanceTimersByTime(61_000);

    expect(clock()).toMatchObject({ status: 'complete', timeRemaining: 60, elapsedTime: 60 });
  });
});

describe('pause', () => {
  it('does not advance while paused', () => {
    clock().setMode('amrap');
    startAndSkipCountdown();
    clock().pause();
    const remaining = clock().timeRemaining;

    vi.advanceTimersByTime(30_000);
    clock().resume();
    vi.advanceTimersByTime(100);

    expect(clock().status).toBe('running');
    expect(clock().timeRemaining).toBeCloseTo(remaining - 0.1, 5);
  });
});
