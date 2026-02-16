// ============================================
// Shake Interaction - Error State Feedback
// ============================================
// Physics-based "pluck and vibrate" for error states.
// Uses underdamped spring for natural oscillation.

import { aerostat } from './tween';
import type { AnimationController } from './types';

/**
 * Shake configuration options.
 */
export interface ShakeOptions {
  /** Initial displacement in pixels (default: 12) */
  amplitude?: number;
  /** Spring stiffness - higher = faster oscillation (default: 1200) */
  stiffness?: number;
  /** Spring damping - lower = more oscillation (default: 20) */
  damping?: number;
}

/**
 * Shake controller.
 */
export interface ShakeController {
  /** Stop the shake animation */
  stop: () => void;
  /** Re-trigger shake from current position (double-error) */
  shake: () => void;
  /** Check if currently shaking */
  readonly active: boolean;
}

/**
 * Create a shake interaction on an element.
 * Simulates physical "pluck and vibrate" for error feedback.
 * 
 * @example
 * ```ts
 * import { createShake } from 'aerostat';
 * 
 * const input = document.querySelector('input');
 * const shake = createShake(input);
 * 
 * // Trigger on validation error
 * if (!isValid) {
 *   shake.shake();
 * }
 * 
 * // Cleanup
 * shake.stop();
 * ```
 */
export function createShake(
  element: HTMLElement,
  options: ShakeOptions = {}
): ShakeController {
  const {
    amplitude = 12,
    stiffness = 1200,
    damping = 20,
  } = options;

  let controller: AnimationController | null = null;
  let currentX = 0;

  function shake() {
    // Capture current state for "double-error" re-pluck
    const currentVelocity = controller?.getVelocity() ?? 0;
    const startX = controller?.active ? currentX : amplitude;
    
    controller?.stop();

    // If already displaced, add amplitude to current position
    // This creates the "violent vibration" on repeated errors
    const pluckX = controller?.active 
      ? currentX + (currentX >= 0 ? amplitude : -amplitude)
      : amplitude;

    controller = aerostat({
      from: pluckX,
      to: 0,
      velocity: currentVelocity,
      stiffness,
      damping,
      mass: 1,
      onUpdate: (v) => {
        currentX = v;
        element.style.transform = `translateX(${v}px)`;
      },
      onComplete: () => {
        // Clear transform to keep layout clean
        element.style.transform = '';
        currentX = 0;
      },
    });
  }

  function stop() {
    controller?.stop();
    element.style.transform = '';
    currentX = 0;
  }

  return {
    stop,
    shake,
    get active() {
      return controller?.active ?? false;
    },
  };
}

/**
 * One-shot shake function for simple use cases.
 * 
 * @example
 * ```ts
 * import { shake } from 'aerostat';
 * 
 * // Shake an element once
 * shake(element);
 * 
 * // With options
 * shake(element, { amplitude: 20, stiffness: 1500 });
 * ```
 */
export function shake(
  element: HTMLElement,
  options: ShakeOptions = {}
): AnimationController {
  const {
    amplitude = 12,
    stiffness = 1200,
    damping = 20,
  } = options;

  return aerostat({
    from: amplitude,
    to: 0,
    stiffness,
    damping,
    mass: 1,
    onUpdate: (v) => {
      element.style.transform = `translateX(${v}px)`;
    },
    onComplete: () => {
      element.style.transform = '';
    },
  });
}
