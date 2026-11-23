export const SelectTravelList = [
 {id:1,title:'Just Me',desc:'Solo exploration',icon:'✈️',people:'1 person'},
 {id:2,title:'A Couple',desc:'Two travellers',icon:'🥂',people:'2 people'},
 {id:3,title:'Family',desc:'3–5 travellers',icon:'🏡',people:'3 to 5 People'},
 {id:4,title:'Friends',desc:'5–10 travellers',icon:'⛵',people:'5 to 10 people'}
];
export const AI_PROMPT = `Generate a realistic travel plan for a trip FROM {origin} TO {location}, for {totalDays} days starting {startDate}, for {traveler}. Interests: {interests}. Return ONLY valid JSON (no markdown) with these keys:
hotel_options: array of 4 objects {name,address,price,image_url,geo_coordinates,rating,description,amenities},
itinerary: array of days, each {day,plan:[{time,place,details,image_url,geo_coordinates,ticket_pricing,rating,travel_time,best_time,category}]},
transport_summary: {recommended_mode,reason},
tips: array of strings.
Use the origin and destination context to make the route geographically sensible. Every itinerary stop and hotel must include accurate latitude,longitude values in geo_coordinates whenever possible. Prioritize realistic attractions, logical geographic grouping, opening-time awareness and the user's interests. Do not generate a trip budget or budget breakdown.`;
