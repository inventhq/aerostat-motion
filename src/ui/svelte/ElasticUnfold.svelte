<!--
  Headless ElasticUnfold - Scroll Reveal with Spring Physics
  ==========================================================
  Scroll-triggered reveal animation with elastic overshoot.
  Fully headless - you control all styling via slots.
  
  Usage:
  <ElasticUnfold let:progress let:isRevealed let:style>
    <div style={style}>Your content</div>
  </ElasticUnfold>
-->
<script lang="ts" context="module">
  export interface ElasticUnfoldState {
    /** Animation progress (0 = collapsed, 1 = revealed, can overshoot) */
    progress: number;
    /** Whether element is currently revealed */
    isRevealed: boolean;
    /** Current scroll velocity at trigger */
    velocity: number;
  }
</script>

<script lang="ts">
  import { aerostat, clamp } from '../../core';
  import type { AnimationController } from '../../core';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Root element for scroll container (default: window) */
  export let root: HTMLElement | null = null;
  
  /** Intersection threshold to trigger (0-1, default: 0.2 = 20% visible) */
  export let threshold = 0.2;
  
  /** Stagger delay in ms (useful when used in a list) */
  export let delay = 0;
  
  /** Spring stiffness (default: 180 for bouncy) */
  export let stiffness = 180;
  
  /** Spring damping (default: 12 for overshoot) */
  export let damping = 12;
  
  /** Whether to collapse when exiting viewport (default: true) */
  export let bidirectional = true;
  
  /** Initial rotation in degrees (default: -20) */
  export let initialRotation = -20;
  
  /** Initial scale (default: 0.9) */
  export let initialScale = 0.9;
  
  /** Initial Y offset in pixels (default: 40) */
  export let initialY = 40;

  // ============================================
  // Events
  // ============================================
  
  const dispatch = createEventDispatcher<{
    reveal: ElasticUnfoldState;
    collapse: ElasticUnfoldState;
    progress: ElasticUnfoldState;
  }>();

  // ============================================
  // Internal State
  // ============================================
  
  let element: HTMLDivElement;
  let observer: IntersectionObserver | null = null;
  let controller: AnimationController | null = null;
  
  let progress = 0;
  let isRevealed = false;
  let velocity = 0;
  
  // Velocity tracking
  let lastScrollY = 0;
  let scrollVelocity = 0;
  let velocityRafId: number | null = null;

  // ============================================
  // Computed Style
  // ============================================
  
  $: rotateX = initialRotation * (1 - progress);
  $: scale = initialScale + progress * (1 - initialScale);
  $: translateY = initialY * (1 - progress);
  $: opacity = clamp(progress * 2, 0, 1);
  
  /** CSS transform string - bind to your element's style */
  $: style = `
    transform: perspective(1000px) rotateX(${rotateX}deg) scale(${scale}) translateY(${translateY}px);
    opacity: ${opacity};
  `.trim();
  
  /** Individual transform values for custom use */
  $: transforms = { rotateX, scale, translateY, opacity };

  // ============================================
  // State Object
  // ============================================
  
  $: state = { progress, isRevealed, velocity: scrollVelocity } as ElasticUnfoldState;

  // ============================================
  // Velocity Tracking
  // ============================================
  
  function trackVelocity() {
    const scrollEl = root || document.documentElement;
    const currentY = root ? root.scrollTop : window.scrollY;
    scrollVelocity = Math.abs(currentY - lastScrollY);
    lastScrollY = currentY;
    velocityRafId = requestAnimationFrame(trackVelocity);
  }

  // ============================================
  // Animation
  // ============================================
  
  function reveal() {
    if (isRevealed) return;
    isRevealed = true;
    velocity = scrollVelocity;
    
    // Stop existing animation, capture velocity for smooth interrupt
    const currentVelocity = controller?.getVelocity() ?? 0;
    controller?.stop();
    
    setTimeout(() => {
      controller = aerostat({
        from: progress,
        to: 1,
        velocity: currentVelocity,
        stiffness,
        damping,
        mass: 1,
        onUpdate: (p: number) => {
          progress = p;
          dispatch('progress', state);
        },
        onComplete: () => {
          dispatch('reveal', state);
        },
      });
    }, delay);
  }
  
  function collapse() {
    if (!isRevealed || !bidirectional) return;
    isRevealed = false;
    
    // Capture velocity for smooth reversal
    const currentVelocity = controller?.getVelocity() ?? 0;
    controller?.stop();
    
    setTimeout(() => {
      controller = aerostat({
        from: progress,
        to: 0,
        velocity: -currentVelocity,
        stiffness,
        damping,
        mass: 1,
        onUpdate: (p: number) => {
          progress = p;
          dispatch('progress', state);
        },
        onComplete: () => {
          dispatch('collapse', state);
        },
      });
    }, delay);
  }

  // ============================================
  // Lifecycle
  // ============================================
  
  onMount(() => {
    trackVelocity();
    
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
          } else {
            collapse();
          }
        }
      },
      {
        root,
        threshold,
        rootMargin: '0px',
      }
    );
    
    observer.observe(element);
  });
  
  onDestroy(() => {
    observer?.disconnect();
    controller?.stop();
    if (velocityRafId) cancelAnimationFrame(velocityRafId);
  });
</script>

<div bind:this={element} class="contents">
  <!--
    Slot Props:
    - progress: Animation progress (0-1, can overshoot)
    - isRevealed: Whether element is revealed
    - velocity: Scroll velocity at trigger
    - style: Pre-computed CSS transform string
    - transforms: Individual transform values
  -->
  <slot 
    {progress} 
    {isRevealed} 
    velocity={scrollVelocity}
    {style}
    {transforms}
  />
</div>
