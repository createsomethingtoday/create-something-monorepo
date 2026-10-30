import type {Template} from './api';
export interface Brief {q:string;notes:string;maxPrice:string;cms:string;free:boolean;category:string;style:string;types:string}
export function readBrief(search?:string):Brief;
export function briefParams(brief:Brief,current?:string):URLSearchParams;
export function discoveryQuery(search:string):URLSearchParams;
export function priceLabel(item:Template):string;
export function cmsLabel(item:Template):string;
export function evidenceFor(item:Template,brief:Brief,currentMatch?:boolean):{facts:{label:string;value:string}[];reasons:string[];limit:string};
export function comparisonSlugs(search:string):string[];
