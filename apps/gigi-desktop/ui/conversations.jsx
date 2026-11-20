import React, {useEffect,useState} from 'react';
import {B,Panel,Message,Text,VStack} from './components.jsx';

// Browsing transcripts is read-only and never creates curated memory.
export function Conversations({ctx}) {
  const [revision,reload]=useState(0);
  const [read,setRead]=useState({workspace:null,items:[],loading:true,error:null});
  useEffect(()=>{
    let active=true;
    setRead({workspace:ctx.workspaceId,items:[],loading:true,error:null});
    Promise.resolve().then(()=>ctx.bridge.chatList(ctx.workspaceId)).then(result=>{
      if(!active)return;
      const items=Array.isArray(result)?result:result?.sessions||result?.items;
      if(!Array.isArray(items))throw Error('Saved conversations could not be read.');
      setRead({workspace:ctx.workspaceId,items:items.filter(item=>typeof item.sessionId==='string'),loading:false,error:null});
    }).catch(error=>{if(active)setRead({workspace:ctx.workspaceId,items:[],loading:false,error:error.message||String(error)});});
    return()=>{active=false;};
  },[ctx.workspaceId,revision]);
  const current=read.workspace===ctx.workspaceId?read:{items:[],loading:true};
  return <Panel title="Saved conversations" actions={<B disabled={current.loading} onClick={()=>reload(value=>value+1)}>Refresh conversations</B>}>
    <Text color="secondary">Chats saved in this workspace. Reviewed Memory entries remain separate.</Text>
    {current.error?<Message error>{current.error} Use Refresh conversations to try again.</Message>:current.loading?<Text role="status">Loading conversations…</Text>:current.items.length?<VStack gap={2}>
      {current.items.map(item=><B key={item.sessionId} variant="ghost" className="gigi-record-row" data-chat-session={item.sessionId} disabled={ctx.chat?.pending||ctx.chat?.reading}>
        <VStack gap={1} hAlign="start"><Text weight="semibold">{item.title||item.record?.title||'Conversation'}</Text><Text type="supporting" color="secondary">{[item.state,item.updatedAt].filter(Boolean).join(' · ')}</Text></VStack>
      </B>)}
    </VStack>:<Text>No saved conversations yet.</Text>}
  </Panel>;
}
