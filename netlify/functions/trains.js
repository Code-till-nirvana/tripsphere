import handler from '../../api/trains.js';

export default async function trainsFunction(request) {
  const url = new URL(request.url);
  const query = Object.fromEntries(url.searchParams.entries());
  let statusCode = 200;
  let body = {};

  const response = {
    status(code) { statusCode = code; return this; },
    setHeader() {},
    json(payload) { body = payload; },
    end(payload = '') {
      try { body = JSON.parse(payload); } catch { body = payload; }
    },
  };

  try {
    await handler({ query }, response);
    return Response.json(body, {
      status: statusCode,
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Trains function failed:', error);
    return Response.json(
      { live: false, fallback: true, trains: [], error: 'The train search service encountered an error. Please try again shortly.' },
      { status: 500 },
    );
  }
}
