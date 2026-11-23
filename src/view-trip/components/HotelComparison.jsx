import React, { useMemo, useState } from 'react';
import { buildHotelComparisons } from '@/service/TravelApi';

export default function HotelComparison({trip}) {
 const hotels=useMemo(()=>buildHotelComparisons(trip?.tripData?.hotel_options||[]),[trip]);
 const [chosen,setChosen]=useState(null);
 return <div className="section-block"><div className="section-title"><div><h2>Hotel price comparison 🏨</h2><span>Same property compared across multiple rate sources.</span></div></div>
 <div className="hotel-comparison">{hotels.map((h,i)=><div className="compare-card" key={i}><h3>{h.name}</h3><small style={{color:'#777'}}>{h.address}</small>{h.sources.map(s=><div className="compare-source" key={s.name}><span>{s.name}</span><b>{s.price}</b></div>)}<div className="best-rate">Best estimated rate: {h.bestRate}</div><button className="small-btn dark-btn" style={{marginTop:10}} onClick={()=>setChosen(h)}>Select stay</button></div>)}</div>
 {chosen&&<div className="booking-modal" onClick={()=>setChosen(null)}><div className="modal-card" onClick={e=>e.stopPropagation()}><h2>Reserve {chosen.name}</h2><p>Review the stay and continue to secure test checkout.</p><div className="modal-options"><div className="payment-choice active"><b>Flexible</b><small>Free cancellation option</small></div><div className="payment-choice"><b>Best price</b><small>{chosen.bestRate}</small></div></div><button className="primary-btn" style={{marginTop:18}} onClick={()=>{localStorage.setItem('pendingBooking',JSON.stringify({type:'hotel',name:chosen.name,price:chosen.bestRate}));setChosen(null);setTimeout(()=>document.querySelector('.booking-section')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}}>Continue to checkout →</button></div></div>}
 </div>
}
