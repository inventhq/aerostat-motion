// ============================================
// Scroll-Spring Driver - Scroll-Linked Animations
// ============================================
// Hybrid approach: IntersectionObserver + Passive Scroll + rAF + Spring
// Optimized for mobile Safari performance.

import { springStep, isAtRest, clamp } from './physics';
import type { SpringState, SpringParams } from './physics';

// ============================================
// Types
// ============================================

/**
 * Scroll-linked animation configuration.
 */
export interface ScrollSpringOptions {
  /** Element to track (for calculating scroll progress) */
  element: HTMLElement;
  /** Container for scroll events (default: window) */
  container?: HTMLElement | Window;
  /** Start progress when element top reaches this viewport position (0-1, default: 1 = bottom) */
  start?: number;
  /** End progress when element top reaches this viewport position (0-1, default: 0 = top) */
  end?: number;
  /** Spring stiffness (default: 120 for smooth scroll feel) */
  stiffness?: number;
  /** Spring damping (default: 20 for minimal overshoot) */
  damping?: number;
  /** Callback with smoothed progress (0-1) */
  onProgress: (progress: number) => void;
  /** Called when element enters viewport */
  onEnter?: () => void;
  /** Called when element exits viewport */
  onExit?: () => void;
}

/**
 * Controller for scroll-linked animation.
 */
export interface ScrollSpringController {
  /** Stop tracking and cleanup */
  destroy: () => void;
  /** Get current raw scroll progress (0-1) */
  getRawProgress: () => number;
  /** Get current smoothed progress (0-1) */
  getProgress: () => number;
  /** Whether element is currently visible */
  readonly isVisible: boolean;
  /** Force update (useful after layout changes) */
  update: () => void;
}

// ============================================
// Global State (Shared Resources)
// ============================================

// Set of active scroll trackers
const activeTrackers = new Set<ScrollTracker>();

// Global scroll listener state (shared, lazy-initialized)
let globalScrollListener: (() => void) | null = null;
let scrollListenerCount = 0;
let rafPending = false;
let lastScrollY = 0;

// ============================================
// Internal Tracker Class
// ============================================

interface ScrollTracker {
  element: HTMLElement;
  container: HTMLElement | Window;
  start: number;
  end: number;
  springParams: SpringParams;
  springState: SpringState;
  targetProgress: number;
  onProgress: (progress: number) => void;
  onEnter: (() => void) | undefined;
  onExit: (() => void) | undefined;
  isVisible: boolean;
  observer: IntersectionObserver;
  destroyed: boolean;
}

// ============================================
// Progress Calculation
// ============================================

/**
 * Calculate scroll progress for an element.
 * Progress goes from 0 (element just entering at bottom) to 1 (element at top).
 */
function calculateProgress(
  element: HTMLElement,
  container: HTMLElement | Window,
  start: number,
  end: number
): number {
  const rect = element.getBoundingClientRect();
  const viewportHeight = container === window 
    ? window.innerHeight 
    : (container as HTMLElement).clientHeight;
  
  // Start position (element top at viewport bottom = 0)
  const startThreshold = viewportHeight * start;
  // End position (element top at viewport top = 1)
  const endThreshold = viewportHeight * end;
  
  // Calculate progress based on element's top position
  // When rect.top = startThreshold → progress = 0
  // When rect.top = endThreshold → progress = 1
  const progress = (startThreshold - rect.top) / (startThreshold - endThreshold);
  
  return clamp(progress, 0, 1);
}

// ============================================
// Global Scroll Handling (Shared)
// ============================================

function handleGlobalScroll() {
  // Skip if rAF already pending (throttle to 1 per frame)
  if (rafPending) return;
  
  rafPending = true;
  requestAnimationFrame(processScrollFrame);
}

function processScrollFrame() {
  rafPending = false;
  
  // Update all active trackers
  for (const tracker of activeTrackers) {
    if (tracker.destroyed || !tracker.isVisible) continue;
    
    // Calculate raw progress
    tracker.targetProgress = calculateProgress(
      tracker.element,
      tracker.container,
      tracker.start,
      tracker.end
    );
  }
  
  // Spring animation continues in separate loop
  tickSprings();
}

// ============================================
// Spring Animation Loop
// ============================================

let springRafId: number | null = null;
let lastSpringTime = 0;

function tickSprings() {
  // Check if any springs need animation
  let hasActiveSpring = false;
  
  for (const tracker of activeTrackers) {
    if (tracker.destroyed) continue;
    
    // Check if spring needs to move
    if (!isAtRest(tracker.springState, tracker.targetProgress, 0.0001, 0.0001)) {
      hasActiveSpring = true;
    }
  }
  
  // Start spring loop if not running
  if (hasActiveSpring && springRafId === null) {
    lastSpringTime = performance.now();
    springRafId = requestAnimationFrame(springLoop);
  }
}

function springLoop(now: number) {
  const delta = Math.min((now - lastSpringTime) / 1000, 0.064); // Cap at ~16fps minimum
  lastSpringTime = now;
  
  let hasActiveSpring = false;
  
  for (const tracker of activeTrackers) {
    if (tracker.destroyed) continue;
    
    // Run spring step
    const inMotion = springStep(
      tracker.springState,
      tracker.targetProgress,
      tracker.springParams,
      delta
    );
    
    // Call progress callback with smoothed value
    tracker.onProgress(tracker.springState.value);
    
    if (inMotion) {
      hasActiveSpring = true;
    }
  }
  
  // Continue loop if any spring is still moving
  if (hasActiveSpring) {
    springRafId = requestAnimationFrame(springLoop);
  } else {
    springRafId = null;
  }
}

// ============================================
// Scroll Listener Management
// ============================================

function attachScrollListener(container: HTMLElement | Window) {
  if (scrollListenerCount === 0) {
    const target = container === window ? window : container;
    globalScrollListener = handleGlobalScroll;
    target.addEventListener('scroll', globalScrollListener, { passive: true });
  }
  scrollListenerCount++;
}

function detachScrollListener(container: HTMLElement | Window) {
  scrollListenerCount--;
  if (scrollListenerCount === 0 && globalScrollListener) {
    const target = container === window ? window : container;
    target.removeEventListener('scroll', globalScrollListener);
    globalScrollListener = null;
  }
}

// ============================================
// Public API
// ============================================

/**
 * Create a scroll-linked animation with spring smoothing.
 * 
 * @example
 * ```ts
 * const controller = createScrollSpring({
 *   element: myDiv,
 *   onProgress: (p) => {
 *     // p goes from 0 to 1 as element scrolls through viewport
 *     myDiv.style.opacity = String(p);
 *     myDiv.style.transform = `translateY(${(1 - p) * 50}px)`;
 *   },
 * });
 * 
 * // Cleanup when done
 * controller.destroy();
 * ```
 */
export function createScrollSpring(options: ScrollSpringOptions): ScrollSpringController {
  const {
    element,
    container = window,
    start = 1, // Start when element top at viewport bottom
    end = 0,   // End when element top at viewport top
    stiffness = 120,
    damping = 20,
    onProgress,
    onEnter,
    onExit,
  } = options;
  
  // Initialize tracker
  const tracker: ScrollTracker = {
    element,
    container,
    start,
    end,
    springParams: { stiffness, damping, mass: 1 },
    springState: { value: 0, velocity: 0 },
    targetProgress: 0,
    onProgress,
    onEnter,
    onExit,
    isVisible: false,
    observer: null!,
    destroyed: false,
  };
  
  // Create IntersectionObserver to detect visibility
  tracker.observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const wasVisible = tracker.isVisible;
        tracker.isVisible = entry.isIntersecting;
        
        if (tracker.isVisible && !wasVisible) {
          // Element entered viewport
          activeTrackers.add(tracker);
          attachScrollListener(container);
          onEnter?.();
          
          // Calculate initial progress
          tracker.targetProgress = calculateProgress(element, container, start, end);
          tracker.springState.value = tracker.targetProgress; // Snap to initial
          
          // Trigger spring loop
          tickSprings();
        } else if (!tracker.isVisible && wasVisible) {
          // Element exited viewport
          activeTrackers.delete(tracker);
          detachScrollListener(container);
          onExit?.();
        }
      }
    },
    {
      // Use larger margins to start tracking before element is fully visible
      rootMargin: '50px 0px 50px 0px',
      threshold: 0,
    }
  );
  
  // Start observing
  tracker.observer.observe(element);
  
  // Return controller
  return {
    destroy() {
      if (tracker.destroyed) return;
      tracker.destroyed = true;
      
      tracker.observer.disconnect();
      
      if (tracker.isVisible) {
        activeTrackers.delete(tracker);
        detachScrollListener(container);
      }
    },
    
    getRawProgress() {
      return tracker.targetProgress;
    },
    
    getProgress() {
      return tracker.springState.value;
    },
    
    get isVisible() {
      return tracker.isVisible;
    },
    
    update() {
      if (tracker.isVisible) {
        tracker.targetProgress = calculateProgress(element, container, start, end);
        tickSprings();
      }
    },
  };
}

// ============================================
// Utility: Batch Multiple Scroll Animations
// ============================================

/**
 * Options for scroll-triggered reveal animations.
 */
export interface ScrollRevealOptions {
  /** Elements to animate */
  elements: HTMLElement[];
  /** Stagger delay between elements (ms, default: 100) */
  stagger?: number;
  /** Spring stiffness (default: 120) */
  stiffness?: number;
  /** Spring damping (default: 20) */
  damping?: number;
  /** Start threshold (0-1, default: 0.9) */
  start?: number;
  /** End threshold (0-1, default: 0.2) */
  end?: number;
  /** Callback for each element's progress */
  onProgress: (element: HTMLElement, progress: number, index: number) => void;
}

/**
 * Create scroll-reveal for multiple elements with stagger.
 */
export function createScrollReveal(options: ScrollRevealOptions): { destroy: () => void } {
  const {
    elements,
    stagger = 100,
    stiffness = 120,
    damping = 20,
    start = 0.9,
    end = 0.2,
    onProgress,
  } = options;
  
  const controllers: ScrollSpringController[] = [];
  
  elements.forEach((element, index) => {
    // Offset progress based on stagger
    const staggerOffset = (index * stagger) / 1000;
    
    const controller = createScrollSpring({
      element,
      start,
      end,
      stiffness,
      damping,
      onProgress: (p) => {
        // Apply stagger offset (elements later in list animate later)
        const staggeredProgress = clamp(p - staggerOffset, 0, 1);
        onProgress(element, staggeredProgress, index);
      },
    });
    
    controllers.push(controller);
  });
  
  return {
    destroy() {
      controllers.forEach(c => c.destroy());
    },
  };
}

// ============================================
// Debug Utilities
// ============================================

/**
 * Get count of active scroll trackers (for debugging).
 */
export function getActiveScrollTrackerCount(): number {
  return activeTrackers.size;
}
