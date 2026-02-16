// ============================================
// Aerostat UI - Svelte Components
// ============================================
// Headless, animated UI components for Svelte.
// Uses Aerostat Core for all animations.

// Headless Components
export { default as LiquidSubmit } from './LiquidSubmit.svelte';
export { default as Wizard } from './Wizard.svelte';
export { default as ElasticUnfold } from './ElasticUnfold.svelte';
export { default as MagneticHeader } from './MagneticHeader.svelte';
export { default as ScrollSpring } from './ScrollSpring.svelte';
export { default as MorphingChatBubble } from './MorphingChatBubble.svelte';
export { default as CreditCardAccordion } from './CreditCardAccordion.svelte';
export { default as DeckOfCards } from './DeckOfCards.svelte';
export { default as ProgressiveForm } from './ProgressiveForm.svelte';
export { default as MorphingContext } from './MorphingContext.svelte';
export { default as PresetDemo } from './PresetDemo.svelte';
export { default as OrbitalAction } from './OrbitalAction.svelte';
export { default as MorphingSearch } from './MorphingSearch.svelte';
export { default as SpringyMenu } from './SpringyMenu.svelte';
export { default as LiquidProgress } from './LiquidProgress.svelte';
export { default as MorphSubmit } from './MorphSubmit.svelte';
export { default as LiquidButton } from './LiquidButton.svelte';
export { default as SwipeAction } from './SwipeAction.svelte';
export { default as SpringDrawer } from './SpringDrawer.svelte';

export type { WizardDirection } from './Wizard.svelte';
export type { ElasticUnfoldState } from './ElasticUnfold.svelte';
export type { MagneticHeaderState, MagneticHeaderStyles } from './MagneticHeader.svelte';
export type { ScrollSpringState } from './ScrollSpring.svelte';
export type { BubbleState, MorphingChatBubbleState, MorphingChatBubbleStyles } from './MorphingChatBubble.svelte';
export type { Phase, CreditCardAccordionState, CreditCardAccordionStyles } from './CreditCardAccordion.svelte';
export type { CardTransform, DeckStep, DeckOfCardsState } from './DeckOfCards.svelte';
export type { ProgressiveField, FieldState, ProgressiveFormState } from './ProgressiveForm.svelte';
export type { MorphStep, MorphingContextState } from './MorphingContext.svelte';
export type { PresetInfo, PresetDemoState } from './PresetDemo.svelte';
export type { OrbitalActionState, OrbitalActionStyles } from './OrbitalAction.svelte';
export type { SearchState, MorphingSearchState } from './MorphingSearch.svelte';
export type { MenuItem, SpringyMenuState } from './SpringyMenu.svelte';
export type { LiquidProgressState } from './LiquidProgress.svelte';
export type { SubmitState, MorphSubmitState } from './MorphSubmit.svelte';
export type { LiquidState, LiquidButtonState } from './LiquidButton.svelte';
export type { SwipeActionState } from './SwipeAction.svelte';
export type { SpringDrawerState } from './SpringDrawer.svelte';

// Re-export core utilities for convenience
export { aerostat, createSquish, createShake, createPulse } from '../../core';
export type { AnimationController, SquishOptions, ShakeOptions, PulseOptions } from '../../core';
