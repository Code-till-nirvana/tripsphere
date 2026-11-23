import React from 'react';
import HotelCardItem from './HotelCardItem';
export default function Hotels({trip}){const destination=trip?.userSelection?.location?.label||'';return <section className="section-block"><div className="section-title"><div><div className="section-kicker">STAY OPTIONS</div><h2>Places to stay</h2><span>Accommodation ideas matched to your destination and travel style.</span></div></div><div className="hotel-grid">{(trip?.tripData?.hotel_options||[]).map((hotel,i)=><HotelCardItem hotel={hotel} destination={destination} key={i}/>)}</div></section>}
