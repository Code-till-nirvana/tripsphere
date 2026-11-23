import axios from 'axios';

const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function unique(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.name}`.toLowerCase();
    if (!item.name || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

export async function discoverPlaces({ city, lat, lon, category = 'tourist attractions', limit = 12 }) {
  const safeCity = String(city || '').split(',')[0].trim();
  if (!safeCity && (!lat || !lon)) return [];

  try {
    const around = lat && lon ? `around:${Math.min(8000, Math.max(2500, limit * 500))},${lat},${lon}` : '';
    const tagMap = {
      attractions: '(node["tourism"]({around});way["tourism"]({around});relation["tourism"]({around});node["historic"]({around});way["historic"]({around});)',
      food: '(node["amenity"="restaurant"]({around});node["amenity"="fast_food"]({around});way["amenity"="restaurant"]({around});)',
      cafes: '(node["amenity"="cafe"]({around});way["amenity"="cafe"]({around});)',
      shopping: '(node["shop"]({around});way["shop"]({around});)',
      parks: '(node["leisure"="park"]({around});way["leisure"="park"]({around});)'
    };
    const key = String(category).toLowerCase();
    const template = Object.entries(tagMap).find(([k]) => key.includes(k))?.[1];
    if (template && around) {
      const query = `[out:json][timeout:12];${template.replaceAll('{around}', around)}out center tags;`;
      const { data } = await axios.post(OVERPASS, query, { headers: { 'Content-Type': 'text/plain' }, timeout: 15000 });
      const rows = (data?.elements || []).map((e) => {
        const tags = e.tags || {};
        return {
          id: String(e.id), name: tags.name || tags.brand || tags.operator,
          address: [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean).join(' '),
          lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon,
          category: tags.amenity || tags.tourism || tags.historic || tags.leisure || tags.shop || category,
          website: tags.website || tags['contact:website'] || '',
          rating: null,
          uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tags.name || '')}`
        };
      }).filter((x) => x.name && Number.isFinite(x.lat) && Number.isFinite(x.lon));
      if (rows.length) return unique(rows).slice(0, limit);
    }
  } catch { /* fall through to Nominatim */ }

  await sleep(350);
  try {
    const q = `${category} in ${safeCity}`;
    const { data } = await axios.get(NOMINATIM, { params: { q, format: 'jsonv2', limit, addressdetails: 1 }, headers: { Accept: 'application/json' }, timeout: 12000 });
    return unique((data || []).map((x) => ({
      id: x.place_id, name: x.display_name?.split(',')[0] || 'Local place', address: x.display_name || '',
      lat: Number(x.lat), lon: Number(x.lon), category, rating: null,
      uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(x.display_name || '')}`
    })).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon))).slice(0, limit);
  } catch { return []; }
}

export async function discoverDestinationStops({ city, lat, lon, days = 3 }) {
  const categories = ['attractions', 'historic sites', 'museums', 'parks', 'markets', 'viewpoints'];
  const results = [];
  for (const category of categories) {
    const found = await discoverPlaces({ city, lat, lon, category, limit: Math.max(4, days * 2) });
    results.push(...found);
    if (results.length >= days * 4) break;
  }
  return unique(results).slice(0, Math.max(days * 3, 6));
}
