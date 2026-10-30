import {useEffect,useRef,useState,useId,type ComponentProps,type ReactNode} from 'react';
import {TemplateSearchSidebar} from '@marketplace/marketplace/TemplateSearchSidebar';
import {activeRefinements} from '../lib/catalog-refinements.mjs';
import {TemplateFilterBar} from '@marketplace/filter/TemplateFilterBar';

/** Native dialogs keep mobile controls out of the results flow and restore focus on close. */
function ResponsivePanel({label,children}:{label:string;children:ReactNode}){
 const [mobile,setMobile]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const id=useId();
 useEffect(()=>{const query=matchMedia('(max-width: 991px)');const update=()=>setMobile(query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update)},[]);
 if(!mobile)return <>{children}</>;
 return <div className="rd-control"><button type="button" className="rd-control-trigger" aria-haspopup="dialog" onClick={()=>dialog.current?.showModal()}>{label}</button><dialog ref={dialog} className="rd-control-dialog" aria-labelledby={id} onClick={event=>{if(event.target===dialog.current)dialog.current?.close()}}><header><h2 id={id}>{label}</h2><button type="button" onClick={()=>dialog.current?.close()}>Done</button></header>{children}</dialog></div>;
}
export function CatalogSidebar(props:ComponentProps<typeof TemplateSearchSidebar>){
 return <ResponsivePanel label="Categories"><TemplateSearchSidebar {...props} collapseOnMobile={false}/></ResponsivePanel>;
}
export function CatalogFilters(props:ComponentProps<typeof TemplateFilterBar>){
 const [chips,setChips]=useState<Array<{label:string;href:string}>>([]);
 useEffect(()=>{const update=()=>setChips(activeRefinements(new URL(location.href)));update();window.addEventListener('templateFiltersChanged',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('templateFiltersChanged',update);window.removeEventListener('popstate',update)}},[]);
 return <><ResponsivePanel label={chips.length?`Filters & sort (${chips.length})`:'Filters & sort'}><TemplateFilterBar {...props}/></ResponsivePanel>{chips.length>0&&<nav className="rd-active-filters" aria-label="Applied filters">{chips.map(chip=><a key={chip.href+chip.label} href={chip.href} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();event.stopPropagation();window.location.assign(chip.href)}}} aria-label={`Remove ${chip.label} filter`}>{chip.label} <span aria-hidden="true">×</span></a>)}</nav>}</>;
}
