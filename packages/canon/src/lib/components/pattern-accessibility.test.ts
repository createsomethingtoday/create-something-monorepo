// @vitest-environment jsdom
import {createRawSnippet,flushSync,mount,unmount} from 'svelte';
import {afterEach,expect,it,vi} from 'vitest';
import DecisionPanel from './clear/ClearDecisionPanel.svelte';
import DataTable from './data/DataTable.svelte';
const instances:ReturnType<typeof mount>[]=[];
function render(component:any,props:any){const target=document.createElement('div');document.body.append(target);instances.push(mount(component,{target,props}));flushSync();return target;}
afterEach(async()=>{for(const i of instances)await unmount(i);instances.length=0;document.body.replaceChildren();});
const items=[{label:'Ready',summary:'Can prepare',title:'Draft only',detail:'Prepare a local sample.',tone:'allow'},{label:'Review',summary:'Ask first',title:'Your decision',detail:'Stop before sending.',tone:'review'}];
it('keeps decision panels independent and keyboard-selectable',()=>{const a=render(DecisionPanel,{title:'One',items,autoRotate:false});const b=render(DecisionPanel,{title:'Two',items,autoRotate:false});expect(a.querySelector('[role=tabpanel]')!.id).not.toBe(b.querySelector('[role=tabpanel]')!.id);const first=a.querySelector('[role=tab]')!;first.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));flushSync();expect(a.querySelector('[aria-selected=true]')?.textContent).toContain('Review');expect(document.activeElement).toBe(a.querySelector('[aria-selected=true]'));expect(b.querySelector('[aria-selected=true]')?.textContent).toContain('Ready');});
it('nested table controls do not also activate the record row',()=>{const onrowclick=vi.fn();const cell=createRawSnippet(()=>({render:()=>'<button>Inspect sample</button>'}));const target=render(DataTable,{columns:[{key:'name',label:'Sample'}],rows:[{name:'Intake'}],cell,onrowclick});const button=target.querySelector<HTMLButtonElement>('tbody button')!;button.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));button.click();expect(onrowclick).not.toHaveBeenCalled();target.querySelector('tbody tr')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));expect(onrowclick).toHaveBeenCalledOnce();});
