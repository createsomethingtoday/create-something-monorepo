import type {CreatorCustomization} from './creator-storefront.mjs';
export function publishedCustomization(value:unknown,slug:string):CreatorCustomization|null;
export function readPublishedStorefront(slug:string,options?:{origin?:string;fetchImpl?:typeof fetch;timeoutMs?:number}):Promise<CreatorCustomization|null>;
