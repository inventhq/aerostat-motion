// ============================================
// Animation Factory - Main API
// ============================================

import type {
  AerostatConfig,
  AnimationJob,
  AnimationController,
  ResolvedConfig,
  EasingFunction,
  EasingName,
  AnimationStatus,
  SpringAnimationConfig,
} from './types';
import { schedule, unschedule, pauseJob, resumeJob } from './scheduler';
import { easeOutExpo } from './easing';
import { getDefaultPreset, resolvePreset } from './presets';

/** Default duration config */
const DEFAULT_DURATION = {
  duration: 300,
} as const;

/** Registry for interrupt handling - maps keys to controllers */
const activeAnimations = new Map<string | symbol, AnimationController>();

/**
 * Create a new animation.
 * Defaults to spring physics for natural feel.
 * 
 * @example
 * ```ts
 * // Basic spring animation
 * aerostat({ from: 0, to: 1, onUpdate: (v) => ... });
 * 
 * // With interrupt key - stops previous animation with same key
 * aerostat({ key: 'my-animation', from: 0, to: 1, onUpdate: (v) => ... });
 * ```
 */
export function aerostat(config: AerostatConfig): AnimationController {
  // Interrupt: stop any existing animation with the same key
  if (config.key !== undefined) {
    const existing = activeAnimations.get(config.key);
    if (existing) {
      existing.stop();
    }
  }

  // Normalize config
  const type = config.type ?? 'spring';
  const from = config.from;
  const to = config.to;
  const velocity = config.velocity ?? 0;
  const delay = config.delay ?? 0;

  // Resolve config with defaults
  let resolved: ResolvedConfig;

  if (type === 'spring') {
    const springConfig = config as SpringAnimationConfig;
    
    // Resolve preset: explicit preset > raw values > default preset
    const preset = springConfig.preset 
      ? resolvePreset(springConfig.preset) 
      : undefined;
    const defaults = preset ?? getDefaultPreset();
    
    resolved = {
      type: 'spring',
      stiffness: springConfig.stiffness ?? defaults.stiffness,
      damping: springConfig.damping ?? defaults.damping,
      mass: springConfig.mass ?? defaults.mass,
      restVelocity: springConfig.restVelocity ?? defaults.restVelocity,
      duration: 0,
      easing: easeOutExpo,
      startTime: 0,
    };
  } else {
    const durConfig = config as AerostatConfig & { duration?: number; easing?: EasingFunction };
    resolved = {
      type: 'duration',
      stiffness: 0,
      damping: 0,
      mass: 0,
      restVelocity: 0,
      duration: durConfig.duration ?? DEFAULT_DURATION.duration,
      easing: durConfig.easing ?? easeOutExpo,
      startTime: 0, // Will be set when animation actually starts
    };
  }

  // Create job with mutable state
  const job: AnimationJob = {
    fromValue: from,
    value: from,
    to,
    velocity,
    onUpdate: config.onUpdate,
    ...(config.onComplete ? { onComplete: config.onComplete } : {}),
    config: resolved,
    active: true,
    delayRemaining: delay,
    status: 'running',
    startTime: 0,
    elapsed: 0,
    pauseTime: 0,
  };

  // Schedule the job
  schedule(job);

  // Create controller
  let isActive = true;

  // Create promise for .then() chaining
  let resolvePromise: () => void;
  const finished = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  const controller: AnimationController = {
    stop: () => {
      if (!isActive) return;
      isActive = false;
      unschedule(job);
      if (config.key !== undefined) {
        activeAnimations.delete(config.key);
      }
      resolvePromise();
    },

    setTarget: (newTarget: number) => {
      job.to = newTarget;
      // For duration animations, switch to spring for retargeting
      if (job.config.type === 'duration') {
        const defaults = getDefaultPreset();
        job.config.type = 'spring';
        job.config.stiffness = defaults.stiffness;
        job.config.damping = defaults.damping;
        job.config.mass = defaults.mass;
        job.config.restVelocity = defaults.restVelocity;
      }
      // Reactivate if stopped
      if (!job.active && isActive) {
        job.active = true;
        job.status = 'running';
        job.startTime = 0;
        schedule(job);
      }
    },

    pause: () => {
      pauseJob(job);
    },

    resume: () => {
      resumeJob(job);
    },

    getStatus: (): AnimationStatus => job.status,

    getElapsed: (): number => job.elapsed,

    getValue: (): number => job.value,

    getVelocity: (): number => job.velocity,

    get active(): boolean {
      return isActive && job.active;
    },

    then: (callback: () => void) => {
      finished.then(callback);
      return controller;
    },

    get finished() {
      return finished;
    },
  };

  // Register in the interrupt registry
  if (config.key !== undefined) {
    activeAnimations.set(config.key, controller);
  }

  // Clean up from registry when animation completes naturally
  const originalOnComplete = job.onComplete;
  job.onComplete = () => {
    if (config.key !== undefined) {
      activeAnimations.delete(config.key);
    }
    isActive = false;
    originalOnComplete?.();
    resolvePromise();
  };

  return controller;
}

/**
 * Stop all animations with a specific key.
 */
export function stopByKey(key: string | symbol): void {
  const controller = activeAnimations.get(key);
  if (controller) {
    controller.stop();
  }
}

/**
 * Stop all active animations.
 */
export function stopAll(): void {
  for (const controller of activeAnimations.values()) {
    controller.stop();
  }
}

/**
 * Get the number of active animations in the registry.
 */
export function getRegistrySize(): number {
  return activeAnimations.size;
}

// Re-export types and easing for consumer convenience
export { linear, easeOutExpo, easeInOutCubic, easings, getEasing } from './easing';
export type { EasingFunction, EasingName } from './types';
