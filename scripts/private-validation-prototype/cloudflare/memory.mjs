// Owned finite allocation test: at most 320 MiB, under the outer deadline.
const chunks=[];
console.log(JSON.stringify({fixture:'owned-memory',uid:process.getuid(),startedAt:Date.now()}));
for(let i=0;i<40;i++){chunks.push(Buffer.alloc(8*1024*1024,1));console.log(JSON.stringify({allocatedMiB:(i+1)*8,cpu:process.cpuUsage(),at:Date.now()}));}
console.log(JSON.stringify({unexpectedlyCompleted:true}));
