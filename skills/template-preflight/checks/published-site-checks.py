#!/usr/bin/env python3
"""Read-only Webflow preflight. Standard-library HTML parsing, cached bounded crawl.
Exit 0 means no automated FAILs, never approval or completion of MANUAL checks.
"""
import argparse
from collections import Counter, defaultdict, deque
from dataclasses import dataclass, field
from html.parser import HTMLParser
import json
import os
import re
import shutil
import subprocess
import sys
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import xml.etree.ElementTree as ET

LICENSE_TEXT = "All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below."
UTILITY = {'/licenses','/changelog','/style-guide','/instructions'}
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
EXCLUDED = {'head','script','style','noscript','template','svg'}
BLOCK = set('address article aside blockquote div footer h1 h2 h3 h4 h5 h6 header li main nav p section td button label'.split())

def is_lenis_script(src):
    """Recognize Lenis package artifacts, never a whole CDN or arbitrary filename."""
    u=urlsplit(src)
    if u.scheme not in ('http','https','') or u.username or u.password:
        return False
    if u.hostname=='unpkg.com':
        path=u.path
    elif u.hostname=='cdn.jsdelivr.net' and u.path.startswith('/npm/'):
        path=u.path[4:]
    else:
        return False
    return bool(re.fullmatch(r'/(?:lenis|@studio-freight/lenis)(?:@[A-Za-z0-9._~^+-]+)?/dist/lenis(?:\.min)?\.js',path))

def norm(s): return ' '.join(s.split())

@dataclass(eq=False)
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    parent: object = None
    children: list = field(default_factory=list)
    def ancestors(self):
        n = self
        while n:
            yield n
            n = n.parent
    def nodes(self, tag=None):
        for c in self.children:
            if isinstance(c, Node):
                if tag is None or c.tag == tag: yield c
                yield from c.nodes(tag)
    def hidden(self):
        return any(n.tag in EXCLUDED or 'hidden' in n.attrs or n.attrs.get('aria-hidden','').lower() == 'true' or re.search(r'(?:display\s*:\s*none|visibility\s*:\s*hidden)',n.attrs.get('style',''),re.I) for n in self.ancestors())
    def text(self, visible=True, skip=()):
        if self.tag in skip or (visible and self.hidden()): return ''
        return ''.join((c.text(visible,skip) if isinstance(c,Node) else c) + (' ' if isinstance(c,Node) and c.tag in BLOCK else '') for c in self.children)

class Document(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.root=Node('document');self.stack=[self.root]
        self.feed(html);self.close()
    def handle_starttag(self,tag,attrs):
        n=Node(tag,dict((k,v or '') for k,v in attrs),self.stack[-1]);self.stack[-1].children.append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self,tag,attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID:self.handle_endtag(tag)
    def handle_endtag(self,tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:
                del self.stack[i:];break
    def handle_data(self,data): self.stack[-1].children.append(data)
    def nodes(self,tag=None): return list(self.root.nodes(tag))
    def meta(self,name):
        return [n.attrs.get('content','') for n in self.nodes('meta') if n.attrs.get('name',n.attrs.get('property','')).lower()==name]
    def title(self): return norm(' '.join(n.text(False) for n in self.nodes('title')))
    def lines(self):
        # Keep inline markup together, split structural blocks; exclude all non-content.
        def walk(n):
            if n.hidden():return ''
            s=''.join(walk(c) if isinstance(c,Node) else c for c in n.children)
            return '\n'+s+'\n' if n.tag in BLOCK or n.tag=='br' else s
        return [norm(s) for s in walk(self.root).splitlines() if norm(s)]

class Scanner:
    def __init__(self,args):
        self.args=args;self.base=args.url.rstrip('/')+'/'
        self.origin=urlsplit(self.base).netloc.lower()
        self.cache={};self.findings=[];self.pages={};self.aliases={};self.seps=defaultdict(list);self.titles=defaultdict(list);self.descs=defaultdict(list);self.name=args.template_name or '';self.scripts=set();self.images=set();self.gsap=False;self.words=[]
    def emit(self,level,check,detail):
        detail=norm(str(detail));self.findings.append(dict(level=level,check=check,detail=detail));print(f'{level:<6} {check} — {detail}')
    def fetch(self,url):
        if url in self.cache:return self.cache[url]
        try:
            req=Request(url,headers={'User-Agent':'TemplatePreflight/2.0 (read-only)'})
            with urlopen(req,timeout=self.args.timeout) as r:
                raw=r.read(5_000_001)
                if len(raw)>5_000_000:raise ValueError('response exceeds 5MB scan limit')
                result=(r.status,r.geturl(),r.headers,raw.decode(r.headers.get_content_charset() or 'utf-8',errors='replace'))
        except HTTPError as e:result=(e.code,url,e.headers,e.read(5_000_000).decode('utf-8',errors='replace'))
        except (URLError,ValueError,TimeoutError,OSError) as e:result=(0,url,{},str(e))
        self.cache[url]=result;return result
    def canonical(self,href,source=None):
        u=urlsplit(urljoin(source or self.base,href))
        if u.scheme not in ('http','https') or u.netloc.lower()!=self.origin:return None
        # Strip fragments; preserve query strings (pagination may expose otherwise missed items).
        path=u.path or '/'
        if re.search(r'\.(?:png|jpe?g|gif|webp|avif|svg|ico|pdf|zip|mp[34]|woff2?|ttf|css|js|xml|txt)$',path,re.I):return None
        return urlunsplit((u.scheme,u.netloc,path,u.query,''))
    def label(self,url):
        u=urlsplit(url);return u.path+('?' + u.query if u.query else '')
    def footer(self,n):
        return any(a.tag=='footer' or a.attrs.get('role')=='contentinfo' or re.search(r'(?:^|[\s_-])footer(?:$|[\s_-])',a.attrs.get('class','')+' '+a.attrs.get('id',''),re.I) for a in n.ancestors())
    def sitemap(self):
        pending=deque([urljoin(self.base,'sitemap.xml')]);seen=set();found=[]
        while pending and len(seen)<20:
            url=pending.popleft()
            if url in seen:continue
            seen.add(url);code,final,headers,body=self.fetch(url)
            if code==404 and len(seen)==1:
                self.emit('INFO','coverage/sitemap','No sitemap (not a template requirement; unhosted webflow.io demos have no Site plan). Coverage uses the link crawl.');continue
            if code!=200:
                self.emit('INFO','coverage/sitemap',f'{url}: HTTP {code}; sitemap not used for discovery (not a template requirement).');continue
            if urlsplit(final).netloc.lower()!=self.origin:
                self.emit('INFO','coverage/sitemap',f'{url} redirects outside the site; sitemap not used for discovery.');continue
            try:
                root=ET.fromstring(body)
                if root.tag.split('}')[-1] not in ('urlset','sitemapindex'):raise ValueError('not a sitemap')
                index=root.tag.split('}')[-1]=='sitemapindex'
                for n in root.iter():
                    if n.tag.split('}')[-1]!='loc' or not n.text:continue
                    target=urljoin(url,n.text.strip())
                    if index:
                        if urlsplit(target).netloc.lower()==self.origin:pending.append(target)
                        else:self.emit('INFO','coverage/sitemap',f'External sitemap not crawled: {target}')
                    else:
                        c=self.canonical(target)
                        if c:found.append(c)
                        else:self.emit('MANUAL','coverage/sitemap',f'Sitemap URL outside scan origin or not HTML: {target}')
            except (ET.ParseError,ValueError) as e:self.emit('INFO','coverage/sitemap',f'{url}: {e}; sitemap not used for discovery.')
        if pending:self.emit('MANUAL','coverage/incomplete','Sitemap limit reached; pending sitemap documents remain. Pass missing pages as extra paths.')
        return found
    def crawl(self):
        home=self.canonical(self.base)
        code,final,headers,body=self.fetch(home)
        if code!=200:
            self.emit('FAIL','/ fetch',f'Homepage HTTP {code}: {body[:120]}');return
        # Allow canonical www/HTTPS redirect for homepage only; then constrain crawl to final origin.
        self.base=final.rstrip('/')+'/' if urlsplit(final).path in ('','/') else final
        self.origin=urlsplit(self.base).netloc.lower();home=self.canonical(self.base)
        self.cache[home]=(code,final,headers,body)
        paths=[urljoin(self.base,p) for p in ('licenses','changelog','style-guide')]
        ins=urljoin(self.base,'instructions')
        if self.fetch(ins)[0]==200:paths.append(ins)
        paths+=self.sitemap()
        for arg in self.args.pages:
            c=self.canonical(arg)
            if c:paths.append(c)
            else:self.emit('FAIL','coverage/input',f'Not an internal HTML URL: {arg}')
        queue=deque([home]+paths);seen=set()
        while queue:
            url=queue.popleft()
            if url in seen:continue
            if len(seen)>=self.args.max_pages:
                self.emit('FAIL','coverage/incomplete',f'Limit {self.args.max_pages} reached; {len(set(queue)|{url})} queued URLs remain. Increase --max-pages.');break
            seen.add(url)
            code,final,headers,body=self.fetch(url);path=self.label(url)
            if code!=200:
                self.emit('FAIL',path+' fetch',f'HTTP {code}; required/discovered page not scanned.');continue
            canon=self.canonical(final)
            if not canon:
                self.emit('FAIL',path+' fetch',f'Redirected outside scan origin: {final}');continue
            if canon!=url:
                self.aliases[path]=self.label(canon)
                if urlsplit(url).path.rstrip('/') in UTILITY and urlsplit(canon).path.rstrip('/')!=urlsplit(url).path.rstrip('/'):
                    self.emit('FAIL',path+' utility/slug',f'Redirects to {self.label(canon)}; required utility must live at root slug.')
                if canon in self.pages:continue
            if 'html' not in headers.get('Content-Type','').lower():
                self.emit('FAIL',path+' fetch','Expected HTML; non-HTML link cannot be verified as a page.');continue
            self.cache[canon]=(code,final,headers,body)
            doc=Document(body);self.pages[canon]=doc
            print('PAGE   '+self.label(canon))
            for a in doc.nodes('a'):
                href=a.attrs.get('href','')
                if not href or href.startswith('#'):continue
                c=self.canonical(href,canon)
                if c and c not in seen:queue.append(c)
        for url,doc in self.pages.items():self.check_page(url,doc)
        self.emit('INFO','coverage',f'{len(self.pages)} unique pages scanned; redirects: {json.dumps(self.aliases,sort_keys=True)}')
        self.emit('MANUAL','coverage/inventory','Reconcile scanned PAGE list with Designer static pages and all CMS items; unlinked pages absent from sitemap cannot be discovered from HTML.')
    def css_ratio_candidates(self,url,doc):
        # Evidence candidates, not a CSS cascade engine. A matching terminal selector
        # routes to rendered verification; it never creates an automatic PASS.
        css=[n.text(False) for n in doc.nodes('style')]
        for link in doc.nodes('link'):
            if 'stylesheet' not in link.attrs.get('rel','').lower().split():continue
            target=urljoin(url,link.attrs.get('href',''))
            if urlsplit(target).scheme not in ('http','https'):continue
            code,_,_,body=self.fetch(target)
            if code==200:css.append(body)
            else:self.emit('MANUAL',self.label(url)+' images/css',f'Cannot inspect stylesheet {target}; verify image ratio boxes in Designer.')
        selectors=[]
        for body in css:
            body=re.sub(r'/\*.*?\*/','',body,flags=re.S)
            for selector,declarations in re.findall(r'([^{}]+)\{([^{}]*)\}',body):
                if re.search(r'(?:^|;)\s*aspect-ratio\s*:',declarations,re.I):selectors.extend(selector.split(','))
        return selectors
    @staticmethod
    def has_css_ratio(img,selectors):
        for selector in selectors:
            terminal=re.split(r'\s+|[>+~]',selector.strip())[-1]
            if not terminal:continue
            classes=re.findall(r'\.([\w-]+)',terminal);ids=re.findall(r'#([\w-]+)',terminal)
            tag=re.match(r'^[a-zA-Z][\w-]*',terminal)
            if not classes and not ids and not tag:continue
            for n in img.ancestors():
                if classes and not set(classes).issubset(n.attrs.get('class','').split()):continue
                if ids and n.attrs.get('id') not in ids:continue
                if tag and n.tag!=tag[0].lower():continue
                return True
        return False
    def check_page(self,url,doc):
        path=self.label(url);utility=urlsplit(url).path.rstrip('/').split('/')[-1] in {'licenses','license','licensing','changelog','style-guide','instructions'};title=doc.title();home=url==self.canonical(self.base)
        def out(level,key,detail):self.emit(level,path+' '+key,detail)
        if not title or len(doc.nodes('title'))!=1:out('FAIL','seo/title','Exactly one nonempty title required.')
        if home:
            m=re.fullmatch(r'(.+) - Webflow (?:HTML|Ecommerce) website template',title)
            if not m:out('FAIL','seo/title','Homepage suffix must be exact-case: {Template Name} - Webflow HTML website template (or Ecommerce).')
            else:
                inferred=m[1]
                if self.name and self.name!=inferred:out('FAIL','seo/name',f'Homepage name {inferred!r} does not match supplied listing name {self.name!r}.')
                if not self.name:self.name=inferred
                self.seps[' - '].append(path)
        elif self.name and not re.search(r'(?<!\w)'+re.escape(self.name)+r'(?!\w)',title):out('FAIL','seo/name',f'Title must contain exact template name {self.name!r}: {title!r}')
        if not home:
            seps=re.findall(r'\s+([-|–—:]+)\s+',title)
            if seps:
                for sep in set(seps):self.seps[' '+sep+' '].append(path)
            else:out('FAIL','seo/separator','Use a spaced separator consistent with the homepage.')
        if title:self.titles[title].append(path)
        if len(title)>=60:out('WARN','seo/title-length',f'{len(title)} characters; guideline is under 60.')
        if self.name and re.search(r'Webflow\s+(?:HTML|Ecommerce)\s+website\s+template',title,re.I) and not re.search(r'Webflow (?:HTML|Ecommerce) website template$',title):out('FAIL','seo/title-case','Where used, the Webflow suffix must have exact casing.')
        descriptions=doc.meta('description');desc=norm(descriptions[0]) if descriptions else ''
        if not desc or len(descriptions)!=1:out('FAIL','seo/description','Exactly one nonempty meta description required.')
        elif not 150<=len(desc)<=160:out('WARN','seo/description-length',f'{len(desc)} characters; guideline 150–160.')
        if desc:self.descs[desc].append(path)
        noindex=any(re.search(r'\b(?:noindex|none)\b',s,re.I) for s in doc.meta('robots'))
        # Headers can prohibit indexing too, but utility requirements specifically demand a head meta.
        header_noindex=bool(re.search(r'\b(?:noindex|none)\b',self.cache[url][2].get('X-Robots-Tag',''),re.I)) if url in self.cache else False
        if utility and not noindex:out('FAIL','seo/noindex','Utility page needs robots noindex meta.')
        if not utility and (noindex or header_noindex):out('FAIL','seo/noindex','Content page must remain indexable; robots noindex/none found.')
        links=[a for a in doc.nodes('a') if not a.hidden() and self.footer(a)]
        license_links=[a for a in links if (self.canonical(a.attrs.get('href',''),url) or '').rstrip('/')==urljoin(self.base,'licenses')]
        if not any(norm(a.text()) or any(i.attrs.get('alt','').strip() for i in a.nodes('img')) for a in license_links):out('FAIL','footer/licenses','Need a visible named link to this site’s /licenses inside a footer (semantic, role, or footer class/id).')
        powered=[]
        for a in links:
            target=urlsplit(urljoin(url,a.attrs.get('href','')))
            text=norm(a.text())+' '+ ' '.join(i.attrs.get('alt','') for i in a.nodes('img'))
            if target.scheme in ('http','https') and target.hostname in ('webflow.com','www.webflow.com') and target.path in ('','/') and re.search(r'webflow',text,re.I) and re.search(r'powered by webflow',norm(a.parent.text()) if a.parent else text,re.I):powered.append(a)
        if not powered:out('FAIL','footer/webflow','Need “Powered by Webflow” link to https://webflow.com in footer; nested markup is supported.')
        imgs=doc.nodes('img')
        ratio_selectors=self.css_ratio_candidates(url,doc) if imgs else []
        dimension_issues=[]
        for i,img in enumerate(imgs,1):
            a=img.attrs;identity=a.get('id') or a.get('src','')[:100] or f'image {i}'
            dims=all(re.fullmatch(r'[1-9][0-9]*',a.get(k,'')) for k in ('width','height'))
            ratio=any(re.search(r'aspect-ratio\s*:\s*(?:auto\s+)?[1-9][0-9]*(?:\.[0-9]+)?(?:\s*/\s*[1-9][0-9]*(?:\.[0-9]+)?)?(?=\s*(?:;|$))',n.attrs.get('style',''),re.I) for n in img.ancestors())
            css_ratio=self.has_css_ratio(img,ratio_selectors)
            if not dims and not ratio and not css_ratio:dimension_issues.append(dict(index=i,id=a.get('id'),src=a.get('src'),width=a.get('width'),height=a.get('height')))
            elif not dims:out('MANUAL','images/ratio',f'{identity}: inline or stylesheet ratio candidate found; verify computed box dimensions, cascade and breakpoints. Candidate is not a layout pass.')
            if 'alt' not in a:out('WARN','images/alt',f'{identity}: missing alt attribute; meaningful images need descriptive alt, decorative images empty alt.')
            if a.get('loading','').lower() not in ('lazy','eager',''):out('FAIL','images/loading',f'{identity}: invalid loading value {a.get("loading")!r}.')
            brand=re.search(r'\b(?:google|slack|stripe|segment|netflix|spotify|airbnb|amazon|microsoft|apple|notion|figma|hubspot|salesforce|shopify|zapier|intercom|openai|chatgpt)\b',a.get('alt','')+' '+urlsplit(a.get('src','')).path,re.I)
            if brand:out('WARN','images/brand',f'{identity}: possible brand {brand[0]}; inspect artwork and social-link exception. CDN hosting does not exempt brands.')
            if a.get('src'):self.images.add(urljoin(url,a['src']))
        if dimension_issues:
            examples=', '.join(item['id'] or item['src'] or f"image {item['index']}" for item in dimension_issues[:3])
            out('FAIL','images/dimensions',f'{len(dimension_issues)} of {len(imgs)} images lack positive width AND height or ratio evidence. Examples: {examples}. Verify stylesheet ratio exceptions in Designer. Full image details are in the JSON receipt.')
            self.findings[-1].update(affected_count=len(dimension_issues),items=dimension_issues)
        if imgs:
            nonlazy=sum(i.attrs.get('loading','').lower()!='lazy' for i in imgs)
            out('MANUAL','images/loading',f'{len(imgs)} images; {nonlazy} not marked lazy. Verify below-fold images are lazy and above-fold essentials eager at each breakpoint; DOM order cannot establish the fold.')
        self.forms(doc,out)
        h1=doc.nodes('h1')
        if not h1:out('FAIL','headings/h1','Missing main heading.')
        elif len(h1)>1:out('WARN','headings/h1',f'{len(h1)} H1s; verify section/article nesting and hierarchy.')
        levels=[int(n.tag[1]) for n in doc.nodes() if re.fullmatch('h[1-6]',n.tag)]
        skips=[f'{a}->{b}' for a,b in zip(levels,levels[1:]) if b>a+1]
        if skips:out('WARN','headings/order',', '.join(skips))
        og=doc.meta('og:image')
        if not og:out('FAIL','seo/og-image','Missing OG image; JPEG/PNG required.')
        else:
            ext=urlsplit(og[0]).path.lower()
            if ext.endswith(('.webp','.avif')):out('FAIL','seo/og-image','WebP/AVIF is not accepted by this checklist; use JPEG/PNG.')
            elif ext.endswith(('.jpg','.jpeg','.png')):out('MANUAL','seo/og-image',f'JPEG/PNG URL; verify actual format and dimensions >=1200x630, ratio 1.91:1: {og[0]}')
            else:out('MANUAL','seo/og-image',f'URL has no recognized JPEG/PNG suffix; verify response format: {og[0]}')
        for key in ('og:title','og:description'):
            if not doc.meta(key):out('WARN','seo/'+key,'Missing Open Graph metadata.')
        lines=doc.lines();self.words.extend(lines)
        for line,count in Counter(lines).items():
            if len(line)>=40 and (count>=3 or count>=2 and len(line)>160) and not re.search('copyright|all rights reserved|powered by webflow|cookie|licens',line,re.I):out('WARN','copy/repetition',f'{count} repeats within this page: {line[:160]}')
        for line in lines:
            if re.search(r'\b(?:Home|About|Services|Contact|Pricing|Blog|Work|Projects)\s+V\d+(?:\.\d+)*\b',line,re.I):out('FAIL','copy/version',f'Visible internal version label: {line[:140]}')
            if re.match(r'(?:Description|Title|Subtitle|Heading|Label|Eyebrow|Tagline|Caption|Button text):\s',line):out('WARN','copy/model-label',f'Possible leftover content-model prefix; confirm context: {line[:140]}')
            if re.search(r'\blorem ipsum\b',line,re.I):out('FAIL','copy/placeholder',line[:140])
            if len(line)>60 and re.search(r'\b(and|or|the|a|an|to|of|with|for|in|on|at|by|from|that|which|your|our|their|is|are)$',line):out('WARN','copy/truncated',line[:160])
            if re.search('[®™]',line):out('FAIL','copy/trademark',f'Remove ® and ™ from the copy; template brands are fictional: {line[:140]}')
        for a in doc.nodes('a'):
            if re.search(r'\b(?:buy|get|purchase)\b[^.]{0,30}\btemplate\b|\b(?:more|all|other)\s+templates\b',norm(a.text()),re.I):out('FAIL','links/self-promotion',f'Self-promotion link: {norm(a.text())[:80]}. Remove Buy/Get template and More templates links; one "Designed by" footer credit is allowed.')
            if a.attrs.get('href') in ('','#') and not any(k in a.attrs for k in ('role','data-w-tab')):out('WARN','links/empty',f'Empty link: {norm(a.text())[:80]}; verify whether it is an interaction trigger.')
        for s in doc.nodes('script'):
            src=s.attrs.get('src','');host=urlsplit(src).hostname or ''
            if src and not (is_lenis_script(src) or host.endswith('.website-files.com') or host in ('ajax.googleapis.com','ajax.aspnetcdn.com','code.jquery.com')):self.scripts.add(src)
            if re.search(r'gsap\.(?:to|from|timeline|registerPlugin)',s.text(False)) or src and re.search('gsap|greensock',src,re.I) and not host.endswith('.website-files.com'):self.gsap=True
        if any('hreflang' in n.attrs or 'w-locales-list' in n.attrs.get('class','').split() or 'data-wf-locale' in n.attrs for n in doc.nodes()):out('WARN','localization','Localization markers found; verify localization is disabled in site settings (markers alone may exist on a single locale).')
        if urlsplit(url).path.rstrip('/')=='/licenses':self.licenses(doc,out)
        if urlsplit(url).path.rstrip('/')=='/style-guide':
            missing=[t for t in 'h1 h2 h3 h4 h5 h6 p ul ol blockquote figure figcaption'.split() if not doc.nodes(t)]
            if missing:out('FAIL','style-guide/tags','Missing: '+', '.join(missing))
    def forms(self,doc,out):
        ids=defaultdict(list)
        for n in doc.nodes():
            if n.attrs.get('id'):ids[n.attrs['id']].append(n)
        labels=doc.nodes('label')
        fields=[n for n in doc.nodes() if n.tag in ('input','select','textarea') and n.attrs.get('type','text').lower() not in ('hidden','submit','reset','button','image')]
        for n in fields:
            a=n.attrs;ident=a.get('id') or a.get('name') or '(unnamed field)'
            associated=[l for l in labels if (a.get('id') and l.attrs.get('for')==a['id'] and len(ids[a['id']])==1) or (l in list(n.ancestors()) and not l.attrs.get('for'))]
            visible=any(norm(l.text()) for l in associated if not l.hidden())
            aria=bool(a.get('aria-label','').strip())
            refs=a.get('aria-labelledby','').split()
            referenced=bool(refs) and all(len(ids[r])==1 and norm(ids[r][0].text(False)) for r in refs)
            if not visible and not aria and not referenced:out('FAIL','forms/label',f'{ident}: no associated label or accessible name. Use unique id + label for, an enclosing label, or valid ARIA association; unrelated label counts do not count.')
            elif not visible:out('MANUAL','forms/label-visibility',f'{ident}: ARIA name found; verify the accessible name and visible field context in the rendered form.')
            if n.tag=='input' and a.get('type','text').lower()=='text' and re.search(r'e-?mail',' '.join(a.get(k,'') for k in ('id','name','placeholder','data-name')),re.I):out('FAIL','forms/type',f'{ident}: email field needs type=email.')
        forms=doc.nodes('form')
        for n in fields+forms:
            for key in ('name','data-name'):
                v=n.attrs.get(key,'')
                if re.fullmatch(r'(?:field(?:[- ]\d+)?|email[- ]form(?:[- ]\d+)?|name[- ]\d+|form[- ]\d+)',v,re.I):out('FAIL','forms/default-name',f'{key}={v!r}; use descriptive names. Plain Name/name is valid.')
            if n.attrs.get('placeholder','').lower() in ('example text','placeholder','enter text'):out('FAIL','forms/placeholder','Replace default placeholder copy.')
        for form in forms:
            container=next((n for n in form.ancestors() if 'w-form' in n.attrs.get('class','').split()),form)
            text=norm(container.text(False,skip=EXCLUDED))
            for fragment,key in [('Thank you! Your submission has been received!','success'),('Oops! Something went wrong while submitting the form','error')]:
                if fragment.lower() in text.lower():out('FAIL','forms/default-'+key,'Replace Webflow default '+key+' message.')
            submit=[n for n in form.nodes() if n.tag=='button' and n.attrs.get('type','submit')=='submit' or n.tag=='input' and n.attrs.get('type') in ('submit','image')]
            if not submit:out('MANUAL','forms/submit','No native submit control found; verify JavaScript/commerce control and feedback before clearing this form.')
            states=[n for n in container.nodes() if any(c in n.attrs.get('class','').split() for c in ('w-form-done','w-form-fail'))]
            out('MANUAL','forms/feedback',f'{len(states)} Webflow feedback containers found. Exercise submit/loading/success/error on this page in an authorized test environment; markup cannot prove runtime feedback. Do not send real submissions without authorization.')
    def licenses(self,doc,out):
        # Ignore shared chrome and headings when identifying the first substantive body text.
        skip={'nav','header','footer','h1','h2','h3','h4','h5','h6'}
        mains=doc.nodes('main');scope=mains[0] if mains else next(iter(doc.nodes('body')),doc.root)
        text=norm(scope.text(skip=skip))
        count=norm(doc.root.text()).count(LICENSE_TEXT)
        if count!=1:out('FAIL','licenses/boilerplate',f'Exact full boilerplate must occur once; found {count}. Preserve wording and closing period.')
        elif not text.startswith(LICENSE_TEXT):out('FAIL','licenses/opening','Boilerplate is not the opening substantive content (headings/navigation excluded).')
        else:out('PASS','licenses/boilerplate','Exact wording once, as opening substantive text.')
        # A source count is never inventory completeness; do not invent coverage from social links.
        entries=[]
        for a in scope.nodes('a'):
            if self.footer(a) or a.hidden():continue
            u=urlsplit(a.attrs.get('href',''))
            if u.scheme in ('http','https') and u.hostname not in ('webflow.com','www.webflow.com') and norm(a.text()):entries.append(norm(a.text())+' -> '+a.attrs['href'])
        out('INFO','licenses/links',f'{len(entries)} candidate source links: '+ '; '.join(entries[:12]))
        out('MANUAL','licenses/inventory','Match each font, image source/set, icon set, and other custom asset against a named entry plus source/license link. Arbitrary external links do not prove coverage or usage rights; obtain Designer/CMS asset inventory.')
    def finish(self):
        for kind,values in [('title',self.titles),('description',self.descs)]:
            for value,paths in values.items():
                if len(paths)>1:self.emit('FAIL','seo/duplicate-'+kind,f'{", ".join(paths)}: {value[:130]}')
        if len(self.seps)>1:self.emit('FAIL','seo/separators',json.dumps(self.seps,ensure_ascii=False))
        if not self.name:self.emit('MANUAL','seo/name','Could not infer template name from valid homepage title; rerun with --template-name matching the listing.')
        else:self.emit('MANUAL','seo/identity',f'Confirm listing name/description and visible logo wordmark exactly match {self.name!r}; image pixels are not inferred from URLs or alt text.')
        for src in sorted(self.scripts):self.emit('WARN','scripts/external',f'{src}: verify custom-code allowance; GSAP requires instructions, other exceptions are Lenis smooth scrolling, font smoothing, utility noindex and documented SVG.')
        if self.gsap:
            ins=self.pages.get(urljoin(self.base,'instructions'))
            if not ins:self.emit('FAIL','scripts/gsap','Custom GSAP detected; /instructions missing from checked pages.')
            else:
                text=norm(ins.root.text())
                for part in ('How to Edit GSAP Animations','Element Map','Customizing Key Variables','Removing GSAP'):
                    if part not in text:self.emit('FAIL','scripts/gsap','Instructions missing '+part)
        nf=self.fetch(urljoin(self.base,'this-page-should-not-exist-preflight-404'))
        self.emit('MANUAL','404',f'HTTP {nf[0]}; verify custom branding, navigation and CTAs on the missing-page route.')
        # Preserve the original bounded weight sample, clearly reported as a sample.
        for url in sorted(self.images)[:12]:
            if urlsplit(url).scheme not in ('http','https'):continue
            try:
                with urlopen(Request(url,method='HEAD',headers={'User-Agent':'TemplatePreflight/2.0'}),timeout=self.args.timeout) as r:size=int(r.headers.get('Content-Length','0'))
                if size>4_000_000:self.emit('FAIL','images/weight',f'{url}: {size} bytes exceeds 4MB.')
                elif size>150_000:self.emit('WARN','images/weight',f'{url}: {size} bytes; target <=150KB where possible.')
                elif size<=0:self.emit('MANUAL','images/weight',f'{url}: no usable Content-Length; size unverified.')
            except (URLError,ValueError,TimeoutError,OSError):self.emit('MANUAL','images/weight',f'{url}: HEAD could not verify asset size.')
        if self.images:self.emit('MANUAL','images/weight-inventory',f'HEAD sampled up to 12 of {len(self.images)} image URLs. Verify remaining images, srcset candidates, CSS backgrounds, and total site weight in Designer.')
        if shutil.which('aspell'):
            result=subprocess.run(['aspell','list','--lang=en'],input='\n'.join(self.words),text=True,capture_output=True)
            if result.returncode:self.emit('MANUAL','copy/spelling','aspell failed; proofread manually.')
            else:
                words=sorted(set(result.stdout.split()))[:20]
                if words:self.emit('WARN','copy/spelling','Possible misspellings (verify brand names): '+', '.join(words))
        else:self.emit('MANUAL','copy/spelling','aspell unavailable; spell-check all visible copy and listing copy manually.')
        for key,text in [
            ('contrast','Check every text/background pairing and hover/focus states sitewide with axe/Lighthouse and visual inspection.'),
            ('alt','Audit all meaningful image descriptions and decorative treatment in Designer; attribute presence is insufficient.'),
            ('mockups','Zoom into every mockup, screenshot, and logo strip for real brands; static HTML cannot inspect pixels.'),
            ('layout','Compare page layouts side by side for repetitive structures, and sweep all breakpoints.'),
            ('favicon','Verify favicon and webclip in light and dark chrome.'),
            ('copy','Proofread every static/CMS page and listing for copy defects; heuristics do not replace proofreading.'),
            ('settings','Check Variables/Modes, unused classes, form notifications, fonts, unrelated installed apps, localization disabled, ecommerce setup state.'),
            ('performance','Run PageSpeed Insights on main pages and inspect responsive behavior.'),
            ('validator','Run required Template Validator before submission. Zero scanner FAILs does not mean ready to submit.')]:self.emit('MANUAL',key,text)
        fails=sum(f['level']=='FAIL' for f in self.findings)
        print(f'== Done: {fails} blocker-level failure(s); {sum(f["level"]=="MANUAL" for f in self.findings)} manual checks remain ==')
        if self.args.json:
            with open(self.args.json,'w') as f:json.dump(dict(base=self.base,pages=[self.label(u) for u in self.pages],aliases=self.aliases,findings=self.findings,failures=fails),f,indent=2)
        return min(fails,255)

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('url');p.add_argument('pages',nargs='*');p.add_argument('--template-name',help='Exact listing name; otherwise inferred from valid homepage title')
    p.add_argument('--max-pages',type=int,default=200);p.add_argument('--timeout',type=float,default=float(os.environ.get('CURL_TIMEOUT','10')));p.add_argument('--json',help='Write machine-readable receipt')
    args=p.parse_args()
    if urlsplit(args.url).scheme not in ('http','https') or not urlsplit(args.url).netloc:p.error('URL must be http(s)')
    if args.max_pages<1 or args.timeout<=0:p.error('Limits must be positive')
    scanner=Scanner(args);print('== Webflow template preflight: '+args.url+' ==');scanner.crawl();return scanner.finish()
if __name__=='__main__':sys.exit(main())
