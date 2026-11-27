import type { NextConfig } from 'next';
import path from 'node:path';
import { surprise2027Source, SURPRISE2027_STUB, data2028Aliases } from './data2027.mjs';

// The 2027 result file only with NEXT_PUBLIC_DATA=2027 and the file
// present; otherwise a null stub, so the 2028 bundle never carries it
// (review round 4, R4-16; data2027.mjs).
const root = process.cwd();
const src2027 = surprise2027Source(root);
const alias2027 = src2027 ? `./${path.relative(root, src2027)}` : `./${SURPRISE2027_STUB}`;
// and the 2028 files only in the 2028 build (dashboard review D8)
const alias2028 = data2028Aliases();

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack does not silently pick up a stray
  // lockfile from a parent directory during local development or CI.
  turbopack: {
    root,
    resolveAlias: { 'ugai-surprise2027': alias2027, ...alias2028 },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'ugai-surprise2027': path.resolve(root, alias2027),
      ...Object.fromEntries(Object.entries(alias2028).map(([k, v]) => [k, path.resolve(root, v)])),
    };
    return config;
  },
};

export default nextConfig;
