export function getIndiaCalendarDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function normalizeCalendarDate(value) {
  const raw = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(raw) ? raw.slice(0, 10) : getIndiaCalendarDate();
}

export function addCalendarDays(value, days) {
  const [year, month, day] = normalizeCalendarDate(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + Number(days || 0)));
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

export function formatIndiaCalendarDate(value) {
  const [year, month, day] = normalizeCalendarDate(value).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric'
  });
}

export function buildProviderSearchUrl(provider, from, to, date, busType = 'Any') {
  const origin = String(from || '').split(',')[0].trim();
  const destination = String(to || '').split(',')[0].trim();
  const day = normalizeCalendarDate(date);
  const [year, month, dayOfMonth] = day.split('-');
  const monthDate = new Date(Date.UTC(Number(year), Number(month) - 1, 15, 12));
  const readableDate = `${dayOfMonth} ${monthDate.toLocaleDateString('en-IN', { month: 'long', timeZone: 'UTC' })} ${year}`;
  if (provider === 'bus') {
    const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const redbusDate = `${dayOfMonth}-${monthDate.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' })}-${year}`;
    const params = new URLSearchParams({
      fromCityName: origin, toCityName: destination, onward: redbusDate, doj: redbusDate,
      srcCountry: 'IND', destCountry: 'IND', opId: '0', busType: busType === 'Any type' ? 'Any' : busType
    });
    return `https://www.redbus.in/bus-tickets/${slug(origin)}-to-${slug(destination)}?${params.toString()}`;
  }
  if (provider === 'flight') {
    const query = `Flights from ${origin} to ${destination} on ${readableDate}`;
    return `https://www.google.com/travel/flights?q=${encodeURIComponent(query)}`;
  }
  return 'https://www.irctc.co.in/nget/train-search';
}
