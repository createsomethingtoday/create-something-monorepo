export type Task = 'recap' | 'handoff' | 'followup';
export type Step = 'welcome'|'task'|'scope'|'plan'|'working'|'failed'|'review'|'receipt';
export interface Workflow { step:Step; task:Task; allowed:boolean; draft:string; }
export type Event = {type:'begin'|'next'|'start'|'finish'|'fail'|'retry'|'approve'|'reset'} | {type:'select';task:Task} | {type:'scope';allowed:boolean} | {type:'edit';draft:string};
export const tasks:Record<Task,{label:string;description:string;draft:string}>={
 recap:{label:'Prepare a meeting recap',description:'Turn a conversation into decisions and next steps.',draft:'Meeting recap\n\nDecision: Pilot the new intake flow with the support team.\nNext step: Morgan will prepare three sample requests by Friday.\nOpen question: Who will review the pilot results?'},
 handoff:{label:'Organize a project handoff',description:'Give the next person a useful place to begin.',draft:'Handoff: Intake pilot\n\nOwner: Morgan\nReady: Three sample requests and the draft intake checklist.\nNext: Review the checklist with the support team on Friday.\nBoundary: Do not publish the flow before the pilot review.'},
 followup:{label:'Draft a follow-up',description:'Make the next conversation easier to start.',draft:'Hi Morgan,\n\nThanks for walking through the intake pilot. Could you prepare three sample requests before Friday? We can review the checklist together and decide whether it is ready for the support team.\n\nThank you!'}
};
export const initialState=():Workflow=>({step:'welcome',task:'recap',allowed:false,draft:''});
export function transition(s:Workflow,e:Event):Workflow{
 if(e.type==='reset')return initialState();
 if(e.type==='begin'&&s.step==='welcome')return {...s,step:'task'};
 if(e.type==='select'&&s.step==='task')return {...s,task:e.task,draft:''};
 if(e.type==='scope'&&s.step==='scope')return {...s,allowed:e.allowed};
 if(e.type==='next'&&s.step==='task')return {...s,step:'scope'};
 if(e.type==='next'&&s.step==='scope'&&s.allowed)return {...s,step:'plan'};
 if(e.type==='start'&&s.step==='plan'&&s.allowed)return {...s,step:'working',draft:tasks[s.task].draft};
 if(e.type==='fail'&&s.step==='working')return {...s,step:'failed'};
 if(e.type==='retry'&&s.step==='failed')return {...s,step:'working'};
 if(e.type==='finish'&&s.step==='working')return {...s,step:'review'};
 if(e.type==='edit'&&s.step==='review')return {...s,draft:e.draft};
 if(e.type==='approve'&&s.step==='review'&&s.allowed&&s.draft.trim())return {...s,step:'receipt'};
 return s;
}
