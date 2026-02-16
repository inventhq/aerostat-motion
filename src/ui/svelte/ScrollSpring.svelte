<!--
  Headless ScrollSpring - Scroll-Linked Spring Animation
  =======================================================
  Spring-smoothed scroll progress for individual elements.
  Fully headless - you control all styling via slots.
  
  Usage:
  <ScrollSpring let:progress let:style>
    <div style={style}>Your content</div>
  </ScrollSpring>
-->
<script lang="ts" context="module">
  export interface ScrollSpringState {
    /** Spring-smoothed scroll progress (0-1) */
    progress: number;
    /** Whether element is currently in viewport */
    isInView: boolean;
    /** Raw scroll progress before spring smoothing */
    rawProgress: number;
  }
</script>

<script lang="ts">
  import { createScrollSpring } from '../../core';
  import type { ScrollSpringController } from '../../core';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Scroll container element (default: first scrollable parent) */
  export let container: HTMLElement | null = null;
  
  /** Start threshold (0-1, default: 1.0 = bottom of container) */
  export let start = 1.0;
  
  /** End threshold (0-1, default: 0.3 = 30% from top) */
  export let end = 0.3;
  
  /** Spring stiffness (default: 120) */
  export let stiffness = 120;
  
  /** Spring damping (default: 20) */
  export let damping = 20;
  
  /** Initial Y offset in pixels (default: 60) */
  export let initialY = 60;
  
  /** Initial scale (default: 0.9) */
  export let initialScale = 0.9;
  
  /** Initial opacity (default: 0.3) */
  export let initialOpacity = 0.3;

  // ============================================
  // Events
  // ============================================
  
  const dispatch = createEventDispatcher<{
    /** Fired when progress changes */
    progress: ScrollSpringState;
    /** Fired when element enters viewport */
    enter: ScrollSpringState;
    /** Fired when element exits viewport */
    exit: ScrollSpringState;
  }>();

  // ============================================
  // Internal State
  // ============================================
  
  let element: HTMLDivElement;
  let resolvedContainer: HTMLElement | null = null;
  let controller: ScrollSpringController | null = null;
  
  let progress = 0;
  let rawProgress = 0;
  let isInView = false;
  let wasInView = false;

  // ============================================
  // Computed Style
  // ============================================
  
  $: translateY = initialY * (1 - progress);
  $: scale = initialScale + progress * (1 - initialScale);
  $: opacity = initialOpacity + progress * (1 - initialOpacity);
  
  /** CSS transform string - bind to your element's style */
  $: style = `
    transform: translateY(${translateY}px) scale(${scale});
    opacity: ${opacity};
  `.trim();
  
  /** Individual transform values for custom use */
  $: transforms = { translateY, scale, opacity };
  
  /** State object */
  $: state = { progress, isInView, rawProgress } as ScrollSpringState;

  // ============================================
  // Lifecycle
  // ============================================
  
  onMount(() => {
    // Resolve scroll container
    if (container) {
      resolvedContainer = container;
    } else {
      // Find first scrollable parent
      let el = element?.parentElement;
      while (el) {
        const style = getComputedStyle(el);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          resolvedContainer = el;
          break;
        }
        el = el.parentElement;
      }
    }
    
    if (!resolvedContainer || !element) return;
    
    controller = createScrollSpring({
      element,
      container: resolvedContainer,
      start,
      end,
      stiffness,
      damping,
      onProgress: (p: number) => {
        progress = p;
        rawProgress = p; // In this implementation, they're the same after spring
        
        // Check viewport status
        isInView = p > 0 && p < 1;
        
        if (isInView && !wasInView) {
          dispatch('enter', state);
          wasInView = true;
        } else if (!isInView && wasInView) {
          dispatch('exit', state);
          wasInView = false;
        }
        
        dispatch('progress', state);
      },
    });
  });
  
  onDestroy(() => {
    controller?.destroy();
  });
</script>

<div bind:this={element} class="contents">
  <!--
    Slot Props:
    - progress: Spring-smoothed progress (0-1)
    - isInView: Whether element is in viewport
    - rawProgress: Raw scroll progress
    - style: Pre-computed CSS transform string
    - transforms: Individual transform values
  -->
  <slot 
    {progress}
    {isInView}
    {rawProgress}
    {style}
    {transforms}
  />
</div>
