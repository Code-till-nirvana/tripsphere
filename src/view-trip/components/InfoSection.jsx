import {useEffect,useState} from 'react';
import { CalendarDays, MapPin, Sparkles, Users, Clock3 } from 'lucide-react';
import { getDestinationImage } from '@/service/ImageService';
export default function InfoSection({trip}){
 const [photo,setPhoto]=useState(''); const selection=trip?.userSelection||{}; const destination=selection.location?.label||'Your destination';
 const days=Number(selection.noOfDays)||trip?.tripData?.itinerary?.length||0;
 const startDate=selection.startDate?new Date(`${selection.startDate}T12:00:00`):null;
 const endDate=startDate&&days?new Date(new Date(startDate).setDate(startDate.getDate()+days-1)):null;
 const dateLabel=startDate?`${startDate.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}${endDate&&days>1?` – ${endDate.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}`:''}`:'';
 useEffect(()=>{let active=true;(async()=>{const img=await getDestinationImage(destination);if(active)setPhoto(img||'/placeholder.jpg')})();return()=>{active=false}},[destination]);
 return <section className="info-banner"><div className="destination-hero-image">{photo&&<img src={photo} alt={`${destination} destination`}/>}<div className="hero-image-shade"/></div><div className="info-copy"><div className="eyebrow dark-eyebrow"><Sparkles size={14}/> YOUR TRIP</div><h1>{selection.location?.city||destination.split(',')[0]}</h1><p><MapPin size={15}/> {destination}</p><div className="pills">{dateLabel&&<span className="pill"><CalendarDays size={14}/>{dateLabel}</span>}{days>0&&<span className="pill"><Clock3 size={14}/>{days} {days===1?'day':'days'}</span>}{selection.traveler&&<span className="pill"><Users size={14}/>{selection.traveler?.label||selection.traveler}</span>}</div></div></section>;
}
