import React, {useEffect,useRef,useState} from 'react';
import {Grid} from '@astryxdesign/core/Grid';
import {B,Choice,Panel,Heading,Text,VStack,HStack} from './components.jsx';
import {formatMoney,relatedEndpoint} from '../web/model.mjs';
const fields=record=>record.fields||{};
const links=(record,entity)=>(record.relations||[]).map(link=>relatedEndpoint(link,record.entity,record.id)).filter(Boolean).filter(link=>link.entity===entity).map(link=>link.title).filter(Boolean).join(' · ');
const cell=(label,value)=><VStack gap={1}><Text type="supporting" color="secondary">{label}</Text><Text textWrap="wrap">{value===null||value===undefined||value===''?'Not set':String(value)}</Text></VStack>;
export function Directory({ctx,entity}){
 const company=entity==='companies';
 return <VStack gap={0} className="directory-list">{ctx.state.records.map(record=><B key={record.id} variant="ghost" className="gigi-record-row" data-open={record.id} data-entity={entity}>
  <Grid columns={{minWidth:180,max:4}} gap={4} width="100%">
   <VStack gap={1} hAlign="start"><Text weight="semibold">{record.title}</Text><Text type="supporting" color="secondary">{fields(record).Email||fields(record).Website||''}</Text>{record.detailsUnavailable&&<Text type="supporting">Details unavailable · open to retry</Text>}</VStack>
   {cell(company?'Type':'Role',fields(record)[company?'Type':'Role'])}
   {cell(company?'People':'Company',links(record,company?'contacts':'companies'))}
   {cell('Status',record.status||fields(record).Status)}
  </Grid>
 </B>)}</VStack>;
}
export function Services({ctx}){
 return <VStack gap={3}>{ctx.state.records.map(record=><B key={record.id} variant="ghost" className="gigi-record-row" data-open={record.id} data-entity="services"><VStack gap={3} hAlign="start" width="100%">
  <Heading level={3}>{record.title}</Heading>{record.detailsUnavailable?<Text role="alert">Service details could not be read. Open this service to retry.</Text>:<><Text color="secondary">{fields(record).Description||'Add a description in service details.'}</Text>
  <HStack gap={5} wrap="wrap">{cell('Type',fields(record).Type)}{cell('Rate',Number.isSafeInteger(fields(record).Rate)?`${ctx.state.currencyKnown?formatMoney(fields(record).Rate,ctx.state.currency):'Currency not set'}${fields(record)['Rate Type']?' · '+fields(record)['Rate Type']:''}`:'Not recorded')}{cell('Default hours',fields(record)['Default Hours']??'Not set')}{cell('Availability',fields(record).Active===true?'Active':fields(record).Active===false?'Inactive':'Not set')}</HStack></>}
 </VStack></B>)}</VStack>;
}
export function Profile({ctx}){
 const record=ctx.state.records[0],value=fields(record||{}),prefs=ctx.preferences;
 return <VStack gap={5}><Panel title={record?.title||'Your profile'} actions={record?<B data-profile-edit={record.id}>Edit profile & defaults</B>:<B data-new="profile">Create profile</B>}>
  {record?.detailsUnavailable?<Text role="alert">Profile details could not be read. Open Edit profile & defaults to retry.</Text>:<Grid columns={{minWidth:180,max:3}} gap={4}>{cell('Currency',value.Currency)}{cell('Day rate',Number.isSafeInteger(value['Default Day Rate'])?value.Currency?formatMoney(value['Default Day Rate'],value.Currency):'Currency not set':'Not recorded')}{cell('Hourly rate',Number.isSafeInteger(value['Default Hourly Rate'])?value.Currency?formatMoney(value['Default Hourly Rate'],value.Currency):'Currency not set':'Not recorded')}{cell('Tax set-aside',value['Tax Set-Aside Percentage']!=null?value['Tax Set-Aside Percentage']+'%':null)}{cell('Invoice prefix',value['Invoice Prefix'])}{cell('Entity type',value['Entity Type'])}</Grid>}
 </Panel><Panel title="Your daily workspace"><Grid columns={{minWidth:220,max:2}} gap={4}>
  <Choice id="preference-startPage" label="Start my day on" data-preference="startPage" value={prefs.startPage} options={['overview','tasks','gigs','music','social','schedule','finances','contacts'].map(id=>[id,({overview:'Today',social:'Social',finances:'Money',contacts:'People'})[id]||id[0].toUpperCase()+id.slice(1)])}/>
  <Choice id="profile-record-layout" label="Record layout" data-preference="collectionView" value={prefs.collectionView} options={[["list","List"],["cards","Cards"]]}/>
  <Choice id="profile-density" label="Spacing" data-preference="density" value={prefs.density} options={[["comfortable","Comfortable"],["compact","Compact"]]}/>
  <Choice id="profile-chat-width" label="Ask GiGi width" data-preference="chatWidth" value={prefs.chatWidth} options={[["standard","Standard"],["wide","Wide"]]}/>
 </Grid><B data-page="settings" data-nav-target="workspace-preferences">Appearance & other settings</B></Panel></VStack>;
}

function PlaceCard({ctx,record}){
 const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[record.id,ctx.workspaceId]);
 const scope=[ctx.workspaceId,record.id,record.title,JSON.stringify(fields(record)),record.detailsUnavailable].join('|'),latestScope=useRef(scope);latestScope.current=scope;
 useEffect(()=>{setPreview(null);setError(null);setBusy(false);},[scope]);
 const request=async(operation)=>{
  if(busy||record.detailsUnavailable)return;setBusy(true);setError(null);
  try{const result=await ctx.bridge.call(operation,{workspaceId:ctx.workspaceId,id:record.id});if(alive.current&&latestScope.current===scope&&operation==='places.mapPreview'){if(typeof result.dataUrl!=='string'||!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(result.dataUrl))throw Error('Map preview unavailable.');setPreview({...result,scope});}}
  catch(error){if(alive.current&&latestScope.current===scope)setError(error.message||String(error));}
  finally{if(alive.current&&latestScope.current===scope)setBusy(false);}
 };
 const address=['Address','City','Region','Country'].map(key=>fields(record)[key]).filter(Boolean).join(', ');
 return <Panel title={record.title} className="place-card">
  {record.detailsUnavailable?<Text role="alert">Place details could not be read. Open this place to retry before loading a map.</Text>:preview?.dataUrl&&preview.scope===scope?<><img className="place-map-image" src={preview.dataUrl} alt={`Apple Maps preview for ${preview.matchedName||record.title}`} onError={()=>{setPreview(null);setError('Map image unavailable. Try loading again.');}}/><Text type="supporting" color="secondary">Map data © Apple · Matched {preview.matchedName}. Check the destination in Maps.</Text></>:<VStack gap={2}><Text color="secondary">{address||'Add an address for a more precise map.'}</Text><B disabled={busy} onClick={()=>void request('places.mapPreview')}>{busy?'Loading map…':'Load map preview'}</B><Text type="supporting" color="secondary">Looks up this saved place with Apple Maps.</Text></VStack>}
  {error&&<Text role="alert">{error}</Text>}
  <HStack gap={3} wrap="wrap"><Text type="supporting">{fields(record).Type||'Place'}</Text><B data-open={record.id} data-entity="locations">Open place</B><B variant="ghost" disabled={busy||record.detailsUnavailable} onClick={()=>void request('places.openMaps')}>Open in Maps</B></HStack>
 </Panel>;
}
export function Places({ctx}){
 return <Grid columns={{minWidth:280,max:3}} gap={5}>{ctx.state.records.map(record=><PlaceCard key={`${ctx.workspaceId}:${record.id}`} ctx={ctx} record={record}/>)}</Grid>;
}
