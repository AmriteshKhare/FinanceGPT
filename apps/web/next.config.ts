import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@gpt-finance/shared'],
  async rewrites() {
    const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';
    return [
      {
        source: '/v1/:path*',
        destination: `${apiOrigin}/v1/:path*`,
      },
      {
        source: '/health',
        destination: `${apiOrigin}/health`,
      },
      {
        source: '/ready',
        destination: `${apiOrigin}/ready`,
      },
      {
        source: '/docs',
        destination: `${apiOrigin}/docs`,
      },
      {
        source: '/docs/:path*',
        destination: `${apiOrigin}/docs/:path*`,
      },
    ];
  },
};

export default nextConfig;
