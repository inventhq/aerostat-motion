// ============================================
// Core Types - Aerostat Animation Library
// ============================================

import type { PresetName } from './presets';

/**
 * Spring configuration for physics-based animations.
 * These values create a single "universal" spring feel.
 */
export interface SpringConfig {
  /** Stiffness of the spring (default: 180) */
  stiffness?: number;
  /** Damping of the spring (default: 12) */
  damping?: number;
  /** Mass of the animated object (default: 1) */
  mass?: number;
  /** Velocity threshold to consider animation complete (default: 0.001) */
  restVelocity?: number;
}

/**
 * Duration-based animation configuration.
 */
export interface DurationConfig {
  /** Duration in milliseconds (default: 300) */
  duration?: number;
  /** Easing function name (default: 'easeOut') */
  easing?: EasingFunction;
}

/**
 * Core animation configuration - the public API input.
 */
export interface AnimationConfig {
  /** Starting value */
  from: number;
  /** Target value */
  to: number;
  /** Called on each frame with interpolated value */
  onUpdate: (value: number) => void;
  /** Called when animation completes naturally */
  onComplete?: () => void;
  /** Initial velocity (for spring animations) */
  velocity?: number;
  /** Delay before animation starts, in milliseconds */
  delay?: number;
  /** Unique key for interrupt handling - new animations with same key will stop previous ones */
  key?: string | symbol;
}

/**
 * Spring-based animation configuration.
 */
export interface SpringAnimationConfig extends AnimationConfig, SpringConfig {
  /** Animation type discriminator */
  type?: 'spring';
  /** Use a preset instead of raw stiffness/damping values */
  preset?: PresetName;
}

/**
 * Duration-based animation configuration.
 */
export interface DurationAnimationConfig extends AnimationConfig, DurationConfig {
  /** Animation type discriminator */
  type: 'duration';
}

/**
 * Combined animation config - accepts either spring or duration.
 */
export type AerostatConfig = SpringAnimationConfig | DurationAnimationConfig;

/**
 * Easing function - maps progress (0-1) to eased progress (0-1).
 */
export type EasingFunction = (t: number) => number;

/**
 * Named easing functions available in the library.
 */
export type EasingName = 'linear' | 'easeOutExpo' | 'easeInOutCubic';

/**
 * Internal job representation for the scheduler.
 * Uses mutable state for zero-allocation hot path.
 */
export interface AnimationJob {
  /** Starting value (for duration-based interpolation) */
  fromValue: number;
  /** Current value */
  value: number;
  /** Target value */
  to: number;
  /** Current velocity (used by spring) */
  velocity: number;
  /** Update callback */
  onUpdate: (value: number) => void;
  /** Completion callback */
  onComplete?: () => void;
  /** Animation configuration */
  config: ResolvedConfig;
  /** Whether animation is active */
  active: boolean;
  /** Delay remaining (ms) */
  delayRemaining: number;
  /** Animation status */
  status: AnimationStatus;
  /** Start time (timestamp when animation began) */
  startTime: number;
  /** Elapsed time (accumulated, for pause/resume) */
  elapsed: number;
  /** Pause time (timestamp when paused, for calculating elapsed) */
  pauseTime: number;
}

/**
 * Internally resolved configuration with defaults applied.
 */
export interface ResolvedConfig {
  /** Animation type */
  type: 'spring' | 'duration';
  /** Spring stiffness (if spring type) */
  stiffness: number;
  /** Spring damping (if spring type) */
  damping: number;
  /** Spring mass (if spring type) */
  mass: number;
  /** Rest velocity threshold (if spring type) */
  restVelocity: number;
  /** Duration in ms (if duration type) */
  duration: number;
  /** Easing function (if duration type) */
  easing: EasingFunction;
  /** Start time (if duration type) */
  startTime: number;
}

/**
 * Animation status.
 */
export type AnimationStatus = 'idle' | 'running' | 'paused' | 'completed';

/**
 * Controller for an active animation.
 * Provides full control over animation lifecycle.
 */
export interface AnimationController {
  /** Stop the animation immediately and remove from scheduler */
  stop: () => void;
  /** Update the target value mid-animation (for spring) */
  setTarget: (to: number) => void;
  /** Pause the animation (maintains current state) */
  pause: () => void;
  /** Resume a paused animation */
  resume: () => void;
  /** Get current animation status */
  getStatus: () => AnimationStatus;
  /** Get elapsed time in milliseconds */
  getElapsed: () => number;
  /** Get current value */
  getValue: () => number;
  /** Get current velocity */
  getVelocity: () => number;
  /** Whether animation is currently active */
  readonly active: boolean;
  /** Promise-like interface for chaining animations */
  then: (callback: () => void) => AnimationController;
  /** Get the underlying promise for async/await */
  readonly finished: Promise<void>;
}

// ============================================
// Automatic Animation Controller Types
// ============================================

/**
 * Options for the animate() function.
 * Simplified API for object-based animations.
 */
export interface TweenOptions {
  /** Starting value */
  from: number;
  /** Target value - number or relative string like '+=100' or '-=50' */
  to: number | string;
  /** Duration in milliseconds (default: 300) */
  duration?: number;
  /** Delay before animation starts in milliseconds (default: 0) */
  delay?: number;
  /** Easing function (default: easeOutExpo) */
  easing?: EasingFunction;
  /** Called on each frame with interpolated value */
  onUpdate: (value: number) => void;
  /** Called when animation completes naturally */
  onComplete?: () => void;
}

/**
 * Internal task representation for WeakMap registry.
 * Captures closure state for the animation.
 */
export interface AnimationTask {
  /** Start timestamp (set after delay) */
  startTime: number;
  /** Duration in ms */
  duration: number;
  /** Delay remaining in ms */
  delayRemaining: number;
  /** Starting value */
  from: number;
  /** Target value (resolved to number) */
  to: number;
  /** Easing function */
  easing: EasingFunction;
  /** Update callback */
  onUpdate: (value: number) => void;
  /** Completion callback */
  onComplete?: () => void;
  /** Whether task is active */
  active: boolean;
  /** Reference to the target object */
  target: object;
  /** Promise resolve function for .then() chaining */
  resolve?: () => void;
}
