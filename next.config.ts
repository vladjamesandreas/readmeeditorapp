import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'uhbhoacsiapasvxjauyk.supabase.co',
        port: '',
        pathname: '**',
      },
    ],
  },
};

export default nextConfig;
