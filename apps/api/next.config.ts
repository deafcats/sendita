import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  typescript: {
    // Type checking runs separately via tsc --noEmit in CI
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['ioredis', 'bullmq', 'bcryptjs'],
  transpilePackages: ['@anon-inbox/shared', '@anon-inbox/db', '@anon-inbox/queue'],
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env['npm_package_version'] ?? '1.0.0',
  },
  webpack(config) {
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias as Record<string, string>),
      '@': path.resolve(__dirname, 'src'),
    };
    return config;
  },
};

export default nextConfig;
