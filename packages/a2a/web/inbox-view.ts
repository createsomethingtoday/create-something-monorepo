/** UI-only projection of the loaded history. Counts do not imply unread state. */
export type InboxMessage = {threadId:string;createdAt:number;sequence:number;text:string;fromAgentId:string;toAgentId:string;fromAgentName?:string;toAgentName?:string};
export function conversationCount(messages:InboxMessage[]) {
  return new Set(messages.map(message=>message.threadId)).size;
}
export function conversationGroups<T extends InboxMessage>(messages:T[],query=''):[string,T[]][] {
  const groups=new Map<string,T[]>();
  for(const message of [...messages].sort((a,b)=>a.createdAt-b.createdAt||a.sequence-b.sequence)) {
    const group=groups.get(message.threadId)??[];group.push(message);groups.set(message.threadId,group);
  }
  const term=query.trim().toLocaleLowerCase();
  return [...groups.entries()].filter(([id,items])=>!term||[id,...items.flatMap(message=>[message.text,message.fromAgentName??'',message.toAgentName??'',message.fromAgentId,message.toAgentId])].some(value=>value.toLocaleLowerCase().includes(term)))
    .sort((a,b)=>(b[1].at(-1)?.createdAt??0)-(a[1].at(-1)?.createdAt??0));
}
