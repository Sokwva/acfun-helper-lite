import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

if (process.platform === 'win32' && process.stdout.isTTY) {
  try {
    execFileSync('cmd', ['/c', 'chcp 65001'], { stdio: 'ignore' });
  } catch {
    // 无法切换控制台代码页时忽略，不影响服务本身。
  }
}

const root = dirname(fileURLToPath(import.meta.url));
const indexPath = join(root, 'index.html');

const args = process.argv.slice(2);
const readArg = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? fallback : (args[index + 1] ?? fallback);
};

const PORT = Number(readArg('port', process.env.PORT ?? '12451')) || 12451;
const HOST = readArg('host', process.env.HOST ?? '0.0.0.0');
const HISTORY_LIMIT = 100;
const MAX_BODY = 256 * 1024;

/** @type {Set<import('node:http').ServerResponse>} */
const clients = new Set();
/** @type {unknown[]} */
const history = [];
let currentRoom = '';

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(value));
}

function writeEvent(res, event, payload) {
  return res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function broadcast(event, payload) {
  for (const client of clients) {
    try {
      writeEvent(client, event, payload);
    } catch {
      clients.delete(client);
    }
  }
}

function normalizeMessages(input) {
  const list = Array.isArray(input) ? input : [input];
  const messages = [];

  for (const item of list) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const nickname = typeof item.nickname === 'string' ? item.nickname : '';
    const content = typeof item.content === 'string' ? item.content : '';

    if (!nickname && !content) {
      continue;
    }

    messages.push({
      id:
        typeof item.id === 'string'
          ? item.id
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: typeof item.type === 'string' ? item.type : 'other',
      nickname,
      content,
      medal: typeof item.medal === 'string' ? item.medal : undefined,
      timestamp: Number.isFinite(item.timestamp) ? item.timestamp : Date.now(),
    });
  }

  return messages;
}

function handlePush(req, res) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { ok: false, error: 'method not allowed' });
    return;
  }

  let size = 0;
  const chunks = [];

  req.on('data', (chunk) => {
    size += chunk.length;
    if (size > MAX_BODY) {
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });

  req.on('end', () => {
    let payload;

    try {
      payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      sendJson(res, 400, { ok: false, error: 'invalid json' });
      return;
    }

    if (payload && typeof payload.room === 'string' && payload.room) {
      if (payload.room !== currentRoom) {
        history.length = 0;
      }
      currentRoom = payload.room;
    }

    const messages = normalizeMessages(payload?.messages ?? payload);

    for (const message of messages) {
      history.push(message);
      if (history.length > HISTORY_LIMIT) {
        history.shift();
      }
    }

    if (messages.length > 0) {
      broadcast('danmaku', { room: currentRoom, messages });
    }

    sendJson(res, 200, {
      ok: true,
      received: messages.length,
      clients: clients.size,
    });
  });

  req.on('error', () => {
    clients.delete(res);
  });
}

function handleEvents(req, res) {
  applyCors(res);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(': connected\n\n');
  clients.add(res);

  if (history.length > 0) {
    writeEvent(res, 'history', { room: currentRoom, messages: history });
  }

  const cleanup = () => {
    clearInterval(keepAlive);
    clients.delete(res);
  };

  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      cleanup();
    }
  }, 15000);

  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('error', cleanup);
}

async function handleIndex(res) {
  try {
    const html = await readFile(indexPath);
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    });
    res.end(html);
  } catch {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('index.html not found');
  }
}

function lanAddresses() {
  const addresses = [];

  for (const list of Object.values(networkInterfaces())) {
    for (const item of list ?? []) {
      if ((item.family === 'IPv4' || item.family === 4) && !item.internal) {
        addresses.push(item.address);
      }
    }
  }

  return addresses;
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

  if (url.pathname === '/push') {
    handlePush(req, res);
    return;
  }

  if (url.pathname === '/events') {
    handleEvents(req, res);
    return;
  }

  if (url.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      clients: clients.size,
      history: history.length,
      room: currentRoom,
    });
    return;
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    void handleIndex(res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

server.listen(PORT, HOST, () => {
  console.log('');
  console.log('AcFun Helper 直播弹幕中转服务已启动');
  console.log(`本机访问:   http://127.0.0.1:${PORT}`);
  for (const address of lanAddresses()) {
    console.log(`局域网访问: http://${address}:${PORT}`);
  }
  console.log('');
  console.log('平板和电脑连同一个 Wi-Fi，用上面的局域网地址打开即可。');
  console.log('按 Ctrl+C 停止。');
  console.log('');
});

server.on('error', (error) => {
  console.error('中转服务启动失败:', error);
  process.exit(1);
});
