import { create } from 'zustand';
import { playBeep, playCompletionSound } from '../utils/audioUtils';
import { makeId } from '../utils/id';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type TimerMode = 'amrap' | 'emom' | 'forTime' | 'tabata' | 'custom';

export type TimerStatus = 'idle' | 'countdown' | 'running' | 'paused' | 'rest' | 'complete';

export type TimerPhase = 'work' | 'rest';

export interface TimerConfig {
  mode: TimerMode;
  // AMRAP: total workout time
  totalTime: number; // in seconds
  // EMOM: interval duration
  intervalTime: number; // in seconds
  // Tabata/Custom: work and rest periods
  workTime: number; // in seconds
  restTime: number; // in seconds
  // Rounds
  rounds: number;
  // Custom: sets (groups of rounds)
  sets: number;
}

export interface TimerPreset {
  id: string;
  name: string;
  config: TimerConfig;
  createdAt: number;
}

interface ClockState {
  // Timer configuration
  config: TimerConfig;
  
  // Timer state
  status: TimerStatus;
  phase: TimerPhase;
  timeRemaining: number; // current countdown (seconds)
  elapsedTime: number; // total elapsed (for For Time mode)
  currentRound: number;
  currentSet: number;
  
  // Presets
  presets: TimerPreset[];
  
  // Settings
  soundEnabled: boolean;
  countdownSeconds: number; // countdown before start (default 10)
  
  // Internal
  intervalId: number | null;
  lastTickTime: number | null;
  
  // Actions
  setConfig: (config: Partial<TimerConfig>) => void;
  setMode: (mode: TimerMode) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  stop: () => void;
  
  // Preset actions
  savePreset: (name: string) => void;
  loadPreset: (preset: TimerPreset) => void;
  deletePreset: (id: string) => void;
  loadPresetsFromDB: () => Promise<void>;
  
  // Settings actions
  toggleSound: () => void;
  setCountdownSeconds: (seconds: number) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: TimerConfig = {
  mode: 'amrap',
  totalTime: 20 * 60, // 20 minutes
  intervalTime: 60, // 1 minute
  workTime: 20, // 20 seconds (Tabata default)
  restTime: 10, // 10 seconds (Tabata default)
  rounds: 8, // 8 rounds (Tabata default)
  sets: 1,
};

// ═══════════════════════════════════════════════════════════════════════════
// STORAGE (localStorage for settings)
// ═══════════════════════════════════════════════════════════════════════════

const PRESETS_STORAGE_KEY = 'crossfit-timer-presets';
const COUNTDOWN_STORAGE_KEY = 'crossfit-timer-countdown';
const SOUND_STORAGE_KEY = 'crossfit-timer-sound';

const savePresetsToStorage = (presets: TimerPreset[]): void => {
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch (error) {
    console.warn('[ClockStore] Failed to save presets:', error);
  }
};

const loadPresetsFromStorage = (): TimerPreset[] => {
  try {
    const data = localStorage.getItem(PRESETS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.warn('[ClockStore] Failed to load presets:', error);
    return [];
  }
};

const saveCountdownSeconds = (seconds: number): void => {
  try {
    localStorage.setItem(COUNTDOWN_STORAGE_KEY, seconds.toString());
  } catch (error) {
    console.warn('[ClockStore] Failed to save countdown:', error);
  }
};

const loadCountdownSeconds = (): number => {
  try {
    const data = localStorage.getItem(COUNTDOWN_STORAGE_KEY);
    const value = data ? parseInt(data, 10) : NaN;
    // Default 10s; ignore corrupt values and clamp to the allowed 3-30 range.
    return Number.isFinite(value) ? Math.max(3, Math.min(30, value)) : 10;
  } catch (error) {
    console.warn('[ClockStore] Failed to load countdown:', error);
    return 10;
  }
};

const saveSoundEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, enabled.toString());
  } catch (error) {
    console.warn('[ClockStore] Failed to save sound setting:', error);
  }
};

const loadSoundEnabled = (): boolean => {
  try {
    const data = localStorage.getItem(SOUND_STORAGE_KEY);
    return data !== 'false'; // Default: true
  } catch (error) {
    console.warn('[ClockStore] Failed to load sound setting:', error);
    return true;
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════

export const useClockStore = create<ClockState>((set, get) => ({
  // Initial state
  config: DEFAULT_CONFIG,
  status: 'idle',
  phase: 'work',
  timeRemaining: DEFAULT_CONFIG.totalTime,
  elapsedTime: 0,
  currentRound: 1,
  currentSet: 1,
  presets: [],
  soundEnabled: loadSoundEnabled(),
  countdownSeconds: loadCountdownSeconds(),
  intervalId: null,
  lastTickTime: null,

  // Set configuration
  setConfig: (updates) => {
    const state = get();
    if (state.status !== 'idle') return; // Can't change config while running
    
    const newConfig = { ...state.config, ...updates };
    set({ 
      config: newConfig,
      timeRemaining: getInitialTime(newConfig),
      currentRound: 1,
      currentSet: 1,
      elapsedTime: 0,
    });
  },

  // Set timer mode
  setMode: (mode) => {
    const state = get();
    if (state.status !== 'idle') return;
    
    const newConfig = { ...state.config, mode };
    set({ 
      config: newConfig,
      timeRemaining: getInitialTime(newConfig),
      currentRound: 1,
      currentSet: 1,
      elapsedTime: 0,
    });
  },

  // Start the timer
  start: () => {
    const state = get();
    if (state.status !== 'idle') return;
    
    // Initialize audio on user interaction
    if (state.soundEnabled) {
      playBeep('countdown');
    }
    
    // Start countdown phase
    set({ 
      status: 'countdown',
      timeRemaining: state.countdownSeconds,
      phase: 'work',
      currentRound: 1,
      currentSet: 1,
      elapsedTime: 0,
    });
    
    startTicking();
  },

  // Pause the timer
  pause: () => {
    const state = get();
    if (state.status !== 'running' && state.status !== 'rest') return;
    
    stopTicking();
    set({ status: 'paused' });
  },

  // Resume the timer
  resume: () => {
    const state = get();
    if (state.status !== 'paused') return;
    
    set({ status: state.phase === 'rest' ? 'rest' : 'running' });
    startTicking();
  },

  // Reset the timer
  reset: () => {
    stopTicking();
    const config = get().config;
    set({
      status: 'idle',
      phase: 'work',
      timeRemaining: getInitialTime(config),
      elapsedTime: 0,
      currentRound: 1,
      currentSet: 1,
      intervalId: null,
      lastTickTime: null,
    });
  },

  // Stop the timer (alias for reset)
  stop: () => {
    get().reset();
  },

  // Save current config as preset
  savePreset: (name) => {
    const state = get();
    const preset: TimerPreset = {
      id: makeId('preset'),
      name,
      config: { ...state.config },
      createdAt: Date.now(),
    };
    
    set({ presets: [...state.presets, preset] });
    savePresetsToStorage([...state.presets, preset]);
  },

  // Load a preset
  loadPreset: (preset) => {
    const state = get();
    if (state.status !== 'idle') return;
    
    set({
      config: { ...preset.config },
      timeRemaining: getInitialTime(preset.config),
      currentRound: 1,
      currentSet: 1,
      elapsedTime: 0,
    });
  },

  // Delete a preset
  deletePreset: (id) => {
    const state = get();
    const newPresets = state.presets.filter((p) => p.id !== id);
    set({ presets: newPresets });
    savePresetsToStorage(newPresets);
  },

  // Load presets from storage
  loadPresetsFromDB: async () => {
    const presets = loadPresetsFromStorage();
    set({ presets });
  },

  // Toggle sound
  toggleSound: () => {
    const newValue = !useClockStore.getState().soundEnabled;
    saveSoundEnabled(newValue);
    set({ soundEnabled: newValue });
  },

  // Set countdown seconds
  setCountdownSeconds: (seconds: number) => {
    const value = Math.max(3, Math.min(30, seconds)); // Clamp between 3-30
    saveCountdownSeconds(value);
    set({ countdownSeconds: value });
  },
}));

// ═══════════════════════════════════════════════════════════════════════════
// BACKUP / RESET (localStorage timer data is not in IndexedDB)
// ═══════════════════════════════════════════════════════════════════════════

/** Timer data stored in localStorage, included as the `clock` section of a backup. */
export interface ClockBackup {
  presets: TimerPreset[];
  countdownSeconds: number;
  soundEnabled: boolean;
}

/** Snapshot of the persisted timer data (for export). */
export const getClockBackup = (): ClockBackup => ({
  presets: loadPresetsFromStorage(),
  countdownSeconds: loadCountdownSeconds(),
  soundEnabled: loadSoundEnabled(),
});

/** Restore timer data from a backup `clock` section. Invalid fields are ignored. */
export const restoreClockBackup = (data: unknown): void => {
  if (!data || typeof data !== 'object') return;
  const backup = data as Partial<ClockBackup>;
  const store = useClockStore.getState();
  if (Array.isArray(backup.presets)) {
    savePresetsToStorage(backup.presets);
    useClockStore.setState({ presets: backup.presets });
  }
  if (typeof backup.countdownSeconds === 'number') store.setCountdownSeconds(backup.countdownSeconds);
  if (typeof backup.soundEnabled === 'boolean') {
    saveSoundEnabled(backup.soundEnabled);
    useClockStore.setState({ soundEnabled: backup.soundEnabled });
  }
};

/** Delete persisted timer data and reset the timer store to defaults (clear-all). */
export const resetClockData = (): void => {
  try {
    [PRESETS_STORAGE_KEY, COUNTDOWN_STORAGE_KEY, SOUND_STORAGE_KEY].forEach((k) => localStorage.removeItem(k));
  } catch (error) {
    console.warn('[ClockStore] Failed to clear timer data:', error);
  }
  stopTicking();
  useClockStore.setState({
    config: DEFAULT_CONFIG,
    status: 'idle',
    phase: 'work',
    timeRemaining: getInitialTime(DEFAULT_CONFIG),
    elapsedTime: 0,
    currentRound: 1,
    currentSet: 1,
    presets: [],
    soundEnabled: true,
    countdownSeconds: 10,
    intervalId: null,
    lastTickTime: null,
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// TIMER LOGIC
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get initial time based on config
 */
const getInitialTime = (config: TimerConfig): number => {
  switch (config.mode) {
    case 'amrap':
      return config.totalTime;
    case 'emom':
      return config.intervalTime;
    case 'forTime':
      return 0; // Counts up
    case 'tabata':
    case 'custom':
      return config.workTime;
    default:
      return config.totalTime;
  }
};

/**
 * Start the timer interval
 */
const startTicking = (): void => {
  const state = useClockStore.getState();
  if (state.intervalId) return;
  
  const intervalId = window.setInterval(() => {
    tick();
  }, 100); // Tick every 100ms for smooth display
  
  useClockStore.setState({ 
    intervalId,
    lastTickTime: Date.now(),
  });
};

/**
 * Stop the timer interval
 */
const stopTicking = (): void => {
  const state = useClockStore.getState();
  if (state.intervalId) {
    clearInterval(state.intervalId);
    useClockStore.setState({ intervalId: null, lastTickTime: null });
  }
};

/**
 * Handle a single tick
 */
const tick = (): void => {
  const state = useClockStore.getState();
  const now = Date.now();
  const elapsed = state.lastTickTime ? (now - state.lastTickTime) / 1000 : 0.1;
  
  useClockStore.setState({ lastTickTime: now });
  
  switch (state.status) {
    case 'countdown':
      handleCountdownTick(state, elapsed);
      break;
    case 'running':
    case 'rest':
      handleRunningTick(state, elapsed);
      break;
  }
};

/**
 * Handle countdown tick (3-2-1)
 */
const handleCountdownTick = (state: ClockState, elapsed: number): void => {
  const newTime = state.timeRemaining - elapsed;
  
  // Check for countdown beeps (at each second)
  const prevSecond = Math.ceil(state.timeRemaining);
  const newSecond = Math.ceil(newTime);
  
  if (state.soundEnabled && prevSecond !== newSecond && newSecond > 0) {
    playBeep('countdown');
  }
  
  if (newTime <= 0) {
    // Countdown complete - start the actual timer
    if (state.soundEnabled) {
      playBeep('go');
    }
    
    const config = state.config;
    useClockStore.setState({
      status: 'running',
      phase: 'work',
      timeRemaining: getInitialTime(config),
      elapsedTime: 0,
    });
    // Carry the countdown overshoot into the workout (throttled tabs catch up).
    const overshoot = -newTime;
    if (overshoot > 0) handleRunningTick(useClockStore.getState(), overshoot);
  } else {
    useClockStore.setState({ timeRemaining: newTime });
  }
};

/**
 * Handle running/rest tick.
 *
 * Driven by wall-clock `elapsed` since the last tick: when the tab was
 * throttled or the screen locked, a single tick may cover several intervals,
 * so we keep advancing (carrying the overshoot) until the time is consumed.
 */
const handleRunningTick = (state: ClockState, elapsed: number): void => {
  const config = state.config;

  // For Time mode counts up
  if (config.mode === 'forTime') {
    const newElapsed = state.elapsedTime + elapsed;

    // Check for time cap — show the cap time, not 0:00
    if (config.totalTime > 0 && newElapsed >= config.totalTime) {
      handleTimerComplete({ timeRemaining: config.totalTime, elapsedTime: config.totalTime });
      return;
    }

    useClockStore.setState({
      elapsedTime: newElapsed,
      timeRemaining: newElapsed,
    });
    return;
  }

  // All other modes count down
  const newTime = state.timeRemaining - elapsed;

  // Warning beeps in last 3 seconds
  const prevSecond = Math.ceil(state.timeRemaining);
  const newSecond = Math.ceil(newTime);

  if (state.soundEnabled && prevSecond !== newSecond && newSecond > 0 && newSecond <= 3) {
    playBeep('warning');
  }

  if (newTime > 0) {
    useClockStore.setState({
      timeRemaining: newTime,
      elapsedTime: state.elapsedTime + elapsed,
    });
    return;
  }

  // Time's up for this interval/phase. Advance, then consume the overshoot.
  let overshoot = -newTime;
  useClockStore.setState({ elapsedTime: state.elapsedTime + elapsed });
  // Guard against zero-length intervals looping forever.
  for (let i = 0; i < 10000; i++) {
    const current = useClockStore.getState();
    const completed = handleIntervalComplete(current);
    if (completed) return;

    const next = useClockStore.getState();
    if (overshoot < next.timeRemaining) {
      useClockStore.setState({ timeRemaining: next.timeRemaining - overshoot });
      return;
    }
    overshoot -= next.timeRemaining;
  }
};

/**
 * Handle interval/phase completion: moves to the next interval (setting
 * `timeRemaining` to its full duration) or completes the timer.
 * @returns true when the whole workout is complete.
 */
const handleIntervalComplete = (state: ClockState): boolean => {
  const config = state.config;

  switch (config.mode) {
    case 'amrap':
      // AMRAP complete
      handleTimerComplete();
      return true;

    case 'emom':
      // Check if all rounds complete
      if (state.currentRound >= config.rounds) {
        handleTimerComplete();
        return true;
      }
      // Start next round
      if (state.soundEnabled) {
        playBeep('interval');
      }
      useClockStore.setState({
        currentRound: state.currentRound + 1,
        timeRemaining: config.intervalTime,
      });
      return false;

    case 'tabata':
    case 'custom': {
      const isLastRound = state.currentRound >= config.rounds;
      const hasMoreSets = config.mode === 'custom' && state.currentSet < config.sets;

      if (state.phase === 'work') {
        // Final work interval of the final set: done — no trailing rest.
        if (isLastRound && !hasMoreSets) {
          handleTimerComplete();
          return true;
        }
        // Work phase complete, start rest
        if (state.soundEnabled) {
          playBeep('interval');
        }
        useClockStore.setState({
          phase: 'rest',
          status: 'rest',
          timeRemaining: config.restTime,
        });
        return false;
      }

      // Rest phase complete
      if (isLastRound) {
        if (hasMoreSets) {
          // Start next set
          if (state.soundEnabled) {
            playBeep('go');
          }
          useClockStore.setState({
            currentSet: state.currentSet + 1,
            currentRound: 1,
            phase: 'work',
            status: 'running',
            timeRemaining: config.workTime,
          });
          return false;
        }
        handleTimerComplete();
        return true;
      }

      // Start next round
      if (state.soundEnabled) {
        playBeep('interval');
      }
      useClockStore.setState({
        currentRound: state.currentRound + 1,
        phase: 'work',
        status: 'running',
        timeRemaining: config.workTime,
      });
      return false;
    }

    default:
      return false;
  }
};

/**
 * Handle timer completion. `final` overrides the displayed values (e.g. a For
 * Time cap shows the cap time instead of 0:00).
 */
const handleTimerComplete = (
  final: { timeRemaining: number; elapsedTime?: number } = { timeRemaining: 0 }
): void => {
  stopTicking();
  const state = useClockStore.getState();

  if (state.soundEnabled) {
    playCompletionSound();
  }

  useClockStore.setState({
    status: 'complete',
    ...final,
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// SELECTORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Format time as MM:SS or HH:MM:SS
 */
export const formatTime = (seconds: number): string => {
  const absSeconds = Math.abs(Math.ceil(seconds));
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const secs = absSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get display time based on current state
 */
export const useDisplayTime = () => {
  return useClockStore((state) => {
    if (state.status === 'countdown') {
      return Math.ceil(state.timeRemaining);
    }
    return formatTime(state.timeRemaining);
  });
};

/** `part / total` as a percentage; 0 for a zero-length (or invalid) total. */
const percentElapsed = (part: number, total: number): number =>
  total > 0 ? (part / total) * 100 : 0;

/**
 * Get progress percentage (0-100)
 */
export const useProgress = () => {
  return useClockStore((state) => {
    const config = state.config;
    
    switch (config.mode) {
      case 'amrap':
        return percentElapsed(config.totalTime - state.timeRemaining, config.totalTime);
      case 'emom':
        return percentElapsed(config.intervalTime - state.timeRemaining, config.intervalTime);
      case 'forTime':
        return percentElapsed(state.elapsedTime, config.totalTime);
      case 'tabata':
      case 'custom': {
        const currentDuration = state.phase === 'work' ? config.workTime : config.restTime;
        return percentElapsed(currentDuration - state.timeRemaining, currentDuration);
      }
      default:
        return 0;
    }
  });
};
