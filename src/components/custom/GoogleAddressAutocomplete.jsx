import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { searchLocations } from '@/service/LocationService';

export default function GoogleAddressAutocomplete({ value, onChange, placeholder = 'Search a city or destination' }) {
  const [query, setQuery] = useState(value?.label || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef();

  useEffect(() => setQuery(value?.label || ''), [value?.label]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const handleChange = (e) => {
    const next = e.target.value;
    setQuery(next); setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => setResults(await searchLocations(next)), 300);
  };

  const choose = (item) => { setQuery(item.label); setOpen(false); onChange?.({ label: item.label, city: item.city, country: item.country, location: { lat: item.latitude, lng: item.longitude }, source: 'geocoding' }); };

  return <div className="address-picker">
    <div className="address-input"><Search size={17}/><input value={query} onChange={handleChange} onFocus={() => query.length > 1 && setOpen(true)} placeholder={placeholder} autoComplete="off"/></div>
    {open && results.length > 0 && <div className="address-results">{results.map((item) => <button type="button" key={`${item.label}-${item.latitude}`} onMouseDown={(e)=>e.preventDefault()} onClick={()=>choose(item)}><MapPin size={16}/><span><b>{item.city}</b><small>{[item.admin1, item.country].filter(Boolean).join(', ') || item.label}</small></span></button>)}</div>}
  </div>;
}
