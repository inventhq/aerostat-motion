# Aerostat

**The missing physics the browser forgot to give you.**

~3KB • Zero dependencies • Spring-first motion

Aerostat is the animation primitive for modern frameworks. While Svelte, React, and Solid handle the DOM, Aerostat handles **time and physics** — with automatic interrupt handling, velocity catching, and a unified spring engine.

---

## Why Aerostat?

| Feature | Aerostat | CSS/Web Animations | GSAP |
|---------|----------|-------------------|------|
| **Size** | ~3KB | 0KB | ~60KB |
| **Spring Physics** | Native | Needs JS | Plugin |
| **Interrupt Handling** | Automatic (WeakMap) | Manual | Manual |
| **Velocity Catching** | Built-in | None | Manual |
| **Modern Framework DX** | Svelte actions, React hooks | Generic | Generic |

**Optimized for the Modern Stack** — where the framework owns the DOM and you need physics-based motion without the bloat.

---

## Features

- 🎯 **Singleton Scheduler** - Single global rAF loop prevents layout thrashing
- ⚡️ **Spring Physics** - Realistic damped harmonic oscillator with velocity catching
- 🔄 **Automatic Interrupts** - WeakMap-based collision detection for smooth transitions
- 🎨 **Framework Adapters** - Tree-shakeable actions/hooks for Svelte, React, SolidJS
- 📦 **Tiny Bundle** - Core library under 3KB gzipped
- 🛠️ **TypeScript** - Full type safety with strict mode

---

## Installation

```bash
npm i @vishinvents/aerostat
```

---

## Quick Start

### Vanilla JS / TypeScript

```ts
import { aerostat } from 'aerostat';

// Spring animation (default)
aerostat({
  from: 0,
  to: 100,
  onUpdate: (value) => {
    element.style.opacity = value / 100;
  }
});

// Duration-based with easing
aerostat({
  from: 0,
  to: 100,
  type: 'duration',
  duration: 300,
  easing: easeOutExpo,
  onUpdate: (value) => {
    element.style.transform = `translateX(${value}px)`;
  }
});
```

### Svelte

```svelte
<script>
  import { squish } from 'aerostat/svelte';
</script>

<button use:squish>Click me</button>
```

### React / Next.js

```tsx
import { createUseAnimate } from 'aerostat/react';
import * as React from 'react';

const useAnimate = createUseAnimate(React);

function Component() {
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

### SolidJS

```tsx
import { createReactiveAnimation } from 'aerostat/solid';
import { createSignal, createEffect, onCleanup } from 'solid-js';

function Component() {
  const [value, setValue] = createSignal(0);
  
  createEffect(() => {
    const controller = createReactiveAnimation({
      from: 0,
      to: 100,
      onUpdate: setValue
    });
    
    onCleanup(() => controller.stop());
  });
  
  return <div>{value()}</div>;
}
```

---

## Documentation

- [Core API Reference](./docs/API.md) - Main animation functions and types
- [Framework Adapters](./docs/FRAMEWORKS.md) - Svelte, React, and SolidJS integrations
- [Examples & Patterns](./docs/EXAMPLES.md) - Common use cases and recipes

---

## Core Concepts

### Spring Physics

Springs create natural, momentum-based animations:

```ts
aerostat({
  from: 0,
  to: 100,
  stiffness: 170,  // Higher = faster
  damping: 12,     // Lower = more bounce
  onUpdate: (v) => element.style.left = `${v}px`
});
```

### Automatic Interrupts

Calling a new animation on the same target automatically stops the previous one:

```ts
const controller = aerostat({
  from: 0,
  to: 100,
  onUpdate: (v) => element.style.opacity = v / 100
});

// Later - this will stop the first animation
aerostat({
  from: controller.getValue(),
  to: 0,
  velocity: controller.getVelocity(), // Catch momentum!
  onUpdate: (v) => element.style.opacity = v / 100
});
```

### Key-Based Registry

Name animations to interrupt by key:

```ts
aerostat({
  key: 'my-animation',
  from: 0,
  to: 100,
  onUpdate: (v) => element.style.left = `${v}px`
});

// Later - stops 'my-animation'
aerostat({
  key: 'my-animation',
  from: 100,
  to: 200,
  onUpdate: (v) => element.style.left = `${v}px`
});
```

---

## Spring Presets

Four built-in presets tuned for common use cases:

```ts
import { snappy, bouncy, smooth, heavy } from 'aerostat';

// Use directly
aerostat({ from: 0, to: 100, ...snappy, onUpdate });

// Or set globally
import { setDefaultPreset } from 'aerostat';
setDefaultPreset('snappy'); // All animations now use snappy
```

| Preset | Stiffness | Damping | Feel |
|--------|-----------|---------|------|
| `snappy` | 400 | 30 | Quick, responsive, minimal overshoot |
| `bouncy` | 180 | 12 | Energetic, playful overshoot |
| `smooth` | 120 | 20 | Gentle, elegant, no overshoot |
| `heavy` | 100 | 18 | Weighty, deliberate, slow settle |

---

## Bundle Size

| Import | Size (gzipped) |
|--------|---------------|
| Core (`aerostat`) | ~2.9 KB |
| Svelte adapter | +402 B |
| React adapter | +459 B |
| SolidJS adapter | +426 B |
| Squish utility | +500 B |

Tree-shakeable - only bundle what you import.

---

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- All modern mobile browsers

---

## Contributing

PRs welcome! Please open an issue first to discuss what you'd like to change.

---

## License

MIT © 2026

---

## Credits

Built with ❤️ for the micro-interaction community.

Inspired by the physics of real-world motion and the elegance of minimal APIs.
