import type { NextConfig } from 'next';
import path from 'node:path';
import { surprise2027Source, SURPRISE2027_STUB } from './data2027.mjs';

// The 2027 result file only with NEXT_PUBLIC_DATA=2027 and the file
// present; otherwise a null stub, so the 2028 bundle never carries it
// (review round 4, R4-16; data2027.mjs).
const root = process.cwd();
const src2027 = surprise2027Source(root);
const alias2027 = src2027 ? `./${path.relative(root, src2027)}` : `./${SURPRISE2027_STUB}`;

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack does not silently pick up a stray
  // lockfile from a parent directory during local development or CI.
  turbopack: {
    root,
    resolveAlias: { 'ugai-surprise2027': alias2027 },
  },
  webpack: (config) => {
    config.resolve.alias = { ...config.resolve.alias, 'ugai-surprise2027': path.resolve(root, alias2027) };
    return config;
  },
};

export default nextConfig;
