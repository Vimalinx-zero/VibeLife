import type { FocusCompanionSceneId } from "./focusCompanionState";

export interface FocusCompanionVoicePreset {
  frequency: number;
  gain: number;
  type: OscillatorType;
}

export interface FocusCompanionAudioPreset {
  sceneId: FocusCompanionSceneId;
  masterGain: number;
  voices: FocusCompanionVoicePreset[];
}

export const FOCUS_COMPANION_AUDIO_PRESETS: Record<
  FocusCompanionSceneId,
  FocusCompanionAudioPreset
> = {
  "deep-focus": {
    sceneId: "deep-focus",
    masterGain: 0.24,
    voices: [
      { frequency: 220, gain: 0.32, type: "triangle" },
      { frequency: 329.63, gain: 0.22, type: "sine" },
      { frequency: 440, gain: 0.14, type: "sine" },
    ],
  },
  "light-work": {
    sceneId: "light-work",
    masterGain: 0.28,
    voices: [
      { frequency: 261.63, gain: 0.28, type: "triangle" },
      { frequency: 392, gain: 0.18, type: "sine" },
      { frequency: 523.25, gain: 0.11, type: "sine" },
    ],
  },
  "reset-break": {
    sceneId: "reset-break",
    masterGain: 0.32,
    voices: [
      { frequency: 329.63, gain: 0.3, type: "triangle" },
      { frequency: 493.88, gain: 0.2, type: "sine" },
      { frequency: 659.25, gain: 0.12, type: "sine" },
    ],
  },
  "night-wind": {
    sceneId: "night-wind",
    masterGain: 0.18,
    voices: [
      { frequency: 196, gain: 0.24, type: "sine" },
      { frequency: 293.66, gain: 0.15, type: "triangle" },
      { frequency: 392, gain: 0.08, type: "sine" },
    ],
  },
};

export const getFocusCompanionAudioPreset = (
  sceneId: FocusCompanionSceneId
): FocusCompanionAudioPreset => FOCUS_COMPANION_AUDIO_PRESETS[sceneId];
