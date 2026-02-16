// ============================================
// Minimal Easing Functions
// ============================================
// Only the essential curves for micro-interactions.
// easeOutExpo + easeInOutCubic = gold standard for UI.

import type { EasingFunction, EasingName } from './types';

/**
 * Linear easing - no acceleration.
 * Use sparingly; feels mechanical for UI.
 */
export const linear: EasingFunction = (t: number): number => t;

/**
 * Exponential ease out - the gold standard for UI.
 * Fast start, smooth deceleration.
 * Perfect for: buttons, cards, modals appearing.
 * 
 * Formula: 1 - 2^(-10 * t) for t < 1, else 1
 */
export const easeOutExpo: EasingFunction = (t: number): number => {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
};

/**
 * Cubic ease in-out - smooth acceleration and deceleration.
 * Good for: looping animations, bidirectional transitions.
 * 
 * Formula: 4t³ for t < 0.5, else 1 - (-2t + 2)³ / 2
 */
export const easeInOutCubic: EasingFunction = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

/**
 * Lookup table for named easings.
 */
export const easings: Record<EasingName, EasingFunction> = {
  linear,
  easeOutExpo,
  easeInOutCubic,
};

/**
 * Get an easing function by name.
 * Falls back to easeOutExpo if not found.
 */
export function getEasing(name: EasingName): EasingFunction {
  return easings[name] ?? easeOutExpo;
}
