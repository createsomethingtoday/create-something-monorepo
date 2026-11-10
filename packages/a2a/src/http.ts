export class HttpError extends Error {
  constructor(public code:string,public status:number,message:string) {super(message);}
}
export function json(data:unknown,status=200,headers:HeadersInit={}):Response {
  return Response.json(data,{status,headers:{'cache-control':'no-store',...headers}});
}
export async function readJson(request:Request,limit=32768):Promise<Record<string,unknown>> {
  const reader=request.body?.getReader();
  if(!reader)throw new HttpError('invalid_request',400,'A JSON body is required.');
  const chunks:Uint8Array[]=[];let length=0;
  try {for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>limit){await reader.cancel();throw new HttpError('payload_too_large',413,'Request body is too large.');}chunks.push(value);}}
  finally {reader.releaseLock();}
  const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  let body:unknown;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw new HttpError('invalid_json',400,'Request body must be valid JSON.');}
  if(!body||typeof body!=='object'||Array.isArray(body))throw new HttpError('invalid_request',400,'Request body must be an object.');
  return body as Record<string,unknown>;
}
export function stringField(body:Record<string,unknown>,name:string,max=512):string {
  const value=body[name];if(typeof value!=='string'||!value.trim()||value.length>max)throw new HttpError('invalid_request',400,`A valid ${name} is required.`);return value;
}
export function sameOrigin(request:Request,baseUrl:string):void {
  const origin=request.headers.get('origin');
  if(origin!==new URL(baseUrl).origin)throw new HttpError('origin_denied',403,'Use the owner console for this action.');
}
