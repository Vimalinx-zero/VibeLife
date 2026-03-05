/**
 * Audio utilities using Web Audio API
 * No external audio files required
 */

interface AudioContextWithWindow extends AudioContext {
  webkitAudioContext?: typeof AudioContext;
}

let audioContext: AudioContext | null = null;

/**
 * Initialize AudioContext (must be done after user interaction)
 */
const initAudioContext = (): AudioContext => {
  if (!audioContext) {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    audioContext = new AudioContextClass();
  }

  // ✅ 如果 AudioContext 被暂停，尝试恢复
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(err => {
      console.warn('Failed to resume AudioContext:', err);
    });
  }

  return audioContext;
};

/**
 * Play a pleasant bell/chime sound
 * @param frequency - Base frequency in Hz (default: 523.25 = C5)
 * @param duration - Duration in seconds (default: 0.5)
 */
export const playBellSound = (frequency: number = 523.25, duration: number = 0.5): void => {
  try {
    const ctx = initAudioContext();

    // Create oscillator for tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Set tone type and frequency
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Create envelope (ADSR-like)
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Attack
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration); // Decay

    // Play and cleanup
    oscillator.start(now);
    oscillator.stop(now + duration);

    // Cleanup after sound is done
    setTimeout(() => {
      oscillator.disconnect();
      gainNode.disconnect();
    }, duration * 1000 + 100);
  } catch (error) {
    console.warn('Failed to play bell sound:', error);
  }
};

interface ChimeSequence {
  freq: number;
  delay: number;
}

interface ChimeSequences {
  complete: ChimeSequence[];
  break: ChimeSequence[];
  warning: ChimeSequence[];
}

type ChimeType = 'complete' | 'break' | 'warning';

/**
 * Play a chime sequence (multiple bells)
 * @param type - 'complete' | 'break' | 'warning'
 */
export const playChime = (type: ChimeType = 'complete'): void => {
  const sequences: ChimeSequences = {
    complete: [
      { freq: 523.25, delay: 0 },    // C5
      { freq: 659.25, delay: 150 },  // E5
      { freq: 783.99, delay: 300 },  // G5
    ],
    break: [
      { freq: 440.00, delay: 0 },    // A4
      { freq: 523.25, delay: 200 },  // C5
    ],
    warning: [
      { freq: 330.00, delay: 0 },    // E4
      { freq: 330.00, delay: 150 },  // E4 (repeat)
    ]
  };

  const sequence = sequences[type] || sequences.complete;

  sequence.forEach(({ freq, delay }) => {
    setTimeout(() => playBellSound(freq, 0.4), delay);
  });
};

/**
 * Play a soft click sound (for button feedback)
 */
export const playClick = (): void => {
  try {
    const ctx = initAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(800, ctx.currentTime);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

    oscillator.start(now);
    oscillator.stop(now + 0.05);

    setTimeout(() => {
      oscillator.disconnect();
      gainNode.disconnect();
    }, 100);
  } catch (error) {
    console.warn('Failed to play click sound:', error);
  }
};

export default {
  playBellSound,
  playChime,
  playClick,
  initAudioContext
};
