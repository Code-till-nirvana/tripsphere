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


/**
 * Discover real accommodation listings for any destination.
 * Resolve a city centre when coordinates are missing, then query multiple
 * Overpass mirrors and Nominatim. Only provider-returned named properties
 * become hotel cards; no synthetic hotel names are generated.
 */
export async function discoverHotels({ city, lat, lon, limit = 8 }) {
  const safeCity = String(city || '').split(',')[0].trim();
  if (!safeCity && (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lon)))) return [];

  let centerLat = Number(lat);
  let centerLon = Number(lon);
  let hasCenter = Number.isFinite(centerLat) && Number.isFinite(centerLon) && !(centerLat === 0 && centerLon === 0);

  // City autocomplete entries sometimes contain only a label/city name.
  // Geocode that destination instead of returning an empty hotel section.
  if (!hasCenter && safeCity) {
    try {
      const { data } = await axios.get(NOMINATIM, {
        params: { q: safeCity, format: 'jsonv2', limit: 1, addressdetails: 1 },
        headers: { Accept: 'application/json' }, timeout: 12000
      });
      if (data?.[0]) {
        centerLat = Number(data[0].lat);
        centerLon = Number(data[0].lon);
        hasCenter = Number.isFinite(centerLat) && Number.isFinite(centerLon);
      }
    } catch { /* try city-name discovery below */ }
  }

  const normalize = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const seen = new Set();
  const rows = [];
  const add = (item) => {
    const name = String(item?.name || '').trim();
    const key = normalize(name);
    const latitude = Number(item?.lat);
    const longitude = Number(item?.lon);
    if (!name || !key || seen.has(key) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    seen.add(key);
    const address = item.address || safeCity;
    rows.push({
      id: item.id || `hotel-${key}`, name, address,
      lat: latitude, lon: longitude, rating: item.rating || null, price: null,
      image_url: item.image_url || '',
      map_url: item.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name,address].filter(Boolean).join(', '))}`,
      source: item.source || 'OpenStreetMap'
    });
  };

  const overpassQuery = hasCenter
    ? `[out:json][timeout:25];(nwr(around:25000,${centerLat},${centerLon})["tourism"~"^(hotel|guest_house|hostel|motel|apartment)$"];nwr(around:25000,${centerLat},${centerLon})["building"="hotel"];);out center tags;`
    : '';
  const endpoints = [
    OVERPASS,
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];

  if (overpassQuery) {
    for (const endpoint of endpoints) {
      try {
        const { data } = await axios.post(endpoint, overpassQuery, {
          headers: { 'Content-Type': 'text/plain', Accept: 'application/json' }, timeout: 28000
        });
        (data?.elements || []).forEach((element) => {
          const tags = element.tags || {};
          const name = tags.name || tags.brand || tags.operator;
          const latitude = element.lat ?? element.center?.lat;
          const longitude = element.lon ?? element.center?.lon;
          const address = [
            tags['addr:housenumber'], tags['addr:street'], tags['addr:suburb'],
            tags['addr:city'] || safeCity
          ].filter(Boolean).join(', ');
          add({
            id: `osm-${element.type}-${element.id}`, name, lat: latitude, lon: longitude,
            address, image_url: tags.image || '', source: 'OpenStreetMap'
          });
        });
        if (rows.length >= 3) break;
      } catch { /* move to another public Overpass instance */ }
    }
  }

  // Nominatim is a secondary provider when OSM's Overpass index has sparse
  // accommodation tags for a city. Results still must be named and mapped.
  if (rows.length < 3 && safeCity) {
    for (const searchTerm of [`hotels in ${safeCity}`, `guest houses in ${safeCity}`]) {
      try {
        const { data } = await axios.get(NOMINATIM, {
          params: { q: searchTerm, format: 'jsonv2', limit: 12, addressdetails: 1, extratags: 1 },
          headers: { Accept: 'application/json' }, timeout: 14000
        });
        (data || []).forEach((place) => {
          const tags = place.extratags || {};
          const type = `${place.type || ''} ${place.class || ''} ${tags.tourism || ''}`.toLowerCase();
          if (!/hotel|guest_house|hostel|motel|apartment|accommodation/.test(type)) return;
          add({
            id: `nominatim-${place.place_id}`,
            name: place.name || place.namedetails?.name || place.display_name?.split(',')[0],
            address: place.display_name || safeCity,
            lat: place.lat, lon: place.lon, source: 'OpenStreetMap'
          });
        });
        if (rows.length >= 3) break;
      } catch { /* retain any valid results from Overpass */ }
    }
  }

  return rows.sort((a, b) => {
    if (!hasCenter) return a.name.localeCompare(b.name);
    const da = Math.hypot(a.lat - centerLat, a.lon - centerLon);
    const db = Math.hypot(b.lat - centerLat, b.lon - centerLon);
    return da - db;
  }).slice(0, limit);
}
