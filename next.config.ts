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
  async rewrites() {
    return {
      // La landing (Vite, compilada en public/landing) es la portada.
      beforeFiles: [
        { source: '/', destination: '/landing/index.html', missing: [{ type: 'query', key: 'embed' }] },
      ],
    };
  },
  async redirects() {
    return [
      // Embeds antiguos que apuntaban a la raíz (?embed=widget|full) → demo
      { source: '/', has: [{ type: 'query', key: 'embed' }], destination: '/demo', permanent: false },
      // Entrada única
      { source: '/login', destination: '/acceso', permanent: false },
      // Panel único: todo bajo /administracion
      { source: '/panel', destination: '/administracion/dashboard', permanent: false },
      { source: '/panel/:path*', destination: '/administracion/:path*', permanent: false },
    ];
  },
};

export default nextConfig;
