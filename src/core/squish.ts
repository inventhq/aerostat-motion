// ============================================
// Squish Interaction - Haptic "Pop" Effect
// ============================================
// Framework-agnostic utility for button press feedback.
// Mimics high-end mechanical button feel.

import { aerostat } from './tween';
import { easeOutExpo } from './easing';
import type { AnimationController } from './types';

/**
 * Squish configuration options.
 */
export interface SquishOptions {
  /** Scale when pressed (default: 0.92) */
  pressScale?: number;
  /** Press animation duration in ms (default: 80) */
  pressDuration?: number;
  /** Spring stiffness for release (default: 500) */
  releaseStiffness?: number;
  /** Spring damping for release (default: 20) */
  releaseDamping?: number;
}

/**
 * Squish controller returned by createSquish.
 */
export interface SquishController {
  /** Remove all event listeners and stop animation */
  destroy: () => void;
}

// Custom easeOutQuart for heavy, immediate press feel
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

/**
 * Create a squish interaction on an element.
 * Applies haptic "pop" feedback on press/release.
 * 
 * @example
 * ```ts
 * import { createSquish } from 'aerostat';
 * 
 * const button = document.querySelector('button');
 * const squish = createSquish(button);
 * 
 * // Later: cleanup
 * squish.destroy();
 * ```
 */
export function createSquish(
  element: HTMLElement,
  options: SquishOptions = {}
): SquishController {
  const {
    pressScale = 0.92,
    pressDuration = 80,
    releaseStiffness = 500,
    releaseDamping = 20,
  } = options;

  let scale = 1;
  let controller: AnimationController | null = null;
  let isPressed = false;

  // Apply scale transform
  function applyScale(s: number) {
    scale = s;
    element.style.transform = `scale(${s})`;
  }

  // Press: Heavy, immediate feel with duration-based ease
  function press() {
    if (isPressed) return;
    isPressed = true;

    // Kill any existing animation (WeakMap handles this via target)
    controller?.stop();

    controller = aerostat({
      from: scale,
      to: pressScale,
      type: 'duration',
      duration: pressDuration,
      easing: easeOutQuart,
      onUpdate: applyScale,
    });
  }

  // Release: Bouncy spring with overshoot
  function release() {
    if (!isPressed) return;
    isPressed = false;

    // Capture current velocity for smooth transition
    const currentVelocity = controller?.getVelocity() ?? 0;
    controller?.stop();

    controller = aerostat({
      from: scale,
      to: 1,
      type: 'spring',
      stiffness: releaseStiffness,
      damping: releaseDamping,
      velocity: currentVelocity,
      onUpdate: applyScale,
    });
  }

  // Event handlers
  function onPointerDown(e: PointerEvent) {
    // Capture pointer for reliable pointerup
    element.setPointerCapture(e.pointerId);
    press();
  }

  function onPointerUp() {
    release();
  }

  function onPointerLeave() {
    // Safety: spring back if pointer leaves while pressed
    if (isPressed) {
      release();
    }
  }

  function onPointerCancel() {
    release();
  }

  // Mouse fallbacks for trackpad taps
  function onMouseDown() {
    press();
  }

  function onMouseUp() {
    release();
  }

  // Touch events for mobile and trackpad gestures
  function onTouchStart() {
    press();
  }

  function onTouchEnd() {
    release();
  }

  // Attach listeners
  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointerleave', onPointerLeave);
  element.addEventListener('pointercancel', onPointerCancel);
  
  // Mouse fallbacks
  element.addEventListener('mousedown', onMouseDown);
  element.addEventListener('mouseup', onMouseUp);
  
  // Touch fallbacks
  element.addEventListener('touchstart', onTouchStart, { passive: true });
  element.addEventListener('touchend', onTouchEnd, { passive: true });

  // Set initial transform-origin for centered scaling
  element.style.transformOrigin = 'center center';

  return {
    destroy() {
      controller?.stop();
      element.removeEventListener('pointerdown', onPointerDown);
      element.removeEventListener('pointerup', onPointerUp);
      element.removeEventListener('pointerleave', onPointerLeave);
      element.removeEventListener('pointercancel', onPointerCancel);
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('mouseup', onMouseUp);
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchend', onTouchEnd);
      // Reset transform
      element.style.transform = '';
    },
  };
}
