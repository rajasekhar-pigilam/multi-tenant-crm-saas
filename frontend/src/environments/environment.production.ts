// Production environment — served on Vercel where /api/* is handled by the
// NestJS serverless function on the same domain (no CORS required).
export const environment = {
  production: true,
  apiBaseUrl: '/api'
};
