import React,{useEffect,useState} from 'react';
import {Clock3,ExternalLink,MapPin,Star,Globe} from 'lucide-react';
import {getPlaceImage} from '@/service/ImageService';
export default function PlaceCardItem({place,destination}){
 const [photo,setPhoto]=useState(place?.image_url||'');
 useEffect(()=>{let active=true;(async()=>{const img=await getPlaceImage(place?.place,destination,place?.category||place?.details);if(active)setPhoto(img||place?.image_url||'/placeholder.jpg')})();return()=>{active=false}},[place?.place,place?.category,place?.details,destination,place?.image_url]);
 const url=place?.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place?.place||'')}`;
 return <article className="place-card"><a href={url} target="_blank" rel="noreferrer" className="place-image-link"><img src={photo||'/placeholder.jpg'} alt={place?.place||''}/><span className="image-link-badge"><MapPin size={11}/> Maps</span></a><div className="place-card-body"><span className="place-category">{place?.category||'Experience'}</span><h3>{place?.place}</h3><p>{place?.details}</p><div className="place-meta"><span><Clock3 size={12}/> {place?.travel_time||'Nearby'}</span><span><Star size={12}/> {place?.rating||'—'}</span></div><div className="place-bottom"><a href={url} target="_blank" rel="noreferrer"><MapPin size={13}/> Open map</a>{place?.website?<a href={place.website} target="_blank" rel="noreferrer"><Globe size={13}/> Website</a>:<ExternalLink size={14}/>}</div></div></article>;
}
