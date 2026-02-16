<!--
  Headless MagneticHeader - Scroll-Linked Spring Header
  ======================================================
  Spring-physics header that compresses on scroll with magnetic snap.
  Fully headless - you control all styling via slots.
  
  Usage:
  <MagneticHeader let:progress let:style>
    <header style={style.header}>
      <div style={style.logo}>Logo</div>
      <nav style={style.nav}>Nav</nav>
    </header>
  </MagneticHeader>
-->
<script lang="ts" context="module">
  export interface MagneticHeaderState {
    /** Spring-smoothed scroll progress (0 = expanded, 1 = collapsed) */
    progress: number;
    /** Whether user is currently scrolling */
    isScrolling: boolean;
    /** Raw scroll position in pixels */
    scrollY: number;
  }
  
  export interface MagneticHeaderStyles {
    /** CSS variable string for the header element */
    header: string;
    /** CSS variable string for logo (scales down) */
    logo: string;
    /** CSS variable string for nav (scales down less) */
    nav: string;
  }
</script>

<script lang="ts">
  import { springStep, clamp } from '../../core';
  import type { SpringState, SpringParams } from '../../core';
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Scroll container element (default: first scrollable parent) */
  export let scrollContainer: HTMLElement | null = null;
  
  /** Scroll range in pixels where compression happens (default: 200) */
  export let scrollRange = 200;
  
  /** Magnetic snap threshold (0-1, default: 0.15 = snap if < 15%) */
  export let magneticThreshold = 0.15;
  
  /** Whether to enable magnetic snap (default: true) */
  export let enableMagneticSnap = true;
  
  /** Spring stiffness (default: 120) */
  export let stiffness = 120;
  
  /** Spring damping (default: 24) */
  export let damping = 24;
  
  /** Header height range [expanded, collapsed] in pixels */
  export let heightRange: [number, number] = [80, 56];
  
  /** Padding range [expanded, collapsed] in pixels */
  export let paddingRange: [number, number] = [24, 12];
  
  /** Logo scale range [expanded, collapsed] */
  export let logoScaleRange: [number, number] = [1, 0.85];
  
  /** Nav scale range [expanded, collapsed] */
  export let navScaleRange: [number, number] = [1, 0.92];

  // ============================================
  // Events
  // ============================================
  
  const dispatch = createEventDispatcher<{
    /** Fired when progress changes */
    progress: MagneticHeaderState;
    /** Fired when magnetic snap triggers */
    snap: MagneticHeaderState;
    /** Fired when scroll starts */
    scrollStart: MagneticHeaderState;
    /** Fired when scroll ends */
    scrollEnd: MagneticHeaderState;
  }>();

  // ============================================
  // Internal State
  // ============================================
  
  let wrapperEl: HTMLDivElement;
  let resolvedContainer: HTMLElement | null = null;
  
  let progress = 0;
  let targetProgress = 0;
  let springState: SpringState = { value: 0, velocity: 0 };
  
  let rafId: number | null = null;
  let lastTime = 0;
  let isScrolling = false;
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let scrollY = 0;
  
  const springConfig: SpringParams = { stiffness, damping, mass: 1 };
  
  // Update spring config reactively
  $: springConfig.stiffness = stiffness;
  $: springConfig.damping = damping;

  // ============================================
  // Computed Styles
  // ============================================
  
  $: height = heightRange[0] - progress * (heightRange[0] - heightRange[1]);
  $: padding = paddingRange[0] - progress * (paddingRange[0] - paddingRange[1]);
  $: logoScale = logoScaleRange[0] - progress * (logoScaleRange[0] - logoScaleRange[1]);
  $: navScale = navScaleRange[0] - progress * (navScaleRange[0] - navScaleRange[1]);
  $: backdropBlur = progress * 12;
  $: bgOpacity = 0.6 + progress * 0.35;
  $: borderOpacity = progress * 0.08;
  
  /** Pre-computed style strings */
  $: styles = {
    header: `--progress: ${progress}; --height: ${height}px; --padding: ${padding}px; --bg-opacity: ${bgOpacity}; --blur: ${backdropBlur}px; --border-opacity: ${borderOpacity};`,
    logo: `--logo-scale: ${logoScale};`,
    nav: `--nav-scale: ${navScale};`,
  } as MagneticHeaderStyles;
  
  /** Individual values for custom use */
  $: values = { height, padding, logoScale, navScale, backdropBlur, bgOpacity, borderOpacity };
  
  /** State object */
  $: state = { progress, isScrolling, scrollY } as MagneticHeaderState;

  // ============================================
  // Scroll Handling
  // ============================================
  
  function handleScroll() {
    if (!resolvedContainer) return;
    
    scrollY = resolvedContainer.scrollTop;
    targetProgress = clamp(scrollY / scrollRange, 0, 1);
    
    if (!isScrolling) {
      isScrolling = true;
      dispatch('scrollStart', state);
    }
    
    // Clear previous timeout
    if (scrollTimeout) clearTimeout(scrollTimeout);
    
    // Detect scroll end
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
      dispatch('scrollEnd', state);
      checkMagneticSnap();
    }, 150);
    
    // Start spring animation if not running
    if (rafId === null) {
      lastTime = performance.now();
      rafId = requestAnimationFrame(tick);
    }
  }

  // ============================================
  // Spring Animation Loop
  // ============================================
  
  function tick(now: number) {
    const delta = Math.min((now - lastTime) / 1000, 0.064);
    lastTime = now;
    
    const inMotion = springStep(springState, targetProgress, springConfig, delta);
    progress = springState.value;
    
    dispatch('progress', state);
    
    if (inMotion) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      if (!isScrolling) {
        checkMagneticSnap();
      }
    }
  }

  // ============================================
  // Magnetic Snap
  // ============================================
  
  function checkMagneticSnap() {
    if (!enableMagneticSnap) return;
    if (progress > 0 && progress < magneticThreshold && !isScrolling) {
      resolvedContainer?.scrollTo({ top: 0, behavior: 'smooth' });
      dispatch('snap', state);
    }
  }

  // ============================================
  // Lifecycle
  // ============================================
  
  onMount(() => {
    // Resolve scroll container
    if (scrollContainer) {
      resolvedContainer = scrollContainer;
    } else {
      // Find first scrollable parent
      let el = wrapperEl?.parentElement;
      while (el) {
        const style = getComputedStyle(el);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          resolvedContainer = el;
          break;
        }
        el = el.parentElement;
      }
    }
    
    resolvedContainer?.addEventListener('scroll', handleScroll, { passive: true });
  });
  
  onDestroy(() => {
    resolvedContainer?.removeEventListener('scroll', handleScroll);
    if (rafId !== null) cancelAnimationFrame(rafId);
    if (scrollTimeout) clearTimeout(scrollTimeout);
  });
</script>

<div bind:this={wrapperEl} class="contents">
  <!--
    Slot Props:
    - progress: Spring-smoothed progress (0 = expanded, 1 = collapsed)
    - isScrolling: Whether user is scrolling
    - scrollY: Raw scroll position
    - styles: Pre-computed CSS variable strings { header, logo, nav }
    - values: Individual computed values
  -->
  <slot 
    {progress}
    {isScrolling}
    {scrollY}
    {styles}
    {values}
  />
</div>
