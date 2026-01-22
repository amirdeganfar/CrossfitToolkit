/**
 * Audio utilities for CrossFit timer using Web Audio API
 * Generates beep sounds programmatically without external audio files
 */

let audioContext: AudioContext | null = null;

/**
 * Get or create AudioContext (lazy initialization)
 * Must be called after user interaction due to browser autoplay policies
 */
const getAudioContext = (): AudioContext => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  // Resume if suspended (happens after page becomes inactive)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
};

/**
 * Beep types for different timer events
 */
export type BeepType = 
  | 'countdown'     // 3-2-1 countdown beeps (short, medium pitch)
  | 'go'            // GO! signal (longer, higher pitch)
  | 'interval'      // Interval transition (medium)
  | 'warning'       // Last few seconds warning (quick, higher)
  | 'complete';     // Timer complete (long, triumphant)

/**
 * Configuration for each beep type
 */
const BEEP_CONFIG: Record<BeepType, { frequency: number; duration: number; volume: number }> = {
  countdown: { frequency: 880, duration: 0.15, volume: 0.5 },
  go: { frequency: 1320, duration: 0.4, volume: 0.7 },
  interval: { frequency: 660, duration: 0.2, volume: 0.6 },
  warning: { frequency: 1000, duration: 0.1, volume: 0.5 },
  complete: { frequency: 880, duration: 0.6, volume: 0.8 },
};

/**
 * Play a beep sound
 */
export const playBeep = (type: BeepType): void => {
  try {
    const ctx = getAudioContext();
    const config = BEEP_CONFIG[type];
    
    // Create oscillator for the tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Set frequency and wave type
    oscillator.frequency.value = config.frequency;
    oscillator.type = 'sine';
    
    // Set volume with fade out to prevent clicks
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(config.volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + config.duration);
    
    // Play the beep
    oscillator.start(now);
    oscillator.stop(now + config.duration);
  } catch (error) {
    console.warn('[Audio] Failed to play beep:', error);
  }
};

/**
 * Play countdown sequence (3-2-1-GO!)
 * Returns a cleanup function to cancel the sequence
 */
export const playCountdownSequence = (onComplete?: () => void): (() => void) => {
  const timeouts: number[] = [];
  
  // 3 - 2 - 1 beeps at 1 second intervals
  timeouts.push(window.setTimeout(() => playBeep('countdown'), 0));
  timeouts.push(window.setTimeout(() => playBeep('countdown'), 1000));
  timeouts.push(window.setTimeout(() => playBeep('countdown'), 2000));
  
  // GO! beep at 3 seconds
  timeouts.push(window.setTimeout(() => {
    playBeep('go');
    onComplete?.();
  }, 3000));
  
  // Return cleanup function
  return () => {
    timeouts.forEach(clearTimeout);
  };
};

/**
 * Play completion sound (multiple ascending beeps)
 */
export const playCompletionSound = (): void => {
  playBeep('complete');
  // Second beep slightly higher
  setTimeout(() => {
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = 1100;
      oscillator.type = 'sine';
      
      const now = ctx.currentTime;
      gainNode.gain.setValueAtTime(0.7, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      oscillator.start(now);
      oscillator.stop(now + 0.4);
    } catch (error) {
      console.warn('[Audio] Failed to play completion sound:', error);
    }
  }, 200);
};

/**
 * Initialize audio context (call on user interaction)
 * Needed to unlock audio on mobile browsers
 */
export const initializeAudio = (): void => {
  getAudioContext();
};

/**
 * Check if audio is supported
 */
export const isAudioSupported = (): boolean => {
  return typeof AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext !== 'undefined';
};
