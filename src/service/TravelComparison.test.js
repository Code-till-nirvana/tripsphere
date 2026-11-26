import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComparisonOptions, estimateVehicleCost, formatTravelDuration, rankTravelOptions } from './TravelComparison.js';
import { addCalendarDays, buildProviderSearchUrl, formatIndiaCalendarDate, normalizeCalendarDate } from './TravelSearch.js';

test('uses the selected train class fare and scales it to the whole group', () => {
  const options = buildComparisonOptions({
    travellers: 3,
    selectedClass: '2A',
    bookingUrl: 'https://www.irctc.co.in/nget/train-search',
    origin: 'Bhopal', destination: 'Mumbai',
    trains: [{
      trainNumber: '12345', trainName: 'Test Express', departure: '08:00', arrival: '12:00', duration: '4h',
      classes: [{ class: 'SL', fare: 350, status: 'Available' }, { class: '2A', fare: 820, status: 'WL 3' }]
    }]
  });
  assert.equal(options.length, 1);
  assert.equal(options[0].selectedClass, '2A');
  assert.equal(options[0].perTraveller, 820);
  assert.equal(options[0].totalCost, 2460);
  assert.equal(options[0].availability, 'WL 3');
  assert.equal(options[0].departureCity, 'Bhopal');
});

test('does not invent a fare when the selected class has no returned fare', () => {
  const [train] = buildComparisonOptions({
    selectedClass: '3E', travellers: 2,
    trains: [{ trainNumber: '12345', trainName: 'Returned train', duration: '240m', classes: [{ class: 'SL', fare: 350 }] }]
  });
  assert.equal(train.perTraveller, null);
  assert.equal(train.totalCost, null);
  assert.equal(train.availability, 'Availability not returned');
});

test('calculates fuel and EV estimates using user entered assumptions', () => {
  const petrol = estimateVehicleCost({ distanceKm: 300, vehicleType: 'petrol', efficiency: 15, energyPrice: 105, travellers: 3 });
  assert.equal(petrol.quantity, 20);
  assert.equal(petrol.totalCost, 2100);
  assert.equal(petrol.perTraveller, 700);
  assert.equal(petrol.totalIsPartial, true);

  const electric = estimateVehicleCost({ distanceKm: 300, vehicleType: 'electric', efficiency: 16, energyPrice: 8, travellers: 2 });
  assert.equal(electric.quantity, 48);
  assert.equal(electric.totalCost, 384);
  assert.equal(electric.quantityUnit, 'kWh');
});

test('returns no running cost estimate until all assumptions are supplied', () => {
  assert.equal(estimateVehicleCost({ distanceKm: 300, vehicleType: 'diesel', efficiency: '', energyPrice: 100, travellers: 2 }), null);
  assert.equal(estimateVehicleCost({ distanceKm: 0, vehicleType: 'electric', efficiency: 16, energyPrice: 8 }), null);
});

test('builds only options backed by route or returned schedule data', () => {
  const options = buildComparisonOptions({
    route: { code: 'Ok', routes: [{ distance: 100000, duration: 7200 }] },
    vehicleEstimate: estimateVehicleCost({ distanceKm: 100, vehicleType: 'petrol', efficiency: 10, energyPrice: 100, travellers: 2 }),
    travellers: 2,
    trains: [{ trainNumber: '12345', trainName: 'Test Express', departure: '08:00', arrival: '12:00', duration: '240m', classes: [] }]
  });
  assert.equal(options.length, 2);
  assert.equal(options[0].mode, 'Car / self-drive');
  assert.equal(options[0].durationMinutes, 120);
  assert.equal(options[0].totalCost, 1000);
  assert.equal(options[0].costIsComplete, false);
  assert.equal(options[1].mode, 'Train');
  assert.equal(options[1].totalCost, null);
  assert.equal(buildComparisonOptions({ route: null, trains: [] }).length, 0);
});

test('withholds cross-mode recommendations when costs or door-to-door details are incomplete', () => {
  const rankings = rankTravelOptions([
    { id: 'car', durationMinutes: 90, totalCost: 500, costIsComplete: false, transfers: 0 },
    { id: 'train', durationMinutes: 120, totalCost: 700, costIsComplete: true, transfers: null }
  ]);
  assert.equal(rankings.fastest.option.id, 'car');
  assert.equal(rankings.cheapest, null);
  assert.equal(rankings.bestValue, null);
  assert.equal(rankings.mostConvenient, null);
  assert.equal(rankings.tripSphere.option, null);
});

test('requires multiple returned durations before naming a fastest option', () => {
  const rankings = rankTravelOptions([{ id: 'road', durationMinutes: 300 }]);
  assert.equal(rankings.fastest, null);
  assert.equal(rankings.tripSphere.option, null);
});

test('uses the documented equal-weight normalized cost and time score on complete options', () => {
  const complete = (id, durationMinutes, totalCost) => ({ id, durationMinutes, totalCost, costIsComplete: true, transfers: 0, convenienceComplete: true });
  const rankings = rankTravelOptions([
    complete('a', 180, 100), complete('b', 60, 200), complete('c', 120, 180), complete('d', 90, 110)
  ]);
  assert.equal(rankings.cheapest.option.id, 'a');
  assert.equal(rankings.fastest.option.id, 'b');
  assert.equal(rankings.bestValue.option.id, 'd');
  assert.equal(rankings.mostConvenient, null);
});

test('formats returned journey segment durations', () => {
  assert.equal(formatTravelDuration(690), '11h 30m');
  assert.equal(formatTravelDuration(null), '—');
});

test('keeps the selected Indian calendar date stable and formats the return date without UTC drift', () => {
  assert.equal(normalizeCalendarDate('2026-12-17'), '2026-12-17');
  assert.equal(normalizeCalendarDate('2026-12-17T00:00:00.000Z'), '2026-12-17');
  assert.equal(addCalendarDays('2026-12-17', 3), '2026-12-20');
  assert.equal(formatIndiaCalendarDate('2026-12-17'), '17 Dec 2026');
});

test('prefills the same date and selected bus type for the requested city pairs', () => {
  const routes = [
    ['Bhopal', 'Sehore'], ['Bhopal', 'Mumbai'], ['Delhi', 'Jaipur'], ['Mumbai', 'Delhi']
  ];
  const dates = [['2026-12-17', '17-Dec-2026'], ['2027-01-04', '04-Jan-2027']];
  for (const [from, to] of routes) {
    for (const [date, providerDate] of dates) {
      const url = new URL(buildProviderSearchUrl('bus', from, to, date, 'AC Sleeper'));
      assert.equal(url.searchParams.get('onward'), providerDate);
      assert.equal(url.searchParams.get('doj'), providerDate);
      assert.equal(url.searchParams.get('busType'), 'AC Sleeper');
      assert.match(url.pathname, new RegExp(`${from.toLowerCase()}-to-${to.toLowerCase()}`));
    }
  }
});
