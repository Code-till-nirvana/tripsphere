import {useEffect,useState} from 'react';
import {Umbrella,MapPin,CloudRain,Cloud,Sun} from 'lucide-react';
import {getWeatherByPlace,getWeatherLabel} from '@/service/TravelApi';
export default function WeatherWidget({trip,onWeather}){
 const [weather,setWeather]=useState(null);const place=trip?.userSelection?.location?.label;
 useEffect(()=>{let active=true;(async()=>{const data=await getWeatherByPlace(place,trip?.userSelection?.noOfDays||7);if(active){setWeather(data);onWeather?.(data||[]);}})();return()=>{active=false}},[place,trip?.userSelection?.noOfDays,onWeather]);
 if(!weather)return <div className="section-block" role="status"><div className="section-title"><div><div className="section-kicker"><CloudRain size={13}/> WEATHER</div><h2>Weather intelligence</h2><span>Checking the forecast for your destination.</span></div></div><div className="weather-loading"/></div>;
 if(!weather.length)return null;
 return <div className="section-block"><div className="section-title"><div><div className="section-kicker"><CloudRain size={13}/> WEATHER INTELLIGENCE</div><h2>Forecast-aware trip planning</h2><span><MapPin size={12} style={{display:'inline'}}/> {place}</span></div></div><div className="weather-strip">{weather.map(w=>{const WeatherIcon=w.rain>50?CloudRain:w.code===0?Sun:Cloud;return <div className={`weather-card ${w.rain>=50?'weather-risk':''}`} key={w.date}><b>{new Date(w.date).toLocaleDateString(undefined,{weekday:'short'})}</b><small>{w.date}</small><WeatherIcon size={24} className="weather-symbol" aria-label={getWeatherLabel(w.code)}/><b>{w.max}° / {w.min}°</b><small><Umbrella size={11} style={{display:'inline'}}/> {w.rain}% rain</small><small style={{display:'block',marginTop:4}}>{getWeatherLabel(w.code)}</small>{w.rain>=50&&<em>Plan indoor stops</em>}</div>})}</div></div>
}
