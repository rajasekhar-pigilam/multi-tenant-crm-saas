#!/usr/bin/env node
/**
 * Builds the Vercel Build Output API v3 structure under .vercel/output/.
 *
 * Layout produced:
 *   .vercel/output/config.json               – routing rules
 *   .vercel/output/static/**                 – Angular SPA (served from CDN)
 *   .vercel/output/functions/
 *     api/[...path].func/index.js            – NestJS Lambda (bundled with ncc)
 *     api/[...path].func/atlas               – Atlas CLI binary (Linux amd64)
 *     api/[...path].func/atlas/tenant/       – Tenant migration SQL files
 *     api/[...path].func/.vc-config.json
 *
 * The Atlas binary + migration files allow TenantSchemaInitializerService to
 * run `atlas migrate apply` inside the Lambda when a new tenant is provisioned.
 *
 * References:
 *   https://vercel.com/docs/build-output-api/v3
 *   https://vercel.com/docs/build-output-api/v3/primitives#serverless-functions
 *   https://atlasgo.io/docs/getting-started
 */
'use strict';

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const https = require('https');

const ROOT       = path.resolve(__dirname, '..');
const OUT        = path.join(ROOT, '.vercel', 'output');
const FUNC_DIR   = path.join(OUT, 'functions', 'api', '[...path].func');
const STATIC_DIR = path.join(OUT, 'static');

// ── Helpers ───────────────────────────────────────────────────────────────────

function rm(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`❌  Source not found: ${src}`);
    process.exit(1);
  }
  mkdirp(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

/** Download a URL to a local file, following redirects. */
function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (u) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close();
          fs.truncateSync(dest, 0);
          const ws = fs.createWriteStream(dest);
          ws.on('finish', resolve);
          ws.on('error', reject);
          https.get(res.headers.location, (r) => {
            r.pipe(ws);
            r.on('error', reject);
          }).on('error', reject);
        } else if (res.statusCode === 200) {
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(); });
          file.on('error', reject);
          res.on('error', reject);
        } else {
          reject(new Error(`HTTP ${res.statusCode} fetching ${u}`));
        }
      }).on('error', reject);
    };
    request(url);
  });
}

// ── 1. Clean previous output ──────────────────────────────────────────────────

console.log('🗑   Cleaning .vercel/output …');
rm(OUT);
mkdirp(FUNC_DIR);
mkdirp(STATIC_DIR);

// ── 2. Routing config ─────────────────────────────────────────────────────────

console.log('📋  Writing config.json …');
fs.writeFileSync(
  path.join(OUT, 'config.json'),
  JSON.stringify(
    {
      version: 3,
      routes: [
        // All /api/* requests → NestJS Lambda
        { src: '/api/(.*)', dest: '/api/[...path]' },
        // Serve Angular static files; fall through if not found
        { handle: 'filesystem' },
        // SPA fallback — every unknown path serves index.html
        { src: '/(.*)', dest: '/index.html' }
      ]
    },
    null,
    2
  )
);

// ── 3. Angular static files ───────────────────────────────────────────────────

const NG_DIST = path.join(ROOT, 'frontend', 'dist', 'frontend', 'browser');
console.log('📦  Copying Angular static files …');
copyDir(NG_DIST, STATIC_DIR);
console.log(`    ✓ ${fs.readdirSync(STATIC_DIR).length} entries`);

// ── 4. Bundle NestJS with ncc ─────────────────────────────────────────────────

const VERCEL_ENTRY = path.join(ROOT, 'backend', 'dist', 'src', 'vercel.js');
if (!fs.existsSync(VERCEL_ENTRY)) {
  console.error('❌  backend/dist/src/vercel.js not found – run nest build first');
  process.exit(1);
}

console.log('🔨  Bundling NestJS Lambda with @vercel/ncc …');
execSync(
  `npx --yes @vercel/ncc build "${VERCEL_ENTRY}" --out "${FUNC_DIR}" --quiet`,
  { stdio: 'inherit', cwd: ROOT }
);
console.log('    ✓ Lambda bundled');

// ── 5. Bundle Atlas CLI binary for tenant schema migrations ───────────────────
//
// TenantSchemaInitializerService calls `atlas migrate apply` at runtime.
// The Lambda needs the Atlas binary to be present in its function directory.
// We download the Linux amd64 binary during the Vercel build so it ships
// with the deployment.  The binary is placed at <func-dir>/atlas so that
// path.join(__dirname, 'atlas') resolves correctly inside the Lambda.

(async () => {
  const atlasDest = path.join(FUNC_DIR, 'atlas');

  console.log('⬇️   Downloading Atlas CLI binary (linux/amd64) …');
  const ATLAS_URL =
    'https://release.ariga.io/atlas/atlas-community-linux-amd64-latest';

  try {
    await download(ATLAS_URL, atlasDest);
    fs.chmodSync(atlasDest, 0o755);  // mark executable before Vercel zips it
    const size = (fs.statSync(atlasDest).size / 1_048_576).toFixed(1);
    console.log(`    ✓ Atlas binary downloaded (${size} MB)`);
  } catch (err) {
    console.warn(`⚠️   Atlas download failed: ${err.message}`);
    console.warn('    Tenant provisioning will require Atlas on PATH at runtime.');
  }

  // ── 6. Copy Atlas tenant migration files into the Lambda ───────────────────
  //
  // TenantSchemaInitializerService looks for migrations at:
  //   path.join(__dirname, 'atlas', 'tenant')
  // i.e. <func-dir>/atlas/tenant/  — we copy there now.

  const ATLAS_TENANT_SRC  = path.join(ROOT, 'atlas', 'tenant');
  const ATLAS_TENANT_DEST = path.join(FUNC_DIR, 'atlas', 'tenant');

  console.log('📂  Copying Atlas tenant migrations into Lambda …');
  copyDir(ATLAS_TENANT_SRC, ATLAS_TENANT_DEST);
  console.log(`    ✓ ${fs.readdirSync(ATLAS_TENANT_DEST).length} files`);

  // ── 7. Function runtime config ─────────────────────────────────────────────

  fs.writeFileSync(
    path.join(FUNC_DIR, '.vc-config.json'),
    JSON.stringify(
      {
        runtime: 'nodejs20.x',
        handler: 'index.js',
        launcherType: 'Nodejs',
        maxDuration: 60
      },
      null,
      2
    )
  );

  console.log('✅  .vercel/output ready');
})().catch((err) => {
  console.error('❌  prepare-vercel-output failed:', err);
  process.exit(1);
});
