// Vercel catch-all serverless function — forwards every /api/* request to the
// pre-compiled NestJS Express adapter.  `nest build` must run before this is
// invoked (handled by the vercel.json buildCommand).
module.exports = require('../backend/dist/src/vercel');
