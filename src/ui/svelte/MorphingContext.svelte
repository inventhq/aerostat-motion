<script lang="ts" context="module">
  // ============================================
  // Type Exports
  // ============================================
  
  export interface MorphStep {
    id: string;
    placeholder?: string;
    type?: string;
    validate?: (value: string) => boolean;
  }

  export interface MorphingContextState {
    currentStep: number;
    totalSteps: number;
    inputValue: string;
    inputScale: number;
    labelOpacity: number;
    containerScale: number;
    showSuccess: boolean;
    isAnimating: boolean;
    isValid: boolean;
  }
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Array of step configurations */
  export let steps: MorphStep[] = [];
  
  /** Squish-in spring stiffness */
  export let squishStiffness = 400;
  
  /** Squish-in spring damping */
  export let squishDamping = 25;
  
  /** Spring-back stiffness */
  export let springBackStiffness = 300;
  
  /** Spring-back damping */
  export let springBackDamping = 20;
  
  /** Label fade duration (ms) */
  export let labelFadeDuration = 100;
  
  /** Success pop stiffness */
  export let successStiffness = 300;
  
  /** Success pop damping */
  export let successDamping = 15;
  
  /** Squish scale target */
  export let squishScale = 0.98;
  
  /** Success pop scale */
  export let successPopScale = 1.05;
  
  /** Delay before morph after validation (ms) */
  export let morphDelay = 200;

  // ============================================
  // Events
  // ============================================
  
  const dispatch = createEventDispatcher<{
    stepChange: { step: number; prevStep: number };
    validationSuccess: { step: number; value: string };
    validationFail: { step: number; value: string };
    complete: { values: string[] };
    stateChange: MorphingContextState;
  }>();

  // ============================================
  // State
  // ============================================
  
  let currentStep = 0;
  let inputValue = '';
  let inputScale = 1;
  let labelOpacity = 1;
  let containerScale = 1;
  let showSuccess = false;
  let isAnimating = false;
  let collectedValues: string[] = [];
  
  let morphController: AnimationController | null = null;
  let labelFadeController: AnimationController | null = null;
  let successController: AnimationController | null = null;

  // ============================================
  // Animation Logic
  // ============================================

  function morphToStep(newStep: number) {
    if (newStep >= steps.length) {
      triggerFinalSuccess();
      return;
    }

    isAnimating = true;
    const velocity = morphController?.getVelocity() ?? 0;
    morphController?.stop();
    labelFadeController?.stop();

    // Squish down
    morphController = aerostat({
      from: inputScale,
      to: squishScale,
      stiffness: squishStiffness,
      damping: squishDamping,
      velocity,
      onUpdate: (v: number) => { inputScale = v; emitState(); },
      onComplete: () => {
        const prevStep = currentStep;
        currentStep = newStep;
        inputValue = '';
        
        // Spring back
        morphController = aerostat({
          from: squishScale,
          to: 1,
          stiffness: springBackStiffness,
          damping: springBackDamping,
          onUpdate: (v: number) => { inputScale = v; emitState(); },
          onComplete: () => {
            isAnimating = false;
            dispatch('stepChange', { step: currentStep, prevStep });
            emitState();
          },
        });
      },
    });

    // Cross-fade label
    labelFadeController = aerostat({
      from: 1,
      to: 0,
      type: 'duration',
      duration: labelFadeDuration,
      onUpdate: (v: number) => { labelOpacity = v; emitState(); },
      onComplete: () => {
        labelFadeController = aerostat({
          from: 0,
          to: 1,
          type: 'duration',
          duration: labelFadeDuration * 1.5,
          onUpdate: (v: number) => { labelOpacity = v; emitState(); },
        });
      },
    });
  }

  function triggerFinalSuccess() {
    showSuccess = true;
    isAnimating = true;
    
    successController = aerostat({
      from: 1,
      to: successPopScale,
      stiffness: successStiffness,
      damping: successDamping,
      onUpdate: (v: number) => { containerScale = v; emitState(); },
      onComplete: () => {
        successController = aerostat({
          from: successPopScale,
          to: 1,
          stiffness: springBackStiffness,
          damping: springBackDamping,
          onUpdate: (v: number) => { containerScale = v; emitState(); },
          onComplete: () => {
            isAnimating = false;
            dispatch('complete', { values: collectedValues });
            emitState();
          },
        });
      },
    });
  }

  // ============================================
  // Public API
  // ============================================

  export function setValue(value: string) {
    inputValue = value;
    emitState();
  }

  export function submit(): boolean {
    const step = steps[currentStep];
    if (!step || isAnimating) return false;

    const isValid = step.validate ? step.validate(inputValue) : inputValue.trim().length > 0;

    if (!isValid) {
      dispatch('validationFail', { step: currentStep, value: inputValue });
      return false;
    }

    // Store value
    collectedValues[currentStep] = inputValue;
    dispatch('validationSuccess', { step: currentStep, value: inputValue });
    
    // Delay then morph
    setTimeout(() => morphToStep(currentStep + 1), morphDelay);
    return true;
  }

  export function reset() {
    morphController?.stop();
    labelFadeController?.stop();
    successController?.stop();
    
    currentStep = 0;
    inputValue = '';
    inputScale = 1;
    labelOpacity = 1;
    containerScale = 1;
    showSuccess = false;
    isAnimating = false;
    collectedValues = [];
    emitState();
  }

  export function goToStep(step: number) {
    if (step < 0 || step >= steps.length || isAnimating) return;
    morphToStep(step);
  }

  export function getState(): MorphingContextState {
    return currentState;
  }

  export function getInputStyle(): string {
    return `transform: scale(${inputScale});`;
  }

  export function getLabelStyle(): string {
    return `opacity: ${inputValue ? 0 : labelOpacity};`;
  }

  export function getContainerStyle(): string {
    return `transform: scale(${containerScale});`;
  }

  // ============================================
  // Computed
  // ============================================
  
  $: currentPlaceholder = steps[currentStep]?.placeholder ?? '';
  $: currentType = steps[currentStep]?.type ?? 'text';
  $: isValid = steps[currentStep]?.validate ? steps[currentStep]!.validate!(inputValue) : inputValue.trim().length > 0;

  $: currentState = {
    currentStep,
    totalSteps: steps.length,
    inputValue,
    inputScale,
    labelOpacity,
    containerScale,
    showSuccess,
    isAnimating,
    isValid,
  } as MorphingContextState;

  function emitState() {
    dispatch('stateChange', currentState);
  }

  onDestroy(() => {
    morphController?.stop();
    labelFadeController?.stop();
    successController?.stop();
  });
</script>

<slot 
  {currentStep}
  totalSteps={steps.length}
  {inputValue}
  {inputScale}
  {labelOpacity}
  {containerScale}
  {showSuccess}
  {isAnimating}
  {isValid}
  {currentPlaceholder}
  {currentType}
  {steps}
  {setValue}
  {submit}
  {reset}
  {goToStep}
  {getInputStyle}
  {getLabelStyle}
  {getContainerStyle}
/>
