import React,{useEffect,useState} from 'react';
import { ExternalLink, MapPin, Star } from 'lucide-react';
import { getPlaceImage } from '@/service/ImageService';

export default function HotelCardItem({hotel,destination}){
 const [photo,setPhoto]=useState(hotel?.image_url||'');
 useEffect(()=>{
   let active=true;
   (async()=>{
     const city=destination?.split(',')[0]||'';
     // Prefer the actual property name. Only fall back to the destination
     // when no property-specific image can be found.
     const img=await getPlaceImage(hotel?.name,city,hotel?.address);
     if(active)setPhoto(img||hotel?.image_url||'/placeholder.jpg');
   })();
   return()=>{active=false};
 },[hotel?.name,hotel?.address,destination,hotel?.image_url]);
 const query=(hotel?.name||'')+','+(hotel?.address||'');
 return <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer" className="hotel-card-link"><article className="hotel-card"><img src={photo||'/placeholder.jpg'} alt={hotel?.name||'Hotel'}/><div className="hotel-card-body"><h3>{hotel?.name}</h3><p><MapPin size={12}/> {hotel?.address}</p><div className="hotel-meta"><span>₹ {hotel?.price||'Check rate'}</span><span><Star size={12}/> {hotel?.rating||'—'}</span></div><div className="hotel-link">View location <ExternalLink size={12}/></div></div></article></a>;
}
