<script context="module" lang="ts">
  export type SubmitState = 'idle' | 'morphing' | 'loading' | 'success' | 'error';
  
  export interface MorphSubmitState {
    state: SubmitState;
    width: number;
    borderRadius: number;
    progress: number;
    scale: number;
    textOpacity: number;
    checkOpacity: number;
    isDisabled: boolean;
  }
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { createEventDispatcher, onDestroy } from 'svelte';

  // Props
  export let fullWidth = 160;
  export let circleSize = 48;
  export let strokeWidth = 3;
  export let morphSpring = { stiffness: 300, damping: 25 };
  export let progressSpring = { stiffness: 200, damping: 15 };
  export let popSpring = { stiffness: 400, damping: 12 };
  export let autoReset = true;
  export let resetDelay = 1500;

  const dispatch = createEventDispatcher<{
    submit: void;
    morphStart: void;
    morphComplete: void;
    loadingStart: void;
    progress: { value: number };
    success: void;
    error: void;
    reset: void;
    stateChange: MorphSubmitState;
  }>();

  // State
  let state: SubmitState = 'idle';
  let width = fullWidth;
  let borderRadius = 12;
  let progress = 0;
  let scale = 1;
  let textOpacity = 1;
  let checkOpacity = 0;

  // Computed
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Controllers
  let morphController: AnimationController | null = null;
  let radiusController: AnimationController | null = null;
  let progressController: AnimationController | null = null;
  let scaleController: AnimationController | null = null;

  // Reactive state object
  $: currentState = {
    state,
    width,
    borderRadius,
    progress,
    scale,
    textOpacity,
    checkOpacity,
    isDisabled: state !== 'idle',
  } as MorphSubmitState;

  $: dispatch('stateChange', currentState);

  // === PUBLIC API ===

  /** Start the submit process - morphs button to circle */
  export function submit(): void {
    if (state !== 'idle') return;
    state = 'morphing';
    dispatch('submit');
    dispatch('morphStart');

    // Fade out text
    textOpacity = 0;

    // Morph to circle
    const morphVelocity = morphController?.getVelocity() ?? 0;
    morphController?.stop();

    morphController = aerostat({
      from: width,
      to: circleSize,
      velocity: morphVelocity,
      ...morphSpring,
      onUpdate: (v: number) => {
        width = v;
        // Trigger loading when 80% morphed
        if (v <= fullWidth * 0.3 && state === 'morphing') {
          state = 'loading';
          dispatch('morphComplete');
          dispatch('loadingStart');
        }
      },
    });

    // Morph border radius
    radiusController?.stop();
    radiusController = aerostat({
      from: borderRadius,
      to: circleSize / 2,
      ...morphSpring,
      onUpdate: (v: number) => {
        borderRadius = v;
      },
    });
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
    if (state === 'loading' || state === 'morphing') {
      // Complete progress first
      setProgress(100);
    }
  }

  /** Mark as error and revert */
  export function setError(): void {
    if (state !== 'loading' && state !== 'morphing') return;
    state = 'error';
    dispatch('error');

    // Stop progress
    progressController?.stop();

    // Spring back to original
    const morphVelocity = morphController?.getVelocity() ?? 0;
    morphController?.stop();

    morphController = aerostat({
      from: width,
      to: fullWidth,
      velocity: morphVelocity,
      stiffness: 250,
      damping: 18,
      onUpdate: (v: number) => {
        width = v;
      },
    });

    radiusController?.stop();
    radiusController = aerostat({
      from: borderRadius,
      to: 12,
      stiffness: 250,
      damping: 18,
      onUpdate: (v: number) => {
        borderRadius = v;
      },
      onComplete: () => {
        textOpacity = 1;
        progress = 0;
        state = 'idle';
      },
    });
  }

  /** Reset to initial state */
  export function reset(): void {
    dispatch('reset');

    morphController?.stop();
    morphController = aerostat({
      from: width,
      to: fullWidth,
      ...morphSpring,
      onUpdate: (v: number) => {
        width = v;
      },
    });

    radiusController?.stop();
    radiusController = aerostat({
      from: borderRadius,
      to: 12,
      ...morphSpring,
      onUpdate: (v: number) => {
        borderRadius = v;
      },
      onComplete: () => {
        textOpacity = 1;
        checkOpacity = 0;
        progress = 0;
        state = 'idle';
      },
    });
  }

  /** Get button styles */
  export function getButtonStyle(): string {
    return `width: ${width}px; border-radius: ${borderRadius}px; transform: scale(${scale});`;
  }

  /** Get progress ring stroke offset */
  export function getProgressOffset(): number {
    return circumference - (progress / 100) * circumference;
  }

  /** Get SVG viewBox and dimensions */
  export function getSvgProps(): { viewBox: string; circleSize: number; radius: number; strokeWidth: number; circumference: number } {
    return { viewBox: `0 0 ${circleSize} ${circleSize}`, circleSize, radius, strokeWidth, circumference };
  }

  // === INTERNAL ===

  function handleSuccess() {
    state = 'success';
    dispatch('success');

    // Show checkmark
    checkOpacity = 1;

    // Pop animation
    scaleController?.stop();
    scaleController = aerostat({
      from: 1,
      to: 1.15,
      ...popSpring,
      onUpdate: (v: number) => {
        scale = v;
      },
      onComplete: () => {
        // Settle back
        scaleController = aerostat({
          from: scale,
          to: 1,
          stiffness: 300,
          damping: 20,
          onUpdate: (v: number) => {
            scale = v;
          },
          onComplete: () => {
            if (autoReset) {
              setTimeout(reset, resetDelay);
            }
          },
        });
      },
    });
  }

  onDestroy(() => {
    morphController?.stop();
    radiusController?.stop();
    progressController?.stop();
    scaleController?.stop();
  });
</script>

<slot
  {state}
  {width}
  {borderRadius}
  {progress}
  {scale}
  {textOpacity}
  {checkOpacity}
  isDisabled={state !== 'idle'}
  {submit}
  {setProgress}
  {setSuccess}
  {setError}
  {reset}
  {getButtonStyle}
  {getProgressOffset}
  {getSvgProps}
  {circumference}
/>
