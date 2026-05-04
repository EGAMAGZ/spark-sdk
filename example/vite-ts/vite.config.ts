import { defineConfig } from 'vite';
import { spark } from '../../packages/plugin/mod.ts';

export default defineConfig({
  plugins: [
    spark(),
  ],
});
