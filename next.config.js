/** @type {import('next').NextConfig} */
const nextConfig = {
  // App Router is enabled by default in Next.js 13+
  
  // Optimize bundle splitting for better performance
  experimental: {
    // Enable optimized package imports for better tree shaking
    optimizePackageImports: [
      '@/components/forms',
      '@/components/shared',
      '@/components/ui',
      'lucide-react',
      'date-fns'
    ],
  },
  
  // Webpack optimizations for auth components
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Create separate chunks for auth forms to enable lazy loading
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Auth forms chunk
          authForms: {
            name: 'auth-forms',
            test: /[\\/]src[\\/]components[\\/]forms[\\/](login-form|register-form|reset-password|verify-email)/,
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Workspace forms chunk
          workspaceForms: {
            name: 'workspace-forms',
            test: /[\\/]src[\\/]components[\\/]forms[\\/](workspace-creation|invite-member)/,
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Shared components chunk
          sharedComponents: {
            name: 'shared-components',
            test: /[\\/]src[\\/]components[\\/]shared[\\/]/,
            chunks: 'all',
            priority: 20,
            reuseExistingChunk: true,
          },
        },
      }
    }
    
    return config
  },
}

module.exports = nextConfig