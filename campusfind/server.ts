import express from 'express';
import { createServer as createViteServer } from 'vite';
import { spawn, execSync, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 3000;
const C_BACKEND_PORT = Number(process.env.CAMPUSFIND_PORT || 8080);
const C_BACKEND_DIR = path.resolve(process.cwd(), 'CampusFind', 'backend');
const C_DATA_DIR = path.resolve(process.cwd(), 'CampusFind', 'data');
const C_BINARY_PATH = path.join(
  C_BACKEND_DIR,
  process.platform === 'win32' ? 'campusfind_server.exe' : 'campusfind_server'
);

let cProcess: ChildProcess | null = null;

function ensureCBackendBuilt(): void {
  if (!fs.existsSync(C_DATA_DIR)) {
    fs.mkdirSync(C_DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(C_BINARY_PATH)) {
    console.log('Compiling CampusFind C backend...');
    execSync('make', { cwd: C_BACKEND_DIR, stdio: 'inherit' });
  }
}

function startCBackend(): Promise<void> {
  ensureCBackendBuilt();

  return new Promise((resolve) => {
    const child = spawn(C_BINARY_PATH, [C_DATA_DIR], {
      cwd: C_BACKEND_DIR,
      env: {
        ...process.env,
        CAMPUSFIND_PORT: String(C_BACKEND_PORT),
        CAMPUSFIND_DATA_DIR: C_DATA_DIR,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    cProcess = child;

    child.stdout?.on('data', (chunk: Buffer) => {
      process.stdout.write(`[C-Backend] ${chunk.toString()}`);
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      process.stderr.write(`[C-Backend] ${chunk.toString()}`);
    });

    child.on('exit', (code) => {
      console.error(`CampusFind C backend exited with code ${code}.`);
      cProcess = null;
    });

    // Wait briefly until C TCP socket is accepting connections
    let attempts = 0;
    const poll = () => {
      attempts++;
      const req = http.get(`http://127.0.0.1:${C_BACKEND_PORT}/api/health`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (attempts < 25) {
          setTimeout(poll, 100);
        } else {
          resolve();
        }
      });
    };
    setTimeout(poll, 80);
  });
}

function proxyToCBackend(req: express.Request, res: express.Response): void {
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const bodyBuf = Buffer.concat(chunks);
    const headers: Record<string, string> = {};
    if (req.headers['content-type']) {
      headers['Content-Type'] = String(req.headers['content-type']);
    }
    if (req.headers['authorization']) {
      headers['Authorization'] = String(req.headers['authorization']);
    }
    if (bodyBuf.length > 0) {
      headers['Content-Length'] = String(bodyBuf.length);
    }

    const proxyReq = http.request(
      {
        hostname: '127.0.0.1',
        port: C_BACKEND_PORT,
        path: req.originalUrl,
        method: req.method,
        headers,
      },
      (proxyRes) => {
        const resChunks: Buffer[] = [];
        proxyRes.on('data', (c: Buffer) => resChunks.push(c));
        proxyRes.on('end', () => {
          const payload = Buffer.concat(resChunks);
          res.status(proxyRes.statusCode || 500);
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.send(payload);
        });
      }
    );

    proxyReq.on('error', (err) => {
      res.status(502).json({
        error: 'CampusFind C backend is unavailable.',
        detail: err.message,
      });
    });

    if (bodyBuf.length > 0) {
      proxyReq.write(bodyBuf);
    }
    proxyReq.end();
  });
}

async function main() {
  await startCBackend();

  const app = express();

  // Forward every /api/* route directly to the compiled C HTTP backend
  app.use('/api', proxyToCBackend);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusFind web server listening on http://localhost:${PORT}`);
  });

  const shutdown = () => {
    if (cProcess) {
      cProcess.kill('SIGTERM');
    }
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
