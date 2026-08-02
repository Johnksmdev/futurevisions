import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getStore } from '@netlify/blobs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const siteID = process.env.NETLIFY_SITE_ID;
const token = process.env.NETLIFY_ACCESS_TOKEN;

if (!siteID || !token) {
  console.error(
    'Missing credentials. Run `netlify login` then set NETLIFY_SITE_ID and NETLIFY_ACCESS_TOKEN (see `netlify status`).',
  );
  process.exit(1);
}

const dataPath = path.join(__dirname, '..', 'data', 'messages.json');
const messages = JSON.parse(await fs.readFile(dataPath, 'utf8'));

const store = getStore({ siteID, token, name: 'messages' });
await store.setJSON('messages', messages);

console.log(`Seeded ${messages.length} messages to Netlify Blobs store "messages".`);

