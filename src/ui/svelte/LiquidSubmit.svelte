<!--
  Headless Liquid Submit Button
  ==============================
  A fully animated submit button that handles:
  - Liquid fill progress with spring physics
  - Success/error state transitions
  - Interrupt handling
  
  The component is HEADLESS - it provides animation logic
  but lets you control all styling via props and slots.
-->
<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Current progress value (0-100). Bind to control externally. */
  export let progress = 0;
  
  /** Button state. Bind to control externally or let component manage. */
  export let state: 'idle' | 'loading' | 'success' | 'error' = 'idle';
  
  /** Disable the button */
  export let disabled = false;
  
  /** Spring stiffness for progress animation */
  export let stiffness = 170;
  
  /** Spring damping (lower = more "slosh") */
  export let damping = 12;
  
  /** Auto-reset to idle after success (ms). Set to 0 to disable. */
  export let resetDelay = 1500;

  // ============================================
  // Styling Props (Headless Pattern)
  // ============================================
  
  /** Classes for the button container */
  export let buttonClass = '';
  
  /** Classes for the fill/progress layer */
  export let fillClass = '';
  
  /** Classes applied when idle */
  export let idleClass = '';
  
  /** Classes applied when loading */
  export let loadingClass = '';
  
  /** Classes applied on success */
  export let successClass = '';
  
  /** Classes applied on error */
  export let errorClass = '';

  // ============================================
  // Internal State
  // ============================================
  
  const dispatch = createEventDispatcher<{
    click: void;
    progress: number;
    statechange: typeof state;
  }>();

  let displayProgress = 0;
  let progressController: AnimationController | null = null;
  let fillEl: HTMLDivElement;

  // ============================================
  // Animation Logic
  // ============================================

  function animateProgress(target: number) {
    const velocity = progressController?.getVelocity() ?? 0;
    progressController?.stop();

    const clampedTarget = Math.max(0, Math.min(100, target));

    progressController = aerostat({
      from: displayProgress,
      to: clampedTarget,
      velocity,
      stiffness,
      damping,
      onUpdate: (v) => {
        displayProgress = v;
        // Direct DOM for 60fps
        if (fillEl) {
          fillEl.style.transform = `scaleX(${v / 100})`;
        }
        dispatch('progress', v);
      },
      onComplete: () => {
        if (clampedTarget === 100 && state === 'loading') {
          handleSuccess();
        }
      },
    });
  }

  function handleSuccess() {
    state = 'success';
    dispatch('statechange', state);

    if (resetDelay > 0) {
      setTimeout(reset, resetDelay);
    }
  }

  function reset() {
    const velocity = progressController?.getVelocity() ?? 0;
    progressController?.stop();

    progressController = aerostat({
      from: displayProgress,
      to: 0,
      velocity,
      stiffness: 200,
      damping: 18,
      onUpdate: (v) => {
        displayProgress = v;
        if (fillEl) {
          fillEl.style.transform = `scaleX(${v / 100})`;
        }
        dispatch('progress', v);
      },
      onComplete: () => {
        state = 'idle';
        progress = 0;
        dispatch('statechange', state);
      },
    });
  }

  /** Public: Trigger error state and reset */
  export function triggerError() {
    state = 'error';
    dispatch('statechange', state);
    reset();
  }

  /** Public: Reset to idle */
  export function resetState() {
    reset();
  }

  function handleClick() {
    if (disabled || state === 'loading') return;
    dispatch('click');
  }

  // React to external progress changes
  $: if (state === 'loading') {
    animateProgress(progress);
  }

  // Compute state-based classes
  $: stateClass = 
    state === 'idle' ? idleClass :
    state === 'loading' ? loadingClass :
    state === 'success' ? successClass :
    state === 'error' ? errorClass : '';

  onDestroy(() => {
    progressController?.stop();
  });
</script>

<!--
  The component renders a button with a fill layer.
  All visual styling comes from props - no built-in styles.
-->
<button
  type="button"
  class="{buttonClass} {stateClass}"
  {disabled}
  on:click={handleClick}
>
  <!-- Fill/Progress Layer -->
  <div
    bind:this={fillEl}
    class={fillClass}
    style="transform: scaleX({displayProgress / 100}); transform-origin: left center;"
    aria-hidden="true"
  ></div>

  <!-- Content Slots -->
  {#if state === 'idle'}
    <slot name="idle">Submit</slot>
  {:else if state === 'loading'}
    <slot name="loading" {progress} displayProgress={displayProgress}>
      Loading...
    </slot>
  {:else if state === 'success'}
    <slot name="success">Done!</slot>
  {:else if state === 'error'}
    <slot name="error">Error</slot>
  {/if}
</button>
