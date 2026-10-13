import assert from 'node:assert/strict';
const origin=process.argv[2];
assert(origin && /^https?:\/\//.test(origin),'Pass the release origin');
const forbidden=/HydroX|Calvin Heffes|Chord Energy|Chevron|Hess|Bldg\. B|Building B|non.hazmat|non.toxic|non.flammable|non.carcinogenic|biodegradable|clean feedstocks|More Oil From Every Well|raises production|boosts production|supercharge production|changes the rock itself|from every mine|Higher Recovery|industrial scale/i;
const expected={
 '/':['One platform. Two markets.','How our chemistry works','Water Treatment'],
 '/oil-gas':['PetroX Boost','produced-water','designed to improve porosity and permeability'],
 '/mining':['LithX','laboratory test','Copper','Gold'],
 '/about':['Sanjay Jain','Hayden Lippelman','Suite B'],
 '/news':['MaverickX company news','press@maverickx.com']
};
for(const [path,needles] of Object.entries(expected)){
 const res=await fetch(new URL(path,origin)); assert.equal(res.status,200,path);const html=await res.text();
 for(const needle of needles)assert(html.includes(needle),path+': missing '+needle);
 assert(!forbidden.test(html),path+': restricted or stale content');
 assert(!/PLACEHOLDER|href="#"/.test(html),path+': unfinished content');
 assert(html.includes('rel="canonical"'),path+': canonical missing');
 if(path==='/') assert(!/PetroX|LithX/i.test(html),'home: product names removed');
 if(path==='/about'){
  const photos=[...html.matchAll(/src="(\/redesign\/team-[^"]+)"/g)];assert.equal(photos.length,6);
  for(const [,src] of photos)assert.equal((await fetch(new URL(src,origin))).status,200,src);
 }
 console.log('PASS content, metadata and assets '+path);
}
for(const path of ['/privacy','/terms']){
 const res=await fetch(new URL(path,origin));assert.equal(res.status,200,path);const html=await res.text();
 assert(!forbidden.test(html),path+': stale shared navigation/footer');
 assert(!html.includes('href="/water-treatment"'),path+': separate water market');console.log('PASS shared navigation '+path);
}
const retired=await fetch(new URL('/water-treatment',origin),{redirect:'manual'});
assert.equal(retired.status,308);assert.equal(retired.headers.get('location'),'/oil-gas#produced-water');
console.log('PASS retired market redirects to PetroX');
const admin=await fetch(new URL('/admin/content',origin),{redirect:'manual'});
assert.equal(admin.status,303);assert.equal(admin.headers.get('location'),'/admin/login');
console.log('PASS admin authentication boundary');
// Deliberately no real lead submission. Only invalid input, rejected before D1/email writes.
const invalid=await fetch(new URL('/api/contact',origin),{method:'POST',headers:{'Content-Type':'application/json',Origin:new URL(origin).origin},body:'{}'});
assert.equal(invalid.status,400);console.log('PASS non-sending contact validation');
