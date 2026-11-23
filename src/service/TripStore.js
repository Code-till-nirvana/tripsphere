const KEY='tripsphere_trips';
export function getTrips(){ try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []} }
export function saveTrip(trip){ const all=getTrips(); all.unshift(trip); localStorage.setItem(KEY,JSON.stringify(all)); return trip; }
export function getTrip(id){ return getTrips().find(t=>t.id===id)||null; }
export function updateTrip(id, patch){ const all=getTrips(); const index=all.findIndex(t=>t.id===id); if(index<0)return null; all[index]={...all[index],...patch,updatedAt:new Date().toISOString()}; localStorage.setItem(KEY,JSON.stringify(all)); return all[index]; }
export function deleteTrip(id){ const all=getTrips().filter(t=>t.id!==id); localStorage.setItem(KEY,JSON.stringify(all)); return true; }
export function deleteTrips(ids=[]){ const remove=new Set(ids); const all=getTrips().filter(t=>!remove.has(t.id)); localStorage.setItem(KEY,JSON.stringify(all)); return true; }
