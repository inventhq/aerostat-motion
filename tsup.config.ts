import { defineConfig } from 'tsup';

export default defineConfig([
  // Core and framework adapters (with types)
  {
    entry: {
      index: 'src/index.ts',
      'core/index': 'src/core/index.ts',
      svelte: 'src/svelte.ts',
      react: 'src/react.ts',
      solid: 'src/solid.ts',
    },
    format: ['esm'],
    clean: true,
    minify: true,
    dts: true,
    sourcemap: true,
    treeshake: true,
    target: 'es2020',
    splitting: true,
    external: ['svelte', 'react', 'solid-js'],
  },
  // UI Svelte components
  {
    entry: {
      'ui/svelte/index': 'src/ui/svelte/index.ts',
    },
    format: ['esm'],
    minify: true,
    dts: true,
    sourcemap: true,
    treeshake: true,
    target: 'es2020',
    splitting: true,
    external: ['svelte', 'react', 'solid-js'],
  },
]);
