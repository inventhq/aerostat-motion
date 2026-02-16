// ============================================
// React/Next.js Hook - useAnimate
// ============================================
// Uses useEffect for automatic cleanup.
// Tree-shakeable: only bundled if imported.
//
// NOTE: This file requires React as a peer dependency.
// Install with: npm install react

import { animate } from './core/animate';
import type { AnimationController, EasingFunction } from './core/types';

/**
 * React hook options.
 */
export interface UseAnimateOptions {
  /** Starting value */
  from: number;
  /** Target value (number or relative string like '+=100') */
  to: number | string;
  /** Duration in milliseconds */
  duration?: number;
  /** Delay before animation starts */
  delay?: number;
  /** Easing function */
  easing?: EasingFunction;
  /** Called on each frame with interpolated value */
  onUpdate: (value: number) => void;
  /** Called when animation completes */
  onComplete?: () => void;
  /** Whether to run the animation (for conditional triggering) */
  enabled?: boolean;
  /** Dependencies to re-trigger animation (similar to useEffect deps) */
  deps?: readonly unknown[];
}

/**
 * React hook return type.
 */
export interface UseAnimateReturn {
  /** Start or restart the animation */
  start: () => void;
  /** Stop the animation */
  stop: () => void;
  /** Whether animation is currently running */
  isAnimating: boolean;
  /** The animation controller (may be null if not started) */
  controller: AnimationController | null;
}

// Minimal React types (peer dependency)
interface ReactRef<T> { current: T }
type ReactDispatch<T> = (value: T) => void;

/**
 * React hook for animations with automatic cleanup.
 * 
 * @example
 * ```tsx
 * import { useAnimate } from 'aerostat/react';
 * import { useState } from 'react';
 * 
 * function FadeIn() {
 *   const [opacity, setOpacity] = useState(0);
 * 
 *   useAnimate({
 *     from: 0,
 *     to: 1,
 *     duration: 300,
 *     onUpdate: setOpacity,
 *   });
 * 
 *   return <div style={{ opacity }}>Fading in...</div>;
 * }
 * 
 * // Conditional animation
 * function Toggle({ isOpen }: { isOpen: boolean }) {
 *   const [height, setHeight] = useState(isOpen ? 100 : 0);
 * 
 *   useAnimate({
 *     from: height,
 *     to: isOpen ? 100 : 0,
 *     duration: 200,
 *     onUpdate: setHeight,
 *     deps: [isOpen],
 *   });
 * 
 *   return <div style={{ height, overflow: 'hidden' }}>Content</div>;
 * }
 * ```
 */
export function useAnimate(
  options: UseAnimateOptions,
  // React hooks passed in to avoid bundling React
  hooks: {
    useRef: <T>(initial: T) => ReactRef<T>;
    useEffect: (effect: () => (() => void) | void, deps?: readonly unknown[]) => void;
    useCallback: <T extends (...args: unknown[]) => unknown>(fn: T, deps: readonly unknown[]) => T;
    useState: <T>(initial: T) => [T, ReactDispatch<T>];
  }
): UseAnimateReturn {
  const { useRef, useEffect, useCallback, useState } = hooks;

  const controllerRef = useRef<AnimationController | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const {
    from,
    to,
    duration,
    delay,
    easing,
    onUpdate,
    onComplete,
    enabled = true,
    deps = [],
  } = options;

  const start = useCallback(() => {
    // Stop any existing animation
    controllerRef.current?.stop();

    setIsAnimating(true);

    controllerRef.current = animate({} as object, {
      from,
      to,
      onUpdate,
      ...(duration !== undefined ? { duration } : {}),
      ...(delay !== undefined ? { delay } : {}),
      ...(easing !== undefined ? { easing } : {}),
      onComplete: () => {
        setIsAnimating(false);
        onComplete?.();
      },
    });
  }, [from, to, duration, delay, easing, onUpdate, onComplete]);

  const stop = useCallback(() => {
    controllerRef.current?.stop();
    setIsAnimating(false);
  }, []);

  // Auto-start and cleanup
  useEffect(() => {
    if (enabled) {
      start();
    }

    return () => {
      controllerRef.current?.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  return {
    start,
    stop,
    isAnimating,
    controller: controllerRef.current,
  };
}

/**
 * Factory to create the hook with React injected.
 * This is the recommended way to use in React apps.
 * 
 * @example
 * ```tsx
 * import { createUseAnimate } from 'aerostat/react';
 * import * as React from 'react';
 * 
 * const useAnimate = createUseAnimate(React);
 * 
 * function MyComponent() {
 *   useAnimate({ from: 0, to: 1, onUpdate: ... });
 * }
 * ```
 */
export function createUseAnimate(React: {
  useRef: <T>(initial: T) => ReactRef<T>;
  useEffect: (effect: () => (() => void) | void, deps?: readonly unknown[]) => void;
  useCallback: <T extends (...args: unknown[]) => unknown>(fn: T, deps: readonly unknown[]) => T;
  useState: <T>(initial: T) => [T, ReactDispatch<T>];
}) {
  return (options: UseAnimateOptions) => useAnimate(options, React);
}

// Re-export for convenience
export { animate } from './core/animate';
export type { TweenOptions, AnimationController } from './core/types';
