const cache = new Map();
const placePhotoCache = new Map();

function normalize(value = '') { return String(value).replace(/\s+/g, ' ').trim(); }
function tokens(value=''){ return normalize(value).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2); }
const genericPlaceWords = new Set(['the','and','for','from','with','near','india','mumbai','house','bungalow','shrine','oratory','church','temple','park','hotel','cafe','restaurant','attraction','attractions','place','museum','market']);
function distinctiveTokens(value=''){ return tokens(value).filter(token=>!genericPlaceWords.has(token)); }
function cacheKey(...parts) { return parts.map(normalize).join('|').toLowerCase(); }

async function wikipediaSummaryImage(term) {
  if (!term) return '';
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replaceAll(' ', '_'))}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return '';
    const data = await response.json();
    // The REST summary endpoint may resolve a fuzzy or misspelled query to a
    // different article (for example a person's profile for a place name).
    // Never use that image unless the returned article title matches the place.
    const requestedTitle = normalize(term).toLowerCase();
    const returnedTitle = normalize(data?.title || '').toLowerCase();
    if (requestedTitle && requestedTitle === returnedTitle) {
      return data?.originalimage?.source || data?.thumbnail?.source || '';
    }
    const wanted = distinctiveTokens(term);
    const title = tokens(data?.title || '');
    const matches = wanted.filter(token => title.includes(token)).length;
    if (!wanted.length || matches < Math.min(2, wanted.length)) return '';
    return data?.originalimage?.source || data?.thumbnail?.source || '';
  } catch { return ''; }
}

async function wikipediaSearchImage(term) {
  if (!term) return '';
  try {
    const params = new URLSearchParams({ action:'query', generator:'search', gsrsearch:term, gsrnamespace:'0', gsrlimit:'8', prop:'pageimages', piprop:'thumbnail|original', pithumbsize:'1000', format:'json', origin:'*' });
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!response.ok) return '';
    const data = await response.json();
    const wanted = distinctiveTokens(term);
    const pages = Object.values(data?.query?.pages || {}).map(page => {
      const titleTokens = tokens(page.title || '');
      const matches = wanted.filter(token => titleTokens.includes(token)).length;
      return { matches, url:page.original?.source || page.thumbnail?.source || '' };
    }).filter(page => page.url).sort((a,b)=>b.matches-a.matches);
    return pages[0]?.matches >= Math.min(2, wanted.length) && wanted.length ? pages[0].url : '';
  } catch { return ''; }
}

async function wikipediaNearbyImage(lat, lng, name = '') {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return '';
  try {
    const params = new URLSearchParams({ action:'query', generator:'geosearch', ggscoord:`${lat}|${lng}`, ggsradius:'10000', ggslimit:'12', prop:'pageimages', piprop:'thumbnail|original', pithumbsize:'1000', format:'json', origin:'*' });
    const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`);
    if (!response.ok) return '';
    const data = await response.json();
    const wanted = distinctiveTokens(name);
    const pages = Object.values(data?.query?.pages || {}).map(page => {
      const titleTokens = tokens(page.title || '');
      const matches = wanted.filter(token => titleTokens.includes(token)).length;
      return { matches, distance:page?.coordinates?.[0]?.dist ?? Infinity, url:page.original?.source || page.thumbnail?.source || '' };
    }).filter(page => page.url).sort((a,b)=>b.matches-a.matches || a.distance-b.distance);
    // For a nearby substitute require a clear name match rather than showing
    // an unrelated image from elsewhere in the city.
    return pages[0]?.matches >= Math.min(2, wanted.length) && wanted.length ? pages[0].url : '';
  } catch { return ''; }
}

async function wikimediaCommonsImage(searchTerm, preferredTerms=[]) {
  if (!searchTerm) return '';
  try {
    const params = new URLSearchParams({ action:'query', generator:'search', gsrsearch:searchTerm, gsrnamespace:'6', gsrlimit:'10', prop:'imageinfo', iiprop:'url', iiurlwidth:'1000', format:'json', origin:'*' });
    const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`);
    if (!response.ok) return '';
    const data = await response.json();
    const pages = Object.values(data?.query?.pages || {});
    const nameTerms = distinctiveTokens(preferredTerms[0] || searchTerm);
    const contextTerms = tokens(preferredTerms.slice(1).join(' '));
    const scored = pages.map(page=>{
      const title=page?.title||''; const titleTokens=tokens(title);
      const nameMatches=nameTerms.filter(term=>titleTokens.includes(term)).length;
      const contextMatches=contextTerms.filter(term=>titleTokens.includes(term)).length;
      const score=nameMatches*10+contextMatches;
      const info=page?.imageinfo?.[0];
      return {score,nameMatches,url:info?.thumburl||info?.url||''};
    }).filter(x=>x.url&&x.nameMatches>=Math.min(2,nameTerms.length)&&nameTerms.length).sort((a,b)=>b.score-a.score);
    return (scored[0]?.score > 0 ? scored[0]?.url : '') || '';
  } catch { return ''; }
}

export async function getPlaceImage(name = '', destination = '', extra = '') {
  const place = normalize(name); const city = normalize(destination).split(',')[0]; const detail = normalize(extra);
  const key = cacheKey('place', place, city, detail); if (cache.has(key)) return cache.get(key);
  const category = detail || 'place';
  const queries = [
    {q:[place,city,category].filter(Boolean).join(' '), terms:[place,city,category]},
    {q:[place,city].filter(Boolean).join(' '), terms:[place,city]},
    {q:place, terms:[place]}
  ];
  let image='';
  for (const item of queries) {
    image=await wikipediaSearchImage(place);
    if(image)break;
    image=await wikimediaCommonsImage(item.q,item.terms);
    if(image)break;
    image=await wikipediaSummaryImage(item.q);
    if(image)break;
    if(item.q!==place){ image=await wikipediaSummaryImage(place); if(image)break; }
  }
  cache.set(key,image); return image;
}

export async function getNearbyPlaceImage(name = '', destination = '', lat, lng, imageUrl = '') {
  if (imageUrl && /^https?:\/\//i.test(imageUrl)) return imageUrl;
  const placeImage = await getPlaceImage(name, destination);
  return placeImage || wikipediaNearbyImage(lat, lng, name);
}

export async function getGooglePlacePhoto(name = '', destination = '') {
  if (!import.meta.env.VITE_GOOGLE_PLACE_API_KEY || !normalize(name)) return null;
  const key = cacheKey('google-place-photo', name, destination);
  if (placePhotoCache.has(key)) return placePhotoCache.get(key);
  let result = null;
  try {
    const { loadGoogleMaps } = await import('./GoogleMaps');
    const maps = await loadGoogleMaps();
    const { Place } = await maps.importLibrary('places');
    const { places = [] } = await Place.searchByText({
      textQuery: `${normalize(name)} ${normalize(destination)}`.trim(),
      fields: ['displayName', 'photos'],
      language: 'en',
      region: 'IN',
      maxResultCount: 1
    });
    const photo = places[0]?.photos?.[0];
    if (photo) result = {
      url: photo.getURI({ maxWidth: 960 }),
      attributions: (photo.authorAttributions || []).map(item => ({
        name: item.displayName,
        url: item.uri
      })).filter(item => item.name)
    };
  } catch {
    // Keep the non-Google image provider available when Places is not enabled.
  }
  placePhotoCache.set(key, result);
  return result;
}

export async function getWikipediaImage(query = '', fallback = '') {
  const primary=normalize(query), secondary=normalize(fallback); const key=cacheKey('wiki',primary,secondary); if(cache.has(key))return cache.get(key);
  const value=(await wikipediaSummaryImage(primary))||(await wikipediaSummaryImage(secondary))||''; cache.set(key,value); return value;
}

export async function getDestinationImage(destination = '') { const city=normalize(destination).split(',')[0]; return getWikipediaImage(city,destination); }

