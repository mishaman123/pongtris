import type {NextConfig} from 'next';

// Get the repository name from the environment or default to your repo name
const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] || 'pongtris';
const basePath = process.env.NODE_ENV === 'production' ? `/${repo}` : '';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
  output: 'export',
  basePath,
  trailingSlash: true,
};

export default nextConfig;
