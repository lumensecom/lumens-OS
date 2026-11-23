/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/tower/production": ["./docs/landing/plantillas/simple-*.liquid", "./lib/production/demo/*.webp"],
    },
  },
}

export default nextConfig
