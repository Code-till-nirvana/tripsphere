import React,{useEffect,useMemo,useState} from 'react';
import {CalendarDays,ExternalLink,MapPin,RefreshCw,Sparkles,BadgeCheck,Search,Music,Palette,PartyPopper,Drama,Trophy,GraduationCap,Utensils,BriefcaseBusiness,Heart,SlidersHorizontal} from 'lucide-react';
import {getLiveEvents} from '@/service/TravelApi';

const CATEGORIES=[
 {id:'all',label:'All events',icon:Sparkles},
 {id:'music',label:'Music',icon:Music},
 {id:'comedy',label:'Comedy & Stand-up',icon:Drama},
 {id:'arts',label:'Arts & Culture',icon:Palette},
 {id:'exhibitions',label:'Exhibitions',icon:Palette},
 {id:'dance',label:'Dance & Parties',icon:PartyPopper},
 {id:'festivals',label:'Festivals',icon:Sparkles},
 {id:'sports',label:'Sports',icon:Trophy},
 {id:'theatre',label:'Theatre',icon:Drama},
 {id:'workshops',label:'Workshops',icon:GraduationCap},
 {id:'food',label:'Food & Drink',icon:Utensils},
 {id:'business',label:'Business',icon:BriefcaseBusiness},
 {id:'family',label:'Family & Kids',icon:Heart},
 {id:'parties',label:'Parties',icon:PartyPopper},
 {id:'performances',label:'Performances',icon:Drama},
];

function sameDay(date,target){return String(date||'').slice(0,10)===String(target||'').slice(0,10)}
function thisWeekend(date){
 const d=new Date(`${date}T12:00:00`); if(Number.isNaN(d.getTime()))return false;
 const day=d.getDay(); return day===0||day===6;
}
function displayDate(value){try{return new Date(`${value}T12:00:00`).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}catch{return value}}

export default function LiveEvents({trip}){
 const location=trip?.userSelection?.location; const city=location?.label||'';
 const startDate=trip?.userSelection?.startDate; const endDate=trip?.userSelection?.endDate;
 const [category,setCategory]=useState('all');
 const [dateFilter,setDateFilter]=useState('trip');
 const [query,setQuery]=useState(''); const [submittedQuery,setSubmittedQuery]=useState('');
 const [data,setData]=useState({events:[],live:false,source:'',message:''}); const [loading,setLoading]=useState(true);
 const load=async({nextCategory=category,search=submittedQuery,nextDateFilter=dateFilter}={})=>{
   setLoading(true);
   const localDate=new Date();
   const today=`${localDate.getFullYear()}-${String(localDate.getMonth()+1).padStart(2,'0')}-${String(localDate.getDate()).padStart(2,'0')}`;
   let requestStart=startDate, requestEnd=endDate;
   if(nextDateFilter==='today'){requestStart=today;requestEnd=today;}
   if(nextDateFilter==='weekend'){
     const day=localDate.getDay();
     const daysToSaturday=day===6?0:day===0?-1:6-day;
     const saturday=new Date(localDate);saturday.setDate(localDate.getDate()+daysToSaturday);
     const sunday=new Date(saturday);sunday.setDate(saturday.getDate()+1);
     const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
     requestStart=fmt(saturday);requestEnd=fmt(sunday);
   }
   try{
     const result=await getLiveEvents({city,startDate:requestStart,endDate:requestEnd,category:nextCategory,search});
     setData(result||{events:[],live:false,message:'Event listings are temporarily unavailable.'});
   }catch(error){
     setData({events:[],live:false,source:'Event search',message:'We could not load event listings right now. Please try again.'});
   }finally{setLoading(false);}
 };
 useEffect(()=>{setCategory('all');setSubmittedQuery('');setQuery('');load({nextCategory:'all',search:''})},[city,startDate,endDate]);
 const cityName=city.split(',')[0]||'your destination';
 const filtered=useMemo(()=>{
   let events=(data.events||[]).filter(e=>!e.directory);
   if(dateFilter==='today'){
     const today=new Date().toISOString().slice(0,10); events=events.filter(e=>sameDay(e.date,today));
   } else if(dateFilter==='weekend') events=events.filter(e=>thisWeekend(e.date));
   return events;
 },[data.events,dateFilter]);
 const chooseCategory=(id)=>{setCategory(id);setSubmittedQuery('');setQuery('');setDateFilter('trip');load({nextCategory:id,search:'',nextDateFilter:'trip'})};
 const search=(e)=>{e?.preventDefault();const value=query.trim();setSubmittedQuery(value);setCategory('all');setDateFilter('trip');load({nextCategory:'all',search:value,nextDateFilter:'trip'})};
 const chooseDateFilter=(value)=>{setDateFilter(value);load({nextDateFilter:value})};
 return <section className="section-block events-section">
   <div className="section-title events-title-row"><div><div className="section-kicker"><Sparkles size={13}/> LIVE EXPERIENCES</div><h2>What's actually happening in {cityName}?</h2><span>Discover real local concerts, stand-up, exhibitions, festivals, sports and more — right inside TripSphere.</span></div><button className="small-btn" onClick={()=>load()} disabled={loading}><RefreshCw size={12} className={loading?'spin':''}/> Refresh</button></div>

   <div className="event-discovery-shell">
    <form className="event-searchbar" onSubmit={search}><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={`Search events in ${cityName} — e.g. standup, garba, concert...`}/>{query&&<button type="button" className="event-search-clear" onClick={()=>{setQuery('');setSubmittedQuery('');load({nextCategory:category,search:''})}}>×</button>}<button type="submit" className="event-search-submit"><Search size={14}/> Search</button></form>
    <div className="event-filter-label"><SlidersHorizontal size={13}/> Explore categories</div>
    <div className="event-category-scroller">{CATEGORIES.map(({id,label,icon:Icon})=><button key={id} className={`event-category-chip ${category===id&&!submittedQuery?'active':''}`} onClick={()=>chooseCategory(id)}><Icon size={14}/>{label}</button>)}</div>
    <div className="event-date-filters"><span>When</span><button className={dateFilter==='trip'?'active':''} onClick={()=>chooseDateFilter('trip')}>My trip dates</button><button className={dateFilter==='today'?'active':''} onClick={()=>chooseDateFilter('today')}>Today</button><button className={dateFilter==='weekend'?'active':''} onClick={()=>chooseDateFilter('weekend')}>Weekend</button></div>
   </div>

   <div className="events-results-heading"><div><b>{submittedQuery?`Results for “${submittedQuery}”`:CATEGORIES.find(c=>c.id===category)?.label||'Events'} in {cityName}</b><span>{filtered.length ? `${filtered.length} verified event listing${filtered.length===1?'':'s'} shown` : loading ? 'Finding current listings…' : 'No verified listings for this selection'}</span></div>{data.updatedAt&&filtered.length>0&&<small><BadgeCheck size={11}/> Updated live</small>}</div>

   {loading?<div className="events-grid event-skeletons">{[1,2,3,4,5,6].map(i=><div className="event-card skeleton-card" key={i}><div/><div className="event-body"><div className="skeleton-line short"/><div className="skeleton-line"/><div className="skeleton-line medium"/></div></div>)}
   </div>:filtered.length?<div className="events-grid">{filtered.map(event=><article className={`event-card ${event.directory?'event-directory-card':''}`} key={event.id}><img src={event.image||'/placeholder.jpg'} alt={event.name}/><div className="event-body"><span className="event-category">{event.category||'LIVE EVENT'}</span><h3>{event.name}</h3><p><CalendarDays size={13}/> {event.directory?'Directory link · not an individual event':`${displayDate(event.date)} · ${event.time}`}</p><p><MapPin size={13}/> {event.venue||'Venue listed by organiser'}</p><div className="event-bottom"><b>{event.price||'See organiser'}</b><a href={event.url} target="_blank" rel="noreferrer">{event.directory?'Explore live listings':'View listing'} <ExternalLink size={12}/></a></div><small className="live-source-label"><BadgeCheck size={11}/> {event.source||data.source}</small></div></article>)}</div>:<div className="event-smart-empty"><div className="event-empty-mark"><CalendarDays size={18}/></div><div><b>{submittedQuery?'No events match your search.':`No ${CATEGORIES.find(c=>c.id===category)?.label?.toLowerCase()||'event'} found in ${cityName} for these dates.`}</b><span>There are no verified individual listings to show right now. Try different dates or explore all events.</span><div className="event-empty-actions"><button type="button" onClick={()=>chooseDateFilter('trip')}>Try trip dates</button><button type="button" onClick={()=>chooseCategory('all')}>Explore all events</button></div></div></div>}

   <div className="events-feed-note"><BadgeCheck size={15}/><div><b>Live local discovery</b><span>{data.message||'Listings are fetched from public event providers for this city and trip date range.'}</span></div></div>
 </section>;
}
