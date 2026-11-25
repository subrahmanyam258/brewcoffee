/**
 * 3BB Demo Lite — local scenario launcher (demo only, not product code).
 *
 * Zero-dependency Node server that serves the scenario UI and a generated
 * /config.js built from the local .env file. The browser loads the Web SDK
 * from the platform itself (<ENDPOINT>/api/sdk/embed/script), so the SDK always
 * matches the runtime it talks to, and the page talks to the platform directly
 * with the project's PUBLIC SDK key (pk_…). The key's allowed origins must
 * include http://localhost:5199 and http://127.0.0.1:5199.
 *
 * Run:  node demos/3bb-demo-lite/server.mjs   →   http://localhost:5199
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize, sep } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5199);
// Locally the server only listens on loopback. On a host that sets PORT (Render), it listens on all interfaces.
const HOST = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

function loadEnv() {
  const file = join(HERE, '.env');
  const env = {};
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  }
  // deploy-config.json (committed, public values only) pins this copy to its platform environment.
  let pinned = {};
  const pinFile = join(HERE, 'deploy-config.json');
  if (existsSync(pinFile)) {
    try { pinned = JSON.parse(readFileSync(pinFile, 'utf8')); } catch (e) { console.error('deploy-config.json is not valid JSON:', e.message); }
  }
  delete pinned._note;
  return { ...env, ...process.env, ...pinned };
}

const env = loadEnv();
const config = {
  endpoint: (env.ENDPOINT || '').replace(/\/+$/, ''),
  projectId: env.PROJECT_ID || '',
  apiKey: env.SDK_PUBLIC_KEY || '',
  channelId: env.CHANNEL_ID || '',
  // Shows the "Call Ari" browser voice call. Needs a public key and channel with voice enabled.
  voiceCall: /^(1|true|yes|on)$/i.test(String(env.VOICE_CALL || '')),
  // Public softphone share link for a pipeline voice channel (opens in a call window).
  phoneShareUrl: /^https:\/\//.test(env.PHONE_SHARE_URL || '') ? env.PHONE_SHARE_URL : '',
};
const missing = Object.entries(config)
  .filter(([k, v]) => !v && k !== 'channelId' && k !== 'voiceCall' && k !== 'phoneShareUrl')
  .map(([k]) => k);
if (missing.length) {
  console.error(`Missing settings in demos/3bb-demo-lite/.env: ${missing.join(', ')}`);
  console.error('Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (!config.apiKey.startsWith('pk_')) {
  console.error('SDK_PUBLIC_KEY must be a public SDK key (pk_…). Never put a secret key here.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json; charset=utf-8',
};
const PUBLIC = new Set(['/index.html', '/app.js', '/scenarios.js', '/styles.css', '/faqs.js', '/ari.png', '/greet-audio.js']);

createServer(async (req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let path = url.pathname === '/' ? '/index.html' : url.pathname;

  if (path === '/config.js') {
    res.writeHead(200, { 'content-type': TYPES['.js'], 'cache-control': 'no-store' });
    res.end(`window.DEMO_CONFIG = ${JSON.stringify(config)};\n`);
    return;
  }
  if (!PUBLIC.has(path)) {
    res.writeHead(404).end('Not found');
    return;
  }
  const abs = normalize(join(HERE, path));
  if (!abs.startsWith(HERE + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    const data = await readFile(abs);
    res.writeHead(200, { 'content-type': TYPES[extname(abs)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, HOST, () => {
  console.log(`3BB CEO Demo  →  http://localhost:${PORT}`);
  console.log(`Platform      →  ${config.endpoint}  (project ${config.projectId})`);
});
