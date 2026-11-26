import {useCallback,useEffect,useState} from 'react';
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
import TripOverview from '../components/TripOverview';
import TravelTips from '../components/TravelTips';
import { Link } from 'react-router-dom';

function Viewtrip(){
 const {tripId}=useParams();const [trip,setTrip]=useState(null);const [weather,setWeather]=useState([]);const [loaded,setLoaded]=useState(false);
 useEffect(()=>{setLoaded(false);if(!tripId)return;const saved=getTrip(tripId);if(saved)setTrip(saved);else toast('No trip found. This demo stores trips in this browser.');setLoaded(true)},[tripId]);
 const onTripChange=useCallback((next)=>{if(next)setTrip(next)},[]);const onWeather=useCallback(data=>setWeather(data||[]),[]);
 if(!trip)return <div className="view-shell">{loaded?<div className="trip-state"><div className="section-kicker">TRIP UNAVAILABLE</div><h1>We couldn’t find this trip</h1><p>Trips are saved in the browser where they were created. Open your saved trips or start a new plan.</p><div><Link className="primary-btn" to="/my-trips">View my trips</Link><Link className="secondary-btn" to="/create-trip">Plan a trip</Link></div></div>:<div className="trip-state" role="status">Loading your trip…</div>}<Footer/></div>;
 return <div className="view-shell"><InfoSection trip={trip}/><TripOverview trip={trip}/><PlacesToVisit trip={trip} onTripChange={onTripChange} weather={weather}/><MapView trip={trip} onTripChange={onTripChange}/><WeatherWidget trip={trip} onWeather={onWeather}/><TravelTips trip={trip}/><TransportComparison trip={trip}/><LiveEvents trip={trip}/><NeighborhoodDiscovery trip={trip}/><HotelComparison trip={trip}/><Hotels trip={trip}/><LiveTracking trip={trip}/><SmartTools trip={trip}/><BookingPanel trip={trip}/><Footer/></div>;
}
export default Viewtrip;
