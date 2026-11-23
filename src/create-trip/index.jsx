import {Input} from '@/components/ui/input';
import {SelectTravelList} from '@/constants/options';
import React,{useMemo,useState} from 'react';
import GoogleAddressAutocomplete from '@/components/custom/GoogleAddressAutocomplete';
import {Button} from '@/components/ui/button';
import {toast} from 'sonner';
import {generateWithGemini} from '@/service/AIModel';
import {buildLocalTrip} from '@/service/TripBuilder';
import {saveTrip} from '@/service/TripStore';
import {AiOutlineLoading3Quarters} from 'react-icons/ai';
import {useNavigate} from 'react-router-dom';
import {CalendarDays,ChevronRight,Compass,MapPinned,Sparkles} from 'lucide-react';

const interests=['Food','Nature','History','Adventure','Nightlife','Shopping'];
const clean=v=>String(v||'').replace(/[^a-zA-Z\s–-]/g,'').trim();
export default function CreateTrip(){
 const [place,setPlace]=useState();const [origin,setOrigin]=useState();const [formData,setFormData]=useState({});const [loading,setLoading]=useState(false);const navigate=useNavigate();
 const handleInputChange=(name,value)=>setFormData(prev=>({...prev,[name]:value}));
 const destination=formData.location?.city||formData.location?.label?.split(',')[0]||'Your destination';
 const summary=useMemo(()=>({origin:formData.origin?.city||formData.origin?.label?.split(',')[0]||'Starting point',days:formData.noOfDays||'—',traveler:formData.traveler||'—'}),[formData]);
 const onGenerateTrip=async()=>{
  if(!formData.origin||!formData.location||!formData.noOfDays||!formData.traveler){toast('Complete the required trip details to continue.');return}
  if(Number(formData.noOfDays)>14){toast('Choose up to 14 days.');return}setLoading(true);
  try{
   const prompt=`Create concise practical travel tips for a trip from ${formData.origin?.label} to ${formData.location?.label} for ${formData.noOfDays} days, for ${formData.traveler}. Interests: ${(formData.interests||[]).join(', ')}. Return JSON only with a tips array.`;
   const ai=await generateWithGemini(prompt);
   const parsed=await buildLocalTrip({location:formData.location,days:formData.noOfDays,origin:formData.origin,traveler:formData.traveler,interests:formData.interests});
   if(ai?.tips?.length)parsed.tips=ai.tips;
   const docId=Date.now().toString();saveTrip({userSelection:formData,tripData:parsed,userEmail:'local@tripsphere.app',id:docId,createdAt:new Date().toISOString()});toast('Your TripSphere itinerary is ready.');navigate(`/view-trip/${docId}`)
  }catch(error){console.error(error);try{const parsed=await buildLocalTrip({location:formData.location,days:formData.noOfDays,origin:formData.origin,traveler:formData.traveler,interests:formData.interests});const docId=Date.now().toString();saveTrip({userSelection:formData,tripData:parsed,userEmail:'local@tripsphere.app',id:docId,createdAt:new Date().toISOString()});toast('Your trip was created.');navigate(`/view-trip/${docId}`)}catch{toast('We could not create this trip right now. Please try again.')}}finally{setLoading(false)}
 };
 return <div className="planner-page"><div className="planner-shell">
   <div className="planner-topline"><div><div className="eyebrow"><Compass size={14}/> TRIP PLANNER</div><h1>Build your trip with intention.</h1><p>Set the essentials. TripSphere will turn them into a practical day-by-day plan with routes, weather, live experiences and local discovery.</p></div><div className="planner-stepper"><span className="active">01</span><i/><span>02</span><i/><span>03</span><small>Plan · Explore · Travel</small></div></div>
   <div className="planner-layout"><main className="planner-form-card">
    <div className="form-section"><div className="form-section-head"><span>01</span><div><h2>Route & dates</h2><p>Where are you starting, where are you going, and when?</p></div></div><div className="planner-grid"><div><label className="field-label">Starting point</label><GoogleAddressAutocomplete value={origin} placeholder="Search a city or starting point" onChange={v=>{setOrigin(v);handleInputChange('origin',v)}}/><p className="helper">Used for live transport and route tools.</p></div><div><label className="field-label">Destination</label><GoogleAddressAutocomplete value={place} placeholder="Search your destination" onChange={v=>{setPlace(v);handleInputChange('location',v)}}/></div><div><label className="field-label">Start date</label><div className="input-with-icon"><CalendarDays size={16}/><Input type="date" value={formData.startDate||''} onChange={e=>handleInputChange('startDate',e.target.value)}/></div></div><div><label className="field-label">Trip length</label><div className="days-input"><Input placeholder="5" type="number" min="1" max="14" value={formData.noOfDays||''} onChange={e=>handleInputChange('noOfDays',e.target.value)}/><span>days</span></div></div></div></div>
    <div className="form-section"><div className="form-section-head"><span>02</span><div><h2>Travellers</h2><p>Shape the pace and recommendations around your group.</p></div></div><div className="choice-grid planner-choice-grid">{SelectTravelList.map(item=><button type="button" key={item.id} onClick={()=>handleInputChange('traveler',item.people)} className={`choice-card ${formData.traveler===item.people?'active':''}`}><span className="choice-index">0{item.id}</span><b>{clean(item.title)}</b><small>{item.desc}</small></button>)}</div></div>
    <div className="form-section last"><div className="form-section-head"><span>03</span><div><h2>Interests</h2><p>Select anything you want the itinerary to lean toward.</p></div></div><div className="interest-row planner-interests">{interests.map(item=>{const active=(formData.interests||[]).includes(item);return <button type="button" key={item} onClick={()=>handleInputChange('interests',active?(formData.interests||[]).filter(x=>x!==item):[...(formData.interests||[]),item])} className={`interest-chip ${active?'active':''}`}>{item}</button>})}</div></div>
    <div className="planner-submit"><div><b>Ready to plan?</b><span>Live events, route tools and real journey tracking will be available inside your trip.</span></div><Button className="generate-btn" disabled={loading} onClick={onGenerateTrip}>{loading?<><AiOutlineLoading3Quarters className="animate-spin"/> Building plan</>:<>Generate itinerary <ChevronRight size={17}/></>}</Button></div>
   </main>
   <aside className="planner-summary"><div className="summary-top"><span>TRIP BRIEF</span><MapPinned size={18}/></div><h3>{destination}</h3><p>{formData.location?.label||'Choose a destination to begin.'}</p><div className="summary-route"><div><small>FROM</small><b>{summary.origin}</b></div><ChevronRight size={15}/><div><small>TO</small><b>{destination}</b></div></div><div className="summary-grid"><div><small>DATES</small><b>{formData.startDate||'Not set'}</b></div><div><small>DURATION</small><b>{summary.days}{summary.days!=='—'?' days':''}</b></div><div><small>TRAVELLERS</small><b>{summary.traveler}</b></div></div><div className="summary-note"><Sparkles size={15}/><div><b>What you'll get</b><span>Day-by-day places, live events, weather, local discovery, real rail availability and live GPS tracking.</span></div></div></aside>
   </div>
 </div></div>;
}
