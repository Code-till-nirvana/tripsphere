import React from 'react';
import { ArrowRight, CalendarDays, Compass, MapPin, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import FeatureShowcase from './FeatureShowcase';
import Footer from '@/view-trip/components/Footer';

export default function Hero(){
 const navigate=useNavigate();
 return <div className="home-shell">
  <section className="hero-modern"><div className="hero-copy"><div className="eyebrow"><Sparkles size={15}/> AI TRAVEL PLANNING</div><h1>Plan less.<br/><span>Experience more.</span></h1><p>TripSphere turns a destination, a few preferences and your dates into a practical journey with day-by-day places, transport, weather and local experiences.</p><div className="hero-actions"><button className="primary-btn" onClick={()=>navigate('/create-trip')}>Start planning <ArrowRight size={18}/></button><button className="ghost-btn" onClick={()=>navigate('/my-trips')}>My trips</button></div><div className="trust-row"><span><CalendarDays size={15}/> Day-by-day plans</span><span><MapPin size={15}/> Local discovery</span><span><Compass size={15}/> Smart routes</span></div></div>
   <div className="hero-visual"><div className="hero-image-card"><img src="https://images.unsplash.com/photo-1526772662000-3f88f10405ff?auto=format&fit=crop&w=1400&q=85" alt="Travel planning with a map"/><div className="hero-image-shade"/><div className="hero-ui-card"><span className="mini-icon"><Sparkles size={16}/></span><div><b>Build your journey</b><small>Places · routes · weather · experiences</small></div></div><div className="hero-destination"><small>TRIPSPHERE PLAN</small><strong>One destination. Many possibilities.</strong></div></div></div>
  </section><FeatureShowcase/><Footer/>
 </div>;
}
