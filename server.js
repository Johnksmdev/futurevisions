import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import http from 'http';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const dataFilePath = path.join(__dirname, 'data', 'messages.json');
const chatDataFilePath = path.join(__dirname, 'data', 'chat-messages.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

async function readMessages() {
  try {
    const data = await fs.readFile(dataFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeMessages(messages) {
  await fs.mkdir(path.dirname(dataFilePath), { recursive: true });
  await fs.writeFile(dataFilePath, JSON.stringify(messages, null, 2));
}

async function readChatMessages() {
  try {
    const data = await fs.readFile(chatDataFilePath, 'utf8');
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeChatMessages(messages) {
  await fs.mkdir(path.dirname(chatDataFilePath), { recursive: true });
  await fs.writeFile(chatDataFilePath, JSON.stringify(messages, null, 2));
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'jj-website-backend' });
});

app.get('/api/stats', async (_req, res, next) => {
  try {
    const messages = await readMessages();
    res.json({
      totalMessages: messages.length,
      latestMessageAt: messages[0]?.createdAt ?? null,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/messages', async (_req, res, next) => {
  try {
    const messages = await readMessages();
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

app.post('/api/messages', async (req, res, next) => {
  try {
    const { name, email, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const messages = await readMessages();
    const entry = {
      id: String(Date.now()),
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    messages.unshift(entry);
    await writeMessages(messages);

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

// --- Live Chat (persistent, WebSocket + REST fallback) ---

app.get('/api/chat/messages', async (_req, res, next) => {
  try {
    const messages = await readChatMessages();
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat/messages', async (req, res, next) => {
  try {
    const { name, message } = req.body;

    if (!name?.trim() || !message?.trim()) {
      return res.status(400).json({ error: 'Name and message are required.' });
    }

    const messages = await readChatMessages();
    const entry = {
      id: String(Date.now()),
      name: name.trim().slice(0, 60),
      message: message.trim().slice(0, 2000),
      createdAt: new Date().toISOString(),
    };

    messages.push(entry);
    await writeChatMessages(messages);
    broadcastChatMessage(entry);

    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
});

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'johnkosmas77';

async function buildDashboardPayload() {
  const messages = await readMessages();
  return {
    status: 'ok',
    service: 'jj-website-backend',
    totalMessages: messages.length,
    latestMessageAt: messages[0]?.createdAt ?? null,
    messages: messages.slice(0, 10),
  };
}

app.get('/api/dashboard', async (req, res, next) => {
  try {
    const provided = String(req.headers['x-dashboard-password'] || '');
    if (provided !== DASHBOARD_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(await buildDashboardPayload());
  } catch (error) {
    next(error);
  }
});

app.post('/api/dashboard', async (req, res, next) => {
  try {
    const provided = String(req.body?.password || req.headers['x-dashboard-password'] || '');
    if (provided !== DASHBOARD_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.json(await buildDashboardPayload());
  } catch (error) {
    next(error);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- WebSocket server for real-time chat ---
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/chat' });

const chatClients = new Set();

wss.on('connection', (ws) => {
  chatClients.add(ws);
  ws.on('close', () => chatClients.delete(ws));
  ws.on('error', () => chatClients.delete(ws));
});

function broadcastChatMessage(entry) {
  const payload = JSON.stringify({ type: 'chat:message', message: entry });
  for (const client of chatClients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Live chat WebSocket: ws://localhost:${PORT}/ws/chat`);
});
