import { getMessagesStore, MESSAGES_KEY } from './_lib/blobs.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

export default async (req) => {
  try {
    const store = getMessagesStore(req);
    const messages = (await store.get(MESSAGES_KEY, { type: 'json' })) || [];

    if (req.method === 'POST') {
      let payload = null;
      try {
        payload = await req.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
          status: 400,
          headers: jsonHeaders,
        });
      }

      const name = (payload?.name || '').trim();
      const email = (payload?.email || '').trim();
      const message = (payload?.message || '').trim();

      if (!name || !email || !message) {
        return new Response(
          JSON.stringify({ error: 'Name, email, and message are required.' }),
          { status: 400, headers: jsonHeaders },
        );
      }

      const entry = {
        id: String(Date.now()),
        name,
        email,
        message,
        createdAt: new Date().toISOString(),
      };

      messages.unshift(entry);
      await store.set(MESSAGES_KEY, messages);

      return new Response(JSON.stringify(entry), {
        status: 201,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify(messages), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to access messages store.',
        detail: String(error?.message || error),
      }),
      { status: 500, headers: jsonHeaders },
    );
  }
};

