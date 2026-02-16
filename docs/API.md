# Core API Reference

Complete reference for Aerostat's animation functions and types.

---

## Table of Contents

- [aerostat()](#aerostat) - Main animation function
- [animate()](#animate) - WeakMap-based animations
- [createSquish()](#createsquish) - Haptic button feedback
- [Animation Controller](#animation-controller)
- [Types](#types)

---

## aerostat()

Main animation function supporting both spring and duration-based animations.

### Signature

```ts
function aerostat(config: AerostatConfig): AnimationController
```

### Spring Animation (default)

```ts
aerostat({
  from: 0,
  to: 100,
  stiffness: 170,      // Optional, default: 180
  damping: 12,         // Optional, default: 12
  mass: 1,             // Optional, default: 1
  restVelocity: 0.001, // Optional, default: 0.001
  velocity: 0,         // Optional, initial velocity
  delay: 0,            // Optional, delay in ms
  onUpdate: (value) => {
    // Called every frame
  },
  onComplete: () => {
    // Called when animation finishes
  }
})
```

**Spring Parameters:**
- `stiffness`: Higher = faster/snappier (range: 50-1000)
- `damping`: Lower = more bounce/overshoot (range: 5-40)
- `mass`: Heavier = slower to move (range: 0.1-10)
- `restVelocity`: Threshold to stop (smaller = more precise)

### Duration-Based Animation

```ts
import { easeOutExpo } from 'aerostat';

aerostat({
  from: 0,
  to: 100,
  type: 'duration',
  duration: 300,       // ms
  easing: easeOutExpo, // Optional, default: easeOutExpo
  delay: 0,            // Optional, delay in ms
  onUpdate: (value) => {
    // Called every frame
  },
  onComplete: () => {
    // Called when animation finishes
  }
})
```

**Built-in Easing Functions:**
- `linear` - No easing
- `easeOutExpo` - Fast start, slow end
- `easeInOutCubic` - Smooth acceleration and deceleration

**Custom Easing:**
```ts
const customEase = (t: number): number => {
  return t * t; // Quadratic
};
```

### Key-Based Interrupts

Use `key` to automatically stop previous animations with the same key:

```ts
aerostat({
  key: 'my-slider',
  from: 0,
  to: 100,
  onUpdate: (v) => slider.style.left = `${v}px`
});

// This stops the previous animation
aerostat({
  key: 'my-slider',
  from: 100,
  to: 200,
  onUpdate: (v) => slider.style.left = `${v}px`
});
```

### Utility Functions

```ts
import { stopByKey, stopAll, getRegistrySize } from 'aerostat';

// Stop specific animation
stopByKey('my-slider');

// Stop all animations
stopAll();

// Get active animation count
const count = getRegistrySize();
```

---

## animate()

WeakMap-based animation for automatic garbage collection and "kill-on-collision" behavior.

### Signature

```ts
function animate(
  target: object, 
  options: TweenOptions
): AnimationController
```

### Usage

```ts
const element = document.querySelector('.box');

animate(element, {
  from: 0,
  to: 100,
  duration: 300,
  onUpdate: (v) => {
    element.style.opacity = v / 100;
  }
});

// Calling animate() again on same target stops the first
animate(element, {
  from: 100,
  to: 0,
  duration: 200,
  onUpdate: (v) => {
    element.style.opacity = v / 100;
  }
});
```

### Relative Values

Use `+=` or `-=` for relative animations:

```ts
animate(element, {
  from: currentValue,
  to: '+=50', // Add 50 to current value
  onUpdate: (v) => element.style.left = `${v}px`
});
```

### Promise Chaining

```ts
animate(element, {
  from: 0,
  to: 100,
  onUpdate: (v) => element.style.opacity = v / 100
})
.then(() => {
  console.log('First animation done');
  return animate(element, {
    from: 100,
    to: 0,
    onUpdate: (v) => element.style.opacity = v / 100
  });
})
.then(() => {
  console.log('Second animation done');
});
```

### Utility Functions

```ts
import { 
  hasAnimation, 
  stopAnimation, 
  getActiveAnimationCount 
} from 'aerostat';

// Check if target has active animation
if (hasAnimation(element)) {
  stopAnimation(element);
}

// Get total active animations
const count = getActiveAnimationCount();
```

---

## createSquish()

Framework-agnostic haptic "squish" effect for buttons.

### Signature

```ts
function createSquish(
  element: HTMLElement,
  options?: SquishOptions
): SquishController
```

### Usage

```ts
import { createSquish } from 'aerostat';

const button = document.querySelector('button');
const squish = createSquish(button);

// Later: cleanup
squish.destroy();
```

### Options

```ts
createSquish(button, {
  pressScale: 0.92,      // Scale when pressed (default: 0.92)
  pressDuration: 80,     // Press animation ms (default: 80)
  releaseStiffness: 500, // Spring stiffness (default: 500)
  releaseDamping: 20     // Spring damping (default: 20)
});
```

### How It Works

1. **Press** (pointerdown) - Quick scale down with heavy easing
2. **Release** (pointerup) - Bouncy spring back to 1.0 with overshoot
3. **Auto-cleanup** - Handles pointerleave/pointercancel

---

## Animation Controller

All animation functions return a controller for fine-grained control.

### Methods

```ts
const controller = aerostat({
  from: 0,
  to: 100,
  onUpdate: (v) => element.style.left = `${v}px`
});

// Stop animation
controller.stop();

// Change target mid-flight (switches to spring)
controller.setTarget(200);

// Pause/resume
controller.pause();
controller.resume();

// Get state
const status = controller.getStatus(); // 'running' | 'paused' | 'complete'
const elapsed = controller.getElapsed(); // ms since start
const currentValue = controller.getValue();
const currentVelocity = controller.getVelocity(); // units/second

// Check if active
if (controller.active) {
  console.log('Still animating');
}

// Promise interface
controller.finished.then(() => {
  console.log('Animation complete');
});

// Or use .then()
controller.then(() => {
  console.log('Animation complete');
});
```

---

## Types

### Core Types

```ts
interface AerostatConfig {
  from: number;
  to: number;
  type?: 'spring' | 'duration';
  
  // Spring options
  stiffness?: number;
  damping?: number;
  mass?: number;
  restVelocity?: number;
  
  // Duration options
  duration?: number;
  easing?: EasingFunction;
  
  // Common options
  velocity?: number;
  delay?: number;
  key?: string | symbol;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

interface AnimationController {
  stop: () => void;
  setTarget: (to: number) => void;
  pause: () => void;
  resume: () => void;
  getStatus: () => AnimationStatus;
  getElapsed: () => number;
  getValue: () => number;
  getVelocity: () => number;
  readonly active: boolean;
  then: (callback: () => void) => AnimationController;
  readonly finished: Promise<void>;
}

type AnimationStatus = 'running' | 'paused' | 'complete';

type EasingFunction = (t: number) => number;
```

### Physics Utilities

```ts
import { 
  lerp, 
  invLerp, 
  clamp, 
  springStep, 
  cubicBezier 
} from 'aerostat';

// Linear interpolation
const value = lerp(0, 100, 0.5); // 50

// Inverse lerp (get t from value)
const t = invLerp(0, 100, 50); // 0.5

// Clamp value
const clamped = clamp(150, 0, 100); // 100

// Spring physics step
const state = springStep(
  { position: 0, velocity: 0 },
  { stiffness: 170, damping: 12, mass: 1 },
  100, // target
  0.016 // delta time (16ms)
);

// Custom cubic bezier easing
const ease = cubicBezier(0.25, 0.1, 0.25, 1.0);
const value = ease(0.5);
```

---

## Advanced Patterns

### Velocity Catching

Catch momentum when interrupting animations:

```ts
const controller = aerostat({
  from: 0,
  to: 100,
  onUpdate: (v) => element.style.left = `${v}px`
});

// Later - catch velocity for smooth interrupt
const velocity = controller.getVelocity();
controller.stop();

aerostat({
  from: controller.getValue(),
  to: 0,
  velocity: velocity, // Smooth reversal
  onUpdate: (v) => element.style.left = `${v}px`
});
```

### Direct DOM Updates

For 60fps performance, update DOM directly in onUpdate:

```ts
let progress = 0;

aerostat({
  from: 0,
  to: 100,
  onUpdate: (v) => {
    progress = v;
    // Direct style update - no Svelte/React reactivity
    element.style.transform = `scaleX(${v / 100})`;
  }
});
```

### Staggered Animations

Create cascading effects with a single spring:

```ts
const items = document.querySelectorAll('.item');

aerostat({
  from: 0,
  to: 1,
  onUpdate: (progress) => {
    items.forEach((item, i) => {
      const threshold = i * 0.15;
      const itemProgress = Math.max(0, Math.min(1, 
        (progress - threshold) / (1 - threshold)
      ));
      
      item.style.opacity = itemProgress;
      item.style.transform = `translateY(${(1 - itemProgress) * 20}px)`;
    });
  }
});
```

---

## Performance Tips

1. **Use `transform` over layout properties**
   ```ts
   // Good - GPU accelerated
   element.style.transform = `translateX(${v}px)`;
   
   // Bad - triggers layout
   element.style.left = `${v}px`;
   ```

2. **Direct DOM updates in onUpdate**
   ```ts
   onUpdate: (v) => {
     // Skip framework reactivity for 60fps
     element.style.opacity = v / 100;
   }
   ```

3. **Use WeakMap animations for auto-cleanup**
   ```ts
   // Automatically garbage collected
   animate(element, { ... });
   ```

4. **Batch style updates**
   ```ts
   onUpdate: (v) => {
     element.style.cssText = `
       transform: translateX(${v}px);
       opacity: ${v / 100};
     `;
   }
   ```
