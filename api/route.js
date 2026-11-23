export default async function handler(req,res){
  const q=req.query||{};
  const fromLat=Number(q.fromLat), fromLng=Number(q.fromLng), toLat=Number(q.toLat), toLng=Number(q.toLng);
  if(![fromLat,fromLng,toLat,toLng].every(Number.isFinite)) return res.status(400).json({error:'Invalid coordinates'});
  try{
    const coordinates=`${fromLng},${fromLat};${toLng},${toLat}`;
    const url=`https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    const r=await fetch(url,{headers:{Accept:'application/json','User-Agent':'TripSphere/1.0'},signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw new Error(`OSRM ${r.status}`);
    const data=await r.json();
    return res.status(200).json(data);
  }catch(error){return res.status(502).json({error:'Routing service unavailable'});}
}
