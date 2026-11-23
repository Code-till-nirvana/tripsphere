import React,{useEffect,useState} from 'react';
import { CalendarDays, MapPin, Sparkles, Users } from 'lucide-react';
import { getDestinationImage } from '@/service/ImageService';
export default function InfoSection({trip}){
 const [photo,setPhoto]=useState(''); const destination=trip?.userSelection?.location?.label||'Your destination';
 useEffect(()=>{let active=true;(async()=>{const img=await getDestinationImage(destination);if(active)setPhoto(img||'/placeholder.jpg')})();return()=>{active=false}},[destination]);
 return <section className="info-banner"><div className="info-copy"><div className="eyebrow dark-eyebrow"><Sparkles size={14}/> YOUR TRIP</div><h1>{trip?.userSelection?.location?.city||destination.split(',')[0]}</h1><p><MapPin size={15}/> {destination}</p><div className="pills"><span className="pill"><CalendarDays size={14}/> {trip?.userSelection?.noOfDays||'—'} days</span><span className="pill"><Users size={14}/> {trip?.userSelection?.traveler||'—'}</span></div></div><div className="destination-hero-image">{photo&&<img src={photo} alt={destination}/>}<div className="destination-image-label">{trip?.userSelection?.location?.city||destination.split(',')[0]} · TripSphere</div></div></section>;
}
