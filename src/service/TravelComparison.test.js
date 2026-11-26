import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComparisonOptions, formatTravelDuration, rankTravelOptions } from './TravelComparison.js';

test('normalizes only returned road and train information', () => {
  const options = buildComparisonOptions({
    route: { code: 'Ok', routes: [{ distance: 100000, duration: 7200 }] },
    travellers: 2,
    bookingUrl: 'https://provider.example/trains',
    roadUrl: 'https://maps.example/drive',
    trains: [{
      trainNumber: '12345', trainName: 'Test Express', departure: '08:00', arrival: '12:00',
      duration: '240', classes: [{ class: 'SL', fare: '350', available: false, status: 'Check live availability' }]
    }]
  });
  assert.equal(options.length, 2);
  assert.equal(options[0].mode, 'Car / self-drive');
  assert.equal(options[0].durationMinutes, 120);
  assert.equal(options[0].bookingUrl, 'https://maps.example/drive');
  assert.equal(options[1].durationMinutes, 240);
  assert.equal(options[1].perTraveller, 350);
  assert.equal(options[1].totalCost, 700);
  assert.match(options[1].confidence, /seats and fares not confirmed/);
});

test('returns no fabricated modes when APIs return no route data', () => {
  assert.deepEqual(buildComparisonOptions({ route: null, trains: [] }), []);
});

test('does not treat missing prices as zero or recommend cheapest/best value', () => {
  const rankings = rankTravelOptions([
    { id: 'car', mode: 'Car', durationMinutes: 90, totalCost: null, transfers: 0 },
    { id: 'train', mode: 'Train', durationMinutes: 120, totalCost: null, transfers: 0 }
  ]);
  assert.equal(rankings.fastest.option.id, 'car');
  assert.equal(rankings.cheapest, null);
  assert.equal(rankings.bestValue, null);
  assert.equal(rankings.tripSphere.option, null);
});

test('best value applies the documented equal weight to normalized price and time', () => {
  const rankings = rankTravelOptions([
    { id: 'a', durationMinutes: 180, totalCost: 100, transfers: 0 },
    { id: 'b', durationMinutes: 60, totalCost: 200, transfers: 0 },
    { id: 'c', durationMinutes: 120, totalCost: 180, transfers: 0 },
    { id: 'd', durationMinutes: 90, totalCost: 110, transfers: 0 }
  ]);
  assert.equal(rankings.cheapest.option.id, 'a');
  assert.equal(rankings.fastest.option.id, 'b');
  assert.equal(rankings.bestValue.option.id, 'd');
  assert.match(rankings.bestValue.reason, /50% normalized total cost and 50% normalized journey duration/);
});

test('formats returned travel segment durations', () => {
  assert.equal(formatTravelDuration(690), '11h 30m');
  assert.equal(formatTravelDuration(null), '—');
});

