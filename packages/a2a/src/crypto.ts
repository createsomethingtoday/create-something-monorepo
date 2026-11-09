const encoder = new TextEncoder();
export function encode64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
export function decode64(value: string): Uint8Array<ArrayBuffer> {
  const normalized=value.replaceAll('-','+').replaceAll('_','/');
  return Uint8Array.from(atob(normalized.padEnd(Math.ceil(normalized.length/4)*4,'=')),x=>x.charCodeAt(0));
}
export async function hash(value: string): Promise<string> {
  return encode64(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))));
}
export function randomToken(): string { return encode64(crypto.getRandomValues(new Uint8Array(32))); }
async function key(secret: string): Promise<CryptoKey> {
  const bytes=decode64(secret);
  if(bytes.length!==32) throw new Error('Session encryption key must be 32 bytes.');
  return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['encrypt','decrypt']);
}
export async function seal(secret:string,value:string,context:string):Promise<string> {
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(context)},await key(secret),encoder.encode(value));
  return `v1.${encode64(iv)}.${encode64(new Uint8Array(ciphertext))}`;
}
export async function unseal(secret:string,value:string,context:string):Promise<string> {
  const [version,iv,ciphertext]=value.split('.');
  if(version!=='v1'||!iv||!ciphertext) throw new Error('Unsupported encrypted record.');
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode64(iv),additionalData:encoder.encode(context)},await key(secret),decode64(ciphertext));
  return new TextDecoder().decode(plain);
}
