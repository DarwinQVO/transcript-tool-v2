/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ytdl-core']
  }
}

module.exports = nextConfig