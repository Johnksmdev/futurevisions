import { getStore } from '@netlify/blobs';

export default async () => {
  const store = getStore({ name: 'messages' });
  const messages = (await store.get('messages', { type: 'json' })) || [];

  return new Response(
    JSON.stringify({
      totalMessages: messages.length,
      latestMessageAt: messages[0]?.createdAt ?? null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};

