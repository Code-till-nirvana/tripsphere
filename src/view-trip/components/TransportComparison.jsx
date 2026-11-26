import { useEffect, useMemo, useState } from 'react';
/* eslint-disable react/prop-types */
import {
  ArrowLeftRight, BusFront, CarFront, Check, Clock3, ExternalLink,
  Plane, RefreshCw, Route, TrainFront, Users
} from 'lucide-react';
import GoogleAddressAutocomplete from '@/components/custom/GoogleAddressAutocomplete';
import { buildProviderSearchUrl, getLiveTrains, getRoadRoute } from '@/service/TravelApi';
import { buildComparisonOptions, formatTravelDuration, rankTravelOptions } from '@/service/TravelComparison';

const icons = { Train: TrainFront, 'Car / self-drive': CarFront };
const todayLocal = () => {
  const date = new Date();
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};
const datePlusDays = (dateValue, days) => {
  const date = new Date(String(dateValue || todayLocal()) + 'T12:00:00');
  date.setDate(date.getDate() + Number(days || 0));
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};
const formatDate = (value) => {
  if (!value) return 'Date not set';
  return new Date(value + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};
const travellerCount = (value) => {
  const match = String(value?.label || value || '').match(/\d+/);
  return Math.max(1, Number(match?.[0]) || 1);
};
const placeFromTrip = (value) => value ? {
  label: value.label || value.city || '',
  city: value.city || value.label?.split(',')[0] || '',
  country: value.country || '',
  location: value.location || null
} : { label: '', city: '', location: null };
const updateTypedPlace = (label) => ({ label, city: label.split(',')[0].trim(), location: null });

function Recommendation({ title, result, emptyText, featured = false }) {
  return <article className={'comparison-recommendation' + (featured ? ' featured' : '')}>
    <span className="comparison-recommendation-label">{title}</span>
    {result?.option ? <>
      <b>{result.option.name}</b>
      <span>{result.reason}</span>
    </> : <span>{emptyText}</span>}
  </article>;
}

function OptionCard({ option, tags, travellers }) {
  const Icon = icons[option.mode] || Route;
  return <article className="comparison-option">
    <div className="comparison-option-top">
      <span className="comparison-option-icon"><Icon size={18}/></span>
      <div className="comparison-option-heading"><span>{option.mode}</span><h3>{option.name}</h3></div>
      <span className="comparison-confidence">{option.confidence}</span>
    </div>
    {tags.length > 0 && <div className="comparison-tags">{tags.map((tag) => <span key={tag}><Check size={12}/>{tag}</span>)}</div>}
    <div className="comparison-metrics">
      <div><small>{option.durationKind === 'published schedule' ? 'Scheduled segment' : 'Estimated road time'}</small><b>{formatTravelDuration(option.durationMinutes)}</b></div>
      <div><small>Estimated cost per traveller</small><b>{option.perTraveller == null ? 'Not returned' : '₹' + Math.round(option.perTraveller).toLocaleString('en-IN')}</b></div>
      <div><small>Estimated total ({travellers} {travellers === 1 ? 'traveller' : 'travellers'})</small><b>{option.totalCost == null ? 'Not returned' : '₹' + Math.round(option.totalCost).toLocaleString('en-IN')}</b></div>
      <div><small>Transfers</small><b>{option.transfers == null ? 'Not returned' : option.transfers}</b></div>
    </div>
    {(option.departure || option.arrival || option.distanceKm) && <div className="comparison-route-meta">
      {(option.departure || option.arrival) && <span><Clock3 size={13}/>{option.departure || '—'} → {option.arrival || '—'}</span>}
      {option.distanceKm && <span><Route size={13}/>{Math.round(option.distanceKm).toLocaleString()} km</span>}
    </div>}
    <p className="comparison-option-note">{option.costLabel}. {option.scopeNote}</p>
    {option.bookingUrl && <a className="small-btn comparison-book-link" href={option.bookingUrl} target="_blank" rel="noreferrer">Check schedule & booking <ExternalLink size={13}/></a>}
  </article>;
}

export default function TransportComparison({ trip }) {
  const selection = trip?.userSelection || {};
  const [origin, setOrigin] = useState(() => placeFromTrip(selection.origin));
  const [destination, setDestination] = useState(() => placeFromTrip(selection.location));
  const [journey, setJourney] = useState('outbound');
  const [date, setDate] = useState(selection.startDate || todayLocal());
  const [travellers, setTravellers] = useState(() => travellerCount(selection.traveler));
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sort, setSort] = useState('recommended');
  const [modeFilter, setModeFilter] = useState('all');

  useEffect(() => {
    const nextOrigin = placeFromTrip(selection.origin);
    const nextDestination = placeFromTrip(selection.location);
    const tripDate = selection.startDate || todayLocal();
    setOrigin(journey === 'return' ? nextDestination : nextOrigin);
    setDestination(journey === 'return' ? nextOrigin : nextDestination);
    setDate(journey === 'return' ? datePlusDays(tripDate, Math.max(0, Number(selection.noOfDays || 1) - 1)) : tripDate);
    setTravellers(travellerCount(selection.traveler));
    setResult(null);
    // Reset only when the saved trip changes; direction changes are handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip?.id]);

  const flightSearchUrl = useMemo(() => buildProviderSearchUrl('flight', origin.label, destination.label, date), [origin.label, destination.label, date]);
  const busSearchUrl = useMemo(() => buildProviderSearchUrl('bus', origin.label, destination.label, date), [origin.label, destination.label, date]);
  const allOptions = result?.options || [];
  const recommendations = result?.recommendations || null;
  const modes = [...new Set(allOptions.map((option) => option.mode))];
  const visibleOptions = allOptions.filter((option) => modeFilter === 'all' || option.mode === modeFilter).sort((a, b) => {
    if (sort === 'price') return (a.totalCost ?? Infinity) - (b.totalCost ?? Infinity);
    if (sort === 'duration') return (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity);
    if (sort === 'transfers') return (a.transfers ?? Infinity) - (b.transfers ?? Infinity);
    if (sort === 'type') return a.mode.localeCompare(b.mode);
    const featured = recommendations?.tripSphere?.option?.id;
    return Number(b.id === featured) - Number(a.id === featured) || (a.durationMinutes ?? Infinity) - (b.durationMinutes ?? Infinity);
  });

  const setDirection = (next) => {
    if (next === journey) return;
    const nextOrigin = placeFromTrip(selection.origin);
    const nextDestination = placeFromTrip(selection.location);
    const startDate = selection.startDate || todayLocal();
    setJourney(next);
    setOrigin(next === 'return' ? nextDestination : nextOrigin);
    setDestination(next === 'return' ? nextOrigin : nextDestination);
    setDate(next === 'return' ? datePlusDays(startDate, Math.max(0, Number(selection.noOfDays || 1) - 1)) : startDate);
    setResult(null);
  };

  const compare = async (event) => {
    event?.preventDefault();
    if (!origin.label.trim() || !destination.label.trim() || !date) return;
    setLoading(true);
    setResult(null);
    const [roadResult, railResult] = await Promise.allSettled([
      getRoadRoute({ fromCoords: origin.location, toCoords: destination.location }),
      getLiveTrains({ from: origin.label, to: destination.label, date })
    ]);
    const road = roadResult.status === 'fulfilled' ? roadResult.value : { available: false, reason: 'Road routing could not be reached.' };
    const rail = railResult.status === 'fulfilled' ? railResult.value : { trains: [], error: 'Train schedules could not be reached.' };
    const roadUrl = origin.location && destination.location
      ? 'https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=' + encodeURIComponent(origin.location.lat + ',' + origin.location.lng + ';' + destination.location.lat + ',' + destination.location.lng)
      : '';
    const options = buildComparisonOptions({
      route: road,
      trains: rail?.trains || [],
      travellers,
      bookingUrl: rail?.bookingUrl || '',
      roadUrl
    });
    setResult({
      options,
      recommendations: rankTravelOptions(options),
      roadError: road?.reason || '',
      railError: rail?.error || '',
      railSource: rail?.source || '',
      trainSearchUrl: rail?.searchUrl || '',
      updatedAt: new Date().toISOString()
    });
    setLoading(false);
  };

  return <section className="section-block transport-section smart-comparison-section">
    <div className="section-title"><div>
      <div className="section-kicker">SMART TRANSPORT</div>
      <h2>Smart Travel Comparison</h2>
      <p className="comparison-tagline">Find the smartest way to reach your destination.</p>
      <span>Compare every available way to travel and discover what saves you the most time and money.</span>
    </div></div>

    <div className="journey-switch" role="group" aria-label="Journey direction">
      <button type="button" aria-pressed={journey === 'outbound'} className={journey === 'outbound' ? 'active' : ''} onClick={() => setDirection('outbound')}>Outbound</button>
      <button type="button" aria-pressed={journey === 'return'} className={journey === 'return' ? 'active' : ''} onClick={() => setDirection('return')}>Return</button>
    </div>

    <form className="comparison-search" onSubmit={compare}>
      <div className="comparison-field"><label htmlFor="comparison-origin">Origin city</label>
        <GoogleAddressAutocomplete inputId="comparison-origin" value={origin} placeholder="Search origin city" onQueryChange={(value) => setOrigin(updateTypedPlace(value))} onChange={setOrigin}/>
      </div>
      <div className="comparison-field"><label htmlFor="comparison-destination">Destination city</label>
        <GoogleAddressAutocomplete inputId="comparison-destination" value={destination} placeholder="Search destination city" onQueryChange={(value) => setDestination(updateTypedPlace(value))} onChange={setDestination}/>
      </div>
      <div className="comparison-field"><label htmlFor="comparison-date">Travel date</label>
        <input id="comparison-date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setResult(null); }}/>
      </div>
      <div className="comparison-field"><label htmlFor="comparison-travellers">Travellers</label>
        <span className="comparison-number-input"><Users size={16}/><input id="comparison-travellers" type="number" min="1" max="20" value={travellers} onChange={(event) => setTravellers(Math.max(1, Math.min(20, Number(event.target.value) || 1)))}/></span>
      </div>
      <button className="primary-btn comparison-submit" type="submit" disabled={loading || !origin.label.trim() || !destination.label.trim() || !date}>
        {loading ? <><RefreshCw size={15} className="spin"/> Comparing routes…</> : <><Route size={16}/> Compare Travel Options</>}
      </button>
    </form>
    <p className="comparison-form-note">Your saved trip prefilled these details. Edit any field to compare another route. Return date is inferred from the trip length.</p>

    {loading && <div className="comparison-loading" role="status" aria-live="polite">
      <span className="comparison-skeleton"/><span className="comparison-skeleton"/><span className="comparison-skeleton"/>
      <p>Checking road routing and returned train schedules…</p>
    </div>}

    {result && <>
      <div className="comparison-result-heading">
        <div><span className="section-kicker"><ArrowLeftRight size={13}/> ROUTE RESULTS</span><h3>{origin.label} <b>→</b> {destination.label}</h3><span>{formatDate(date)} · {travellers} {travellers === 1 ? 'traveller' : 'travellers'}</span></div>
        <button type="button" className="small-btn" onClick={compare} disabled={loading}><RefreshCw size={13}/> Refresh</button>
      </div>

      <div className="comparison-recommendations" aria-label="Travel recommendations">
        <Recommendation title="Fastest option" result={recommendations.fastest} emptyText="No returned option includes a usable journey duration."/>
        <Recommendation title="Cheapest option" result={recommendations.cheapest} emptyText="Total prices were not returned for every compared option."/>
        <Recommendation title="Best value" result={recommendations.bestValue} emptyText="Need comparable total prices and durations for at least two options."/>
        <Recommendation title="Most convenient" result={recommendations.mostConvenient} emptyText="Transfer and access details are not complete enough to rank convenience."/>
        <Recommendation title="TripSphere recommendation" result={recommendations.tripSphere} emptyText={recommendations.tripSphere.reason} featured/>
      </div>

      <div className="comparison-options-heading"><div><h3>Returned travel options</h3><span>Travel segment times are shown separately from any door-to-door access time.</span></div>
        <div className="comparison-controls">
          <label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="price">Lowest price</option><option value="duration">Shortest duration</option><option value="transfers">Fewest transfers</option><option value="type">Transport type</option></select></label>
          <label>Mode <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value)}><option value="all">All returned</option>{modes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
        </div>
      </div>

      {visibleOptions.length ? <div className="comparison-option-grid">
        {visibleOptions.map((option) => <OptionCard key={option.id} option={option} travellers={travellers} tags={[
          recommendations.fastest?.option?.id === option.id ? 'Fastest' : null,
          recommendations.cheapest?.option?.id === option.id ? 'Cheapest' : null,
          recommendations.bestValue?.option?.id === option.id ? 'Best value' : null,
          recommendations.tripSphere?.option?.id === option.id ? 'TripSphere pick' : null
        ].filter(Boolean)}/>)}
      </div> : <div className="comparison-empty"><Route size={20}/><b>No route results were returned for this search.</b><span>{result.roadError || result.railError || 'Try a nearby city or use the external schedule searches below. No transport options are invented.'}</span></div>}

      <div className="comparison-search-links">
        <div><span className="section-kicker">PROVIDER SEARCHES</span><b>Check additional schedules</b><p>Flight and bus schedules are not supplied by a connected API, so these links open external searches. They are not counted as confirmed route options or included in the rankings.</p></div>
        <a className="small-btn" href={flightSearchUrl} target="_blank" rel="noreferrer"><Plane size={14}/> Search flights <ExternalLink size={13}/></a>
        <a className="small-btn" href={busSearchUrl} target="_blank" rel="noreferrer"><BusFront size={14}/> Search buses <ExternalLink size={13}/></a>
        {result.trainSearchUrl && <a className="small-btn" href={result.trainSearchUrl} target="_blank" rel="noreferrer"><TrainFront size={14}/> Search train route <ExternalLink size={13}/></a>}
      </div>
      <p className="comparison-data-note">Prices and seat availability are shown only when returned by the provider. Current results contain {recommendations.coverage.timedOptions} timed option(s) and {recommendations.coverage.pricedOptions} priced option(s). Road estimates exclude fuel, tolls, parking, stops and traffic changes. Results last refreshed {new Date(result.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.</p>
    </>}
    {!result && !loading && <div className="comparison-placeholder"><Route size={20}/><span>Compare the selected route to see road routing and any train schedules returned by the connected services.</span></div>}
  </section>;
}

