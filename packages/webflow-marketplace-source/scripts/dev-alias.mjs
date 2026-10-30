// TCP forwarder for the marketplace-dev.webflow.com alias. Template demos only allow
// framing from http://*.webflow.com on port 80, and a pf rule sends that port here.
// pf must never point at the preview's own port: direct connections to a pf target
// port hang on this setup, which makes Source think the preview failed to start.
import net from 'node:net';
const listenPort=Number(process.env.ALIAS_PORT||4380),target=Number(process.env.PREVIEW_PORT||4321);
net.createServer(client=>{
 const upstream=net.connect({host:'::1',port:target});
 client.pipe(upstream).pipe(client);
 for(const s of [client,upstream])s.on('error',()=>{client.destroy();upstream.destroy()});
}).listen(listenPort,'::1',()=>console.log(`alias forwarder [::1]:${listenPort} -> [::1]:${target}`));
