<!--
  Headless MorphingChatBubble - Typing Indicator to Message Transition
  ====================================================================
  Spring-animated chat bubble that morphs from typing dots to message.
  Fully headless - you control all styling via slots.
  
  STATE MACHINE:
  idle → typing → message → typing → message (loop)
  
  Usage:
  <MorphingChatBubble bind:this={bubble} let:state let:style let:dotStyles>
    <div style={style.bubble}>
      <div style={style.dots}>{#each dotStyles as dot}<span style={dot}/>{/each}</div>
      <p style={style.text}>{message}</p>
    </div>
  </MorphingChatBubble>
  
  <script>
    bubble.showTyping();
    bubble.showMessage('Hello!');
  </script>
-->
<script lang="ts" context="module">
  export type BubbleState = 'idle' | 'typing' | 'message';
  
  export interface MorphingChatBubbleState {
    /** Current state: 'idle' | 'typing' | 'message' */
    state: BubbleState;
    /** Current message text (empty when typing) */
    message: string;
    /** Whether sender is 'self' (right-aligned) or 'other' (left-aligned) */
    sender: 'self' | 'other';
    /** Current bubble width in pixels */
    width: number;
    /** Current bubble height in pixels */
    height: number;
    /** Typing dots opacity (0-1) */
    dotsOpacity: number;
    /** Message text opacity (0-1) */
    textOpacity: number;
  }
  
  export interface MorphingChatBubbleStyles {
    /** CSS for bubble container (width, height, transform-origin) */
    bubble: string;
    /** CSS for dots container (opacity) */
    dots: string;
    /** CSS for text container (opacity) */
    text: string;
  }
</script>

<script lang="ts">
  import { aerostat } from '../../core';
  import type { AnimationController } from '../../core';
  import { onDestroy, createEventDispatcher } from 'svelte';

  // ============================================
  // Props
  // ============================================
  
  /** Sender alignment: 'self' (bottom-right origin) or 'other' (bottom-left origin) */
  export let sender: 'self' | 'other' = 'other';
  
  /** Pill (typing) width in pixels */
  export let pillWidth = 60;
  
  /** Pill (typing) height in pixels */
  export let pillHeight = 40;
  
  /** Message bubble width in pixels */
  export let messageWidth = 240;
  
  /** Message bubble height in pixels */
  export let messageHeight = 80;
  
  /** Morph spring stiffness */
  export let stiffness = 200;
  
  /** Morph spring damping */
  export let damping = 22;
  
  /** Dot breathing spring stiffness */
  export let dotStiffness = 120;
  
  /** Dot breathing spring damping */
  export let dotDamping = 10;
  
  /** Dot breathing amplitude (pixels) */
  export let dotAmplitude = 6;
  
  /** Stagger delay between dots (ms) */
  export let dotStagger = 150;
  
  /** Cross-fade duration (ms) */
  export let fadeDuration = 180;
  
  /** Delay before text fades in during message transition (ms) */
  export let textFadeDelay = 180;

  // ============================================
  // Events
  // ============================================
  
  const dispatch = createEventDispatcher<{
    /** Fired when state changes */
    stateChange: MorphingChatBubbleState;
    /** Fired when typing animation starts */
    typingStart: MorphingChatBubbleState;
    /** Fired when message is shown */
    messageShow: MorphingChatBubbleState;
    /** Fired when reset to idle */
    reset: MorphingChatBubbleState;
  }>();

  // ============================================
  // Internal State
  // ============================================
  
  let state: BubbleState = 'idle';
  let message = '';
  let bubbleWidth = pillWidth;
  let bubbleHeight = pillHeight;
  let dotsOpacity = 0;
  let textOpacity = 0;
  let dotY = [0, 0, 0];
  
  // Controllers
  let widthController: AnimationController | null = null;
  let heightController: AnimationController | null = null;
  let dotsController: AnimationController | null = null;
  let textController: AnimationController | null = null;
  let dotBreathControllers: AnimationController[] = [];

  // ============================================
  // Computed Styles
  // ============================================
  
  $: transformOrigin = sender === 'self' ? 'bottom right' : 'bottom left';
  
  $: styles = {
    bubble: `width: ${bubbleWidth}px; height: ${bubbleHeight}px; transform-origin: ${transformOrigin};`,
    dots: `opacity: ${dotsOpacity};`,
    text: `opacity: ${textOpacity};`,
  } as MorphingChatBubbleStyles;
  
  $: dotStyles = dotY.map(y => `transform: translateY(${y}px);`);
  
  $: currentState = {
    state,
    message,
    sender,
    width: bubbleWidth,
    height: bubbleHeight,
    dotsOpacity,
    textOpacity,
  } as MorphingChatBubbleState;

  // ============================================
  // Dot Breathing Animation
  // ============================================
  
  function startDotBreathing() {
    dotBreathControllers.forEach(c => c?.stop());
    dotBreathControllers = [];
    
    [0, 1, 2].forEach((i) => {
      setTimeout(() => {
        if (state !== 'typing') return;
        animateDotBreath(i);
      }, i * dotStagger);
    });
  }
  
  function animateDotBreath(index: number) {
    if (state !== 'typing') return;
    
    const velocity = dotBreathControllers[index]?.getVelocity() ?? 0;
    dotBreathControllers[index]?.stop();
    
    dotBreathControllers[index] = aerostat({
      from: dotY[index] ?? 0,
      to: -dotAmplitude,
      velocity: velocity ?? 0,
      stiffness: dotStiffness,
      damping: dotDamping,
      onUpdate: (v: number) => { 
        dotY[index] = v;
        dotY = [...dotY];
      },
      onComplete: () => {
        if (state !== 'typing') return;
        dotBreathControllers[index] = aerostat({
          from: -dotAmplitude,
          to: 0,
          stiffness: dotStiffness,
          damping: dotDamping,
          onUpdate: (v: number) => { 
            dotY[index] = v;
            dotY = [...dotY];
          },
          onComplete: () => {
            if (state === 'typing') animateDotBreath(index);
          },
        });
      },
    });
  }
  
  function stopDotBreathing() {
    dotBreathControllers.forEach(c => c?.stop());
    dotBreathControllers = [];
  }

  // ============================================
  // Public API Methods
  // ============================================
  
  /** Transition to typing state (shows animated dots) */
  export function showTyping() {
    const widthVelocity = widthController?.getVelocity() ?? 0;
    const heightVelocity = heightController?.getVelocity() ?? 0;
    
    widthController?.stop();
    heightController?.stop();
    dotsController?.stop();
    textController?.stop();
    
    state = 'typing';
    
    widthController = aerostat({
      from: bubbleWidth,
      to: pillWidth,
      velocity: widthVelocity,
      stiffness,
      damping,
      onUpdate: (v: number) => { bubbleWidth = v; },
    });
    
    heightController = aerostat({
      from: bubbleHeight,
      to: pillHeight,
      velocity: heightVelocity,
      stiffness,
      damping,
      onUpdate: (v: number) => { bubbleHeight = v; },
    });
    
    dotsController = aerostat({
      from: dotsOpacity,
      to: 1,
      type: 'duration',
      duration: fadeDuration,
      onUpdate: (v: number) => { dotsOpacity = v; },
    });
    
    textController = aerostat({
      from: textOpacity,
      to: 0,
      type: 'duration',
      duration: fadeDuration,
      onUpdate: (v: number) => { textOpacity = v; },
    });
    
    startDotBreathing();
    dispatch('typingStart', currentState);
    dispatch('stateChange', currentState);
  }
  
  /** Transition to message state (shows text) */
  export function showMessage(text: string, width = messageWidth, height = messageHeight) {
    const widthVelocity = widthController?.getVelocity() ?? 0;
    const heightVelocity = heightController?.getVelocity() ?? 0;
    
    widthController?.stop();
    heightController?.stop();
    dotsController?.stop();
    textController?.stop();
    stopDotBreathing();
    
    message = text;
    state = 'message';
    
    widthController = aerostat({
      from: bubbleWidth,
      to: width,
      velocity: widthVelocity,
      stiffness,
      damping,
      onUpdate: (v: number) => { bubbleWidth = v; },
    });
    
    heightController = aerostat({
      from: bubbleHeight,
      to: height,
      velocity: heightVelocity,
      stiffness,
      damping,
      onUpdate: (v: number) => { bubbleHeight = v; },
    });
    
    dotsController = aerostat({
      from: dotsOpacity,
      to: 0,
      type: 'duration',
      duration: fadeDuration,
      onUpdate: (v: number) => { dotsOpacity = v; },
    });
    
    setTimeout(() => {
      if (state !== 'message') return;
      textController = aerostat({
        from: 0,
        to: 1,
        type: 'duration',
        duration: fadeDuration,
        onUpdate: (v: number) => { textOpacity = v; },
      });
    }, textFadeDelay);
    
    dispatch('messageShow', currentState);
    dispatch('stateChange', currentState);
  }
  
  /** Reset to idle state */
  export function reset() {
    widthController?.stop();
    heightController?.stop();
    dotsController?.stop();
    textController?.stop();
    stopDotBreathing();
    
    state = 'idle';
    message = '';
    bubbleWidth = pillWidth;
    bubbleHeight = pillHeight;
    dotsOpacity = 0;
    textOpacity = 0;
    dotY = [0, 0, 0];
    
    dispatch('reset', currentState);
    dispatch('stateChange', currentState);
  }
  
  /** Get current state */
  export function getState(): MorphingChatBubbleState {
    return currentState;
  }

  // ============================================
  // Lifecycle
  // ============================================
  
  onDestroy(() => {
    widthController?.stop();
    heightController?.stop();
    dotsController?.stop();
    textController?.stop();
    stopDotBreathing();
  });
</script>

<div class="contents">
  <!--
    Slot Props:
    - state: Current state ('idle' | 'typing' | 'message')
    - message: Current message text
    - sender: 'self' or 'other'
    - styles: Pre-computed CSS strings { bubble, dots, text }
    - dotStyles: Array of 3 CSS transform strings for each dot
    - width: Current bubble width
    - height: Current bubble height
    - dotsOpacity: Dots opacity (0-1)
    - textOpacity: Text opacity (0-1)
    - transformOrigin: CSS transform-origin value
  -->
  <slot 
    {state}
    {message}
    {sender}
    {styles}
    {dotStyles}
    width={bubbleWidth}
    height={bubbleHeight}
    {dotsOpacity}
    {textOpacity}
    {transformOrigin}
  />
</div>
