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

/**
 * CrossFit Clock page — tactical yellow/green theme
 */
export const Clock = () => {
  const status = useClockStore((state) => state.status);
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
  useEffect(() => {
    const requestWakeLock = async () => {
      if (status === 'running' || status === 'rest' || status === 'countdown') {
        try {
          if ('wakeLock' in navigator) {
            const lock = await navigator.wakeLock.request('screen');
            wakeLockRef.current = lock;
          }
        } catch (error) {
          console.warn('[Clock] Wake lock failed:', error);
        }
      } else {
        if (wakeLockRef.current) {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
      }
    };

    requestWakeLock();

    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [status]);

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

  return (
    <div className="flex flex-col gap-5">
      {/* Header with controls */}
      <div className="flex items-center justify-between pb-1 border-b border-[var(--color-border)]">
        <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">TIMER</span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowPresets(true)}
            className="p-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            title="Presets"
          >
            <ListPlus className="w-5 h-5" />
          </button>
          <button
            onClick={toggleSound}
            className={`p-2 bg-[var(--color-surface)] border border-[var(--color-border)] transition-colors ${
              soundEnabled ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`}
            title={soundEnabled ? 'Sound on' : 'Sound off'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
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
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1 border-b border-[var(--color-border)]">
            <span className="font-display text-xs tracking-[0.2em] text-[var(--color-text-muted)]">CONFIGURATION</span>
          </div>
          <TimerConfig />
        </div>
      )}

      {/* Preset manager modal */}
      <PresetManager
        isOpen={showPresets}
        onClose={() => setShowPresets(false)}
      />
    </div>
  );
};
