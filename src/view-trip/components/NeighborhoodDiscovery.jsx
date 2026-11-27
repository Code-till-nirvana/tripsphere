import { useEffect, useState } from 'react';
import { Compass, ExternalLink, MapPin, Search, Utensils, Coffee, ShoppingBag, Trees, Landmark } from 'lucide-react';
import { discoverPlaces } from '@/service/PlacesService';
import { getPlaceImageRecord } from '@/service/ImageService';

const CATEGORIES = [
  { label: 'Attractions', query: 'attractions', icon: Landmark },
  { label: 'Food', query: 'food', icon: Utensils },
  { label: 'Cafes', query: 'cafes', icon: Coffee },
  { label: 'Shopping', query: 'shopping', icon: ShoppingBag },
  { label: 'Parks', query: 'parks', icon: Trees },
];
function coords(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const [lat, lng] = value.split(',').map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  return value.lat !== undefined ? { lat: Number(value.lat), lng: Number(value.lng) } : null;
}

function DiscoveryPhoto({ photo, name }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [photo?.url]);
  if (!photo?.url || failed) return <div className="discovery-photo"><Compass size={25} /><span>Photo unavailable</span></div>;
  return <div className="discovery-photo-wrap">
    <img src={photo.url} alt={`${name} photo`} loading="lazy" onError={() => setFailed(true)} />
    <a className="discovery-photo-credit" href={photo.sourceUrl} target="_blank" rel="noreferrer">Photo: {photo.creator || 'Wikimedia Commons'} · {photo.license.name}</a>
  </div>;
}

export default function NeighborhoodDiscovery({ trip }) {
  const itinerary = trip?.tripData?.itinerary || [];
  const [dayIndex, setDayIndex] = useState(0);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const day = itinerary[dayIndex] || itinerary[0];
  const first = day?.plan?.[0];
  const anchor = coords(first?.geo_coordinates) || trip?.userSelection?.location?.location;
  const city = trip?.userSelection?.location?.city || trip?.userSelection?.location?.label?.split(',')[0] || 'your destination';

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await discoverPlaces({ city, lat: anchor?.lat, lon: anchor?.lng, category: category.query, limit: 8 });
        const baseRows = rows.length ? rows : (day?.plan || []).map((place, index) => ({
          id: `itinerary-${index}`, name: place.place, address: city,
          category: place.category || category.label,
          uri: place.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place || '')}`,
        }));
        // Render real place rows immediately; each exact, licensed image resolves in the background.
        const initial = baseRows.slice(0, 8).map((place) => ({ ...place, photo: null }));
        if (active) { setPlaces(initial); setLoading(false); }
        initial.forEach(async (place, index) => {
          const point = coords(place.geo_coordinates) || (Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lon)) ? { lat: Number(place.lat), lng: Number(place.lon) } : null);
          const photo = await getPlaceImageRecord(place.name, city, place.address || '', 'attraction', point);
          if (active && photo) setPlaces((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, photo } : item));
        });
      } catch (error) {
        console.error('Local place discovery failed', error);
        if (active) { setPlaces([]); setLoading(false); }
      }
    })();
    return () => { active = false; };
  }, [dayIndex, category.query, category.label, city, day?.plan, anchor?.lat, anchor?.lng]);

  return <section className="section-block neighborhood-section">
    <div className="section-title"><div><div className="section-kicker"><Compass size={14} /> LOCAL DISCOVERY</div><h2>Explore around your destination</h2><span>Useful nearby places for your selected day and destination.</span></div></div>
    <div className="discovery-toolbar"><div className="day-tabs">{itinerary.map((item, index) => <button key={index} className={index === dayIndex ? 'active' : ''} onClick={() => setDayIndex(index)}>{item.day || `Day ${index + 1}`}</button>)}</div><div className="category-tabs">{CATEGORIES.map((item) => { const Icon = item.icon; return <button key={item.label} className={category.label === item.label ? 'active' : ''} onClick={() => setCategory(item)}><Icon size={14} />{item.label}</button>; })}</div></div>
    <div className="discovery-context"><MapPin size={15} /> Showing <b>{category.label.toLowerCase()}</b> around <b>{first?.place || city}</b></div>
    <div className="discovery-results-grid">
      {loading ? [1, 2, 3, 4].map((item) => <div className="discovery-card skeleton-card" key={item}><div /><div className="event-body"><div className="skeleton-line short" /><div className="skeleton-line" /></div></div>)
        : places.length ? places.map((place, index) => <article className="discovery-card" key={place.id || index}>
          <DiscoveryPhoto photo={place.photo} name={place.name} />
          <div className="discovery-body"><div className="discovery-number">{index + 1}</div><div><h3>{place.name}</h3><p>{place.address || city}</p><div className="discovery-meta">{place.rating ? `★ ${place.rating}` : 'Verified map place'} · {place.category}</div><a href={place.uri} target="_blank" rel="noreferrer" className="small-btn">Open in Maps <ExternalLink size={12} /></a></div></div>
        </article>)
        : <div className="discovery-empty"><Search size={20} /><div><b>No matching places found.</b><p>Try another category or open the destination in Maps for more places.</p></div></div>}
    </div>
  </section>;
}

