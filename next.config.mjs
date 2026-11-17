/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
    outputFileTracingIncludes: {
      '/api/**/*': ['./prisma/dev.db'],
    },
  },
};

export default nextConfig;

