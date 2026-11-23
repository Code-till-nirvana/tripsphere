function citySlug(city='') {
  return String(city).split(',')[0].trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function cleanText(value='') {
  return String(value).replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}
function parseJsonLd(html) {
  const results=[];
  const re=/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while((m=re.exec(html))){
    try{
      const data=JSON.parse(m[1].trim());
      const walk=(x)=>{
        if(!x)return;
        if(Array.isArray(x)){x.forEach(walk);return;}
        if(typeof x==='object'){
          const type=Array.isArray(x['@type'])?x['@type']:[x['@type']];
          if(type.some(t=>String(t).toLowerCase()==='event')) results.push(x);
          Object.values(x).forEach(v=>{if(v&&typeof v==='object')walk(v)});
        }
      };
      walk(data);
    }catch{}
  }
  return results;
}
function ogImage(html){ const m=html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i); return m?.[1]||''; }
function toDate(value){ const d=new Date(value); return Number.isNaN(d.getTime())?null:d; }
function inRange(date,start,end){
  const d=toDate(`${date}T12:00:00`), a=toDate(`${start}T00:00:00`), b=toDate(`${end}T23:59:59`);
  return d&&a&&b&&d>=a&&d<=b;
}
function classify(name='', raw='') {
  const s=`${name} ${raw}`.toLowerCase();
  if(/stand.?up|comedy|humour|humor|comic/.test(s)) return 'Comedy & Stand-up';
  if(/exhibition|expo|trade show|fair|shopping|market/.test(s)) return 'Exhibitions';
  if(/dance|garba|dandiya|ballet|salsa|dj night|club night/.test(s)) return 'Dance & Parties';
  if(/festival|navratri|diwali|holi|christmas|new year|durga puja|onam/.test(s)) return 'Festivals';
  if(/sport|cricket|football|soccer|marathon|run |badminton|tennis|race|cycling/.test(s)) return 'Sports';
  if(/theatre|theater|play|drama|musical/.test(s)) return 'Theatre & Performing Arts';
  if(/workshop|masterclass|class|training|bootcamp/.test(s)) return 'Workshops';
  if(/food|wine|dining|brunch|tasting|culinary/.test(s)) return 'Food & Drink';
  if(/business|networking|conference|summit|meetup|seminar/.test(s)) return 'Business & Networking';
  if(/art|gallery|painting|photography|craft|creative/.test(s)) return 'Arts & Culture';
  if(/concert|music|live |jamming|singer|dj|band|orchestra/.test(s)) return 'Music';
  return 'Things to Do';
}
function eventFromJson(e,url,fallbackImage='',source='AllEvents',forcedCategory='') {
  const start=e.startDate||e.startTime; if(!start) return null;
  const location=typeof e.location==='string'?e.location:(e.location?.name || e.location?.address?.streetAddress || 'Local venue');
  const offer=Array.isArray(e.offers)?e.offers[0]:e.offers;
  let price='See organiser';
  if(offer?.price!==undefined) price=offer.price===0?'Free':`${offer.priceCurrency||'₹'} ${offer.price}`;
  const image=Array.isArray(e.image)?e.image[0]:e.image;
  const name=cleanText(e.name||'Event');
  return {id:e.url||url,name,category:forcedCategory||classify(name,e.eventType||''),date:String(start).slice(0,10),time:String(start).length>15?String(start).slice(11,16):'Time TBA',venue:cleanText(location),price,image:image||fallbackImage,url:e.url||url,preview:false,source};
}
async function fetchText(url){
  const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; TripSphere/1.0)','Accept':'text/html,application/xhtml+xml'},signal:AbortSignal.timeout(5500)});
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}
function collectLinks(html,host='allevents.in',limit=60){
  const links=[]; const seen=new Set(); const re=new RegExp(`href=["'](https?:\\/\\/${host.replace('.','\\.')}[^"']+|\\/[^"']+)["']`,'gi'); let m;
  while((m=re.exec(html))&&links.length<limit){
    const href=m[1].startsWith('http')?m[1]:`https://${host}${m[1]}`;
    if(seen.has(href)) continue;
    if(/\/pages\/|\/calendar|\/about|\/login|\/signup|\/app\?|\/location|\/events\?|\/upcoming\?|\/category|\/search/i.test(href)) continue;
    seen.add(href); links.push(href);
  }
  return links;
}
async function fetchDetail(url,start,end,source,forcedCategory=''){
  try{
    const page=await fetchText(url); const data=parseJsonLd(page);
    for(const item of data){
      const event=eventFromJson(item,url,ogImage(page),source,forcedCategory);
      if(event&&inRange(event.date,start,end)) return event;
    }
  }catch{}
  return null;
}
function monthName(date){return new Date(`${date}T12:00:00`).toLocaleString('en',{month:'long'}).toLowerCase();}
function year(date){return new Date(`${date}T12:00:00`).getFullYear();}

const CATEGORY_MAP={
  all:['parties','music','comedy','exhibitions','performances'],
  music:'music',
  arts:'arts',
  exhibitions:'exhibitions',
  dance:'dance',
  festivals:'festivals',
  sports:'sports',
  comedy:'comedy',
  theatre:'theatre',
  workshops:'workshops',
  food:'food-drink',
  business:'business',
  parties:'parties',
  performances:'performances',
  family:'family',
  nightlife:'nightlife'
};

async function fetchCityPage(city,start,end){
  const slug=citySlug(city); if(!slug) return [];
  const urls=[
    `https://allevents.in/${slug}`,
    `https://allevents.in/${slug}/events`,
    `https://allevents.in/${slug}/${monthName(start)}`,
    `https://allevents.in/${slug}/${monthName(start)}-${year(start)}`
  ];
  const results=await Promise.all([...new Set(urls)].map(async url=>{
    try{
      const html=await fetchText(url);
      const direct=parseJsonLd(html).map(e=>eventFromJson(e,url,ogImage(html),'AllEvents')).filter(e=>e&&inRange(e.date,start,end));
      const links=collectLinks(html,'allevents.in',100);
      const details=[];
      const detailResults=await Promise.all(links.slice(0,5).map(link=>fetchDetail(link,start,end,'AllEvents')));
      details.push(...detailResults.filter(Boolean));
      return [...direct,...details];
    }catch{return []}
  }));
  return results.flat();
}

async function fetchCategory(city,start,end,category){
  const slug=citySlug(city); if(!slug) return [];
  const cat=CATEGORY_MAP[category]||category||'all';
  const month=monthName(start); const yr=year(start);
  const candidates=cat==='all'?CATEGORY_MAP.all:[cat];
  const urls=[];
  for(const c of candidates){
    urls.push(`https://allevents.in/${slug}/${c}--${month}`);
  }
  const pages=await Promise.all([...new Set(urls)].map(async url=>{
    try{
      const html=await fetchText(url);
      // For the All Events view, keep the provider's actual event category instead
      // of labelling every result as the first category in the aggregate list.
      const forced=cat==='all'?'':String(candidates[0]||'').replace(/-/g,' ');
      const direct=parseJsonLd(html).map(e=>eventFromJson(e,url,ogImage(html),'AllEvents',forced)).filter(e=>e&&inRange(e.date,start,end));
      const links=collectLinks(html,'allevents.in',80);
      const details=[];
      const detailResults=await Promise.all(links.slice(0,4).map(link=>fetchDetail(link,start,end,'AllEvents',forced)));
      details.push(...detailResults.filter(Boolean));
      return [...direct,...details];
    }catch{return []}
  }));
  return pages.flat();
}

async function fetchSearch(city,start,end,q){
  const slug=citySlug(city); if(!slug||!q) return [];
  const url=`https://allevents.in/${slug}/${encodeURIComponent(String(q).trim()).replace(/%20/g,'%20')}`;
  try{
    const html=await fetchText(url);
    const direct=parseJsonLd(html).map(e=>eventFromJson(e,url,ogImage(html),'AllEvents')).filter(e=>e&&inRange(e.date,start,end));
    const links=collectLinks(html,'allevents.in',80);
    const details=[];
    const detailResults=await Promise.all(links.slice(0,5).map(link=>fetchDetail(link,start,end,'AllEvents')));
    details.push(...detailResults.filter(Boolean));
    return [...direct,...details];
  }catch{return []}
}

async function fetchBookMyShow(city,start,end){
  const slug=citySlug(city); if(!slug) return [];
  try{
    const url=`https://in.bookmyshow.com/explore/events-${slug}`; const html=await fetchText(url);
    const direct=parseJsonLd(html).map(e=>eventFromJson(e,url,ogImage(html),'BookMyShow')).filter(e=>e&&inRange(e.date,start,end));
    const links=collectLinks(html,'in.bookmyshow.com',40).filter(h=>/\/events\//i.test(h));
    const details=[];
    const detailResults=await Promise.all(links.slice(0,4).map(link=>fetchDetail(link,start,end,'BookMyShow')));
    details.push(...detailResults.filter(Boolean));
    return [...direct,...details];
  }catch{return []}
}

function discoveryFallback(city,start,end,category='all',q=''){
  const slug=citySlug(city); if(!slug) return [];
  const cityName=String(city).split(',')[0].trim();
  const label=q?`Search results for “${q}” in ${cityName}`:category==='all'?`Live events in ${cityName}`:`${category} events in ${cityName}`;
  return [{id:`${slug}-live-events-${category}-${encodeURIComponent(q||'all')}`,name:label,category:'Live local discovery',date:start,time:'Live listings',venue:cityName,price:'See current listings',url:`https://allevents.in/${slug}${q?`/${encodeURIComponent(q)}`:''}`,image:'',preview:true,directory:true,source:'AllEvents · live city listings'}];
}

export default async function handler(req,res){
  const q=req.query||{}; const city=q.city||'';
  const start=q.startDate||new Date().toISOString().slice(0,10); const end=q.endDate||new Date(Date.now()+14*86400000).toISOString().slice(0,10);
  const category=String(q.category||'all').toLowerCase(); const search=String(q.search||'').trim();
  let combined=[];
  if(search) {
    combined=await fetchSearch(city,start,end,search);
  } else if(category==='all') {
    // All Events is an aggregate view: use the city feed first, then category
    // feeds and BookMyShow so one provider/category cannot make the page look empty.
    const [cityFeed,categoryFeed,secondary]=await Promise.all([
      fetchCityPage(city,start,end),
      fetchCategory(city,start,end,'all'),
      fetchBookMyShow(city,start,end)
    ]);
    combined=[...cityFeed,...categoryFeed,...secondary];
  } else {
    combined=await fetchCategory(city,start,end,category);
  }
  if(!search && category==='all' && combined.length<6) {
    // Broaden the aggregate view with real keyword searches when one of the
    // provider category pages is sparse or temporarily unavailable.
    const broadTerms=['concert','comedy','festival','exhibition'];
    const broad=await Promise.all(broadTerms.map(term=>fetchSearch(city,start,end,term)));
    combined=[...combined,...broad.flat()];
  }
  if(!combined.length) combined=discoveryFallback(city,start,end,category,search);
  const seen=new Set();
  const events=combined.filter(e=>{const key=`${e.name}|${e.date}|${e.venue}`.toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).slice(0,30);
  return res.status(200).json({live:true,source:'Live public event providers',events,category,search,updatedAt:new Date().toISOString(),message:events.some(e=>!e.directory)?'Live local event listings are available.':'Live city discovery is available; listings are supplied by the public provider.'});
}
