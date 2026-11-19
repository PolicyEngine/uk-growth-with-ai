import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { surprise2027Source, SURPRISE2027_STUB } from './data2027.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
// The 2027 file only with the flag on and the file present (R4-16). With
// the flag on and no file, the 2027 run is skipped, not failed.
const src2027 = surprise2027Source(root);
const skip2027 = process.env.NEXT_PUBLIC_DATA === '2027' && !src2027;
if (skip2027) console.warn('NEXT_PUBLIC_DATA=2027 but no surprise2027.json (set UGAI_SURPRISE2027): the 2027 run is skipped.');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'ugai-surprise2027': src2027 ?? path.join(root, SURPRISE2027_STUB),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: { environment: 'jsdom', include: skip2027 ? [] : ['src/**/*.test.{js,jsx}'], passWithNoTests: skip2027 },
});
