import axios from 'axios';

const endpoint = 'https://geocoding-api.open-meteo.com/v1/search';

export async function searchLocations(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  try {
    const { data } = await axios.get(endpoint, { params: { name: q, count: 8, language: 'en', format: 'json' } });
    return (data?.results || []).map((x) => ({
      label: [x.name, x.admin1, x.country].filter(Boolean).join(', '),
      city: x.name,
      country: x.country || '',
      latitude: x.latitude,
      longitude: x.longitude,
      timezone: x.timezone,
      source: 'open-meteo'
    }));
  } catch { return []; }
}
