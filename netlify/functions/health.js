const jsonHeaders = { 'Content-Type': 'application/json' };

export default async () => {
  return new Response(
    JSON.stringify({ status: 'ok', service: 'jj-website-backend' }),
    { status: 200, headers: jsonHeaders },
  );
};

