<script context="module" lang="ts">
  export interface LiquidProgressState {
    progress: number;
    displayProgress: number;
    isAnimating: boolean;
    percent: number;
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  
  // ============================================
  // Props
  // ============================================
  
  /** Target progress value (0-100) */
  export let progress = 0;
  
  /** Spring stiffness */
  export let stiffness = 170;
  
  /** Spring damping (low = visible slosh) */
  export let damping = 12;

  // ============================================
  // Internal State
  // ============================================
  
  const dispatch = createEventDispatcher<{
    change: { value: number };
    complete: { value: number };
    stateChange: LiquidProgressState;
  }>();
  
  let displayProgress = 0;
  let controller: AnimationController | null = null;
  let isAnimating = false;

  // ============================================
  // Animation Methods
  // ============================================
  
  function animateToProgress(target: number) {
    const clampedTarget = Math.max(0, Math.min(100, target));
    const currentVelocity = controller?.getVelocity() ?? 0;
    controller?.stop();
    
    isAnimating = true;
    emitStateChange();
    
    controller = aerostat({
      from: displayProgress,
      to: clampedTarget,
      velocity: currentVelocity,
      stiffness,
      damping,
      onUpdate: (v: number) => {
        displayProgress = v;
        dispatch('change', { value: v });
        emitStateChange();
      },
      onComplete: () => {
        isAnimating = false;
        dispatch('complete', { value: displayProgress });
        emitStateChange();
      },
    });
  }

  export function setProgress(value: number): void {
    progress = Math.max(0, Math.min(100, value));
  }

  export function reset(): void {
    controller?.stop();
    progress = 0;
    displayProgress = 0;
    isAnimating = false;
    emitStateChange();
  }

  // ============================================
  // Style Helpers
  // ============================================
  
  export function getFillStyle(): string {
    return `transform: scaleX(${displayProgress / 100}); transform-origin: left center; will-change: transform;`;
  }

  export function getFillPercent(): number {
    return displayProgress / 100;
  }

  // ============================================
  // State Management
  // ============================================
  
  function emitStateChange() {
    dispatch('stateChange', {
      progress,
      displayProgress,
      isAnimating,
      percent: Math.round(displayProgress),
    });
  }

  // Reactive: animate when progress changes
  $: if (progress !== undefined) {
    animateToProgress(progress);
  }

  onDestroy(() => {
    controller?.stop();
  });

  // Reactive computed
  $: percent = Math.round(displayProgress);
  
  $: state = {
    progress,
    displayProgress,
    isAnimating,
    percent,
  } as LiquidProgressState;
</script>

<slot
  {state}
  {progress}
  {displayProgress}
  {isAnimating}
  {percent}
  {setProgress}
  {reset}
  {getFillStyle}
  {getFillPercent}
/>
