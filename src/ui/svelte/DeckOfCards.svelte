<script lang="ts" context="module">
  // ============================================
  // Type Exports
  // ============================================
  
  export interface CardTransform {
    translateY: number;
    translateZ: number;
    rotateX: number;
    scale: number;
    opacity: number;
    zIndex: number;
  }

  export interface DeckStep<T = Record<string, unknown>> {
    id: string;
    data?: T;
  }

  export interface DeckOfCardsState {
    currentStep: number;
    totalSteps: number;
    isAnimating: boolean;
    direction: 'forward' | 'backward' | null;
    progress: number;
    isFirst: boolean;
    isLast: boolean;
    cardTransforms: CardTransform[];
  }
</script>

<script lang="ts" generics="T">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Array of step configurations */
  export let steps: DeckStep<T>[] = [];
  
  /** Stack offset per background card in pixels */
  export let stackOffset = 8;
  
  /** Scale decay per background card */
  export let scaleDecay = 0.02;
  
  /** Base Z depth for background cards */
  export let baseDepth = -30;
  
  /** Z depth increment per card */
  export let depthIncrement = -10;
  
  /** Fly-out distance when discarding */
  export let discardDistance = -150;
  
  /** Discard spring stiffness */
  export let discardStiffness = 300;
  
  /** Discard spring damping */
  export let discardDamping = 28;
  
  /** Promote spring stiffness */
  export let promoteStiffness = 280;
  
  /** Promote spring damping */
  export let promoteDamping = 24;
  
  /** Snap-back spring stiffness */
  export let snapStiffness = 350;
  
  /** Snap-back spring damping */
  export let snapDamping = 25;
  
  /** Max visible background cards */
  export let maxVisibleCards = 3;

  // ============================================
  // Events
  // ============================================
  
  const dispatch = createEventDispatcher<{
    stepChange: { step: number; prevStep: number; direction: 'forward' | 'backward' };
    animationStart: { direction: 'forward' | 'backward' };
    animationEnd: { step: number };
    complete: { step: number };
  }>();

  // ============================================
  // State
  // ============================================
  
  let currentStep = 0;
  let isAnimating = false;
  let direction: 'forward' | 'backward' | null = null;

  // Card transform states
  let cardTransforms: CardTransform[] = [];

  // Initialize card states when steps change
  $: if (steps.length > 0 && cardTransforms.length !== steps.length) {
    initializeCardStates();
  }

  function initializeCardStates() {
    cardTransforms = steps.map((_, i) => ({
      translateY: i * stackOffset,
      translateZ: i === 0 ? 0 : baseDepth + i * depthIncrement,
      rotateX: 0,
      scale: 1 - i * scaleDecay,
      opacity: 1,
      zIndex: steps.length - i,
    }));
  }

  // Animation controllers
  let discardController: AnimationController | null = null;
  let promoteController: AnimationController | null = null;

  // ============================================
  // Animation Logic
  // ============================================

  export function next(): boolean {
    if (isAnimating || currentStep >= steps.length - 1) return false;
    if (!cardTransforms[currentStep] || !cardTransforms[currentStep + 1]) return false;
    
    const discardVelocity = discardController?.getVelocity() ?? 0;
    const promoteVelocity = promoteController?.getVelocity() ?? 0;
    
    discardController?.stop();
    promoteController?.stop();

    isAnimating = true;
    direction = 'forward';
    dispatch('animationStart', { direction: 'forward' });

    const fromIndex = currentStep;
    const toIndex = currentStep + 1;
    const fromCard = cardTransforms[fromIndex]!;
    const toCard = cardTransforms[toIndex]!;

    // Set z-index FIRST (Safari flicker fix)
    fromCard.zIndex = steps.length + 1;
    toCard.zIndex = steps.length;

    // Discard animation
    discardController = aerostat({
      from: 0,
      to: 1,
      velocity: discardVelocity,
      stiffness: discardStiffness,
      damping: discardDamping,
      onUpdate: (p: number) => {
        fromCard.translateY = discardDistance * p;
        fromCard.rotateX = 8 * p;
        fromCard.opacity = 1 - p;
        fromCard.scale = 1 - p * 0.1;
        cardTransforms = cardTransforms;
      },
    });

    // Promote animation
    promoteController = aerostat({
      from: 0,
      to: 1,
      velocity: promoteVelocity,
      stiffness: promoteStiffness,
      damping: promoteDamping,
      onUpdate: (p: number) => {
        toCard.translateY = stackOffset * (1 - p);
        toCard.scale = (1 - scaleDecay) + scaleDecay * p;
        toCard.translateZ = baseDepth * (1 - p);
        
        // Background cards shift
        for (let i = toIndex + 1; i < steps.length && i <= toIndex + maxVisibleCards; i++) {
          const bgCard = cardTransforms[i];
          if (!bgCard) continue;
          const prevOffset = i - currentStep;
          bgCard.translateY = (prevOffset * stackOffset) - (stackOffset * p);
          bgCard.scale = (1 - prevOffset * scaleDecay) + (scaleDecay * p);
        }
        
        cardTransforms = cardTransforms;
      },
      onComplete: () => {
        const prevStep = currentStep;
        currentStep = toIndex;
        isAnimating = false;
        direction = null;
        resetCardPositions();
        dispatch('stepChange', { step: currentStep, prevStep, direction: 'forward' });
        dispatch('animationEnd', { step: currentStep });
        if (currentStep === steps.length - 1) {
          dispatch('complete', { step: currentStep });
        }
      },
    });

    return true;
  }

  export function prev(): boolean {
    if (isAnimating || currentStep <= 0) return false;
    if (!cardTransforms[currentStep] || !cardTransforms[currentStep - 1]) return false;
    
    const discardVelocity = discardController?.getVelocity() ?? 0;
    const promoteVelocity = promoteController?.getVelocity() ?? 0;
    
    discardController?.stop();
    promoteController?.stop();

    isAnimating = true;
    direction = 'backward';
    dispatch('animationStart', { direction: 'backward' });

    const fromIndex = currentStep;
    const toIndex = currentStep - 1;
    const fromCard = cardTransforms[fromIndex]!;
    const toCard = cardTransforms[toIndex]!;

    // Set z-index
    toCard.zIndex = steps.length + 1;
    fromCard.zIndex = steps.length;

    // Snap-back animation
    discardController = aerostat({
      from: 0,
      to: 1,
      velocity: -discardVelocity,
      stiffness: snapStiffness,
      damping: snapDamping,
      onUpdate: (p: number) => {
        toCard.translateY = -80 * (1 - p);
        toCard.rotateX = -5 * (1 - p);
        toCard.opacity = p;
        toCard.scale = 0.9 + 0.1 * p;
        cardTransforms = cardTransforms;
      },
    });

    // Demote animation
    promoteController = aerostat({
      from: 0,
      to: 1,
      velocity: -promoteVelocity,
      stiffness: promoteStiffness,
      damping: promoteDamping,
      onUpdate: (p: number) => {
        fromCard.translateY = stackOffset * p;
        fromCard.scale = 1 - scaleDecay * p;
        fromCard.translateZ = baseDepth * p;
        
        for (let i = fromIndex + 1; i < steps.length && i <= fromIndex + maxVisibleCards; i++) {
          const bgCard = cardTransforms[i];
          if (!bgCard) continue;
          const offset = i - fromIndex;
          bgCard.translateY = (offset * stackOffset) + (stackOffset * p);
          bgCard.scale = (1 - offset * scaleDecay) - (scaleDecay * p);
        }
        
        cardTransforms = cardTransforms;
      },
      onComplete: () => {
        const prevStep = currentStep;
        currentStep = toIndex;
        isAnimating = false;
        direction = null;
        resetCardPositions();
        dispatch('stepChange', { step: currentStep, prevStep, direction: 'backward' });
        dispatch('animationEnd', { step: currentStep });
      },
    });

    return true;
  }

  export function goToStep(targetStep: number): boolean {
    if (isAnimating || targetStep < 0 || targetStep >= steps.length) return false;
    if (targetStep === currentStep) return false;
    
    // Simple jump without animation
    currentStep = targetStep;
    resetCardPositions();
    dispatch('stepChange', { step: currentStep, prevStep: currentStep, direction: targetStep > currentStep ? 'forward' : 'backward' });
    return true;
  }

  export function reset() {
    discardController?.stop();
    promoteController?.stop();
    currentStep = 0;
    isAnimating = false;
    direction = null;
    initializeCardStates();
  }

  function resetCardPositions() {
    steps.forEach((_, i) => {
      const card = cardTransforms[i];
      if (!card) return;
      
      const relativeIndex = i - currentStep;
      
      if (relativeIndex >= 0) {
        card.zIndex = steps.length - relativeIndex;
        card.translateY = relativeIndex * stackOffset;
        card.scale = 1 - relativeIndex * scaleDecay;
        card.translateZ = relativeIndex === 0 ? 0 : baseDepth + relativeIndex * depthIncrement;
        card.opacity = 1;
        card.rotateX = 0;
      } else {
        card.zIndex = 0;
        card.translateY = discardDistance;
        card.opacity = 0;
      }
    });
    cardTransforms = cardTransforms;
  }

  export function getState(): DeckOfCardsState {
    return {
      currentStep,
      totalSteps: steps.length,
      isAnimating,
      direction,
      progress: ((currentStep + 1) / steps.length) * 100,
      isFirst: currentStep === 0,
      isLast: currentStep === steps.length - 1,
      cardTransforms,
    };
  }

  // Helper to get transform style string
  export function getCardStyle(index: number): string {
    const t = cardTransforms[index];
    if (!t) return '';
    return `
      transform: translateY(${t.translateY}px) translateZ(${t.translateZ}px) rotateX(${t.rotateX}deg) scale(${t.scale});
      opacity: ${t.opacity};
      z-index: ${t.zIndex};
    `;
  }

  // Helper to check if card should be visible
  export function isCardVisible(index: number): boolean {
    return (index >= currentStep && index <= currentStep + maxVisibleCards) || 
           (direction !== null && index === currentStep - 1);
  }

  // ============================================
  // Computed
  // ============================================
  
  $: totalSteps = steps.length;
  $: progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  $: isFirst = currentStep === 0;
  $: isLast = currentStep === totalSteps - 1;
  $: currentStepData = steps[currentStep]?.data;

  onDestroy(() => {
    discardController?.stop();
    promoteController?.stop();
  });
</script>

<slot 
  {currentStep}
  {totalSteps}
  {isAnimating}
  {direction}
  {progress}
  {isFirst}
  {isLast}
  {cardTransforms}
  {currentStepData}
  {steps}
  {next}
  {prev}
  {goToStep}
  {reset}
  {getCardStyle}
  {isCardVisible}
/>
