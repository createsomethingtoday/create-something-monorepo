// @vitest-environment jsdom
import { mount, unmount, flushSync, tick } from 'svelte';
import { afterEach, expect, it, vi } from 'vitest';
import PageActions from './PageActions.svelte';
let instance:ReturnType<typeof mount>;
afterEach(async()=>{if(instance)await unmount(instance);document.body.replaceChildren();});
it('opens the article menu for keyboard use and restores focus on Escape',async()=>{
 const target=document.createElement('div');document.body.append(target);
 instance=mount(PageActions,{target,props:{title:'Sample',content:'Draft',onpreview:vi.fn()}});flushSync();
 const trigger=target.querySelector<HTMLButtonElement>('.trigger')!;trigger.focus();trigger.click();flushSync();await tick();
 const items=target.querySelectorAll<HTMLButtonElement>('[role=menuitem]');expect(document.activeElement).toBe(items[0]);
 items[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));expect(document.activeElement).toBe(items[1]);
 items[1].dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));flushSync();expect(target.querySelector('[role=menu]')).toBeNull();expect(document.activeElement).toBe(trigger);
});
it('returns focus before handing the preview to its modal owner',async()=>{
 const target=document.createElement('div');document.body.append(target);const focusAtPreview=vi.fn();
 instance=mount(PageActions,{target,props:{title:'Sample',content:'Draft',onpreview:()=>focusAtPreview(document.activeElement)}});flushSync();
 const trigger=target.querySelector<HTMLButtonElement>('.trigger')!;trigger.click();flushSync();await tick();
 target.querySelectorAll<HTMLButtonElement>('[role=menuitem]')[1].click();flushSync();expect(focusAtPreview).toHaveBeenCalledWith(trigger);
});

it('keeps the account menu keyboard reachable without invoking logout', async()=>{
 const {default:UserMenu}=await import('../auth/components/UserMenu.svelte');
 const target=document.createElement('div');document.body.append(target);const logout=vi.fn();
 instance=mount(UserMenu,{target,props:{user:{id:'offline',email:'sample@example.invalid',tier:'free',source:'io'},onLogout:logout,avatarUrl:'data:image/svg+xml,%3Csvg/%3E'}});flushSync();
 const trigger=target.querySelector<HTMLButtonElement>('.trigger')!;expect(trigger.getAttribute('aria-label')).toBe('Account menu for sample');trigger.focus();trigger.click();flushSync();
 const items=target.querySelectorAll<HTMLElement>('[role=menuitem]');expect(document.activeElement).toBe(items[0]);
 items[0].dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true}));expect(document.activeElement).toBe(items[1]);
 items[1].dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));flushSync();expect(document.activeElement).toBe(trigger);expect(logout).not.toHaveBeenCalled();
});

it('preserves local file rejection and removal callbacks',async()=>{
 const {default:FileUpload}=await import('../forms/FileUpload.svelte');
 const target=document.createElement('div');document.body.append(target);const onchange=vi.fn(),onreject=vi.fn();
 instance=mount(FileUpload,{target,props:{files:[{file:new File(['sample'],'sample.txt',{type:'text/plain'})}],accept:'.txt',maxSize:1024,onchange,onreject}});flushSync();
 const input=target.querySelector<HTMLInputElement>('input[type=file]')!;
 Object.defineProperty(input,'files',{value:[new File(['no'],'bad.png',{type:'image/png'})],configurable:true});input.dispatchEvent(new Event('change',{bubbles:true}));flushSync();expect(onreject).toHaveBeenCalledOnce();
 target.querySelector<HTMLButtonElement>('.file-remove')!.click();flushSync();expect(onchange).toHaveBeenLastCalledWith([]);
});
