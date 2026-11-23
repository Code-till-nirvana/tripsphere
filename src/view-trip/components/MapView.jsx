import React,{useMemo,useState} from 'react';
import {ExternalLink,MapPin,Navigation,Route} from 'lucide-react';
import {optimizeDayPlan,estimateDayDistance,parseCoords} from '@/service/TripPlanning';
import {updateTrip} from '@/service/TripStore';
function coords(v){return parseCoords(v)}
export default function MapView({trip,onTripChange}){
 const itinerary=trip?.tripData?.itinerary||[];const [dayIndex,setDayIndex]=useState(0);const day=itinerary[dayIndex]||itinerary[0];const places=useMemo(()=>day?.plan||[],[day]);const mapped=places.map(p=>({...p,coords:coords(p.geo_coordinates)}));const distance=estimateDayDistance(places);
 const optimize=()=>{const next=optimizeDayPlan(places);const nextItinerary=itinerary.map((d,i)=>i===dayIndex?{...d,plan:next}:d);const saved=updateTrip(trip.id,{tripData:{...trip.tripData,itinerary:nextItinerary}});onTripChange?.(saved)};
 return <section className="section-block"><div className="section-title"><div><div className="section-kicker"><Route size={14}/> ROUTE VIEW</div><h2>Plan the day by distance</h2><span>See the stops in order and optimize them to reduce unnecessary travel.</span></div><a className="small-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip?.userSelection?.location?.label||'')}`} target="_blank" rel="noreferrer"><Navigation size={13}/> Destination map</a></div>
 <div className="itinerary-map-toolbar"><div className="day-tabs">{itinerary.map((d,i)=><button key={i} className={i===dayIndex?'active':''} onClick={()=>setDayIndex(i)}>{d.day||`Day ${i+1}`}</button>)}</div><div className="map-toolbar-actions"><div className="map-summary"><MapPin size={14}/> {mapped.length} stops {distance?`· ~${distance.toFixed(1)} km`:''}</div><button className="small-btn" onClick={optimize}><Route size={13}/> Optimize this day</button></div></div>
 <div className="map-panel"><div className="google-itinerary-map route-preview"><div className="route-grid"/>{mapped.map((p,i)=><div className="route-marker" key={`${p.place}-${i}`} style={{left:`${15+(i*Math.max(18,70/Math.max(mapped.length,1)))}%`,top:`${45+Math.sin(i*1.7)*18}%`}}><span>{i+1}</span><small>{p.place}</small></div>)}</div><div className="map-stop-list">{mapped.map((p,i)=><a className="map-stop" key={i} href={p.map_url||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.place||'')}`} target="_blank" rel="noreferrer"><span>{i+1}</span><div><b>{p.place}</b><small>{p.time||'Planned stop'} {p.category?`• ${p.category}`:''}</small></div><ExternalLink size={13}/></a>)}</div></div>
 </section>
}
