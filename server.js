const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { URL } = require('url');

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

// संवेदनशील और आंतरिक सर्वर फ़ाइलों की सूची जिन्हें कभी भी ब्राउज़र पर सार्वजनिक रूप से सर्व नहीं किया जाएगा
const BLOCKED_FILES = new Set([
  '/server.js',
  '/server.py',
  '/package.json',
  '/bun.lock',
  '/firestore.rules',
  '/firestore.rules.test.ts',
  '/firebase-blueprint.json',
  '/security_spec.md',
  '/eslint.config.mjs',
  '/open_tool.sh',
  '/.env',
  '/.env.local',
  '/.env.example',
  '/.gitignore'
]);

function isAllowedWikiProxyTarget(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host.endsWith('.wikipedia.org') ||
      host === 'wikipedia.org' ||
      host.endsWith('.wikimedia.org') ||
      host.endsWith('.wiktionary.org')
    );
  } catch (e) {
    return false;
  }
}

const server = http.createServer((req, res) => {
  // सुरक्षा हेडर्स (Security Hardening Headers)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Method Not Allowed');
    return;
  }

  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  // केवल वैध विकिमीडिया डोमेन के लिए सुरक्षित प्रॉक्सी (SSRF सुरक्षा सहित)
  if (parsedUrl.pathname.startsWith('/api/wiki-proxy')) {
    const targetUrl = parsedUrl.searchParams.get('url');
    if (!targetUrl || !isAllowedWikiProxyTarget(targetUrl)) {
      res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Forbidden: Only official Wikimedia HTTPS endpoints are permitted.' }));
      return;
    }

    https.get(
      targetUrl,
      {
        headers: {
          'User-Agent': 'WikiLinkAssistant/2.5'
        }
      },
      (proxyRes) => {
        let rawData = '';
        proxyRes.setEncoding('utf8');
        proxyRes.on('data', (chunk) => { rawData += chunk; });
        proxyRes.on('end', () => {
          res.writeHead(proxyRes.statusCode || 200, {
            'Content-Type': 'application/json; charset=utf-8'
          });
          res.end(rawData);
        });
      }
    ).on('error', () => {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Upstream Wikimedia request failed' }));
    });
    return;
  }

  const ROUTE_MAP = {
    '/': '/index.html',
    '/index.html': '/index.html',
    '/workbench': '/index.html',
    '/login': '/login.html',
    '/login.html': '/login.html',
    '/logs': '/logs.html',
    '/logs.html': '/logs.html',
    '/profile': '/logs.html',
    '/profile.html': '/logs.html',
    '/about': '/about.html',
    '/about.html': '/about.html'
  };

  let reqPath = ROUTE_MAP[parsedUrl.pathname] || parsedUrl.pathname;
  const normalizedPathname = reqPath.toLowerCase();

  // डॉट-फ़ाइलों (.git, .env, .agents, .aistudio) और आंतरिक सर्वर फ़ाइलों तक पहुँच प्रतिबंधित करें
  if (
    BLOCKED_FILES.has(normalizedPathname) ||
    normalizedPathname.startsWith('/.') ||
    normalizedPathname.includes('/.')
  ) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  const safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    const sendCompressedResponse = (statusCode, contentType, buffer, isVersionedAsset = false) => {
      const headers = {
        'Content-Type': contentType,
        'Vary': 'Accept-Encoding',
        'Cache-Control': isVersionedAsset
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=0, must-revalidate'
      };
      const acceptEncoding = String(req.headers['accept-encoding'] || '');
      const isCompressible = /^(text\/|application\/(javascript|json|manifest\+json)|image\/svg\+xml)/.test(contentType);

      if (isCompressible && buffer.length > 512) {
        if (acceptEncoding.includes('br') && typeof zlib.brotliCompress === 'function') {
          zlib.brotliCompress(buffer, (brErr, compressed) => {
            if (!brErr && compressed) {
              headers['Content-Encoding'] = 'br';
              res.writeHead(statusCode, headers);
              res.end(compressed);
            } else {
              res.writeHead(statusCode, headers);
              res.end(buffer);
            }
          });
          return;
        }
        if (acceptEncoding.includes('gzip')) {
          zlib.gzip(buffer, (gzErr, compressed) => {
            if (!gzErr && compressed) {
              headers['Content-Encoding'] = 'gzip';
              res.writeHead(statusCode, headers);
              res.end(compressed);
            } else {
              res.writeHead(statusCode, headers);
              res.end(buffer);
            }
          });
          return;
        }
      }
      res.writeHead(statusCode, headers);
      res.end(buffer);
    };

    if (err || !stats.isFile()) {
      const indexFallback = path.join(ROOT_DIR, 'index.html');
      fs.readFile(indexFallback, (readErr, content) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
          return;
        }
        sendCompressedResponse(200, 'text/html; charset=utf-8', content, false);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const hasVersionQuery = parsedUrl.searchParams.has('v') && ext !== '.html' && !filePath.endsWith('sw.js');
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }
      sendCompressedResponse(200, contentType, content, hasVersionQuery);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`WikiLink Assistant server running at http://${HOST}:${PORT}`);
});
