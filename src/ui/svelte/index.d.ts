// Type declarations for Aerostat UI Svelte Components
import type { SvelteComponent } from 'svelte';
import type { AnimationController, SquishOptions, ShakeOptions } from '../../core';

// LiquidSubmit Component Props
export interface LiquidSubmitProps {
  /** Current progress value (0-100) */
  progress?: number;
  /** Button state */
  state?: 'idle' | 'loading' | 'success' | 'error';
  /** Disable the button */
  disabled?: boolean;
  /** Spring stiffness for progress animation */
  stiffness?: number;
  /** Spring damping (lower = more "slosh") */
  damping?: number;
  /** Auto-reset to idle after success (ms). Set to 0 to disable. */
  resetDelay?: number;
  /** Classes for the button container */
  buttonClass?: string;
  /** Classes for the fill/progress layer */
  fillClass?: string;
  /** Classes applied when idle */
  idleClass?: string;
  /** Classes applied when loading */
  loadingClass?: string;
  /** Classes applied on success */
  successClass?: string;
  /** Classes applied on error */
  errorClass?: string;
}

export interface LiquidSubmitEvents {
  click: void;
  progress: number;
  statechange: 'idle' | 'loading' | 'success' | 'error';
}

export interface LiquidSubmitSlots {
  idle: Record<string, never>;
  loading: { progress: number; displayProgress: number };
  success: Record<string, never>;
  error: Record<string, never>;
}

/** Headless Liquid Submit Button Component */
export class LiquidSubmit extends SvelteComponent<
  LiquidSubmitProps,
  LiquidSubmitEvents,
  LiquidSubmitSlots
> {
  /** Trigger error state and reset */
  triggerError(): void;
  /** Reset to idle */
  resetState(): void;
}

// Re-export core utilities
export { aerostat, createSquish, createShake } from '../../core';
export type { AnimationController, SquishOptions, ShakeOptions };
