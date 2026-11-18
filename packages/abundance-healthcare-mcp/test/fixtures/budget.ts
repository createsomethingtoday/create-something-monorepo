// Unit fixtures for provider output tests; ledger concurrency is tested separately
// against SQLite and workerd. This helper never makes a real network request.
export function withBudgetFixture(next:typeof fetch):typeof fetch {
 return async(input,init)=>{
  if(new URL(String(input)).pathname!=='/api/abundance/enrichment-budget')return next(input,init);
  const body=JSON.parse(String(init?.body??'{}'));
  if(body.action==='record')return Response.json({success:true,data:{recorded:true}});
  if(body.action==='claim')return Response.json({success:true,data:{claimed:true}});
  const grant={id:'f'.repeat(64),provider:body.provider,token:'fixture',npi:body.npi};
  return Response.json({success:true,data:{id:grant.id,maximum_usd:1,grants:{[body.provider]:grant}}});
 };
}
