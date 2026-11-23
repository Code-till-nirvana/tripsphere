export function parseCoords(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const [lat, lng] = value.split(',').map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  }
  const lat = Number(value.lat), lng = Number(value.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
export function distanceKm(a, b) {
  if (!a || !b) return Infinity;
  const R = 6371, p1=a.lat*Math.PI/180, p2=b.lat*Math.PI/180, dp=(b.lat-a.lat)*Math.PI/180, dl=(b.lng-a.lng)*Math.PI/180;
  const h=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
export function optimizeDayPlan(plan=[]) {
  const remaining=plan.map(item=>({item:{...item},coords:parseCoords(item.geo_coordinates)})).filter(x=>x.item?.place);
  if(remaining.length<3)return plan;
  const ordered=[]; let current=remaining.shift(); ordered.push(current);
  while(remaining.length){
    const nextIndex=remaining.reduce((best,candidate,index)=>{
      if(!candidate.coords||!current.coords)return best===-1?index:best;
      return best===-1||distanceKm(current.coords,candidate.coords)<distanceKm(current.coords,remaining[best].coords)?index:best;
    },-1);
    const next=remaining.splice(nextIndex<0?0:nextIndex,1)[0]; ordered.push(next); current=next;
  }
  const slotTimes=['Morning','Afternoon','Evening'];
  return ordered.map((entry,i)=>({...entry.item,time:slotTimes[i]||entry.item.time,optimized:true}));
}
export function weatherAdjustPlan(plan=[], rain=0) {
  if (rain < 50 || plan.length < 2) return plan;
  const indoor=/museum|food|restaurant|cafe|shopping|market|gallery|culture|history|indoor/i;
  return [...plan].sort((a,b)=>Number(indoor.test(`${b.category} ${b.place}`))-Number(indoor.test(`${a.category} ${a.place}`))).map((p,i)=>({...p,time:['Morning','Afternoon','Evening'][i]||p.time,weatherAdjusted:true}));
}
export function estimateDayDistance(plan=[]) {
  let total=0; for(let i=1;i<plan.length;i++) total+=distanceKm(parseCoords(plan[i-1]?.geo_coordinates),parseCoords(plan[i]?.geo_coordinates));
  return Number.isFinite(total)?total:0;
}
export function buildItineraryText(trip){
  const destination=trip?.userSelection?.location?.label||'Destination';
  const days=trip?.userSelection?.noOfDays||trip?.tripData?.itinerary?.length||0;
  const lines=[`TRIPSPHERE — ${destination}`,`Trip length: ${days} days`,`Travellers: ${trip?.userSelection?.traveler||'—'}`, ''];
  (trip?.tripData?.itinerary||[]).forEach(day=>{lines.push(day.day||'Day','-'.repeat(28));(day.plan||[]).forEach((place,i)=>lines.push(`${place.time||`Stop ${i+1}`} · ${place.place}${place.category?` · ${place.category}`:''}${place.details?` — ${place.details}`:''}`));lines.push('');});
  return lines.join('\n');
}
function esc(text=''){return String(text).replace(/([,;])/g,'\\$1').replace(/\n/g,'\\n');}
function toIcsDate(date,time){const d=new Date(`${date}T${time||'09:00'}:00`);if(Number.isNaN(d.getTime()))return '';const pad=n=>String(n).padStart(2,'0');return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;}
export function downloadCalendarEvent({trip,place,dayIndex=0}){
  const startDate=trip?.userSelection?.startDate;if(!startDate||!place?.place)return false;
  const day=new Date(`${startDate}T09:00:00`);day.setDate(day.getDate()+dayIndex);const date=day.toISOString().slice(0,10);
  const start=place.time==='Afternoon'?'14:00':place.time==='Evening'?'18:00':'09:00';const startDateTime=toIcsDate(date,start);const end=new Date(`${date}T${start}:00`);end.setMinutes(end.getMinutes()+90);const endDateTime=toIcsDate(end.toISOString().slice(0,10),end.toTimeString().slice(0,5));
  const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//TripSphere//Trip Planner//EN','BEGIN:VEVENT',`UID:${Date.now()}-${Math.random().toString(36).slice(2)}@tripsphere`,`DTSTAMP:${toIcsDate(new Date().toISOString().slice(0,10),'12:00')}`,`DTSTART:${startDateTime}`,`DTEND:${endDateTime}`,`SUMMARY:${esc(place.place)}`,`LOCATION:${esc(trip?.userSelection?.location?.label||'')}`,`DESCRIPTION:${esc(place.details||'TripSphere itinerary stop')}`,'END:VEVENT','END:VCALENDAR'].join('\r\n');
  const blob=new Blob([body],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`tripsphere-${place.place.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}.ics`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);return true;
}
