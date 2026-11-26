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
  'nellore':'NLR','guntur':'GNT','warangal':'WL','rajahmundry':'RJY',
  'thrissur':'TCR','kottayam':'KTYM','kollam':'QLN'
};
function codeFor(value=''){
  const raw=String(value).trim();
  if(/^[A-Z]{2,5}$/.test(raw))return raw;
  const name=raw.split(',')[0].trim().toLowerCase();
  return STATIONS[name]||null;
}
function formatDate(value){
 const match=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if(match)return `${match[3]}-${match[2]}-${match[1]}`;
 const d=new Date(value);if(Number.isNaN(d.getTime()))return null;
 return `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
}
function normalizeClassCode(value){
  const text=String(value||'').toUpperCase().replace(/\s+/g,' ').trim();
  const code=text.match(/^(1A|2A|3A|3E|SL)(?:\b|[^A-Z0-9])/);
  if(code)return code[1];
  if(/FIRST\s*AC|AC\s*FIRST/.test(text))return '1A';
  if(/SECOND\s*AC|AC\s*2(?:ND)?\s*TIER/.test(text))return '2A';
  if(/THIRD\s*AC|AC\s*3(?:RD)?\s*TIER/.test(text))return '3A';
  if(/3\s*ECONOMY|AC\s*3\s*ECONOMY/.test(text))return '3E';
  if(/SLEEPER/.test(text))return 'SL';
  return text.replace(/\s/g,'');
}
function normalizeAvailability(av={}){
  const rows=Array.isArray(av)
    ? av.map((value,index)=>[typeof value==='string'?value:value?.class||value?.classCode||value?.className||value?.classType||value?.code||value?.Name||String(index),value])
    : Object.entries(av&&typeof av==='object'?av:{});
  return rows.map(([key,value])=>{
    const item=value&&typeof value==='object'?value:{};
    const cls=normalizeClassCode(item.class||item.classCode||item.className||item.classType||item.code||item.Name||item.Class||key);
    const rawStatus=typeof value==='string'&&normalizeClassCode(value)===cls?null:(typeof value==='string'?value:(item.availability||item.status||item.availabilityStatus||item.currentStatus||item.seatStatus));
    const status=!rawStatus||/check live availability/i.test(String(rawStatus))?'Availability not returned':String(rawStatus);
    const m=status.match(/(?:AVAILABLE-|AVL\s*[-:]?\s*)(\d+)/i);
    const seats=m?Number(m[1]):Number(item.seatsAvailable??item.availableSeats??item.seats??0)||0;
    const fare=Number(item.fare??item.price??item.amount??item.totalFare??(typeof value==='number'?value:null))||null;
    return {class:cls,status,seats,fare,available:seats>0};
  }).filter((item)=>/^(1A|2A|3A|3E|SL)$/.test(item.class));
}
function trainClasses(train={}){
  const candidates=[train.classes,train.classAvailability,train.classWiseAvailability,train.availabilityCache,train.availability,train.fareDetails,train.fares,train.availableClasses,train.TrainClassList];
  const merged=new Map();
  for(const value of candidates){
    for(const item of normalizeAvailability(value)){
      const old=merged.get(item.class)||{};
      merged.set(item.class,{...old,...item,
        status:item.status==='Availability not returned'?(old.status||item.status):item.status,
        fare:item.fare??old.fare,
        seats:item.seats||old.seats,
        available:item.available||old.available
      });
    }
  }
  return [...merged.values()];
}
function normalizeConfirm(payload){
 const list=payload?.data?.trainList||payload?.trains||payload?.data?.trains||[];
 return Array.isArray(list)?list.map((t,i)=>({id:t.trainNumber||t.trainNo||String(i),trainNumber:t.trainNumber||t.trainNo||'',trainName:t.trainName||t.name||'Indian Railways train',departureStation:t.departureStation||t.fromStationName||t.sourceStation||'',arrivalStation:t.arrivalStation||t.toStationName||t.destinationStation||'',departure:t.departureTime||t.departure||t.depTime||'—',arrival:t.arrivalTime||t.arrival||t.arrTime||'—',duration:t.travelTime||t.duration||'—',classes:trainClasses(t)})):[];
}
function normalizeIndianRail(payload){
 const list=payload?.data||payload?.trains||payload?.Trains||payload?.data?.trains||[];
 if(!Array.isArray(list)) return [];
 return list.map((t,i)=>({
   id:t.trainNumber||t.TrainNumber||t.trainNo||String(i),
   trainNumber:t.trainNumber||t.TrainNumber||t.trainNo||'',
   trainName:t.trainName||t.TrainName||t.name||'Indian Railways train',
   departureStation:t.departureStation||t.FromStationName||t.sourceStation||'',
   arrivalStation:t.arrivalStation||t.ToStationName||t.destinationStation||'',
   departure:t.departureTime||t.DepartureTime||t.DepTimeFrom||t.departure||'—',
   arrival:t.arrivalTime||t.ArrivalTime||t.ArrTimeTo||t.arrival||'—',
   duration:t.duration||t.Duration||t.travelTime||'—',
   classes:trainClasses(t)
 }));
}
function routeUrl(from,to,date){
 const a=String(from).split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');
 const b=String(to).split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g,'-');
 const params=new URLSearchParams();
 if(date){params.set('date',date);params.set('journeyDate',date);params.set('doj',date);}
 return `https://www.confirmtkt.com/trains/${a}-to-${b}-train-tickets?${params.toString()}`;
}
function googleUrl(from,to,date){
 const params=new URLSearchParams({q:`${from} to ${to} trains on ${date||''} seat availability`});
 return `https://www.google.com/search?${params.toString()}`;
}
async function getJson(url,timeout=6500){const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'TripSphere/1.0'},signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json();}
export default async function handler(req,res){
 const q=req.query||{};const from=q.from||'';const to=q.to||'';const fromCode=codeFor(from);const toCode=codeFor(to);const indiaDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const date=q.date||indiaDate;const formatted=formatDate(date);
 const base={from:fromCode||from,to:toCode||to,date:formatted||date,bookingUrl:routeUrl(from,to,formatted),searchUrl:googleUrl(from,to,formatted),updatedAt:new Date().toISOString()};
 if(!fromCode||!toCode||!formatted){return res.status(200).json({...base,live:false,fallback:true,trains:[],source:'Rail schedule search',error:'Station lookup is not available for this city yet. Use the official rail search below.'});}
 if(fromCode===toCode)return res.status(400).json({live:false,trains:[],error:'Origin and destination railway stations must be different.'});
 // Query both public feeds concurrently so a sleeping or unavailable provider does not
 // block the other source for two sequential timeout windows.
 const [scheduleResult,availabilityResult]=await Promise.allSettled([
   getJson(`https://indian-railway-api.onrender.com/api/trains?from=${encodeURIComponent(fromCode)}&to=${encodeURIComponent(toCode)}&date=${encodeURIComponent(date)}`),
   getJson(`https://traininfo-diik.onrender.com/search?src=${encodeURIComponent(fromCode)}&dst=${encodeURIComponent(toCode)}&date=${encodeURIComponent(formatted)}`)
 ]);
 if(availabilityResult.status==='fulfilled'){
   const trains=normalizeConfirm(availabilityResult.value);
   if(trains.length)return res.status(200).json({...base,live:false,fallback:true,source:'Third-party train feed (unverified)',inventoryNote:'Returned records are not verified against official station stops, fares or seat inventory. Confirm with the official railway service.',trains});
 }
 if(scheduleResult.status==='fulfilled'){
   const trains=normalizeIndianRail(scheduleResult.value);
   if(trains.length)return res.status(200).json({...base,live:false,fallback:true,source:'Third-party timetable feed (unverified)',trains,inventoryNote:'Schedule records are not verified against official station stops, fares or seat inventory. Confirm with the official railway service.'});
 }
 return res.status(200).json({...base,live:false,fallback:true,source:'Rail route search',trains:[],error:'Neither third-party schedule feed returned usable results. Check the route and travel date directly with the official railway service.'});
}
