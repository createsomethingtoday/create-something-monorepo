"""Exercise the actual installed CLI over HTTP; never substitute the scanner's fetch."""
import os
import json
import tempfile
from pathlib import Path
import subprocess
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ENTRY = Path(os.environ.get('PREFLIGHT_ENTRY', Path(__file__).parents[1] / 'published-site-checks.sh'))
REQ = "All graphical assets in this template are licensed for personal and commercial use. If you'd like to use a specific asset, please check the license below."
FOOT = '<footer><a href="/licenses"><span>Licenses</span></a><a href="https://webflow.com"><span>Powered by Webflow</span></a></footer>'
def page(path, body='', head='', foot=FOOT):
    title = 'Acme - Webflow HTML website template' if path == '/' else path.strip('/').title() + ' - Acme'
    utility = path in ['/licenses','/changelog','/style-guide','/instructions']
    return '<html><head><title>'+title+'</title><meta content="Unique description for '+path+'" name="description"><meta content="https://example.invalid/og.png" property="og:image">'+('<meta name="robots" content="noindex">' if utility else '')+head+'</head><body><main><h1>'+path+'</h1>'+body+'</main>'+foot+'</body></html>'

class Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        class Handler(BaseHTTPRequestHandler):
            def do_GET(self):
                route = cls.routes.get(self.path)
                if route is None:
                    self.send_response(404);self.end_headers();self.wfile.write(b'<nav>Custom 404</nav>');return
                if isinstance(route, tuple):
                    self.send_response(route[0]);self.send_header('Location', route[1]);self.end_headers();return
                self.send_response(200);self.send_header('Content-Type','application/xml' if self.path.endswith('.xml') else 'text/html');self.end_headers();self.wfile.write(route.encode())
            def log_message(self,*args): pass
        cls.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        cls.thread=threading.Thread(target=cls.server.serve_forever,daemon=True);cls.thread.start()
        cls.base='http://127.0.0.1:'+str(cls.server.server_port)
    @classmethod
    def tearDownClass(cls): cls.server.shutdown();cls.server.server_close()
    def setUp(self):
        self.routes.clear()
        self.routes.update({'/':page('/'),'/licenses':page('/licenses','<p>'+REQ+'</p><section><h2>Fonts</h2><a href="https://fonts.google.com/specimen/Inter">Inter license</a></section>'), '/changelog':page('/changelog'),'/style-guide':page('/style-guide',''.join('<'+t+'>Example</'+t+'>' for t in ['h2','h3','h4','h5','h6','p','ul','ol','blockquote','figure','figcaption']))})
    routes={}
    def scan(self,*args,**env):
        result=subprocess.run(['bash',str(ENTRY),self.base,*args],text=True,capture_output=True,env=dict(os.environ,**env),timeout=30)
        self.assertNotIn('Traceback',result.stderr)
        return result.stdout,result.returncode
    def test_clean(self):
        text,code=self.scan();self.assertEqual(code,0,text)
    def test_height(self):
        self.routes['/']=page('/','<img src="/x.png" width="100" alt="A scene">')
        text,code=self.scan();self.assertIn('FAIL   / images/dimensions',text);self.assertNotEqual(code,0)
    def test_dimensions_valid_and_inline_box(self):
        self.routes['/']=page('/','<img src="/x.png" width="100" height="50" alt="Scene"><div style="aspect-ratio: 2 / 1"><img src="/y.png" alt="Scene"></div>')
        text,code=self.scan();self.assertNotIn('FAIL   / images/dimensions',text)
    def test_duplicate_path_not_duplicate_metadata(self):
        self.routes['/']=page('/','<a href="/about">About</a>');self.routes['/about']=page('/about')
        text,code=self.scan('/about','/about#team');self.assertNotIn('seo/duplicate',text);self.assertEqual(code,0,text)
    def test_recursive_and_sitemap_discovery(self):
        self.routes['/']=page('/',''.join('<a href="/page-'+str(i)+'">Page</a>' for i in range(14)))
        for i in range(14):self.routes['/page-'+str(i)]=page('/page-'+str(i),'<a href="/deep">Deep</a>')
        self.routes['/deep']=page('/deep',head='<meta name="robots" content="noindex">')
        self.routes['/sitemap.xml']='<urlset><url><loc>'+self.base+'/unlinked</loc></url></urlset>'
        self.routes['/unlinked']=page('/unlinked',head='<meta name="robots" content="noindex">')
        text,code=self.scan();self.assertIn('FAIL   /deep seo/noindex',text);self.assertIn('FAIL   /unlinked seo/noindex',text);self.assertIn('PAGE   /page-13',text)
    def test_missing_or_broken_sitemap_is_not_a_failure(self):
        text,code=self.scan();self.assertNotIn('FAIL   / coverage/sitemap',text);self.assertNotIn('FAIL   coverage/sitemap',text);self.assertIn('not a template requirement',text);self.assertEqual(code,0,text)
        self.routes['/sitemap.xml']='not xml'
        text,code=self.scan();self.assertNotRegex(text,r'FAIL.*coverage/sitemap');self.assertEqual(code,0,text)
    def test_noindex_required_on_licenses_and_changelog_only(self):
        plain=lambda path:self.routes[path].replace('<meta name="robots" content="noindex">','')
        self.routes['/style-guide']=plain('/style-guide')
        text,code=self.scan();self.assertNotRegex(text,r'FAIL +/style-guide seo/noindex');self.assertEqual(code,0,text)
        self.routes['/licenses']=plain('/licenses');self.routes['/changelog']=plain('/changelog')
        text,code=self.scan();self.assertRegex(text,r'FAIL +/licenses seo/noindex');self.assertRegex(text,r'FAIL +/changelog seo/noindex')
    def test_utilities_not_content(self):
        text,code=self.scan('/licenses');self.assertNotIn('FAIL   /licenses seo/noindex',text);self.assertEqual(code,0,text)
    def test_wrong_footer_and_unassociated_label(self):
        self.routes['/']=page('/','<nav><a href="https://other.invalid/licensing">Licenses</a></nav><form><input type="text" name="name"><label>Unrelated</label></form>',foot='')
        text,code=self.scan();self.assertIn('FAIL   / footer/licenses',text);self.assertIn('FAIL   / forms/label',text)
    def test_associated_labels_plain_name_and_feedback(self):
        self.routes['/']=page('/','<form><label for="name">Your name</label><input id="name" name="name"><button type="submit">Send</button><div class="w-form-done">Message received.</div><div class="w-form-fail">Please retry.</div></form>')
        text,code=self.scan();self.assertNotIn('FAIL   / forms/label',text);self.assertNotIn('forms/default-name',text);self.assertIn('MANUAL / forms/feedback',text)
    def test_default_error_and_missing_feedback(self):
        self.routes['/']=page('/','<form><label>Name<input name="field-2"></label><button>Send</button><div class="w-form-fail">Oops! Something went wrong while submitting the form.</div></form>')
        text,code=self.scan();self.assertIn('FAIL   / forms/default-name',text);self.assertIn('FAIL   / forms/default-error',text);self.assertIn('forms/feedback',text)
    def test_version_not_in_js_css_comments_or_head(self):
        self.routes['/']=page('/','<script>const x = "Home V1";</script><style>.x:after {content:"Home V2"}</style><!-- Home V3 --><template>Home V4</template>',head='<meta name="extra" content="Home V5">')
        text,code=self.scan();self.assertNotIn('copy/version',text)
        self.routes['/']=page('/','<nav>Home <span>V1</span></nav>');text,code=self.scan();self.assertIn('FAIL   / copy/version',text)
    def test_avif_and_brand_cdn(self):
        self.routes['/']=page('/','<img width="10" height="10" alt="Stripe logo" src="https://cdn.prod.website-files.com/x/stripe.png">').replace('https://example.invalid/og.png','https://example.invalid/og.avif')
        text,code=self.scan();self.assertIn('FAIL   / seo/og-image',text);self.assertIn('images/brand',text)
    def test_license_after_content_and_duplicate(self):
        self.routes['/licenses']=page('/licenses','<p>Other introductory content.</p><p>'+REQ+'</p>')
        text,code=self.scan();self.assertIn('FAIL   /licenses licenses/opening',text)
        self.routes['/licenses']=page('/licenses','<p>'+REQ+'</p><p>'+REQ+'</p>')
        text,code=self.scan();self.assertIn('FAIL   /licenses licenses/boilerplate',text)
    def test_asset_links_not_a_proof(self):
        self.routes['/licenses']=page('/licenses','<p>'+REQ+'</p><a href="https://example.com">Social</a><a href="https://example.org">Contact</a>')
        text,code=self.scan();self.assertIn('MANUAL /licenses licenses/inventory',text);self.assertNotIn('PASS   /licenses licenses/inventory',text)
    def test_sitemap_index_over_the_limit_fails(self):
        self.routes['/sitemap.xml']='<sitemapindex>'+''.join('<sitemap><loc>'+self.base+'/s'+str(i)+'.xml</loc></sitemap>' for i in range(21))+'</sitemapindex>'
        for i in range(21):self.routes['/s'+str(i)+'.xml']='<urlset><url><loc>'+self.base+'/</loc></url></urlset>'
        text,code=self.scan();self.assertIn('FAIL   coverage/incomplete',text);self.assertNotEqual(code,0)
    def test_gsap_documentation_on_instructions_or_a_separate_guide_page(self):
        gsap='<script>gsap.from(".hero",{opacity:0})</script>';docs='<h2>How to Edit GSAP Animations</h2><h3>Element Map</h3><h3>Customizing Key Variables</h3><h3>Removing GSAP Animations</h3>'
        self.routes['/']=page('/','<a href="/instructions">Instructions</a>'+gsap)
        self.routes['/instructions']=page('/instructions','<a href="/gsap-guide">GSAP Guide</a>');self.routes['/gsap-guide']=page('/gsap-guide',docs)
        text,code=self.scan();self.assertNotIn('scripts/gsap',text)
        self.routes['/gsap-guide']=page('/gsap-guide','<h2>How to Edit GSAP Animations</h2><h3>Element Map</h3>')
        text,code=self.scan();self.assertIn('missing Customizing Key Variables',text);self.assertIn('missing Removing GSAP',text);self.assertNotEqual(code,0)
        self.routes['/instructions']=page('/instructions',docs);del self.routes['/gsap-guide']
        text,code=self.scan();self.assertNotIn('scripts/gsap',text)
        self.routes['/instructions']=(301,'/instructions/');self.routes['/instructions/']=page('/instructions',docs)
        text,code=self.scan();self.assertNotIn('scripts/gsap',text)
    def test_incomplete_crawl_fails(self):
        self.routes['/']=page('/','<a href="/about">About</a>');self.routes['/about']=page('/about')
        text,code=self.scan('--max-pages','2');self.assertIn('FAIL   coverage/incomplete',text);self.assertNotEqual(code,0)
    def test_separator_and_name(self):
        self.routes['/about']=page('/about').replace('About - Acme','About | Other')
        text,code=self.scan('/about');self.assertIn('FAIL   /about seo/name',text);self.assertIn('FAIL   seo/separators',text)
    def test_missing_page_fails(self):
        text,code=self.scan('/missing');self.assertIn('FAIL   /missing fetch',text);self.assertNotEqual(code,0)
    def test_lazy_sitewide(self):
        self.routes['/about']=page('/about','<img width="100" height="50" alt="Scene" src="/x.png">')
        text,code=self.scan('/about');self.assertIn('MANUAL /about images/loading',text)

    def test_css_ratio_is_manual_not_false_failure(self):
        self.routes['/']=page('/','<div class="ratio-box"><img src="/x.png" alt="Scene"></div>',head='<style>.ratio-box { aspect-ratio: 2 / 1; }</style>')
        text,code=self.scan();self.assertNotIn('FAIL   / images/dimensions',text);self.assertIn('MANUAL / images/ratio',text)
    def test_aria_and_native_cart(self):
        self.routes['/']=page('/','<form data-node-type="commerce-cart-form"><input type="number" name="quantity" aria-label="Quantity"></form>')
        text,code=self.scan();self.assertNotIn('FAIL   / forms/label',text);self.assertNotIn('FAIL   / forms/submit',text);self.assertIn('MANUAL / forms/submit',text)
    def test_broken_aria_reference_fails(self):
        self.routes['/']=page('/','<input aria-labelledby="missing" name="quantity">')
        text,code=self.scan();self.assertIn('FAIL   / forms/label',text)
    def test_redirect_alias_deduplication(self):
        self.routes['/']=page('/','<a href="/old">Old</a><a href="/about">About</a>');self.routes['/old']=(301,'/about');self.routes['/about']=page('/about')
        text,code=self.scan();self.assertNotIn('seo/duplicate',text);self.assertEqual(code,0,text)
    def test_single_quotes_and_order(self):
        self.routes['/']=page('/',"<label for='person'>Name</label><input name='name' id='person'><img height='50' alt='Scene' width='100' src='/x.png'>")
        text,code=self.scan();self.assertNotIn('forms/label',text);self.assertNotIn('FAIL   / images/dimensions',text)
    def test_webfont_not_a_brand(self):
        self.routes['/']=page('/',head='<script src="https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js"></script>')
        text,code=self.scan();self.assertNotIn('images/brand',text)
    def test_exact_boilerplate_inline_and_entities(self):
        self.routes['/licenses']=page('/licenses','<p>'+REQ.replace("you'd",'you&#39;d').replace('graphical','<span>graphical</span>')+'</p>')
        text,code=self.scan();self.assertNotIn('FAIL   /licenses licenses/',text)
    def test_title_exact_case_on_inner_page(self):
        self.routes['/about']=page('/about').replace('About - Acme','About - Acme - Webflow HTML Website Template')
        text,code=self.scan('/about');self.assertIn('FAIL   /about seo/title-case',text)

    def test_powered_by_prefix_outside_anchor(self):
        self.routes['/']=page('/',foot='<footer><a href="/licenses">Licenses</a><p>Powered by <a href="https://webflow.com"><span>Webflow</span></a></p></footer>')
        text,code=self.scan();self.assertNotIn('FAIL   / footer/webflow',text)
    def test_form_script_text_is_not_feedback_copy(self):
        self.routes['/']=page('/','<form><label>Name<input name="name"></label><button>Send</button><script>const x="Thank you! Your submission has been received!";</script></form>')
        text,code=self.scan();self.assertNotIn('forms/default-success',text)
    def test_nested_utility_not_mistaken_for_content(self):
        self.routes['/template/licenses']=page('/licenses')
        text,code=self.scan('/template/licenses');self.assertNotIn('FAIL   /template/licenses seo/noindex',text)
    def test_real_duplicate_and_missing_height_on_inner(self):
        self.routes['/about']=page('/about','<img width="100" src="/x.png">')
        self.routes['/other']=self.routes['/about']
        text,code=self.scan('/about','/other');self.assertIn('FAIL   seo/duplicate-title',text);self.assertIn('FAIL   /about images/dimensions',text)
    def test_footer_spoof_host_rejected(self):
        self.routes['/']=page('/',foot='<footer><a href="/licenses">Licenses</a><a href="https://webflow.com.example.invalid">Powered by Webflow</a></footer>')
        text,code=self.scan();self.assertIn('FAIL   / footer/webflow',text)

    def test_dimensions_aggregate_without_losing_json_items(self):
        self.routes['/']=page('/',''.join(f'<img id="img-{i}" width="100" src="/x.png" alt="Scene">' for i in range(300)))
        with tempfile.TemporaryDirectory() as folder:
            receipt=str(Path(folder)/'receipt.json')
            text,code=self.scan('--json',receipt)
            data=json.loads(Path(receipt).read_text())
        findings=[f for f in data['findings'] if f['check']=='/ images/dimensions']
        self.assertEqual(len(findings),1)
        self.assertEqual(findings[0]['affected_count'],300)
        self.assertEqual(len(findings[0]['items']),300)
        self.assertEqual(findings[0]['items'][-1]['id'],'img-299')
        self.assertEqual(text.count('FAIL   / images/dimensions'),1)
        self.assertIn('300 of 300 images',text)
        self.assertEqual(code,1,text)

    def test_lenis_cdn_scripts_are_allowed(self):
        urls=['https://unpkg.com/lenis@1.3.26/dist/lenis.min.js',
              'https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.js',
              'https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/dist/lenis.min.js',
              '//unpkg.com/lenis@latest/dist/lenis.min.js?cache=1']
        self.routes['/']=page('/',head=''.join(f'<script src="{url}"></script>' for url in urls))
        text,code=self.scan();self.assertNotIn('scripts/external',text);self.assertEqual(code,0,text)
    def test_lenis_does_not_allow_other_scripts(self):
        urls=['https://unpkg.com/other/dist/other.js',
              'https://cdn.jsdelivr.net/npm/lenis-impostor/dist/lenis.min.js',
              'https://unpkg.com.example.invalid/lenis/dist/lenis.min.js',
              'https://example.invalid/lenis.min.js']
        self.routes['/']=page('/',head=''.join(f'<script src="{url}"></script>' for url in urls))
        text,code=self.scan()
        for url in urls:self.assertIn('WARN   scripts/external — '+url,text)
    def test_trademark_symbols_and_self_promotion_links_fail(self):
        self.routes['/']=page('/','<p>Acme™ builds calm homes for busy people.</p><a href="https://example.invalid/t">More templates by Acme Studio</a><a href="https://example.invalid/b">Buy this template</a>')
        text,code=self.scan();self.assertIn('FAIL   / copy/trademark',text);self.assertEqual(text.count('FAIL   / links/self-promotion'),2);self.assertNotEqual(code,0)
    def test_designer_credit_and_plain_links_are_not_self_promotion(self):
        self.routes['/']=page('/','<a href="https://example.invalid/studio">Designed by Acme Studio</a><a href="/contact">Get in touch</a><a href="/shop">Buy now</a>')
        self.routes['/contact']=page('/contact');self.routes['/shop']=page('/shop')
        text,code=self.scan();self.assertNotIn('links/self-promotion',text);self.assertNotIn('copy/trademark',text);self.assertEqual(code,0,text)

if __name__=='__main__':unittest.main()
