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
  // Images config for static export
  output: 'export',
  basePath,
  trailingSlash: true,
  // Image optimization must be turned off for static exports
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
