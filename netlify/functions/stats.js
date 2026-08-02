import { getMessagesStore, MESSAGES_KEY } from './_lib/blobs.js';

const jsonHeaders = { 'Content-Type': 'application/json' };

export default async (req) => {
  try {
    const store = getMessagesStore(req);
    const messages = (await store.get(MESSAGES_KEY, { type: 'json' })) || [];

    return new Response(
      JSON.stringify({
        totalMessages: messages.length,
        latestMessageAt: messages[0]?.createdAt ?? null,
      }),
      { status: 200, headers: jsonHeaders },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Failed to load stats.',
        detail: String(error?.message || error),
      }),
      { status: 500, headers: jsonHeaders },
    );
  }
};

