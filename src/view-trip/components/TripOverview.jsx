/* eslint-disable react/prop-types */
import { CalendarDays, MapPin, Users, Clock3 } from 'lucide-react';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function TripOverview({ trip }) {
  const selection = trip?.userSelection || {};
  const destination = selection.location?.label || selection.location?.city;
  const origin = selection.origin?.label || selection.origin?.city;
  const days = Number(selection.noOfDays) || trip?.tripData?.itinerary?.length;
  const travellers = selection.traveler?.label || selection.traveler;
  const startDate = formatDate(selection.startDate);
  const items = [
    destination && { icon: MapPin, label: 'Destination', value: destination },
    origin && { icon: MapPin, label: 'Starting from', value: origin },
    days && { icon: Clock3, label: 'Duration', value: `${days} ${days === 1 ? 'day' : 'days'}` },
    startDate && { icon: CalendarDays, label: 'Starts', value: startDate },
    travellers && { icon: Users, label: 'Travellers', value: travellers },
  ].filter(Boolean);

  if (!items.length) return null;
  return <section className="trip-overview" aria-label="Trip overview">
    {items.map(({ icon: Icon, label, value }) => <div className="overview-item" key={label}>
      <span className="overview-icon"><Icon size={17} aria-hidden="true"/></span>
      <span className="overview-copy"><small>{label}</small><b>{value}</b></span>
    </div>)}
  </section>;
}
