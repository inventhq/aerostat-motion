<script context="module" lang="ts">
  export interface SwipeActionState {
    isDragging: boolean;
    displayX: number;
    progress: number;
    iconScale: number;
    iconOpacity: number;
    triggered: boolean;
  }
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { createEventDispatcher, onDestroy } from 'svelte';

  // Props
  export let actionThreshold = 60;
  export let maxDrag = 120;
  export let rubberBandFactor = 0.3;
  export let flickVelocity = 0.5;
  export let snapSpring = { stiffness: 400, damping: 25 };
  export let popSpring = { stiffness: 600, damping: 12 };

  const dispatch = createEventDispatcher<{
    dragStart: { clientX: number };
    drag: { displayX: number; progress: number };
    dragEnd: { velocity: number; triggered: boolean };
    trigger: void;
    snapBack: void;
    stateChange: SwipeActionState;
  }>();

  // Internal state
  let isDragging = false;
  let startX = 0;
  let currentX = 0;
  let displayX = 0;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let iconScale = 0.5;
  let iconOpacity = 0.5;
  let triggered = false;

  let controller: AnimationController | null = null;
  let iconController: AnimationController | null = null;

  // Reactive
  $: progress = Math.min(1, Math.max(0, displayX) / actionThreshold);

  $: currentState = {
    isDragging,
    displayX,
    progress,
    iconScale,
    iconOpacity,
    triggered,
  } as SwipeActionState;

  $: dispatch('stateChange', currentState);

  // === UTILITY ===

  function rubberBand(distance: number): number {
    if (distance <= actionThreshold) return distance;
    const overDrag = distance - actionThreshold;
    return actionThreshold + overDrag * rubberBandFactor;
  }

  // === PUBLIC API ===

  /** Call on pointer down */
  export function handlePointerDown(e: PointerEvent): void {
    if (triggered) return;

    controller?.stop();
    iconController?.stop();

    isDragging = true;
    startX = e.clientX;
    lastX = e.clientX;
    lastTime = performance.now();
    velocity = 0;

    dispatch('dragStart', { clientX: e.clientX });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  /** Call on pointer move */
  export function handlePointerMove(e: PointerEvent): void {
    if (!isDragging) return;

    const now = performance.now();
    const deltaTime = now - lastTime;
    
    const rawX = startX - e.clientX;
    const clampedX = Math.max(0, rawX);
    
    displayX = rubberBand(clampedX);
    currentX = clampedX;

    if (deltaTime > 0) {
      const deltaX = e.clientX - lastX;
      velocity = deltaX / deltaTime;
    }

    lastX = e.clientX;
    lastTime = now;

    updateIconState(clampedX);
    dispatch('drag', { displayX, progress });
  }

  /** Call on pointer up */
  export function handlePointerUp(e: PointerEvent): void {
    if (!isDragging) return;

    isDragging = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const isFlick = velocity < -flickVelocity;
    const pastThreshold = currentX >= actionThreshold;

    dispatch('dragEnd', { velocity, triggered: isFlick || pastThreshold });

    if (isFlick || pastThreshold) {
      triggerAction();
    } else {
      snapBack();
    }
  }

  /** Trigger the action (slide out) */
  export function triggerAction(slideDistance = 300): void {
    dispatch('trigger');
    controller?.stop();
    controller = aerostat({
      from: displayX,
      to: slideDistance,
      ...snapSpring,
      onUpdate: (v: number) => { displayX = v; },
    });
  }

  /** Snap back to closed position */
  export function snapBack(): void {
    dispatch('snapBack');
    controller?.stop();
    iconController?.stop();

    controller = aerostat({
      from: displayX,
      to: 0,
      ...snapSpring,
      onUpdate: (v: number) => { displayX = v; },
      onComplete: () => { triggered = false; },
    });

    iconController = aerostat({
      from: iconScale,
      to: 0.5,
      stiffness: 300,
      damping: 20,
      onUpdate: (v: number) => {
        iconScale = v;
        iconOpacity = 0.5;
      },
    });

    triggered = false;
  }

  /** Reset to initial state */
  export function reset(): void {
    controller?.stop();
    iconController?.stop();
    isDragging = false;
    displayX = 0;
    currentX = 0;
    iconScale = 0.5;
    iconOpacity = 0.5;
    triggered = false;
  }

  /** Get transform style for sliding element */
  export function getTransformStyle(): string {
    return `transform: translateX(-${displayX}px);`;
  }

  /** Get icon style */
  export function getIconStyle(): string {
    return `transform: scale(${iconScale}); opacity: ${iconOpacity};`;
  }

  // === INTERNAL ===

  function updateIconState(distance: number): void {
    const prog = Math.min(1, distance / actionThreshold);

    if (distance >= actionThreshold && !triggered) {
      // Pop the icon
      iconController?.stop();
      iconController = aerostat({
        from: iconScale,
        to: 1.2,
        ...popSpring,
        onUpdate: (v: number) => { iconScale = v; },
        onComplete: () => {
          iconController = aerostat({
            from: 1.2,
            to: 1,
            stiffness: 400,
            damping: 20,
            onUpdate: (v: number) => { iconScale = v; },
          });
        },
      });
      iconOpacity = 1;
      triggered = true;
    } else if (distance < actionThreshold && !triggered) {
      iconScale = 0.5 + prog * 0.3;
      iconOpacity = 0.5 + prog * 0.3;
    }
  }

  onDestroy(() => {
    controller?.stop();
    iconController?.stop();
  });
</script>

<slot
  {isDragging}
  {displayX}
  {progress}
  {iconScale}
  {iconOpacity}
  {triggered}
  {handlePointerDown}
  {handlePointerMove}
  {handlePointerUp}
  {triggerAction}
  {snapBack}
  {reset}
  {getTransformStyle}
  {getIconStyle}
/>
