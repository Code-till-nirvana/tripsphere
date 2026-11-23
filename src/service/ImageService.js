const cache = new Map();

function normalize(value = '') { return String(value).replace(/\s+/g, ' ').trim(); }
function tokens(value=''){ return normalize(value).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2); }
function cacheKey(...parts) { return parts.map(normalize).join('|').toLowerCase(); }

async function wikipediaSummaryImage(term) {
  if (!term) return '';
  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(term.replaceAll(' ', '_'))}`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return '';
    const data = await response.json();
    return data?.originalimage?.source || data?.thumbnail?.source || '';
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
    const terms = tokens(preferredTerms.join(' '));
    const scored = pages.map(page=>{
      const title=page?.title||''; const titleTokens=tokens(title);
      const score=terms.reduce((n,t)=>n+(titleTokens.includes(t)?3: title.toLowerCase().includes(t)?1:0),0);
      const info=page?.imageinfo?.[0];
      return {score, url:info?.thumburl||info?.url||''};
    }).filter(x=>x.url).sort((a,b)=>b.score-a.score);
    return scored[0]?.url || '';
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
    image=await wikimediaCommonsImage(item.q,item.terms);
    if(image)break;
    image=await wikipediaSummaryImage(item.q);
    if(image)break;
    if(item.q!==place){ image=await wikipediaSummaryImage(place); if(image)break; }
  }
  cache.set(key,image); return image;
}

export async function getWikipediaImage(query = '', fallback = '') {
  const primary=normalize(query), secondary=normalize(fallback); const key=cacheKey('wiki',primary,secondary); if(cache.has(key))return cache.get(key);
  const value=(await wikipediaSummaryImage(primary))||(await wikipediaSummaryImage(secondary))||''; cache.set(key,value); return value;
}

export async function getDestinationImage(destination = '') { const city=normalize(destination).split(',')[0]; return getWikipediaImage(city,destination); }
