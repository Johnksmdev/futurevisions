export default async () => {
  return new Response(
    JSON.stringify({ status: 'ok', service: 'jj-website-backend' }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  );
};

