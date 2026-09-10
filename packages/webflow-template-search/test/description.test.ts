import {expect,it} from 'vitest';
import {extractDescriptionList} from '../src/html';
it('extracts only explicitly labelled public lists',()=>{
  const html='<p><strong>Included Pages</strong></p><ul><li>Projects (CMS) – Showcase work</li><li>Blog (CMS)</li></ul><h2>Support</h2><ul><li>Email us</li></ul>';
  expect(extractDescriptionList(html,'pages')).toEqual(['Projects (CMS) – Showcase work','Blog (CMS)']);
  expect(extractDescriptionList(html,'features')).toEqual([]);
  expect(extractDescriptionList('<p>Included Pages</p><h2>Support</h2><ul><li>Email us</li></ul>','pages')).toEqual([]);
});
