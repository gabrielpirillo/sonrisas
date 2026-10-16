import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  output: "standalone",
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  async redirects() {
    return [
      // Entrada única
      { source: '/login', destination: '/acceso', permanent: false },
      // Panel único: todo bajo /administracion
      { source: '/panel', destination: '/administracion/dashboard', permanent: false },
      { source: '/panel/:path*', destination: '/administracion/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
