<script context="module" lang="ts">
  import type { PresetName } from '../../core';
  
  export interface PresetInfo {
    name: PresetName;
    stiffness: number;
    damping: number;
    feel: string;
    useCase: string;
  }
  
  export interface PresetDemoState {
    presetNames: PresetName[];
    positions: Record<PresetName, number>;
    globalDefault: PresetName;
    globalPosition: number;
    isAnimating: Record<PresetName, boolean>;
    isGlobalAnimating: boolean;
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { aerostat, setDefaultPreset, presets } from '../../core';
  import type { AnimationController } from '../../core';
  
  // ============================================
  // Props
  // ============================================
  
  export let initialDefault: PresetName = 'bouncy';
  export let trackLength: number = 200;
  export let autoSetGlobal: boolean = true;
  
  // ============================================
  // Internal State
  // ============================================
  
  const dispatch = createEventDispatcher<{
    presetChange: { preset: PresetName; position: number };
    globalChange: { preset: PresetName };
    animationStart: { preset: PresetName | 'global' };
    animationComplete: { preset: PresetName | 'global' };
    stateChange: PresetDemoState;
  }>();
  
  const presetNames: PresetName[] = ['snappy', 'bouncy', 'smooth', 'heavy'];
  
  const descriptions: Record<PresetName, { feel: string; useCase: string }> = {
    snappy: { feel: 'Quick, responsive, minimal overshoot', useCase: 'Toggles, micro-interactions' },
    bouncy: { feel: 'Energetic, playful overshoot', useCase: 'Success states, notifications' },
    smooth: { feel: 'Gentle, elegant, no overshoot', useCase: 'Page transitions, modals' },
    heavy: { feel: 'Weighty, deliberate, slow settle', useCase: 'Large elements, emphasis' },
  };
  
  let positions: Record<PresetName, number> = {
    snappy: 0,
    bouncy: 0,
    smooth: 0,
    heavy: 0,
  };
  
  let controllers: Record<PresetName, AnimationController | null> = {
    snappy: null,
    bouncy: null,
    smooth: null,
    heavy: null,
  };
  
  let isAnimating: Record<PresetName, boolean> = {
    snappy: false,
    bouncy: false,
    smooth: false,
    heavy: false,
  };
  
  let globalDefault: PresetName = initialDefault;
  let globalPosition = 0;
  let globalController: AnimationController | null = null;
  let isGlobalAnimating = false;
  
  // ============================================
  // Animation Methods
  // ============================================
  
  export function animatePreset(preset: PresetName): void {
    controllers[preset]?.stop();
    
    const currentPos = Math.round(positions[preset]);
    const target = currentPos === 0 ? trackLength : 0;
    
    isAnimating[preset] = true;
    dispatch('animationStart', { preset });
    emitStateChange();
    
    controllers[preset] = aerostat({
      from: positions[preset],
      to: target,
      preset,
      onUpdate: (v: number) => {
        positions[preset] = v;
        positions = positions;
        dispatch('presetChange', { preset, position: v });
        emitStateChange();
      },
      onComplete: () => {
        isAnimating[preset] = false;
        dispatch('animationComplete', { preset });
        emitStateChange();
      },
    });
  }
  
  export function animateAll(): void {
    presetNames.forEach(animatePreset);
  }
  
  export function setGlobalDefault(preset: PresetName): void {
    globalDefault = preset;
    if (autoSetGlobal) {
      setDefaultPreset(preset);
    }
    dispatch('globalChange', { preset });
    emitStateChange();
  }
  
  export function setGlobalAndAnimate(preset: PresetName): void {
    setGlobalDefault(preset);
    animateGlobal();
  }
  
  export function animateGlobal(): void {
    globalController?.stop();
    
    const currentPos = Math.round(globalPosition);
    const target = currentPos === 0 ? trackLength : 0;
    
    isGlobalAnimating = true;
    dispatch('animationStart', { preset: 'global' });
    emitStateChange();
    
    globalController = aerostat({
      from: globalPosition,
      to: target,
      onUpdate: (v: number) => {
        globalPosition = v;
        emitStateChange();
      },
      onComplete: () => {
        isGlobalAnimating = false;
        dispatch('animationComplete', { preset: 'global' });
        emitStateChange();
      },
    });
  }
  
  export function reset(): void {
    presetNames.forEach(p => {
      controllers[p]?.stop();
      positions[p] = 0;
      isAnimating[p] = false;
    });
    globalController?.stop();
    globalPosition = 0;
    isGlobalAnimating = false;
    positions = positions;
    emitStateChange();
  }
  
  export function getPresetInfo(preset: PresetName): PresetInfo {
    const config = presets[preset];
    return {
      name: preset,
      stiffness: config.stiffness,
      damping: config.damping,
      feel: descriptions[preset].feel,
      useCase: descriptions[preset].useCase,
    };
  }
  
  export function getAllPresets(): PresetInfo[] {
    return presetNames.map(getPresetInfo);
  }
  
  // ============================================
  // Style Helpers
  // ============================================
  
  export function getBallStyle(preset: PresetName): string {
    return `transform: translateX(${positions[preset]}px); will-change: transform;`;
  }
  
  export function getGlobalBallStyle(): string {
    return `transform: translateX(${globalPosition}px); will-change: transform;`;
  }
  
  // ============================================
  // State Management
  // ============================================
  
  function emitStateChange() {
    dispatch('stateChange', {
      presetNames,
      positions: { ...positions },
      globalDefault,
      globalPosition,
      isAnimating: { ...isAnimating },
      isGlobalAnimating,
    });
  }
  
  // Cleanup
  onDestroy(() => {
    presetNames.forEach(p => controllers[p]?.stop());
    globalController?.stop();
  });
  
  // Reactive state
  $: state = {
    presetNames,
    positions,
    globalDefault,
    globalPosition,
    isAnimating,
    isGlobalAnimating,
  } as PresetDemoState;
</script>

<slot
  {state}
  {presetNames}
  {positions}
  {globalDefault}
  {globalPosition}
  {isAnimating}
  {isGlobalAnimating}
  {animatePreset}
  {animateAll}
  {setGlobalDefault}
  {setGlobalAndAnimate}
  {animateGlobal}
  {reset}
  {getPresetInfo}
  {getAllPresets}
  {getBallStyle}
  {getGlobalBallStyle}
/>
