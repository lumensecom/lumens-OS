/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/torre/agentes/\\[code\\]": ["./docs/landing/agente-3b.md"],
      "/api/tower/production": ["./docs/landing/plantillas/*.liquid", "./lib/production/{demo,milan}/*.webp"],
    },
  },
}

export default nextConfig
