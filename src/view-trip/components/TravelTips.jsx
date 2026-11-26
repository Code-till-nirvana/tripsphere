import { Backpack, Check } from 'lucide-react';

/* eslint-disable react/prop-types */
export default function TravelTips({ trip }) {
  const tips = (trip?.tripData?.tips || [])
    .map((tip) => typeof tip === 'string' ? tip : tip?.text || tip?.description)
    .filter(Boolean);

  if (!tips.length) return null;
  return <section className="section-block travel-tips-section">
    <div className="section-title"><div><div className="section-kicker"><Backpack size={14}/> BEFORE YOU GO</div><h2>Travel notes</h2><span>Useful reminders from your trip plan.</span></div></div>
    <ul className="travel-tips-list">{tips.map((tip, index) => <li key={`${index}-${tip}`}><span><Check size={15}/></span>{tip}</li>)}</ul>
  </section>;
}
