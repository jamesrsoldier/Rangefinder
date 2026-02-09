/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    // Externalize PGlite so Next.js doesn't bundle its WASM binaries
    serverComponentsExternalPackages: ['@electric-sql/pglite'],
  },
};

export default nextConfig;
