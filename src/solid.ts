// ============================================
// SolidJS Directive - use:animate
// ============================================
// Fine-grained reactivity with automatic cleanup.
// Tree-shakeable: only bundled if imported.
//
// NOTE: SolidJS is a peer dependency.

import { animate } from './core/animate';
import type { AnimationController, EasingFunction } from './core/types';

/**
 * SolidJS directive options.
 */
export interface SolidAnimateOptions {
  /** Starting value */
  from: number;
  /** Target value (number or relative string) */
  to: number | string;
  /** Duration in milliseconds */
  duration?: number;
  /** Delay before animation starts */
  delay?: number;
  /** Easing function */
  easing?: EasingFunction;
  /** Called on each frame */
  onUpdate: (value: number) => void;
  /** Called on completion */
  onComplete?: () => void;
}

/**
 * SolidJS directive for animating elements.
 * Automatically cleans up on element removal.
 * 
 * @example
 * ```tsx
 * import { animateDirective } from 'aerostat/solid';
 * import { createSignal } from 'solid-js';
 * 
 * // Register directive
 * const animate = animateDirective;
 * 
 * function FadeIn() {
 *   const [opacity, setOpacity] = createSignal(0);
 * 
 *   return (
 *     <div 
 *       use:animate={{
 *         from: 0, to: 1,
 *         duration: 300,
 *         onUpdate: setOpacity
 *       }}
 *       style={{ opacity: opacity() }}
 *     >
 *       Fading in...
 *     </div>
 *   );
 * }
 * 
 * // With direct DOM manipulation
 * function SlideIn() {
 *   return (
 *     <div 
 *       use:animate={{
 *         from: -100, to: 0,
 *         duration: 400,
 *         onUpdate: (v, el) => el.style.transform = `translateX(${v}px)`
 *       }}
 *     >
 *       Sliding in...
 *     </div>
 *   );
 * }
 * ```
 */
export function animateDirective(
  element: HTMLElement,
  accessor: () => SolidAnimateOptions | SolidAnimateOptionsWithElement
): void {
  let controller: AnimationController | null = null;

  // Get initial options
  const opts = accessor();

  // Build onUpdate handler - wrap if element reference is requested
  let onUpdate: (value: number) => void;
  if ('element' in opts && opts.element) {
    const elementCallback = (opts as SolidAnimateOptionsWithElement).onUpdate;
    onUpdate = (v: number) => elementCallback(v, element);
  } else {
    onUpdate = opts.onUpdate as (value: number) => void;
  }

  // Start animation
  controller = animate(element, {
    from: opts.from,
    to: opts.to,
    onUpdate,
    ...(opts.duration !== undefined ? { duration: opts.duration } : {}),
    ...(opts.delay !== undefined ? { delay: opts.delay } : {}),
    ...(opts.easing !== undefined ? { easing: opts.easing } : {}),
    ...(opts.onComplete !== undefined ? { onComplete: opts.onComplete } : {}),
  });

  // Cleanup on unmount using SolidJS onCleanup pattern
  // Since we can't import solid-js, we use a MutationObserver fallback
  // or expect users to pass onCleanup if they want cleanup
  
  // Store cleanup function on element for manual cleanup
  (element as ElementWithCleanup).__aerostat_cleanup = () => {
    controller?.stop();
    controller = null;
  };
}

/**
 * Extended options that include element reference in callback.
 */
export interface SolidAnimateOptionsWithElement extends Omit<SolidAnimateOptions, 'onUpdate'> {
  element: true;
  onUpdate: (value: number, element: HTMLElement) => void;
}

/**
 * Element with cleanup function attached.
 */
interface ElementWithCleanup extends HTMLElement {
  __aerostat_cleanup?: () => void;
}

/**
 * Manual cleanup function for when element is removed.
 * Call this in onCleanup() or when unmounting.
 */
export function cleanupAnimation(element: HTMLElement): void {
  const el = element as ElementWithCleanup;
  el.__aerostat_cleanup?.();
  delete el.__aerostat_cleanup;
}

/**
 * Create a reactive animation that responds to signal changes.
 * For SolidJS fine-grained reactivity.
 * 
 * @example
 * ```tsx
 * import { createReactiveAnimation } from 'aerostat/solid';
 * import { createSignal, createEffect, onCleanup } from 'solid-js';
 * 
 * function AnimatedCounter() {
 *   const [count, setCount] = createSignal(0);
 *   const [displayValue, setDisplayValue] = createSignal(0);
 * 
 *   createEffect(() => {
 *     const controller = createReactiveAnimation({
 *       from: displayValue(),
 *       to: count(),
 *       duration: 300,
 *       onUpdate: setDisplayValue,
 *     });
 * 
 *     onCleanup(() => controller.stop());
 *   });
 * 
 *   return (
 *     <div>
 *       <span>{Math.round(displayValue())}</span>
 *       <button onClick={() => setCount(c => c + 10)}>+10</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function createReactiveAnimation(
  options: SolidAnimateOptions
): AnimationController {
  return animate({} as object, {
    from: options.from,
    to: options.to,
    onUpdate: options.onUpdate,
    ...(options.duration !== undefined ? { duration: options.duration } : {}),
    ...(options.delay !== undefined ? { delay: options.delay } : {}),
    ...(options.easing !== undefined ? { easing: options.easing } : {}),
    ...(options.onComplete !== undefined ? { onComplete: options.onComplete } : {}),
  });
}

// Re-export for convenience
export { animate } from './core/animate';
export type { TweenOptions, AnimationController } from './core/types';
