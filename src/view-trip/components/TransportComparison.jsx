import React,{useMemo,useState} from 'react';
import {ArrowRightLeft,CheckCircle2,ChevronDown,ChevronUp,ExternalLink,Plane,TrainFront,BusFront,CarFront,RefreshCw,Ticket} from 'lucide-react';
import {buildTransportOptions,getLiveTrains} from '@/service/TravelApi';

const iconFor=(mode)=>mode==='Flight'?<Plane/>:mode==='Train'?<TrainFront/>:mode==='Bus'?<BusFront/>:<CarFront/>;
const addDays=(date,days)=>{const d=new Date(`${date||new Date().toISOString().slice(0,10)}T12:00:00`);d.setDate(d.getDate()+days);return d.toISOString().slice(0,10)};

function TrainResults({from,to,date}){
 const [expanded,setExpanded]=useState(false);
 const [loaded,setLoaded]=useState(false);
 const [state,setState]=useState({loading:false,trains:[],live:false,fallback:false,error:'',bookingUrl:'',searchUrl:'',source:''});
 const load=async()=>{setState(s=>({...s,loading:true,error:''}));try{const r=await getLiveTrains({from,to,date});setState({loading:false,trains:r?.trains||[],live:Boolean(r?.live),fallback:Boolean(r?.fallback),error:r?.error||'',bookingUrl:r?.bookingUrl||'',searchUrl:r?.searchUrl||'',source:r?.source||''});}catch{setState(s=>({...s,loading:false,error:'Train information is temporarily unavailable.'}));}setLoaded(true)};
 const toggle=()=>{const next=!expanded;setExpanded(next);if(next&&!loaded&&!state.loading)load();};
 const fallback=state.fallback;
 return <div className="live-rail-panel">
  <button type="button" className="live-rail-toggle" aria-expanded={expanded} onClick={toggle}>
   <span className="live-rail-toggle-icon"><Ticket size={15}/></span>
   <span className="live-rail-toggle-copy"><b>Check available trains</b><small>{from} → {to} · {date ? new Date(`${date}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : 'Select a travel date'}</small></span>
   <span className="live-rail-toggle-action">{expanded?'Hide trains':'Show trains'} {expanded?<ChevronUp size={17}/>:<ChevronDown size={17}/>}</span>
  </button>
  {expanded&&<div className="live-rail-content">
   <div className="live-rail-head"><div><span className="section-kicker">LIVE RAIL INVENTORY</span><p>{state.source||'Indian Railways · checking public train feeds'}</p></div><button className="small-btn" onClick={load} disabled={state.loading}><RefreshCw size={12} className={state.loading?'spin':''}/> Refresh</button></div>
   {state.loading?<div className="rail-loading">Checking trains for this route and date…</div>:state.trains.length?<div className="rail-results">{state.trains.slice(0,8).map((t,i)=><article className="rail-card" key={t.id||t.trainNumber||i}><div className="rail-main"><div><span className="rail-number">{t.trainNumber||'TRAIN'}</span><h5>{t.trainName}</h5></div><div className="rail-times"><b>{t.departure}</b><span>→</span><b>{t.arrival}</b><small>{t.duration}</small></div></div>{t.classes?.length>0&&<div className="rail-classes">{t.classes.slice(0,5).map((c,j)=><span key={c.class||j} className={c.available?'available':'waitlist'}><b>{c.class}</b> {c.status||'Check live availability'} {!fallback&&c.fare? `· ₹${Number(c.fare).toLocaleString()}`:''}</span>)}</div>}<a className="rail-book" href={state.bookingUrl||'https://www.confirmtkt.com/rbooking/'} target="_blank" rel="noreferrer">{fallback?'Check live seats & book':'Book / verify availability'} <ExternalLink size={12}/></a></article>)}</div>:<div className="rail-search-box"><div><b>No verified train results returned</b><span>{state.error||'The public train feeds did not return a usable timetable. We are not displaying invented train names or seat availability.'}</span></div><div className="rail-search-actions"><a className="small-btn" href={state.bookingUrl||'https://www.confirmtkt.com/rbooking/'} target="_blank" rel="noreferrer">Check trains & seats <ExternalLink size={12}/></a>{state.searchUrl&&<a className="small-btn ghost-btn" href={state.searchUrl} target="_blank" rel="noreferrer">Search route <ExternalLink size={12}/></a>}</div></div>}
   {fallback&&<div className="rail-fallback-note">These are scheduled services, not confirmed seat availability. Verify seats and fares with the booking provider.</div>}
   {!state.loading&&<div className="rail-source">{state.live?'Live availability feed responded; seats and fares may change.':state.trains.length?'Timetable results returned; seat availability must be verified with the provider.':'External provider links are available; no live inventory was confirmed.'}</div>}
  </div>}
 </div>
}
export default function TransportComparison({trip}){
 const [selected,setSelected]=useState('Flight');
 const from=trip?.userSelection?.origin?.label||'Your starting point'; const to=trip?.userSelection?.location?.label||'Destination';
 const startDate=trip?.userSelection?.startDate||new Date().toISOString().slice(0,10); const days=Number(trip?.userSelection?.noOfDays||1);
 const outbound=useMemo(()=>buildTransportOptions(from,to,trip?.userSelection?.origin?.location,trip?.userSelection?.location?.location),[from,to,trip]);
 const returning=useMemo(()=>buildTransportOptions(to,from,trip?.userSelection?.location?.location,trip?.userSelection?.origin?.location),[from,to,trip]);
 const group=(title,options,returningMode=false)=><div className="journey-group transport-group"><div className="journey-heading"><div><span className="section-kicker"><ArrowRightLeft size={13}/> {title}</span><h3>{returningMode?to:from} <b>→</b> {returningMode?from:to}</h3></div><span className="route-distance">{options[0]?.distanceKm?.toLocaleString()||'—'} km road approx.</span></div><div className="transport-cards">{options.map(o=><article className={`transport-card ${selected===`${title}-${o.mode}`?'selected':''}`} key={o.mode} onClick={()=>setSelected(`${title}-${o.mode}`)}><div className="transport-icon">{iconFor(o.mode)}</div><div className="transport-main"><div className="transport-top"><div><span className="transport-mode">{o.mode}</span><small>{o.provider}</small></div><span className="transport-badge">{o.badge}</span></div><div className="transport-stats"><span>◷ {o.duration}</span><span>{o.priceLabel}</span><span>{o.source}</span></div><div className="transport-actions"><a href={o.url} target="_blank" rel="noreferrer" className="small-btn">Open live provider <ExternalLink size={12}/></a>{selected===`${title}-${o.mode}`&&<span className="selected-mark"><CheckCircle2 size={16}/> Selected</span>}</div></div></article>)}</div><TrainResults from={returningMode?to:from} to={returningMode?from:to} date={returningMode?addDays(startDate,Math.max(0,days-1)):startDate}/></div>;
 return <section className="section-block transport-section"><div className="section-title"><div><div className="section-kicker">SMART TRANSPORT</div><h2>Plan the journey, not just the destination.</h2><span>Compare travel options. Expand train search only when you need it.</span></div></div>{group('Outbound',outbound)}{group('Return',returning,true)}</section>;
}
