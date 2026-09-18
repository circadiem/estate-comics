/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  experimental: {
    // The PDF renderer reads the brand TrueType files from disk at runtime.
    // Include them in the serverless bundle for the two routes that render.
    outputFileTracingIncludes: {
      '/api/submit': ['./lib/pdf/fonts/**/*'],
      '/api/generate-report': ['./lib/pdf/fonts/**/*'],
    },
  },
};

export default nextConfig;
