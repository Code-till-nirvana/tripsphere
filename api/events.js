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
  if(/family|kids?|children|parent.?child|for all ages/.test(s)) return 'Family & Kids';
  if(/festival|navratri|dandiya|diwali|holi|christmas|new year|durga puja|onam/.test(s)) return 'Festivals';
  if(/candlelight|concert|music|live music|jamming|singer|dj|band|orchestra|sufi night/.test(s)) return 'Music';
  if(/food|wine|dining|brunch|tasting|culinary|food festival|food market/.test(s)) return 'Food & Drink';
  if(/dance|garba|ballet|salsa|dj night|club night|party|nightlife/.test(s)) return 'Dance & Parties';
  if(/exhibition|expo|trade show|fair|shopping|market/.test(s)) return 'Exhibitions';
  if(/sport|cricket|football|soccer|marathon|run |badminton|tennis|race|cycling/.test(s)) return 'Sports';
  if(/theatre|theater|stage play|drama|musical|live performance|stage performance/.test(s)) return 'Theatre & Performing Arts';
  if(/workshop|masterclass|class|training|bootcamp/.test(s)) return 'Workshops';
  if(/business|networking|conference|summit|meetup|seminar/.test(s)) return 'Business & Networking';
  if(/art|gallery|painting|photography|craft|creative/.test(s)) return 'Arts & Culture';
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
  const rawCategory=[e.eventType,e.category,e.genre,e.description].filter(Boolean).join(' ');
  return {id:e.url||url,name,category:classify(name,rawCategory),date:String(start).slice(0,10),time:String(start).length>15?String(start).slice(11,16):'Time TBA',venue:cleanText(location),description:cleanText(e.description||e.eventType||''),price,image:image||fallbackImage,url:e.url||url,preview:false,source};
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
  music:['music','concerts'],
  arts:['art','arts','things-to-do'],
  exhibitions:['exhibitions','exhibition'],
  dance:['dance','parties'],
  festivals:['festivals','things-to-do'],
  sports:['sports'],
  comedy:['comedy'],
  theatre:['theatre','performances'],
  workshops:['workshops','things-to-do'],
  food:['food-drink','food-and-drink','food'],
  business:['business','business-networking'],
  parties:['parties'],
  performances:['performances','theatre'],
  family:['family','kids','things-to-do'],
  nightlife:['nightlife','parties']
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
      const detailResults=await Promise.all(links.slice(0,12).map(link=>fetchDetail(link,start,end,'AllEvents')));
      details.push(...detailResults.filter(Boolean));
      return [...direct,...details];
    }catch{return []}
  }));
  return results.flat();
}

const CATEGORY_SEARCH_TERMS={
  music:['concert','live music','music show','singer','band','orchestra'],
  comedy:['stand-up comedy','comedy show','standup','comedian'],
  arts:['art exhibition','art workshop','cultural event','painting','photography'],
  exhibitions:['exhibition','expo','art exhibition','trade show'],
  dance:['dance show','dance party','garba','salsa','ballet'],
  festivals:['festival','cultural festival','fair','mela'],
  sports:['sports event','cricket','football','badminton','marathon'],
  theatre:['theatre play','stage play','drama','musical'],
  workshops:['workshop','masterclass','training workshop','bootcamp'],
  food:['food festival','food tasting','food market','dining','brunch'],
  business:['business networking','business meetup','conference','summit','seminar'],
  family:['family events','kids activities','family activities','children'],
  parties:['party','club night','DJ night','nightlife'],
  performances:['live performance','stage performance','live show','concert'],
  nightlife:['nightlife','club night','DJ night','dance party']
};
async function fetchCategory(city,start,end,category){
  const slug=citySlug(city); if(!slug) return [];
  const candidates=category==='all'?CATEGORY_MAP.all:(CATEGORY_MAP[category]||[category]);
  // AllEvents category listings use /city/category paths (for example /delhi/music).
  // The old --month suffix was not a valid category route and often returned a
  // generic city page, which then failed category filtering.
  const urls=candidates.map(value=>`https://allevents.in/${slug}/${value}`);
  const terms=CATEGORY_SEARCH_TERMS[category]||[];
  const jobs=[
    ...[...new Set(urls)].map(async url=>{
      try{
        const html=await fetchText(url);
        const direct=parseJsonLd(html).map(e=>eventFromJson(e,url,ogImage(html),'AllEvents')).filter(e=>e&&inRange(e.date,start,end));
        const links=collectLinks(html,'allevents.in',100);
        const details=await Promise.all(links.slice(0,10).map(link=>fetchDetail(link,start,end,'AllEvents')));
        return [...direct,...details.filter(Boolean)];
      }catch{return []}
    }),
    ...terms.map(term=>fetchSearch(city,start,end,term))
  ];
  // The city feed adds coverage when category-specific provider URLs are sparse.
  if(category!=='all') jobs.push(fetchCityPage(city,start,end));
  const results=await Promise.all(jobs);
  return results.flat().filter(event=>matchesCategory(event,category));
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


function matchesCategory(event,category){
  if(!category||category==='all')return true;
  const actual=String(event.category||'').toLowerCase();
  const aliases={
    music:['music'],comedy:['comedy & stand-up'],arts:['arts & culture'],exhibitions:['exhibitions'],
    dance:['dance & parties'],festivals:['festivals'],sports:['sports'],theatre:['theatre & performing arts'],
    workshops:['workshops'],food:['food & drink'],business:['business & networking'],
    parties:['dance & parties','festivals'],performances:['theatre & performing arts','music'],
    family:['family & kids'],nightlife:['dance & parties','music']
  };
  return (aliases[category]||[category.replace(/-/g,' ')]).includes(actual);
}
function matchesSearch(event,query){
  const terms=String(query||'').toLowerCase().split(/\s+/).filter(Boolean);
  if(!terms.length)return true;
  const haystack=[event.name,event.category,event.venue,event.description].join(' ').toLowerCase();
  return terms.every(term=>haystack.includes(term));
}

function discoveryFallback(city,start,end,category='all',q=''){
  const slug=citySlug(city); if(!slug) return [];
  const cityName=String(city).split(',')[0].trim();
  const label=q?`Search results for “${q}” in ${cityName}`:category==='all'?`Live events in ${cityName}`:`${category} events in ${cityName}`;
  return [{id:`${slug}-live-events-${category}-${encodeURIComponent(q||'all')}`,name:label,category:'Live local discovery',date:start,time:'Live listings',venue:cityName,price:'See current listings',url:`https://allevents.in/${slug}${q?`/${encodeURIComponent(q)}`:''}`,image:'',preview:true,directory:true,source:'AllEvents · live city listings'}];
}

export default async function handler(req,res){
  const q=req.query||{}; const city=q.city||'';
  let start=q.startDate||new Date().toISOString().slice(0,10);
  let end=q.endDate||new Date(Date.now()+14*86400000).toISOString().slice(0,10);
  // Guard against the planner occasionally sending trip dates in reverse order.
  // Provider results must always be filtered against an ascending date window.
  if(toDate(start)&&toDate(end)&&toDate(end)<toDate(start)){
    [start,end]=[end,start];
  }
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
  // Do not relabel unrelated records just because they came from a category URL.
  combined=combined.filter(event=>matchesCategory(event,category)&&matchesSearch(event,search));
  if(!combined.length) combined=discoveryFallback(city,start,end,category,search);
  const seen=new Set();
  const events=combined.filter(e=>{const key=`${e.name}|${e.date}|${e.venue}`.toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).slice(0,30);
  return res.status(200).json({live:true,source:'Live public event providers',events,category,search,updatedAt:new Date().toISOString(),message:events.some(e=>!e.directory)?'Live local event listings are available.':'Live city discovery is available; listings are supplied by the public provider.'});
}
