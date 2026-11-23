import React,{useMemo,useState} from 'react';
import {CreditCard,ShieldCheck,CheckCircle2,LockKeyhole,Smartphone,WalletCards,Landmark} from 'lucide-react';

const formatMoney=value=>Number(value||0).toLocaleString('en-IN');

export default function BookingPanel({trip}){
 const [open,setOpen]=useState(false); const [method,setMethod]=useState('UPI'); const [done,setDone]=useState(false); const [upi,setUpi]=useState(''); const [card,setCard]=useState({number:'',expiry:'',cvv:'',name:''});
 const destination=trip?.userSelection?.location?.label?.split(',')[0]||'Your trip';
 const travellers=trip?.userSelection?.traveler?.label||trip?.userSelection?.traveler||'Travellers';
 const amount=useMemo(()=>4850,[trip?.userSelection?.location?.label]);
 const bookingId=useMemo(()=>`TS${Date.now().toString().slice(-8)}`,[done]);
 const pay=()=>{setDone(true);const user=JSON.parse(localStorage.getItem('user')||'null');const booking={id:bookingId,user:user?.email||'guest',destination,total:amount,status:'CONFIRMED',method,createdAt:new Date().toISOString()};localStorage.setItem('lastBooking',JSON.stringify(booking));};
 return <section className="section-block booking-section"><div className="section-title"><div><div className="section-kicker"><LockKeyhole size={13}/> SECURE CHECKOUT</div><h2>Confirm your trip in a few steps.</h2><span>A realistic test checkout is included so the booking flow feels complete. No real payment gateway is connected.</span></div></div>
  <div className="checkout-card"><div className="checkout-summary"><div><small>Trip package</small><h3>{destination} Travel Plan</h3><p>{travellers} · itinerary + selected trip services</p></div><div className="checkout-total"><small>Test amount</small><strong>₹{formatMoney(amount)}</strong></div></div>
   <div className="checkout-trust"><ShieldCheck size={16}/><span>Secure checkout interface · test mode · no money is charged</span></div>
   <button className="primary-btn" onClick={()=>{setDone(false);setOpen(true)}}><CreditCard size={16}/> Continue to payment</button>
  </div>
  {open&&<div className="booking-modal" onClick={()=>setOpen(false)}><div className="checkout-modal" onClick={e=>e.stopPropagation()}>
   {done?<div className="checkout-success"><CheckCircle2 size={52}/><span className="success-pill">PAYMENT SUCCESSFUL · TEST</span><h2>Booking confirmed</h2><p>Your trip reservation has been created in this browser.</p><div className="confirm-ticket"><div><small>Booking ID</small><b>{bookingId}</b></div><div><small>Destination</small><b>{destination}</b></div><div><small>Payment method</small><b>{method}</b></div><div><small>Amount</small><b>₹{formatMoney(amount)}</b></div></div><button className="primary-btn" onClick={()=>setOpen(false)}>Done</button></div>:<>
    <div className="checkout-modal-head"><div><span className="secure-badge"><ShieldCheck size={14}/> Secure checkout</span><h2>Complete your booking</h2><p>Test payment flow — designed like a real checkout, without charging a card or UPI.</p></div><button className="modal-close" onClick={()=>setOpen(false)}>×</button></div>
    <div className="checkout-methods">{[['UPI',Smartphone],['Card',CreditCard],['Wallet',WalletCards],['Net Banking',Landmark]].map(([name,Icon])=><button key={name} className={`checkout-method ${method===name?'active':''}`} onClick={()=>setMethod(name)}><Icon size={17}/><b>{name}</b><small>{name==='UPI'?'Instant test':name==='Card'?'Visa / Mastercard':name==='Wallet'?'Wallet test':'Bank test'}</small></button>)}</div>
    {method==='UPI'&&<label className="field-label">UPI ID<input value={upi} onChange={e=>setUpi(e.target.value)} placeholder="name@bank" /></label>}
    {method==='Card'&&<div className="checkout-fields"><label className="field-label">Cardholder name<input value={card.name} onChange={e=>setCard({...card,name:e.target.value})} placeholder="Your name" /></label><label className="field-label">Card number<input value={card.number} onChange={e=>setCard({...card,number:e.target.value})} placeholder="4111 1111 1111 1111" inputMode="numeric" /></label><div className="field-row"><label className="field-label">Expiry<input value={card.expiry} onChange={e=>setCard({...card,expiry:e.target.value})} placeholder="MM/YY" /></label><label className="field-label">CVV<input value={card.cvv} onChange={e=>setCard({...card,cvv:e.target.value})} placeholder="123" inputMode="numeric" /></label></div></div>}
    {method==='Wallet'&&<div className="payment-placeholder"><WalletCards size={22}/><b>Wallet checkout</b><span>Selecting this option uses the TripSphere test wallet flow.</span></div>}
    {method==='Net Banking'&&<div className="payment-placeholder"><Landmark size={22}/><b>Net banking checkout</b><span>Select your bank in the next step. This test flow does not contact your bank.</span></div>}
    <div className="checkout-order"><span>Trip package</span><b>₹{formatMoney(amount)}</b></div><button className="primary-btn checkout-pay" onClick={pay}><LockKeyhole size={15}/> Pay ₹{formatMoney(amount)}</button>
   </>}
  </div></div>}
 </section>;
}
