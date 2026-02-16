// ============================================
// Svelte Action - use:animate
// ============================================
// Automatically stops animation on element destroy.
// Tree-shakeable: only bundled if imported.

import { animate } from './core/animate';
import type { TweenOptions, AnimationController } from './core/types';

/**
 * Svelte action options - extends TweenOptions with auto-start control.
 */
export interface SvelteAnimateOptions extends Omit<TweenOptions, 'onUpdate'> {
  /** Property to animate (e.g., 'opacity', 'transform') */
  property?: string;
  /** CSS unit (e.g., 'px', '%', 'deg') */
  unit?: string;
  /** Transform function (e.g., 'translateX', 'rotate', 'scale') */
  transform?: string;
  /** Custom onUpdate handler (overrides property/unit/transform) */
  onUpdate?: (value: number, element: HTMLElement) => void;
}

/**
 * Svelte action return type.
 */
export interface SvelteActionReturn {
  update?: (options: SvelteAnimateOptions) => void;
  destroy?: () => void;
}

/**
 * Svelte action for animating elements.
 * Automatically cleans up on element destroy.
 * 
 * @example
 * ```svelte
 * <script>
 *   import { animateAction } from 'aerostat/svelte';
 *   let show = true;
 * </script>
 * 
 * {#if show}
 *   <div use:animateAction={{ 
 *     from: 0, to: 1, 
 *     property: 'opacity',
 *     duration: 300 
 *   }}>
 *     Fading in...
 *   </div>
 * {/if}
 * 
 * <!-- With transform -->
 * <div use:animateAction={{
 *   from: 0, to: 100,
 *   transform: 'translateX',
 *   unit: 'px'
 * }}>
 *   Sliding...
 * </div>
 * ```
 */
export function animateAction(
  node: HTMLElement,
  options: SvelteAnimateOptions
): SvelteActionReturn {
  let controller: AnimationController | null = null;

  function createAnimation(opts: SvelteAnimateOptions): void {
    // Stop any existing animation
    controller?.stop();

    // Build onUpdate handler
    const onUpdate = opts.onUpdate 
      ? (v: number) => opts.onUpdate!(v, node)
      : createDefaultHandler(node, opts);

    // Start animation
    controller = animate(node, {
      from: opts.from,
      to: opts.to,
      onUpdate,
      ...(opts.duration !== undefined ? { duration: opts.duration } : {}),
      ...(opts.delay !== undefined ? { delay: opts.delay } : {}),
      ...(opts.easing !== undefined ? { easing: opts.easing } : {}),
      ...(opts.onComplete !== undefined ? { onComplete: opts.onComplete } : {}),
    });
  }

  // Initial animation
  createAnimation(options);

  return {
    // Update handler for reactive options
    update(newOptions: SvelteAnimateOptions) {
      createAnimation(newOptions);
    },

    // Cleanup on destroy
    destroy() {
      controller?.stop();
      controller = null;
    },
  };
}

/**
 * Create a default onUpdate handler based on property/transform/unit.
 */
function createDefaultHandler(
  node: HTMLElement,
  opts: SvelteAnimateOptions
): (value: number) => void {
  const { property = 'opacity', unit = '', transform } = opts;

  if (transform) {
    // Transform function
    return (v: number) => {
      node.style.transform = `${transform}(${v}${unit})`;
    };
  }

  // Direct property
  return (v: number) => {
    node.style.setProperty(property, `${v}${unit}`);
  };
}

// Re-export for convenience
export { animate } from './core/animate';
export type { TweenOptions, AnimationController } from './core/types';

// ============================================
// Svelte Action - use:squish
// ============================================
// Haptic "pop" feedback for buttons.

import { createSquish } from './core/squish';
import type { SquishOptions, SquishController } from './core/squish';

/**
 * Svelte action for haptic "squish" button feedback.
 * Applies press-down and spring-release animations automatically.
 * 
 * @example
 * ```svelte
 * <script>
 *   import { squish } from 'aerostat/svelte';
 * </script>
 * 
 * <button use:squish>Click me</button>
 * 
 * <!-- With options -->
 * <button use:squish={{ pressScale: 0.9, releaseStiffness: 600 }}>
 *   Extra bouncy
 * </button>
 * ```
 */
export function squish(
  node: HTMLElement,
  options: SquishOptions = {}
): { destroy: () => void } {
  const controller = createSquish(node, options);

  return {
    destroy() {
      controller.destroy();
    },
  };
}

// Re-export squish utilities
export { createSquish } from './core/squish';
export type { SquishOptions, SquishController } from './core/squish';

// ============================================
// Svelte Action - use:shakeAction
// ============================================
// Error state "pluck and vibrate" feedback.

import { createShake, shake as shakeOnce } from './core/shake';
import type { ShakeOptions, ShakeController } from './core/shake';

/**
 * Svelte action for shake error feedback.
 * Returns a trigger function to shake the element.
 * 
 * @example
 * ```svelte
 * <script>
 *   import { shakeAction } from 'aerostat/svelte';
 *   let shaker;
 *   
 *   function onError() {
 *     shaker?.shake();
 *   }
 * </script>
 * 
 * <input use:shakeAction bind:this={shaker} />
 * <button on:click={onError}>Trigger Error</button>
 * ```
 */
export function shakeAction(
  node: HTMLElement,
  options: ShakeOptions = {}
): { destroy: () => void; shake: () => void } {
  const controller = createShake(node, options);

  return {
    shake: controller.shake,
    destroy() {
      controller.stop();
    },
  };
}

// Re-export shake utilities
export { createShake, shake } from './core/shake';
export type { ShakeOptions, ShakeController } from './core/shake';

// ============================================
// Svelte Action - use:pulseAction
// ============================================
// Success validation feedback with soft pulse.

import { createPulse } from './core/pulse';
import type { PulseOptions, PulseController } from './core/pulse';

/**
 * Svelte action for success pulse feedback.
 * Returns a trigger function to pulse the element.
 * 
 * @example
 * ```svelte
 * <script>
 *   import { pulseAction } from 'aerostat/svelte';
 *   let pulser;
 *   let isValid = false;
 *   let wasValid = false;
 *   
 *   $: if (isValid && !wasValid) {
 *     pulser?.pulse();
 *   }
 *   $: wasValid = isValid;
 * </script>
 * 
 * <input use:pulseAction bind:this={pulser} />
 * ```
 */
export function pulseAction(
  node: HTMLElement,
  options: PulseOptions = {}
): { destroy: () => void; pulse: () => void; stop: () => void } {
  const controller = createPulse(node, options);

  return {
    pulse: controller.pulse,
    stop: controller.stop,
    destroy() {
      controller.destroy();
    },
  };
}

// Re-export pulse utilities
export { createPulse } from './core/pulse';
export type { PulseOptions, PulseController } from './core/pulse';
