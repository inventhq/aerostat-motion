// ============================================
// Physics & Math Module - Spring & Lerp
// ============================================
// Core transition math for micro-interactions.
// Springs are naturally interruptible (velocity-based).

import type { EasingFunction } from './types';

// ============================================
// Linear Interpolation
// ============================================

/**
 * Linear interpolation between two values.
 * @param a - Start value
 * @param b - End value
 * @param t - Progress (0-1)
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Inverse lerp - find progress from value.
 * @param a - Start value
 * @param b - End value
 * @param value - Current value
 */
export function invLerp(a: number, b: number, value: number): number {
  return (value - a) / (b - a);
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================
// Spring Physics
// ============================================

/**
 * Spring state for physics simulation.
 * Uses semi-implicit Euler integration for stability.
 */
export interface SpringState {
  /** Current position/value */
  value: number;
  /** Current velocity */
  velocity: number;
}

/**
 * Spring configuration.
 */
export interface SpringParams {
  /** Spring stiffness (spring constant k) */
  stiffness: number;
  /** Damping coefficient */
  damping: number;
  /** Mass of the object */
  mass: number;
}

/**
 * Solve one step of a damped harmonic oscillator.
 * Uses Hooke's Law: F = -k * x
 * With damping: F = -k * x - c * v
 * 
 * @param state - Current spring state (mutated in place)
 * @param target - Target position
 * @param params - Spring parameters
 * @param delta - Time step in seconds
 * @returns Whether the spring is still in motion
 */
export function springStep(
  state: SpringState,
  target: number,
  params: SpringParams,
  delta: number
): boolean {
  const { stiffness, damping, mass } = params;

  // Displacement from equilibrium
  const displacement = state.value - target;

  // Spring force: F = -k * x (Hooke's law - pulls toward target)
  const springForce = -stiffness * displacement;

  // Damping force: F = -c * v (opposes motion, prevents oscillation)
  const dampingForce = -damping * state.velocity;

  // Total force
  const force = springForce + dampingForce;

  // Acceleration: a = F / m (Newton's second law)
  const acceleration = force / mass;

  // Semi-implicit Euler integration (more stable than explicit Euler)
  // Update velocity first, then position
  state.velocity += acceleration * delta;
  state.value += state.velocity * delta;

  // Return true if still moving
  return !isAtRest(state, target, 0.001, 0.001);
}

/**
 * Check if a spring has settled.
 */
export function isAtRest(
  state: SpringState,
  target: number,
  velocityThreshold: number,
  displacementThreshold: number
): boolean {
  return (
    Math.abs(state.velocity) < velocityThreshold &&
    Math.abs(state.value - target) < displacementThreshold
  );
}

/**
 * Calculate the theoretical duration of a spring animation.
 * Uses the formula for critically damped spring duration.
 * This is an approximation for visual purposes.
 */
export function springDuration(params: SpringParams): number {
  const { stiffness, damping, mass } = params;
  // Natural frequency
  const omega = Math.sqrt(stiffness / mass);
  // Damping ratio
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  
  // Approximate settling time (3-4 time constants for critically damped)
  // For underdamped: oscillations, for overdamped: slow approach
  if (zeta < 1) {
    // Underdamped - oscillates
    return (4 / (omega * Math.sqrt(1 - zeta * zeta))) * 1000;
  } else {
    // Critically damped or overdamped
    return (4 / (zeta * omega)) * 1000;
  }
}

// ============================================
// Cubic Bezier Easing
// ============================================

/**
 * Unit cubic bezier solver for custom easing curves.
 * Similar to CSS cubic-bezier().
 * 
 * @param x1 - Control point 1 x (0-1)
 * @param y1 - Control point 1 y (0-1)  
 * @param x2 - Control point 2 x (0-1)
 * @param y2 - Control point 2 y (0-1)
 * @returns Easing function
 */
export function cubicBezier(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): EasingFunction {
  // Cache for performance
  const cache = new Map<number, number>();
  
  return (t: number): number => {
    // Check cache
    const cached = cache.get(t);
    if (cached !== undefined) return cached;
    
    // Handle edge cases
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    
    // Newton-Raphson iteration to solve for t given x
    // Bezier curve: x(t) = 3*t*(1-t)^2*x1 + 3*t^2*(1-t)*x2 + t^3
    // We need to find t such that x(t) = input_t
    
    let guess = t;
    for (let i = 0; i < 8; i++) {
      // Current x value at guess
      const x = bezierValue(guess, x1, x2);
      
      // Derivative at guess
      const dx = bezierDerivative(guess, x1, x2);
      
      if (dx === 0) break;
      
      // Newton-Raphson update
      const nextGuess = guess - (x - t) / dx;
      
      // Converged
      if (Math.abs(nextGuess - guess) < 1e-6) break;
      
      guess = clamp(nextGuess, 0, 1);
    }
    
    // Calculate y at the found t
    const result = bezierValue(guess, y1, y2);
    cache.set(t, result);
    
    return result;
  };
}

/**
 * Calculate cubic bezier value at parameter t.
 */
function bezierValue(t: number, p1: number, p2: number): number {
  const t2 = t * t;
  const t3 = t2 * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  
  // B(t) = 3*(1-t)^2*t*P1 + 3*(1-t)*t^2*P2 + t^3
  return 3 * mt2 * t * p1 + 3 * mt * t2 * p2 + t3;
}

/**
 * Calculate derivative of cubic bezier at parameter t.
 */
function bezierDerivative(t: number, p1: number, p2: number): number {
  const t2 = t * t;
  const mt = 1 - t;
  const mt2 = mt * mt;
  
  // B'(t) = 3*(1-t)^2*P1 + 6*(1-t)*t*P2 + 3*t^2
  // Wait, that's not right for our control points
  // Actually: derivative of bezier with control points (0,0), (p1,?), (p2,?), (1,1)
  return 3 * mt2 * p1 + 6 * mt * t * (p2 - p1) + 3 * t2 * (1 - p2);
}
