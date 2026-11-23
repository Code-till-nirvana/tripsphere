import React,{useCallback,useEffect,useState} from 'react';
import {useParams} from 'react-router-dom';
import {toast} from 'sonner';
import {getTrip} from '@/service/TripStore';
import InfoSection from '../components/InfoSection';
import Hotels from '../components/Hotels';
import PlacesToVisit from '../components/PlacesToVisit';
import Footer from '../components/Footer';
import LiveEvents from '../components/LiveEvents';
import TransportComparison from '../components/TransportComparison';
import WeatherWidget from '../components/WeatherWidget';
import MapView from '../components/MapView';
import HotelComparison from '../components/HotelComparison';
import LiveTracking from '../components/LiveTracking';
import SmartTools from '../components/SmartTools';
import NeighborhoodDiscovery from '../components/NeighborhoodDiscovery';
import BookingPanel from '../components/BookingPanel';

function Viewtrip(){
 const {tripId}=useParams();const [trip,setTrip]=useState(null);const [weather,setWeather]=useState([]);
 useEffect(()=>{if(!tripId)return;const saved=getTrip(tripId);if(saved)setTrip(saved);else toast('No trip found. This demo stores trips in this browser.')},[tripId]);
 const onTripChange=useCallback((next)=>{if(next)setTrip(next)},[]);const onWeather=useCallback(data=>setWeather(data||[]),[]);
 if(!trip)return <div className="planner-page"><div className="planner-card">Loading your smart trip…</div></div>;
 return <div className="view-shell"><InfoSection trip={trip}/><div className="dashboard-grid"><div className="stat-card"><small>AI itinerary</small><b>{trip?.tripData?.itinerary?.length||trip?.userSelection?.noOfDays||0} days</b></div><div className="stat-card"><small>Hotels shortlisted</small><b>{trip?.tripData?.hotel_options?.length||0}</b></div><div className="stat-card"><small>Live experiences</small><b>Events + places</b></div><div className="stat-card"><small>Trip status</small><b className="score">Ready to travel</b></div></div><div className="trip-alert">Optimize routes, react to weather and keep live journey information together in one workspace.</div>
 <TransportComparison trip={trip}/><LiveEvents trip={trip}/><WeatherWidget trip={trip} onWeather={onWeather}/><MapView trip={trip} onTripChange={onTripChange}/><LiveTracking trip={trip}/><HotelComparison trip={trip}/><Hotels trip={trip}/><NeighborhoodDiscovery trip={trip}/><PlacesToVisit trip={trip} onTripChange={onTripChange} weather={weather}/><SmartTools trip={trip}/><BookingPanel trip={trip}/><Footer/></div>;
}
export default Viewtrip;
