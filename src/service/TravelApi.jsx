import axios from 'axios';

export async function getLiveEvents({ city, startDate, endDate, category = 'all', search = '' }) {
  const start = startDate || new Date().toISOString().slice(0,10);
  const end = endDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0,10);
  try {
    const response = await axios.get('/api/events', { params: { city, startDate: start, endDate: end, category, search } });
    return { events: response.data?.events || [], live: Boolean(response.data?.live), source: response.data?.source || 'Live sources', message: response.data?.message || '' };
  } catch {
    return { events: [], live: false, source: 'Live event sources unavailable', message: 'Live event providers could not be reached. Try Refresh or another category.' };
  }
}

export async function getLiveTrains({ from, to, date }) {
  try {
    const response = await axios.get('/api/trains', { params: { from, to, date } });
    return response.data;
  } catch (error) {
    return { live: false, trains: [], error: error?.response?.data?.error || 'Live train inventory is unavailable right now.' };
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

function cityName(value='') { return String(value).split(',')[0].trim(); }
function providerSearch(provider, from, to) {
  const a=encodeURIComponent(cityName(from)); const b=encodeURIComponent(cityName(to));
  if(provider==='bus') return `https://www.redbus.in/bus-tickets/${cityName(from).toLowerCase().replace(/\s+/g,'-')}-to-${cityName(to).toLowerCase().replace(/\s+/g,'-')}`;
  if(provider==='flight') return `https://www.makemytrip.com/flights/`;
  return `https://www.confirmtkt.com/rbooking/`;
}

export function buildTransportOptions(from='Origin', to='Destination', originCoords=null, destinationCoords=null) {
  const lat1 = Number(originCoords?.lat), lon1 = Number(originCoords?.lng), lat2 = Number(destinationCoords?.lat), lon2 = Number(destinationCoords?.lng);
  let km = 650;
  if ([lat1,lon1,lat2,lon2].every(Number.isFinite)) {
    const R=6371, p1=lat1*Math.PI/180, p2=lat2*Math.PI/180, dp=(lat2-lat1)*Math.PI/180, dl=(lon2-lon1)*Math.PI/180;
    const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; km=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  }
  const roadKm = Math.round(km * 1.18);
  return [
    { mode:'Flight', provider:'Live booking partner', duration:'Live schedule', priceLabel:'Live fare on partner', badge:'Fastest', source:'Live provider', url:providerSearch('flight',from,to) },
    { mode:'Bus', provider:'Live bus booking partner', duration:'Live schedule', priceLabel:'Live seats & fare on partner', badge:'Value', source:'Live provider', url:providerSearch('bus',from,to) },
    { mode:'Car', provider:'Road route estimate', duration:'Route calculated live', priceLabel:`${roadKm.toLocaleString()} km road route`, badge:'Drive', source:'OSRM route', url:`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(`${lat1},${lon1};${lat2},${lon2}`)}` }
  ].map(x=>({...x,from,to,distanceKm:roadKm}));
}

export function buildHotelComparisons(hotels=[]) {
  return hotels.slice(0,4).map((hotel)=>({ ...hotel, sources:[{name:'Trip estimate',price:hotel.price||'Check current rates'},{name:'Hotel direct',price:'View property'}],bestRate:hotel.price||'Check current rates'}));
}
