import { commercialPageTreatments } from './agencyPreviewCommercial';
import { productPageTreatments } from './agencyPreviewProducts';
import { editorialPageTreatments } from './agencyPreviewEditorial';
import { originalHeroImages } from './agencyPreviewOriginalImages';

export const utilityHeroTreatments = [
  {route:'/contact',family:'utility',image:'team',caption:'Concept illustration · bring one task to the conversation.',heroSelector:'.inquiry-intro',shot:'medium',focus:'55% 60%'},
  {route:'/book',family:'utility',image:'team',caption:'Concept illustration · plan the next step together.',heroSelector:'.booking-entry,.agent-booking__intro',shot:'medium',focus:'65% 55%'},
  {route:'/support-brief',family:'utility',image:'macro',caption:'Concept illustration · make the problem inspectable.',heroSelector:'.brief-workspace > header',shot:'macro',focus:'55% 65%'},
  {route:'/security',family:'utility',image:'macro',caption:'Concept illustration · check access before acting.',heroSelector:'.clear-page-section--hero',shot:'macro',focus:'40% 55%'},
  {route:'/prospects',family:'utility',image:'team',caption:'Concept illustration · connect only the approved tools.',heroSelector:'.portal-card',shot:'medium',focus:'60% 55%'}
] as const;
const records = [...commercialPageTreatments, ...productPageTreatments, ...editorialPageTreatments, ...utilityHeroTreatments];

/** One source for the existing approved imagery and copy, in SSR and enhancement. */
export function getAgencyHeroTreatment(pathname: string) {
  const path = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const item = records.find(r => r.route === path) ?? records.find(r => r.route.includes('[') && new RegExp('^'+r.route.replace(/\[[^\]]+\]/g,'[^/]+')+'$').test(path));
  const original = originalHeroImages[path];
  return item && original ? {...item, ...original} : item;
}
