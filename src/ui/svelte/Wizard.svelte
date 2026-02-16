<!--
  Headless Wizard - Directional Slide Transitions
  =================================================
  Multi-step form wizard with synchronized spring animations.
  Fully headless - you control all styling via slots and props.
-->
<script lang="ts" context="module">
  export type WizardDirection = 'forward' | 'backward' | null;
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Total number of steps */
  export let steps: number;
  
  /** Current step index (0-based). Bind to control externally. */
  export let currentStep = 0;
  
  /** Spring stiffness (default: 280) */
  export let stiffness = 280;
  
  /** Spring damping (default: 26) */
  export let damping = 26;
  
  /** Animate height changes (default: true) */
  export let animateHeight = true;

  // ============================================
  // Styling Props (Headless Pattern)
  // ============================================
  
  /** Classes for the outer container */
  export let containerClass = '';
  
  /** Classes for each step wrapper */
  export let stepClass = '';

  // ============================================
  // Internal State
  // ============================================
  
  const dispatch = createEventDispatcher<{
    change: { from: number; to: number; direction: WizardDirection };
    complete: { step: number };
  }>();

  let direction: WizardDirection = null;
  let previousStep: number | null = null;
  let isAnimating = false;
  
  // Animation positions (percentage)
  let currentX = 0;
  let previousX = 0;
  let containerHeight: number | null = null;
  
  // Controllers
  let currentController: AnimationController | null = null;
  let previousController: AnimationController | null = null;
  let heightController: AnimationController | null = null;
  
  // DOM refs
  let containerEl: HTMLDivElement;
  let stepEls: HTMLDivElement[] = [];

  // ============================================
  // Public API
  // ============================================

  /** Go to next step */
  export function next() {
    if (currentStep >= steps - 1) return;
    goToStep(currentStep + 1, 'forward');
  }

  /** Go to previous step */
  export function prev() {
    if (currentStep <= 0) return;
    goToStep(currentStep - 1, 'backward');
  }

  /** Go to specific step */
  export function goTo(step: number) {
    if (step < 0 || step >= steps || step === currentStep) return;
    const dir = step > currentStep ? 'forward' : 'backward';
    goToStep(step, dir);
  }

  // ============================================
  // Animation Logic
  // ============================================

  function goToStep(newStep: number, dir: WizardDirection) {
    const fromStep = currentStep;
    
    // Capture current velocities for smooth interrupt
    const currentVelocity = currentController?.getVelocity() ?? 0;
    const prevVelocity = previousController?.getVelocity() ?? 0;
    
    // Stop existing animations
    currentController?.stop();
    previousController?.stop();
    heightController?.stop();
    
    // Setup transition
    previousStep = fromStep;
    direction = dir;
    isAnimating = true;
    
    dispatch('change', { from: fromStep, to: newStep, direction: dir });
    
    // Calculate start positions based on current state or fresh start
    const currentStartX = isAnimating ? currentX : 0;
    const previousStartX = isAnimating ? previousX : (dir === 'forward' ? 100 : -100);
    
    // Determine targets
    const currentTargetX = dir === 'forward' ? -100 : 100;
    const newTargetX = 0;
    const newStartX = dir === 'forward' ? 100 : -100;
    
    // Update step index immediately for rendering
    currentStep = newStep;
    
    // Animate outgoing step (previous)
    previousX = currentStartX;
    previousController = aerostat({
      from: currentStartX,
      to: currentTargetX,
      velocity: currentVelocity,
      stiffness,
      damping,
      onUpdate: (v) => {
        previousX = v;
      },
    });
    
    // Animate incoming step (current)
    currentX = newStartX;
    currentController = aerostat({
      from: newStartX,
      to: newTargetX,
      velocity: prevVelocity,
      stiffness,
      damping,
      onUpdate: (v) => {
        currentX = v;
      },
      onComplete: () => {
        // Cleanup after animation
        isAnimating = false;
        previousStep = null;
        direction = null;
        currentX = 0;
        dispatch('complete', { step: newStep });
      },
    });
    
    // Animate height if enabled
    if (animateHeight) {
      animateContainerHeight(newStep);
    }
  }

  function animateContainerHeight(toStep: number) {
    // Wait for DOM to update, then measure
    requestAnimationFrame(() => {
      const stepEl = stepEls[toStep];
      if (!stepEl || !containerEl) return;
      
      const currentHeight = containerEl.offsetHeight;
      const targetHeight = stepEl.scrollHeight;
      
      if (currentHeight === targetHeight) return;
      
      heightController = aerostat({
        from: currentHeight,
        to: targetHeight,
        stiffness: stiffness * 0.8, // Slightly softer for height
        damping: damping * 1.2,
        onUpdate: (v) => {
          containerHeight = v;
        },
        onComplete: () => {
          containerHeight = null; // Return to auto
        },
      });
    });
  }

  // ============================================
  // Computed
  // ============================================

  $: canGoNext = currentStep < steps - 1;
  $: canGoPrev = currentStep > 0;
  $: progress = (currentStep + 1) / steps;

  onDestroy(() => {
    currentController?.stop();
    previousController?.stop();
    heightController?.stop();
  });
</script>

<!--
  The wizard renders:
  - A container with overflow:hidden
  - The current step (always visible)
  - The previous step (only during transition)
-->
<div
  bind:this={containerEl}
  class="wizard-container {containerClass}"
  style="position: relative; overflow: hidden; {containerHeight !== null ? `height: ${containerHeight}px;` : ''}"
>
  <!-- Previous step (exiting) -->
  {#if previousStep !== null && isAnimating}
    <div
      bind:this={stepEls[previousStep]}
      class="wizard-step {stepClass}"
      style="position: absolute; inset: 0; transform: translateX({previousX}%); will-change: transform;"
    >
      <slot name="step" step={previousStep} {isAnimating} {direction} />
    </div>
  {/if}

  <!-- Current step (entering or static) -->
  <div
    bind:this={stepEls[currentStep]}
    class="wizard-step {stepClass}"
    style="
      {isAnimating ? 'position: absolute; inset: 0;' : ''}
      transform: translateX({currentX}%);
      will-change: transform;
    "
  >
    <slot name="step" step={currentStep} {isAnimating} {direction} />
  </div>
</div>

<!-- Navigation slot -->
<slot 
  name="navigation" 
  {currentStep} 
  {steps} 
  {canGoNext} 
  {canGoPrev} 
  {progress}
  {isAnimating}
  {next}
  {prev}
  goTo={goTo}
/>
