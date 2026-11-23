import React,{useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {CheckSquare,Trash2,X,Plus} from 'lucide-react';
import UserTripCardItem from './components/UserTripCardItem';
import {getTrips,deleteTrip,deleteTrips} from '@/service/TripStore';

function MyTrips(){
 const navigate=useNavigate();
 const [userTrips,setUserTrips]=useState([]);
 const [selectionMode,setSelectionMode]=useState(false);
 const [selected,setSelected]=useState([]);
 const refresh=()=>setUserTrips(getTrips());
 useEffect(refresh,[]);
 const toggle=(id)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
 const deleteOne=(trip)=>{
   const city=trip?.userSelection?.location?.label?.split(',')[0]||'this trip';
   if(window.confirm(`Delete the ${city} trip?\n\nThis saved trip will be removed from My Trips.`)){deleteTrip(trip.id);setSelected(s=>s.filter(id=>id!==trip.id));refresh();}
 };
 const deleteSelected=()=>{
   if(!selected.length)return;
   if(window.confirm(`Delete ${selected.length} selected trip${selected.length>1?'s':''}?\n\nThis cannot be undone.`)){deleteTrips(selected);setSelected([]);setSelectionMode(false);refresh();}
 };
 const cancelSelection=()=>{setSelected([]);setSelectionMode(false)};
 return <div className="planner-page">
   <div className="planner-head my-trips-head">
    <div><div className="eyebrow">YOUR TRAVEL HUB</div><h1>My Trips</h1><p>Saved AI plans and your travel history.</p></div>
    <div className="my-trips-actions">
      {!selectionMode?<><button className="secondary-btn trip-manage-btn" onClick={()=>setSelectionMode(true)}><CheckSquare size={15}/> Select trips</button><button className="primary-btn trip-new-btn" onClick={()=>navigate('/create-trip')}><Plus size={15}/> New trip</button></>:<><span className="selected-count">{selected.length} selected</span><button className="secondary-btn" onClick={cancelSelection}><X size={15}/> Cancel</button><button className="danger-btn trip-delete-selected" disabled={!selected.length} onClick={deleteSelected}><Trash2 size={15}/> Delete selected</button></>}
    </div>
   </div>
   {userTrips.length?<div className="my-trips-grid">{userTrips.map(trip=><UserTripCardItem trip={trip} key={trip.id} selectionMode={selectionMode} selected={selected.includes(trip.id)} onToggleSelect={toggle} onDelete={deleteOne}/>)}</div>:<div className="planner-card"><h3>No trips yet.</h3><p>Create your first smart trip with live events and journey tools.</p><button className="primary-btn" onClick={()=>navigate('/create-trip')}>Create smart trip →</button></div>}
 </div>
}
export default MyTrips;
