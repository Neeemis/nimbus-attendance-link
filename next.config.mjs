/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfkit'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./node_modules/pdfkit/js/data/*.afm'],
  },
};

export default nextConfig;
