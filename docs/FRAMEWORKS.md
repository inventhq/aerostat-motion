# Framework Adapters

Framework-specific integrations for Svelte, React, and SolidJS.

---

## Table of Contents

- [Svelte](#svelte)
- [React / Next.js](#react--nextjs)
- [SolidJS](#solidjs)
- [Integration Patterns](#integration-patterns)

---

## Svelte

### Installation

```bash
npm install aerostat
```

### Squish Action (use:squish)

Haptic button feedback with automatic cleanup.

```svelte
<script>
  import { squish } from 'aerostat/svelte';
</script>

<button use:squish>Click me</button>

<!-- With options -->
<button use:squish={{ pressScale: 0.9, releaseStiffness: 600 }}>
  Extra bouncy
</button>
```

**Options:**
```ts
{
  pressScale?: number;      // Default: 0.92
  pressDuration?: number;   // Default: 80
  releaseStiffness?: number; // Default: 500
  releaseDamping?: number;  // Default: 20
}
```

### Animate Action (use:animateAction)

General-purpose animation with lifecycle management.

```svelte
<script>
  import { animateAction } from 'aerostat/svelte';
  let show = true;
</script>

{#if show}
  <div use:animateAction={{ 
    from: 0, 
    to: 1, 
    property: 'opacity',
    duration: 300 
  }}>
    Fading in...
  </div>
{/if}

<!-- With transform -->
<div use:animateAction={{
  from: 0, 
  to: 100,
  transform: 'translateX',
  unit: 'px'
}}>
  Sliding...
</div>
```

**Options:**
```ts
{
  from: number;
  to: number | string;       // Supports '+=100', '-=50'
  duration?: number;
  delay?: number;
  easing?: EasingFunction;
  property?: string;         // e.g., 'opacity'
  unit?: string;             // e.g., 'px', '%'
  transform?: string;        // e.g., 'translateX', 'scale'
  onUpdate?: (value: number, element: HTMLElement) => void;
  onComplete?: () => void;
}
```

### Direct API Usage

```svelte
<script>
  import { aerostat } from 'aerostat';
  import { onDestroy } from 'svelte';

  let value = 0;
  let controller;

  function animate() {
    controller?.stop();
    controller = aerostat({
      from: value,
      to: 100,
      onUpdate: (v) => { value = v; }
    });
  }

  onDestroy(() => {
    controller?.stop();
  });
</script>

<div style="opacity: {value / 100}">
  {Math.round(value)}
</div>
<button on:click={animate}>Animate</button>
```

### Performance Pattern

For 60fps animations, use direct DOM updates:

```svelte
<script>
  import { aerostat } from 'aerostat';
  
  let fillEl;
  let progress = 0;

  function startAnimation() {
    aerostat({
      from: 0,
      to: 100,
      onUpdate: (v) => {
        progress = v;
        // Direct DOM - no Svelte reactivity overhead
        if (fillEl) {
          fillEl.style.transform = `scaleX(${v / 100})`;
        }
      }
    });
  }
</script>

<div bind:this={fillEl} class="fill"></div>
```

---

## React / Next.js

### Installation

```bash
npm install aerostat
```

React is a **peer dependency** - you must have it installed.

### useAnimate Hook

```tsx
import { createUseAnimate } from 'aerostat/react';
import * as React from 'react';

const useAnimate = createUseAnimate(React);

function FadeIn() {
  const [opacity, setOpacity] = React.useState(0);

  useAnimate({
    from: 0,
    to: 1,
    duration: 300,
    onUpdate: setOpacity
  });

  return <div style={{ opacity }}>Fading in...</div>;
}
```

### Hook with Dependencies

Re-trigger animation when props change:

```tsx
function Toggle({ isOpen }: { isOpen: boolean }) {
  const [height, setHeight] = React.useState(isOpen ? 100 : 0);

  useAnimate({
    from: height,
    to: isOpen ? 100 : 0,
    duration: 200,
    onUpdate: setHeight,
    deps: [isOpen] // Re-animate when isOpen changes
  });

  return <div style={{ height, overflow: 'hidden' }}>Content</div>;
}
```

### Hook Options

```ts
{
  from: number;
  to: number | string;       // Supports '+=100', '-=50'
  duration?: number;
  delay?: number;
  easing?: EasingFunction;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
  enabled?: boolean;         // Default: true
  deps?: readonly unknown[]; // Like useEffect deps
}
```

### Hook Return Value

```ts
const { start, stop, isAnimating, controller } = useAnimate({
  from: 0,
  to: 100,
  onUpdate: setValue
});

// Manual control
<button onClick={start}>Start</button>
<button onClick={stop}>Stop</button>
{isAnimating && <span>Animating...</span>}
```

### Direct API with Refs

For more control, use refs:

```tsx
import { aerostat } from 'aerostat';
import { useRef, useEffect } from 'react';

function Component() {
  const ref = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AnimationController | null>(null);

  useEffect(() => {
    if (ref.current) {
      controllerRef.current = aerostat({
        from: 0,
        to: 100,
        onUpdate: (v) => {
          if (ref.current) {
            ref.current.style.opacity = (v / 100).toString();
          }
        }
      });
    }

    return () => {
      controllerRef.current?.stop();
    };
  }, []);

  return <div ref={ref}>Content</div>;
}
```

### Next.js Server Components

Aerostat works in Client Components only:

```tsx
'use client';

import { createUseAnimate } from 'aerostat/react';
import * as React from 'react';

const useAnimate = createUseAnimate(React);

export default function ClientComponent() {
  // Your animation code
}
```

---

## SolidJS

### Installation

```bash
npm install aerostat
```

SolidJS is a **peer dependency** - you must have it installed.

### Directive (use:animateDirective)

```tsx
import { animateDirective } from 'aerostat/solid';
import { createSignal } from 'solid-js';

// Register directive
const animate = animateDirective;

function FadeIn() {
  const [opacity, setOpacity] = createSignal(0);

  return (
    <div 
      use:animate={{
        from: 0,
        to: 1,
        duration: 300,
        onUpdate: setOpacity
      }}
      style={{ opacity: opacity() }}
    >
      Fading in...
    </div>
  );
}
```

### Directive with Element Access

```tsx
function SlideIn() {
  return (
    <div 
      use:animate={{
        from: -100,
        to: 0,
        duration: 400,
        element: true, // Access element in callback
        onUpdate: (v, el) => {
          el.style.transform = `translateX(${v}px)`;
        }
      }}
    >
      Sliding in...
    </div>
  );
}
```

### createReactiveAnimation

For fine-grained reactivity:

```tsx
import { createReactiveAnimation } from 'aerostat/solid';
import { createSignal, createEffect, onCleanup } from 'solid-js';

function AnimatedCounter() {
  const [count, setCount] = createSignal(0);
  const [display, setDisplay] = createSignal(0);

  createEffect(() => {
    const controller = createReactiveAnimation({
      from: display(),
      to: count(),
      duration: 300,
      onUpdate: setDisplay
    });

    onCleanup(() => controller.stop());
  });

  return (
    <div>
      <span>{Math.round(display())}</span>
      <button onClick={() => setCount(c => c + 10)}>+10</button>
    </div>
  );
}
```

### Manual Cleanup

If using the directive, cleanup is automatic. For manual control:

```tsx
import { cleanupAnimation } from 'aerostat/solid';
import { onCleanup } from 'solid-js';

function Component() {
  let elementRef;

  onCleanup(() => {
    cleanupAnimation(elementRef);
  });

  return <div ref={elementRef}>Content</div>;
}
```

---

## Integration Patterns

### Conditional Animations

**Svelte:**
```svelte
{#if show}
  <div use:animateAction={{ from: 0, to: 1, property: 'opacity' }}>
    Content
  </div>
{/if}
```

**React:**
```tsx
{show && (
  <div>Content</div>
)}
```

**SolidJS:**
```tsx
<Show when={show()}>
  <div>Content</div>
</Show>
```

### List Animations

**Svelte:**
```svelte
{#each items as item, i}
  <div use:animateAction={{ 
    from: 0, 
    to: 1, 
    delay: i * 100,
    property: 'opacity' 
  }}>
    {item}
  </div>
{/each}
```

**React:**
```tsx
{items.map((item, i) => {
  const [opacity, setOpacity] = useState(0);
  
  useAnimate({
    from: 0,
    to: 1,
    delay: i * 100,
    onUpdate: setOpacity
  });
  
  return <div style={{ opacity }}>{item}</div>;
})}
```

**SolidJS:**
```tsx
<For each={items()}>
  {(item, i) => {
    const [opacity, setOpacity] = createSignal(0);
    
    createEffect(() => {
      const ctrl = createReactiveAnimation({
        from: 0,
        to: 1,
        delay: i() * 100,
        onUpdate: setOpacity
      });
      onCleanup(() => ctrl.stop());
    });
    
    return <div style={{ opacity: opacity() }}>{item}</div>;
  }}
</For>
```

### Route Transitions

**Svelte (SvelteKit):**
```svelte
<script>
  import { page } from '$app/stores';
  import { aerostat } from 'aerostat';
  
  let opacity = 1;
  
  $: {
    $page; // Trigger on route change
    opacity = 0;
    aerostat({
      from: 0,
      to: 1,
      duration: 300,
      onUpdate: (v) => { opacity = v; }
    });
  }
</script>

<div style="opacity: {opacity}">
  <slot />
</div>
```

**React (Next.js):**
```tsx
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

function Layout({ children }) {
  const pathname = usePathname();
  const [opacity, setOpacity] = useState(1);
  
  useEffect(() => {
    setOpacity(0);
    const ctrl = aerostat({
      from: 0,
      to: 1,
      duration: 300,
      onUpdate: setOpacity
    });
    return () => ctrl.stop();
  }, [pathname]);
  
  return <div style={{ opacity }}>{children}</div>;
}
```

### Gesture Animations

**Svelte:**
```svelte
<script>
  let x = 0;
  let controller;
  
  function onPanStart() {
    controller?.stop();
  }
  
  function onPan(e) {
    x = e.detail.x;
  }
  
  function onPanEnd() {
    controller = aerostat({
      from: x,
      to: 0,
      stiffness: 200,
      damping: 15,
      onUpdate: (v) => { x = v; }
    });
  }
</script>

<div 
  use:pannable
  on:panstart={onPanStart}
  on:pan={onPan}
  on:panend={onPanEnd}
  style="transform: translateX({x}px)"
>
  Drag me
</div>
```

### Scroll-Driven Animations

```ts
import { aerostat } from 'aerostat';

let controller;
let lastScroll = 0;

window.addEventListener('scroll', () => {
  const scroll = window.scrollY;
  
  controller?.stop();
  controller = aerostat({
    from: lastScroll,
    to: scroll,
    type: 'duration',
    duration: 100,
    onUpdate: (v) => {
      lastScroll = v;
      element.style.transform = `translateY(${v * 0.5}px)`;
    }
  });
});
```

---

## TypeScript Support

All adapters are fully typed:

```ts
import type { 
  AnimationController,
  SquishOptions,
  UseAnimateOptions
} from 'aerostat/svelte';

const options: SquishOptions = {
  pressScale: 0.9,
  releaseStiffness: 600
};
```

---

## Tree-Shaking

Import only what you need:

```ts
// Good - only bundles squish
import { squish } from 'aerostat/svelte';

// Good - only bundles createSquish
import { createSquish } from 'aerostat';

// Also good - core is shared
import { squish } from 'aerostat/svelte';
import { aerostat } from 'aerostat';
```
