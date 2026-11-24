import React,{useEffect,useState} from 'react';
import { ExternalLink, MapPin, Star } from 'lucide-react';
import { getPlaceImage } from '@/service/ImageService';

function tripDates(trip) {
 const start=trip?.userSelection?.startDate;
 const days=Math.max(1,Number(trip?.userSelection?.noOfDays)||1);
 if(!start)return {checkin:'',checkout:''};
 const d=new Date(`${start}T12:00:00`);
 if(Number.isNaN(d.getTime()))return {checkin:'',checkout:''};
 const end=new Date(d);end.setDate(end.getDate()+days);
 const fmt=x=>`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;
 return {checkin:fmt(d),checkout:fmt(end)};
}

export default function HotelCardItem({hotel,destination,trip}){
 const [photo,setPhoto]=useState(hotel?.image_url||'');
 useEffect(()=>{
   let active=true;
   (async()=>{
     if(hotel?.image_url && (hotel.image_url.startsWith('https://') || hotel.image_url.startsWith('http://'))){setPhoto(hotel.image_url);return;}
     const img=await getPlaceImage(hotel?.name,destination?.split(',')[0]||'',hotel?.address);
     if(active)setPhoto(img||'');
   })();
   return()=>{active=false};
 },[hotel?.name,hotel?.address,destination,hotel?.image_url]);
 const {checkin,checkout}=tripDates(trip);
 const query=[hotel?.name,hotel?.address,destination].filter(Boolean).join(' ');
 const hotelUrl=`https://www.google.com/travel/search?q=${encodeURIComponent(query)}${checkin?`&checkin=${checkin}&checkout=${checkout}`:''}`;
 const mapUrl=hotel?.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
 return <article className="hotel-card">
   <a href={mapUrl} target="_blank" rel="noreferrer" className="hotel-card-photo-link" aria-label={`View ${hotel?.name} on Google Maps`}>
    {photo?<img src={photo} alt={`${hotel?.name} property`} loading="lazy"/>:<div className="hotel-photo-fallback"><MapPin size={24}/><span>Property photos</span></div>}
   </a>
   <div className="hotel-card-body"><h3>{hotel?.name}</h3><p><MapPin size={12}/> {hotel?.address||destination}</p>
    <div className="hotel-meta"><span>{hotel?.price?'₹ '+hotel.price:'Check current rates'}</span>{hotel?.rating&&<span><Star size={12}/> {hotel.rating}</span>}</div>
    <div className="hotel-link-row"><a className="hotel-link" href={hotelUrl} target="_blank" rel="noreferrer">Check dates & rates <ExternalLink size={12}/></a><a className="hotel-link secondary" href={mapUrl} target="_blank" rel="noreferrer">View map <ExternalLink size={12}/></a></div>
   </div>
  </article>;
}
