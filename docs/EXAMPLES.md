# Examples & Patterns

Real-world animation patterns and recipes using Aerostat.

---

## Table of Contents

- [Morphing Search](#morphing-search)
- [Springy Dropdown Menu](#springy-dropdown-menu)
- [Squish Buttons](#squish-buttons)
- [Liquid Progress Bar](#liquid-progress-bar)
- [Morphing Submit Button](#morphing-submit-button)
- [Common Patterns](#common-patterns)

---

## Morphing Search

Button that expands into a search input with spring physics.

### Features
- Circular button → rounded input field
- Spring animation with velocity catching
- Auto-focus after expansion
- Interrupt handling for smooth reversal

### Implementation

```svelte
<script>
  import { aerostat } from 'aerostat';
  
  let state = 'collapsed'; // 'collapsed' | 'expanded'
  let width = 48;
  let controller;
  
  const COLLAPSED_WIDTH = 48;
  const EXPANDED_WIDTH = 280;
  
  function expand() {
    controller?.stop();
    state = 'expanding';
    
    controller = aerostat({
      from: width,
      to: EXPANDED_WIDTH,
      stiffness: 180,
      damping: 14,
      onUpdate: (v) => { width = v; },
      onComplete: () => {
        state = 'expanded';
        inputEl?.focus();
      }
    });
  }
  
  function collapse() {
    controller?.stop();
    state = 'collapsed';
    
    controller = aerostat({
      from: width,
      to: COLLAPSED_WIDTH,
      stiffness: 200,
      damping: 16,
      onUpdate: (v) => { width = v; }
    });
  }
</script>

<div 
  class="search"
  style="width: {width}px"
  on:click={state === 'collapsed' ? expand : null}
>
  {#if state === 'collapsed'}
    <SearchIcon />
  {:else}
    <input bind:this={inputEl} placeholder="Search..." />
    <button on:click={collapse}>×</button>
  {/if}
</div>

<style>
  .search {
    height: 48px;
    border-radius: 24px;
    background: #1a1a1a;
    display: flex;
    align-items: center;
    padding: 0 12px;
  }
</style>
```

**Key Concepts:**
- Different spring configs for expand/collapse
- `controller?.stop()` for clean interrupts
- Auto-focus via `onComplete`

---

## Springy Dropdown Menu

Staggered reveal menu with single spring value.

### Features
- Single spring animates progress 0 → 1
- Items appear at staggered thresholds
- Velocity-aware close animation
- Direct DOM updates for 60fps

### Implementation

```svelte
<script>
  import { aerostat } from 'aerostat';
  
  let isOpen = false;
  let progress = 0;
  let controller;
  let itemEls = [];
  
  const items = ['Home', 'Profile', 'Settings', 'Logout'];
  
  function toggle() {
    const velocity = controller?.getVelocity() ?? 0;
    controller?.stop();
    
    isOpen = !isOpen;
    
    controller = aerostat({
      from: progress,
      to: isOpen ? 1 : 0,
      velocity,
      stiffness: 400,
      damping: 22,
      onUpdate: (v) => {
        progress = v;
        updateItems(v);
      }
    });
  }
  
  function updateItems(p) {
    itemEls.forEach((el, i) => {
      if (!el) return;
      
      // Stagger: item 0 at 0.1, item 1 at 0.25, etc.
      const threshold = 0.1 + i * 0.15;
      const itemProgress = Math.max(0, Math.min(1,
        (p - threshold) / (1 - threshold)
      ));
      
      el.style.transform = `translateY(${(1 - itemProgress) * 20}px)`;
      el.style.opacity = itemProgress;
    });
  }
</script>

<button on:click={toggle}>Menu</button>

{#if progress > 0.01}
  <div class="menu">
    {#each items as item, i}
      <div bind:this={itemEls[i]} class="item">
        {item}
      </div>
    {/each}
  </div>
{/if}
```

**Key Concepts:**
- Single spring value drives multiple elements
- Threshold-based staggering
- Direct DOM manipulation in `onUpdate`
- Velocity catching on toggle

---

## Squish Buttons

Haptic press/release feedback mimicking mechanical buttons.

### Features
- Press: Heavy duration-based ease (80ms)
- Release: Bouncy spring with overshoot
- Pointer events for cross-device support
- Automatic cleanup

### Implementation

```svelte
<script>
  import { squish } from 'aerostat/svelte';
</script>

<button use:squish>
  Click me
</button>

<!-- Custom settings -->
<button use:squish={{ 
  pressScale: 0.85, 
  releaseStiffness: 800 
}}>
  Extra bouncy
</button>
```

**Or vanilla JS:**

```ts
import { createSquish } from 'aerostat';

const button = document.querySelector('button');
const squish = createSquish(button, {
  pressScale: 0.92,
  pressDuration: 80,
  releaseStiffness: 500,
  releaseDamping: 20
});

// Cleanup
squish.destroy();
```

**Key Concepts:**
- Two-phase animation (press + release)
- Different animation types for different feels
- Pointer events + mouse + touch fallbacks
- `will-change: transform` for GPU acceleration

---

## Liquid Progress Bar

Physics-based progress with visible "slosh".

### Features
- Low damping spring for oscillation
- `scaleX` transform for 60fps
- SVG gooey filter for liquid effect
- Velocity-aware interrupt handling

### Implementation

```svelte
<script>
  import { aerostat } from 'aerostat';
  
  export let progress = 0; // 0-100
  
  let displayProgress = 0;
  let controller;
  let fillEl;
  
  $: animateProgress(progress);
  
  function animateProgress(target) {
    const velocity = controller?.getVelocity() ?? 0;
    controller?.stop();
    
    controller = aerostat({
      from: displayProgress,
      to: target,
      velocity,
      stiffness: 170,
      damping: 12, // Low = more slosh
      onUpdate: (v) => {
        displayProgress = v;
        if (fillEl) {
          fillEl.style.transform = `scaleX(${v / 100})`;
        }
      }
    });
  }
</script>

<!-- Gooey filter -->
<svg style="position: absolute; width: 0; height: 0;">
  <defs>
    <filter id="goo">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
      <feColorMatrix 
        in="blur" 
        mode="matrix" 
        values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" 
      />
    </filter>
  </defs>
</svg>

<div class="track">
  <div 
    bind:this={fillEl}
    class="fill"
    style="transform: scaleX({displayProgress / 100})"
  ></div>
</div>

<style>
  .track {
    height: 12px;
    background: #e5e5e5;
    border-radius: 6px;
    overflow: hidden;
    filter: url(#goo);
  }
  
  .fill {
    width: 100%;
    height: 100%;
    background: #1a1a1a;
    transform-origin: left center;
    will-change: transform;
  }
</style>
```

**Key Concepts:**
- `scaleX` instead of `width` (no layout)
- Direct DOM update in `onUpdate`
- SVG filter for gooey edges
- Velocity catching for smooth jumps

---

## Morphing Submit Button

Button morphs into circular loader, then pops on success.

### Features
- Multi-phase spring sequence
- SVG stroke-dashoffset for progress
- Automatic error recovery
- Cross-fade text ↔ checkmark

### Implementation

```svelte
<script>
  import { aerostat } from 'aerostat';
  
  let state = 'idle'; // 'idle' | 'loading' | 'success'
  let width = 160;
  let progress = 0;
  let circleEl;
  
  const FULL_WIDTH = 160;
  const CIRCLE_SIZE = 48;
  const CIRCUMFERENCE = 2 * Math.PI * 20;
  
  async function handleSubmit() {
    if (state !== 'idle') return;
    state = 'loading';
    
    // Morph to circle
    aerostat({
      from: width,
      to: CIRCLE_SIZE,
      stiffness: 300,
      damping: 25,
      onUpdate: (v) => {
        width = v;
        if (v <= FULL_WIDTH * 0.3) startProgress();
      }
    });
    
    try {
      await onSubmit();
      handleSuccess();
    } catch {
      handleError();
    }
  }
  
  function startProgress() {
    // Simulate progress with spring
    const steps = [30, 50, 70, 100];
    let i = 0;
    
    function next() {
      if (i >= steps.length) return;
      
      aerostat({
        from: progress,
        to: steps[i],
        stiffness: 200,
        damping: 15,
        onUpdate: (v) => {
          progress = v;
          updateRing(v);
        },
        onComplete: () => {
          if (steps[i] === 100) {
            handleSuccess();
          } else {
            i++;
            setTimeout(next, 200);
          }
        }
      });
      
      i++;
    }
    
    next();
  }
  
  function updateRing(p) {
    if (circleEl) {
      const offset = CIRCUMFERENCE - (p / 100) * CIRCUMFERENCE;
      circleEl.style.strokeDashoffset = offset;
    }
  }
  
  function handleSuccess() {
    state = 'success';
    
    // Pop animation
    aerostat({
      from: 1,
      to: 1.15,
      stiffness: 400,
      damping: 12,
      onUpdate: (v) => {
        buttonEl.style.transform = `scale(${v})`;
      },
      onComplete: () => {
        // Settle back
        aerostat({
          from: 1.15,
          to: 1,
          stiffness: 300,
          damping: 20,
          onUpdate: (v) => {
            buttonEl.style.transform = `scale(${v})`;
          }
        });
      }
    });
  }
  
  function handleError() {
    // Spring back to original
    aerostat({
      from: width,
      to: FULL_WIDTH,
      stiffness: 250,
      damping: 18,
      onUpdate: (v) => { width = v; },
      onComplete: () => {
        state = 'idle';
        progress = 0;
      }
    });
  }
</script>

<button 
  bind:this={buttonEl}
  style="width: {width}px"
  on:click={handleSubmit}
>
  {#if state === 'idle'}
    Submit
  {:else if state === 'loading'}
    <svg class="spinner">
      <circle 
        bind:this={circleEl}
        r="20"
        stroke="white"
        stroke-width="3"
        stroke-dasharray={CIRCUMFERENCE}
        stroke-dashoffset={CIRCUMFERENCE}
      />
    </svg>
  {:else}
    ✓
  {/if}
</button>
```

**Key Concepts:**
- Chained spring animations
- SVG `stroke-dashoffset` for progress
- Error recovery with velocity catching
- Multi-state management

---

## Common Patterns

### Parallax Scroll

```ts
import { aerostat } from 'aerostat';

let lastScroll = 0;
let controller;

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
      element.style.transform = `translateY(${v * 0.3}px)`;
    }
  });
});
```

### Drag with Spring Release

```ts
let position = 0;
let isDragging = false;

element.addEventListener('pointerdown', (e) => {
  isDragging = true;
  controller?.stop();
});

element.addEventListener('pointermove', (e) => {
  if (isDragging) {
    position = e.clientX;
    element.style.transform = `translateX(${position}px)`;
  }
});

element.addEventListener('pointerup', () => {
  isDragging = false;
  
  // Spring back to 0
  controller = aerostat({
    from: position,
    to: 0,
    stiffness: 200,
    damping: 15,
    onUpdate: (v) => {
      position = v;
      element.style.transform = `translateX(${v}px)`;
    }
  });
});
```

### Number Counter

```ts
function animateCounter(target: number) {
  let current = parseInt(element.textContent);
  
  aerostat({
    from: current,
    to: target,
    stiffness: 100,
    damping: 10,
    onUpdate: (v) => {
      element.textContent = Math.round(v).toString();
    }
  });
}
```

### Modal Scale In

```ts
aerostat({
  from: 0.9,
  to: 1,
  stiffness: 300,
  damping: 20,
  onUpdate: (v) => {
    modal.style.transform = `scale(${v})`;
    modal.style.opacity = (v - 0.9) * 10; // 0.9→1 maps to 0→1
  }
});
```

### Notification Slide

```ts
aerostat({
  from: -100,
  to: 0,
  stiffness: 250,
  damping: 18,
  onUpdate: (v) => {
    notification.style.transform = `translateY(${v}%)`;
  }
});
```

### Tab Indicator

```ts
function moveIndicator(index: number) {
  const tab = tabs[index];
  const left = tab.offsetLeft;
  const width = tab.offsetWidth;
  
  controller?.stop();
  
  controller = aerostat({
    from: indicator.offsetLeft,
    to: left,
    stiffness: 300,
    damping: 25,
    onUpdate: (v) => {
      indicator.style.transform = `translateX(${v}px)`;
    }
  });
  
  // Animate width separately
  aerostat({
    from: indicator.offsetWidth,
    to: width,
    stiffness: 300,
    damping: 25,
    onUpdate: (v) => {
      indicator.style.width = `${v}px`;
    }
  });
}
```

### Page Transition

```ts
// Fade out current page
aerostat({
  from: 1,
  to: 0,
  type: 'duration',
  duration: 200,
  onUpdate: (v) => {
    currentPage.style.opacity = v;
  },
  onComplete: () => {
    currentPage.style.display = 'none';
    nextPage.style.display = 'block';
    
    // Fade in next page
    aerostat({
      from: 0,
      to: 1,
      type: 'duration',
      duration: 200,
      onUpdate: (v) => {
        nextPage.style.opacity = v;
      }
    });
  }
});
```

---

## Performance Checklist

- ✅ Use `transform` and `opacity` (GPU-accelerated)
- ✅ Direct DOM updates in `onUpdate` (skip reactivity)
- ✅ `will-change: transform` on animated elements
- ✅ Cleanup controllers on unmount
- ✅ Use `scaleX` instead of `width` for progress bars
- ✅ Batch style updates when possible
- ✅ Avoid animating layout properties (`left`, `top`, `width`, `height`)
- ✅ Use `transform: translate()` instead of `left`/`top`

---

## Browser DevTools Tips

### Check Compositing

Chrome DevTools → Rendering → Layer Borders

Green = GPU-accelerated (good!)

### Profile Animations

Performance tab → Record → Look for:
- Layout thrashing (red flags)
- Paint operations (should be minimal)
- Composite layers (should be green)

### Test at 60fps

Enable "Show FPS meter" in Rendering panel.
Aim for steady 60fps during animations.
