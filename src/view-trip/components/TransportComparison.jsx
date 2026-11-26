import { useEffect, useMemo, useRef, useState } from 'react';
/* eslint-disable react/prop-types */
import {
  ArrowLeftRight, BusFront, CarFront, Check, Clock3, Copy, ExternalLink,
  Plane, RefreshCw, Route, TrainFront, Users
} from 'lucide-react';
import GoogleAddressAutocomplete from '@/components/custom/GoogleAddressAutocomplete';
import { buildProviderSearchUrl, getLiveTrains, getRoadRoute } from '@/service/TravelApi';
import { buildComparisonOptions, estimateVehicleCost, formatTravelDuration, rankTravelOptions } from '@/service/TravelComparison';
import { addCalendarDays, formatIndiaCalendarDate, formatRailSearchDetails, getIndiaCalendarDate, normalizeCalendarDate } from '@/service/TravelSearch';

const TRAIN_CLASSES = ['1A', '2A', '3A', 'SL', '3E'];
const BUS_TYPES = ['Any type', 'AC Sleeper', 'Non-AC Sleeper', 'AC Seater', 'Volvo / Premium AC'];
const VEHICLES = {
  petrol: { efficiencyLabel: 'Efficiency (km/l)', priceLabel: 'Fuel price (₹/litre)' },
  diesel: { efficiencyLabel: 'Efficiency (km/l)', priceLabel: 'Fuel price (₹/litre)' },
  cng: { efficiencyLabel: 'Efficiency (km/kg)', priceLabel: 'CNG price (₹/kg)' },
  electric: { efficiencyLabel: 'Consumption (kWh/100 km)', priceLabel: 'Electricity price (₹/kWh)' }
};
const travellerCount = (value) => {
  const match = String(value?.label || value || '').match(/\d+/);
  return Math.max(1, Number(match?.[0]) || 1);
};
const placeFromTrip = (value) => value ? {
  label: value.label || value.city || '', city: value.city || value.label?.split(',')[0] || '',
  country: value.country || '', location: value.location || null
} : { label: '', city: '', location: null };
const updateTypedPlace = (label) => ({ label, city: label.split(',')[0].trim(), location: null });
const preferenceKey = (trip) => `tripsphere:smart-comparison:${trip?.id || 'new'}`;
const tripDate = (value) => /^\d{4}-\d{2}-\d{2}/.test(String(value || '')) ? String(value).slice(0, 10) : getIndiaCalendarDate();
const readPreferences = (trip) => {
  try { return JSON.parse(localStorage.getItem(preferenceKey(trip)) || '{}'); } catch { return {}; }
};
const officialRailUrl = 'https://www.irctc.co.in/nget/train-search';
const inr = (value) => `₹${Math.round(value).toLocaleString('en-IN')}`;

function Recommendation({ title, result, emptyText, featured = false }) {
  return <article className={'comparison-recommendation' + (featured ? ' featured' : '')}>
    <span className="comparison-recommendation-label">{title}</span>
    {result?.option ? <><b>{result.option.name}</b><span>{result.reason}</span></> : <span>{emptyText}</span>}
  </article>;
}

function OptionCard({ option, tags, travellers, vehicle }) {
  const Icon = option.mode === 'Train' ? TrainFront : option.mode === 'Bus' ? BusFront : option.mode === 'Flight' ? Plane : CarFront;
  const train = option.mode === 'Train';
  const car = option.mode === 'Car / self-drive';
  const externalSearch = option.mode === 'Bus' || option.mode === 'Flight';
  return <article className="comparison-option">
    <div className="comparison-option-top">
      <span className="comparison-option-icon"><Icon size={18}/></span>
      <div className="comparison-option-heading"><h3>{option.name}</h3></div>
      <span className="comparison-confidence">{train ? 'Unverified third-party schedule' : externalSearch ? 'External provider search only' : 'OSRM road estimate'}</span>
    </div>
    {tags.length > 0 && <div className="comparison-tags">{tags.map((tag) => <span key={tag}><Check size={12}/>{tag}</span>)}</div>}
    <div className="comparison-metrics">
      <div><small>{train ? 'Scheduled segment' : 'Estimated driving time'}</small><b>{formatTravelDuration(option.durationMinutes)}</b></div>
      <div><small>{train ? `Fare / traveller · ${option.selectedClass}` : externalSearch ? 'Price / traveller' : 'Fuel / energy / traveller'}</small><b>{option.perTraveller == null ? (externalSearch ? 'Search provider' : train ? 'Fare unavailable' : 'Enter estimate') : `${option.costIsComplete ? '' : '~'}${inr(option.perTraveller)}`}</b></div>
      <div><small>{train ? `Fare total · ${travellers} travellers` : externalSearch ? 'Group total' : 'Fuel / energy total'}</small><b>{option.totalCost == null ? (externalSearch ? 'Not returned' : train ? 'Fare unavailable' : 'Enter estimate') : `${option.costIsComplete ? '' : '~'}${inr(option.totalCost)}`}</b></div>
      <div><small>{train || externalSearch ? 'Availability' : 'Distance'}</small><b>{train || externalSearch ? (train ? option.availability : 'Check provider') : `${option.distanceKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`}</b></div>
    </div>
    {train && <div className="comparison-route-meta"><span><Clock3 size={13}/>{option.departureStation || `${option.departureCity} (station not returned)`} · {option.departure || 'Time unavailable'} → {option.arrivalStation || `${option.arrivalCity} (station not returned)`} · {option.arrival || 'Time unavailable'}</span></div>}
    {car && <details className="comparison-cost-breakdown comparison-car-cost"><summary>Set vehicle use and see one road cost estimate</summary><div className="comparison-car-fields">
      <label>Vehicle<select value={vehicle.vehicleType} onChange={(event) => vehicle.setVehicleType(event.target.value)}><option value="petrol">Petrol</option><option value="diesel">Diesel</option><option value="cng">CNG</option><option value="electric">Electric</option></select></label>
      <label>{vehicle.prefs.efficiencyLabel}<input type="number" min="0.01" step="any" value={vehicle.efficiency} onChange={(event) => vehicle.setEfficiency(event.target.value)} placeholder={vehicle.vehicleType === 'electric' ? 'e.g. 15' : 'Enter vehicle value'}/></label>
      <label>{vehicle.prefs.priceLabel}<input type="number" min="0.01" step="any" value={vehicle.energyPrice} onChange={(event) => vehicle.setEnergyPrice(event.target.value)} placeholder="Enter current local price"/></label>
      {option.vehicleEstimate && <p>Estimated fuel / energy: <b>{inr(option.vehicleEstimate.totalCost)}</b> · {inr(option.vehicleEstimate.perTraveller)} per traveller. Tolls and parking are excluded.</p>}
    </div></details>}
    <p className="comparison-option-note">{option.costLabel}. {option.scopeNote}</p>
    {option.bookingUrl && <a className="small-btn comparison-book-link" href={option.bookingUrl} target="_blank" rel="noreferrer">{train ? 'Check train options' : externalSearch ? `Search ${option.mode.toLowerCase()} prices` : 'Open road directions'} <ExternalLink size={13}/></a>}
  </article>;
}

export default function TransportComparison({ trip }) {
  const selection = trip?.userSelection || {};
  const saved = readPreferences(trip);
  const [origin, setOrigin] = useState(() => saved.origin || placeFromTrip(selection.origin));
  const [destination, setDestination] = useState(() => saved.destination || placeFromTrip(selection.location));
  const [journey, setJourney] = useState(() => saved.journey || 'outbound');
  const [date, setDate] = useState(() => normalizeCalendarDate(saved.date || tripDate(selection.startDate)));
  const [travellers, setTravellers] = useState(() => Number(saved.travellers) || travellerCount(selection.traveler));
  const [selectedClass, setSelectedClass] = useState(() => saved.selectedClass || 'SL');
  const [busType, setBusType] = useState(() => saved.busType || 'Any type');
  const [vehicleType, setVehicleType] = useState(() => saved.vehicleType || 'petrol');
  const [efficiency, setEfficiency] = useState(() => saved.efficiency || '');
  const [energyPrice, setEnergyPrice] = useState(() => saved.energyPrice || '');
  const [loading, setLoading] = useState(false);
  const [railCopyMessage, setRailCopyMessage] = useState('');
  const [result, setResult] = useState(null);
  const requestVersion = useRef(0);
  const [sort, setSort] = useState(() => saved.sort || 'recommended');
  const [modeFilter, setModeFilter] = useState(() => saved.modeFilter || 'all');

  useEffect(() => {
    const preferences = readPreferences(trip);
    requestVersion.current += 1;
    setLoading(false);
    setOrigin(preferences.origin || placeFromTrip(selection.origin));
    setDestination(preferences.destination || placeFromTrip(selection.location));
    setJourney(preferences.journey || 'outbound');
    setDate(normalizeCalendarDate(preferences.date || tripDate(selection.startDate)));
    setTravellers(Number(preferences.travellers) || travellerCount(selection.traveler));
    setSelectedClass(preferences.selectedClass || 'SL');
    setBusType(preferences.busType || 'Any type');
    setVehicleType(preferences.vehicleType || 'petrol');
    setEfficiency(preferences.efficiency || '');
    setEnergyPrice(preferences.energyPrice || '');
    setSort(preferences.sort || 'recommended');
    setModeFilter(preferences.modeFilter || 'all');
    setResult(null);
    // Saved trip context is the reset boundary; preference values are read by trip ID.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  useEffect(() => {
    try { localStorage.setItem(preferenceKey(trip), JSON.stringify({ origin, destination, journey, date, travellers, selectedClass, busType, vehicleType, efficiency, energyPrice, sort, modeFilter })); } catch { /* Private browsing can block storage. */ }
  }, [trip, origin, destination, journey, date, travellers, selectedClass, busType, vehicleType, efficiency, energyPrice, sort, modeFilter]);

  const flightSearchUrl = useMemo(() => buildProviderSearchUrl('flight', origin.label, destination.label, date), [origin.label, destination.label, date]);
  const busSearchUrl = useMemo(() => buildProviderSearchUrl('bus', origin.label, destination.label, date, busType), [origin.label, destination.label, date, busType]);
  const redRailSearchUrl = useMemo(() => buildProviderSearchUrl('redrail', origin.label, destination.label, date, selectedClass), [origin.label, destination.label, date, selectedClass]);
  const road = result?.road || null;
  const routeDistanceKm = Number(road?.routes?.[0]?.distance) / 1000;
  const vehicleEstimate = useMemo(() => estimateVehicleCost({ distanceKm: routeDistanceKm, vehicleType, efficiency, energyPrice, travellers }), [routeDistanceKm, vehicleType, efficiency, energyPrice, travellers]);
  const trains = useMemo(() => result?.trains || [], [result?.trains]);
  const options = useMemo(() => buildComparisonOptions({
    route: road, trains, travellers, bookingUrl: redRailSearchUrl, roadUrl: result?.roadUrl || '',
    selectedClass, origin: origin.label, destination: destination.label, vehicleEstimate
  }), [road, trains, travellers, result?.roadUrl, selectedClass, origin.label, destination.label, vehicleEstimate, redRailSearchUrl]);
  const recommendations = useMemo(() => rankTravelOptions(options), [options]);
  const modes = [...new Set(options.map((option) => option.mode))];
  const visibleOptions = options.filter((option) => modeFilter === 'all' || option.mode === modeFilter).sort((a, b) => {
    if (sort === 'price') return (a.totalCost ?? Infinity) - (b.totalCost ?? Infinity);
    if (sort === 'fastest' || sort === 'duration') return (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity);
    return (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity);
  });

  const copyAndOpenOfficialRail = async () => {
    const details = formatRailSearchDetails({ from: origin.label, to: destination.label, date, trainClass: selectedClass });
    window.open(officialRailUrl, '_blank', 'noopener,noreferrer');
    try {
      await navigator.clipboard.writeText(details);
      setRailCopyMessage('Route, date and class copied. Paste them into IRCTC; its public link does not support prefilled searches.');
    } catch {
      setRailCopyMessage('IRCTC opens without prefilled fields. Enter the displayed route, date and class there.');
    }
  };

  const setDirection = (next) => {
    if (next === journey) return;
    requestVersion.current += 1;
    setLoading(false);
    const nextOrigin = placeFromTrip(selection.origin);
    const nextDestination = placeFromTrip(selection.location);
    const startDate = selection.startDate || getIndiaCalendarDate();
    setJourney(next);
    setOrigin(next === 'return' ? nextDestination : nextOrigin);
    setDestination(next === 'return' ? nextOrigin : nextDestination);
    setDate(next === 'return' ? addCalendarDays(tripDate(startDate), Math.max(0, Number(selection.noOfDays || 1) - 1)) : tripDate(startDate));
    setResult(null);
  };

  const compare = async (event) => {
    event?.preventDefault();
    if (!origin.label.trim() || !destination.label.trim() || !date) return;
    const currentRequest = ++requestVersion.current;
    setLoading(true);
    setResult(null);
    const [roadResult, railResult] = await Promise.allSettled([
      getRoadRoute({ fromCoords: origin.location, toCoords: destination.location }),
      getLiveTrains({ from: origin.label, to: destination.label, date })
    ]);
    const roadData = roadResult.status === 'fulfilled' ? roadResult.value : { available: false, reason: 'Road routing could not be reached.' };
    const rail = railResult.status === 'fulfilled' ? railResult.value : { trains: [], error: 'Train schedules could not be reached.' };
    const roadUrl = origin.location && destination.location
      ? `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${encodeURIComponent(`${origin.location.lat},${origin.location.lng};${destination.location.lat},${destination.location.lng}`)}` : '';
    if (currentRequest !== requestVersion.current) return;
    setResult({ road: roadData, trains: Array.isArray(rail?.trains) ? rail.trains : [], railError: rail?.error || '', railSource: rail?.source || '', roadUrl, updatedAt: Date.now() });
    setLoading(false);
  };

  const matchedClasses = trains.filter((train) => Array.isArray(train.classes) && train.classes.some((item) => String(item.class || item.code || '').toUpperCase().replace(/\s/g, '') === selectedClass)).length;
  const prefs = VEHICLES[vehicleType];

  return <section className="section-block transport-section smart-comparison-section">
    <div className="section-title"><div>
      <div className="section-kicker">SMART TRANSPORT</div>
      <h2>Smart Travel Comparison</h2>
      <p className="comparison-tagline">Compare the data we can verify and see what still needs a provider check.</p>
    </div></div>

    <div className="journey-switch" role="group" aria-label="Journey direction">
      <button type="button" aria-pressed={journey === 'outbound'} className={journey === 'outbound' ? 'active' : ''} onClick={() => setDirection('outbound')}>Outbound</button>
      <button type="button" aria-pressed={journey === 'return'} className={journey === 'return' ? 'active' : ''} onClick={() => setDirection('return')}>Return</button>
    </div>

    <form className="comparison-search" onSubmit={compare}>
      <div className="comparison-field"><label htmlFor="comparison-origin">Origin city</label><GoogleAddressAutocomplete inputId="comparison-origin" value={origin} placeholder="Search origin city" onQueryChange={(value) => { requestVersion.current += 1; setLoading(false); setOrigin(updateTypedPlace(value)); setResult(null); }} onChange={(value) => { requestVersion.current += 1; setLoading(false); setOrigin(value); setResult(null); }}/></div>
      <div className="comparison-field"><label htmlFor="comparison-destination">Destination city</label><GoogleAddressAutocomplete inputId="comparison-destination" value={destination} placeholder="Search destination city" onQueryChange={(value) => { requestVersion.current += 1; setLoading(false); setDestination(updateTypedPlace(value)); setResult(null); }} onChange={(value) => { requestVersion.current += 1; setLoading(false); setDestination(value); setResult(null); }}/></div>
      <div className="comparison-field"><label htmlFor="comparison-date">Departure date</label><input id="comparison-date" type="date" value={date} onChange={(event) => { requestVersion.current += 1; setLoading(false); setDate(event.target.value); setResult(null); }}/></div>
      <div className="comparison-field"><label htmlFor="comparison-travellers">Travellers</label><span className="comparison-number-input"><Users size={16}/><input id="comparison-travellers" type="number" min="1" max="20" value={travellers} onChange={(event) => setTravellers(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}/></span></div>
      <button className="primary-btn comparison-submit" type="submit" disabled={loading || !origin.label.trim() || !destination.label.trim() || !date}>{loading ? <><RefreshCw size={15} className="spin"/> Comparing…</> : <><Route size={16}/> Compare travel options</>}</button>
    </form>
    <p className="comparison-form-note">Saved trip details are prefilled. Your date, passenger count, train class and vehicle assumptions are retained when you refresh this page.</p>

    {loading && <div className="comparison-loading" role="status" aria-live="polite"><span className="comparison-skeleton"/><span className="comparison-skeleton"/><span className="comparison-skeleton"/><p>Checking road routing and train schedule data…</p></div>}

    {result && <>
      <div className="comparison-result-heading"><div><span className="section-kicker"><ArrowLeftRight size={13}/> ROUTE RESULTS</span><h3>{origin.label} <b>→</b> {destination.label}</h3><span>{formatIndiaCalendarDate(date)} · {travellers} {travellers === 1 ? 'traveller' : 'travellers'} · {journey === 'return' ? 'Return' : 'Outbound'}</span></div><button type="button" className="small-btn" onClick={compare} disabled={loading}><RefreshCw size={13}/> Refresh results</button></div>

      <div className="comparison-recommendations" aria-label="Travel recommendations">
        <Recommendation title="Fastest returned segment" result={recommendations.fastest} emptyText="Need at least two returned journey times to compare."/>
      <Recommendation title="Cheapest option" result={recommendations.cheapest} emptyText="Waiting for comparable total prices from the included transport modes."/>
      <Recommendation title="Best value" result={recommendations.bestValue} emptyText="Waiting for comparable prices and journey times across the included modes."/>
        <Recommendation title="Most convenient" result={recommendations.mostConvenient} emptyText="Boarding, access, waiting and transfer details are incomplete."/>
      </div>

      <div className="comparison-tools">
        <div className="comparison-options-heading"><div><h3>Returned travel options</h3><span>Only data returned by the route services appears here.</span></div><div className="comparison-controls">
          <label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="price">Cheapest</option><option value="fastest">Fastest</option><option value="duration">Duration</option></select></label>
          <label>Mode <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}><option value="all">All returned</option>{modes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
        </div></div>
        <div className="comparison-class-row"><label htmlFor="train-class">Train class</label><select id="train-class" value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>{TRAIN_CLASSES.map((code) => <option key={code} value={code}>{code === '1A' ? '1A · First AC' : code === '2A' ? '2A · Second AC' : code === '3A' ? '3A · Third AC' : code === 'SL' ? 'SL · Sleeper' : '3E · AC 3 Economy (if available)'}</option>)}</select><span>{matchedClasses ? `${matchedClasses} train(s) list ${selectedClass}; check current fare and seats on IRCTC or redRail` : `${selectedClass} was not listed by the third-party feed; check the live provider search below`}</span></div>
        {!road?.routes?.[0] && result.road?.reason && <div className="comparison-feed-note">Road route unavailable: {result.road.reason}</div>}
        {visibleOptions.length ? <div className="comparison-option-grid">{visibleOptions.map((option) => <OptionCard key={option.id} option={option} travellers={travellers} vehicle={{ vehicleType, setVehicleType: (value) => { setVehicleType(value); setEfficiency(''); setEnergyPrice(''); }, efficiency, setEfficiency, energyPrice, setEnergyPrice, prefs }} tags={[recommendations.fastest?.option?.id === option.id ? 'Fastest segment' : null, recommendations.cheapest?.option?.id === option.id ? 'Cheapest' : null, recommendations.bestValue?.option?.id === option.id ? 'Best value' : null].filter(Boolean)}/>)}</div> : <div className="comparison-empty"><Route size={20}/><b>{options.length ? 'No returned options match these filters.' : 'No route results were returned for this search.'}</b><span>{result.road?.reason || result.railError || 'Use the provider searches below. No sample travel results are added.'}</span></div>}
      </div>
      <div className="comparison-provider-grid">
        <article className="comparison-provider-card"><span className="comparison-provider-icon"><TrainFront size={18}/></span><div><b>Train searches</b><p>{trains.length ? `${trains.length} schedule record(s) came from ${result.railSource || 'a third-party feed'}. Verify route, ${selectedClass} fare and seats with a provider.` : 'Choose a provider to check this route, date and train class. IRCTC does not document public URL fields for prefilled route/date searches.'}</p><label>Class to check<select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)}>{TRAIN_CLASSES.map((code) => <option key={code} value={code}>{code}</option>)}</select></label><div className="comparison-provider-actions"><button type="button" className="small-btn comparison-provider-action" onClick={copyAndOpenOfficialRail}><Copy size={13}/> Copy details & open IRCTC</button><a className="small-btn comparison-provider-action" href={redRailSearchUrl} target="_blank" rel="noreferrer">Check {selectedClass} on redRail <ExternalLink size={13}/></a></div>{railCopyMessage && <small role="status">{railCopyMessage}</small>}</div></article>
        <article className="comparison-provider-card"><span className="comparison-provider-icon"><BusFront size={18}/></span><div><b>Bus inventory</b><p>Live bus inventory is not connected to TripSphere. This route/date search opens redBus; its prices are not included in the comparison.</p><label>Preferred bus type<select value={busType} onChange={(event) => setBusType(event.target.value)}>{BUS_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><a href={busSearchUrl} target="_blank" rel="noreferrer">Search buses for {formatIndiaCalendarDate(date)} <ExternalLink size={13}/></a></div></article>
        <article className="comparison-provider-card"><span className="comparison-provider-icon"><Plane size={18}/></span><div><b>Flight search</b><p>Flight prices cannot yet be fetched into TripSphere. Open this route/date search to compare live fares on Google Flights.</p><a href={flightSearchUrl} target="_blank" rel="noreferrer">Search flights for {formatIndiaCalendarDate(date)} <ExternalLink size={13}/></a></div></article>
      </div>
      <p className="comparison-data-note">Sources: OSRM road route estimate and the train schedule feed shown above. Train data and inventory are not independently verified. Fuel cost is a user-entered estimate; tolls and parking were unavailable. Results refreshed {new Date(result.updatedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST.</p>
    </>}
    {!result && !loading && <div className="comparison-placeholder"><Route size={20}/><span>Compare the selected route to see its road estimate and any returned train schedule data. Bus and flight availability opens directly with their providers.</span></div>}
  </section>;
}
