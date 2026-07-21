/** @type {import('next').NextConfig} */
const nextConfig = {
  // API proxy is handled at runtime by src/app/api/[...path]/route.ts
  // so BACKEND_URL is read on each request (not only at build time).
};

module.exports = nextConfig;
