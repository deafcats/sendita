import type { NextConfig } from 'next';
import path from 'path';

const allowedOrigins = (process.env['CORS_ALLOWED_ORIGINS'] ?? 'http://localhost:3000').split(',');

const corsHeaders = [
  { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PATCH,PUT,DELETE,OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
  { key: 'Access-Control-Allow-Credentials', value: 'true' },
  { key: 'Access-Control-Max-Age', value: '86400' },
];

const nextConfig: NextConfig = {
  typescript: {
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
  async headers() {
    return allowedOrigins.map((origin) => ({
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: origin },
        ...corsHeaders,
      ],
    }));
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
