import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { surprise2027Source, SURPRISE2027_STUB } from './data2027.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
// The 2027 file only with the flag on and the file present (R4-16). With
// the flag on and no file, the 2027 run is skipped, not failed.
const src2027 = surprise2027Source(root);
const skip2027 = ['', '2027'].includes(String(process.env.NEXT_PUBLIC_DATA ?? '')) && !src2027;
if (skip2027) console.warn('The 2027 set is active but no surprise2027.json is found (set UGAI_SURPRISE2027): the run is skipped.');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'ugai-surprise2027': src2027 ?? path.join(root, SURPRISE2027_STUB),
      // always the real 2028 files in tests (dashboard review D8)
      'ugai-surprise2028': path.join(root, 'src/data/surprise2028.json'),
      'ugai-cohorts2028': path.join(root, 'src/data/cohorts2028.json'),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // heavy render tests near 5 s on a loaded machine; CI now runs the suite
  test: { environment: 'jsdom', testTimeout: 15000, include: skip2027 ? [] : ['src/**/*.test.{js,jsx}'], passWithNoTests: skip2027 },
});
