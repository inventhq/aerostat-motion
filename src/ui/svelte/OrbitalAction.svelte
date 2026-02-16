<script context="module" lang="ts">
  export interface OrbitalActionState {
    step: number;
    totalSteps: number;
    progress: number;
    progressPercent: number;
    isComplete: boolean;
    strokeOffset: number;
    popScale: number;
    isAnimating: boolean;
  }
  
  export interface OrbitalActionStyles {
    container: string;
    svg: string;
    progressRing: string;
    button: string;
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  
  // ============================================
  // Props
  // ============================================
  
  /** Current step (0-indexed) */
  export let step = 0;
  
  /** Total number of steps */
  export let totalSteps = 4;
  
  /** Button size in pixels */
  export let size = 80;
  
  /** Orbit stroke width */
  export let strokeWidth = 4;
  
  /** Orbit color */
  export let orbitColor = '#e5e5e5';
  
  /** Progress color */
  export let progressColor = '#171717';
  
  /** Core button color */
  export let coreColor = '#171717';
  
  /** Complete color */
  export let completeColor = '#10b981';
  
  /** Spring stiffness for progress fill */
  export let fillStiffness = 180;
  
  /** Spring damping for progress fill */
  export let fillDamping = 15;
  
  /** Spring stiffness for completion pop */
  export let popStiffness = 300;
  
  /** Spring damping for completion pop */
  export let popDamping = 20;
  
  /** Pop scale amount */
  export let popScaleAmount = 1.1;

  // ============================================
  // Internal State
  // ============================================
  
  const dispatch = createEventDispatcher<{
    stepChange: { step: number; prevStep: number };
    complete: { totalSteps: number };
    animationStart: void;
    animationComplete: void;
    stateChange: OrbitalActionState;
  }>();
  
  // SVG geometry (SSR-safe)
  const viewBox = size;
  const center = size / 2;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  
  // Animation state
  let strokeOffset = circumference;
  let strokeController: AnimationController | null = null;
  let popScale = 1;
  let popController: AnimationController | null = null;
  let prevStep = step;
  let isAnimating = false;

  // ============================================
  // Animation Logic
  // ============================================

  function animateProgress(newStep: number) {
    const progress = newStep / totalSteps;
    const targetOffset = circumference * (1 - progress);
    
    const velocity = strokeController?.getVelocity() ?? 0;
    strokeController?.stop();
    
    isAnimating = true;
    dispatch('animationStart');
    emitStateChange();
    
    strokeController = aerostat({
      from: strokeOffset,
      to: targetOffset,
      velocity,
      stiffness: fillStiffness,
      damping: fillDamping,
      onUpdate: (v: number) => {
        strokeOffset = v;
        emitStateChange();
      },
      onComplete: () => {
        isAnimating = false;
        dispatch('animationComplete');
        if (newStep === totalSteps) {
          triggerCompletionPop();
          dispatch('complete', { totalSteps });
        }
        emitStateChange();
      },
    });
  }

  function triggerCompletionPop() {
    popController?.stop();
    
    popController = aerostat({
      from: 1,
      to: popScaleAmount,
      stiffness: popStiffness,
      damping: popDamping,
      onUpdate: (v: number) => { popScale = v; emitStateChange(); },
      onComplete: () => {
        popController = aerostat({
          from: popScaleAmount,
          to: 1,
          stiffness: 250,
          damping: 18,
          onUpdate: (v: number) => { popScale = v; emitStateChange(); },
        });
      },
    });
  }

  // React to step changes
  $: if (step !== prevStep) {
    dispatch('stepChange', { step, prevStep });
    animateProgress(step);
    prevStep = step;
  }

  // Initialize on first render
  $: if (strokeOffset === circumference && step > 0) {
    animateProgress(step);
  }

  onDestroy(() => {
    strokeController?.stop();
    popController?.stop();
  });

  // ============================================
  // Public API
  // ============================================
  
  export function next(): boolean {
    if (step < totalSteps) {
      step += 1;
      return true;
    }
    return false;
  }

  export function prev(): boolean {
    if (step > 0) {
      step -= 1;
      return true;
    }
    return false;
  }

  export function reset(): void {
    step = 0;
  }

  export function setStep(newStep: number): void {
    step = Math.max(0, Math.min(totalSteps, newStep));
  }
  
  export function complete(): void {
    step = totalSteps;
  }

  // ============================================
  // Style Helpers
  // ============================================
  
  export function getContainerStyle(): string {
    return `width: ${size}px; height: ${size}px; transform: scale(${popScale}); will-change: transform;`;
  }
  
  export function getSvgProps(): { width: number; height: number; viewBox: string } {
    return { width: size, height: size, viewBox: `0 0 ${viewBox} ${viewBox}` };
  }
  
  export function getTrackProps(): { cx: number; cy: number; r: number; stroke: string; strokeWidth: number } {
    return { cx: center, cy: center, r: radius, stroke: orbitColor, strokeWidth };
  }
  
  export function getProgressProps(): {
    cx: number; cy: number; r: number; stroke: string; strokeWidth: number;
    strokeDasharray: number; strokeDashoffset: number; transform: string;
  } {
    return {
      cx: center, cy: center, r: radius, stroke: progressColor, strokeWidth,
      strokeDasharray: circumference, strokeDashoffset: strokeOffset,
      transform: `rotate(-90 ${center} ${center})`,
    };
  }
  
  export function getButtonStyle(): string {
    const btnSize = size - strokeWidth * 4;
    const bg = step === totalSteps ? completeColor : coreColor;
    return `width: ${btnSize}px; height: ${btnSize}px; background: ${bg};`;
  }

  // ============================================
  // State Management
  // ============================================
  
  function emitStateChange() {
    dispatch('stateChange', {
      step,
      totalSteps,
      progress: step / totalSteps,
      progressPercent: Math.round((step / totalSteps) * 100),
      isComplete: step === totalSteps,
      strokeOffset,
      popScale,
      isAnimating,
    });
  }
  
  // Reactive state
  $: isComplete = step === totalSteps;
  $: progress = step / totalSteps;
  $: progressPercent = Math.round((step / totalSteps) * 100);
  
  $: state = {
    step,
    totalSteps,
    progress,
    progressPercent,
    isComplete,
    strokeOffset,
    popScale,
    isAnimating,
  } as OrbitalActionState;
</script>

<slot
  {state}
  {step}
  {totalSteps}
  {progress}
  {progressPercent}
  {isComplete}
  {strokeOffset}
  {popScale}
  {isAnimating}
  {circumference}
  {center}
  {radius}
  {next}
  {prev}
  {reset}
  {setStep}
  {complete}
  {getContainerStyle}
  {getSvgProps}
  {getTrackProps}
  {getProgressProps}
  {getButtonStyle}
/>
