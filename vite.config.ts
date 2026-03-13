import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
  pack: {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    outDir: 'dist',
    clean: true,
  },
  staged: {
    '*': 'vp check --fix',
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 80,
    tabWidth: 2,
  },
});
