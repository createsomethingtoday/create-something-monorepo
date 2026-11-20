// @vitest-environment node
import {render} from 'svelte/server';
import {expect,it} from 'vitest';
import DecisionPanel from './ClearDecisionPanel.svelte';
it('retains every decision boundary, evidence and destination for no-JavaScript readers',()=>{
 const {body}=render(DecisionPanel,{props:{title:'A bounded decision',items:[{label:'Prepare',summary:'Local draft',title:'Prepare locally',detail:'Use the named source.'},{label:'Stop',summary:'Ask first',title:'Missing authority',detail:'Do not infer permission.',evidence:['Owner required'],receipts:['policy-a'],actions:[{label:'Clarify scope',href:'#scope'}]}]}});
 const fallback=body.match(/<noscript>([\s\S]*?)<\/noscript>/)?.[1]??'';
 for(const text of ['Use the named source.','Do not infer permission.','Owner required','policy-a','href="#scope"'])expect(fallback).toContain(text);
});
