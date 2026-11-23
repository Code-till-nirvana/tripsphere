import handler from '../../api/events.js';

export default async function eventsFunction(request) {
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
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (error) {
    console.error('Events function failed:', error);
    return Response.json(
      { live: false, events: [], source: 'Live event service unavailable', message: 'The live event service encountered an error. Please try again shortly.' },
      { status: 500 },
    );
  }
}
