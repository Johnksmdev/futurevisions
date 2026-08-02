import { getStore } from '@netlify/blobs';

const jsonHeaders = { 'Content-Type': 'application/json' };
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'johnkosmas77';

export default async (req) => {
  const provided = req.headers.get('x-dashboard-password') || '';

  if (provided !== DASHBOARD_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  const store = getStore({ name: 'messages' });
  const messages = (await store.get('messages', { type: 'json' })) || [];

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'jj-website-backend',
      totalMessages: messages.length,
      latestMessageAt: messages[0]?.createdAt ?? null,
      messages: messages.slice(0, 10),
    }),
    { status: 200, headers: jsonHeaders },
  );
};

