import { getChatStore, readChatMessages, writeChatMessages } from './_lib/blobs.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async (req) => {
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const store = getChatStore(req);

    if (method === 'POST') {
      let payload = null;
      try {
        payload = await req.json();
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
          status: 400,
          headers: { ...jsonHeaders, ...corsHeaders() },
        });
      }

      const name = (payload?.name || '').trim();
      const message = (payload?.message || '').trim();

      if (!name || !message) {
        return new Response(
          JSON.stringify({ error: 'Name and message are required.' }),
          { status: 400, headers: { ...jsonHeaders, ...corsHeaders() } },
        );
      }

      const messages = await readChatMessages(store);
      const entry = {
        id: String(Date.now()),
        name: name.slice(0, 60),
        message: message.slice(0, 2000),
        createdAt: new Date().toISOString(),
      };

      messages.push(entry);
      await writeChatMessages(store, messages);

      return new Response(JSON.stringify(entry), {
        status: 201,
        headers: { ...jsonHeaders, ...corsHeaders() },
      });
    }

    // GET — return all chat messages (persisted, never deleted).
    const messages = await readChatMessages(store);
    return new Response(JSON.stringify(messages), {
      status: 200,
      headers: { ...jsonHeaders, ...corsHeaders() },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to access chat store.' }),
      { status: 500, headers: { ...jsonHeaders, ...corsHeaders() } },
    );
  }
};
