<script context="module" lang="ts">
  export interface SpringDrawerState {
    isOpen: boolean;
    translateY: number;
    isDragging: boolean;
    progress: number;
    backdropOpacity: number;
  }
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { createEventDispatcher, onDestroy } from 'svelte';

  // Props
  export let drawerHeight = 320;
  export let closeVelocity = 0.5;
  export let rubberBand = 0.3;
  export let snapThreshold = 0.5;
  export let openSpring = { stiffness: 400, damping: 30 };
  export let closeSpring = { stiffness: 400, damping: 30 };
  export let snapSpring = { stiffness: 500, damping: 25 };

  const dispatch = createEventDispatcher<{
    open: void;
    close: void;
    dragStart: void;
    drag: { translateY: number; progress: number };
    dragEnd: { velocity: number };
    stateChange: SpringDrawerState;
  }>();

  // State
  let isOpen = false;
  let translateY = drawerHeight;
  let isDragging = false;

  // Velocity tracking
  let lastY = 0;
  let lastTime = 0;
  let prevY = 0;
  let prevTime = 0;
  let startY = 0;

  let controller: AnimationController | null = null;

  // Reactive
  $: progress = 1 - (translateY / drawerHeight);
  $: backdropOpacity = Math.max(0, Math.min(1, progress));

  $: currentState = {
    isOpen,
    translateY,
    isDragging,
    progress,
    backdropOpacity,
  } as SpringDrawerState;

  $: dispatch('stateChange', currentState);

  // === PUBLIC API ===

  /** Open the drawer */
  export function open(): void {
    if (isOpen) return;
    
    controller?.stop();
    isOpen = true;
    dispatch('open');

    controller = aerostat({
      from: translateY,
      to: 0,
      ...openSpring,
      onUpdate: (v: number) => { translateY = v; },
    });
  }

  /** Close the drawer */
  export function close(velocity = 0): void {
    controller?.stop();
    dispatch('close');

    controller = aerostat({
      from: translateY,
      to: drawerHeight,
      velocity: velocity * 16,
      ...closeSpring,
      onUpdate: (v: number) => { translateY = v; },
      onComplete: () => { isOpen = false; },
    });
  }

  /** Snap back to open position */
  export function snapBack(velocity = 0): void {
    controller?.stop();

    controller = aerostat({
      from: translateY,
      to: 0,
      velocity: velocity * 16,
      ...snapSpring,
      onUpdate: (v: number) => { translateY = v; },
    });
  }

  /** Toggle drawer state */
  export function toggle(): void {
    if (isOpen) close();
    else open();
  }

  /** Call on pointer down */
  export function handlePointerDown(e: PointerEvent): void {
    controller?.stop();
    
    isDragging = true;
    startY = e.clientY;
    lastY = e.clientY;
    lastTime = performance.now();
    prevY = e.clientY;
    prevTime = performance.now();

    dispatch('dragStart');
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  /** Call on pointer move */
  export function handlePointerMove(e: PointerEvent): void {
    if (!isDragging) return;

    const now = performance.now();
    let newY = translateY + (e.clientY - lastY);

    // Rubber band when pulling past top
    if (newY < 0) {
      newY = newY * rubberBand;
    }

    newY = Math.min(newY, drawerHeight);
    translateY = newY;

    prevY = lastY;
    prevTime = lastTime;
    lastY = e.clientY;
    lastTime = now;

    dispatch('drag', { translateY, progress });
  }

  /** Call on pointer up */
  export function handlePointerUp(e: PointerEvent): void {
    if (!isDragging) return;
    
    isDragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const now = performance.now();
    const deltaTime = now - prevTime;
    
    let velocity = 0;
    if (deltaTime > 0) {
      velocity = (lastY - prevY) / deltaTime;
    }

    dispatch('dragEnd', { velocity });

    const isFlickDown = velocity > closeVelocity;
    const isFlickUp = velocity < -closeVelocity;
    const isPastHalf = translateY > drawerHeight * snapThreshold;

    if (translateY < 0) {
      snapBack(velocity);
    } else if (isFlickDown || isPastHalf) {
      close(velocity);
    } else {
      snapBack(velocity);
    }
  }

  /** Handle backdrop click */
  export function handleBackdropClick(): void {
    if (isOpen && !isDragging) {
      close();
    }
  }

  /** Get drawer transform style */
  export function getDrawerStyle(): string {
    return `height: ${drawerHeight}px; transform: translateY(${translateY}px);`;
  }

  /** Get backdrop style */
  export function getBackdropStyle(): string {
    return `opacity: ${backdropOpacity};`;
  }

  /** Check if drawer should be visible */
  export function isVisible(): boolean {
    return isOpen || translateY < drawerHeight;
  }

  onDestroy(() => {
    controller?.stop();
  });
</script>

<slot
  {isOpen}
  {translateY}
  {isDragging}
  {progress}
  {backdropOpacity}
  {open}
  {close}
  {snapBack}
  {toggle}
  {handlePointerDown}
  {handlePointerMove}
  {handlePointerUp}
  {handleBackdropClick}
  {getDrawerStyle}
  {getBackdropStyle}
  {isVisible}
  {drawerHeight}
/>
