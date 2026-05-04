import { defineConfig } from 'vite';
import { spark } from '@spark-sdk/vite-plugin';

export default defineConfig({
  plugins: [
    spark(),
  ],
});
