<script lang="ts" context="module">
  // ============================================
  // Type Exports
  // ============================================
  
  export type Phase = 'number' | 'expiry' | 'cvv' | 'complete';
  
  export interface CreditCardAccordionState {
    phase: Phase;
    isCompacted: boolean;
    numberWidth: number;
    extraFieldsOpacity: number;
    extraFieldsScale: number;
    maskOpacity: number;
    inputOpacity: number;
    cardNumber: string;
    expiry: string;
    cvv: string;
    numberValid: boolean;
    expiryValid: boolean;
    cvvValid: boolean;
    orbitalStep: number;
    isComplete: boolean;
  }

  export interface CreditCardAccordionStyles {
    numberContainer: string;
    input: string;
    mask: string;
    extraFields: string;
  }
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Compact width percentage when card number is collapsed */
  export let compactWidthPercent = 25;
  
  /** Stiffness for compaction animation */
  export let stiffness = 250;
  
  /** Damping for compaction animation */
  export let damping = 22;
  
  /** Cross-fade duration in ms */
  export let crossFadeDuration = 150;
  
  /** Auto-compact when 16 valid digits entered */
  export let autoCompact = true;
  
  /** Auto-advance between fields */
  export let autoAdvance = true;
  
  /** Focus delay after animation */
  export let focusDelay = 50;

  // ============================================
  // Events
  // ============================================
  
  const dispatch = createEventDispatcher<{
    phaseChange: { phase: Phase; prevPhase: Phase };
    compact: void;
    expand: void;
    numberValid: { number: string };
    expiryValid: { expiry: string };
    cvvValid: { cvv: string };
    complete: { number: string; expiry: string; cvv: string };
    stateChange: CreditCardAccordionState;
  }>();

  // ============================================
  // Validation (Luhn Check)
  // ============================================
  
  function luhnCheck(num: string): boolean {
    const digits = num.replace(/\D/g, '');
    if (digits.length !== 16) return false;
    
    let sum = 0;
    for (let i = 0; i < 16; i++) {
      let digit = parseInt(digits[15 - i] ?? '0', 10);
      if (i % 2 === 1) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
    }
    return sum % 10 === 0;
  }

  // ============================================
  // State
  // ============================================
  
  let cardNumber = '';
  let expiry = '';
  let cvv = '';
  let phase: Phase = 'number';
  let isCompacted = false;
  let prevDigitCount = 0;
  
  // Animation state
  let numberWidth = 100;
  let extraFieldsScale = 0.97;
  let extraFieldsOpacity = 0;
  let maskOpacity = 0;
  let inputOpacity = 1;
  
  // Controllers
  let compactController: AnimationController | null = null;
  let revealController: AnimationController | null = null;
  let maskController: AnimationController | null = null;

  // Spring configs
  const getSpring = () => ({ stiffness, damping });
  const getRevealSpring = () => ({ stiffness: stiffness - 50, damping: damping - 2 });

  // ============================================
  // Formatting
  // ============================================
  
  function formatCardNumber(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  }

  function formatExpiry(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 2) {
      return digits.slice(0, 2) + '/' + digits.slice(2);
    }
    return digits;
  }

  function getMaskedNumber(num: string): string {
    const digits = num.replace(/\D/g, '');
    if (digits.length < 4) return '•••• ••••';
    return '•••• ' + digits.slice(-4);
  }

  // ============================================
  // Animation Logic
  // ============================================

  function changePhase(newPhase: Phase) {
    const prevPhase = phase;
    phase = newPhase;
    dispatch('phaseChange', { phase: newPhase, prevPhase });
  }

  export function compactNumber() {
    if (isCompacted) return;
    
    const velocity = compactController?.getVelocity() ?? 0;
    compactController?.stop();
    revealController?.stop();
    maskController?.stop();

    isCompacted = true;
    changePhase('expiry');
    dispatch('compact');

    // Animate number width compaction
    compactController = aerostat({
      from: numberWidth,
      to: compactWidthPercent,
      velocity,
      ...getSpring(),
      onUpdate: (v: number) => { numberWidth = v; emitState(); },
    });

    // Cross-fade to masked version
    maskController = aerostat({
      from: 0,
      to: 1,
      type: 'duration',
      duration: crossFadeDuration,
      onUpdate: (v: number) => { 
        maskOpacity = v;
        inputOpacity = 1 - v;
        emitState();
      },
    });

    // Reveal extra fields
    revealController = aerostat({
      from: 0,
      to: 1,
      ...getRevealSpring(),
      onUpdate: (p: number) => {
        extraFieldsOpacity = p;
        extraFieldsScale = 0.97 + 0.03 * p;
        emitState();
      },
    });
  }

  export function expandNumber() {
    if (!isCompacted) return;
    
    const velocity = compactController?.getVelocity() ?? 0;
    compactController?.stop();
    revealController?.stop();
    maskController?.stop();

    isCompacted = false;
    changePhase('number');
    dispatch('expand');

    // Animate expansion
    compactController = aerostat({
      from: numberWidth,
      to: 100,
      velocity: -velocity,
      ...getSpring(),
      onUpdate: (v: number) => { numberWidth = v; emitState(); },
    });

    // Cross-fade back
    maskController = aerostat({
      from: maskOpacity,
      to: 0,
      type: 'duration',
      duration: crossFadeDuration,
      onUpdate: (v: number) => { 
        maskOpacity = v;
        inputOpacity = 1 - v;
        emitState();
      },
    });

    // Hide extra fields
    revealController = aerostat({
      from: extraFieldsOpacity,
      to: 0,
      ...getRevealSpring(),
      onUpdate: (p: number) => {
        extraFieldsOpacity = p;
        extraFieldsScale = 0.97 + 0.03 * p;
        emitState();
      },
    });

    // Clear extra fields
    expiry = '';
    cvv = '';
    prevDigitCount = 0;
  }

  // ============================================
  // Input Handlers (exposed for slot usage)
  // ============================================

  export function handleNumberInput(value: string): string {
    const raw = value.replace(/\D/g, '').slice(0, 16);
    cardNumber = formatCardNumber(raw);
    
    if (raw.length === 16 && !isCompacted && autoCompact) {
      if (luhnCheck(raw)) {
        dispatch('numberValid', { number: cardNumber });
        setTimeout(() => compactNumber(), 150);
      }
    }
    
    emitState();
    return cardNumber;
  }

  export function handleExpiryInput(value: string): string {
    expiry = formatExpiry(value);
    
    if (expiry.length === 5) {
      dispatch('expiryValid', { expiry });
      if (autoAdvance) {
        changePhase('cvv');
      }
    }
    
    emitState();
    return expiry;
  }

  export function handleCvvInput(value: string): string {
    cvv = value.replace(/\D/g, '').slice(0, 4);
    
    if (cvv.length >= 3) {
      dispatch('cvvValid', { cvv });
      changePhase('complete');
      dispatch('complete', { number: cardNumber, expiry, cvv });
    }
    
    emitState();
    return cvv;
  }

  export function handleExpiryBackspace(): boolean {
    if (expiry === '') {
      expandNumber();
      return true;
    }
    return false;
  }

  export function handleCvvBackspace(): boolean {
    if (cvv === '') {
      changePhase('expiry');
      return true;
    }
    return false;
  }

  export function advancePhase() {
    const raw = cardNumber.replace(/\D/g, '');
    const isNumberValid = raw.length === 16 && luhnCheck(raw);
    const isExpiryValid = expiry.length === 5;
    const isCvvValid = cvv.length >= 3;
    
    if (phase === 'number' && isNumberValid) {
      compactNumber();
    } else if (phase === 'expiry' && isExpiryValid) {
      changePhase('cvv');
    } else if (phase === 'cvv' && isCvvValid) {
      changePhase('complete');
    }
  }

  export function reset() {
    compactController?.stop();
    revealController?.stop();
    maskController?.stop();
    
    cardNumber = '';
    expiry = '';
    cvv = '';
    phase = 'number';
    isCompacted = false;
    prevDigitCount = 0;
    numberWidth = 100;
    extraFieldsScale = 0.97;
    extraFieldsOpacity = 0;
    maskOpacity = 0;
    inputOpacity = 1;
    
    emitState();
  }

  export function getState(): CreditCardAccordionState {
    return currentState;
  }

  // ============================================
  // Computed
  // ============================================
  
  $: cardDigits = cardNumber.replace(/\D/g, '');
  $: numberValid = cardDigits.length === 16 && luhnCheck(cardDigits);
  $: expiryValid = expiry.length === 5;
  $: cvvValid = cvv.length >= 3;
  $: orbitalStep = cvvValid ? 3 : expiryValid ? 2 : numberValid ? 1 : 0;
  $: isComplete = phase === 'complete';
  $: maskedNumber = getMaskedNumber(cardNumber);

  $: currentState = {
    phase,
    isCompacted,
    numberWidth,
    extraFieldsOpacity,
    extraFieldsScale,
    maskOpacity,
    inputOpacity,
    cardNumber,
    expiry,
    cvv,
    numberValid,
    expiryValid,
    cvvValid,
    orbitalStep,
    isComplete,
  } as CreditCardAccordionState;

  $: styles = {
    numberContainer: `width: ${numberWidth}%;`,
    input: `opacity: ${inputOpacity};`,
    mask: `opacity: ${maskOpacity};`,
    extraFields: `opacity: ${extraFieldsOpacity}; transform: scale(${extraFieldsScale}); pointer-events: ${isCompacted ? 'auto' : 'none'};`,
  } as CreditCardAccordionStyles;

  function emitState() {
    dispatch('stateChange', currentState);
  }

  onDestroy(() => {
    compactController?.stop();
    revealController?.stop();
    maskController?.stop();
  });
</script>

<slot 
  {phase}
  {isCompacted}
  {isComplete}
  {cardNumber}
  {expiry}
  {cvv}
  {maskedNumber}
  {numberValid}
  {expiryValid}
  {cvvValid}
  {orbitalStep}
  {numberWidth}
  {extraFieldsOpacity}
  {extraFieldsScale}
  {maskOpacity}
  {inputOpacity}
  {styles}
  {compactWidthPercent}
  {handleNumberInput}
  {handleExpiryInput}
  {handleCvvInput}
  {handleExpiryBackspace}
  {handleCvvBackspace}
  {advancePhase}
  {compactNumber}
  {expandNumber}
  {reset}
/>
