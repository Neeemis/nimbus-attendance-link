/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfkit'],
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/pdfkit/js/data/*.afm'],
    },
  },
};

export default nextConfig;
