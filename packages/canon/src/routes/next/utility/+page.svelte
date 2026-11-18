<script lang="ts">
 import '$lib/styles/canon.css';
 import {onMount} from 'svelte';
 import ClearErrorPage from '$lib/components/clear/ClearErrorPage.svelte';
 import PageActions from '$lib/components/PageActions.svelte';
 import MarkdownPreviewModal from '$lib/components/MarkdownPreviewModal.svelte';
 import LoginForm from '$lib/auth/components/LoginForm.svelte';
 import SignupForm from '$lib/auth/components/SignupForm.svelte';
 import MagicLinkForm from '$lib/auth/components/MagicLinkForm.svelte';
 import UserMenu from '$lib/auth/components/UserMenu.svelte';
 import Combobox from '$lib/forms/Combobox.svelte';
 import DatePicker from '$lib/forms/DatePicker.svelte';
 import FileUpload from '$lib/forms/FileUpload.svelte';
 let light=$state(false), status=$state(404), mode=$state('login'), preview=$state(false), markdown=$state(''), ready=$state(false);
 let country=$state<string|undefined>('uk'), date=$state<Date|undefined>(new Date(2026,10,13));
 let files=$state<{file:File}[]>([]), notice=$state('No local action yet.');
 const user={id:'offline-user',email:'sample@example.invalid',tier:'free' as const,source:'io' as const};
 onMount(()=>{ready=true;files=[{file:new File(['Offline sample.'],'sample.txt',{type:'text/plain'})}];});
 async function refuseSubmit(){notice='Offline fixture: no identity request was made.';return false;}
</script>
<svelte:head><title>Canon utility review · Offline</title></svelte:head>
<div class="utility-page" data-theme={light?'light':'dark'}>
 <main>
 <header><a href="/next">Canon</a><button onclick={()=>light=!light}>{light?'Dark':'Light'} appearance</button></header>
 <h1>Everyday tools, clear decisions.</h1><p>Offline component fixture. Auth callbacks do not contact Identity. Files remain local; external chat and account navigation are not part of this review.</p>
 <noscript><p>Interactive examples require JavaScript. Recovery links and form labels remain available; no fixture form has a server action.</p></noscript>
 <section aria-labelledby="article-title"><h2 id="article-title">Article actions</h2><div class="article"><p>A local article with a Markdown preview.</p><PageActions title="Offline sample" content="A draft for local review." onpreview={(text)=>{markdown=text;preview=true;}}/></div></section>
 <section aria-labelledby="account-title"><h2 id="account-title">Account forms</h2><p>Change modes or inspect fields. Do not enter real credentials.</p><div class="account"><div>{#if mode==='login'}<LoginForm onSubmit={refuseSubmit} onSwitchToSignup={()=>mode='signup'} onSwitchToMagicLink={()=>mode='magic'} onForgotPassword={()=>notice='Offline recovery selected.'}/>{:else if mode==='signup'}<SignupForm onSubmit={refuseSubmit} onSwitchToLogin={()=>mode='login'} onSwitchToMagicLink={()=>mode='magic'}/>{:else}<MagicLinkForm onSubmit={refuseSubmit} onSwitchToLogin={()=>mode='login'}/>{/if}</div><div><UserMenu {user} name="Sample reader" avatarUrl="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23777'/%3E%3C/svg%3E" settingsHref="#account-title" onLogout={()=>notice='Offline sign-out callback selected.'}/></div></div></section>
 <section aria-labelledby="fields-title"><h2 id="fields-title">Local fields</h2><div class="fields"><div><h3>Destination</h3><Combobox ariaLabel="Destination" options={[{value:'uk',label:'United Kingdom'},{value:'us',label:'United States'},{value:'ca',label:'Canada'}]} bind:value={country}/><p>Selected: {country||'None'}</p></div><div><h3>Review date</h3><DatePicker bind:value={date}/></div><div>{#if ready}<FileUpload bind:files accept=".txt" maxSize={1024} label="Choose a local text sample" hint="Offline only. Up to 1 KB; no upload request."/>{/if}</div></div><p role="status">{notice}</p></section>
 <section aria-label="Recovery preview"><button onclick={()=>status=status===404?503:404}>Show {status===404?'503':'404'} recovery</button><ClearErrorPage {status} propertyLabel="Offline review" primaryLabel="Review local fields" primaryHref="#fields-title" secondaryHref="/next"/></section>
 <section data-theme="light" class="nested"><h2>Explicit light with nested dark</h2><div data-theme="dark" class="nested"><p>The inner scope restores black.</p><ClearErrorPage status={503} propertyLabel="Nested dark" primaryLabel="Return to sample" primaryHref="#article-title"/></div></section>
 </main><MarkdownPreviewModal bind:open={preview} content={markdown}/>
</div>
<style>
 header>a{display:inline-flex;align-items:center;min-height:44px;min-width:44px;}
 .utility-page{min-height:100vh;background:var(--color-performance-bg-pure);color:var(--color-performance-fg-primary)}main{max-width:85rem;margin:auto;padding:clamp(1rem,4vw,4rem)}header,.article{display:flex;align-items:center;justify-content:space-between;gap:1rem}section{padding-block:2rem;border-top:1px solid var(--color-performance-border-default)}h1{font-size:clamp(2.5rem,5vw,4.5rem);max-width:18ch}h2{margin-bottom:1rem}p{max-width:65ch;margin-block:1rem}button{min-height:44px;padding:.5rem 1rem;border:1px solid var(--color-performance-border-default);border-radius:var(--radius-performance-scale-md);background:var(--color-performance-bg-surface);color:var(--color-performance-fg-primary)}button:focus-visible,a:focus-visible{outline:2px solid var(--color-performance-focus);outline-offset:3px}.account,.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2rem}.fields>div:last-child{grid-column:1/-1}.nested{padding:1rem;background:var(--color-performance-bg-pure);color:var(--color-performance-fg-primary)}@media(max-width:600px){.account,.fields{grid-template-columns:minmax(0,1fr)}}
</style>
