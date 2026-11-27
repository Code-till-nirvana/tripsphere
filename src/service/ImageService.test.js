import test from 'node:test';
import assert from 'node:assert/strict';
import { claimUniqueFile, rankCommonsCandidates, rankNearbyCommonsCandidates } from './ImageService.js';

function file({ title, description, license = 'CC BY 4.0', licenseUrl = 'https://creativecommons.org/licenses/by/4.0/', creator = 'Example Photographer', mime = 'image/jpeg', width = 1600, height = 1000, gps = null }) {
  return {
    title: `File:${title}`,
    imageinfo: [{ thumburl: 'https://upload.wikimedia.org/example.jpg', mime, width, height, extmetadata: {
      ImageDescription: { value: description },
      LicenseShortName: { value: license },
      LicenseUrl: { value: licenseUrl },
      Artist: { value: creator },
      ...(gps ? { GPSLatitude: { value: String(gps.lat) }, GPSLongitude: { value: String(gps.lng) } } : {}),
    } }],
  };
}

test('accepts a high-confidence exact attraction match with license and attribution', () => {
  const ranked = rankCommonsCandidates([
    file({ title: 'Qutub Minar Delhi India by Example', description: 'Qutub Minar in Delhi, India' }),
    file({ title: 'Delhi skyline', description: 'Delhi, India' }),
  ], { place: 'Qutub Minar', location: 'Delhi, India' });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].creator, 'Example Photographer');
  assert.equal(ranked[0].license.name, 'CC BY 4.0');
  assert.ok(ranked[0].sourceUrl.includes('commons.wikimedia.org/wiki/'));
});

test('keeps city and common attraction words in the exact place-name match', () => {
  const ranked = rankCommonsCandidates([
    file({ title: 'India Gate New Delhi India', description: 'India Gate, New Delhi, India' }),
    file({ title: 'Gateway of India Mumbai', description: 'Gateway of India in Mumbai, India' }),
  ], { place: 'India Gate', location: 'New Delhi, India' });
  assert.equal(ranked.length, 1);
  assert.match(ranked[0].title, /India Gate/);
  const gateway = rankCommonsCandidates([
    file({ title: 'Gateway of India Mumbai', description: 'Gateway of India in Mumbai, India' }),
  ], { place: 'Gateway of India', location: 'Mumbai, India' });
  assert.equal(gateway.length, 1);
});

test('matches an attraction when map data appends a descriptive place type', () => {
  const ranked = rankCommonsCandidates([
    file({ title: 'Jantar Mantar Delhi 2026', description: 'Jantar Mantar observatory in Delhi, India' }),
  ], { place: 'Jantar Mantar Astronomical Observatory', location: 'Delhi, Sansad Marg, Connaught Place, New Delhi, Delhi, 110001, India' });
  assert.equal(ranked.length, 1);
  assert.match(ranked[0].title, /Jantar Mantar/);
});

test('rejects a different attraction located at the named landmark', () => {
  const ranked = rankCommonsCandidates([
    file({ title: 'Delhi, Holy Trinity Church (Turkman gate)', description: 'The Holy Trinity Church at Turkman gate (Delhi), India' }),
  ], { place: 'Turkman Gate', location: 'Delhi, India' });
  assert.deepEqual(ranked, []);
});

test('rejects unrelated, generic, unlicensed, low-resolution and unsafe-license images', () => {
  const candidates = [
    file({ title: 'Delhi skyline', description: 'Delhi India' }),
    file({ title: 'Qutub Minar poster Delhi', description: 'Qutub Minar Delhi India' }),
    file({ title: 'Qutub Minar Delhi', description: 'Qutub Minar Delhi India', license: 'CC BY-NC 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc/4.0/' }),
    file({ title: 'Qutub Minar Delhi', description: 'Qutub Minar Delhi India', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' }),
    file({ title: 'Qutub Minar Delhi', description: 'Qutub Minar Delhi India', width: 240, height: 150 }),
  ];
  assert.deepEqual(rankCommonsCandidates(candidates, { place: 'Qutub Minar', location: 'Delhi, India' }), []);
});

test('requires stronger exact-name evidence for hotels and rejects a same-city property', () => {
  const candidates = [
    file({ title: 'The Central Hotel New Delhi', description: 'Central Hotel, New Delhi, India' }),
    file({ title: 'Hotel Central Mumbai', description: 'Hotel Central, Mumbai, India' }),
  ];
  const ranked = rankCommonsCandidates(candidates, { place: 'The Central Hotel', location: 'New Delhi, India', kind: 'hotel' });
  assert.equal(ranked.length, 1);
  assert.match(ranked[0].title, /New Delhi/);
});

test('accepts public-domain photos without a named creator and rejects invalid media types', () => {
  const candidates = [
    file({ title: 'Gateway of India Mumbai', description: 'Gateway of India in Mumbai, India', license: 'Public domain', licenseUrl: '', creator: '' }),
    file({ title: 'Gateway of India Mumbai', description: 'Gateway of India in Mumbai, India', mime: 'image/gif' }),
  ];
  const ranked = rankCommonsCandidates(candidates, { place: 'Gateway of India', location: 'Mumbai, India' });
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].license.name, 'Public domain');
});

test('uses Commons GPS metadata to reject a far-away same-name place and prefer the exact coordinates', () => {
  const candidates = [
    file({ title: 'Central Park New York', description: 'Central Park New York, USA', gps: { lat: 48.8566, lng: 2.3522 } }),
    file({ title: 'Central Park New York', description: 'Central Park New York, USA', gps: { lat: 40.75, lng: -73.98 } }),
  ];
  const ranked = rankCommonsCandidates(candidates, { place: 'Central Park', location: 'New York', coordinates: { lat: 40.75, lng: -73.98 } });
  assert.equal(ranked.length, 1);
  assert.ok(ranked[0].distanceKm < 1);
});

test('prevents one Commons file from representing two different places in the same city', () => {
  const image = { title: 'File:City Landmark.jpg' };
  assert.equal(claimUniqueFile(image, 'Landmark One', 'Unique Image Test City'), true);
  assert.equal(claimUniqueFile(image, 'Landmark Two', 'Unique Image Test City'), false);
  assert.equal(claimUniqueFile(image, 'Landmark Two', 'A Different Test City'), true);
});


test('ranks nearby geotagged free photos by distance and keeps files unique across cards', () => {
  const candidate = (title, distance, license = 'Public domain') => ({
    title: `File:${title}`, coordinates: [{ dist: distance }],
    imageinfo: [{ thumburl: `https://upload.wikimedia.org/${encodeURIComponent(title)}.jpg`, mime: 'image/jpeg', width: 1200, height: 800, extmetadata: {
      LicenseShortName: { value: license }, LicenseUrl: { value: license === 'Public domain' ? '' : 'https://creativecommons.org/licenses/by/4.0/' },
      Artist: { value: 'Local Photographer' }, ImageDescription: { value: title }
    } }]
  });
  const ranked = rankNearbyCommonsCandidates([candidate('Distant place', 749), candidate('Closest place', 120), candidate('Too far', 751), candidate('Map poster', 80)]);
  assert.deepEqual(ranked.map((image) => image.title), ['Closest place', 'Distant place']);
  assert.equal(claimUniqueFile(ranked[0], 'card-one', 'Nearby Test City'), true);
  assert.equal(claimUniqueFile(ranked[0], 'card-two', 'Nearby Test City'), false);
});
