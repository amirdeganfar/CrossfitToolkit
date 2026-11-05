import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Maximize, Minimize, ListPlus } from 'lucide-react';
import { useClockStore } from '../stores/clockStore';
import {
  TimerDisplay,
  TimerControls,
  ModeSelector,
  TimerConfig,
  PresetManager
} from '../components/clock';
import { haptics } from '../utils/haptics';

/**
 * CrossFit Clock page
 */
export const Clock = () => {
  const status = useClockStore((state) => state.status);
  const phase = useClockStore((state) => state.phase);
  const soundEnabled = useClockStore((state) => state.soundEnabled);
  const toggleSound = useClockStore((state) => state.toggleSound);
  const loadPresetsFromDB = useClockStore((state) => state.loadPresetsFromDB);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Load presets on mount
  useEffect(() => {
    loadPresetsFromDB();
  }, [loadPresetsFromDB]);

  // Screen wake lock - keep screen on during timer
  // (paused included: a paused workout is still on screen and about to resume)
  const needsWakeLock = status === 'running' || status === 'rest' || status === 'countdown' || status === 'paused';
  useEffect(() => {
    if (!needsWakeLock || !('wakeLock' in navigator)) return;
    let cancelled = false;

    const releaseLock = () => {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };

    const requestWakeLock = async () => {
      try {
        const lock = await navigator.wakeLock.request('screen');
        // Effect was cleaned up while the request was pending — don't leak the lock.
        if (cancelled) {
          lock.release().catch(() => {});
          return;
        }
        releaseLock();
        wakeLockRef.current = lock;
      } catch (error) {
        console.warn('[Clock] Wake lock failed:', error);
      }
    };

    // The browser drops the lock when the page is hidden; re-acquire on return.
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    requestWakeLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      releaseLock();
    };
  }, [needsWakeLock]);

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.warn('[Clock] Fullscreen failed:', error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const isTimerActive = status !== 'idle' && status !== 'complete';

  // Haptic pulse on every timer phase change: countdown → work, work ↔ rest,
  // and completion. Start/pause/reset/resume are user-initiated and stay silent.
  const lastPhaseRef = useRef<string | null>(null);
  useEffect(() => {
    const key = status === 'running' || status === 'rest' ? `${status}:${phase}` : status;
    const prev = lastPhaseRef.current;
    lastPhaseRef.current = key;
    if (prev === null || prev === key) return;
    if (status === 'idle' || status === 'paused' || prev === 'paused' || prev === 'idle') return;
    haptics.phase();
  }, [status, phase]);

  const iconBtn =
    'w-10 h-10 flex items-center justify-center rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:text-[var(--color-text)]';

  return (
    <div className="flex flex-col gap-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h1 className="t-title">Timer</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPresets(true)}
            className={`${iconBtn} text-[var(--color-text-muted)]`}
            title="Presets"
            aria-label="Timer presets"
          >
            <ListPlus className="w-5 h-5" />
          </button>
          <button
            onClick={toggleSound}
            className={`${iconBtn} ${soundEnabled ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'}`}
            title={soundEnabled ? 'Sound on' : 'Sound off'}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            aria-pressed={soundEnabled}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className={`${iconBtn} text-[var(--color-text-muted)]`}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mode selector */}
      {!isTimerActive && <ModeSelector />}

      {/* Timer display */}
      <TimerDisplay />

      {/* Timer controls */}
      <TimerControls />

      {/* Timer configuration */}
      {!isTimerActive && (
        <section className="space-y-3">
          <h2 className="t-section">Setup</h2>
          <TimerConfig />
        </section>
      )}

      {/* Preset manager modal */}
      <PresetManager
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
      />
    </div>
  );
};
