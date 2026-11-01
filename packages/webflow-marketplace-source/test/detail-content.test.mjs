import {test} from 'node:test';
import assert from 'node:assert/strict';
import {includedPageInventory} from '../src/lib/detail-content.mjs';
test('reads explicit page structure and only links to supplied demo destinations',()=>{
 assert.deepEqual(includedPageInventory('<p><strong>Page Structure:</strong></p><ul><li><a href="/contact">Contact</a></li><li>News CMS</li><li><a href="https://unrelated.example/">Instructions</a></li></ul>','https://demo.webflow.io/'),[{name:'Contact',href:'https://demo.webflow.io/contact'},{name:'News CMS'},{name:'Instructions'}]);
});
test('does not misidentify a later unrelated list or invent a URL',()=>{
 assert.deepEqual(includedPageInventory('<h2>Included Pages</h2><h3>Support</h3><ul><li>Email</li></ul>','https://demo.webflow.io/'),[]);
 assert.deepEqual(includedPageInventory('<p>Page Structure</p><ul><li><a href="javascript:alert(1)">Contact</a></li></ul>','https://demo.webflow.io/'),[{name:'Contact'}]);
});
