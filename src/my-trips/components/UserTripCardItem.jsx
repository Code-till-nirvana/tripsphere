import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowUpRight,CalendarDays,MapPin,Trash2,Check} from 'lucide-react';
import {getDestinationImage} from '@/service/ImageService';

export default function UserTripCardItem({trip,selectionMode=false,selected=false,onToggleSelect,onDelete}){
 const [photo,setPhoto]=useState('');
 const destination=trip?.userSelection?.location?.label||'';
 useEffect(()=>{let active=true;(async()=>{const img=await getDestinationImage(destination);if(active)setPhoto(img||'/placeholder.jpg')})();return()=>{active=false}},[destination]);
 const cardContent=<>
   <img src={photo||'/placeholder.jpg'} alt={destination.split(',')[0]||'Trip destination'}/>
   <div className="my-trip-overlay">
     <span><CalendarDays size={13}/> {trip?.userSelection?.noOfDays||'—'} days</span>
     <span className="my-trip-open"><ArrowUpRight size={16}/></span>
   </div>
   {selectionMode&&<button type="button" className={`trip-select-toggle ${selected?'selected':''}`} onClick={(e)=>{e.preventDefault();e.stopPropagation();onToggleSelect?.(trip.id)}} aria-label={selected?'Deselect trip':'Select trip'}>{selected?<Check size={16}/>:null}</button>}
   <div className="my-trip-body"><span><MapPin size={13}/> {destination.split(',')[0]}</span><h3>{destination.split(',')[0]}</h3><p>{trip?.userSelection?.traveler||'traveller'} · {trip?.userSelection?.noOfDays||'—'} day plan</p></div>
   {!selectionMode&&<button type="button" className="trip-delete-btn" onClick={(e)=>{e.preventDefault();e.stopPropagation();onDelete?.(trip)}} aria-label={`Delete ${destination.split(',')[0]} trip`}><Trash2 size={15}/></button>}
 </>;
 if(selectionMode)return <article className={`my-trip-card ${selected?'trip-selected':''}`}>{cardContent}</article>;
 return <Link to={`/view-trip/${trip?.id}`} className="my-trip-card">{cardContent}</Link>;
}
