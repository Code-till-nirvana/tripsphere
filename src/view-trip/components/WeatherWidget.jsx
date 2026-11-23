import React,{useEffect,useState} from 'react';
import {Umbrella,MapPin,CloudRain} from 'lucide-react';
import {getWeatherByPlace,getWeatherLabel} from '@/service/TravelApi';
export default function WeatherWidget({trip,onWeather}){
 const [weather,setWeather]=useState(null);const place=trip?.userSelection?.location?.label;
 useEffect(()=>{let active=true;(async()=>{const data=await getWeatherByPlace(place,trip?.userSelection?.noOfDays||7);if(active){setWeather(data);onWeather?.(data||[]);}})();return()=>{active=false}},[place,trip?.userSelection?.noOfDays,onWeather]);
 if(!weather)return <div className="section-block"><div className="section-title"><div><div className="section-kicker"><CloudRain size={13}/> WEATHER</div><h2>Weather intelligence</h2><span>Checking the forecast for your destination.</span></div></div><div className="trip-alert">Weather data is currently unavailable for this destination.</div></div>;
 return <div className="section-block"><div className="section-title"><div><div className="section-kicker"><CloudRain size={13}/> WEATHER INTELLIGENCE</div><h2>Forecast-aware trip planning</h2><span><MapPin size={12} style={{display:'inline'}}/> {place}</span></div></div><div className="weather-strip">{weather.map(w=><div className={`weather-card ${w.rain>=50?'weather-risk':''}`} key={w.date}><b>{new Date(w.date).toLocaleDateString(undefined,{weekday:'short'})}</b><small>{w.date}</small><div style={{fontSize:22,margin:'8px 0'}}>{w.rain>50?'🌧️':w.code===0?'☀️':'⛅'}</div><b>{w.max}° / {w.min}°</b><small><Umbrella size={11} style={{display:'inline'}}/> {w.rain}% rain</small><small style={{display:'block',marginTop:4}}>{getWeatherLabel(w.code)}</small>{w.rain>=50&&<em>Plan indoor stops</em>}</div>)}</div></div>
}
