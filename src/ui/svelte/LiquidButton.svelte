<script context="module" lang="ts">
  export type LiquidState = 'idle' | 'loading' | 'success';
  
  export interface LiquidButtonState {
    state: LiquidState;
    progress: number;
    isDisabled: boolean;
    label: string;
  }
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { createEventDispatcher, onDestroy } from 'svelte';

  // Props
  export let idleLabel = 'Submit';
  export let loadingLabel = 'Loading...';
  export let successLabel = 'Done!';
  export let progressSpring = { stiffness: 170, damping: 12 };
  export let revertSpring = { stiffness: 200, damping: 18 };
  export let autoReset = true;
  export let resetDelay = 800;

  const dispatch = createEventDispatcher<{
    start: void;
    progress: { value: number };
    success: void;
    reset: void;
    stateChange: LiquidButtonState;
  }>();

  // State
  let state: LiquidState = 'idle';
  let progress = 0;
  let progressController: AnimationController | null = null;

  // Reactive
  $: isDisabled = state !== 'idle';
  $: label = state === 'success' ? successLabel : state === 'loading' ? loadingLabel : idleLabel;

  $: currentState = {
    state,
    progress,
    isDisabled,
    label,
  } as LiquidButtonState;

  $: dispatch('stateChange', currentState);

  // === PUBLIC API ===

  /** Start loading state */
  export function start(): void {
    if (state !== 'idle') return;
    state = 'loading';
    dispatch('start');
  }

  /** Set progress value (0-100) */
  export function setProgress(target: number): void {
    if (state !== 'loading') return;

    const velocity = progressController?.getVelocity() ?? 0;
    progressController?.stop();

    progressController = aerostat({
      from: progress,
      to: Math.min(100, Math.max(0, target)),
      velocity,
      ...progressSpring,
      onUpdate: (v: number) => {
        progress = v;
        dispatch('progress', { value: v });
      },
      onComplete: () => {
        if (target >= 100) {
          handleSuccess();
        }
      },
    });
  }

  /** Mark as success */
  export function setSuccess(): void {
    if (state === 'loading') {
      setProgress(100);
    }
  }

  /** Reset to initial state */
  export function reset(): void {
    const velocity = progressController?.getVelocity() ?? 0;
    progressController?.stop();

    progressController = aerostat({
      from: progress,
      to: 0,
      velocity,
      ...revertSpring,
      onUpdate: (v: number) => {
        progress = v;
      },
      onComplete: () => {
        state = 'idle';
        dispatch('reset');
      },
    });
  }

  /** Get fill transform style */
  export function getFillStyle(): string {
    return `transform: scaleX(${progress / 100});`;
  }

  /** Get fill scale value */
  export function getFillScale(): number {
    return progress / 100;
  }

  // === INTERNAL ===

  function handleSuccess() {
    state = 'success';
    dispatch('success');
    if (autoReset) {
      setTimeout(reset, resetDelay);
    }
  }

  onDestroy(() => {
    progressController?.stop();
  });
</script>

<slot
  {state}
  {progress}
  {isDisabled}
  {label}
  {start}
  {setProgress}
  {setSuccess}
  {reset}
  {getFillStyle}
  {getFillScale}
/>
