// ============================================
// Singleton Scheduler - rAF Loop Manager
// ============================================
// All animations hook into this single scheduler
// to prevent multiple rAF callbacks (layout thrashing).

import type { AnimationJob } from './types';
import { springStep, lerp } from './physics';

/** Active animation jobs - using array for cache locality */
const jobs: AnimationJob[] = [];

/** Whether the scheduler loop is currently running */
let isRunning = false;

/** The current rAF handle (for cancellation) */
let rafHandle: number | null = null;

/** Last timestamp for delta calculation */
let lastTime = 0;

/**
 * The main scheduler loop - called once per frame.
 * Uses timestamp for accurate timing.
 */
function loop(timestamp: number): void {
  // Calculate delta in seconds (clamp to prevent spiral of death)
  const delta = lastTime === 0 ? 0 : Math.min((timestamp - lastTime) / 1000, 0.064);
  lastTime = timestamp;

  // Process all active jobs
  // Iterate backwards for safe removal during iteration
  for (let i = jobs.length - 1; i >= 0; i--) {
    const job = jobs[i] as AnimationJob;

    // Skip paused jobs (but keep them in the list)
    if (job.status === 'paused') {
      continue;
    }

    // Handle delay
    if (job.delayRemaining > 0) {
      job.delayRemaining -= delta * 1000;
      continue;
    }

    // Initialize startTime on first frame after delay
    if (job.startTime === 0) {
      job.startTime = timestamp;
    }

    // Skip inactive jobs
    if (!job.active) {
      job.status = 'completed';
      jobs.splice(i, 1);
      continue;
    }

    // Update elapsed time
    job.elapsed = timestamp - job.startTime;

    // Step the animation based on type
    let stillActive = false;

    if (job.config.type === 'spring') {
      stillActive = stepSpringAnimation(job, delta);
    } else {
      stillActive = stepDurationAnimation(job);
    }

    // Call update callback
    job.onUpdate(job.value);

    // Handle completion
    if (!stillActive) {
      job.active = false;
      job.status = 'completed';
      jobs.splice(i, 1);
      job.onComplete?.();
    }
  }

  // Continue loop if jobs remain
  if (jobs.length > 0) {
    rafHandle = requestAnimationFrame(loop);
  } else {
    isRunning = false;
    rafHandle = null;
    lastTime = 0;
  }
}

/**
 * Spring animation step using physics module.
 * Returns false when animation should complete.
 */
function stepSpringAnimation(job: AnimationJob, delta: number): boolean {
  const { stiffness, damping, mass } = job.config;

  // Create state wrapper that references job's properties
  const state = {
    get value() { return job.value; },
    set value(v: number) { job.value = v; },
    get velocity() { return job.velocity; },
    set velocity(v: number) { job.velocity = v; }
  };

  // Use physics module for spring step
  return springStep(
    state,
    job.to,
    { stiffness, damping, mass },
    delta
  );
}

/**
 * Duration-based animation step using lerp.
 * Returns false when animation should complete.
 */
function stepDurationAnimation(job: AnimationJob): boolean {
  const { duration, easing } = job.config;

  // Calculate progress (0 to 1)
  const elapsed = job.elapsed;
  const progress = Math.min(elapsed / duration, 1);

  // Apply easing and interpolate using physics module
  const easedProgress = easing(progress);
  job.value = lerp(job.fromValue, job.to, easedProgress);

  // Update velocity for potential handoff to spring
  const prevEasedProgress = easing(Math.max(0, (elapsed - 16) / duration));
  job.velocity = (job.to - job.fromValue) * (easedProgress - prevEasedProgress) / 0.016;

  return elapsed < duration;
}

/**
 * Add a job to the scheduler.
 * Starts the rAF loop if not already running.
 */
export function schedule(job: AnimationJob): void {
  jobs.push(job);

  if (!isRunning) {
    isRunning = true;
    lastTime = 0;
    rafHandle = requestAnimationFrame(loop);
  }
}

/**
 * Remove a job from the scheduler.
 * Stops the rAF loop if no jobs remain.
 */
export function unschedule(job: AnimationJob): void {
  const index = jobs.indexOf(job);
  if (index !== -1) {
    jobs.splice(index, 1);
    job.active = false;
    job.status = 'completed';
  }

  // Stop loop if no jobs remain
  if (jobs.length === 0 && rafHandle !== null) {
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
    isRunning = false;
    lastTime = 0;
  }
}

/**
 * Pause a job - it remains in scheduler but doesn't step.
 */
export function pauseJob(job: AnimationJob): void {
  if (job.status === 'running') {
    job.status = 'paused';
    job.pauseTime = performance.now();
  }
}

/**
 * Resume a paused job.
 */
export function resumeJob(job: AnimationJob): void {
  if (job.status === 'paused') {
    // Adjust startTime to account for pause duration
    const pauseDuration = performance.now() - job.pauseTime;
    job.startTime += pauseDuration;
    job.status = 'running';
  }
}

/**
 * Get the number of active jobs (for debugging).
 */
export function getActiveJobCount(): number {
  return jobs.length;
}
