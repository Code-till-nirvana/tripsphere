import { discoverDestinationStops, discoverHotels } from '@/service/PlacesService';
import { getDestinationImage, getPlaceImage } from '@/service/ImageService';

const categoryPlan = ['Culture', 'Food', 'Nature', 'History', 'Shopping', 'Viewpoint', 'Adventure'];

function uniquePlaces(items) {
  const seen = new Set();
  return items.filter((p) => {
    const key = String(p?.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key); return true;
  });
}

function fallbackStop(city, label, category, index, coords) {
  return {
    time: index % 3 === 0 ? 'Morning' : index % 3 === 1 ? 'Afternoon' : 'Evening',
    place: label,
    details: `A recommended ${category.toLowerCase()} stop for your ${city} trip.`,
    image_url: '', geo_coordinates: coords ? `${coords.lat},${coords.lng}` : '',
    ticket_pricing: 'Check current local pricing', rating: '—', travel_time: '20–40 min', best_time: 'Based on opening hours', category
  };
}

export async function buildLocalTrip({ location, days, origin, traveler, interests }) {
  const city = location?.city || location?.label?.split(',')[0] || 'your destination';
  const coords = location?.location || null;
  const count = Math.min(Math.max(Number(days) || 3, 1), 14);
  const discovered = await discoverDestinationStops({ city, lat: coords?.lat, lon: coords?.lng, days: count });
  const places = uniquePlaces(discovered);
  const fallbackAreas = ['historic quarter','central market','city museum','riverside promenade','main cultural district','central park','old town','art district','local food street','heritage district','city viewpoint','shopping district','botanical garden','waterfront'];
  for (const area of fallbackAreas) {
    if (places.length >= count * 3) break;
    const key = `${city} ${area}`.toLowerCase();
    if (!places.some((p) => String(p.name || '').toLowerCase() === key)) places.push({ name: `${city} ${area}`, category: area, lat: coords?.lat, lon: coords?.lng, uri: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${city} ${area}`)}` });
  }
  const destinationImage = await getDestinationImage(location?.label || city);
  const imageCache = new Map();

  const getImage = async (place) => {
    if (imageCache.has(place)) return imageCache.get(place);
    const img = await getPlaceImage(place, city);
    imageCache.set(place, img || destinationImage || '/placeholder.jpg');
    return imageCache.get(place);
  };

  const itinerary = [];
  let cursor = 0;
  for (let day = 0; day < count; day += 1) {
    const plan = [];
    for (let slot = 0; slot < 3; slot += 1) {
      const item = places[cursor++];
      if (item) {
        const image = await getImage(item.name);
        plan.push({
          time: slot === 0 ? 'Morning' : slot === 1 ? 'Afternoon' : 'Evening',
          place: item.name,
          details: `Explore ${item.name} as part of a ${categoryPlan[(day + slot) % categoryPlan.length].toLowerCase()}-focused day in ${city}.`,
          image_url: image,
          geo_coordinates: `${item.lat},${item.lon}`,
          ticket_pricing: 'Check current pricing',
          rating: item.rating || '—',
          travel_time: slot === 0 ? '15–30 min' : '20–40 min',
          best_time: slot === 0 ? 'Morning' : slot === 1 ? 'Afternoon' : 'Evening',
          category: item.category || categoryPlan[(day + slot) % categoryPlan.length],
          map_url: item.uri
        });
      }
    }
    if (!plan.length) {
      plan.push(fallbackStop(city, `${city} city highlights`, 'Highlights', 0, coords));
      plan.push(fallbackStop(city, `${city} local food district`, 'Food', 1, coords));
      plan.push(fallbackStop(city, `${city} evening district`, 'Evening', 2, coords));
    }
    itinerary.push({ day: `Day ${day + 1}`, plan });
  }

  const discoveredHotels = await discoverHotels({ city, lat: coords?.lat, lon: coords?.lng, limit: 8 });
  const hotelOptions = [];
  const hotelSeen = new Set();
  for (const hotel of discoveredHotels) {
    const key = String(hotel.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || hotelSeen.has(key)) continue;
    hotelSeen.add(key);
    let image = hotel.image_url || '';
    if (image.startsWith('File:')) image = '';
    if (!(image.startsWith('https://') || image.startsWith('http://'))) image = await getPlaceImage(hotel.name, city, hotel.address);
    hotelOptions.push({
      ...hotel,
      image_url: image || '',
      geo_coordinates: `${hotel.lat},${hotel.lon}`,
      description: 'Verified mapped accommodation listing. Confirm amenities and rates with the property.',
      amenities: []
    });
  }

  return {
    destination_image: destinationImage || '/placeholder.jpg',
    hotel_options: hotelOptions,
    itinerary,
    transport_summary: { recommended_mode: 'Compare live options', reason: `Compare available routes from ${origin?.city || 'your origin'} to ${city}.`, estimated_cost: 'Check current rates' },
    tips: [`Plan around the opening hours of the places you selected in ${city}.`, 'Prices and event availability can change; verify before booking.'],
    meta: { generatedBy: 'TripSphere local planner', interests: interests || [], traveler }
  };
}
