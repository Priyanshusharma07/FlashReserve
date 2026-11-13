import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@flashreserve/shared-types'],
};

export default nextConfig;

