// ============================================
// Aerostat Core - Headless Animation Engine
// ============================================
// Zero-dependency, framework-agnostic animation engine.
// No DOM assumptions, pure TypeScript.

// Main animation functions
export { aerostat, stopByKey, stopAll, getRegistrySize } from './tween';
export { animate, hasAnimation, stopAnimation, getActiveAnimationCount } from './animate';

// Presets system
export {
  presets,
  setDefaultPreset,
  getDefaultPreset,
  getDefaultPresetName,
  resolvePreset,
  PRESET_SNAPPY,
  PRESET_BOUNCY,
  PRESET_SMOOTH,
  PRESET_HEAVY,
  // Short aliases
  snappy,
  bouncy,
  smooth,
  heavy,
} from './presets';
export type { PresetName, PresetConfig } from './presets';

// Interaction utilities (DOM-optional)
export { createSquish } from './squish';
export type { SquishOptions, SquishController } from './squish';

export { createShake, shake } from './shake';
export type { ShakeOptions, ShakeController } from './shake';

export { createPulse } from './pulse';
export type { PulseOptions, PulseController } from './pulse';

// Scroll-linked animations
export { createScrollSpring, createScrollReveal, getActiveScrollTrackerCount } from './scroll';
export type { ScrollSpringOptions, ScrollSpringController, ScrollRevealOptions } from './scroll';

// Physics utilities
export {
  lerp,
  invLerp,
  clamp,
  springStep,
  isAtRest,
  springDuration,
  cubicBezier,
} from './physics';
export type { SpringState, SpringParams } from './physics';

// Easing functions
export { linear, easeOutExpo, easeInOutCubic, easings, getEasing } from './easing';

// Scheduler (advanced use)
export { schedule, unschedule, pauseJob, resumeJob, getActiveJobCount } from './scheduler';

// Types
export type {
  AerostatConfig,
  AnimationConfig,
  AnimationController,
  AnimationJob,
  AnimationStatus,
  AnimationTask,
  DurationAnimationConfig,
  DurationConfig,
  EasingFunction,
  EasingName,
  ResolvedConfig,
  SpringAnimationConfig,
  SpringConfig,
  TweenOptions,
} from './types';
