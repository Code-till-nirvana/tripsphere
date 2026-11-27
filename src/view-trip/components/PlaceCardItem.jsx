import { useEffect, useState } from 'react';
import { Clock3, ExternalLink, MapPin, Star, Globe, Compass } from 'lucide-react';
import { getPlaceImageWithNearbyRecord } from '@/service/ImageService';

function storedImage(imageUrl, attribution) {
  if (imageUrl && attribution?.sourceUrl && attribution?.license?.name) {
    return { url: imageUrl, ...attribution };
  }
  return null;
}
function placeCoordinates(value) {
  if (typeof value === 'string') {
    const [lat, lng] = value.split(',').map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  if (value && Number.isFinite(Number(value.lat)) && Number.isFinite(Number(value.lng))) return { lat: Number(value.lat), lng: Number(value.lng) };
  return null;
}

export default function PlaceCardItem({ place, destination, imageRequestId = '' }) {
  const placeName = place?.place;
  const placeCategory = place?.category;
  const placeDetails = place?.details;
  const placeImageUrl = place?.image_url;
  const placeImageAttribution = place?.image_attribution;
  const coordinates = placeCoordinates(place?.geo_coordinates);
  const coordinateLat = coordinates?.lat;
  const coordinateLng = coordinates?.lng;
  const [photo, setPhoto] = useState(() => storedImage(placeImageUrl, placeImageAttribution));
  useEffect(() => {
    let active = true;
    const saved = storedImage(placeImageUrl, placeImageAttribution);
    setPhoto(saved);
    if (saved || !placeName) return () => { active = false; };
    getPlaceImageWithNearbyRecord(placeName, destination, placeDetails, 'attraction', Number.isFinite(coordinateLat) && Number.isFinite(coordinateLng) ? { lat: coordinateLat, lng: coordinateLng } : null, imageRequestId || `place-${placeName}-${destination}`)
      .then((image) => { if (active) setPhoto(image); });
    return () => { active = false; };
  }, [placeName, placeCategory, placeDetails, placeImageUrl, placeImageAttribution, destination, coordinateLat, coordinateLng, imageRequestId]);

  const url = place?.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place?.place || '')}`;
  return <article className="place-card">
    <div className="place-image-frame"><a href={url} target="_blank" rel="noreferrer" className="place-image-link">
      {photo?.url
        ? <img src={photo.url} onError={() => setPhoto(null)} alt={`${place?.place || 'Place'} photo`} loading="lazy" />
        : <span className="place-photo-fallback"><Compass size={24} /><small>Photo unavailable</small></span>}
      <span className="image-link-badge"><MapPin size={11} /> Maps</span>
    </a>
    {photo?.url && <div className="place-image-attribution"><a href={photo.sourceUrl} target="_blank" rel="noreferrer">Photo: {photo.creator || 'Wikimedia Commons'} · {photo.license.name}</a></div>}</div>
    <div className="place-card-body"><span className="place-category">{place?.category || 'Experience'}</span><h3>{place?.place}</h3><p>{place?.details}</p><div className="place-meta"><span><Clock3 size={12} /> {place?.travel_time || 'Nearby'}</span><span><Star size={12} /> {place?.rating || '—'}</span></div><div className="place-bottom"><a href={url} target="_blank" rel="noreferrer"><MapPin size={13} /> Open map</a>{place?.website ? <a href={place.website} target="_blank" rel="noreferrer"><Globe size={13} /> Website</a> : <ExternalLink size={14} />}</div></div>
  </article>;
}

