from pathlib import Path
from urllib.request import build_opener, HTTPRedirectHandler, Request
from urllib.error import HTTPError
from concurrent.futures import ThreadPoolExecutor
import re, json, datetime
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None
root=Path('packages/private-pcn/src/routes')
routes=sorted('/'+str(f.parent.relative_to(root)).replace('.','').strip('/') for f in root.rglob('+page.svelte') if '[' not in str(f))
def inspect(path):
    req=Request('https://private.createsomething.agency'+path,headers={'User-Agent':'CRE-2127-public-navigation-readonly'})
    try:r=build_opener(NoRedirect).open(req,timeout=30)
    except HTTPError as e:r=e
    body=r.read().decode('utf8','replace')
    title=re.search(r'<title>(.*?)</title>',body,re.S)
    return {'path':path,'status':r.code,'location':r.headers.get('Location'),'title':title.group(1) if title else None,'checked_at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
with ThreadPoolExecutor(max_workers=4) as pool: results=list(pool.map(inspect,routes))
Path('output/public-navigation/anonymous-http.json').write_text(json.dumps(results,indent=2)+'\n')
for r in results:print(json.dumps(r))
