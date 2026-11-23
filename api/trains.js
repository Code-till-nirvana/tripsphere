const STATIONS = {
  sehore:'SEH','sehore junction':'SEH',indore:'INDB','indore junction':'INDB',bhopal:'BPL','bhopal junction':'BPL',itarsi:'ET',
  ujjain:'UJN','ujjain junction':'UJN',dewas:'DWX',ratlam:'RTM','ratlam junction':'RTM',mhow:'MHOW',khandwa:'KNW',
  mumbai:'MMCT','mumbai central':'MMCT','mumbai csmt':'CSMT','thane':'TNA','kalyan':'KYN','kalyan junction':'KYN','vasai':'BSR',
  pune:'PUNE','pune junction':'PUNE','nagpur':'NGP','nagpur junction':'NGP','nashik':'NK','nashik road':'NK','aurangabad':'AWB','chhatrapati sambhajinagar':'AWB','kolhapur':'KOP','sangli':'SLI','miraj':'MRJ','solapur':'SUR','akola':'AK',
  delhi:'NDLS','new delhi':'NDLS','old delhi':'DLI','anand vihar':'ANVR','gurugram':'GGN','gurgaon':'GGN','noida':'ANVR',
  jaipur:'JP','jaipur junction':'JP','ajmer':'AII','kota':'KOTA','kota junction':'KOTA','jodhpur':'JU','udaipur':'UDZ','bikaner':'BKN','alwar':'AWR',
  ahmedabad:'ADI','ahmedabad junction':'ADI','surat':'ST','vadodara':'BRC','vadodara junction':'BRC','rajkot':'RJT','gandhinagar':'GNC','anand':'ANND',
  agra:'AGC','agra cantt':'AGC','mathura':'MTJ','gwalior':'GWL','jhansi':'JHS','prayagraj':'PRYJ','allahabad':'PRYJ','varanasi':'BSBS','varanasi junction':'BSB',
  lucknow:'LKO','kanpur':'CNB','kanpur central':'CNB','gorakhpur':'GKP','bareilly':'BE','meerut':'MTC','ghaziabad':'GZB','ayodhya':'AY','ayodhya dham':'AY',
  patna:'PNBE','gaya':'GAYA','muzaffarpur':'MFP','bhagalpur':'BGP','ranchi':'RNC','dhanbad':'DHN','bokaro':'BKSC',
  bhubaneswar:'BBS','cuttack':'CTC','puri':'PURI','kolkata':'HWH','howrah':'HWH','sealdah':'SDAH','durgapur':'DGR',
  chennai:'MAS','chennai central':'MAS','coimbatore':'CBE','madurai':'MDU','salem':'SA','tiruchirappalli':'TPJ','trichy':'TPJ',
  bengaluru:'SBC','bangalore':'SBC','yesvantpur':'YPR','mysuru':'MYS','mysore':'MYS',
  hyderabad:'SC','secunderabad':'SC','vijayawada':'BZA','visakhapatnam':'VSKP','vizag':'VSKP','tirupati':'TPTY',
  goa:'MAO','madgaon':'MAO','panaji':'MAO','kochi':'ERS','ernakulam':'ERS','kozhikode':'CLT','thiruvananthapuram':'TVC','trivandrum':'TVC',
  chandigarh:'CDG','amritsar':'ASR','ludhiana':'LDH','jalandhar':'JUC','patiala':'PTA','dehradun':'DDN','haridwar':'HW',
  jabalpur:'JBP','rewa':'REWA','satna':'STA','sagar':'SGO','bhilai':'BIA','raipur':'R','bilaspur':'BSP','rourkela':'ROU',
  jamshedpur:'TATA','guwahati':'GHY','silchar':'SCL','siliguri':'NJP','new jalpaiguri':'NJP','shillong':'GHY',
  vijayawada:'BZA','nellore':'NLR','guntur':'GNT','warangal':'WL','rajahmundry':'RJY',
  kochi:'ERS','ernakulam':'ERS','thrissur':'TCR','kottayam':'KTYM','kollam':'QLN'
};
function codeFor(value=''){
  const raw=String(value).trim();
  if(/^[A-Z]{2,5}$/.test(raw))return raw;
  const name=raw.split(',')[0].trim().toLowerCase();
  return STATIONS[name]||null;
}
function formatDate(value){const d=new Date(value);if(Number.isNaN(d.getTime()))return null;return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;}
function normalizeAvailability(av={}){
  return Object.entries(av).map(([cls,v])=>{
    const status=String(v?.availability||v?.status||v?.availabilityStatus||'Check live availability');
    const m=status.match(/(?:AVAILABLE-|AVL\s*[-:]?\s*)(\d+)/i); const seats=m?Number(m[1]):0;
    const fare=Number(v?.fare??v?.price??0)||null;
    return {class:cls,status,seats,fare,available:seats>0};
  });
}
function normalizeConfirm(payload){
 const list=payload?.data?.trainList||payload?.trains||payload?.data?.trains||[];
 return list.map((t,i)=>({id:t.trainNumber||t.trainNo||String(i),trainNumber:t.trainNumber||t.trainNo||'',trainName:t.trainName||t.name||'Indian Railways train',departure:t.departureTime||t.departure||t.depTime||'—',arrival:t.arrivalTime||t.arrival||t.arrTime||'—',duration:t.travelTime||t.duration||'—',classes:normalizeAvailability(t.availabilityCache||t.availability||{})}));
}
function normalizeIndianRail(payload){
 const list=payload?.data||payload?.trains||payload?.Trains||payload?.data?.trains||[];
 if(!Array.isArray(list)) return [];
 return list.map((t,i)=>({
   id:t.trainNumber||t.TrainNumber||t.trainNo||String(i),
   trainNumber:t.trainNumber||t.TrainNumber||t.trainNo||'',
   trainName:t.trainName||t.TrainName||t.name||'Indian Railways train',
   departure:t.departureTime||t.DepartureTime||t.DepTimeFrom||t.departure||'—',
   arrival:t.arrivalTime||t.ArrivalTime||t.ArrTimeTo||t.arrival||'—',
   duration:t.duration||t.Duration||t.travelTime||'—',
   classes:(t.availableClasses||t.TrainClassList||[]).map(c=>typeof c==='string'?{class:c,status:'Scheduled service',seats:0,fare:t.fare||null,available:false}:{class:c.Name||c.class||c.code||'Class',status:'Scheduled service',seats:0,fare:c.fare||t.fare||null,available:false})
 }));
}
function routeUrl(from,to){const a=String(from).split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');const b=String(to).split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');return `https://www.confirmtkt.com/trains/${a}-to-${b}-train-tickets`;}
function googleUrl(from,to,date){return `https://www.google.com/search?q=${encodeURIComponent(`${from} to ${to} trains ${date||''}`)}`;}
async function getJson(url,timeout=6500){const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'TripSphere/1.0'},signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
export default async function handler(req,res){
 const q=req.query||{};const from=q.from||'';const to=q.to||'';const fromCode=codeFor(from);const toCode=codeFor(to);const date=q.date||new Date().toISOString().slice(0,10);const formatted=formatDate(date);
 const base={from:fromCode||from,to:toCode||to,date:formatted||date,bookingUrl:routeUrl(from,to),searchUrl:googleUrl(from,to,date),updatedAt:new Date().toISOString()};
 if(!fromCode||!toCode||!formatted){return res.status(200).json({...base,live:false,fallback:true,trains:[],source:'Live rail search',error:'Station lookup is not available for this city yet. Use the live route search below.'});}
 if(fromCode===toCode)return res.status(400).json({live:false,trains:[],error:'Origin and destination railway stations must be different.'});
 // Query both public feeds concurrently so a sleeping or unavailable provider does not
 // block the other source for two sequential timeout windows.
 const [scheduleResult,availabilityResult]=await Promise.allSettled([
   getJson(`https://indian-railway-api.onrender.com/api/trains?from=${encodeURIComponent(fromCode)}&to=${encodeURIComponent(toCode)}&date=${encodeURIComponent(date)}`),
   getJson(`https://traininfo-diik.onrender.com/search?src=${encodeURIComponent(fromCode)}&dst=${encodeURIComponent(toCode)}&date=${encodeURIComponent(formatted)}`)
 ]);
 if(availabilityResult.status==='fulfilled'){
   const trains=normalizeConfirm(availabilityResult.value);
   if(trains.length)return res.status(200).json({...base,live:true,fallback:false,source:'Live train availability feed',trains});
 }
 if(scheduleResult.status==='fulfilled'){
   const trains=normalizeIndianRail(scheduleResult.value);
   if(trains.length)return res.status(200).json({...base,live:false,fallback:true,source:'Indian Railways timetable feed',trains,inventoryNote:'Scheduled trains found. Confirm current seats and fares with the booking provider.'});
 }
 return res.status(200).json({...base,live:false,fallback:true,source:'Live rail route search',trains:[],error:'Neither public train feed returned usable results. Check the route and travel date directly with the booking provider.'});
}
