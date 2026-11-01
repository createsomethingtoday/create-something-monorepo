const key=r=>JSON.stringify([r.fromEntity,r.fromId,r.role,r.toEntity,r.toId]);
export async function loadRelationPage({call,workspaceId,entity,record,isCurrent,onChange}){
 if(record.relationsLoading)return;
 record.relationsLoading=true;record.relationsError=false;onChange();
 try{
  const page=await call('records.relations',{workspaceId,entity,id:record.id,cursor:record.relationsCursor??null,limit:100});
  if(!isCurrent())return;
  if(!Array.isArray(page.items)||!Number.isSafeInteger(page.count)||page.count<0||(page.nextCursor!==null&&typeof page.nextCursor!=='string'))throw Error('Invalid relation page');
  const seen=new Set((record.relations??[]).map(key));const merged=[...(record.relations??[])];
  for(const item of page.items)if(!seen.has(key(item))){seen.add(key(item));merged.push(item);}
  record.relations=merged;record.relationCount=page.count;record.relationsCursor=page.nextCursor;record.relationsTruncated=page.nextCursor!==null;
 }catch{if(isCurrent())record.relationsError=true;}
 finally{record.relationsLoading=false;if(isCurrent())onChange();}
}
