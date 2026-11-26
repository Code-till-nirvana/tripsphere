import {useState} from 'react';
import {CalendarPlus,CheckCircle2,Clock3,MapPin,RotateCcw,Route,Sparkles} from 'lucide-react';
import PlaceCardItem from './PlaceCardItem';
import {downloadCalendarEvent,optimizeDayPlan,weatherAdjustPlan} from '@/service/TripPlanning';
import {generateWithGemini} from '@/service/AIModel';
import {discoverDestinationStops} from '@/service/PlacesService';
import {toast} from 'sonner';
import {updateTrip} from '@/service/TripStore';

export default function PlacesToVisit({trip,onTripChange,weather=[]}){
 const days=trip?.tripData?.itinerary||[];
 const destination=trip?.userSelection?.location?.label||'';
 const [done,setDone]=useState(()=>new Set());
 const [regenerating,setRegenerating]=useState(-1);
 const startDate=trip?.userSelection?.startDate;

 const updateDay=(index,plan)=>{
  const itinerary=days.map((day,i)=>i===index?{...day,plan}:day);
  const saved=updateTrip(trip.id,{tripData:{...trip.tripData,itinerary}});
  if(!saved){toast('This trip could not be saved. Reload it from My Trips and try again.');return false;}
  onTripChange?.(saved);
  return true;
 };

 const normalizePlace=(value='')=>String(value).toLocaleLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const toStop=(place,i)=>({time:place.time||['Morning','Afternoon','Evening'][i],place:place.place||place.name,details:place.details||place.address||place.category||'Nearby place',image_url:place.image_url||'',geo_coordinates:place.geo_coordinates||(Number.isFinite(Number(place.lat))&&Number.isFinite(Number(place.lon))?`${place.lat},${place.lon}`:''),rating:place.rating||'—',travel_time:place.travel_time||'Nearby',best_time:place.best_time||['Morning','Afternoon','Evening'][i],category:place.category||'Place',map_url:place.map_url||place.uri||`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.place||place.name||'')}`});

 const optimize=(index,plan)=>{
  if(plan.length<2){toast('Add at least two stops before optimizing this route.');return;}
  if(plan.filter(place=>place.geo_coordinates).length<2){toast('This itinerary needs coordinates for at least two stops to calculate a route.');return;}
  if(updateDay(index,optimizeDayPlan(plan)))toast('Route order optimized and saved.');
 };

 const regenerate=async(index)=>{
  setRegenerating(index);
  const current=days[index];
  try{
   const used=new Set(days.flatMap(day=>(day.plan||[]).map(place=>normalizePlace(place.place))));
   const point=trip?.userSelection?.location?.location||{};
   const found=await discoverDestinationStops({city:destination,lat:Number(point.lat)||undefined,lon:Number(point.lng)||undefined,days:1});
   // Prefer real map results so regeneration remains available without an AI key.
   let nextPlan=found.filter(place=>place.name&&!used.has(normalizePlace(place.name))).slice(0,3).map(toStop);
   if(nextPlan.length<2){
    const prompt=`Regenerate only ${current?.day||`Day ${index+1}`} for a trip to ${destination}. Return JSON only as an object with plan:[{time,place,details,image_url,geo_coordinates,ticket_pricing,rating,travel_time,best_time,category,map_url}]. Suggest real, visitable places and avoid every place already in this trip: ${[...used].join(', ')}. Interests: ${JSON.stringify(trip?.tripData?.meta?.interests||trip?.userSelection?.interests||[])}`;
    const ai=await generateWithGemini(prompt);
    const generated=(Array.isArray(ai?.plan)?ai.plan:[]).filter(place=>place?.place&&!used.has(normalizePlace(place.place))&&!nextPlan.some(stop=>normalizePlace(stop.place)===normalizePlace(place.place))).map(toStop);
    nextPlan=[...nextPlan,...generated].slice(0,3);
   }
   if(!nextPlan.length){toast('No new verified places were found for this day. Try again in a moment.');return;}
   if(updateDay(index,nextPlan))toast(`${current?.day||`Day ${index+1}`} regenerated and saved.`);
  }catch(error){console.error('Day regeneration failed',error);toast('Day regeneration failed. Check your connection and try again.');}
  finally{setRegenerating(-1);}
 };

 return <section className="section-block itinerary-section">
  <div className="section-title"><div><div className="section-kicker">DAY-BY-DAY PLAN</div><h2>Your itinerary</h2><span>Open a day to see your stops, update the route, or add activities to your calendar.</span></div></div>
  {days.length?days.map((item,index)=>{
   const forecast=weather[index];const plan=item.plan||[];
   const date=startDate?new Date(new Date(`${startDate}T12:00:00`).setDate(new Date(`${startDate}T12:00:00`).getDate()+index)).toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'}):'';
   return <details className="day-itinerary" key={index} open={index===0}>
    <summary className="day-summary"><span className="day-number">{index+1}</span><span className="day-summary-copy"><b>{item.day||`Day ${index+1}`}</b><small>{date&&<><CalendarPlus size={13}/>{date}<i>·</i></>}<MapPin size={13}/>{destination.split(',')[0]}</small></span><span className="day-stop-count">{plan.length} {plan.length===1?'stop':'stops'}</span><span className="day-chevron" aria-hidden="true">⌄</span></summary>
    <div className="day-content">{item.description&&<p className="day-description">{item.description}</p>}
     <div className="day-heading-actions"><button type="button" className="small-btn" onClick={()=>optimize(index,plan)}><Route size={13}/> Optimize route</button><button type="button" className="small-btn" onClick={()=>regenerate(index)} disabled={regenerating===index}>{regenerating===index?<><RotateCcw className="spin" size={13}/> Regenerating</>:<><Sparkles size={13}/> Regenerate day</>}</button>{forecast&&forecast.rain>=50&&<><span className="weather-warning">Rain {forecast.rain}% · favor indoor stops</span><button type="button" className="small-btn" onClick={()=>updateDay(index,weatherAdjustPlan(plan,forecast.rain))}>Adjust for weather</button></>}</div>
     {plan.length?<div className="day-grid">{plan.map((place,i)=>{const key=`${index}-${place.place}`;const completed=done.has(key);return <div key={`${item.day}-${i}`} className={completed?'itinerary-stop completed':'itinerary-stop'}><div className="slot-label"><Clock3 size={13}/> {place.time||'Planned stop'}<span className="stop-actions"><button type="button" aria-label={completed?'Mark incomplete':'Mark complete'} title={completed?'Mark incomplete':'Mark complete'} onClick={()=>setDone(prev=>{const next=new Set(prev);completed?next.delete(key):next.add(key);return next})}>{completed?<CheckCircle2 size={14}/>:<span className="empty-check"/>}</button><button type="button" aria-label={`Add ${place.place} to calendar`} title="Add to calendar" onClick={()=>{if(!downloadCalendarEvent({trip,place,dayIndex:index}))toast('Add a trip start date to use calendar export.')}}><CalendarPlus size={14}/></button></span></div><PlaceCardItem place={place} destination={destination}/></div>;})}</div>:<div className="day-empty">No stops planned for this day yet.</div>}
     {plan.some(place=>place.optimized)&&<div className="optimized-note"><RotateCcw size={13}/> Route order optimized for this day.</div>}{plan.some(place=>place.weatherAdjusted)&&<div className="optimized-note"><Sparkles size={13}/> Indoor-friendly order applied for the forecast.</div>}
    </div>
   </details>;
  }):<div className="day-empty">There isn’t an itinerary for this trip yet.</div>}
 </section>;
}
