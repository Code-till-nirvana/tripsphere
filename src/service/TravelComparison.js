const parseDurationMinutes = (value) => {
  if (Number.isFinite(Number(value)) && String(value).trim() !== '') return Number(value);
  const text = String(value || '').trim().toLowerCase();
  if (!text) return null;
  const hours = text.match(/(\d+(?:\.\d+)?)\s*h(?:ours?)?/);
  const minutes = text.match(/(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?/);
  if (hours || minutes) return Number(hours?.[1] || 0) * 60 + Number(minutes?.[1] || 0);
  const clock = text.match(/^(\d{1,2}):(\d{2})$/);
  return clock ? Number(clock[1]) * 60 + Number(clock[2]) : null;
};

const moneyValue = (value) => {
  const amount = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

const normalizeTrain = (train, index, travellers, bookingUrl) => {
  const fares = (train.classes || []).map((item) => moneyValue(item.fare)).filter(Boolean);
  const perTraveller = fares.length ? Math.min(...fares) : null;
  const durationMinutes = parseDurationMinutes(train.duration);
  const classes = train.classes || [];
  const confirmedSeats = classes.some((item) => item.available === true && Number(item.seats) > 0);
  const name = train.trainName || 'Train service';
  return {
    id: `train-${train.trainNumber || index}`,
    mode: 'Train',
    name: train.trainNumber ? `${train.trainNumber} · ${name}` : name,
    durationMinutes,
    durationLabel: durationMinutes == null ? 'Duration not returned' : formatDuration(durationMinutes),
    durationKind: 'published schedule',
    distanceKm: null,
    transfers: 0,
    departure: train.departure || null,
    arrival: train.arrival || null,
    perTraveller,
    totalCost: perTraveller == null ? null : perTraveller * travellers,
    costLabel: perTraveller == null ? 'Fare not returned' : 'Lowest returned class fare; confirm class and fare',
    confidence: confirmedSeats ? 'Availability returned for at least one class' : 'Schedule returned; seats and fares not confirmed',
    source: 'Train schedule provider',
    bookingUrl,
    classes,
    scopeNote: 'Station access and station-to-destination transfers are not included in this scheduled segment time.'
  };
};

const formatDuration = (minutes) => {
  const value = Math.round(minutes);
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
};

export function buildComparisonOptions({ route, trains = [], travellers = 1, bookingUrl = '', roadUrl = '' }) {
  const options = [];
  const road = route?.routes?.[0];
  if (route?.code === 'Ok' && road && Number(road.distance) > 0 && Number(road.duration) > 0) {
    const distanceKm = Number(road.distance) / 1000;
    const durationMinutes = Number(road.duration) / 60;
    options.push({
      id: 'car-route', mode: 'Car / self-drive', name: 'Road route',
      durationMinutes, durationLabel: `~${formatDuration(durationMinutes)}`,
      durationKind: 'live road-route estimate', distanceKm,
      transfers: 0, departure: null, arrival: null,
      perTraveller: null, totalCost: null,
      costLabel: 'Fuel, tolls and parking not priced',
      confidence: 'Distance and driving time estimated from the road route',
      source: 'OSRM road routing', bookingUrl: roadUrl,
      scopeNote: 'This is an estimated driving segment from the selected map coordinates. Stops, traffic changes, fuel, tolls and parking are not included.'
    });
  }

  (Array.isArray(trains) ? trains : []).forEach((train, index) => {
    const option = normalizeTrain(train, index, Math.max(1, Number(travellers) || 1), bookingUrl);
    if (option.durationMinutes != null || option.perTraveller != null || option.departure || option.arrival) options.push(option);
  });
  return options;
}

const selectMin = (items, key) => items.filter((item) => Number.isFinite(item[key]) && item[key] > 0).sort((a, b) => a[key] - b[key])[0] || null;

export function rankTravelOptions(options = []) {
  const timed = options.filter((item) => Number.isFinite(item.durationMinutes) && item.durationMinutes > 0);
  const priced = options.filter((item) => Number.isFinite(item.totalCost) && item.totalCost > 0);
  const comparable = options.filter((item) => Number.isFinite(item.durationMinutes) && item.durationMinutes > 0 && Number.isFinite(item.totalCost) && item.totalCost > 0);
  const fastest = selectMin(timed, 'durationMinutes');
  const cheapest = options.length > 1 && priced.length === options.length ? selectMin(priced, 'totalCost') : null;

  let bestValue = null;
  if (comparable.length >= 2 && comparable.length === options.length) {
    const minCost = Math.min(...comparable.map((item) => item.totalCost));
    const maxCost = Math.max(...comparable.map((item) => item.totalCost));
    const minTime = Math.min(...comparable.map((item) => item.durationMinutes));
    const maxTime = Math.max(...comparable.map((item) => item.durationMinutes));
    const score = (item) => {
      const costScore = maxCost === minCost ? 1 : (maxCost - item.totalCost) / (maxCost - minCost);
      const timeScore = maxTime === minTime ? 1 : (maxTime - item.durationMinutes) / (maxTime - minTime);
      return (costScore + timeScore) / 2;
    };
    bestValue = [...comparable].sort((a, b) => score(b) - score(a))[0];
  }

  const convenience = (() => {
    if (options.length < 2 || !options.every((item) => Number.isFinite(item.transfers))) return null;
    const fewest = Math.min(...options.map((item) => item.transfers));
    const leaders = options.filter((item) => item.transfers === fewest);
    return leaders.length === 1 ? leaders[0] : null;
  })();
  const tripSphere = bestValue || (fastest && cheapest && fastest.id === cheapest.id ? fastest : null);
  const tripSphereReason = tripSphere
    ? bestValue ? 'Best value by an equal-weight balance of normalized price and journey time.' : 'It is both the fastest and least expensive among the returned options.'
    : 'The available results do not include comparable total costs and door-to-door times, so a reliable overall recommendation is not possible.';

  return {
    fastest: fastest ? { option: fastest, reason: `Shortest returned journey segment (${fastest.durationLabel}); access and transfer time may not be included.` } : null,
    cheapest: cheapest ? { option: cheapest, reason: `Lowest returned total fare across all compared options for the selected traveller count.` } : null,
    bestValue: bestValue ? { option: bestValue, reason: 'Scores 50% normalized total cost and 50% normalized journey duration. Lower cost and shorter time score higher.' } : null,
    mostConvenient: convenience ? { option: convenience, reason: 'Fewest known transfers among the returned options; station/airport access and waiting time are not available.' } : null,
    tripSphere: tripSphere ? { option: tripSphere, reason: tripSphereReason } : { option: null, reason: tripSphereReason },
    coverage: { returnedOptions: options.length, timedOptions: timed.length, pricedOptions: priced.length, fullyComparableOptions: comparable.length }
  };
}

export function formatTravelDuration(minutes) {
  return Number.isFinite(minutes) && minutes > 0 ? formatDuration(minutes) : '—';
}

