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

const formatDuration = (minutes) => {
  const value = Math.round(minutes);
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return hours ? `${hours}h ${rest}m` : `${rest}m`;
};

export function estimateVehicleCost({ distanceKm, vehicleType, efficiency, energyPrice, travellers = 1 }) {
  const distance = Number(distanceKm);
  const consumption = Number(efficiency);
  const price = Number(energyPrice);
  const people = Math.max(1, Number(travellers) || 1);
  if (![distance, consumption, price].every(Number.isFinite) || distance <= 0 || consumption <= 0 || price <= 0) return null;
  const electric = vehicleType === 'electric';
  const quantity = electric ? distance * consumption / 100 : distance / consumption;
  const unitCost = quantity * price;
  return {
    vehicleType,
    quantity,
    quantityUnit: electric ? 'kWh' : 'litres',
    unitPrice: price,
    priceUnit: electric ? '₹/kWh' : '₹/litre',
    unitCost,
    perTraveller: unitCost / people,
    travellers: people,
    tollEstimate: null,
    parkingEstimate: null,
    totalCost: unitCost,
    totalIsPartial: true
  };
}

const selectedFare = (classes = [], selectedClass) => {
  if (!selectedClass) return null;
  const entry = classes.find((item) => String(item.class || item.code || '').toUpperCase().replace(/\s/g, '') === selectedClass);
  return entry ? { entry, fare: moneyValue(entry.fare) } : null;
};

const normalizeTrain = (train, index, travellers, bookingUrl, selectedClass, from, to) => {
  const classes = Array.isArray(train.classes) ? train.classes : [];
  const classResult = selectedFare(classes, selectedClass);
  const perTraveller = classResult?.fare ?? null;
  const durationMinutes = parseDurationMinutes(train.duration);
  return {
    id: `train-${train.trainNumber || index}`,
    mode: 'Train',
    name: train.trainNumber ? `${train.trainNumber} · ${train.trainName || 'Train service'}` : train.trainName || 'Train service',
    durationMinutes,
    durationLabel: durationMinutes == null ? 'Duration unavailable' : formatDuration(durationMinutes),
    durationKind: 'published schedule',
    distanceKm: null,
    transfers: null,
    departure: train.departure || null,
    arrival: train.arrival || null,
    departureStation: train.departureStation || '',
    arrivalStation: train.arrivalStation || '',
    departureCity: from || 'Origin',
    arrivalCity: to || 'Destination',
    selectedClass,
    perTraveller,
    totalCost: perTraveller == null ? null : perTraveller * travellers,
    costIsComplete: perTraveller != null,
    costLabel: perTraveller == null ? `Fare unavailable for ${selectedClass}` : `Fare returned for ${selectedClass}; confirm before booking`,
    availability: classResult?.entry?.status || 'Availability not returned',
    confidence: 'Third-party schedule feed; verify train, stops, fare and availability with the official railway service.',
    source: 'Unverified third-party train search feed',
    bookingUrl,
    scopeNote: 'Only the scheduled segment is shown. Boarding access, waiting, transfers and last-mile travel are not included.'
  };
};

export function buildComparisonOptions({ route, trains = [], travellers = 1, bookingUrl = '', roadUrl = '', selectedClass = 'SL', origin = '', destination = '', vehicleEstimate = null }) {
  const options = [];
  const people = Math.max(1, Number(travellers) || 1);
  const road = route?.routes?.[0];
  if (route?.code === 'Ok' && road && Number(road.distance) > 0 && Number(road.duration) > 0) {
    const distanceKm = Number(road.distance) / 1000;
    const durationMinutes = Number(road.duration) / 60;
    options.push({
      id: 'car-route', mode: 'Car / self-drive', name: 'Private car · road route estimate',
      durationMinutes, durationLabel: `~${formatDuration(durationMinutes)}`,
      durationKind: 'estimated road segment', distanceKm,
      transfers: 0, departure: null, arrival: null,
      perTraveller: vehicleEstimate ? vehicleEstimate.totalCost / people : null,
      totalCost: vehicleEstimate?.totalCost ?? null,
      costIsComplete: false,
      vehicleEstimate,
      costLabel: vehicleEstimate ? 'Estimated fuel / energy only; tolls and parking unknown' : 'Enter vehicle efficiency and energy price for an estimate',
      confidence: 'Road distance and duration estimated; fuel estimate is assumption-based',
      source: 'OSRM road routing', bookingUrl: roadUrl,
      scopeNote: 'Drive time excludes stops and may not reflect current traffic. Fuel or energy cost is an estimate; tolls and parking are not included.'
    });
  }

  (Array.isArray(trains) ? trains : []).forEach((train, index) => {
    const option = normalizeTrain(train, index, people, bookingUrl, selectedClass, origin, destination);
    if (option.durationMinutes != null || option.departure || option.arrival) options.push(option);
  });
  return options;
}

const selectMin = (items, key) => items
  .filter((item) => Number.isFinite(item[key]) && item[key] > 0)
  .sort((a, b) => a[key] - b[key])[0] || null;

export function rankTravelOptions(options = []) {
  const timed = options.filter((item) => Number.isFinite(item.durationMinutes) && item.durationMinutes > 0);
  const priced = options.filter((item) => item.costIsComplete === true && Number.isFinite(item.totalCost) && item.totalCost > 0);
  const completeCostSet = options.length >= 2 && priced.length === options.length;
  const comparable = options.filter((item) => Number.isFinite(item.durationMinutes) && item.durationMinutes > 0 && item.costIsComplete === true && Number.isFinite(item.totalCost) && item.totalCost > 0);
  const fastest = timed.length >= 2 ? selectMin(timed, 'durationMinutes') : null;
  const cheapest = completeCostSet ? selectMin(priced, 'totalCost') : null;

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
    if (options.length < 2 || !options.every((item) => Number.isFinite(item.transfers) && item.convenienceComplete === true)) return null;
    const minimum = Math.min(...options.map((item) => item.transfers));
    const leaders = options.filter((item) => item.transfers === minimum);
    return leaders.length === 1 ? leaders[0] : null;
  })();
  const tripSphere = bestValue || (fastest && cheapest && fastest.id === cheapest.id ? fastest : null);
  const tripSphereReason = tripSphere
    ? bestValue ? 'Best value uses an equal-weight balance of comparable total price and segment duration.' : 'It is both fastest and least expensive among the comparable returned options.'
    : 'A reliable overall pick needs at least two options with comparable prices and journey times.';

  return {
    fastest: fastest ? { option: fastest, reason: `Shortest returned segment (${fastest.durationLabel}); access and transfer time may not be included.` } : null,
    cheapest: cheapest ? { option: cheapest, reason: 'Lowest returned total for the selected traveller count across priced options.' } : null,
    bestValue: bestValue ? { option: bestValue, reason: 'Scores 50% normalized total cost and 50% normalized journey duration. Lower cost and shorter time score higher.' } : null,
    mostConvenient: convenience ? { option: convenience, reason: 'Fewest transfers with complete boarding, access and waiting information.' } : null,
    tripSphere: tripSphere ? { option: tripSphere, reason: tripSphereReason } : { option: null, reason: tripSphereReason },
    coverage: { returnedOptions: options.length, timedOptions: timed.length, pricedOptions: priced.length, fullyComparableOptions: comparable.length }
  };
}

export function formatTravelDuration(minutes) {
  return Number.isFinite(minutes) && minutes > 0 ? formatDuration(minutes) : '—';
}
