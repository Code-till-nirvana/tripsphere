const destinationCache = new Map();
const placeCache = new Map();
const claimedFilesByCity = new Map();
const COMMONS_CACHE_PREFIX = 'tripsphere:commons-photo:v2:';
const COMMONS_CACHE_TTL = 7 * 24 * 60 * 60 * 1000;
const commonsQueue = [];
let activeCommonsRequests = 0;
let lastCommonsRequestAt = 0;
const STOP_WORDS = new Set(['the','and','for','from','with','near','of','in','at','a','an']);
const HOTEL_TYPE_WORDS = new Set(['hotel','hotels','resort','inn','guest','house','suites','motel','hostel']);
const ENTITY_TYPE_WORDS = new Set(['church','mosque','temple','hotel','resort','palace','fort','museum','market','garden','park','cafe','restaurant']);
const DESCRIPTIVE_SUFFIXES = [
  'astronomical observatory', 'observatory', 'archaeological site', 'heritage site',
  'historical monument', 'monument', 'tourist attraction'
];
const REJECT = /\b(logo|poster|advertisement|advert|map|icon|screenshot|flag|coat of arms|diagram|drawing|illustration|collage|banner|ticket|brochure|cover)\b/i;

const clean = (value = '') => String(value).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#0*39;|&apos;/gi, "'").replace(/&quot;/g, '"').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
const normalize = (value = '') => clean(value).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = (value = '') => normalize(value).split(' ').filter((word) => word.length > 1 && !STOP_WORDS.has(word));
const cacheKey = (...parts) => parts.map(normalize).join('|');

function corePlaceName(value = '', kind = 'attraction') {
  let name = clean(value);
  if (kind !== 'hotel') {
    for (const suffix of DESCRIPTIVE_SUFFIXES) {
      const pattern = new RegExp('\\s+' + suffix + '\\s*$', 'i');
      if (pattern.test(name)) {
        name = name.replace(pattern, '').trim();
        break;
      }
    }
  }
  return name;
}

function destinationTokens(location = '') {
  const parts = clean(location).split(',').map((part) => part.trim()).filter(Boolean);
  const cityAndCountry = parts.length > 1 ? [parts[0], parts.at(-1)] : parts;
  return [...new Set(cityAndCountry.flatMap(tokens))];
}

function readPersistentImage(key) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return undefined;
    const stored = JSON.parse(window.localStorage.getItem(`${COMMONS_CACHE_PREFIX}${key}`) || 'null');
    if (!stored || stored.expiresAt < Date.now()) return undefined;
    return stored.image || null;
  } catch { return undefined; }
}

function persistImage(key, image) {
  try {
    if (image && typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(`${COMMONS_CACHE_PREFIX}${key}`, JSON.stringify({ image, expiresAt: Date.now() + COMMONS_CACHE_TTL }));
  } catch { /* Browser storage can be disabled or full; in-memory cache still applies. */ }
}

function queuedCommonsRequest(run) {
  return new Promise((resolve, reject) => {
    commonsQueue.push({ run, resolve, reject });
    pumpCommonsQueue();
  });
}

function pumpCommonsQueue() {
  if (activeCommonsRequests >= 2 || commonsQueue.length === 0) return;
  const delay = Math.max(0, 400 - (Date.now() - lastCommonsRequestAt));
  setTimeout(() => {
    if (activeCommonsRequests >= 2 || commonsQueue.length === 0) return;
    const request = commonsQueue.shift();
    activeCommonsRequests += 1;
    lastCommonsRequestAt = Date.now();
    Promise.resolve().then(request.run).then(request.resolve, request.reject).finally(() => {
      activeCommonsRequests -= 1;
      pumpCommonsQueue();
    });
    pumpCommonsQueue();
  }, delay);
}

function licenseInfo(metadata = {}) {
  const name = clean(metadata.LicenseShortName?.value || metadata.License?.value || '');
  const url = clean(metadata.LicenseUrl?.value || '');
  const normalized = name.toLowerCase();
  const publicDomain = /public domain|cc0|creative commons zero/.test(normalized) || /creativecommons\.org\/publicdomain|creativecommons\.org\/publicdomain\/zero/i.test(url);
  const attributionLicense = /\bcc\s*by\b|creative commons attribution/i.test(normalized) && /creativecommons\.org\/licenses\/by\//i.test(url);
  if (!publicDomain && !attributionLicense) return null;
  return { name: name || 'Public domain', url: url || (publicDomain ? 'https://commons.wikimedia.org/wiki/Commons:Licensing' : 'https://creativecommons.org/licenses/by/4.0/') };
}

function coordinateValue(value) {
  const text = clean(value);
  const decimal = Number.parseFloat(text);
  if (Number.isFinite(decimal) && /^[-+]?\d+(?:\.\d+)?$/.test(text)) return decimal;
  const dms = text.match(/(\d+(?:\.\d+)?)\s*(?:°|deg)\s*(\d+(?:\.\d+)?)?\s*(?:['′]|min)?\s*(\d+(?:\.\d+)?)?\s*(?:["″]|sec)?\s*([NSEW])?/i);
  if (!dms) return null;
  let result = Number(dms[1]) + Number(dms[2] || 0) / 60 + Number(dms[3] || 0) / 3600;
  if (/^[SW]$/i.test(dms[4] || '')) result *= -1;
  return result;
}

function gpsDistanceKm(metadata, coordinates) {
  if (!coordinates || !Number.isFinite(Number(coordinates.lat)) || !Number.isFinite(Number(coordinates.lng))) return null;
  const lat = coordinateValue(metadata.GPSLatitude?.value);
  const lng = coordinateValue(metadata.GPSLongitude?.value);
  if (lat === null || lng === null) return null;
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(lat - Number(coordinates.lat));
  const dLng = toRadians(lng - Number(coordinates.lng));
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(Number(coordinates.lat))) * Math.cos(toRadians(lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreCandidate(page, place, location, kind = 'attraction', coordinates = null) {
  const info = page?.imageinfo?.[0];
  const metadata = info?.extmetadata || {};
  const title = clean(page?.title || '').replace(/^File:/i, '');
  const description = clean(metadata.ImageDescription?.value || metadata.ObjectName?.value || '');
  const creator = clean(metadata.Artist?.value || metadata.Credit?.value || '');
  const license = licenseInfo(metadata);
  const searchable = normalize(`${title} ${description}`);
  const titleNormalized = normalize(title);
  const wanted = tokens(corePlaceName(place, kind)).filter((word) => kind !== 'hotel' || !HOTEL_TYPE_WORDS.has(word));
  const locationTokens = destinationTokens(location);
  if (!info?.thumburl || !license || !wanted.length || REJECT.test(`${title} ${description}`)) return null;
  if (!/^(image\/jpeg|image\/png|image\/webp)$/i.test(info.mime || '')) return null;
  if (Number(info.width || 0) < 480 || Number(info.height || 0) < 300) return null;
  if (!creator && !/public domain|cc0|creative commons zero/i.test(license.name)) return null;

  const titleWords = new Set(titleNormalized.split(' '));
  const searchableWords = new Set(searchable.split(' '));
  // A filename can mention a nearby location while depicting a different named
  // place (for example, a church at Turkman Gate). Keep the photo with its entity.
  if ([...ENTITY_TYPE_WORDS].some((word) => titleWords.has(word)
    && !wanted.includes(word) && !(kind === 'hotel' && HOTEL_TYPE_WORDS.has(word)))) return null;
  const exactNameMatches = wanted.filter((word) => titleWords.has(word));
  const allNameMatches = wanted.filter((word) => searchableWords.has(word));
  const nameRatio = allNameMatches.length / wanted.length;
  const titleRatio = exactNameMatches.length / wanted.length;
  const locationMatches = locationTokens.filter((word) => searchableWords.has(word));
  const locationRatio = locationTokens.length ? locationMatches.length / locationTokens.length : 0;
  const distanceKm = gpsDistanceKm(metadata, coordinates);
  // Property photos need stronger title evidence because hotel names often overlap.
  const minimumNameRatio = kind === 'hotel' ? 1 : 0.8;
  if (nameRatio < minimumNameRatio || (wanted.length > 1 && titleRatio < 0.5)) return null;
  // A single shared country token is not enough to establish a city match.
  // Requiring at least half the supplied location terms rejects same-country
  // properties while allowing minor wording differences in Commons metadata.
  if (locationTokens.length && locationRatio < 0.5) return null;
  if (distanceKm !== null && distanceKm > 50) return null;
  const dimensions = Math.min(1, (Number(info.width) * Number(info.height)) / (1200 * 800));
  const proximity = distanceKm === null ? 0 : Math.max(0, 0.08 * (1 - distanceKm / 50));
  const confidence = Math.min(1, titleRatio * 0.54 + nameRatio * 0.2 + (locationTokens.length ? locationRatio * 0.14 : 0.12) + dimensions * 0.06 + proximity);
  if (confidence < (kind === 'hotel' ? 0.78 : 0.72)) return null;
  return {
    url: info.thumburl,
    title,
    confidence,
    sourceUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent((page.title || '').replaceAll(' ', '_'))}`,
    license,
    creator,
    attribution: clean(metadata.Attribution?.value || '') || `${creator} — ${license.name}`,
    description,
    distanceKm,
    width: Number(info.width),
    height: Number(info.height)
  };
}

export function rankCommonsCandidates(pages, { place, location = '', kind = 'attraction', coordinates = null }) {
  return (pages || []).map((page) => scoreCandidate(page, place, location, kind, coordinates)).filter(Boolean).sort((a, b) => b.confidence - a.confidence || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

export function claimUniqueFile(image, place, location) {
  const cityKey = cacheKey(location.split(',')[0]);
  const placeKey = cacheKey(place);
  if (!claimedFilesByCity.has(cityKey)) claimedFilesByCity.set(cityKey, new Map());
  const claims = claimedFilesByCity.get(cityKey);
  const existingPlace = claims.get(image.title);
  if (existingPlace && existingPlace !== placeKey) return false;
  claims.set(image.title, placeKey);
  return true;
}

async function commonsSearch({ place, location = '', address = '', kind = 'attraction', coordinates = null }) {
  const name = clean(place);
  if (!name) return null;
  const coreName = corePlaceName(name, kind);
  const city = clean(location).split(',')[0].trim();
  const key = cacheKey(kind, name, location, address, coordinates?.lat ?? '', coordinates?.lng ?? '');
  if (placeCache.has(key)) return placeCache.get(key);
  const persisted = readPersistentImage(key);
  if (persisted !== undefined) {
    placeCache.set(key, Promise.resolve(persisted));
    if (!persisted || claimUniqueFile(persisted, name, location)) return persisted;
    placeCache.set(key, Promise.resolve(null));
    return null;
  }
  const task = (async () => {
    const queries = [...new Set([`"${coreName}" ${city}`.trim(), `${coreName} ${city}`.trim()])];
    for (const query of queries) {
      try {
        const params = new URLSearchParams({
          action: 'query', generator: 'search', gsrsearch: query,
          gsrnamespace: '6', gsrlimit: '20', prop: 'imageinfo', iiprop: 'url|size|mime|extmetadata',
          iiurlwidth: '1000', iiextmetadatalanguage: 'en',
          iiextmetadatafilter: 'Artist|Attribution|Credit|GPSLatitude|GPSLongitude|ImageDescription|License|LicenseShortName|LicenseUrl|ObjectName',
          format: 'json', origin: '*'
        });
        const response = await queuedCommonsRequest(() => fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
          headers: { Accept: 'application/json', 'Api-User-Agent': 'TripSphere/1.0 (https://tripspherelive.netlify.app/)' },
          signal: AbortSignal.timeout(9000)
        }));
        if (!response.ok) continue;
        const data = await response.json();
        const pages = Object.values(data?.query?.pages || {});
        const candidates = rankCommonsCandidates(pages, { place: name, location, kind, coordinates });
        const match = candidates.find((candidate) => claimUniqueFile(candidate, name, location));
        if (match) return match;
      } catch {
        // Try the broader query if Commons rejects or times out on the exact-name query.
      }
    }
    return null;
  })();
  placeCache.set(key, task);
  const result = await task;
  persistImage(key, result);
  // Keep hits and misses in memory to avoid repeated upstream requests in this session.
  return result;
}

export function getPlaceImageRecord(name = '', destination = '', extra = '', kind = 'attraction', coordinates = null) {
  return commonsSearch({ place: name, location: destination, address: extra, kind, coordinates });
}

export async function getPlaceImage(name = '', destination = '', extra = '', kind = 'attraction', coordinates = null) {
  return (await getPlaceImageRecord(name, destination, extra, kind, coordinates))?.url || '';
}

export async function getNearbyPlaceImage(name = '', destination = '') {
  return getPlaceImage(name, destination);
}

// Destination-level imagery is separate from exact-place photos and is used only
// for trip overview surfaces, never as a substitute for an attraction or hotel.
export async function getDestinationImage(destination = '') {
  const term = clean(destination).split(',')[0].trim();
  const key = cacheKey('destination', term);
  if (destinationCache.has(key)) return destinationCache.get(key);
  const task = (async () => {
    if (!term) return '';
    try {
      const response = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replaceAll(' ', '_'))}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(7000) });
      if (!response.ok) return '';
      const data = await response.json();
      return normalize(data?.title) === normalize(term) ? data?.originalimage?.source || data?.thumbnail?.source || '' : '';
    } catch { return ''; }
  })();
  destinationCache.set(key, task);
  return task;
}

// Retained as a compatibility export. Place photos are sourced from Commons;
// Google Places photos are intentionally never requested by this feature.
export async function getGooglePlacePhoto() { return null; }
export async function getWikipediaImage(query = '', fallback = '') { return getDestinationImage(query || fallback); }

