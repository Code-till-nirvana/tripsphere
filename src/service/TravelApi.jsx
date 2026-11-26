import axios from 'axios';
import { buildProviderSearchUrl, normalizeCalendarDate } from './TravelSearch.js';
export { buildProviderSearchUrl } from './TravelSearch.js';

export async function getLiveEvents({ city, startDate, endDate, category = 'all', search = '' }) {
  const start = startDate || new Date().toISOString().slice(0,10);
  const end = endDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0,10);
  try {
    const response = await axios.get('/api/events', { params: { city, startDate: start, endDate: end, category, search } });
    return { events: response.data?.events || [], live: Boolean(response.data?.live), source: response.data?.source || 'Live sources', message: response.data?.message || '', updatedAt: response.data?.updatedAt || null };
  } catch {
    return { events: [], live: false, source: 'Live event sources unavailable', message: 'Live event providers could not be reached. Try Refresh or another category.' };
  }
}

export async function getLiveTrains({ from, to, date }) {
  try {
    const response = await axios.get('/api/trains', { params: { from, to, date }, timeout: 9000 });
    return response.data;
  } catch (error) {
    return { live: false, trains: [], error: error?.response?.data?.error || 'Live train inventory is unavailable right now.' };
  }
}

export async function getRoadRoute({ fromCoords, toCoords }) {
  const fromLat = Number(fromCoords?.lat), fromLng = Number(fromCoords?.lng);
  const toLat = Number(toCoords?.lat), toLng = Number(toCoords?.lng);
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) {
    return { available: false, reason: 'Choose a matching origin and destination from the location suggestions to calculate a road route.' };
  }
  try {
    const response = await axios.get('/api/route', { params: { fromLat, fromLng, toLat, toLng }, timeout: 16000 });
    return { available: response.data?.code === 'Ok' && Boolean(response.data?.routes?.[0]), ...response.data };
  } catch (error) {
    return { available: false, reason: error?.response?.data?.error || 'Road routing is temporarily unavailable.' };
  }
}

export async function getWeatherByPlace(place, days = 7) {
  if (!place) return null;
  try {
    const cityName = place.split(',')[0].trim();
    const geo = await axios.get('https://geocoding-api.open-meteo.com/v1/search', { params: { name: cityName, count: 1, language: 'en', format: 'json' } });
    const hit = geo.data?.results?.[0];
    return hit ? getWeather(hit.latitude, hit.longitude, days) : null;
  } catch { return null; }
}

export async function getWeather(lat, lng, days = 7) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  try {
    const response = await axios.get('https://api.open-meteo.com/v1/forecast', { params: {
      latitude: lat, longitude: lng,
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      timezone: 'auto', forecast_days: Math.min(Math.max(Number(days) || 7, 1), 16)
    }});
    const d = response.data?.daily;
    return d?.time?.map((date, i) => ({ date, max: Math.round(d.temperature_2m_max[i]), min: Math.round(d.temperature_2m_min[i]), rain: d.precipitation_probability_max?.[i] || 0, code: d.weather_code?.[i] })) || null;
  } catch { return null; }
}

export function getWeatherLabel(code) {
  if (code === 0) return 'Clear'; if ([1,2,3].includes(code)) return 'Partly cloudy'; if ([45,48].includes(code)) return 'Foggy';
  if ([51,53,55,56,57].includes(code)) return 'Drizzle'; if ([61,63,65,66,67,80,81,82].includes(code)) return 'Rain';
  if ([71,73,75,77,85,86].includes(code)) return 'Snow'; if ([95,96,99].includes(code)) return 'Thunderstorm'; return 'Mixed';
}

export function buildTransportOptions(from='Origin', to='Destination', originCoords=null, destinationCoords=null, travelDate) {
  const lat1 = Number(originCoords?.lat), lon1 = Number(originCoords?.lng), lat2 = Number(destinationCoords?.lat), lon2 = Number(destinationCoords?.lng);
  let km = 650;
  if ([lat1,lon1,lat2,lon2].every(Number.isFinite)) {
    const R=6371, p1=lat1*Math.PI/180, p2=lat2*Math.PI/180, dp=(lat2-lat1)*Math.PI/180, dl=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; km=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  const roadKm = Math.round(km * 1.18);
  const date=normalizeCalendarDate(travelDate);
  const dateLabel=new Date(`${date}T12:00:00+05:30`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric',timeZone:'Asia/Kolkata'});
  return [
    { mode:'Flight', provider:'Search this exact route and date', duration:'Live schedule on provider', priceLabel:'Check current fare', badge:'Fastest', source:`Travel date · ${dateLabel}`, url:buildProviderSearchUrl('flight',from,to,date) },
    { mode:'Bus', provider:'Search this exact route and date', duration:'Live schedule on provider', priceLabel:'Check seats & fare', badge:'Value', source:`Travel date · ${dateLabel}`, url:buildProviderSearchUrl('bus',from,to,date) },
    { mode:'Car', provider:'Road route estimate', duration:'Route calculated live', priceLabel:`${roadKm.toLocaleString()} km road route`, badge:'Drive', source:'OSRM route', url:`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(`${lat1},${lon1};${lat2},${lon2}`)}` }
  ].map(x=>({...x,from,to,date,distanceKm:roadKm}));
}
export function buildHotelComparisons(hotels=[]) {
  return hotels
    .filter((hotel) => Array.isArray(hotel.sources) && hotel.sources.length > 1 && hotel.sources.some((source) => source?.price))
    .slice(0,4)
    .map((hotel) => ({ ...hotel, bestRate: hotel.bestRate || hotel.price || '' }));
}
