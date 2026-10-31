// Bound only the UI wait. Tauri's native read may still finish after timeout.
export function createContactRead({timeoutMs=10000,schedule=(fn,ms)=>setTimeout(fn,ms),clear=timer=>clearTimeout(timer)}={}) {
 let cancel;
 return {
  cancel(){cancel?.();},
  read(task){
   cancel?.();
   return new Promise((resolve,reject)=>{
    let settled=false,timer;
    const finish=(fn,value)=>{if(settled)return;settled=true;clear(timer);if(cancel===stop)cancel=undefined;fn(value);};
    const stop=()=>finish(reject,Object.assign(new Error('People read superseded'),{code:'contact_read_superseded'}));cancel=stop;
    timer=schedule(()=>finish(reject,Object.assign(new Error('People search timed out'),{code:'contact_read_timeout'})),timeoutMs);
    Promise.resolve().then(()=>settled?undefined:task()).then(value=>finish(resolve,value),error=>finish(reject,error));
   });
  }
 };
}
