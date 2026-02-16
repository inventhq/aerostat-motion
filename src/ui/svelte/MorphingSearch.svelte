<script context="module" lang="ts">
  export type SearchState = 'collapsed' | 'expanding' | 'expanded' | 'collapsing' | 'success';
  
  export interface MorphingSearchState {
    state: SearchState;
    width: number;
    inputValue: string;
    isExpanded: boolean;
    showInput: boolean;
    showSearchIcon: boolean;
    borderRadius: number;
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  
  // ============================================
  // Props
  // ============================================
  
  /** Width when collapsed (px) */
  export let collapsedWidth = 48;
  
  /** Width when expanded (px) */
  export let expandedWidth = 280;
  
  /** Height (px) */
  export let height = 48;
  
  /** Expand spring stiffness */
  export let expandStiffness = 180;
  
  /** Expand spring damping */
  export let expandDamping = 14;
  
  /** Collapse spring stiffness */
  export let collapseStiffness = 200;
  
  /** Collapse spring damping */
  export let collapseDamping = 16;
  
  /** Success reset delay (ms) */
  export let successResetDelay = 2000;
  
  /** Input reveal threshold offset */
  export let inputRevealOffset = 40;

  // ============================================
  // Internal State
  // ============================================
  
  const dispatch = createEventDispatcher<{
    expand: void;
    collapse: void;
    submit: { value: string };
    success: void;
    stateChange: MorphingSearchState;
    inputChange: { value: string };
  }>();
  
  let state: SearchState = 'collapsed';
  let width = collapsedWidth;
  let inputValue = '';
  let currentController: AnimationController | null = null;
  let successTimeoutId: ReturnType<typeof setTimeout> | null = null;

  // ============================================
  // Animation Methods
  // ============================================
  
  export function expand(): void {
    if (state === 'expanded' || state === 'expanding') return;
    
    currentController?.stop();
    state = 'expanding';
    dispatch('expand');
    emitStateChange();
    
    currentController = aerostat({
      from: width,
      to: expandedWidth,
      stiffness: expandStiffness,
      damping: expandDamping,
      onUpdate: (v: number) => { width = v; emitStateChange(); },
      onComplete: () => {
        state = 'expanded';
        emitStateChange();
      },
    });
  }

  export function collapse(): void {
    if (state === 'collapsed' || state === 'collapsing') return;
    
    currentController?.stop();
    state = 'collapsing';
    dispatch('collapse');
    emitStateChange();
    
    currentController = aerostat({
      from: width,
      to: collapsedWidth,
      stiffness: collapseStiffness,
      damping: collapseDamping,
      onUpdate: (v: number) => { width = v; emitStateChange(); },
      onComplete: () => {
        state = 'collapsed';
        inputValue = '';
        emitStateChange();
      },
    });
  }

  export function submit(): boolean {
    if (!inputValue.trim()) return false;
    
    const submittedValue = inputValue.trim();
    currentController?.stop();
    state = 'success';
    dispatch('submit', { value: submittedValue });
    dispatch('success');
    inputValue = '';
    emitStateChange();
    
    currentController = aerostat({
      from: width,
      to: collapsedWidth,
      stiffness: 220,
      damping: 18,
      onUpdate: (v: number) => { width = v; emitStateChange(); },
      onComplete: () => {
        successTimeoutId = setTimeout(() => {
          state = 'collapsed';
          emitStateChange();
        }, successResetDelay);
      },
    });
    
    return true;
  }

  export function reset(): void {
    currentController?.stop();
    if (successTimeoutId) clearTimeout(successTimeoutId);
    state = 'collapsed';
    width = collapsedWidth;
    inputValue = '';
    emitStateChange();
  }

  export function setValue(value: string): void {
    inputValue = value;
    dispatch('inputChange', { value });
    emitStateChange();
  }

  export function toggle(): void {
    if (state === 'collapsed' || state === 'success') {
      expand();
    } else {
      collapse();
    }
  }

  // ============================================
  // Style Helpers
  // ============================================
  
  export function getContainerStyle(): string {
    return `width: ${width}px; height: ${height}px; border-radius: ${borderRadius}px;`;
  }

  // ============================================
  // State Management
  // ============================================
  
  function emitStateChange() {
    dispatch('stateChange', {
      state,
      width,
      inputValue,
      isExpanded,
      showInput,
      showSearchIcon,
      borderRadius,
    });
  }

  onDestroy(() => {
    currentController?.stop();
    if (successTimeoutId) clearTimeout(successTimeoutId);
  });

  // Reactive computed
  $: isExpanded = state === 'expanded' || state === 'expanding';
  $: showInput = width > collapsedWidth + inputRevealOffset;
  $: showSearchIcon = (state === 'collapsed' || state === 'collapsing') && width <= collapsedWidth + 10;
  $: borderRadius = Math.min(height / 2, width / 2);
  
  $: componentState = {
    state,
    width,
    inputValue,
    isExpanded,
    showInput,
    showSearchIcon,
    borderRadius,
  } as MorphingSearchState;
</script>

<slot
  state={componentState}
  {width}
  {inputValue}
  {isExpanded}
  {showInput}
  {showSearchIcon}
  {borderRadius}
  searchState={state}
  {expand}
  {collapse}
  {submit}
  {reset}
  {setValue}
  {toggle}
  {getContainerStyle}
/>
