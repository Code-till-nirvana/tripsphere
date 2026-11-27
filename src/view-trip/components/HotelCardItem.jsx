import {useEffect,useState} from 'react';
import { ExternalLink, MapPin, Star } from 'lucide-react';
import { getPlaceImageWithNearbyRecord } from '@/service/ImageService';

function formatLocalDate(value) {
 if(!value)return '';
 // Keep date-only values in local calendar time; avoid UTC timezone shifting.
 const raw=String(value).slice(0,10);
 const match=raw.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
 if(!match)return '';
 const [,y,m,d]=match;
 return `${y}-${m}-${d}`;
}
function addCalendarDays(iso,days) {
 const [y,m,d]=iso.split('-').map(Number);
 const date=new Date(y,m-1,d,12,0,0);
 date.setDate(date.getDate()+days);
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function tripDates(trip) {
 const selection=trip?.userSelection||{};
 const start=formatLocalDate(selection.startDate||selection.start_date||selection.fromDate||selection.checkin);
 if(!start)return {checkin:'',checkout:''};
 // Prefer an explicitly selected end/check-out date. Otherwise, a 5-calendar-day
 // trip from Dec 17 through Dec 21 ends on Dec 21 (duration - 1 days).
 const explicitEnd=formatLocalDate(selection.endDate||selection.end_date||selection.returnDate||selection.checkout||selection.toDate);
 const duration=Math.max(1,Number(selection.noOfDays||selection.days||selection.duration)||1);
 const checkout=explicitEnd&&explicitEnd>=start?explicitEnd:addCalendarDays(start,duration-1);
 return {checkin:start,checkout};
}

export default function HotelCardItem({hotel,destination,trip}){
 const [photo,setPhoto]=useState(null);
 const hotelName=hotel?.name;
 const hotelAddress=hotel?.address;
 const hotelImageUrl=hotel?.image_url;
 const hotelImageAttribution=hotel?.image_attribution;
 const hotelId=hotel?.id;
 const tripId=trip?.id;
 const hotelLatitude=Number(hotel?.lat);
 const hotelLongitude=Number(hotel?.lon);
 useEffect(()=>{
   let active=true;
   (async()=>{
     const saved=hotelImageUrl&&hotelImageAttribution?.sourceUrl&&hotelImageAttribution?.license?.name?{url:hotelImageUrl,...hotelImageAttribution}:null;
     if(saved){setPhoto(saved);return;}
     setPhoto(null);
     const coordinates=Number.isFinite(hotelLatitude)&&Number.isFinite(hotelLongitude)?{lat:hotelLatitude,lng:hotelLongitude}:null;
     const img=await getPlaceImageWithNearbyRecord(hotelName,destination,hotelAddress,'hotel',coordinates,`hotel-${tripId}-${hotelId||hotelName}-${hotelAddress}`);
     if(active)setPhoto(img);
   })();
   return()=>{active=false};
 },[hotelName,hotelAddress,destination,hotelImageUrl,hotelImageAttribution,hotelLatitude,hotelLongitude,tripId,hotelId]);
 const {checkin,checkout}=tripDates(trip);
 const query=[hotel?.name,hotel?.address,destination].filter(Boolean).join(' ');
 const guests=Math.max(1,Number(trip?.userSelection?.travelerCount||trip?.userSelection?.adults||2)||2);
 const datePhrase=checkin&&checkout?` check-in ${checkin} check-out ${checkout}`:'';
 // Put dates both in Google's supported date fields and in the search phrase.
 // The phrase survives Google changing its result/detail-page URL structure.
 const googleParams=new URLSearchParams({q:`${query}${datePhrase}`,hl:'en-IN',gl:'IN'});
 if(checkin&&checkout){googleParams.set('checkin',checkin);googleParams.set('checkout',checkout);googleParams.set('adults',String(guests));}
 const hotelUrl=`https://www.google.com/travel/search?${googleParams.toString()}`;
 const bookingParams=new URLSearchParams({ss:query,lang:'en-us'});
 if(checkin&&checkout){bookingParams.set('checkin',checkin);bookingParams.set('checkout',checkout);bookingParams.set('group_adults',String(guests));}
 const bookingUrl=`https://www.booking.com/searchresults.html?${bookingParams.toString()}`;
 const mapUrl=hotel?.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
 return <article className="hotel-card">
   <a href={mapUrl} target="_blank" rel="noreferrer" className="hotel-card-photo-link" aria-label={`View ${hotel?.name} on Google Maps`}>
    {photo?.url?<img src={photo.url} alt={`${hotel?.name} photo`} loading="lazy" onError={()=>setPhoto(null)}/>:<div className="hotel-photo-fallback"><MapPin size={24}/><span>Hotel photo unavailable</span></div>}
   </a>
   {photo?.url&&<div className="place-image-attribution"><a href={photo.sourceUrl} target="_blank" rel="noreferrer">Photo: {photo.creator||'Wikimedia Commons'} · {photo.license.name}</a></div>}
   <div className="hotel-card-body"><h3>{hotel?.name}</h3><p><MapPin size={12}/> {hotel?.address||destination}</p>
    <div className="hotel-meta">{hotel?.price&&<span>₹ {hotel.price}</span>}{hotel?.rating&&<span><Star size={12}/> {hotel.rating}</span>}</div>
    <div className="hotel-link-row"><a className="hotel-link" href={hotelUrl} target="_blank" rel="noreferrer">Google Hotels · {checkin&&checkout?`${checkin} – ${checkout}`:'Choose dates'} <ExternalLink size={12}/></a><a className="hotel-link secondary" href={bookingUrl} target="_blank" rel="noreferrer">Booking.com · same dates <ExternalLink size={12}/></a><a className="hotel-link secondary" href={mapUrl} target="_blank" rel="noreferrer">View map <ExternalLink size={12}/></a></div>
   </div>
  </article>;
}

