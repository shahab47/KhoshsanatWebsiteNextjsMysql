/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '45.149.78.107',
        port: '9000',
        pathname: '/khoshsanat-media/**',
      },
      // اگر روی لوکال هم اجرا می‌کنید، این مورد هم بماند
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '9000',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;