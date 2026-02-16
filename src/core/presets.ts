// ============================================
// Spring Presets - Aerostat Animation Library
// ============================================
// Read-only preset constants for tree-shakeable imports.
// Each preset is tuned for a specific animation "feel".

import type { SpringConfig } from './types';

// ============================================
// Preset Types
// ============================================

/** Available preset names */
export type PresetName = 'snappy' | 'bouncy' | 'smooth' | 'heavy';

/** Preset configuration (read-only) */
export type PresetConfig = Readonly<Required<SpringConfig>>;

// ============================================
// Preset Constants (Tree-Shakeable)
// ============================================
// Each exported const can be eliminated by bundlers if unused.

/**
 * Snappy - Quick, responsive, minimal overshoot.
 * Best for: UI state changes, toggles, micro-interactions.
 * Feel: "Instant but alive"
 */
export const PRESET_SNAPPY: PresetConfig = Object.freeze({
  stiffness: 400,
  damping: 30,
  mass: 1,
  restVelocity: 0.001,
});

/**
 * Bouncy - Energetic, playful overshoot.
 * Best for: Success states, notifications, attention-grabbers.
 * Feel: "Pop and settle"
 */
export const PRESET_BOUNCY: PresetConfig = Object.freeze({
  stiffness: 180,
  damping: 12,
  mass: 1,
  restVelocity: 0.001,
});

/**
 * Smooth - Gentle, elegant, no overshoot.
 * Best for: Page transitions, modals, content reveals.
 * Feel: "Glide into place"
 */
export const PRESET_SMOOTH: PresetConfig = Object.freeze({
  stiffness: 120,
  damping: 20,
  mass: 1,
  restVelocity: 0.001,
});

/**
 * Heavy - Weighty, deliberate, slow settle.
 * Best for: Large elements, dramatic reveals, emphasis.
 * Feel: "Massive and powerful"
 */
export const PRESET_HEAVY: PresetConfig = Object.freeze({
  stiffness: 100,
  damping: 18,
  mass: 2,
  restVelocity: 0.001,
});

// ============================================
// Presets Object (for runtime lookup)
// ============================================

/**
 * All presets as a lookup object.
 * Use individual constants (PRESET_SNAPPY, etc.) for best tree-shaking.
 */
export const presets: Readonly<Record<PresetName, PresetConfig>> = Object.freeze({
  snappy: PRESET_SNAPPY,
  bouncy: PRESET_BOUNCY,
  smooth: PRESET_SMOOTH,
  heavy: PRESET_HEAVY,
});

// ============================================
// Short Aliases (Convenience Exports)
// ============================================
// Direct exports for cleaner imports:
// import { snappy, bouncy } from 'aerostat';

/** Quick, responsive, minimal overshoot */
export const snappy = PRESET_SNAPPY;

/** Energetic, playful overshoot */
export const bouncy = PRESET_BOUNCY;

/** Gentle, elegant, no overshoot */
export const smooth = PRESET_SMOOTH;

/** Weighty, deliberate, slow settle */
export const heavy = PRESET_HEAVY;

// ============================================
// Default Preset Configuration
// ============================================

/** Current default preset name */
let _defaultPreset: PresetName = 'bouncy';

/**
 * Get the current default preset configuration.
 */
export function getDefaultPreset(): PresetConfig {
  return presets[_defaultPreset];
}

/**
 * Get the current default preset name.
 */
export function getDefaultPresetName(): PresetName {
  return _defaultPreset;
}

/**
 * Set the default preset for all animations.
 * Call this at app initialization to change the global feel.
 * 
 * @example
 * ```ts
 * // At app startup
 * import { setDefaultPreset } from 'aerostat';
 * setDefaultPreset('snappy');
 * 
 * // All subsequent animations will use 'snappy' by default
 * aerostat({ from: 0, to: 100, onUpdate: ... });
 * ```
 */
export function setDefaultPreset(preset: PresetName): void {
  _defaultPreset = preset;
}

/**
 * Resolve a preset name to its configuration.
 * Returns undefined if the preset doesn't exist.
 */
export function resolvePreset(name: PresetName): PresetConfig | undefined {
  return presets[name];
}
