import { useState, useEffect } from 'react';
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
 * CrossFit Clock page with multiple timer modes
 */
export const Clock = () => {
  const status = useClockStore((state) => state.status);
  const soundEnabled = useClockStore((state) => state.soundEnabled);
  const toggleSound = useClockStore((state) => state.toggleSound);
  const loadPresetsFromDB = useClockStore((state) => state.loadPresetsFromDB);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

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
            setWakeLock(lock);
          }
        } catch (error) {
          console.warn('[Clock] Wake lock failed:', error);
        }
      } else {
        // Release wake lock when timer stops
        if (wakeLock) {
          wakeLock.release();
          setWakeLock(null);
        }
      }
    };

    requestWakeLock();

    // Cleanup on unmount
    return () => {
      if (wakeLock) {
        wakeLock.release();
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
    <div className="flex flex-col gap-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Timer</h2>
        <div className="flex items-center gap-2">
          {/* Presets button */}
          <button
            onClick={() => setShowPresets(true)}
            className="
              p-2 rounded-lg
              bg-[var(--color-surface)] border border-[var(--color-border)]
              text-[var(--color-text-muted)] hover:text-[var(--color-text)]
              transition-colors
            "
            title="Presets"
          >
            <ListPlus className="w-5 h-5" />
          </button>

          {/* Sound toggle */}
          <button
            onClick={toggleSound}
            className={`
              p-2 rounded-lg
              bg-[var(--color-surface)] border border-[var(--color-border)]
              transition-colors
              ${soundEnabled 
                ? 'text-[var(--color-primary)]' 
                : 'text-[var(--color-text-muted)]'
              }
            `}
            title={soundEnabled ? 'Sound on' : 'Sound off'}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            className="
              p-2 rounded-lg
              bg-[var(--color-surface)] border border-[var(--color-border)]
              text-[var(--color-text-muted)] hover:text-[var(--color-text)]
              transition-colors
            "
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5" />
            ) : (
              <Maximize className="w-5 h-5" />
            )}
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
        <div className="space-y-4">
          <div className="text-sm font-semibold text-[var(--color-text-muted)]">
            Configuration
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
