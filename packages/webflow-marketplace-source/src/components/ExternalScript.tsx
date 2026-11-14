import {useEffect} from 'react';
export default function ExternalScript({src,onLoad}:{src:string;strategy?:string;onLoad?:()=>void}){
 useEffect(()=>{const script=document.createElement('script');script.src=src;script.async=true;script.onload=()=>onLoad?.();document.head.append(script);return()=>{script.remove()}},[src]);return null;
}
