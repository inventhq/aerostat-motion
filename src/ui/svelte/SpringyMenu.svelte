<script context="module" lang="ts">
  export interface MenuItem {
    icon?: string;
    label: string;
    id?: string;
  }
  
  export interface SpringyMenuState {
    isOpen: boolean;
    progress: number;
    menuVisible: boolean;
    isAnimating: boolean;
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  
  // ============================================
  // Props
  // ============================================
  
  /** Menu items to display */
  export let items: MenuItem[] = [];
  
  /** Spring stiffness */
  export let stiffness = 400;
  
  /** Spring damping */
  export let damping = 22;
  
  /** Base threshold for first item */
  export let baseThreshold = 0.1;
  
  /** Threshold increment per item */
  export let thresholdStep = 0.15;
  
  /** Item slide distance (px) */
  export let slideDistance = 20;

  // ============================================
  // Internal State
  // ============================================
  
  const dispatch = createEventDispatcher<{
    open: void;
    close: void;
    toggle: { isOpen: boolean };
    itemClick: { item: MenuItem; index: number };
    stateChange: SpringyMenuState;
  }>();
  
  let isOpen = false;
  let progress = 0;
  let controller: AnimationController | null = null;
  let isAnimating = false;

  // ============================================
  // Animation Methods
  // ============================================
  
  export function toggle(): void {
    const currentVelocity = controller?.getVelocity() ?? 0;
    controller?.stop();
    
    isOpen = !isOpen;
    const target = isOpen ? 1 : 0;
    
    dispatch(isOpen ? 'open' : 'close');
    dispatch('toggle', { isOpen });
    isAnimating = true;
    emitStateChange();
    
    controller = aerostat({
      from: progress,
      to: target,
      velocity: currentVelocity,
      stiffness,
      damping,
      onUpdate: (v: number) => {
        progress = v;
        emitStateChange();
      },
      onComplete: () => {
        isAnimating = false;
        emitStateChange();
      },
    });
  }

  export function open(): void {
    if (isOpen) return;
    toggle();
  }

  export function close(): void {
    if (!isOpen) return;
    toggle();
  }

  export function selectItem(index: number): void {
    const item = items[index];
    if (item) {
      dispatch('itemClick', { item, index });
    }
  }

  // ============================================
  // Style Helpers
  // ============================================
  
  export function getMenuStyle(): string {
    const scale = 0.95 + progress * 0.05;
    return `transform: scaleY(${scale}); opacity: ${progress};`;
  }

  export function getItemStyle(index: number): string {
    const threshold = baseThreshold + index * thresholdStep;
    const itemProgress = Math.max(0, Math.min(1, (progress - threshold) / (1 - threshold)));
    const translateY = (1 - itemProgress) * slideDistance;
    return `transform: translateY(${translateY}px); opacity: ${itemProgress};`;
  }

  export function getItemProgress(index: number): number {
    const threshold = baseThreshold + index * thresholdStep;
    return Math.max(0, Math.min(1, (progress - threshold) / (1 - threshold)));
  }

  // ============================================
  // State Management
  // ============================================
  
  function emitStateChange() {
    dispatch('stateChange', {
      isOpen,
      progress,
      menuVisible,
      isAnimating,
    });
  }

  onDestroy(() => {
    controller?.stop();
  });

  // Reactive computed
  $: menuVisible = progress > 0.01;
  
  $: state = {
    isOpen,
    progress,
    menuVisible,
    isAnimating,
  } as SpringyMenuState;
</script>

<slot
  {state}
  {isOpen}
  {progress}
  {menuVisible}
  {isAnimating}
  {items}
  {toggle}
  {open}
  {close}
  {selectItem}
  {getMenuStyle}
  {getItemStyle}
  {getItemProgress}
/>
