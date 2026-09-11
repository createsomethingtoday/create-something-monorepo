import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {GET,POST} from '../src/routes/api/abundance/healthcare-providers/geocodes/+server.ts';
test('source projection and geocode writes require a service key, including signed-in NPG users',async()=>{
 for(const handler of [GET,POST]){
  const response=await handler({request:new Request('https://createsomething.agency/api/abundance/healthcare-providers/geocodes'),url:new URL('https://createsomething.agency/api/abundance/healthcare-providers/geocodes'),locals:{user:{email:'user@thenpgroup.com'}},platform:{env:{DB:{},AGENCY_INTERNAL_API_KEY:'service-key'}}} as never);
  assert.equal(response.status,401);
 }
});
test('Census parser rejects incomplete/duplicate results and deduplicates only equal addresses',()=>{
 const program=String.raw`
import importlib.util,json,sys
s=importlib.util.spec_from_file_location('backfill',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
a={'practice_address_1':'12 Main St','practice_city':'Albany','practice_state':'NY','practice_postal_code':'122011234','practice_country':'US'}
b=dict(a,practice_address_1=' 12  MAIN ST ')
key,fields=m.address_identity(a,'2026-09');other,_=m.address_identity(b,'2026-09')
matched='id,address,Match,Exact,12 MAIN ST,"-73.75,42.65",x,y\n'
r=m.parse_census(matched,{'id'})
failures=0
for text,expected in [(matched,{'id','missing'}),(matched+matched,{'id'}),('id,address,Match,Exact,12 MAIN ST,"-73.75,nan"\n',{'id'})]:
 try:m.parse_census(text,expected)
 except ValueError:failures+=1
print(json.dumps({'equal':key==other,'zip':fields[3],'result':r['id'],'failures':failures,'tie':m.parse_census('id,address,Tie\n',{'id'})['id']['status']}))
`;
 const r=JSON.parse(execFileSync('python3',['-c',program,resolve('../../scripts/backfill-nppes-geocodes.py')],{encoding:'utf8'}));
 assert.equal(r.equal,true);assert.equal(r.zip,'12201');assert.equal(r.result.latitude,42.65);assert.equal(r.result.longitude,-73.75);assert.equal(r.failures,3);assert.equal(r.tie,'unmatched');
});

test('backfill checkpoint reuses a shared address and resumes an ambiguous upload without another Census call',()=>{
 const program=String.raw`
import importlib.util,json,sys,tempfile,os,types
s=importlib.util.spec_from_file_location('backfill',sys.argv[1]);m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
os.environ['AGENCY_INTERNAL_API_KEY']='test-only'
calls={'census':0,'upload':0,'source':0}
record={'source_payload_hash':'a'*64,'practice_address_1':'12 Main St','practice_city':'Albany','practice_state':'NY','practice_postal_code':'12201','practice_country':'US'}
def api(base,token,params=None,body=None):
 if params:
  calls['source']+=1
  return {'run_id':'abnationalrun_test','total':2,'records':[dict(record,npi='1000000001'),dict(record,npi='1000000002')],'next_cursor':None}
 calls['upload']+=1
 if calls['upload']==1:raise RuntimeError('Ambiguous upload')
 assert len(body['results'])==2
 return {'imported':2,'matched':2,'unmatched':0}
def census(addresses):
 calls['census']+=1
 assert len(addresses)==1
 return {addresses[0][0]:{'status':'matched','latitude':42.65,'longitude':-73.75,'matched_address':'12 MAIN ST','fetched_at':'2026-09-11T00:00:00Z'}}
m.api_request=api;m.census_request=census
with tempfile.TemporaryDirectory() as d:
 args=types.SimpleNamespace(run_id='abnationalrun_test',checkpoint=d+'/state.sqlite',agency_base_url='https://createsomething.agency',batch_size=1000)
 try:m.run(args)
 except RuntimeError:pass
 m.run(args)
print(json.dumps(calls))
`;
 const lines=execFileSync('python3',['-c',program,resolve('../../scripts/backfill-nppes-geocodes.py')],{encoding:'utf8'}).trim().split('\n');
 assert.deepEqual(JSON.parse(lines.at(-1)!),{census:1,upload:2,source:1});
});
