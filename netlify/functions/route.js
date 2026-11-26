import handler from '../../api/route.js';

export default async function routeFunction(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  let statusCode = 200;
  let body = {};

  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    setHeader() {},
    json(payload) {
      body = payload;
    },
    end(payload = '') {
      try {
        body = JSON.parse(payload);
      } catch {
        body = payload;
      }
    },
  };

  try {
    await handler({ query }, response);
    return Response.json(body, {
      status: statusCode,
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Road route function failed:', error);
    return Response.json(
      { code: 'Unavailable', routes: [], error: 'Road routing is temporarily unavailable.' },
      { status: 502 },
    );
  }
}

