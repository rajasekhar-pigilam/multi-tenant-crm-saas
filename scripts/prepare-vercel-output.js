#!/usr/bin/env node
/**
 * Builds the Vercel Build Output API v3 structure under .vercel/output/.
 *
 * Layout produced:
 *   .vercel/output/config.json          – routing rules
 *   .vercel/output/static/**            – Angular SPA (served from CDN)
 *   .vercel/output/functions/
 *     api/[...path].func/index.js       – NestJS Lambda (bundled with ncc)
 *     api/[...path].func/.vc-config.json
 *
 * References:
 *   https://vercel.com/docs/build-output-api/v3
 *   https://vercel.com/docs/build-output-api/v3/primitives#serverless-functions
 */
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, '.vercel', 'output');
const FUNC_DIR = path.join(OUT, 'functions', 'api', '[...path].func');
const STATIC_DIR = path.join(OUT, 'static');

// ── helpers ──────────────────────────────────────────────────────────────────

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
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// ── 1. Clean previous output ─────────────────────────────────────────────────

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
        // Serve Angular static files; if not found fall through
        { handle: 'filesystem' },
        // SPA fallback – every unknown path serves index.html
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

// ── 5. Function runtime config ────────────────────────────────────────────────

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
