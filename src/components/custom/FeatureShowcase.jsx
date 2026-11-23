import React from 'react';
import { CalendarDays, Map, Sparkles, BusFront, ShieldCheck, Star, ArrowUpRight } from 'lucide-react';

const features=[
 ['Live experiences',CalendarDays,'Find concerts, workshops, comedy, markets and other public experiences around your destination.'],
 ['Smart transport',BusFront,'Compare flights, trains, buses and driving options with clear estimates and live-search links.'],
 ['Interactive planning',Map,'Turn your itinerary into a practical route with destination-aware stops and map links.'],
 ['Adaptive recommendations',Sparkles,'Your trip adapts to group size, interests, dates and the places you actually selected.'],
 ['Travel support',ShieldCheck,'Keep route details, weather, offline notes and useful safety information together.'],
 ['Trip support',ShieldCheck,'Keep live journey status, event discovery, weather, maps and practical trip tools together.']
];
const reviews=[
 ['Aarav Mehta','Weekend traveller','TripSphere helped me turn a vague idea into a realistic day-by-day plan without opening ten different tabs.','4.9'],
 ['Maya Sharma','Solo explorer','The destination-specific recommendations make the itinerary feel much more personal than a generic travel checklist.','5.0'],
 ['Rohan Kapoor','Frequent traveller','I like having routes, weather, local discovery and the itinerary together. It feels like a travel workspace.','4.8']
];
export default function FeatureShowcase(){return <>
 <section className="feature-section" id="features"><div className="section-heading"><span>More than an itinerary</span><h2>A travel workspace built around the whole journey.</h2><p>From the first destination search to the day you arrive, TripSphere keeps the important pieces together.</p></div><div className="feature-grid">{features.map(([title,Icon,text])=><article className="feature-card" key={title}><div className="feature-icon"><Icon size={21}/></div><h3>{title}</h3><p>{text}</p><a href="/create-trip">Explore feature <ArrowUpRight size={14}/></a></article>)}</div>
 <div className="section-heading comparison-heading"><span>Why TripSphere</span><h2>One place for the planning decisions that usually get scattered.</h2></div><div className="comparison-wrap"><div className="comparison-row comparison-head"><span>Capability</span><span>Basic travel app</span><span>Generic portal</span><span>TripSphere</span></div>{[['Day-by-day itinerary','Limited','✓','✓'],['Destination-aware places','—','Partial','✓'],['Live event discovery','—','Partial','✓'],['Weather-aware planning','—','✓','✓'],['Transport comparison','✓','✓','✓'],['Group & expense tools','—','Partial','✓'],['Offline trip copy','—','Partial','✓']].map(row=><div className="comparison-row" key={row[0]}>{row.map((x,i)=><span key={i} className={i===3?'check-cell':''}>{x}</span>)}</div>)}</div>
 </section>
 <section className="reviews-section" id="reviews"><div className="section-heading"><span>Traveller notes</span><h2>What travellers say about planning with TripSphere.</h2><p>Sample testimonials shown for the product interface.</p></div><div className="review-grid">{reviews.map(([name,role,text,rating],i)=><article className={`review-card review-${i+1}`} key={name}><div className="review-person"><div className="avatar">{name.split(' ').map(x=>x[0]).join('')}</div><div><b>{name}</b><small>{role}</small></div><span className="review-rating"><Star size={14} fill="currentColor"/> {rating}</span></div><div className="stars">★★★★★</div><p>“{text}”</p></article>)}</div></section>
 </>}
