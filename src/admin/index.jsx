import React from 'react';
import { BarChart3, BusFront, CalendarDays, Hotel, Users, IndianRupee, ShieldCheck, Activity } from 'lucide-react';

const cards=[['Total travellers','12,450',Users],['Bookings today','824',BusFront],['Gross booking value','₹4.8L',IndianRupee],['Active events','48',CalendarDays],['Hotels indexed','1,280',Hotel],['Live trips','126',Activity],['Safety reports','3',ShieldCheck],['AI plans generated','8,942',BarChart3]];
export default function Admin(){
 return <div className="planner-page"><div className="planner-head"><div className="eyebrow">OPERATIONS CONSOLE</div><h1>Travel platform dashboard</h1><p>A presentation-ready admin/operations view for the multi-sided platform.</p></div>
 <div className="dashboard-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>{cards.map(([t,v,I])=><div className="stat-card" key={t}><I size={18}/><small>{t}</small><b>{v}</b></div>)}</div>
 <div className="split-grid"><div className="expense-box"><h3>📈 Booking performance</h3><div className="route-map" style={{height:260,marginTop:15}}><div className="map-line" style={{top:'70%',left:'8%',right:'8%'}}/><div style={{position:'absolute',left:'8%',right:'8%',bottom:'30%',height:'40%',background:'linear-gradient(170deg,transparent 0 30%,#111 31% 32%,transparent 33%)',clipPath:'polygon(0 100%,12% 70%,25% 78%,40% 45%,55% 60%,68% 30%,82% 42%,100% 5%,100% 100%)'}}/></div></div>
 <div className="expense-box"><h3>🛡️ Operations checklist</h3><p>✓ Event feed connected</p><p>✓ Weather enrichment enabled</p><p>✓ Checkout flow enabled</p><p>✓ Price comparison module enabled</p><p>✓ Live GPS tracking enabled</p><p>○ Payment gateway can be connected when merchant credentials are available</p></div></div>
 </div>;
}
