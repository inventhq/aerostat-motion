// ============================================
// Automatic Animation Controller
// ============================================
// WeakMap-based "Kill-on-Collision" animation system.
// When animate() is called on a target, any previous
// animation on that target is automatically stopped.

import type { TweenOptions, AnimationTask, AnimationController } from './types';
import { easeOutExpo } from './easing';
import { lerp } from './physics';

// ============================================
// Private WeakMap Registry
// ============================================

/**
 * Registry of active tasks mapped by target object.
 * Using WeakMap allows garbage collection of targets
 * when they're no longer referenced elsewhere.
 */
const activeTasks = new WeakMap<object, AnimationTask>();

/**
 * All active tasks for the scheduler loop.
 * Using Set for O(1) add/remove.
 */
const taskSet = new Set<AnimationTask>();

/**
 * Whether the scheduler loop is running.
 */
let isRunning = false;

/**
 * Current rAF handle.
 */
let rafHandle: number | null = null;

// ============================================
// Utilities
// ============================================

/**
 * Parse relative value string like '+=100' or '-=50'.
 * Returns the resolved number.
 */
function parseRelativeValue(value: number | string, from: number): number {
  if (typeof value === 'number') {
    return value;
  }
  
  // Parse relative string
  if (value.startsWith('+=')) {
    return from + parseFloat(value.slice(2));
  }
  if (value.startsWith('-=')) {
    return from - parseFloat(value.slice(2));
  }
  
  // Fallback: parse as number
  return parseFloat(value);
}

// ============================================
// Scheduler Loop
// ============================================

/**
 * Main animation loop - processes all active tasks.
 */
function tick(now: number): void {
  // Process all tasks
  for (const task of taskSet) {
    if (!task.active) {
      taskSet.delete(task);
      continue;
    }

    // Handle delay
    if (task.delayRemaining > 0) {
      task.delayRemaining -= 16; // Approximate frame time
      continue;
    }

    // Set startTime on first frame after delay
    if (task.startTime === 0) {
      task.startTime = now;
    }

    // Calculate progress
    const elapsed = now - task.startTime;
    const progress = Math.min(elapsed / task.duration, 1);

    // Apply easing and interpolate
    const easedProgress = task.easing(progress);
    const value = lerp(task.from, task.to, easedProgress);

    // Call update
    task.onUpdate(value);

    // Check completion
    if (progress >= 1) {
      task.active = false;
      taskSet.delete(task);
      activeTasks.delete(task.target);
      task.onComplete?.();
      task.resolve?.(); // Resolve promise for .then() chaining
    }
  }

  // Continue loop or stop
  if (taskSet.size > 0) {
    rafHandle = requestAnimationFrame(tick);
  } else {
    isRunning = false;
    rafHandle = null;
  }
}

/**
 * Start the scheduler if not running.
 */
function startScheduler(): void {
  if (!isRunning) {
    isRunning = true;
    rafHandle = requestAnimationFrame(tick);
  }
}

/**
 * Remove a task from the scheduler.
 */
function removeTask(task: AnimationTask): void {
  task.active = false;
  taskSet.delete(task);
  activeTasks.delete(task.target);
  task.resolve?.(); // Resolve promise even on stop
}

// ============================================
// Public API
// ============================================

/**
 * Animate a target object with automatic interrupt.
 * 
 * If the target already has an active animation,
 * it is immediately stopped (Kill-on-Collision).
 * 
 * @param target - The object to animate (used as WeakMap key)
 * @param options - Animation options
 * @returns Controller for the animation
 * 
 * @example
 * ```ts
 * const element = document.querySelector('.box');
 * 
 * // Basic animation
 * animate(element, {
 *   from: 0, to: 100,
 *   duration: 300,
 *   onUpdate: (v) => element.style.transform = `translateX(${v}px)`
 * });
 * 
 * // With delay (staggered menu items)
 * animate(element, {
 *   from: 0, to: 1,
 *   duration: 200,
 *   delay: 100,
 *   onUpdate: (v) => element.style.opacity = String(v)
 * });
 * 
 * // Relative values
 * animate(element, {
 *   from: 50, to: '+=100',  // Animates to 150
 *   onUpdate: (v) => element.style.left = `${v}px`
 * });
 * 
 * // Chaining with .then()
 * animate(element, { from: 0, to: 100, onUpdate: ... })
 *   .then(() => animate(element, { from: 100, to: 0, onUpdate: ... }));
 * 
 * // Or with async/await
 * await animate(element, { from: 0, to: 100, onUpdate: ... }).finished;
 * ```
 */
export function animate(target: object, options: TweenOptions): AnimationController {
  // Kill-on-Collision: stop any existing animation on this target
  const existingTask = activeTasks.get(target);
  if (existingTask) {
    removeTask(existingTask);
  }

  // Parse relative value
  const from = options.from;
  const to = parseRelativeValue(options.to, from);
  const delay = options.delay ?? 0;

  // Create promise for .then() chaining
  let resolvePromise: () => void;
  const finished = new Promise<void>((resolve) => {
    resolvePromise = resolve;
  });

  // Create new task (the closure)
  const task: AnimationTask = {
    startTime: 0, // Will be set after delay
    duration: options.duration ?? 300,
    delayRemaining: delay,
    from,
    to,
    easing: options.easing ?? easeOutExpo,
    onUpdate: options.onUpdate,
    ...(options.onComplete ? { onComplete: options.onComplete } : {}),
    active: true,
    target,
    resolve: resolvePromise!,
  };

  // Register in WeakMap and task set
  activeTasks.set(target, task);
  taskSet.add(task);

  // Start scheduler
  startScheduler();

  // Create controller
  const controller: AnimationController = {
    stop: () => {
      removeTask(task);
    },

    setTarget: (newTo: number) => {
      // Retarget: update the task's target value
      task.to = newTo;
      task.from = lerp(task.from, task.to, task.easing(
        Math.min((performance.now() - task.startTime) / task.duration, 1)
      ));
      task.startTime = performance.now();
      if (!task.active) {
        task.active = true;
        activeTasks.set(target, task);
        taskSet.add(task);
        startScheduler();
      }
    },

    pause: () => {
      task.active = false;
    },

    resume: () => {
      if (!task.active) {
        task.active = true;
        task.startTime = performance.now() - (task.duration * 
          Math.min((performance.now() - task.startTime) / task.duration, 1));
        taskSet.add(task);
        startScheduler();
      }
    },

    getStatus: () => task.active ? 'running' : 'completed',

    getElapsed: () => task.startTime ? performance.now() - task.startTime : 0,

    getValue: () => {
      if (task.startTime === 0) return task.from;
      return lerp(task.from, task.to, task.easing(
        Math.min((performance.now() - task.startTime) / task.duration, 1)
      ));
    },

    getVelocity: () => 0, // Duration-based doesn't track velocity

    get active() {
      return task.active;
    },

    then: (callback: () => void) => {
      finished.then(callback);
      return controller;
    },

    get finished() {
      return finished;
    },
  };

  return controller;
}

/**
 * Check if a target has an active animation.
 */
export function hasAnimation(target: object): boolean {
  const task = activeTasks.get(target);
  return task?.active ?? false;
}

/**
 * Stop animation on a specific target.
 */
export function stopAnimation(target: object): void {
  const task = activeTasks.get(target);
  if (task) {
    removeTask(task);
  }
}

/**
 * Get the number of active animations.
 */
export function getActiveAnimationCount(): number {
  return taskSet.size;
}
