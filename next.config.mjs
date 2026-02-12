/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize PGlite so Next.js doesn't bundle its WASM binaries
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
