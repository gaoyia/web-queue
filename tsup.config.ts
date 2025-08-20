import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  target: 'es2018',
  minify: false,
  shims: true,
  // 确保浏览器和Node.js兼容性
  platform: 'neutral',
  // 确保导出的包可以在浏览器和Node.js中使用
  env: {
    NODE_ENV: 'production',
  },
});