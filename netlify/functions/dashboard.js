import { getMessagesStore, MESSAGES_KEY } from './_lib/blobs.js';

const jsonHeaders = { 'Content-Type': 'application/json' };
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'johnkosmas77';

export default async (req) => {
  let provided = '';

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      provided = String(body?.password || '');
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
        status: 400,
        headers: jsonHeaders,
      });
    }
  } else {
    provided = req.headers.get('x-dashboard-password') || '';
  }

  if (provided !== DASHBOARD_PASSWORD) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: jsonHeaders,
    });
  }

  try {
    const store = getMessagesStore(req);
    const messages = (await store.get(MESSAGES_KEY, { type: 'json' })) || [];

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
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to load dashboard data.',
        detail: String(error?.message || error),
      }),
      { status: 500, headers: jsonHeaders },
    );
  }
};

