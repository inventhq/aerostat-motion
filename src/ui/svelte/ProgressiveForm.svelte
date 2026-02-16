<script lang="ts" context="module">
  // ============================================
  // Type Exports
  // ============================================
  
  export interface ProgressiveField {
    id: string;
    label: string;
    placeholder?: string;
    type?: string;
    validate?: (value: string) => boolean;
  }

  export interface FieldState {
    visible: boolean;
    opacity: number;
    translateY: number;
    scale: number;
    value: string;
    touched: boolean;
    valid: boolean;
  }

  export interface ProgressiveFormState {
    fields: FieldState[];
    completedCount: number;
    totalCount: number;
    progress: number;
    isComplete: boolean;
  }
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { onDestroy, createEventDispatcher, tick } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Array of field configurations */
  export let fields: ProgressiveField[] = [];
  
  /** Reveal spring stiffness */
  export let revealStiffness = 150;
  
  /** Reveal spring damping */
  export let revealDamping = 18;
  
  /** Collapse spring stiffness */
  export let collapseStiffness = 200;
  
  /** Collapse spring damping */
  export let collapseDamping = 22;
  
  /** Initial translateY for hidden fields */
  export let translateYOffset = 15;
  
  /** Initial scale for hidden fields */
  export let initialScale = 0.98;
  
  /** Debounce delay for validation */
  export let debounceDelay = 150;
  
  /** Auto-focus field on reveal */
  export let autoFocus = true;

  // ============================================
  // Events
  // ============================================
  
  const dispatch = createEventDispatcher<{
    fieldReveal: { fieldId: string; index: number };
    fieldCollapse: { fieldId: string; index: number };
    fieldValid: { fieldId: string; value: string };
    fieldInvalid: { fieldId: string; value: string };
    complete: { values: Record<string, string> };
    stateChange: ProgressiveFormState;
  }>();

  // ============================================
  // State
  // ============================================
  
  let fieldStates: Map<string, FieldState> = new Map();
  let controllers: Map<string, AnimationController | null> = new Map();
  let prevShouldShow: Map<string, boolean> = new Map();
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Initialize state when fields change
  $: if (fields.length > 0) {
    initializeState();
  }

  function initializeState() {
    fields.forEach((field, i) => {
      if (!fieldStates.has(field.id)) {
        fieldStates.set(field.id, {
          visible: i === 0,
          opacity: i === 0 ? 1 : 0,
          translateY: i === 0 ? 0 : translateYOffset,
          scale: i === 0 ? 1 : initialScale,
          value: '',
          touched: false,
          valid: false,
        });
        controllers.set(field.id, null);
        prevShouldShow.set(field.id, i === 0);
      }
    });
    fieldStates = fieldStates;
  }

  // ============================================
  // Validation Logic
  // ============================================
  
  function isFieldValid(fieldId: string): boolean {
    const field = fields.find(f => f.id === fieldId);
    const state = fieldStates.get(fieldId);
    if (!field || !state) return false;
    
    if (field.validate) {
      return field.validate(state.value);
    }
    // Default validation: non-empty
    return state.value.trim().length > 0;
  }

  function shouldShowField(index: number): boolean {
    if (index === 0) return true;
    return fields.slice(0, index).every(f => isFieldValid(f.id));
  }

  // ============================================
  // Animation Logic
  // ============================================

  function revealField(fieldId: string, index: number) {
    const state = fieldStates.get(fieldId);
    if (!state || state.visible) return;

    controllers.get(fieldId)?.stop();
    state.visible = true;

    controllers.set(fieldId, aerostat({
      from: 0,
      to: 1,
      stiffness: revealStiffness,
      damping: revealDamping,
      onUpdate: (progress: number) => {
        state.opacity = progress;
        state.translateY = translateYOffset * (1 - progress);
        state.scale = initialScale + (1 - initialScale) * progress;
        fieldStates = fieldStates;
        emitState();
      },
      onComplete: () => {
        dispatch('fieldReveal', { fieldId, index });
      },
    }));
  }

  function collapseField(fieldId: string, index: number) {
    const state = fieldStates.get(fieldId);
    if (!state || !state.visible) return;

    const velocity = controllers.get(fieldId)?.getVelocity() ?? 0;
    controllers.get(fieldId)?.stop();

    const startProgress = state.opacity;

    controllers.set(fieldId, aerostat({
      from: startProgress,
      to: 0,
      velocity: -Math.abs(velocity),
      stiffness: collapseStiffness,
      damping: collapseDamping,
      onUpdate: (progress: number) => {
        state.opacity = progress;
        state.translateY = translateYOffset * (1 - progress);
        state.scale = initialScale + (1 - initialScale) * progress;
        fieldStates = fieldStates;
        emitState();
      },
      onComplete: () => {
        state.visible = false;
        state.value = '';
        state.touched = false;
        state.valid = false;
        dispatch('fieldCollapse', { fieldId, index });
      },
    }));
  }

  function updateFieldVisibility() {
    fields.forEach((field, index) => {
      const shouldShow = shouldShowField(index);
      const wasShown = prevShouldShow.get(field.id) ?? false;

      if (shouldShow && !wasShown) {
        setTimeout(() => revealField(field.id, index), 100);
      } else if (!shouldShow && wasShown) {
        collapseField(field.id, index);
      }

      prevShouldShow.set(field.id, shouldShow);
    });
  }

  // ============================================
  // Public API
  // ============================================

  export function setValue(fieldId: string, value: string) {
    const state = fieldStates.get(fieldId);
    if (!state) return;
    
    state.value = value;
    state.touched = true;
    state.valid = isFieldValid(fieldId);
    fieldStates = fieldStates;
    
    if (state.valid) {
      dispatch('fieldValid', { fieldId, value });
    } else {
      dispatch('fieldInvalid', { fieldId, value });
    }
    
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      updateFieldVisibility();
      checkComplete();
    }, debounceDelay);
    
    emitState();
  }

  export function getValue(fieldId: string): string {
    return fieldStates.get(fieldId)?.value ?? '';
  }

  export function getFieldState(fieldId: string): FieldState | undefined {
    return fieldStates.get(fieldId);
  }

  export function getAllValues(): Record<string, string> {
    const values: Record<string, string> = {};
    fieldStates.forEach((state, id) => {
      values[id] = state.value;
    });
    return values;
  }

  export function reset() {
    fields.forEach((field, index) => {
      const state = fieldStates.get(field.id);
      if (!state) return;
      
      if (index > 0 && state.visible) {
        collapseField(field.id, index);
      } else if (index === 0) {
        state.value = '';
        state.touched = false;
        state.valid = false;
      }
    });
    fieldStates = fieldStates;
    emitState();
  }

  export function getState(): ProgressiveFormState {
    const states = fields.map(f => fieldStates.get(f.id)!).filter(Boolean);
    const completed = fields.filter(f => isFieldValid(f.id)).length;
    return {
      fields: states,
      completedCount: completed,
      totalCount: fields.length,
      progress: fields.length > 0 ? (completed / fields.length) * 100 : 0,
      isComplete: completed === fields.length,
    };
  }

  export function getFieldStyle(fieldId: string): string {
    const state = fieldStates.get(fieldId);
    if (!state) return '';
    return `opacity: ${state.opacity}; transform: translateY(${state.translateY}px) scale(${state.scale});`;
  }

  export function isFieldVisible(fieldId: string): boolean {
    return fieldStates.get(fieldId)?.visible ?? false;
  }

  function checkComplete() {
    const complete = fields.every(f => isFieldValid(f.id));
    if (complete) {
      dispatch('complete', { values: getAllValues() });
    }
  }

  function emitState() {
    dispatch('stateChange', getState());
  }

  // ============================================
  // Computed
  // ============================================
  
  $: completedCount = fields.filter(f => isFieldValid(f.id)).length;
  $: progress = fields.length > 0 ? (completedCount / fields.length) * 100 : 0;
  $: isComplete = completedCount === fields.length;

  onDestroy(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    controllers.forEach(c => c?.stop());
  });
</script>

<slot 
  {fields}
  {completedCount}
  totalCount={fields.length}
  {progress}
  {isComplete}
  {setValue}
  {getValue}
  {getFieldState}
  {getAllValues}
  {reset}
  {getFieldStyle}
  {isFieldVisible}
/>
