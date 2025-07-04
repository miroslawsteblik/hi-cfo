import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',

  // API proxy configuration
  async rewrites() {
    const apiUrl = process.env.NODE_ENV === 'production'
      ? 'https://backend:8080'  // docker-compose service URL
      : 'http://localhost:8080' // local development URL
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      // Additional routes if needed
      {
        source: '/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
    ]
  },

  // CORS headers for development
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },

  // Enable TypeScript strict mode
  typescript: {
    ignoreBuildErrors: false,
  },


}

export default nextConfig