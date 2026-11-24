import React from 'react';
import HotelCardItem from './HotelCardItem';
export default function Hotels({trip}){
 const destination=trip?.userSelection?.location?.label||'';
 const hotels=trip?.tripData?.hotel_options||[];
 return <section className="section-block"><div className="section-title"><div><div className="section-kicker">STAY OPTIONS</div><h2>Places to stay</h2><span>Real mapped accommodation near your destination. Check availability and rates with the provider.</span></div></div>
 {hotels.length?<div className="hotel-grid">{hotels.map(hotel=><HotelCardItem hotel={hotel} destination={destination} trip={trip} key={hotel.id||`${hotel.name}-${hotel.address}`}/>)}</div>:<div className="hotel-empty-state"><b>No verified hotel listings found</b><span>We couldn't confirm accommodation listings for this destination right now. Try Google Maps to explore nearby stays.</span><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('hotels in '+destination)}`} target="_blank" rel="noreferrer">Find hotels on Google Maps <ExternalLink size={13}/></a></div>}
 </section>;
}
