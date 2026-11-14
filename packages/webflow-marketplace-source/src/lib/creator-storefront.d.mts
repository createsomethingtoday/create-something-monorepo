import type {Template} from './api';
export interface CreatorSource {slug:string;name:string;bio:string;avatar:string;links:string[]}
export interface CreatorCustomization {headline?:string;bio?:string;coverUrl?:string;coverAlt?:string;websiteUrl?:string;portfolioUrl?:string;support?:string;contactUrl?:string;picks?:Array<{slug:string;note?:string}>}
export interface Storefront {slug:string;name:string;avatar:string;headline:string;bio:string;total:number;coverUrl:string;coverAlt:string;links:Array<{href:string;label:string}>;selectionTitle:string;selected:Array<{template:Template;note:string}>;support:{text:string;href:string}|null}
export function safeProfileUrl(value:unknown):string;
export function profileLinkLabel(value:unknown):string;
export function buildStorefront(profile:CreatorSource,items:Template[],total:number,custom?:CreatorCustomization):Storefront;

export function safeContactUrl(value:unknown):string;
