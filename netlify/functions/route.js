import handler from '../../api/route.js';
export default async function(event){
  let statusCode=200, body={};
  const res={status(code){statusCode=code;return this;},setHeader(){},json(payload){body=payload;},end(payload=''){try{body=JSON.parse(payload)}catch{body=payload}}};
  await handler({query:event.queryStringParameters||{}},res);
  return {statusCode,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)};
}
