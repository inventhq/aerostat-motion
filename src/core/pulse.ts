// ============================================
// Success Pulse - Validation Feedback
// ============================================
// Spring-based visual "ping" for successful validation.
// Soft, fluid feel - opposite of the aggressive Error Shake.

import { aerostat } from './tween';
import type { AnimationController } from './types';

/**
 * Success pulse configuration options.
 */
export interface PulseOptions {
  /** Maximum scale expansion (default: 1.05) */
  maxScale?: number;
  /** Peak opacity (default: 0.6) */
  peakOpacity?: number;
  /** Spring stiffness (default: 150) */
  stiffness?: number;
  /** Spring damping (default: 25) */
  damping?: number;
  /** Color of the pulse ring (default: '#10b981' - green) */
  color?: string;
  /** Border width of pulse ring (default: 2) */
  borderWidth?: number;
}

/**
 * Success pulse controller.
 */
export interface PulseController {
  /** Trigger the pulse animation */
  pulse: () => void;
  /** Stop any running pulse */
  stop: () => void;
  /** Check if currently pulsing */
  readonly active: boolean;
  /** Cleanup and remove pulse element */
  destroy: () => void;
}

/**
 * Create a success pulse interaction on an element.
 * Adds a hidden pulse layer that "pings" on demand.
 * 
 * @example
 * ```ts
 * import { createPulse } from 'aerostat';
 * 
 * const input = document.querySelector('input');
 * const pulse = createPulse(input);
 * 
 * // Trigger on validation success
 * if (isValid && !wasValid) {
 *   pulse.pulse();
 * }
 * 
 * // Cleanup
 * pulse.destroy();
 * ```
 */
export function createPulse(
  element: HTMLElement,
  options: PulseOptions = {}
): PulseController {
  const {
    maxScale = 1.05,
    peakOpacity = 0.6,
    stiffness = 150,
    damping = 25,
    color = '#10b981',
    borderWidth = 2,
  } = options;

  let scaleController: AnimationController | null = null;
  let opacityController: AnimationController | null = null;
  let pulseEl: HTMLDivElement | null = null;
  let wrapperEl: HTMLDivElement | null = null;

  // Current animated values
  let scale = 1;
  let opacity = 0;

  // Create pulse element as a sibling (inputs can't have children)
  function createPulseElement() {
    if (pulseEl) return;

    const parent = element.parentElement;
    if (!parent) return;

    // Ensure parent has positioning context
    const computedStyle = getComputedStyle(parent);
    if (computedStyle.position === 'static') {
      parent.style.position = 'relative';
    }

    // Get element's border radius
    const elementStyle = getComputedStyle(element);
    const borderRadius = elementStyle.borderRadius || '0px';

    pulseEl = document.createElement('div');
    pulseEl.style.cssText = `
      position: absolute;
      top: ${element.offsetTop - borderWidth}px;
      left: ${element.offsetLeft - borderWidth}px;
      width: ${element.offsetWidth + borderWidth * 2}px;
      height: ${element.offsetHeight + borderWidth * 2}px;
      border: ${borderWidth}px solid ${color};
      border-radius: ${borderRadius};
      pointer-events: none;
      transform: scale(1);
      opacity: 0;
      box-sizing: border-box;
    `;

    parent.appendChild(pulseEl);
  }

  function applyStyles() {
    if (pulseEl) {
      pulseEl.style.transform = `scale(${scale})`;
      pulseEl.style.opacity = `${opacity}`;
    }
  }

  function pulse() {
    createPulseElement();
    
    // Stop any existing animations
    scaleController?.stop();
    opacityController?.stop();

    // Reset to start state
    scale = 1;
    opacity = 0;

    // Animate scale: 1 -> maxScale -> 1
    scaleController = aerostat({
      from: 1,
      to: maxScale,
      stiffness,
      damping,
      onUpdate: (v) => {
        scale = v;
        applyStyles();
      },
      onComplete: () => {
        // Settle back to 1
        scaleController = aerostat({
          from: scale,
          to: 1,
          stiffness: stiffness * 0.8,
          damping: damping * 1.2,
          onUpdate: (v) => {
            scale = v;
            applyStyles();
          },
        });
      },
    });

    // Animate opacity: 0 -> peakOpacity -> 0
    // Quick rise, slow fade
    opacityController = aerostat({
      from: 0,
      to: peakOpacity,
      type: 'duration',
      duration: 100,
      onUpdate: (v) => {
        opacity = v;
        applyStyles();
      },
      onComplete: () => {
        // Slow fade out
        opacityController = aerostat({
          from: peakOpacity,
          to: 0,
          type: 'duration',
          duration: 400,
          onUpdate: (v) => {
            opacity = v;
            applyStyles();
          },
        });
      },
    });
  }

  function stop() {
    scaleController?.stop();
    opacityController?.stop();
    
    // Reset immediately
    scale = 1;
    opacity = 0;
    applyStyles();
  }

  function destroy() {
    stop();
    if (pulseEl && pulseEl.parentNode) {
      pulseEl.parentNode.removeChild(pulseEl);
    }
    pulseEl = null;
  }

  return {
    pulse,
    stop,
    destroy,
    get active() {
      return (scaleController?.active ?? false) || (opacityController?.active ?? false);
    },
  };
}
